"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface AudioEvidencia {
  id: string;
  url: string;
  durationSeconds?: number | null;
  transcriptionText?: string | null;
}

interface PedidoItem {
  id: string;
  findingId?: string | null;
  name: string;
  code?: string;
  qty: number;
  isService?: boolean;
  isManual?: boolean;
  supplierName?: string;
  supplierPhone?: string;
  notes?: string;
  danio?: string;
  descripcion?: string;
  imageUrl?: string | null;
  fotos?: string[];
  audios?: AudioEvidencia[];
  orderId?: string;
  orderNumber?: string;
  vehicle?: string;
  plate?: string;
  supplierAvailability?: "PENDIENTE" | "SI_HAY" | "NO_HAY";
  supplierPrice?: number;
  deliveryTime?: string;
  shippingMethod?: string;
  supplierNotes?: string;
  supplierRespondedAt?: string | null;
}

interface FotoItem {
  id: string;
  url: string;
}

const OPCIONES_TIEMPO = [
  "Inmediato",
  "15m",
  "30m",
  "45m",
  "1h",
  "2h",
  "Hoy",
  "Mañana",
  "24h",
  "48h",
];

const OPCIONES_ENVIO = [
  { id: "Motorizado", icon: "🛵" },
  { id: "Transporte", icon: "🚚" },
  { id: "Encomienda", icon: "📦" },
  { id: "Courier", icon: "✈️" },
  { id: "Retiro", icon: "🏪" },
];

function formatearTiempoAudio(seg: number) {
  if (!Number.isFinite(seg) || seg < 0) return "0:00";
  const total = Math.floor(seg);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MiniAudioPlayerProveedor({
  src,
  transcription,
  index,
}: {
  src: string;
  transcription?: string | null;
  index: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [tiempoActual, setTiempoActual] = useState(0);
  const [duracion, setDuracion] = useState(0);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (reproduciendo) {
      el.pause();
    } else {
      void el.play().catch(() => {});
    }
  };

  const progreso =
    duracion > 0 && Number.isFinite(duracion)
      ? Math.min(100, (tiempoActual / duracion) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-2.5 space-y-1.5">
      <div className="flex items-center gap-2.5">
        <audio
          ref={audioRef}
          src={src}
          playsInline
          preload="metadata"
          onPlay={() => setReproduciendo(true)}
          onPause={() => setReproduciendo(false)}
          onEnded={() => {
            setReproduciendo(false);
            setTiempoActual(0);
          }}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuracion(d);
          }}
          onDurationChange={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuracion(d);
          }}
          onTimeUpdate={(e) => {
            setTiempoActual(e.currentTarget.currentTime || 0);
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0 && d !== duracion) setDuracion(d);
          }}
          className="hidden"
        />

        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
          title={reproduciendo ? "Pausar" : "Escuchar"}
        >
          {reproduciendo ? (
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 translate-x-[0.5px]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-amber-300 flex items-center gap-1">
              <span>🎙️</span>
              <span>Audio #{index + 1}</span>
            </span>
            <span className="font-mono text-zinc-400 tabular-nums">
              {formatearTiempoAudio(tiempoActual)}
              {duracion > 0 ? ` / ${formatearTiempoAudio(duracion)}` : ""}
            </span>
          </div>
          <div
            onClick={(e) => {
              const el = audioRef.current;
              if (!el || !duracion || !Number.isFinite(duracion)) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              el.currentTime = ratio * duracion;
              setTiempoActual(el.currentTime);
            }}
            className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden cursor-pointer"
          >
            <div
              style={{ width: `${progreso}%` }}
              className="h-full rounded-full bg-amber-400 transition-all duration-100"
            />
          </div>
        </div>
      </div>

      {transcription && (
        <p className="text-[11px] text-zinc-300 italic pl-10">
          &quot;{transcription}&quot;
        </p>
      )}
    </div>
  );
}

export default function PaginaCatalogoProveedor() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = typeof params?.token === "string" ? decodeURIComponent(params.token) : "";
  const isDaily = token === "diario" || token.startsWith("daily_") || searchParams?.get("mode") === "daily";
  const paramItemId = searchParams?.get("itemId") || "";
  const paramItemName = searchParams?.get("item") || "";
  const paramPinId = searchParams?.get("pinId") || "";

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any | null>(null);
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [fotoActivaPorItem, setFotoActivaPorItem] = useState<Record<string, number>>({});
  const [verTodos, setVerTodos] = useState(false);
  const [allItemsCount, setAllItemsCount] = useState(0);
  const [isSingleView, setIsSingleView] = useState(false);

  // Estado editable de la cotización del proveedor
  const [nombreProveedor, setNombreProveedor] = useState("");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [guardandoTodo, setGuardandoTodo] = useState(false);
  const [confirmadosIds, setConfirmadosIds] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);

  const mostrarToast = (msg: string, tipo: "ok" | "err" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    async function cargarCatalogo() {
      try {
        setCargando(true);
        setError("");
        let endpoint = `/api/presupuestos/whatsapp-catalogo?orderId=${encodeURIComponent(token)}`;
        if (isDaily) {
          endpoint = `/api/presupuestos/whatsapp-catalogo?mode=daily`;
        } else if (!verTodos) {
          if (paramItemId) endpoint += `&itemId=${encodeURIComponent(paramItemId)}`;
          if (paramItemName) endpoint += `&item=${encodeURIComponent(paramItemName)}`;
          if (paramPinId) endpoint += `&pinId=${encodeURIComponent(paramPinId)}`;
        }

        const res = await fetch(endpoint);
        if (!res.ok) {
          let errText = `Error (${res.status})`;
          try {
            const errJson = await res.json();
            errText = errJson.error || errText;
          } catch {}
          setError(errText);
          return;
        }
        const data = await res.json();

        if (data.success) {
          if (data.mode === "daily") {
            setItems(data.pedidos || []);
          } else {
            setOrder(data.order || null);
            const loadedItems: PedidoItem[] = data.items || [];
            setItems(loadedItems);
            setFotos(data.fotos || []);
            setAllItemsCount(Number(data.allItemsCount || loadedItems.length));
            setIsSingleView(Boolean(data.isSingleItemView));
            const firstProv = loadedItems.find(
              (x) => x.supplierName && x.supplierName !== "Proveedor General" && x.supplierName !== "Bodega Taller"
            );
            if (firstProv?.supplierName) {
              setNombreProveedor(firstProv.supplierName);
            }
          }
        } else {
          setError(data.error || "No se encontró el requerimiento.");
        }
      } catch {
        setError("Error de conexión al cargar el pedido.");
      } finally {
        setCargando(false);
      }
    }

    if (token) {
      void cargarCatalogo();
    }
  }, [token, isDaily, paramItemId, paramItemName, paramPinId, verTodos]);

  const actualizarCampoItem = (itemId: string, cambios: Partial<PedidoItem>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, ...cambios } : it))
    );
  };

  const handleGuardarRespuesta = async (itemEspecifico?: PedidoItem) => {
    const targetOrderId = itemEspecifico?.orderId || order?.id || token;
    if (!targetOrderId) return;

    const listaEnviar = itemEspecifico ? [itemEspecifico] : items;
    if (listaEnviar.length === 0) return;

    try {
      if (itemEspecifico) setGuardandoId(itemEspecifico.id);
      else setGuardandoTodo(true);

      const res = await fetch("/api/presupuestos/whatsapp-catalogo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: targetOrderId,
          supplierName: nombreProveedor.trim() || undefined,
          responses: listaEnviar.map((it) => ({
            id: it.id,
            name: it.name,
            isService: it.isService,
            supplierAvailability: it.supplierAvailability || "SI_HAY",
            supplierPrice: Number(it.supplierPrice || 0),
            deliveryTime: it.deliveryTime || "",
            shippingMethod: it.shippingMethod || "",
            supplierNotes: it.supplierNotes || "",
            supplierName: nombreProveedor.trim() || it.supplierName || "Proveedor",
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const nuevosConf: Record<string, boolean> = { ...confirmadosIds };
        listaEnviar.forEach((it) => {
          nuevosConf[it.id] = true;
        });
        setConfirmadosIds(nuevosConf);
        mostrarToast(
          itemEspecifico
            ? `✓ Confirmado: ${itemEspecifico.name}`
            : "✓ Cotización enviada a la Propuesta en tiempo real"
        );
      } else {
        mostrarToast(data.error || "Error al guardar cotización", "err");
      }
    } catch {
      mostrarToast("Error de red al confirmar cotización", "err");
    } finally {
      setGuardandoId(null);
      setGuardandoTodo(false);
    }
  };

  const resumenTotal = useMemo(() => {
    const disponibles = items.filter((it) => it.supplierAvailability === "SI_HAY");
    const totalValor = disponibles.reduce(
      (acc, it) => acc + Number(it.supplierPrice || 0) * Number(it.qty || 1),
      0
    );
    return {
      disponiblesCount: disponibles.length,
      totalValor,
    };
  }, [items]);

  return (
    <div className="min-h-screen bg-[#070709] text-white font-sans selection:bg-blue-500/30 pb-24">
      {/* Toast Flotante */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2 ${
            toast.tipo === "ok"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-rose-500/20 border-rose-500/40 text-rose-300"
          }`}
        >
          <span>{toast.tipo === "ok" ? "✓" : "✕"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Barra Superior Minimalista */}
      <header className="sticky top-0 z-30 px-4 sm:px-6 py-3 bg-[#0a0a0e]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-blue-600/30">
              AG
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                {isDaily ? "Consolidado" : "Pedido"}
              </h1>
              <p className="text-[11px] text-zinc-400">
                {order ? `${order.vehicle} • ${order.plate}` : "Proveedor"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSingleView && allItemsCount > 1 && (
              <button
                type="button"
                onClick={() => setVerTodos((v) => !v)}
                className="h-8 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>📦</span>
                <span>{verTodos ? "Individual" : `Todo (${allItemsCount})`}</span>
              </button>
            )}
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Activo</span>
            </span>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-5xl mx-auto p-3 sm:p-6 space-y-4">
        {cargando ? (
          <div className="p-16 text-center space-y-3 bg-[#111115] rounded-3xl border border-white/10">
            <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-400">Cargando pedido...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center bg-[#111115] rounded-3xl border border-rose-500/30 space-y-3">
            <div className="text-2xl">⚠️</div>
            <h2 className="text-sm font-bold text-white">{error}</h2>
          </div>
        ) : (
          <>
            {/* Barra de Identificación de Vehículo y Proveedor */}
            {!isDaily && order && (
              <div className="p-4 sm:p-5 rounded-3xl bg-[#111115] border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-xl shrink-0">
                    🚗
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-bold text-white">
                        {order.vehicle}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black font-mono text-xs font-bold">
                        {order.plate}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 font-mono text-[11px]">
                        #{order.orderNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Marca disponibilidad, valor, tiempo y envío para actualizar la orden.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:w-64">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={nombreProveedor}
                      onChange={(e) => setNombreProveedor(e.target.value)}
                      placeholder="🏢 Proveedor..."
                      className="w-full h-9 px-3 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Listado de Ítems / Servicios a Cotizar */}
            {items.length === 0 ? (
              <div className="p-12 text-center bg-[#111115] rounded-3xl border border-white/10 text-zinc-400 text-xs">
                Sin ítems pendientes en este pedido.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item, idx) => {
                  const fotosList =
                    Array.isArray(item.fotos) && item.fotos.length > 0
                      ? item.fotos
                      : item.imageUrl
                      ? [item.imageUrl]
                      : [];
                  const fotoIdx = fotoActivaPorItem[item.id] || 0;
                  const fotoActual = fotosList[fotoIdx] || fotosList[0] || null;
                  const audiosList = Array.isArray(item.audios) ? item.audios : [];
                  const disp = item.supplierAvailability || "PENDIENTE";
                  const confirmado = Boolean(confirmadosIds[item.id] || item.supplierRespondedAt);

                  return (
                    <div
                      key={item.id || idx}
                      className={`rounded-3xl border p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all shadow-xl ${
                        disp === "SI_HAY"
                          ? "bg-[#111413] border-emerald-500/35"
                          : disp === "NO_HAY"
                          ? "bg-[#151112] border-rose-500/30"
                          : "bg-[#111115] border-white/10"
                      }`}
                    >
                      <div className="space-y-3.5">
                        {/* Cabecera del Ítem */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400">
                                #{idx + 1}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                  item.isService
                                    ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                                    : "bg-blue-500/15 border-blue-500/30 text-blue-300"
                                }`}
                              >
                                {item.isService ? "🔧 Servicio" : "📦 Producto"}
                              </span>
                              {item.isManual && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                                  ✍️ Manual
                                </span>
                              )}
                              {confirmado && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold">
                                  ✓ Enviado
                                </span>
                              )}
                            </div>

                            <h3 className="text-base font-bold text-white leading-snug">
                              {item.name}
                            </h3>

                            {(item.danio || item.descripcion || item.notes) && (
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                {item.danio ? (
                                  <strong className="text-rose-400 mr-1">{item.danio}:</strong>
                                ) : null}
                                {item.descripcion || item.notes}
                              </p>
                            )}
                          </div>

                          <div className="px-3 py-1.5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-300 font-black text-xs shrink-0">
                            x{item.qty}
                          </div>
                        </div>

                        {/* Galería de Fotos del Ítem */}
                        {fotoActual ? (
                          <div className="space-y-2">
                            <div
                              onClick={() => setFotoModal(fotoActual)}
                              className="w-full h-44 sm:h-48 rounded-2xl bg-black border border-white/10 overflow-hidden relative group cursor-pointer"
                            >
                              <img
                                src={fotoActual}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-xs border border-white/15 text-[11px] font-medium text-white flex items-center gap-1">
                                <span>🔍</span>
                                <span>Foto</span>
                              </div>
                            </div>

                            {fotosList.length > 1 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                                {fotosList.map((fUrl, fIdx) => (
                                  <button
                                    key={`th-${item.id}-${fIdx}`}
                                    type="button"
                                    onClick={() =>
                                      setFotoActivaPorItem((prev) => ({ ...prev, [item.id]: fIdx }))
                                    }
                                    className={`w-12 h-10 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                                      fotoIdx === fIdx
                                        ? "border-blue-500 scale-105"
                                        : "border-transparent opacity-60 hover:opacity-100"
                                    }`}
                                  >
                                    <img src={fUrl} alt="" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Reproductores de Audio en Página */}
                        {audiosList.length > 0 && (
                          <div className="space-y-1.5">
                            {audiosList.map((aud, aIdx) => (
                              <MiniAudioPlayerProveedor
                                key={aud.id || `aud-${aIdx}`}
                                src={aud.url}
                                transcription={aud.transcriptionText}
                                index={aIdx}
                              />
                            ))}
                          </div>
                        )}

                        {/* =========================================================
                            CONTROLES INTERACTIVOS DEL PROVEEDOR (1 PALABRA + ICONO)
                           ========================================================= */}
                        <div className="pt-2 border-t border-white/10 space-y-3">
                          {/* 1. STOCK (SÍ HAY / NO HAY) + 2. VALOR ($) */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="space-y-1">
                              <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                                <span>📦</span>
                                <span>Stock</span>
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    actualizarCampoItem(item.id, { supplierAvailability: "SI_HAY" })
                                  }
                                  className={`h-9 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
                                    disp === "SI_HAY"
                                      ? "bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/25"
                                      : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300"
                                  }`}
                                >
                                  <span>✓</span>
                                  <span>Sí hay</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    actualizarCampoItem(item.id, {
                                      supplierAvailability: "NO_HAY",
                                      supplierPrice: 0,
                                    })
                                  }
                                  className={`h-9 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
                                    disp === "NO_HAY"
                                      ? "bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-600/25"
                                      : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300"
                                  }`}
                                >
                                  <span>✕</span>
                                  <span>No hay</span>
                                </button>
                              </div>
                            </div>

                            {/* VALOR UNITARIO */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-medium text-zinc-400 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                  <span>💲</span>
                                  <span>Valor</span>
                                </span>
                                {item.qty > 1 && Number(item.supplierPrice) > 0 && (
                                  <span className="text-[10px] font-mono text-emerald-400">
                                    Total: ${(Number(item.supplierPrice) * item.qty).toFixed(2)}
                                  </span>
                                )}
                              </span>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-xs font-mono text-zinc-400">
                                  $
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  disabled={disp === "NO_HAY"}
                                  value={item.supplierPrice || ""}
                                  onChange={(e) =>
                                    actualizarCampoItem(item.id, {
                                      supplierAvailability: "SI_HAY",
                                      supplierPrice: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  placeholder="0.00"
                                  className="w-full h-9 pl-7 pr-3 rounded-xl bg-black/70 border border-white/15 focus:border-emerald-500 text-sm font-mono font-bold text-emerald-400 placeholder:text-zinc-600 focus:outline-none disabled:opacity-40"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 3. TIEMPO (DESLIZABLE 1 PALABRA) */}
                          {disp !== "NO_HAY" && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                                  <span>⏱️</span>
                                  <span>Tiempo</span>
                                </span>
                                {item.deliveryTime && (
                                  <span className="text-[11px] font-semibold text-blue-400">
                                    {item.deliveryTime}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {OPCIONES_TIEMPO.map((t) => {
                                  const activo = item.deliveryTime === t;
                                  return (
                                    <button
                                      key={t}
                                      type="button"
                                      onClick={() =>
                                        actualizarCampoItem(item.id, {
                                          supplierAvailability: "SI_HAY",
                                          deliveryTime: activo ? "" : t,
                                        })
                                      }
                                      className={`h-7 px-2.5 rounded-xl border text-[11px] font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                                        activo
                                          ? "bg-blue-600 border-blue-400 text-white font-semibold"
                                          : "bg-white/[0.04] hover:bg-white/10 border-white/10 text-zinc-300"
                                      }`}
                                    >
                                      {t}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 4. ENVÍO (POR DÓNDE LO ENVÍA - DESLIZABLE 1 PALABRA + ICONO) */}
                          {disp !== "NO_HAY" && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                                  <span>🚚</span>
                                  <span>Envío</span>
                                </span>
                                {item.shippingMethod && (
                                  <span className="text-[11px] font-semibold text-purple-400">
                                    {item.shippingMethod}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {OPCIONES_ENVIO.map((env) => {
                                  const activo = item.shippingMethod === env.id;
                                  return (
                                    <button
                                      key={env.id}
                                      type="button"
                                      onClick={() =>
                                        actualizarCampoItem(item.id, {
                                          supplierAvailability: "SI_HAY",
                                          shippingMethod: activo ? "" : env.id,
                                        })
                                      }
                                      className={`h-7 px-2.5 rounded-xl border text-[11px] font-medium shrink-0 flex items-center gap-1 cursor-pointer transition-all active:scale-95 ${
                                        activo
                                          ? "bg-purple-600 border-purple-400 text-white font-semibold"
                                          : "bg-white/[0.04] hover:bg-white/10 border-white/10 text-zinc-300"
                                      }`}
                                    >
                                      <span>{env.icon}</span>
                                      <span>{env.id}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botón Confirmar este Ítem */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-400 truncate">
                          {disp === "SI_HAY"
                            ? `✓ $${Number(item.supplierPrice || 0).toFixed(2)} ${item.deliveryTime ? `• ${item.deliveryTime}` : ""} ${item.shippingMethod ? `• ${item.shippingMethod}` : ""}`
                            : disp === "NO_HAY"
                            ? "✕ Sin stock"
                            : "Selecciona opción"}
                        </span>

                        <button
                          type="button"
                          disabled={guardandoId === item.id}
                          onClick={() => void handleGuardarRespuesta(item)}
                          className="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0 disabled:opacity-50"
                        >
                          <span>{guardandoId === item.id ? "..." : "✓"}</span>
                          <span>Confirmar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Barra Inferior Fija de Confirmación Rápida */}
      {!cargando && !error && items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-[#0a0a0e]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-zinc-400 block">
                Cotizados: {resumenTotal.disponiblesCount}/{items.length}
              </span>
              <span className="text-base font-black text-emerald-400 font-mono">
                Total: ${resumenTotal.totalValor.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              disabled={guardandoTodo}
              onClick={() => void handleGuardarRespuesta()}
              className="h-10 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>💾</span>
              <span>{guardandoTodo ? "Enviando..." : "Enviar"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Flotante de Foto Ampliada */}
      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setFotoModal(null)}
              className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 flex items-center justify-center text-lg z-10 cursor-pointer"
            >
              ✕
            </button>
            <img
              src={fotoModal}
              alt="Foto"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
