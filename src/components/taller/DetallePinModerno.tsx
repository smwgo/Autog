"use client";

import React, { useState } from "react";
import type { InspectionFinding } from "@/app/taller/page";
import CatalogoProductosServiciosTaller, { ResumenItemsSeleccionadosTaller } from "./CatalogoProductosServiciosTaller";

interface CatalogoItemPropuesta {
  id: string;
  name: string;
  code?: string;
  category?: string;
  brand?: string;
  type: "SERVICE" | "PART";
  price?: number;
  imageUrl?: string | null;
  qty?: number;
}

interface CatalogoItemFuente {
  id?: string | number;
  name?: string;
  title?: string;
  code?: string;
  category?: string;
  brand?: string;
  price?: number | string;
  stock?: number;
  imageUrl?: string | null;
  viscosity?: string;
}

export interface DetallePinModernoProps {
  pin: InspectionFinding;
  chipsTipos: { id: string; label: string; color: string }[];
  tipoSeleccionado: string;
  onToggleTipo: (tipoId: string) => void;
  onChangeTipo?: (nuevoTipo: string) => void;
  observacionTexto: string;
  onChangeObservacion: (text: string, targetPinId?: string) => void;
  // Audio
  escuchandoVoz: boolean;
  transcribiendoVoz?: boolean;
  segundosGrabandoAudio?: number;
  pinAccionActivaId?: string | null;
  onToggleVoz: (textoActual?: string, modo?: "dictado" | "audio", targetPinId?: string) => void;
  onSubirAudio?: (e: React.ChangeEvent<HTMLInputElement>, targetPinId?: string) => void;
  onTranscribirAudio?: (audioUrl: string, targetPinId: string) => void;
  reproduciendoAudio: boolean;
  onReproducirAudio?: (text: string) => void;
  onEliminarAudio?: (idx?: number, targetPinId?: string) => void;
  onEditarNotaKanban?: (noteIndex: number, nuevoTexto: string, targetPinId?: string) => void;
  onEliminarNotaKanban?: (noteIndex: number, targetPinId?: string) => void;
  onAgregarNotaKanban?: (texto: string, targetPinId?: string) => void;
  // Fotos (hasta 5 por bloque)
  subiendoFotos: boolean;
  onSubirFotos: (e: React.ChangeEvent<HTMLInputElement>, targetPinId?: string) => void;
  onEliminarFoto: (idx: number, e?: React.MouseEvent, targetPinId?: string) => void;
  // Navegación multi-hallazgos en el mismo pin
  hallazgosDelMismoPin?: InspectionFinding[];
  onSeleccionarHallazgoPin?: (hallazgoId: string) => void;
  onEliminarHallazgoEspecifico?: (hallazgoId: string) => void;
  // Acciones
  onDuplicarPin: () => void;
  onEliminarPin: () => void;
  onReubicarPin?: () => void;
  onCerrar: () => void;
  // Props opcionales de compatibilidad
  serviciosCatalogo?: CatalogoItemFuente[];
  productosCatalogo?: CatalogoItemFuente[];
  onAgregarItemPin?: (item: any, targetPinId?: string, deltaQty?: number) => void;
  onEliminarItemPin?: (itemId: string, targetPinId?: string) => void;
  onToggleSolicitaRepuesto?: (targetPinId: string, tipo: "repuesto" | "servicio", checked: boolean) => void;
  onCambiarModuloPin?: (targetPinId: string, modulo: "Taller" | "Lubricentro" | "Car Wash" | "Tecnicentro") => void;
}

const MODULOS_SEMAFORO = [
  {
    id: "Taller" as const,
    label: "Taller",
    dotClass: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]",
    pillClass:
      "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-400/35 hover:bg-blue-100/80 dark:hover:bg-blue-500/25",
  },
  {
    id: "Lubricentro" as const,
    label: "Lubricentro",
    dotClass: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
    pillClass:
      "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-400/35 hover:bg-amber-100/80 dark:hover:bg-amber-500/25",
  },
  {
    id: "Car Wash" as const,
    label: "Car Wash",
    dotClass: "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]",
    pillClass:
      "bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-400/35 hover:bg-cyan-100/80 dark:hover:bg-cyan-500/25",
  },
  {
    id: "Tecnicentro" as const,
    label: "Tecnicentro",
    dotClass: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    pillClass:
      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/35 hover:bg-emerald-100/80 dark:hover:bg-emerald-500/25",
  },
];

type ModuloSemaforoId = (typeof MODULOS_SEMAFORO)[number]["id"];

const ACCESOS_RAPIDOS_POR_MODULO: Record<ModuloSemaforoId, string[]> = {
  Taller: [
    "Cambio de aceite",
    "Cambio de amortiguadores delanteros",
    "Cambio de amortiguadores posteriores",
    "Cambio de ruliman delantero",
    "Cambio de ruliman posterior",
    "Cambio de aceite de caja",
    "Cambio de aceite corona",
  ],
  Lubricentro: [
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
  "Car Wash": [
    "Lavado completo",
    "Lavado completo mas grafito",
    "Lavado exterior",
    "Aspirador interior",
    "Limpieza tapicería más lavado",
    "Lavado chasis",
  ],
  Tecnicentro: [
    "Alineación",
    "Balanceo",
    "Rotación",
    "Corrección caída",
    "Corrección camber",
    "Corrección caster",
  ],
};

function getServicioRapidoMeta(nombre: string, fallbackModulo?: string): {
  tag: string;
  badgeClass: string;
  iconBoxClass: string;
  icon: React.ReactNode;
} {
  const n = (nombre || "").toLowerCase();

  // 1. Aceite de caja / transmisión
  if (n.includes("caja") || n.includes("transmision") || n.includes("transmisión")) {
    return {
      tag: "Transmisión",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      iconBoxClass: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
    };
  }

  // 2. Corona / diferencial
  if (n.includes("corona") || n.includes("diferencial")) {
    return {
      tag: "Diferencial",
      badgeClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
      iconBoxClass: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4m10 0h4M12 3v4m0 10v4" />
        </svg>
      ),
    };
  }

  // 3. Aceite de motor / lubricación
  if (n.includes("aceite") || n.includes("lubricante") || n.includes("filtro de aceite")) {
    return {
      tag: "Motor",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      iconBoxClass: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-3.75 5.25-6 8.25-6 11.25a6 6 0 0 0 12 0c0-3-2.25-6-6-11.25Z" />
        </svg>
      ),
    };
  }

  // 4. Amortiguadores / suspensión
  if (n.includes("amortiguador") || n.includes("suspension") || n.includes("suspensión") || n.includes("espiral")) {
    return {
      tag: "Suspensión",
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
      iconBoxClass: "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M8 5h8M7 8.5h10l-9 3.5h9l-9 3.5h10M8 19h8" />
        </svg>
      ),
    };
  }

  // 5. Rulimán / rodamiento
  if (n.includes("ruliman") || n.includes("rulimán") || n.includes("rodamiento")) {
    return {
      tag: "Rodamiento",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
      iconBoxClass: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="12" cy="6" r="1" fill="currentColor" />
          <circle cx="12" cy="18" r="1" fill="currentColor" />
          <circle cx="6" cy="12" r="1" fill="currentColor" />
          <circle cx="18" cy="12" r="1" fill="currentColor" />
        </svg>
      ),
    };
  }

  // 6. Lavado / grafito / chasis
  if (n.includes("grafito")) {
    return {
      tag: "Grafito",
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
      iconBoxClass: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      ),
    };
  }

  if (n.includes("chasis")) {
    return {
      tag: "Chasis",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
      iconBoxClass: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25H9.75M9.75 7.5l-3 4.5h7.5" />
        </svg>
      ),
    };
  }

  if (n.includes("lavado")) {
    return {
      tag: "Lavado",
      badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
      iconBoxClass: "bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      ),
    };
  }

  // 7. Interior / tapicería / aspirador
  if (n.includes("aspirad") || n.includes("interior") || n.includes("tapicer")) {
    return {
      tag: "Interior",
      badgeClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30",
      iconBoxClass: "bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      ),
    };
  }

  // 8. Alineación / Dirección
  if (n.includes("alineaci")) {
    return {
      tag: "Dirección",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
      iconBoxClass: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18" />
        </svg>
      ),
    };
  }

  // 9. Balanceo / Rotación / Llantas
  if (n.includes("balanceo") || n.includes("rotaci")) {
    return {
      tag: "Llantas",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
      iconBoxClass: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ),
    };
  }

  // 10. Geometría (caída, camber, caster)
  if (n.includes("caída") || n.includes("caida") || n.includes("camber") || n.includes("caster")) {
    return {
      tag: "Geometría",
      badgeClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
      iconBoxClass: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6h12v12" />
        </svg>
      ),
    };
  }

  // 11. Frenos
  if (n.includes("freno") || n.includes("pastilla") || n.includes("disco")) {
    return {
      tag: "Frenos",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
      iconBoxClass: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      ),
    };
  }

  // Fallback genérico
  const fallback = fallbackModulo || "Servicio";
  return {
    tag: fallback,
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:border-white/15",
    iconBoxClass: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:border-white/10",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.398-3.078 1.212l-6.83 6.83a2.25 2.25 0 0 1-3.182-3.182l6.83-6.83c.814-.814 1.303-2.002 1.212-3.078A4.5 4.5 0 0 1 16.5 2.25a.75.75 0 0 1 .53 1.28l-2.06 2.06a.75.75 0 0 0 1.06 1.06l2.06-2.06a.75.75 0 0 1 1.28.53Z" />
      </svg>
    ),
  };
}

export function DetallePinModerno({
  pin,
  chipsTipos: _chipsTipos,
  tipoSeleccionado,
  onToggleTipo,
  onChangeTipo,
  observacionTexto,
  onChangeObservacion,
  escuchandoVoz,
  transcribiendoVoz = false,
  segundosGrabandoAudio = 0,
  pinAccionActivaId = null,
  onToggleVoz,
  onSubirAudio,
  onTranscribirAudio,
  reproduciendoAudio: _reproduciendoAudio,
  onReproducirAudio: _onReproducirAudio,
  onEliminarAudio,
  onEditarNotaKanban,
  onEliminarNotaKanban,
  onAgregarNotaKanban,
  subiendoFotos,
  onSubirFotos,
  onEliminarFoto,
  onDuplicarPin,
  onEliminarPin,
  onReubicarPin,
  onCerrar,
  hallazgosDelMismoPin = [],
  onSeleccionarHallazgoPin,
  onEliminarHallazgoEspecifico,
  serviciosCatalogo = [],
  productosCatalogo = [],
  onAgregarItemPin,
  onEliminarItemPin,
  onToggleSolicitaRepuesto,
  onCambiarModuloPin,
}: DetallePinModernoProps) {
  const mismoNumero = pin.pinNumber || 1;
  const listaMismoPin = hallazgosDelMismoPin.filter(
    (h) => (h.pinNumber || 1) === mismoNumero && h.vista === pin.vista
  );
  const bloquesEvidencia = listaMismoPin.length > 0 ? listaMismoPin : [pin];

  const limpiarTipoInicial = (t?: string) => (!t || t.trim() === "Daño" ? "" : t);
  const [tipoTexto, setTipoTexto] = useState(() => limpiarTipoInicial(pin.tipo));
  const zonaActual = pin.zona || pin.vistaLabel || pin.vista || "";
  const [zonaPrincipal, ...subcategoriaParts] = zonaActual.split("·").map((parte) => parte.trim());
  const subcategoria = subcategoriaParts.join(" · ");

  // Modales para ver fotos ampliadas y reproducir videos en ventana propia
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [fotoModalData, setFotoModalData] = useState<{
    url: string;
    bloqueNum: number;
    fotoNum: number;
    descripcion: string;
  } | null>(null);
  const [audioClipReproduciendoUrl, setAudioClipReproduciendoUrl] = useState<string | null>(null);
  const audioClipPlayerRef = React.useRef<HTMLAudioElement | null>(null);
  const [camaraPcBloqueId, setCamaraPcBloqueId] = useState<string | null>(null);
  const videoCamaraPcRef = React.useRef<HTMLVideoElement | null>(null);
  const streamCamaraPcRef = React.useRef<MediaStream | null>(null);
  const inputCamaraFallbackRef = React.useRef<HTMLInputElement | null>(null);

  // Estado para formulario de producto o servicio manual y accesos rápidos
  const [manualBloqueId, setManualBloqueId] = useState<string | null>(null);
  const [accesoRapidoBloqueId, setAccesoRapidoBloqueId] = useState<string | null>(null);
  const [accesoRapidoTab, setAccesoRapidoTab] = useState<ModuloSemaforoId>("Taller");
  const [manualTipo, setManualTipo] = useState<"PART" | "SERVICE">("PART");
  const [manualNombre, setManualNombre] = useState<string>("");
  const [manualCant, setManualCant] = useState<number>(1);

  const handleAgregarManual = (bloqueId: string) => {
    const nombreLimpio = manualNombre.trim();
    if (!nombreLimpio) return;

    const manualId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const manualCode = `MANUAL-${manualTipo === "PART" ? "PRD" : "SRV"}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    if (onAgregarItemPin) {
      onAgregarItemPin(
        {
          id: manualId,
          name: nombreLimpio,
          code: manualCode,
          category: "Manual",
          type: manualTipo,
          qty: manualCant,
          price: 0,
        },
        bloqueId,
        manualCant
      );
    }

    setManualNombre("");
    setManualCant(1);
  };

  const detenerCamaraPc = () => {
    if (streamCamaraPcRef.current) {
      streamCamaraPcRef.current.getTracks().forEach((t) => t.stop());
      streamCamaraPcRef.current = null;
    }
    setCamaraPcBloqueId(null);
  };

  const abrirCamaraPcOMovil = async (targetBloqueId: string) => {
    const esMovil =
      typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (esMovil || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      inputCamaraFallbackRef.current?.setAttribute("data-bloque-id", targetBloqueId);
      inputCamaraFallbackRef.current?.click();
      return;
    }
    try {
      detenerCamaraPc();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamCamaraPcRef.current = stream;
      setCamaraPcBloqueId(targetBloqueId);
      setTimeout(() => {
        if (videoCamaraPcRef.current) {
          videoCamaraPcRef.current.srcObject = stream;
          videoCamaraPcRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      inputCamaraFallbackRef.current?.setAttribute("data-bloque-id", targetBloqueId);
      inputCamaraFallbackRef.current?.click();
    }
  };

  const capturarFotoDesdeCamaraPc = () => {
    const video = videoCamaraPcRef.current;
    const targetBloqueId = camaraPcBloqueId;
    if (!video || !targetBloqueId) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camara_${Date.now()}.jpg`, { type: "image/jpeg" });
        const fakeEvent = {
          target: { files: [file], value: "" },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onSubirFotos(fakeEvent, targetBloqueId);
        detenerCamaraPc();
      },
      "image/jpeg",
      0.9
    );
  };
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");

  const catalogoParaPropuesta = React.useMemo<CatalogoItemPropuesta[]>(() => {
    const servicios: CatalogoItemPropuesta[] = serviciosCatalogo
      .map((item) => ({
        id: String(item.id || item.code || item.name || ""),
        name: String(item.name || item.title || "").trim(),
        code: item.code ? String(item.code) : undefined,
        category: item.category ? String(item.category) : undefined,
        brand: item.brand ? String(item.brand) : undefined,
        type: "SERVICE" as const,
      }))
      .filter((item) => item.id && item.name);
    const productos: CatalogoItemPropuesta[] = productosCatalogo
      .map((item) => ({
        id: String(item.id || item.code || item.name || ""),
        name: String(item.name || item.title || "").trim(),
        code: item.code ? String(item.code) : undefined,
        category: item.category ? String(item.category) : undefined,
        brand: item.brand ? String(item.brand) : undefined,
        type: "PART" as const,
      }))
      .filter((item) => item.id && item.name);

    return [...servicios, ...productos];
  }, [productosCatalogo, serviciosCatalogo]);

  const resultadosCatalogo = React.useMemo(() => {
    const query = busquedaCatalogo.trim().toLocaleLowerCase();
    if (!query) return [];
    return catalogoParaPropuesta
      .filter((item) =>
        [item.name, item.code, item.category, item.brand]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase().includes(query))
      )
      .slice(0, 8);
  }, [busquedaCatalogo, catalogoParaPropuesta]);

  // Clasificación de evidencias: Fotos vs Videos
  const esVideoUrl = (url: string) =>
    /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(url) ||
    url.includes("taller_video") ||
    url.toLowerCase().includes("video");

  const formatearSegundos = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  React.useEffect(() => {
    return () => {
      if (audioClipPlayerRef.current) {
        audioClipPlayerRef.current.pause();
        audioClipPlayerRef.current = null;
      }
    };
  }, []);

  const handleTogglePlayAudioClip = (url: string) => {
    if (audioClipPlayerRef.current) {
      if (audioClipReproduciendoUrl === url && !audioClipPlayerRef.current.paused) {
        audioClipPlayerRef.current.pause();
        setAudioClipReproduciendoUrl(null);
        return;
      }
      audioClipPlayerRef.current.pause();
      audioClipPlayerRef.current = null;
    }
    const audio = new Audio(url);
    audioClipPlayerRef.current = audio;
    audio.onended = () => setAudioClipReproduciendoUrl(null);
    audio.onerror = () => setAudioClipReproduciendoUrl(null);
    audio
      .play()
      .then(() => setAudioClipReproduciendoUrl(url))
      .catch(() => setAudioClipReproduciendoUrl(null));
  };

  React.useEffect(() => {
    setTipoTexto(limpiarTipoInicial(pin.tipo));
  }, [pin.id]);

  const handleCambiarTipo = (val: string) => {
    setTipoTexto(val);
    if (onChangeTipo) {
      onChangeTipo(val);
    } else {
      onToggleTipo(val);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-white/10 p-4 sm:p-5 shadow-sm space-y-4 animate-fade-in font-sans">
      {/* Título de la tarjeta: Selector de Área (Taller / Lubricentro / Car Wash / Tecnicentro) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(() => {
            const bloqueActivo = bloquesEvidencia[0] || pin;
            const moduloActual = (bloqueActivo as any).modulo || "Taller";
            const idxModulo = MODULOS_SEMAFORO.findIndex((m) => m.id === moduloActual);
            const infoModulo = MODULOS_SEMAFORO[idxModulo >= 0 ? idxModulo : 0];
            const siguienteModulo =
              MODULOS_SEMAFORO[((idxModulo >= 0 ? idxModulo : 0) + 1) % MODULOS_SEMAFORO.length];

            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCambiarModuloPin?.(bloqueActivo.id, siguienteModulo.id);
                }}
                className={`px-2.5 py-1 rounded-md border text-xs sm:text-sm font-bold tracking-tight flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 ${infoModulo.pillClass}`}
                title={`Cambiar área (actual: ${infoModulo.label} → siguiente: ${siguienteModulo.label})`}
              >
                <span>{infoModulo.label}</span>
              </button>
            );
          })()}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onCerrar}
            className="h-7 w-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs font-bold flex items-center justify-center transition-all cursor-pointer border border-zinc-200 dark:border-white/10"
            title="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 3. BLOQUES DE EVIDENCIA ASOCIADOS (CADA BLOQUE VINCULA SU PROPIA DESCRIPCIÓN + FOTOS + AUDIO) */}
      <div className="space-y-3.5">
        {bloquesEvidencia.map((bloque, bIdx) => {
          const numBloque = bIdx + 1;
          const esPinPrincipal = bloque.id === pin.id;
          const textoBloque = esPinPrincipal
            ? observacionTexto !== ""
              ? observacionTexto
              : bloque.descripcion || ""
            : bloque.descripcion || "";

          const fotosRaw = bloque.photoUrls || (bloque.photoUrl ? [bloque.photoUrl] : []);
          const maxFotosBloque = fotosRaw.length >= 5;

          const soloFotosBloque = fotosRaw
            .map((url, originalIdx) => ({ url, originalIdx }))
            .filter((item) => !esVideoUrl(item.url));

          const soloVideosBloque = fotosRaw
            .map((url, originalIdx) => ({ url, originalIdx }))
            .filter((item) => esVideoUrl(item.url));

          const soloAudiosBloque =
            bloque.audioUrls && bloque.audioUrls.length > 0
              ? bloque.audioUrls
              : bloque.audioUrl
              ? [bloque.audioUrl]
              : [];

          const notasAudioBloque: string[] = Array.isArray((bloque as any).audioNotes)
            ? (bloque as any).audioNotes
            : [];
          const rawKanbanBloque: {
            id: string;
            text: string;
            createdAt?: string;
            source?: "audio" | "manual";
            audioIndex?: number;
          }[] = Array.isArray((bloque as any).kanbanNotes) ? (bloque as any).kanbanNotes : [];

          const notasKanbanBloque: {
            id: string;
            text: string;
            createdAt?: string;
            source?: "audio" | "manual";
            audioIndex?: number;
          }[] = (() => {
            const list = [...rawKanbanBloque];
            soloAudiosBloque.forEach((_audioUrl, aIdx) => {
              const yaExiste = list.some((n) => n.audioIndex === aIdx);
              if (!yaExiste) {
                const textoAudio = (notasAudioBloque[aIdx] || "").trim();
                if (textoAudio) {
                  list.push({
                    id: `kn-${bloque.id}-${aIdx}`,
                    text: textoAudio,
                    source: "audio",
                    audioIndex: aIdx,
                  });
                }
              }
            });
            return list;
          })();

          const totalEvidenciasBloque =
            soloFotosBloque.length +
            soloVideosBloque.length +
            soloAudiosBloque.length +
            notasKanbanBloque.length;

          const esteBloqueActivo =
            pinAccionActivaId === bloque.id || (!pinAccionActivaId && esPinPrincipal);
          const escuchandoEsteBloque = escuchandoVoz && esteBloqueActivo;
          const transcribiendoEsteBloque = transcribiendoVoz && esteBloqueActivo;
          const subiendoEsteBloque = subiendoFotos && esteBloqueActivo;

          return (
            <div
              key={bloque.id}
              onClick={() => {
                if (!esPinPrincipal && onSeleccionarHallazgoPin) {
                  onSeleccionarHallazgoPin(bloque.id);
                }
              }}
              className="space-y-3 w-full"
            >
              {/* Cabecera del Bloque Asociado (solo visible si hay múltiples bloques con acción de quitar) */}
              {bloquesEvidencia.length > 1 && onEliminarHallazgoEspecifico && (
                <div className="flex items-center justify-end gap-2 border-b border-zinc-200/70 dark:border-white/10 pb-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEliminarHallazgoEspecifico(bloque.id);
                    }}
                    className="h-7 px-2.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title={`Quitar Evidencia #${numBloque}`}
                  >
                    <span>✕</span>
                    <span>Quitar #{numBloque}</span>
                  </button>
                </div>
              )}

              {/* Campo Descripción asociado a las fotos de este bloque */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs sm:text-sm font-normal text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
                    <span>Descripción</span>
                  </label>
                  {textoBloque.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeObservacion("", bloque.id);
                      }}
                      className="text-xs px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-rose-50 dark:bg-white/[0.06] dark:hover:bg-rose-500/20 text-zinc-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 font-semibold transition-colors cursor-pointer"
                      title="Limpiar texto de esta evidencia"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="flex items-stretch gap-2">
                  <div className="grid flex-1 min-w-0">
                    <div
                      aria-hidden="true"
                      className="invisible [grid-area:1/1/2/2] w-full rounded-xl border border-transparent pl-3.5 pr-3 py-2.5 sm:py-3 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words min-h-[2.75rem]"
                    >
                      {(textoBloque || "Escribe una descripción...") + "\n"}
                    </div>
                    <textarea
                      rows={1}
                      value={textoBloque}
                      onChange={(e) => onChangeObservacion(e.target.value, bloque.id)}
                      placeholder="Escribe una descripción..."
                      className="[grid-area:1/1/2/2] w-full h-full overflow-hidden resize-none rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 focus:border-blue-500/50 pl-3.5 pr-3 py-2.5 sm:py-3 text-zinc-900 dark:text-white text-sm sm:text-base placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none transition-all leading-relaxed whitespace-pre-wrap break-words"
                    />
                  </div>
                  {(onAgregarNotaKanban || onAgregarItemPin) && (
                    <button
                      type="button"
                      disabled={!textoBloque.trim()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const limpio = textoBloque.trim();
                        if (!limpio) return;
                        const moduloArea = (bloque as any).modulo || "Taller";
                        onAgregarNotaKanban?.(limpio, bloque.id);
                        onAgregarItemPin?.(
                          {
                            id: `desc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                            name: limpio,
                            code: `SRV-${Date.now().toString(36).slice(-4).toUpperCase()}`,
                            category: moduloArea,
                            type: "SERVICE",
                            price: 0,
                            qty: 1,
                          },
                          bloque.id,
                          1
                        );
                        onChangeObservacion("", bloque.id);
                      }}
                      className="px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-200 dark:disabled:bg-white/10 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white text-xs sm:text-sm font-semibold shrink-0 transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-xs"
                      title="Añadir descripción a servicios"
                    >
                      Añadir
                    </button>
                  )}
                </div>
              </div>

              {/* Botonera de Captura asociada a este bloque */}
              <div className="space-y-2.5">
                {subiendoEsteBloque && (
                  <div className="flex items-center justify-end text-xs px-0.5">
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      Guardando en la nube...
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* Botón Tomar foto con la cámara (PC Webcam en vivo + Móvil Cámara trasera) */}
                  <button
                    type="button"
                    title={`Tomar foto con cámara para Evidencia #${numBloque}`}
                    disabled={maxFotosBloque || subiendoEsteBloque}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (maxFotosBloque || subiendoEsteBloque) return;
                      abrirCamaraPcOMovil(bloque.id);
                    }}
                    className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden ${
                      maxFotosBloque || subiendoEsteBloque
                        ? "bg-zinc-100 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                        : "bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 active:scale-95 shadow-sm"
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                  </button>

                  {/* Botón Seleccionar foto de galería */}
                  <label
                    title={`Seleccionar foto de galería para Evidencia #${numBloque}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden ${
                      maxFotosBloque || subiendoEsteBloque
                        ? "bg-zinc-100 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                        : "bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 active:scale-95 shadow-sm"
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                      />
                    </svg>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={maxFotosBloque || subiendoEsteBloque}
                      onChange={(e) => onSubirFotos(e, bloque.id)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </label>

                  {/* Botón Grabar Nota de Audio asociada a esta evidencia (PC y Móvil) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVoz(textoBloque, "audio", bloque.id);
                    }}
                    title={
                      escuchandoEsteBloque
                        ? "Detener y guardar grabación de audio"
                        : `Grabar nota de audio en PC/Móvil para Evidencia #${numBloque}`
                    }
                    className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden active:scale-95 shadow-sm touch-manipulation select-none ${
                      escuchandoEsteBloque
                        ? "bg-rose-600 text-white border-rose-700 animate-pulse ring-2 ring-rose-400/50"
                        : "bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {escuchandoEsteBloque ? (
                      <div className="flex flex-col items-center">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping mb-0.5" />
                        <span className="text-[9px] font-mono font-bold">
                          {formatearSegundos(segundosGrabandoAudio)}
                        </span>
                      </div>
                    ) : (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Botón Carrito de Compras: Escoger Productos y Servicios (Modal Flotante) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setManualBloqueId((prev) => (prev === bloque.id ? null : bloque.id));
                    }}
                    title={`Escoger productos y servicios para Evidencia #${numBloque}`}
                    className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden active:scale-95 shadow-sm touch-manipulation select-none ${
                      manualBloqueId === bloque.id
                        ? "bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/50 shadow-md"
                        : "bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                      />
                    </svg>
                  </button>

                  {/* Botón Acceso Rápido: Escoger servicios frecuentes según Taller / Lubricentro / Car Wash / Tecnicentro */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const moduloBloque = ((bloque as any).modulo || "Taller") as ModuloSemaforoId;
                      setAccesoRapidoTab(moduloBloque);
                      setAccesoRapidoBloqueId((prev) => (prev === bloque.id ? null : bloque.id));
                    }}
                    title="Accesos rápidos"
                    className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer overflow-hidden active:scale-95 shadow-sm touch-manipulation select-none ${
                      accesoRapidoBloqueId === bloque.id
                        ? "bg-violet-600 text-white border-violet-700 ring-2 ring-violet-400/50 shadow-md"
                        : "bg-violet-50/80 hover:bg-violet-100 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 border-violet-200 dark:border-violet-500/30 text-violet-600 dark:text-violet-400"
                    }`}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z"
                      />
                    </svg>
                  </button>
                </div>

                {/* Modal Flotante de Accesos Rápidos */}
                {accesoRapidoBloqueId === bloque.id && (() => {
                  const infoTab =
                    MODULOS_SEMAFORO.find((m) => m.id === accesoRapidoTab) || MODULOS_SEMAFORO[0];
                  const itemsRapidos = ACCESOS_RAPIDOS_POR_MODULO[infoTab.id] || [];
                  const itemsEnBloque = Array.isArray(bloque.linkedItems) ? bloque.linkedItems : [];

                  return (
                    <div
                      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccesoRapidoBloqueId(null);
                      }}
                    >
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 p-4 shadow-2xl space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${infoTab.dotClass}`} />
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                              Accesos Rápidos — {infoTab.label}
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAccesoRapidoBloqueId(null)}
                            className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-300 text-xs font-bold flex items-center justify-center cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {MODULOS_SEMAFORO.map((mod) => {
                            const activo = mod.id === infoTab.id;
                            return (
                              <button
                                key={mod.id}
                                type="button"
                                onClick={() => setAccesoRapidoTab(mod.id)}
                                className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                                  activo
                                    ? mod.pillClass
                                    : "bg-zinc-50 dark:bg-white/[0.03] border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10"
                                }`}
                              >
                                {mod.label}
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {itemsRapidos.map((nombre) => {
                            const quickId = `quick-${infoTab.id
                              .toLowerCase()
                              .replace(/\s+/g, "-")}-${nombre
                              .toLowerCase()
                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/(^-|-$)/g, "")}`;
                            const existente = itemsEnBloque.find(
                              (it) => it.id === quickId || it.name.toLowerCase() === nombre.toLowerCase()
                            );

                            const meta = getServicioRapidoMeta(nombre, infoTab.label);

                            return (
                              <button
                                key={quickId}
                                type="button"
                                onClick={() => {
                                  onAgregarItemPin?.(
                                    {
                                      id: quickId,
                                      name: nombre,
                                      code: "RAPIDO",
                                      category: infoTab.label,
                                      type: "SERVICE",
                                      price: 0,
                                      qty: 1,
                                    },
                                    bloque.id,
                                    1
                                  );
                                }}
                                className={`group text-left p-2.5 rounded-xl border transition-all cursor-pointer active:scale-[0.98] flex items-center justify-between gap-2.5 ${
                                  existente
                                    ? "bg-violet-50/90 dark:bg-violet-500/15 border-violet-300 dark:border-violet-400/40 text-violet-900 dark:text-violet-100 shadow-xs"
                                    : "bg-zinc-50/70 dark:bg-white/[0.02] hover:bg-zinc-100/90 dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${meta.iconBoxClass}`}
                                  >
                                    {meta.icon}
                                  </div>
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100 text-xs sm:text-[13px] leading-snug break-words group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors flex-1 min-w-0">
                                    {nombre}
                                  </span>
                                </div>
                                {existente ? (
                                  <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold shrink-0">
                                    ✓ {existente.qty}
                                  </span>
                                ) : (
                                  <span className="w-6 h-6 rounded-lg bg-zinc-200/60 dark:bg-white/10 group-hover:bg-violet-600 group-hover:text-white dark:group-hover:bg-violet-500 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 transition-colors">
                                    +
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Modal Flotante para escoger Productos y Servicios con filtros P / S */}
                {manualBloqueId === bloque.id && (
                  <div
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      setManualBloqueId(null);
                    }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="relative w-full max-w-2xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 p-4 shadow-2xl space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-sm font-bold text-zinc-900 dark:text-white">
                            Productos y Servicios
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setManualBloqueId(null)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                          title="Cerrar"
                        >
                          ✕
                        </button>
                      </div>

                      <CatalogoProductosServiciosTaller
                        itemsSeleccionados={bloque.linkedItems || []}
                        onAgregarItem={(item, delta) => onAgregarItemPin?.(item, bloque.id, delta)}
                        onEliminarItem={(itemId) => onEliminarItemPin?.(itemId, bloque.id)}
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

                {/* Indicador activo con diseño moderno de ondas al grabar audio en este bloque */}
                {escuchandoEsteBloque && (
                  <div className="relative overflow-hidden p-3.5 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-amber-500/10 dark:from-rose-500/20 dark:via-zinc-900/90 dark:to-amber-500/15 text-rose-700 dark:text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-500/10 animate-fade-in">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/30 shrink-0">
                        <span className="animate-ping absolute inset-0 rounded-xl bg-rose-500 opacity-30"></span>
                        <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-mono font-black tracking-wider shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {formatearSegundos(segundosGrabandoAudio)}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                            Grabando...
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1 h-3">
                          {[0.35, 0.85, 0.55, 1, 0.45, 0.9, 0.6, 0.95, 0.4, 0.75, 0.5, 0.8, 0.65, 0.35].map((h, idx) => (
                            <span
                              key={idx}
                              style={{
                                height: `${Math.max(25, Math.round(h * 100))}%`,
                                animationDelay: `${idx * 90}ms`,
                              }}
                              className="w-1 rounded-full bg-gradient-to-t from-rose-500 to-amber-400 animate-pulse"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVoz(textoBloque, "audio", bloque.id);
                      }}
                      className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer shrink-0 shadow-md shadow-rose-600/25 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <span className="w-2.5 h-2.5 rounded-xs bg-white inline-block" />
                      <span>Detener</span>
                    </button>
                  </div>
                )}

                {!escuchandoEsteBloque && transcribiendoEsteBloque && (
                  <div className="p-3 rounded-xl border border-amber-400/40 bg-amber-50/70 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2.5 text-xs font-semibold animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
                      <span>Transcribiendo...</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20">
                      IA Voz
                    </span>
                  </div>
                )}

                {(bloque.linkedItems || []).length > 0 && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <ResumenItemsSeleccionadosTaller
                      itemsSeleccionados={bloque.linkedItems || []}
                      onAgregarItem={(item, delta) => onAgregarItemPin?.(item, bloque.id, delta)}
                      onEliminarItem={(itemId) => onEliminarItemPin?.(itemId, bloque.id)}
                      fotos={soloFotosBloque}
                      audios={soloAudiosBloque}
                      notas={notasKanbanBloque}
                      descripcion={textoBloque}
                      onAbrirFoto={(url, idx) =>
                        setFotoModalData({
                          url,
                          bloqueNum: numBloque,
                          fotoNum: idx + 1,
                          descripcion: textoBloque,
                        })
                      }
                      onToggleAudio={handleTogglePlayAudioClip}
                      onEliminarNota={(nIdx) => onEliminarNotaKanban?.(nIdx, bloque.id)}
                      onEliminarFoto={(origIdx) => onEliminarFoto(origIdx, undefined, bloque.id)}
                      onEliminarAudio={onEliminarAudio ? (aIdx) => onEliminarAudio(aIdx, bloque.id) : undefined}
                      audioReproduciendoUrl={audioClipReproduciendoUrl}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input oculto para cámara nativa en móvil o fallback en PC */}
      <input
        ref={inputCamaraFallbackRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const bId = e.currentTarget.getAttribute("data-bloque-id") || pin.id;
          onSubirFotos(e, bId);
        }}
        className="hidden"
      />

      {/* Modal de Cámara en Vivo para PC */}
      {camaraPcBloqueId && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
          onClick={detenerCamaraPc}
        >
          <div
            className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl p-3.5 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cámara en Vivo</span>
              </span>
              <button
                type="button"
                onClick={detenerCamaraPc}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-white/10">
              <video
                ref={videoCamaraPcRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const bId = camaraPcBloqueId;
                  detenerCamaraPc();
                  if (bId) {
                    inputCamaraFallbackRef.current?.setAttribute("data-bloque-id", bId);
                    inputCamaraFallbackRef.current?.click();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold cursor-pointer"
              >
                Elegir archivo...
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={detenerCamaraPc}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={capturarFotoDesdeCamaraPc}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-95"
                >
                  <span>📸</span>
                  <span>Capturar Foto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para reproducir video de evidencia sin salir */}
      {videoModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
          onClick={() => setVideoModalUrl(null)}
        >
          <div
            className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl p-3 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>📹</span> Video de Evidencia
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[9px] font-bold">
                  ✓ Guardado
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={videoModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                >
                  Abrir enlace
                </a>
                <button
                  type="button"
                  onClick={() => setVideoModalUrl(null)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video src={videoModalUrl} controls autoPlay className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Modal para ampliar foto de evidencia mostrando su texto asociado */}
      {fotoModalData && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in"
          onClick={() => setFotoModalData(null)}
        >
          <div
            className="relative bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl p-3 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>📷</span> Evidencia #{fotoModalData.bloqueNum} • Foto #{fotoModalData.fotoNum}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-600/90 text-white text-[9px] font-bold">
                  ✓ Asociado
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={fotoModalData.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
                >
                  Abrir enlace
                </a>
                <button
                  type="button"
                  onClick={() => setFotoModalData(null)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            {fotoModalData.descripcion && (
              <div className="px-3 py-2 rounded-xl bg-white/10 text-xs text-white">
                <span className="font-bold text-blue-300">Descripción asociada: </span>
                <span>{fotoModalData.descripcion}</span>
              </div>
            )}
            <div className="rounded-xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
              <img
                src={fotoModalData.url}
                alt="Evidencia ampliada"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DetallePinModerno;

