"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface InternalChatMessage {
  id: string;
  author: string;
  role: string;
  text?: string;
  photoUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

interface ChecklistItem {
  id: string;
  name: string;
  category?: string;
  status?: string;
  completed?: boolean;
  price?: number;
}

interface CustomStatus {
  id: string;
  code: string;
  name: string;
  color: string;
}

const DEFAULT_ETAPAS: CustomStatus[] = [
  { id: "2", code: "02", name: "Diagnóstico", color: "blue" },
  { id: "3", code: "03", name: "Reparación", color: "sky" },
  { id: "4", code: "04", name: "Listo", color: "emerald" },
  { id: "5", code: "05", name: "Entregada", color: "purple" },
];

const COLOR_MAP: Record<
  string,
  { bg: string; border: string; text: string; dot: string; bar: string }
> = {
  amber: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-300",
    dot: "bg-amber-400",
    bar: "from-amber-500 to-orange-500",
  },
  blue: {
    bg: "bg-blue-500/15",
    border: "border-blue-500/30",
    text: "text-blue-300",
    dot: "bg-blue-400",
    bar: "from-blue-500 to-indigo-500",
  },
  sky: {
    bg: "bg-sky-500/15",
    border: "border-sky-500/30",
    text: "text-sky-300",
    dot: "bg-sky-400",
    bar: "from-sky-400 to-blue-600",
  },
  emerald: {
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
    bar: "from-emerald-400 to-teal-500",
  },
  purple: {
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
    text: "text-purple-300",
    dot: "bg-purple-400",
    bar: "from-purple-500 to-pink-500",
  },
};



function getEtapaActivaIndex(status: string, etapas: CustomStatus[]): number {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("entregad") || s.includes("cerrad")) return 4;
  if (s.includes("listo") || s.includes("cobro") || s.includes("caja")) return 3;
  if (s.includes("repar") || s.includes("proceso") || s.includes("pista")) return 2;
  if (s.includes("diagn") || s.includes("inspecc") || s.includes("presupuesto")) return 1;
  return 0; // Pendiente / Recibido
}

function SeguimientoOrdenContent() {
  const searchParams = useSearchParams();
  const paramOrden = searchParams.get("orden") || "";
  const paramPin = searchParams.get("pin") || "";
  const paramDemo = searchParams.get("demo") === "1";

  const [ordenInput, setOrdenInput] = useState(paramOrden);
  const [pinInput, setPinInput] = useState(paramPin);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [orden, setOrden] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Estado del chat y adjuntos
  const [chatMensajes, setChatMensajes] = useState<InternalChatMessage[]>([]);
  const [nuevoTexto, setNuevoTexto] = useState("");
  const [adjuntoUrl, setAdjuntoUrl] = useState<string | null>(null);
  const [adjuntoNombre, setAdjuntoNombre] = useState<string | null>(null);
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const consultarSeguimiento = async (numOrden: string, pin: string, isDemo = false) => {
    if (isDemo) {
      try {
        setCargando(true);
        setError("");
        const res = await fetch("/api/taller/operacion?trackingLatest=true");
        const data = await res.json();
        if (data.success && data.order) {
          setOrden(data.order);
          setChatMensajes(Array.isArray(data.order.internalChat) ? data.order.internalChat : []);
        } else {
          setOrden(null);
          setError(data.error || "No hay órdenes activas registradas.");
        }
      } catch {
        setError("Error de conexión al consultar el estado de tu orden.");
      } finally {
        setCargando(false);
      }
      return;
    }

    const cleanOrd = numOrden.trim();
    const cleanPin = pin.trim();
    if (!cleanOrd || !cleanPin) {
      setError("Ingresa el número de orden (o placa) y el PIN de seguridad.");
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
        setChatMensajes(Array.isArray(data.order.internalChat) ? data.order.internalChat : []);
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

  // 1. AUTO-INGRESO POR QR (PARAMETROS URL + PIN)
  useEffect(() => {
    if (paramDemo) {
      consultarSeguimiento("", "", true);
    } else if (paramOrden && paramPin) {
      consultarSeguimiento(paramOrden, paramPin);
    }
  }, [paramOrden, paramPin, paramDemo]);

  // Scroll automático del chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMensajes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    consultarSeguimiento(ordenInput, pinInput);
  };

  // Subir archivo o imagen a Cloudflare R2
  const handleSubirAdjunto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSubiendoAdjunto(true);
      const esVideo = file.type.startsWith("video/");
      const esAudio = file.type.startsWith("audio/");
      const folder = esVideo ? "taller_videos" : esAudio ? "taller_audios" : "taller_seguimiento";
      const tipo = esVideo ? "video" : esAudio ? "audio" : "image";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      formData.append("tipo", tipo);
      if (orden?.id) formData.append("orderId", orden.id);
      if (orden?.orderNumber) formData.append("orderNumber", orden.orderNumber);
      if (orden?.plate) formData.append("plate", orden.plate);

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setAdjuntoUrl(data.url);
        setAdjuntoNombre(file.name);
      } else {
        alert(data.error || "No se pudo subir el archivo adjunto.");
      }
    } catch {
      alert("Error al conectar con el servidor de almacenamiento Cloudflare R2.");
    } finally {
      setSubiendoAdjunto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Enviar mensaje al taller
  const handleEnviarMensaje = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textoLimpio = nuevoTexto.trim();
    if (!textoLimpio && !adjuntoUrl) return;

    const horaActual = new Date().toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const msgLocal: InternalChatMessage = {
      id: `local-${Date.now()}`,
      author: orden?.client || "Cliente",
      role: "Cliente",
      text: textoLimpio || undefined,
      photoUrl: adjuntoUrl || undefined,
      attachmentUrl: adjuntoUrl || undefined,
      attachmentName: adjuntoNombre || undefined,
      createdAt: horaActual,
    };

    // Actualización optimista
    setChatMensajes((prev) => [...prev, msgLocal]);
    setNuevoTexto("");
    setAdjuntoUrl(null);
    setAdjuntoNombre(null);

    // Si es demo no hace POST al backend
    if (paramDemo || orden?.id === "demo-1042") return;

    try {
      setEnviandoMensaje(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ENVIAR_MENSAJE_SEGUIMIENTO",
          orderId: orden?.id || orden?.orderNumber,
          pin: pinInput || orden?.trackingPin,
          text: textoLimpio,
          photoUrl: msgLocal.photoUrl,
          author: orden?.client || "Cliente",
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.internalChat)) {
        setChatMensajes(data.internalChat);
      }
    } catch (err) {
      console.warn("Aviso al enviar mensaje al taller:", err);
    } finally {
      setEnviandoMensaje(false);
    }
  };

  // Etapas de la orden
  const etapas: CustomStatus[] =
    Array.isArray(orden?.customStatuses) && orden.customStatuses.length === 5
      ? orden.customStatuses
      : DEFAULT_ETAPAS;

  const etapaActivaIdx = orden ? getEtapaActivaIndex(orden.status, etapas) : 0;
  const colorStyle = COLOR_MAP[orden?.statusColor || "sky"] || COLOR_MAP.sky;

  // Checklist de trabajos
  const items: ChecklistItem[] = Array.isArray(orden?.items) ? orden.items : [];
  const totalItems = items.length;
  const itemsCompletados = items.filter(
    (it) => it.status === "Listo" || it.completed === true
  ).length;
  const porcentajeChecklist =
    totalItems > 0 ? Math.round((itemsCompletados / totalItems) * 100) : 0;

  // Lógica Oficina vs Garaje para Total
  const tienePrecioAutorizado =
    Boolean(orden?.hasPriceAuthorized) ||
    (Number(orden?.totalCost || 0) > 0 &&
      orden?.status !== "En Pista" &&
      orden?.status !== "Pendiente" &&
      orden?.quoteStatus === "Aprobado");

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#070709] text-white flex items-center justify-center p-6" suppressHydrationWarning>
        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <svg
            className="w-5 h-5 animate-spin text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          <span>Cargando portal de seguimiento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300 py-6 px-4 sm:px-6" suppressHydrationWarning>
      {/* Fondo ambiental suave con Glassmorphism */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/[0.04] blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[35%] h-[35%] rounded-full bg-emerald-600/[0.04] blur-[120px]" />
      </div>

      <div className="relative max-w-xl mx-auto space-y-5">
        {/* Cabecera Superior Minimalista */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/taller"
              className="w-10 h-10 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
              title="Volver"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 block">
                Portal de Seguimiento en Vivo
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {orden?.workshopName || "Taller Mecánico Especializado"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!orden && (
              <button
                type="button"
                onClick={() => consultarSeguimiento("", "", true)}
                className="h-8 px-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[11px] font-medium text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Vista Demo
              </button>
            )}
            {orden && (
              <button
                type="button"
                onClick={() =>
                  consultarSeguimiento(
                    ordenInput || orden.orderNumber,
                    pinInput || orden.trackingPin,
                    orden.id === "demo-1042"
                  )
                }
                disabled={cargando}
                className="h-9 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title="Actualizar estado"
              >
                <svg
                  className={`w-3.5 h-3.5 ${cargando ? "animate-spin text-emerald-400" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                <span>Refrescar</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Formulario de Acceso por PIN (Si no vino por QR o desea consultar otra) */}
        {!orden && (
          <form
            onSubmit={handleSubmit}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Consulta de Orden</h2>
                <p className="text-xs text-zinc-400">
                  Ingresa los datos entregados en tu comprobante de recepción.
                </p>
              </div>
              <span
                className="text-[11px] px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1.5"
                suppressHydrationWarning
              >
                <svg
                  className="w-3 h-3 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                <span>Acceso Seguro</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Número de Orden o Placa
                </label>
                <input
                  type="text"
                  value={ordenInput}
                  onChange={(e) => setOrdenInput(e.target.value)}
                  placeholder="Ej: 1042 o ABC-1234"
                  className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-emerald-500/50 text-white text-sm font-mono uppercase placeholder:text-zinc-600 focus:outline-none transition-all"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  PIN de seguridad
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Ej: 4821"
                  className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-emerald-500/50 text-emerald-300 text-sm font-mono font-bold text-center placeholder:text-zinc-600 focus:outline-none transition-all tracking-widest"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full h-11 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 hover:text-white text-sm font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {cargando ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  <span>Verificando orden...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                  <span>Ingresar a Seguimiento</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                <svg
                  className="w-4 h-4 shrink-0 text-rose-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </form>
        )}

        {/* 2. CABECERA Y LÍNEA DE 5 ESTADOS PERSONALIZABLES */}
        {orden && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
              {/* Tarjeta de Orden y Estado Actual */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/10 font-mono text-xs font-bold text-zinc-200">
                    Orden #{orden.orderNumber}
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/25 font-mono text-xs font-bold text-blue-300">
                    {orden.plate}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${colorStyle.bg} ${colorStyle.border} ${colorStyle.text}`}
                >
                  <span className={`w-2 h-2 rounded-full ${colorStyle.dot} animate-pulse`} />
                  <span>{orden.status}</span>
                </span>
              </div>

              {/* Datos de Vehículo y Cliente */}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {orden.vehicle}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mt-1">
                  <span>
                    Cliente: <strong className="text-zinc-200">{orden.client}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Técnico: <strong className="text-zinc-200">{orden.mechanic}</strong>
                  </span>
                </div>
              </div>

              {/* BARRA DE 5 ESTADOS PERSONALIZABLES */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2">
                  <span className="font-medium">Línea de Proceso</span>
                  <span className="text-zinc-500 font-mono">
                    Paso {etapaActivaIdx + 1} de {etapas.length}
                  </span>
                </div>

                {/* Stepper horizontal moderno con 5 estados */}
                <div className="grid grid-cols-5 gap-1.5">
                  {etapas.map((et, idx) => {
                    const esPasada = idx < etapaActivaIdx;
                    const esActual = idx === etapaActivaIdx;
                    const stColor = COLOR_MAP[et.color] || COLOR_MAP.amber;

                    return (
                      <div key={et.id || idx} className="space-y-1.5 text-center">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            esPasada
                              ? "bg-emerald-500"
                              : esActual
                              ? `bg-gradient-to-r ${stColor.bar} shadow-[0_0_12px_rgba(56,189,248,0.4)]`
                              : "bg-white/[0.06]"
                          }`}
                        />
                        <div className="px-0.5">
                          <span
                            className={`block text-[10px] font-mono leading-none ${
                              esPasada
                                ? "text-emerald-400 font-medium"
                                : esActual
                                ? `${stColor.text} font-bold`
                                : "text-zinc-600"
                            }`}
                          >
                            {et.code}
                          </span>
                          <span
                            className={`block text-[10px] truncate leading-tight mt-0.5 ${
                              esPasada
                                ? "text-zinc-300"
                                : esActual
                                ? "text-white font-semibold"
                                : "text-zinc-600"
                            }`}
                            title={et.name}
                          >
                            {et.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Indicadores Clave: Kilometraje, Combustible, Total */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.06]">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center sm:text-left">
                  <span className="text-[10px] text-zinc-500 block uppercase font-medium">
                    Kilometraje
                  </span>
                  <strong className="text-white font-mono text-xs sm:text-sm">
                    {orden.mileage ? `${Number(orden.mileage).toLocaleString()} km` : "Registrado"}
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center sm:text-left">
                  <span className="text-[10px] text-zinc-500 block uppercase font-medium">
                    Combustible
                  </span>
                  <strong className="text-white text-xs sm:text-sm">
                    {orden.fuelLevel || "1/2"}
                  </strong>
                </div>

                {/* Tarjeta de Total acorde al flujo de Garaje vs Oficina */}
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center sm:text-left">
                  <span className="text-[10px] text-zinc-500 block uppercase font-medium">
                    Total
                  </span>
                  {tienePrecioAutorizado ? (
                    <strong className="text-emerald-400 font-mono text-xs sm:text-sm">
                      ${Number(orden.totalCost || 0).toFixed(2)}
                    </strong>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-300/90 block leading-tight">
                      Por confirmar en caja
                    </span>
                  )}
                </div>
              </div>

              {/* Botón directo a presupuesto si tiene token */}
              {orden.quoteToken && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="font-semibold text-purple-300 block">
                      Presupuesto disponible para aprobación
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Revisa el desglose y aprueba los repuestos y mano de obra.
                    </span>
                  </div>
                  <Link
                    href={`/taller/presupuesto/${encodeURIComponent(orden.quoteToken)}`}
                    className="h-8 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/35 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <span>Ver Presupuesto</span>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </Link>
                </div>
              )}
            </div>

            {/* 3. TARJETA "CHECKLIST DE TRABAJOS" DINÁMICA */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">
                    Checklist de trabajos
                  </h3>
                </div>

                {/* Badge contador tipo "1/4" */}
                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-mono font-bold text-emerald-400">
                  {itemsCompletados}/{totalItems}
                </span>
              </div>

              {/* Barra de progreso horizontal verde esmeralda */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-black/40 border border-white/[0.05] overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${porcentajeChecklist}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Avance de tareas</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {porcentajeChecklist}% completado
                  </span>
                </div>
              </div>

              {/* Lista de Servicios y Trabajos */}
              {totalItems === 0 ? (
                <p className="text-xs text-zinc-500 py-3 text-center">
                  El personal de taller está asignando las tareas a tu orden.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  {items.map((it, idx) => {
                    const estaListo = it.status === "Listo" || it.completed === true;

                    return (
                      <div
                        key={it.id || idx}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          estaListo
                            ? "bg-emerald-500/[0.03] border-emerald-500/20"
                            : "bg-white/[0.02] border-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox táctil visual */}
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all ${
                              estaListo
                                ? "bg-emerald-500 text-black border border-emerald-400"
                                : "border border-white/20 bg-white/[0.03]"
                            }`}
                          >
                            {estaListo && (
                              <svg
                                className="w-3.5 h-3.5 stroke-[3]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4.5 12.75l6 6 9-13.5"
                                />
                              </svg>
                            )}
                          </div>

                          <div className="min-w-0">
                            <span
                              className={`text-xs sm:text-sm block truncate ${
                                estaListo
                                  ? "line-through text-zinc-400"
                                  : "text-zinc-200 font-medium"
                              }`}
                            >
                              {it.name}
                            </span>
                            {it.category && (
                              <span className="text-[10px] text-zinc-500 block truncate">
                                {it.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Estado del ítem */}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md border shrink-0 ${
                            estaListo
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              : it.status === "En Proceso"
                              ? "bg-sky-500/10 border-sky-500/30 text-sky-300"
                              : "bg-white/[0.03] border-white/10 text-zinc-500"
                          }`}
                        >
                          {estaListo ? "Completado" : it.status || "Pendiente"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. TARJETA "MENSAJES CON EL TALLER" + ADJUNTOS EN CLOUDFLARE R2 */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      Mensajes con el taller
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Comunicación directa con el equipo técnico
                    </p>
                  </div>
                </div>

                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono">
                  En directo
                </span>
              </div>

              {/* Contenedor de Mensajes */}
              <div
                ref={chatScrollRef}
                className="max-h-64 min-h-[140px] overflow-y-auto space-y-2.5 p-3 rounded-xl bg-black/30 border border-white/[0.05] scrollbar-thin scrollbar-thumb-white/10"
              >
                {chatMensajes.length === 0 ? (
                  <div className="h-28 flex flex-col items-center justify-center text-center text-zinc-500 space-y-1">
                    <svg
                      className="w-6 h-6 stroke-[1.2] text-zinc-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3.57-3.091a48.71 48.71 0 00-4.043-.162c-2.453 0-4.83.21-7.137.618C3.155 17.65 2.25 16.592 2.25 15.344V10.6c0-.97.616-1.813 1.5-2.097a48.77 48.77 0 0116.5 0z"
                      />
                    </svg>
                    <p className="text-xs">Sin mensajes aún. Envía un mensaje al taller.</p>
                  </div>
                ) : (
                  chatMensajes.map((msg, i) => {
                    const esCliente = msg.role === "Cliente";

                    return (
                      <div
                        key={msg.id || i}
                        className={`flex flex-col ${esCliente ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-400">
                          <span className="font-semibold text-zinc-300">{msg.author}</span>
                          <span>•</span>
                          <span className="font-mono text-zinc-500">{msg.createdAt}</span>
                        </div>

                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed space-y-2 ${
                            esCliente
                              ? "bg-blue-600/30 border border-blue-500/35 text-white rounded-br-none shadow-sm"
                              : "bg-white/[0.05] border border-white/10 text-zinc-200 rounded-bl-none"
                          }`}
                        >
                          {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                          {/* Multimedia o archivo adjunto de Cloudflare R2 */}
                          {(msg.photoUrl || msg.attachmentUrl) && (() => {
                            const mediaUrl = msg.photoUrl || msg.attachmentUrl || "";
                            const esVideo = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(mediaUrl) || mediaUrl.includes("video");
                            const esAudio = /\.(mp3|wav|ogg|m4a|webm)(\?.*)?$/i.test(mediaUrl) || mediaUrl.includes("audio");
                            const esImg = /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(mediaUrl) || (!esVideo && !esAudio && !msg.attachmentName?.match(/\.(pdf|doc|docx)/i));

                            if (esVideo) {
                              return (
                                <div className="rounded-xl overflow-hidden border border-white/15 bg-black/60 p-1">
                                  <video src={mediaUrl} controls className="w-full max-h-56 rounded-lg bg-black" preload="metadata" />
                                </div>
                              );
                            }

                            if (esAudio) {
                              return (
                                <div className="rounded-xl p-2 bg-black/40 border border-white/10">
                                  <audio src={mediaUrl} controls className="w-full h-8" preload="metadata" />
                                </div>
                              );
                            }

                            if (esImg) {
                              return (
                                <a
                                  href={mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block rounded-xl overflow-hidden border border-white/15 bg-black/40 group hover:opacity-90 transition-opacity"
                                >
                                  <img
                                    src={mediaUrl}
                                    alt="Adjunto"
                                    className="w-full max-h-48 object-cover rounded-lg"
                                  />
                                </a>
                              );
                            }

                            return (
                              <a
                                href={mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block rounded-xl overflow-hidden border border-white/15 bg-black/40 group hover:opacity-90 transition-opacity p-2.5 flex items-center gap-2 text-xs text-sky-300"
                              >
                                <svg
                                  className="w-4 h-4 shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={1.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                  />
                                </svg>
                                <span className="truncate">
                                  {msg.attachmentName || "Ver documento adjunto"}
                                </span>
                              </a>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Previsualización del archivo adjunto a enviar */}
              {adjuntoUrl && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-200">
                  <div className="flex items-center gap-2 truncate">
                    <svg
                      className="w-4 h-4 text-blue-300 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                      />
                    </svg>
                    <span className="truncate">{adjuntoNombre || "Archivo adjunto listo"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjuntoUrl(null);
                      setAdjuntoNombre(null);
                    }}
                    className="w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Input oculto para subida a Cloudflare R2 */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleSubirAdjunto}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                className="hidden"
              />

              {/* Barra de Entrada y Botones */}
              <form onSubmit={handleEnviarMensaje} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={subiendoAdjunto}
                  className="h-10 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                  title="Adjuntar archivo o foto a Cloudflare R2"
                >
                  {subiendoAdjunto ? (
                    <svg
                      className="w-4 h-4 animate-spin text-sky-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                      />
                    </svg>
                  )}
                  <span className="hidden sm:inline">Adjuntar</span>
                </button>

                <input
                  type="text"
                  value={nuevoTexto}
                  onChange={(e) => setNuevoTexto(e.target.value)}
                  placeholder="Escribe un mensaje al taller..."
                  className="flex-1 h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500/50 text-white text-xs sm:text-sm placeholder:text-zinc-600 focus:outline-none transition-all"
                />

                <button
                  type="submit"
                  disabled={enviandoMensaje || (!nuevoTexto.trim() && !adjuntoUrl)}
                  className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-400/40 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-blue-600/20"
                  title="Enviar mensaje"
                >
                  <svg
                    className="w-4 h-4 -rotate-45 ml-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                </button>
              </form>
            </div>
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
        <div className="min-h-screen bg-[#070709] text-white flex items-center justify-center p-6">
          <div className="flex items-center gap-3 text-zinc-400 text-sm">
            <svg
              className="w-5 h-5 animate-spin text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>Cargando seguimiento de vehículo...</span>
          </div>
        </div>
      }
    >
      <SeguimientoOrdenContent />
    </Suspense>
  );
}
