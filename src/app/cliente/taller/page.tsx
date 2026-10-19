"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface ChecklistItem {
  id: string;
  name: string;
  completed: boolean;
  status: string;
  price?: number;
}

interface ChatMessage {
  id: string;
  author: string;
  role: string;
  text?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

interface ActiveOrder {
  id: string;
  orderNumber: string;
  plate: string;
  vehicle: string;
  client: string;
  mechanic: string;
  status: string;
  progress: number;
  totalCost: number;
  paidAmount?: number;
  dateIn: string;
  estimatedOut: string;
  checklistItems: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  generalCondition?: string;
  internalChat: ChatMessage[];
  deliverySignatureUrl?: string;
}

const ETAPAS_PROCESO = [
  { id: "01", key: "pendiente", label: "Pendiente", desc: "Recepción inicial y registro del vehículo", color: "rose" },
  { id: "02", key: "diagnostico", label: "En Diagnóstico", desc: "Inspección técnica general y scanner", color: "blue" },
  { id: "03", key: "repuestos", label: "Esperando Repuestos", desc: "Suministro de partes y repuestos", color: "amber" },
  { id: "04", key: "aprobacion", label: "Esperando Aprobación", desc: "Presupuesto enviado para autorización", color: "purple" },
  { id: "05", key: "reparacion", label: "En Reparación", desc: "Trabajos en pista y banco de servicio", color: "cyan" },
  { id: "06", key: "completado", label: "Listo / Completado", desc: "Control de calidad y entrega lista", color: "emerald" },
];

function getEtapaIdx(status: string): number {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("entregad") || s.includes("cerrad") || s.includes("listo") || s.includes("terminad")) return 5;
  if (s.includes("repar") || s.includes("proceso") || s.includes("pista")) return 4;
  if (s.includes("aprob") || s.includes("presupuesto") || s.includes("cotiz")) return 3;
  if (s.includes("repuesto") || s.includes("pieza") || s.includes("pedid")) return 2;
  if (s.includes("diagn") || s.includes("inspecc")) return 1;
  return 0;
}

export default function ClienteTallerPage() {
  const [cargando, setCargando] = useState(true);
  const [orden, setOrden] = useState<ActiveOrder | null>(null);
  const [modalVoyEnCamino, setModalVoyEnCamino] = useState(false);
  const [modalFirma, setModalFirma] = useState(false);
  const [etaMinutos, setEtaMinutos] = useState(15);
  const [notaCamino, setNotaCamino] = useState("");
  const [enviandoCamino, setEnviandoCamino] = useState(false);
  const [toastMensaje, setToastMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  // Chat
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);
  const [adjuntoUrl, setAdjuntoUrl] = useState<string | null>(null);
  const [adjuntoNombre, setAdjuntoNombre] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Firma
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tieneFirma, setTieneFirma] = useState(false);
  const [guardandoFirma, setGuardandoFirma] = useState(false);

  useEffect(() => {
    async function cargar() {
      try {
        setCargando(true);
        const res = await fetch("/api/cliente/dashboard");
        const data = await res.json();
        if (data.success && data.activeOrder) {
          setOrden(data.activeOrder);
        } else {
          // Datos demostración si no hay orden activa en DB
          setOrden({
            id: "ord-1042",
            orderNumber: "1042",
            plate: "KXPT45",
            vehicle: "Toyota Corolla 2019",
            client: data.customer?.name || "Camila Rojas",
            mechanic: "Diego Muñoz",
            status: "En Reparación",
            progress: 62,
            totalCost: 172.514,
            paidAmount: 50.0,
            dateIn: "16 oct 2026",
            estimatedOut: "19 oct 2026",
            generalCondition: "Mantención de los 85.000 km y ruido al frenar",
            completedCount: 1,
            totalCount: 4,
            checklistItems: [
              { id: "c1", name: "Revisión de frenos delanteros", completed: true, status: "Listo", price: 35.0 },
              { id: "c2", name: "Cambio de aceite y filtro", completed: false, status: "En Proceso", price: 35.0 },
              { id: "c3", name: "Cambio de pastillas de freno", completed: false, status: "Pendiente", price: 62.514 },
              { id: "c4", name: "Prueba de ruta", completed: false, status: "Pendiente", price: 40.0 },
            ],
            internalChat: [],
          });
        }
      } catch (err) {
        console.error("Error al cargar orden:", err);
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  const etapaActualIdx = orden ? getEtapaIdx(orden.status) : 4;

  const handleNotificarVoyEnCamino = async () => {
    try {
      setEnviandoCamino(true);
      const res = await fetch("/api/cliente/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VOY_EN_CAMINO",
          etaMinutos,
          vehiclePlate: orden?.plate,
          orderId: orden?.id,
          nota: notaCamino,
          author: orden?.client || "Cliente",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setModalVoyEnCamino(false);
        setNotaCamino("");
        setToastMensaje({ tipo: "success", texto: data.message || `🚗 ¡Aviso enviado! El taller te espera en ${etaMinutos} min.` });
        setTimeout(() => setToastMensaje(null), 5000);
      }
    } catch {
      setToastMensaje({ tipo: "error", texto: "Error de red al enviar aviso." });
    } finally {
      setEnviandoCamino(false);
    }
  };

  const handleEnviarMensaje = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orden || (!nuevoMensaje.trim() && !adjuntoUrl)) return;
    try {
      setEnviandoMensaje(true);
      const res = await fetch("/api/cliente/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ENVIAR_MENSAJE_CHAT",
          orderId: orden.id,
          author: orden.client || "Cliente",
          text: nuevoMensaje.trim(),
          attachmentUrl: adjuntoUrl,
          attachmentName: adjuntoNombre,
        }),
      });
      const data = await res.json();
      if (data.success && data.chat) {
        setOrden((prev) => (prev ? { ...prev, internalChat: data.chat } : null));
        setNuevoMensaje("");
        setAdjuntoUrl(null);
        setAdjuntoNombre(null);
      }
    } finally {
      setEnviandoMensaje(false);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setTieneFirma(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const handleGuardarFirma = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !orden) return;
    try {
      setGuardandoFirma(true);
      const dataUrl = canvas.toDataURL("image/png");
      const res = await fetch("/api/cliente/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FIRMAR_RECEPCION",
          orderId: orden.id,
          signatureUrl: dataUrl,
          signerName: orden.client,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOrden((prev) => (prev ? { ...prev, deliverySignatureUrl: dataUrl } : null));
        setModalFirma(false);
        setToastMensaje({ tipo: "success", texto: "Firma registrada exitosamente." });
        setTimeout(() => setToastMensaje(null), 5000);
      }
    } finally {
      setGuardandoFirma(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 font-sans pb-16">
      <Header />

      {toastMensaje && (
        <div className="fixed top-20 right-4 z-50 max-w-md animate-bounce-short">
          <div className="p-4 rounded-2xl shadow-xl border bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <span>✅</span>
            <span>{toastMensaje.texto}</span>
          </div>
        </div>
      )}

      {/* Breadcrumb y Cabecera de Página */}
      <div className="border-b border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
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
              Módulo: Taller & Proceso en Vivo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalVoyEnCamino(true)}
              className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>🚗</span>
              <span>¡Voy en camino al taller!</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-grow w-full space-y-6">
        {cargando ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Sincronizando estado en pista del vehículo...</p>
          </div>
        ) : orden ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMNA 1: STEPPER VERTICAL (PROGRESO DE LA ORDEN) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Progreso de la orden
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                    Paso {etapaActualIdx + 1} de 6
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
                  <span className="text-blue-600">📅</span>
                  <span>Entrega estimada:</span>
                  <strong className="text-slate-900 dark:text-white">{orden.estimatedOut || "19 oct 2026"}</strong>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(15, ((etapaActualIdx + 1) / 6) * 100))}%` }}
                  />
                </div>

                <div className="pt-2 space-y-0">
                  {ETAPAS_PROCESO.map((etapa, idx) => {
                    const isPassed = idx < etapaActualIdx;
                    const isCurrent = idx === etapaActualIdx;
                    const isFuture = idx > etapaActualIdx;

                    let circleColor = "bg-slate-100 dark:bg-zinc-800 text-slate-400 border-2 border-slate-300 dark:border-zinc-700";
                    if (etapa.key === "pendiente") circleColor = "bg-rose-500 text-white";
                    else if (etapa.key === "diagnostico") circleColor = "bg-blue-600 text-white";
                    else if (etapa.key === "repuestos") circleColor = "bg-amber-500 text-white";
                    else if (etapa.key === "aprobacion") circleColor = "bg-purple-600 text-white";
                    else if (etapa.key === "reparacion") circleColor = "bg-cyan-500 text-white";
                    else if (etapa.key === "completado") circleColor = "bg-emerald-600 text-white";

                    if (isFuture) {
                      circleColor = "bg-white dark:bg-zinc-900 text-slate-300 dark:text-zinc-600 border-2 border-slate-200 dark:border-zinc-800";
                    }

                    return (
                      <div key={etapa.id} className="relative flex items-start gap-3 pb-6 last:pb-1">
                        {idx < ETAPAS_PROCESO.length - 1 && (
                          <span
                            className={`absolute left-[13px] top-[26px] bottom-0 w-[2px] ${
                              isPassed ? "bg-slate-300 dark:bg-zinc-700" : "bg-slate-200 dark:bg-zinc-800"
                            }`}
                          />
                        )}

                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${circleColor} ${
                            isCurrent ? "ring-4 ring-cyan-100 dark:ring-cyan-900/30 shadow-xs" : ""
                          }`}
                        >
                          {isPassed ? "✓" : isCurrent ? "⏳" : ""}
                        </div>

                        <div className="pt-0.5">
                          <div
                            className={`text-sm ${
                              isCurrent
                                ? "font-bold text-slate-900 dark:text-white"
                                : isPassed
                                ? "font-semibold text-slate-700 dark:text-zinc-300"
                                : "font-normal text-slate-400 dark:text-zinc-500"
                            }`}
                          >
                            {etapa.label}
                          </div>
                          {idx === 0 && (
                            <div className="text-[11px] text-slate-400">{orden.dateIn || "16 oct 2026"}</div>
                          )}
                          {isCurrent && (
                            <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                              {etapa.desc}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CHECKLIST */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Checklist de trabajos
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-xs font-mono font-semibold">
                    {orden.completedCount}/{orden.totalCount || 4}
                  </span>
                </div>
                <div className="space-y-2 pt-1">
                  {orden.checklistItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-xs sm:text-sm">
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${item.completed ? "bg-emerald-500 text-white" : "border-2 border-slate-300 dark:border-zinc-700"}`}>
                        {item.completed && "✓"}
                      </div>
                      <span className={item.completed ? "text-slate-400 line-through" : "text-slate-700 dark:text-zinc-200 font-medium"}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMNA 2: DETALLES + SERVICIOS */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs p-5 space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">VEHÍCULO</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{orden.vehicle}</h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 font-mono font-bold text-xs">
                    {orden.plate}
                  </span>
                  <span className="text-xs text-slate-500">Técnico: {orden.mechanic}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <span className="text-xs text-slate-400 block">Motivo de ingreso:</span>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium mt-0.5">
                    {orden.generalCondition || "Mantenimiento preventivo e inspección técnica."}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs p-5 space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Pagos & Comprobantes</h2>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-800">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Total de la Orden</span>
                    <strong className="text-base font-mono text-slate-900 dark:text-white">
                      ${Number(orden.totalCost).toFixed(2)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Abono Registrado</span>
                    <strong className="text-base font-mono text-emerald-600">
                      ${Number(orden.paidAmount || 50).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setModalFirma(true)}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
                  >
                    {orden.deliverySignatureUrl ? "✓ Recepción firmada" : "✍️ Firmar recepción"}
                  </button>
                  <Link
                    href="/cliente/facturas"
                    className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-medium"
                  >
                    Ver comprobantes →
                  </Link>
                </div>
              </div>

              {/* SERVICIOS Y REPUESTOS */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs p-5 space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Servicios y Repuestos</h2>
                <div className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                  {orden.checklistItems.map((item, idx) => (
                    <div key={idx} className="py-2.5 first:pt-0 flex items-center justify-between">
                      <span className="font-medium text-slate-800 dark:text-zinc-200">{item.name}</span>
                      <strong className="font-mono text-slate-900 dark:text-white">${Number(item.price || 35).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMNA 3: CHAT CON EL TALLER */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs p-5 space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>💬</span>
                  <span>Mensajes con el Taller</span>
                </h2>

                <div className="h-64 overflow-y-auto space-y-2 py-1 text-xs">
                  {orden.internalChat && orden.internalChat.length > 0 ? (
                    orden.internalChat.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2.5 rounded-xl ${
                          msg.role === "Cliente"
                            ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 ml-4"
                            : "bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 mr-4"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <strong>{msg.author}</strong>
                          <span>{msg.createdAt}</span>
                        </div>
                        <p>{msg.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400">
                      Sin mensajes aún. Consulta cualquier duda con el taller.
                    </div>
                  )}
                </div>

                <form onSubmit={handleEnviarMensaje} className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex gap-2">
                  <input
                    type="text"
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    placeholder="Escribe al taller..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={enviandoMensaje || !nuevoMensaje.trim()}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-40"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Modal Voy en camino */}
      {modalVoyEnCamino && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">🚗 ¡Voy en camino al taller!</h3>
            <p className="text-xs text-slate-500">¿En cuántos minutos estimas llegar?</p>
            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 30, 60].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setEtaMinutos(min)}
                  className={`py-2 rounded-xl text-xs font-bold ${etaMinutos === min ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-zinc-800"}`}
                >
                  {min === 60 ? "1h" : `${min}m`}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={notaCamino}
              onChange={(e) => setNotaCamino(e.target.value)}
              placeholder="Nota opcional..."
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs"
            />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalVoyEnCamino(false)} className="flex-1 py-2 text-xs font-semibold">Cancelar</button>
              <button onClick={handleNotificarVoyEnCamino} disabled={enviandoCamino} className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">
                {enviandoCamino ? "Enviando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Firma */}
      {modalFirma && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Firma de Recepción</h3>
            <div className="border border-slate-300 dark:border-zinc-700 rounded-2xl bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                width={380}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 cursor-crosshair touch-none"
              />
            </div>
            <div className="flex justify-between items-center text-xs">
              <button onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d");
                ctx?.clearRect(0, 0, canvas.width, canvas.height);
                setTieneFirma(false);
              }} className="text-slate-500">Borrar</button>
              <div className="flex gap-2">
                <button onClick={() => setModalFirma(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700">Cerrar</button>
                <button onClick={handleGuardarFirma} disabled={guardandoFirma || !tieneFirma} className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-40">
                  {guardandoFirma ? "Guardando..." : "Guardar Firma"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
