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
  }, [token, isDaily, paramItemId, paramItemsList, paramItemName, paramPinId, paramSupplier, verTodos]);

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
      .replace(/^#/i, "")
      .trim();
    return raw.padStart(5, "0");
  }, [order]);

  return (
    <div className="min-h-screen bg-[#070b14] text-white font-sans selection:bg-blue-500/30 pb-28">
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

      {/* Contenido Principal Estilo Catálogo Solicitud de Cotización */}
      <main className="max-w-5xl mx-auto p-3 sm:p-6 space-y-4">
        {cargando ? (
          <div className="p-16 text-center space-y-3 bg-[#111827] rounded-3xl border border-slate-800">
            <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Cargando solicitud de cotización...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center bg-[#111827] rounded-3xl border border-rose-500/30 space-y-3">
            <div className="text-2xl">⚠️</div>
            <h2 className="text-sm font-bold text-white">{error}</h2>
          </div>
        ) : (
          <>
            {/* =================================================================
                CABECERA DE SOLICITUD DE COTIZACIÓN • OFICINA (DISEÑO IMAGEN 1)
               ================================================================= */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#111827] border border-slate-800/90 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start sm:items-center gap-4">
                {/* Icono Camión Azul */}
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.9}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.175V14.25m0 0H2.25m12 0v4.5m0-4.5H16.5"
                    />
                  </svg>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                      SOLICITUD DE COTIZACIÓN • OFICINA
                    </span>
                    {order?.plate && (
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wide shadow-xs">
                        PLACA: {order.plate}
                      </span>
                    )}
                    {isSingleView && allItemsCount > 1 && (
                      <button
                        type="button"
                        onClick={() => setVerTodos((v) => !v)}
                        className="px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 cursor-pointer transition-colors"
                      >
                        {verTodos ? "Ver filtrados" : `Ver todos (${allItemsCount})`}
                      </button>
                    )}
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {order
                      ? `${order.vehicle} — Orden #${numeroOrdenFormateado}`
                      : "Consolidado de Pedidos — Taller"}
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-400">
                    Centro Automotriz • Marque si dispone del repuesto, su precio de venta y tiempo de envío a Oficina.
                  </p>
                </div>
              </div>

              {/* Tarjeta Derecha: Proveedor Conectado */}
              <div className="rounded-2xl bg-[#0b111e] border border-slate-800 px-5 py-3.5 text-center md:text-right min-w-[230px] shrink-0 space-y-0.5">
                <div className="flex items-center justify-center md:justify-end gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Proveedor Conectado
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditandoProveedor((v) => !v)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                    title="Cambiar o editar proveedor"
                  >
                    ✎
                  </button>
                </div>

                {proveedoresUrl.length > 1 && !editandoProveedor ? (
                  <div className="pt-0.5">
                    <select
                      value={nombreProveedor}
                      onChange={(e) => {
                        const sel = proveedoresUrl.find((p: any) => p.name === e.target.value);
                        setNombreProveedor(e.target.value);
                        if (sel?.phone) setTelefonoProveedor(sel.phone);
                      }}
                      className="bg-transparent text-emerald-400 font-extrabold text-sm sm:text-base focus:outline-none cursor-pointer text-center md:text-right"
                    >
                      {proveedoresUrl.map((p: any, idx: number) => (
                        <option key={idx} value={p.name} className="bg-[#0b111e] text-white">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : editandoProveedor ? (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      value={nombreProveedor}
                      onChange={(e) => setNombreProveedor(e.target.value)}
                      placeholder="Nombre del proveedor"
                      className="w-full h-7 px-2 rounded-lg bg-[#111827] border border-slate-700 text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={telefonoProveedor}
                      onChange={(e) => setTelefonoProveedor(e.target.value)}
                      placeholder="WhatsApp"
                      className="w-full h-7 px-2 rounded-lg bg-[#111827] border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <>
                    <div
                      onClick={() => setEditandoProveedor(true)}
                      className="text-sm sm:text-base font-extrabold text-emerald-400 cursor-pointer hover:underline"
                      title="Clic para editar nombre"
                    >
                      {nombreProveedor || "Repuestos Japón Express"}
                    </div>
                    <div className="text-xs text-slate-400">
                      WhatsApp: {telefonoProveedor || "0987654321"}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* =================================================================
                LISTADO DE REPUESTOS / SERVICIOS SOLICITADOS (DISEÑO IMAGEN 1)
               ================================================================= */}
            {items.length === 0 ? (
              <div className="p-12 text-center bg-[#111827] rounded-3xl border border-slate-800 text-slate-400 text-xs">
                Sin ítems pendientes en este pedido.
              </div>
            ) : (
              <div className="space-y-4">
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
                        (item.notes && !item.notes.startsWith("[Evidencia")
                          ? item.notes
                          : "Requerimiento registrado en orden de trabajo");

                  return (
                    <div
                      key={item.id || idx}
                      className={`rounded-3xl bg-[#111827] border p-5 sm:p-6 shadow-xl transition-all space-y-4 ${
                        confirmado
                          ? "border-emerald-500/40"
                          : disp === "NO_HAY"
                          ? "border-rose-500/30"
                          : "border-slate-800/90"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        {/* Columna Izquierda: Detalles del Repuesto y Evidencia Adjunta */}
                        <div className="space-y-2.5 flex-1 min-w-0">
                          {/* Badges Superiores: #1 • Cant: 1 | Pin #1 • Frente Der. */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-bold">
                              #{idx + 1} • Cant: {item.qty || 1}
                            </span>

                            <span className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                              {item.pinNumber
                                ? `Pin #${item.pinNumber} • ${item.vistaLabel || "Frente Der."}`
                                : `Pin #${idx + 1} • ${item.vistaLabel || item.category || "Taller"}`}
                            </span>

                            {confirmado && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                                ✓ Confirmado
                              </span>
                            )}
                          </div>

                          {/* Daño / Detalle */}
                          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                            <span>Daño/Detalle: </span>
                            <strong className="text-slate-100 font-bold">
                              {detalleTexto}
                            </strong>
                          </p>

                          {/* Nombre del Repuesto / Servicio */}
                          <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                            {item.name}
                          </h3>

                          {/* Evidencia adjunta: Foto, Video, Audio */}
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <span className="text-xs text-slate-400 mr-1">
                              Evidencia adjunta:
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                if (fotosList.length > 0) {
                                  setFotoModal({
                                    fotos: fotosList,
                                    idx: 0,
                                    titulo: item.name,
                                  });
                                } else {
                                  mostrarToast("Sin foto adjunta en este ítem", "err");
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-400 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
                                />
                              </svg>
                              <span>Foto{fotosList.length > 1 ? ` (${fotosList.length})` : ""}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (videosList.length > 0) {
                                  setVideoModal({
                                    videos: videosList,
                                    titulo: item.name,
                                  });
                                } else if (fotosList.length > 0) {
                                  setFotoModal({
                                    fotos: fotosList,
                                    idx: 0,
                                    titulo: item.name,
                                  });
                                } else {
                                  mostrarToast("Sin video adjunto en este ítem", "err");
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-400 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                                />
                              </svg>
                              <span>Video{videosList.length > 1 ? ` (${videosList.length})` : ""}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (audiosList.length > 0) {
                                  setAudioAbiertoPorItem((prev) => ({
                                    ...prev,
                                    [item.id]: !prev[item.id],
                                  }));
                                } else {
                                  mostrarToast("Sin nota de audio en este ítem", "err");
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                                audioAbierto
                                  ? "bg-amber-500 text-black border-amber-400"
                                  : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-400"
                              }`}
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                                />
                              </svg>
                              <span>Audio{audiosList.length > 1 ? ` (${audiosList.length})` : ""}</span>
                            </button>
                          </div>
                        </div>

                        {/* Columna Derecha: Caja de Cotización (1. ¿LO TIENE? | 2. PRECIO ($) | 3. TIEMPO ENVÍO) */}
                        <div className="rounded-2xl bg-[#0b111e] border border-slate-800/90 p-4 flex flex-wrap sm:flex-nowrap items-end gap-3.5 sm:gap-4 shrink-0">
                          {/* 1. ¿LO TIENE? */}
                          <div className="space-y-1.5">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              1. ¿LO TIENE?
                            </span>
                            <div className="inline-flex rounded-xl bg-[#111827] border border-slate-700/80 p-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  actualizarCampoItem(item.id, {
                                    supplierAvailability: "SI_HAY",
                                  })
                                }
                                className={`h-9 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                                  disp === "SI_HAY"
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                <span>✓</span>
                                <span>Sí</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  actualizarCampoItem(item.id, {
                                    supplierAvailability: "NO_HAY",
                                    supplierPrice: 0,
                                  })
                                }
                                className={`h-9 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                                  disp === "NO_HAY"
                                    ? "bg-rose-600 text-white shadow-sm"
                                    : "text-slate-400 hover:text-white"
                                }`}
                              >
                                <span>✕</span>
                                <span>No</span>
                              </button>
                            </div>
                          </div>

                          {/* 2. PRECIO ($) */}
                          <div className="space-y-1.5">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              2. PRECIO ($)
                            </span>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs font-extrabold text-emerald-400">
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
                                placeholder="0,00"
                                className="w-28 sm:w-32 h-10 pl-7 pr-3 rounded-xl bg-[#111827] border border-slate-700/80 focus:border-emerald-500 text-sm font-extrabold text-white placeholder:text-slate-500 focus:outline-none disabled:opacity-40"
                              />
                            </div>
                          </div>

                          {/* 3. TIEMPO ENVÍO */}
                          <div className="space-y-1.5">
                            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              3. TIEMPO ENVÍO
                            </span>
                            <select
                              disabled={disp === "NO_HAY"}
                              value={item.deliveryTime || "30 min"}
                              onChange={(e) =>
                                actualizarCampoItem(item.id, {
                                  supplierAvailability: "SI_HAY",
                                  deliveryTime: e.target.value,
                                })
                              }
                              className="h-10 px-3 rounded-xl bg-[#111827] border border-slate-700/80 focus:border-amber-500 text-amber-400 font-extrabold text-sm focus:outline-none cursor-pointer disabled:opacity-40"
                            >
                              {OPCIONES_TIEMPO.map((t) => (
                                <option key={t} value={t} className="bg-[#111827] text-white">
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Reproductor de Audio Desplegable al pulsar "Audio" */}
                      {audioAbierto && audiosList.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 space-y-2 animate-fade-in">
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

      {/* Barra Inferior Fija de Confirmación Rápida */}
      {!cargando && !error && items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-[#0b111e]/95 backdrop-blur-xl border-t border-slate-800 px-4 py-3.5">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-slate-400 block">
                Disponibles: {resumenTotal.disponiblesCount} de {items.length} repuesto(s)
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                Total Cotizado: ${resumenTotal.totalValor.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              disabled={guardandoTodo}
              onClick={() => void handleGuardarRespuesta()}
              className="h-11 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>✓</span>
              <span>{guardandoTodo ? "Enviando a Oficina..." : "Enviar Cotización a Oficina"}</span>
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
