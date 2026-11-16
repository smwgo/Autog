"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { resolveAudioDuration } from "@/lib/audio-duration";

interface AudioEvidencia {
  id: string;
  url: string;
  durationSeconds?: number | null;
  transcriptionText?: string | null;
}

interface PedidoItem {
  id: string;
  findingId?: string | null;
  pinNumber?: number | null;
  vistaLabel?: string | null;
  category?: string;
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
  videos?: string[];
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
  "15 min",
  "30 min",
  "45 min",
  "1 hora",
  "2 horas",
  "Hoy",
  "Mañana",
  "24 horas",
  "48 horas",
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

  useEffect(() => {
    let active = true;
    setDuracion(0);
    setTiempoActual(0);
    void resolveAudioDuration(src).then((d) => {
      if (active && d > 0) {
        setDuracion((prev) => (prev > 0 ? prev : d));
      }
    });
    return () => {
      active = false;
    };
  }, [src]);

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
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-2.5 space-y-1.5">
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
          className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
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
            <span className="font-mono text-slate-400 tabular-nums">
              {!reproduciendo && tiempoActual === 0 && duracion > 0
                ? formatearTiempoAudio(duracion)
                : `${formatearTiempoAudio(tiempoActual)}${duracion > 0 ? ` / ${formatearTiempoAudio(duracion)}` : ""}`}
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
        <p className="text-[11px] text-slate-300 italic pl-10">
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
  const isDaily =
    token === "diario" || token.startsWith("daily_") || searchParams?.get("mode") === "daily";
  const paramItemId = searchParams?.get("itemId") || "";
  const paramItemsList = searchParams?.get("items") || "";
  const paramItemName = searchParams?.get("item") || "";
  const paramPinId = searchParams?.get("pinId") || "";
  const paramSupplier = searchParams?.get("supplier") || searchParams?.get("prov") || "";
  const paramPhone = searchParams?.get("phone") || searchParams?.get("tel") || "";
  const paramSuppliersJson = searchParams?.get("suppliers") || "";
  const paramSig = searchParams?.get("sig") || "";
  const paramSentAt = searchParams?.get("sentAt") || "";

  const [temaOscuro, setTemaOscuro] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("proveedor_tema");
      const isDark = saved ? saved === "dark" : document.documentElement.classList.contains("dark");
      setTemaOscuro(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    } catch {}
  }, []);

  const toggleTema = () => {
    setTemaOscuro((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("proveedor_tema", next ? "dark" : "light");
          document.documentElement.classList.toggle("dark", next);
        } catch {}
      }
      return next;
    });
  };

  const proveedoresUrl = useMemo(() => {
    if (!paramSuppliersJson) return [];
    try {
      const parsed = JSON.parse(paramSuppliersJson);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  }, [paramSuppliersJson]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any | null>(null);
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [fotoModal, setFotoModal] = useState<{
    fotos: string[];
    idx: number;
    titulo: string;
  } | null>(null);
  const [videoModal, setVideoModal] = useState<{
    videos: string[];
    titulo: string;
  } | null>(null);
  const [audioAbiertoPorItem, setAudioAbiertoPorItem] = useState<Record<string, boolean>>({});
  const [verTodos, setVerTodos] = useState(false);
  const [allItemsCount, setAllItemsCount] = useState(0);
  const [isSingleView, setIsSingleView] = useState(false);

  // Estado editable del proveedor conectado
  const [nombreProveedor, setNombreProveedor] = useState(
    paramSupplier || "Repuestos Japón Express"
  );
  const [telefonoProveedor, setTelefonoProveedor] = useState(
    paramPhone || "0987654321"
  );
  const [editandoProveedor, setEditandoProveedor] = useState(false);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [guardandoTodo, setGuardandoTodo] = useState(false);
  const [confirmadosIds, setConfirmadosIds] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);

  const mostrarToast = (msg: string, tipo: "ok" | "err" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (paramSupplier) setNombreProveedor(paramSupplier);
    if (paramPhone) setTelefonoProveedor(paramPhone);
  }, [paramSupplier, paramPhone]);

  useEffect(() => {
    async function cargarCatalogo() {
      try {
        setCargando(true);
        setError("");
        let endpoint = `/api/presupuestos/whatsapp-catalogo?orderId=${encodeURIComponent(token)}`;
        if (isDaily) {
          endpoint = `/api/presupuestos/whatsapp-catalogo?mode=daily`;
        } else if (!verTodos) {
          if (paramItemsList) endpoint += `&items=${encodeURIComponent(paramItemsList)}`;
          if (paramItemId) endpoint += `&itemId=${encodeURIComponent(paramItemId)}`;
          if (paramItemName) endpoint += `&item=${encodeURIComponent(paramItemName)}`;
          if (paramPinId) endpoint += `&pinId=${encodeURIComponent(paramPinId)}`;
        }
        if (paramSig) {
          endpoint += `&sig=${encodeURIComponent(paramSig)}`;
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
            const loadedItems: PedidoItem[] = (data.items || []).map((it: PedidoItem) => ({
              ...it,
              supplierAvailability:
                it.supplierAvailability && it.supplierAvailability !== "PENDIENTE"
                  ? it.supplierAvailability
                  : "SI_HAY",
              deliveryTime: it.deliveryTime || "30 min",
            }));
            setItems(loadedItems);
            setFotos(data.fotos || []);
            setAllItemsCount(Number(data.allItemsCount || loadedItems.length));
            setIsSingleView(Boolean(data.isSingleItemView));
            if (!paramSupplier) {
              const firstProv = loadedItems.find(
                (x) =>
                  x.supplierName &&
                  x.supplierName !== "Proveedor General" &&
                  x.supplierName !== "Bodega Taller"
              );
              if (firstProv?.supplierName) {
                setNombreProveedor(firstProv.supplierName);
              }
              if (firstProv?.supplierPhone) {
                setTelefonoProveedor(firstProv.supplierPhone);
              }
            }
          }
        } else {
          setError(data.error || "No se encontró el requerimiento.");
        }
      } catch {
        setError("Error de conexión al cargar el catálogo de pedido.");
      } finally {
        setCargando(false);
      }
    }

    if (token) {
      void cargarCatalogo();
    }
  }, [token, isDaily, paramItemId, paramItemsList, paramItemName, paramPinId, paramSupplier, paramSig, verTodos]);

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
          sig: paramSig || undefined,
          supplierName: nombreProveedor.trim() || "Proveedor",
          supplierPhone: telefonoProveedor.trim() || "",
          responses: listaEnviar.map((it) => ({
            id: it.id,
            name: it.name,
            isService: it.isService,
            supplierAvailability: it.supplierAvailability || "SI_HAY",
            supplierPrice: Number(it.supplierPrice || 0),
            deliveryTime: it.deliveryTime || "30 min",
            shippingMethod: it.shippingMethod || "",
            supplierNotes: it.supplierNotes || "",
            supplierName: nombreProveedor.trim() || it.supplierName || "Proveedor",
            supplierPhone: telefonoProveedor.trim() || it.supplierPhone || "",
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
            ? `✓ Cotización enviada: ${itemEspecifico.name}`
            : "✓ Cotización enviada a Oficina en tiempo real"
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

  const numeroOrdenFormateado = useMemo(() => {
    const raw = String(order?.orderNumber || "00001")
      .replace(/^ORD-/i, "")
      .replace(/^OT\s*#?/i, "")
      .replace(/#/g, "")
      .trim();
    return raw.padStart(5, "0");
  }, [order]);

  const fechaHoraEnvio = useMemo(() => {
    const raw = paramSentAt || order?.createdAt || order?.dateIn || "";
    if (!raw) return "";
    const num = Number(raw);
    const d = Number.isFinite(num) && num > 0 ? new Date(num) : new Date(String(raw));
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleString("es-EC", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [paramSentAt, order]);

  return (
    <div
      className={`min-h-screen font-sans selection:bg-purple-500/30 pb-24 transition-colors ${
        temaOscuro ? "bg-[#09090b] text-zinc-100" : "bg-zinc-50 text-zinc-900"
      }`}
    >
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

      {/* Contenido Principal Estilo Propuesta Limpio */}
      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-3.5">
        {cargando ? (
          <div className="p-14 text-center space-y-3 bg-[#111114] rounded-2xl border border-white/10">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-400">Cargando...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center bg-[#111114] rounded-2xl border border-rose-500/30 space-y-2">
            <div className="text-xl">⚠️</div>
            <h2 className="text-sm font-bold text-white">{error}</h2>
          </div>
        ) : (
          <>
            {/* CABECERA LIMPIA ESTILO PROPUESTA (TÍTULO UNA SOLA PALABRA) */}
            <header
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                temaOscuro
                  ? "bg-gradient-to-r from-purple-500/[0.08] via-[#111114] to-blue-500/[0.07] border-white/10"
                  : "bg-white border-zinc-200 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                {order && (
                  <div
                    className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center ${
                      temaOscuro
                        ? "bg-white/[0.04] border-white/10 text-zinc-400"
                        : "bg-zinc-100 border-zinc-200 text-zinc-500"
                    }`}
                  >
                    {order.vehiclePhoto ? (
                      <img
                        src={order.vehiclePhoto}
                        alt={order.vehicle || "Vehículo"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.175V14.25m0 0H2.25m12 0v4.5m0-4.5H16.5" />
                      </svg>
                    )}
                  </div>
                )}

                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1
                      className={`text-xl sm:text-2xl font-bold tracking-tight ${
                        temaOscuro ? "text-white" : "text-zinc-900"
                      }`}
                    >
                      Cotización
                    </h1>
                    <span
                      className={`font-mono text-xs sm:text-sm font-bold px-2 py-0.5 rounded-lg border ${
                        temaOscuro
                          ? "text-zinc-300 bg-white/[0.06] border-white/10"
                          : "text-zinc-700 bg-zinc-100 border-zinc-200"
                      }`}
                    >
                      #{numeroOrdenFormateado}
                    </span>
                    {isSingleView && allItemsCount > 1 && (
                      <button
                        type="button"
                        onClick={() => setVerTodos((v) => !v)}
                        className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors ${
                          temaOscuro
                            ? "bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-zinc-200"
                            : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700"
                        }`}
                      >
                        {verTodos ? "Filtrados" : `Ver todos (${allItemsCount})`}
                      </button>
                    )}
                  </div>

                  {order && (
                    <div
                      className={`flex items-center gap-2 flex-wrap text-xs sm:text-sm ${
                        temaOscuro ? "text-zinc-300" : "text-zinc-600"
                      }`}
                    >
                      <span className={`font-semibold ${temaOscuro ? "text-white" : "text-zinc-900"}`}>
                        {order.vehicle}
                      </span>
                      {order.plate && (
                        <span className="font-mono font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-md text-xs">
                          {order.plate}
                        </span>
                      )}
                      {fechaHoraEnvio && (
                        <span
                          className={`text-[11px] font-mono ${
                            temaOscuro ? "text-zinc-400" : "text-zinc-500"
                          }`}
                        >
                          · Enviado: {fechaHoraEnvio}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Proveedor Compacto + Botón Modo Claro / Oscuro */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={toggleTema}
                  title={temaOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                  aria-label="Cambiar modo claro u oscuro"
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                    temaOscuro
                      ? "bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-amber-300"
                      : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700"
                  }`}
                >
                  {temaOscuro ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                    </svg>
                  )}
                </button>

                <div
                  className={`rounded-xl border px-3.5 py-2.5 sm:text-right shrink-0 ${
                    temaOscuro ? "bg-black/30 border-white/10" : "bg-zinc-50 border-zinc-200"
                  }`}
                >
                {proveedoresUrl.length > 1 && !editandoProveedor ? (
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <select
                      value={nombreProveedor}
                      onChange={(e) => {
                        const sel = proveedoresUrl.find((p: any) => p.name === e.target.value);
                        setNombreProveedor(e.target.value);
                        if (sel?.phone) setTelefonoProveedor(sel.phone);
                      }}
                      className="bg-transparent text-emerald-400 font-bold text-sm focus:outline-none cursor-pointer"
                    >
                      {proveedoresUrl.map((p: any, idx: number) => (
                        <option key={idx} value={p.name} className="bg-[#111114] text-white">
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setEditandoProveedor(true)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      title="Editar proveedor"
                    >
                      ✎
                    </button>
                  </div>
                ) : editandoProveedor ? (
                  <div className="space-y-1.5 min-w-[180px]">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={nombreProveedor}
                        onChange={(e) => setNombreProveedor(e.target.value)}
                        placeholder="Proveedor"
                        className="w-full h-7 px-2 rounded-lg bg-zinc-900 border border-white/15 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setEditandoProveedor(false)}
                        className="h-7 px-2 rounded-lg bg-white/10 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                      >
                        ✓
                      </button>
                    </div>
                    <input
                      type="text"
                      value={telefonoProveedor}
                      onChange={(e) => setTelefonoProveedor(e.target.value)}
                      placeholder="WhatsApp"
                      className="w-full h-7 px-2 rounded-lg bg-zinc-900 border border-white/15 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center sm:justify-end gap-2">
                    <div>
                      <div
                        onClick={() => setEditandoProveedor(true)}
                        className="text-sm font-bold text-emerald-400 cursor-pointer hover:underline"
                        title="Clic para editar proveedor"
                      >
                        {nombreProveedor || "Proveedor"}
                      </div>
                      {telefonoProveedor && (
                        <div className="text-[11px] font-mono text-zinc-400">
                          {telefonoProveedor}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditandoProveedor(true)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      title="Editar proveedor"
                    >
                      ✎
                    </button>
                  </div>
                )}
                </div>
              </div>
            </header>

            {/* LISTADO LIMPIO DE ÍTEMS ESTILO PROPUESTA */}
            {items.length === 0 ? (
              <div
                className={`p-10 text-center rounded-2xl border text-xs ${
                  temaOscuro
                    ? "bg-[#111114] border-white/10 text-zinc-400"
                    : "bg-white border-zinc-200 text-zinc-500"
                }`}
              >
                Sin ítems pendientes en esta solicitud.
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  const fotosList =
                    Array.isArray(item.fotos) && item.fotos.length > 0
                      ? item.fotos
                      : item.imageUrl
                      ? [item.imageUrl]
                      : fotos.map((f) => f.url);
                  const videosList = Array.isArray(item.videos) ? item.videos : [];
                  const audiosList = Array.isArray(item.audios) ? item.audios : [];
                  const disp = item.supplierAvailability || "SI_HAY";
                  const confirmado = Boolean(confirmadosIds[item.id] || item.supplierRespondedAt);
                  const audioAbierto = Boolean(audioAbiertoPorItem[item.id]);
                  const detalleTexto =
                    item.danio && item.descripcion
                      ? `${item.danio} — ${item.descripcion}`
                      : item.descripcion ||
                        item.danio ||
                        (item.notes && !item.notes.startsWith("[Evidencia") ? item.notes : "");

                  const tieneEvidencia = fotosList.length > 0 || videosList.length > 0 || audiosList.length > 0;

                  return (
                    <div
                      key={item.id || idx}
                      className={`rounded-2xl bg-[#111114] border p-4 transition-all space-y-3 ${
                        confirmado
                          ? "border-emerald-500/40"
                          : disp === "NO_HAY"
                          ? "border-rose-500/30"
                          : "border-white/10"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                        {/* Izquierda: Cantidad + Nombre + Detalle + Evidencia */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-zinc-200 text-xs font-bold tabular-nums">
                              {item.qty || 1}x
                            </span>
                            <h3 className="text-sm sm:text-base font-bold text-white leading-snug truncate">
                              {item.name}
                            </h3>
                            {item.vistaLabel && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 text-blue-300 text-[11px] font-medium">
                                {item.vistaLabel}
                              </span>
                            )}
                            {confirmado && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                                ✓ Confirmado
                              </span>
                            )}
                          </div>

                          {detalleTexto && (
                            <p className="text-xs text-zinc-400 leading-relaxed">
                              {detalleTexto}
                            </p>
                          )}

                          {tieneEvidencia && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {fotosList.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setFotoModal({
                                      fotos: fotosList,
                                      idx: 0,
                                      titulo: item.name,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>📷</span>
                                  <span>Foto{fotosList.length > 1 ? ` (${fotosList.length})` : ""}</span>
                                </button>
                              )}

                              {videosList.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVideoModal({
                                      videos: videosList,
                                      titulo: item.name,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-purple-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>🎥</span>
                                  <span>Video{videosList.length > 1 ? ` (${videosList.length})` : ""}</span>
                                </button>
                              )}

                              {audiosList.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAudioAbiertoPorItem((prev) => ({
                                      ...prev,
                                      [item.id]: !prev[item.id],
                                    }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                                    audioAbierto
                                      ? "bg-amber-500 text-black border-amber-400"
                                      : "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-300"
                                  }`}
                                >
                                  <span>🎙️</span>
                                  <span>Audio{audiosList.length > 1 ? ` (${audiosList.length})` : ""}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Derecha: Controles limpios en una fila */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                          <div className="inline-flex rounded-xl bg-black/40 border border-white/10 p-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                actualizarCampoItem(item.id, {
                                  supplierAvailability: "SI_HAY",
                                })
                              }
                              className={`h-9 sm:h-8 px-3.5 sm:px-3 rounded-lg text-xs font-bold cursor-pointer transition-all touch-manipulation ${
                                disp === "SI_HAY"
                                  ? "bg-emerald-600 text-white"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                actualizarCampoItem(item.id, {
                                  supplierAvailability: "NO_HAY",
                                  supplierPrice: 0,
                                })
                              }
                              className={`h-9 sm:h-8 px-3.5 sm:px-3 rounded-lg text-xs font-bold cursor-pointer transition-all touch-manipulation ${
                                disp === "NO_HAY"
                                  ? "bg-rose-600 text-white"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              No
                            </button>
                          </div>

                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                              $
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
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
                              aria-label="Precio"
                              className="w-24 sm:w-28 h-9 pl-6 pr-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-emerald-500 text-base sm:text-sm font-bold text-white placeholder:text-zinc-500 focus:outline-none disabled:opacity-40 tabular-nums"
                            />
                          </div>

                          <select
                            disabled={disp === "NO_HAY"}
                            value={item.deliveryTime || "30 min"}
                            aria-label="Tiempo de envío"
                            onChange={(e) =>
                              actualizarCampoItem(item.id, {
                                supplierAvailability: "SI_HAY",
                                deliveryTime: e.target.value,
                              })
                            }
                            className="h-9 px-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-amber-500 text-amber-400 font-bold text-base sm:text-xs focus:outline-none cursor-pointer disabled:opacity-40"
                          >
                            {OPCIONES_TIEMPO.map((t) => (
                              <option key={t} value={t} className="bg-[#111114] text-white">
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Reproductor de Audio Desplegable */}
                      {audioAbierto && audiosList.length > 0 && (
                        <div className="pt-2 border-t border-white/10 space-y-2 animate-fade-in">
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
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Barra Inferior Fija Limpia */}
      {!cargando && !error && items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-[#09090b]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                ${resumenTotal.totalValor.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-400">
                {resumenTotal.disponiblesCount}/{items.length} disponibles
              </span>
            </div>

            <button
              type="button"
              disabled={guardandoTodo}
              onClick={() => void handleGuardarRespuesta()}
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>✓</span>
              <span>{guardandoTodo ? "Enviando..." : "Enviar Cotización"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Flotante de Fotos */}
      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-[#111827] border border-slate-800 rounded-3xl p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white truncate">
                📷 {fotoModal.titulo}
              </span>
              <button
                type="button"
                onClick={() => setFotoModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[70vh]">
              <img
                src={fotoModal.fotos[fotoModal.idx]}
                alt={fotoModal.titulo}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            {fotoModal.fotos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {fotoModal.fotos.map((fUrl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setFotoModal({ ...fotoModal, idx: i })}
                    className={`w-14 h-12 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer ${
                      fotoModal.idx === i ? "border-sky-400" : "border-transparent opacity-60"
                    }`}
                  >
                    <img src={fUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Flotante de Video */}
      {videoModal && (
        <div
          onClick={() => setVideoModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-[#111827] border border-slate-800 rounded-3xl p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white truncate">
                📹 {videoModal.titulo}
              </span>
              <button
                type="button"
                onClick={() => setVideoModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {videoModal.videos.map((vUrl, i) => (
                <video
                  key={i}
                  src={vUrl}
                  controls
                  autoPlay={i === 0}
                  className="w-full max-h-[65vh] rounded-2xl bg-black"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
