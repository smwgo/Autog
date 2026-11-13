"use client";

import React, { useMemo, useRef, useState } from "react";
import CatalogoProductosServiciosTaller from "@/components/taller/CatalogoProductosServiciosTaller";

export type ModuloEspecialidad = "taller" | "lubricentro" | "carwash" | "tecnicentro";

export interface EvidenciaRegistro {
  id: string;
  type: "foto" | "audio";
  url: string;
  modulo: string;
  createdAt: string;
}

interface RegistroFinalUnificadoProps {
  ordenActiva: any;
  moduloActivo: ModuloEspecialidad;
  onCambiarModulo?: (nuevo: ModuloEspecialidad) => void;
  productosCatalogo?: any[];
  serviciosCatalogo?: any[];
  onUpdateOrden: (updated: any) => void;
  mostrarToast?: (msg: string, tipo?: "ok" | "err") => void;
}

const MODULO_META: Record<
  ModuloEspecialidad,
  { label: string; badgeClass: string }
> = {
  taller: {
    label: "Taller",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  },
  lubricentro: {
    label: "Lubricentro",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  },
  carwash: {
    label: "Car Wash",
    badgeClass:
      "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
  },
  tecnicentro: {
    label: "Tecnicentro",
    badgeClass:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
  },
};

const ORDEN_CICLO_MODULOS: ModuloEspecialidad[] = [
  "taller",
  "lubricentro",
  "carwash",
  "tecnicentro",
];

const SERVICIOS_RAPIDOS_POR_MODULO: Record<ModuloEspecialidad, string[]> = {
  taller: [
    "Cambio de aceite",
    "Cambio de amortiguadores delanteros",
    "Cambio de amortiguadores posteriores",
    "Cambio de ruliman delantero",
    "Cambio de ruliman posterior",
    "Cambio de aceite de caja",
    "Cambio de aceite corona",
  ],
  lubricentro: [
    "Cambio de aceite",
    "Cambio de aceite de caja",
    "Cambio de aceite corona",
    "Lavado completo",
    "Lavado completo mas grafito",
    "Lavado exterior",
    "Aspirador interior",
    "Limpieza tapicería más lavado",
    "Lavado chasis",
  ],
  carwash: [
    "Lavado completo",
    "Lavado completo mas grafito",
    "Lavado exterior",
    "Aspirador interior",
    "Limpieza tapicería más lavado",
    "Lavado chasis",
  ],
  tecnicentro: [
    "Alineación",
    "Balanceo",
    "Rotación",
    "Corrección caída",
    "Corrección camber",
    "Corrección caster",
  ],
};

function formatearPrimeraMayuscula(texto?: string) {
  const s = (texto || "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getBadgeClasePorModulo(textoModulo?: string) {
  const m = (textoModulo || "").toLowerCase();
  if (m.includes("lubricentro")) return MODULO_META.lubricentro.badgeClass;
  if (m.includes("car wash") || m.includes("carwash")) return MODULO_META.carwash.badgeClass;
  if (m.includes("tecnicentro")) return MODULO_META.tecnicentro.badgeClass;
  if (m.includes("inspección") || m.includes("pin")) {
    return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30";
  }
  return MODULO_META.taller.badgeClass;
}

export default function RegistroFinalUnificado({
  ordenActiva,
  moduloActivo,
  onCambiarModulo,
  productosCatalogo = [],
  serviciosCatalogo = [],
  onUpdateOrden,
  mostrarToast,
}: RegistroFinalUnificadoProps) {
  const [descripcion, setDescripcion] = useState("");
  const [modalCarritoAbierto, setModalCarritoAbierto] = useState(false);
  const [modalRapidoAbierto, setModalRapidoAbierto] = useState(false);
  const [busquedaRapido, setBusquedaRapido] = useState("");
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [grabandoAudio, setGrabandoAudio] = useState(false);
  const [segundosAudio, setSegundosAudio] = useState(0);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);

  const inputCamaraRef = useRef<HTMLInputElement | null>(null);
  const inputGaleriaRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const metaModulo = MODULO_META[moduloActivo] || MODULO_META.taller;
  const itemsOrden: any[] = Array.isArray(ordenActiva?.items) ? ordenActiva.items : [];

  const evidenciasRegistradas: EvidenciaRegistro[] = useMemo(() => {
    const raw = ordenActiva?.inspectionChecklist?.registroEvidencias;
    return Array.isArray(raw) ? raw : [];
  }, [ordenActiva?.inspectionChecklist?.registroEvidencias]);

  const persistirItems = async (nuevosItems: any[]) => {
    if (!ordenActiva) return;
    const totalCost = nuevosItems.reduce(
      (sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
    const ordenActualizada = { ...ordenActiva, items: nuevosItems, totalCost };
    onUpdateOrden(ordenActualizada);

    if (ordenActiva.id) {
      try {
        const res = await fetch("/api/taller/operacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "GUARDAR_ETAPA_4_PRESUPUESTO",
            orderId: ordenActiva.id,
            items: nuevosItems,
            totalCost,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.success && data.activeOrder) {
          onUpdateOrden(data.activeOrder);
        }
      } catch (err) {
        console.error("Error al sincronizar ítems:", err);
      }
    }
  };

  const persistirEvidencias = async (nuevasEvidencias: EvidenciaRegistro[]) => {
    if (!ordenActiva) return;
    const nextChecklist = {
      ...(ordenActiva.inspectionChecklist || {}),
      registroEvidencias: nuevasEvidencias,
    };
    const ordenActualizada = { ...ordenActiva, inspectionChecklist: nextChecklist };
    onUpdateOrden(ordenActualizada);

    if (ordenActiva.id) {
      try {
        const res = await fetch("/api/taller/operacion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "GUARDAR_ETAPA_3_INSPECCION",
            orderId: ordenActiva.id,
            findings: ordenActiva.inspectionFindings || [],
            inspectionChecklist: nextChecklist,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.success && data.activeOrder) {
          onUpdateOrden(data.activeOrder);
        }
      } catch (err) {
        console.error("Error al sincronizar evidencias:", err);
      }
    }
  };

  const handleAgregarManual = async () => {
    const limpio = descripcion.trim();
    if (!limpio) return;
    const nuevoItem = {
      id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: `SRV-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      name: limpio,
      category: metaModulo.label,
      type: "SERVICE",
      price: 0,
      qty: 1,
      status: "Pendiente",
      isManual: true,
    };
    setDescripcion("");
    await persistirItems([...itemsOrden, nuevoItem]);
    mostrarToast?.(`Registrado en ${metaModulo.label}: ${limpio}`, "ok");
  };

  const handleAgregarDesdeSelector = async (
    item: { id?: string; code?: string; name: string; price?: number; presentation?: string },
    tipo: "PART" | "SERVICE"
  ) => {
    const idxExistente = itemsOrden.findIndex(
      (x: any) =>
        x.type === tipo &&
        ((item.id && (x.productId === item.id || x.id === item.id)) ||
          (item.code && x.code === item.code) ||
          x.name?.toLowerCase() === item.name.toLowerCase()) &&
        (x.category || metaModulo.label) === metaModulo.label
    );

    let nuevosItems: any[];
    if (idxExistente >= 0) {
      nuevosItems = itemsOrden.map((x: any, i: number) =>
        i === idxExistente ? { ...x, qty: (Number(x.qty) || 1) + 1 } : x
      );
    } else {
      const nuevo = {
        id: `${tipo === "PART" ? "prod" : "srv"}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: tipo === "PART" ? item.id : undefined,
        code: item.code || `${tipo === "PART" ? "PRD" : "SRV"}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        name: item.name,
        category: metaModulo.label,
        type: tipo,
        price: Number(item.price) || 0,
        qty: 1,
        status: "Pendiente",
        presentation: item.presentation,
      };
      nuevosItems = [...itemsOrden, nuevo];
    }

    await persistirItems(nuevosItems);
    mostrarToast?.(`Agregado (${metaModulo.label}): ${item.name}`, "ok");
  };

  const subirArchivoEvidencia = async (file: File, tipo: "foto" | "audio") => {
    try {
      setSubiendoArchivo(true);
      const formData = new FormData();
      formData.append("file", file, file.name || (tipo === "foto" ? "foto_evidencia.jpg" : "audio_evidencia.webm"));
      formData.append("folder", "taller-evidencias");
      formData.append("tipo", tipo);
      if (ordenActiva?.id) formData.append("orderId", ordenActiva.id);
      if (ordenActiva?.orderNumber) formData.append("orderNumber", ordenActiva.orderNumber);
      if (ordenActiva?.plate) formData.append("plate", ordenActiva.plate);
      formData.append("uploadedBy", ordenActiva?.mechanic || metaModulo.label);

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data?.success || !data?.url) {
        mostrarToast?.(data?.error || "No se pudo subir el archivo.", "err");
        return;
      }

      const nuevaEvidencia: EvidenciaRegistro = {
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: tipo,
        url: data.url,
        modulo: metaModulo.label,
        createdAt: new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
      };

      await persistirEvidencias([...evidenciasRegistradas, nuevaEvidencia]);
      mostrarToast?.(
        `${tipo === "foto" ? "Foto" : "Audio"} registrado en ${metaModulo.label}`,
        "ok"
      );
    } catch (err) {
      console.error("Error subiendo evidencia:", err);
      mostrarToast?.("Error al subir evidencia.", "err");
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const handleToggleAudio = async () => {
    if (grabandoAudio) {
      mediaRecorderRef.current?.stop();
      setGrabandoAudio(false);
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
        audioTimerRef.current = null;
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          const file = new File([blob], `audio_${Date.now()}.webm`, { type: "audio/webm" });
          void subirArchivoEvidencia(file, "audio");
        }
        setSegundosAudio(0);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setGrabandoAudio(true);
      setSegundosAudio(0);
      audioTimerRef.current = setInterval(() => {
        setSegundosAudio((prev) => prev + 1);
      }, 1000);
    } catch {
      mostrarToast?.("No se pudo acceder al micrófono.", "err");
    }
  };

  const handleAjustarCantidad = async (it: any, delta: number) => {
    const nuevaCant = (Number(it.qty) || 1) + delta;
    if (nuevaCant <= 0) {
      await handleEliminarItem(it);
      return;
    }
    const nuevos = itemsOrden.map((x: any) =>
      x.id === it.id && x.code === it.code ? { ...x, qty: nuevaCant } : x
    );
    await persistirItems(nuevos);
  };

  const handleEliminarItem = async (it: any) => {
    const nuevos = itemsOrden.filter(
      (x: any) => !(x.id === it.id && x.code === it.code && x.name === it.name)
    );
    await persistirItems(nuevos);
    mostrarToast?.(`Eliminado: ${it.name || it.fullName}`, "ok");
  };

  const productosSeleccionados = useMemo(
    () => itemsOrden.filter((it) => it.type === "PART"),
    [itemsOrden]
  );
  const serviciosSeleccionados = useMemo(
    () => itemsOrden.filter((it) => it.type !== "PART"),
    [itemsOrden]
  );

  const totalProductos = productosSeleccionados.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  const totalServicios = serviciosSeleccionados.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);

  const serviciosRapidosFiltrados = useMemo(() => {
    const q = busquedaRapido.trim().toLowerCase();
    const presets = (SERVICIOS_RAPIDOS_POR_MODULO[moduloActivo] || []).map((name, i) => ({
      id: `preset-${moduloActivo}-${i}`,
      name,
      code: `RAP-${i + 1}`,
      price: 0,
    }));
    return presets.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [busquedaRapido, moduloActivo]);

  if (!ordenActiva) return null;

  return (
    <div className="w-full space-y-4 pt-2 animate-fade-in">
      {/* 1. TARJETA DE REGISTRO MANUAL Y ACCIONES RÁPIDAS */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (!onCambiarModulo) return;
              const idxActual = ORDEN_CICLO_MODULOS.indexOf(moduloActivo);
              const siguiente =
                ORDEN_CICLO_MODULOS[(idxActual + 1) % ORDEN_CICLO_MODULOS.length];
              onCambiarModulo(siguiente);
            }}
            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
              onCambiarModulo ? "cursor-pointer hover:opacity-90" : ""
            } ${metaModulo.badgeClass}`}
            title="Cambiar especialidad (Taller / Lubricentro / Car Wash / Tecnicentro)"
          >
            {metaModulo.label}
          </button>
          {subiendoArchivo && (
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
              Subiendo archivo...
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Descripción
          </label>
          <div className="flex items-stretch gap-2">
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAgregarManual();
                }
              }}
              placeholder="Escribe una descripción..."
              className="flex-1 min-w-0 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 focus:border-blue-500/50 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={!descripcion.trim()}
              onClick={() => void handleAgregarManual()}
              className="px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-200 dark:disabled:bg-white/10 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white text-xs sm:text-sm font-semibold shrink-0 transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
            >
              Añadir
            </button>
          </div>
        </div>

        {/* 5 botones rápidos: Tomar foto, Subir foto, Audio, Producto, Servicio rápido */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputCamaraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void subirArchivoEvidencia(file, "foto");
              e.target.value = "";
            }}
          />
          <input
            ref={inputGaleriaRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach((f) => void subirArchivoEvidencia(f, "foto"));
              e.target.value = "";
            }}
          />

          <button
            type="button"
            disabled={subiendoArchivo}
            onClick={() => inputCamaraRef.current?.click()}
            title="Tomar foto"
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
            </svg>
          </button>

          <button
            type="button"
            disabled={subiendoArchivo}
            onClick={() => inputGaleriaRef.current?.click()}
            title="Subir foto"
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </button>

          <button
            type="button"
            disabled={subiendoArchivo}
            onClick={() => void handleToggleAudio()}
            title={grabandoAudio ? "Detener grabación" : "Grabar audio"}
            className={`h-10 sm:h-11 px-3 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
              grabandoAudio
                ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                : "bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
            {grabandoAudio && <span className="text-xs font-bold">{segundosAudio}s</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setModalCarritoAbierto(true);
              setModalRapidoAbierto(false);
            }}
            title="Productos y Servicios"
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
              modalCarritoAbierto
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalRapidoAbierto(true);
              setModalCarritoAbierto(false);
              setBusquedaRapido("");
            }}
            title="Servicio rápido"
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
              modalRapidoAbierto
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </button>
        </div>

        {/* Modal Flotante del Carrito: Buscador + P / S + Productos y Servicios */}
        {modalCarritoAbierto && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
            onClick={() => setModalCarritoAbierto(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 p-4 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    Productos y Servicios ({metaModulo.label})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalCarritoAbierto(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>

              <CatalogoProductosServiciosTaller
                itemsSeleccionados={itemsOrden}
                onAgregarItem={(item, delta = 1) => {
                  const idxExistente = itemsOrden.findIndex(
                    (x: any) =>
                      (item.id && (x.id === item.id || x.productId === item.id)) ||
                      (item.code && x.code === item.code) ||
                      (x.name?.toLowerCase() === item.name?.toLowerCase() &&
                        (x.category || metaModulo.label) === metaModulo.label)
                  );
                  let nuevosItems: any[];
                  if (idxExistente >= 0) {
                    const nuevaCant = (Number(itemsOrden[idxExistente].qty) || 1) + delta;
                    if (nuevaCant <= 0) {
                      nuevosItems = itemsOrden.filter((_, i) => i !== idxExistente);
                    } else {
                      nuevosItems = itemsOrden.map((x, i) =>
                        i === idxExistente ? { ...x, qty: nuevaCant } : x
                      );
                    }
                  } else if (delta > 0) {
                    nuevosItems = [
                      ...itemsOrden,
                      {
                        ...item,
                        id: item.id || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        productId: item.type === "PART" ? item.id : undefined,
                        category: metaModulo.label,
                        qty: delta,
                        status: "Pendiente",
                      },
                    ];
                  } else {
                    return;
                  }
                  void persistirItems(nuevosItems);
                }}
                onEliminarItem={(itemId) => {
                  const nuevos = itemsOrden.filter(
                    (x: any) => x.id !== itemId && x.productId !== itemId && x.code !== itemId
                  );
                  void persistirItems(nuevos);
                }}
                serviciosCatalogo={serviciosCatalogo}
                productosCatalogo={productosCatalogo}
                titulo="Catálogo"
                siempreAbierto={true}
                mostrarChipsSeleccionados={false}
                ocultarCabeceraYCategoria={true}
              />
            </div>
          </div>
        )}

        {/* Modal Flotante de Servicios Rápidos */}
        {modalRapidoAbierto && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
            onClick={() => setModalRapidoAbierto(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg max-h-[80dvh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 p-4 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    Accesos rápidos ({metaModulo.label})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalRapidoAbierto(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>

              <input
                type="text"
                value={busquedaRapido}
                onChange={(e) => setBusquedaRapido(e.target.value)}
                placeholder="Buscar servicio rápido..."
                autoFocus
                className="w-full rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                {serviciosRapidosFiltrados.map((it: any, idx: number) => (
                  <button
                    key={it.id || `${it.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      void handleAgregarDesdeSelector(
                        {
                          id: it.id,
                          code: it.code,
                          name: it.name,
                          price: it.price,
                        },
                        "SERVICE"
                      );
                    }}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 hover:bg-violet-50 dark:bg-white/[0.03] dark:hover:bg-violet-500/15 text-left text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <span className="truncate">{it.name}</span>
                    <span className="text-violet-600 dark:text-violet-400 font-bold shrink-0">+</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. RESUMEN UNIFICADO AL FINAL (PRODUCTOS, SERVICIOS Y EVIDENCIAS) */}
      {(productosSeleccionados.length > 0 ||
        serviciosSeleccionados.length > 0 ||
        evidenciasRegistradas.length > 0) && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs space-y-3.5 animate-fade-in">
          {/* PRODUCTOS */}
          {productosSeleccionados.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <span>📦</span>
                <span>Productos ({totalProductos}):</span>
              </span>
              <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-black/20 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold">
                      <th className="py-2 px-3 w-24 text-center">Cant.</th>
                      <th className="py-2 px-3">Descripción</th>
                      <th className="py-2 px-2.5 w-36">Detalle</th>
                      <th className="py-2 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                    {productosSeleccionados.map((it: any, idx: number) => {
                      const cant = Number(it.qty) || 1;
                      const origen = it.category || "Taller";
                      const extra = it.presentation || it.viscosity || "";
                      return (
                        <tr key={it.id || it.code || `prod-${idx}`} className="hover:bg-zinc-50/60 dark:hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-center">
                            <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-zinc-50 dark:bg-white/[0.04]">
                              <button
                                type="button"
                                onClick={() => void handleAjustarCantidad(it, -1)}
                                className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                {cant}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleAjustarCantidad(it, 1)}
                                className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                            {formatearPrimeraMayuscula(it.name || it.fullName)}
                          </td>
                          <td className="py-2 px-2.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getBadgeClasePorModulo(origen)}`}
                              >
                                {formatearPrimeraMayuscula(origen)}
                              </span>
                              {extra && (
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                                  {formatearPrimeraMayuscula(extra)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => void handleEliminarItem(it)}
                              className="w-6 h-6 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-bold cursor-pointer"
                              title="Eliminar"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SERVICIOS */}
          {serviciosSeleccionados.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <span>🔧</span>
                <span>Servicios ({totalServicios}):</span>
              </span>
              <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-black/20 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold">
                      <th className="py-2 px-3 w-24 text-center">Cant.</th>
                      <th className="py-2 px-3">Descripción</th>
                      <th className="py-2 px-2.5 w-36">Detalle</th>
                      <th className="py-2 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                    {serviciosSeleccionados.map((it: any, idx: number) => {
                      const cant = Number(it.qty) || 1;
                      const origen = it.category || "Taller";
                      return (
                        <tr key={it.id || it.code || `srv-${idx}`} className="hover:bg-zinc-50/60 dark:hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-center">
                            <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-zinc-50 dark:bg-white/[0.04]">
                              <button
                                type="button"
                                onClick={() => void handleAjustarCantidad(it, -1)}
                                className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                {cant}
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleAjustarCantidad(it, 1)}
                                className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                            {formatearPrimeraMayuscula(it.name || it.fullName)}
                          </td>
                          <td className="py-2 px-2.5">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getBadgeClasePorModulo(origen)}`}
                            >
                              {formatearPrimeraMayuscula(origen)}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => void handleEliminarItem(it)}
                              className="w-6 h-6 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-bold cursor-pointer"
                              title="Eliminar"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* EVIDENCIAS (FOTOS Y AUDIOS) */}
          {evidenciasRegistradas.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <span>📎</span>
                <span>Evidencias ({evidenciasRegistradas.length}):</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {evidenciasRegistradas.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-black/20"
                  >
                    {ev.type === "foto" ? (
                      <button
                        type="button"
                        onClick={() => setFotoPreviewUrl(ev.url)}
                        className="w-12 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10 cursor-zoom-in shrink-0"
                      >
                        <img src={ev.url} alt="Evidencia" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <audio controls src={ev.url} className="h-8 max-w-[200px]" />
                    )}
                    <div className="flex flex-col items-start gap-0.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getBadgeClasePorModulo(ev.modulo)}`}
                      >
                        {ev.modulo}
                      </span>
                      <span className="text-[10px] text-zinc-400">{ev.createdAt}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void persistirEvidencias(evidenciasRegistradas.filter((x) => x.id !== ev.id))
                      }
                      className="w-6 h-6 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-bold cursor-pointer"
                      title="Eliminar evidencia"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal simple para ampliar foto */}
      {fotoPreviewUrl && (
        <div
          onClick={() => setFotoPreviewUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={fotoPreviewUrl}
            alt="Evidencia ampliada"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
