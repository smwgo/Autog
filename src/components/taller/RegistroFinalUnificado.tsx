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

function formatearPrimeraMayuscula(texto?: any): string {
  if (texto === null || texto === undefined) return "";
  let raw = "";
  if (typeof texto === "string") {
    raw = texto;
  } else if (typeof texto === "object") {
    raw = texto.name || texto.nombre || texto.fullName || texto.label || texto.title || "";
  } else {
    raw = String(texto);
  }
  const s = String(raw || "").trim();
  if (!s || s === "[object Object]") return "";
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

function formatearTiempoAudio(seg: number) {
  if (!Number.isFinite(seg) || seg < 0) return "0:00";
  const total = Math.floor(seg);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MiniAudioPlayer({
  src,
  onRemove,
  compact = false,
}: {
  src: string;
  onRemove?: () => void;
  compact?: boolean;
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
      void el.play().catch(() => { });
    }
  };

  const progreso =
    duracion > 0 && Number.isFinite(duracion)
      ? Math.min(100, (tiempoActual / duracion) * 100)
      : 0;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/90 dark:bg-white/[0.04] ${compact ? "px-2.5 py-1.5 min-w-[200px]" : "px-3 py-2 w-full"
        }`}
    >
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
        className="w-7 h-7 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer"
        title={reproduciendo ? "Pausar" : "Reproducir"}
      >
        {reproduciendo ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg className="w-3 h-3 translate-x-[0.5px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
          </svg>
        )}
      </button>

      <div
        onClick={(e) => {
          const el = audioRef.current;
          if (!el || !duracion || !Number.isFinite(duracion)) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          el.currentTime = ratio * duracion;
          setTiempoActual(el.currentTime);
        }}
        className="h-1.5 flex-1 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden cursor-pointer"
      >
        <div
          style={{ width: `${progreso}%` }}
          className="h-full rounded-full bg-amber-500 transition-all duration-100"
        />
      </div>

      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
        {formatearTiempoAudio(tiempoActual)}
        {duracion > 0 ? ` / ${formatearTiempoAudio(duracion)}` : ""}
      </span>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="w-5 h-5 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 text-xs flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          title="Quitar audio"
        >
          ×
        </button>
      )}
    </div>
  );
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
  const [fotosBorrador, setFotosBorrador] = useState<string[]>([]);
  const [audiosBorrador, setAudiosBorrador] = useState<string[]>([]);
  const [modalCarritoAbierto, setModalCarritoAbierto] = useState(false);
  const [modalRapidoAbierto, setModalRapidoAbierto] = useState(false);
  const [busquedaRapido, setBusquedaRapido] = useState("");
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [grabandoAudio, setGrabandoAudio] = useState(false);
  const [segundosAudio, setSegundosAudio] = useState(0);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const [modalFotosAbierto, setModalFotosAbierto] = useState<{ titulo: string; fotos: string[] } | null>(null);
  const [modalAudiosAbierto, setModalAudiosAbierto] = useState<{ titulo: string; audios: string[] } | null>(null);
  const [camaraPcAbierta, setCamaraPcAbierta] = useState(false);

  const inputCamaraRef = useRef<HTMLInputElement | null>(null);
  const inputGaleriaRef = useRef<HTMLInputElement | null>(null);
  const inputAudioFallbackRef = useRef<HTMLInputElement | null>(null);
  const videoCamaraPcRef = useRef<HTMLVideoElement | null>(null);
  const streamCamaraPcRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pcMicSessionIdRef = useRef<string | null>(null);

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

  const archivoADataUrl = (file: Blob): Promise<string | null> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

  const subirArchivoEvidencia = async (
    file: File,
    tipo: "foto" | "audio",
    omitirBorrador = false
  ): Promise<string | null> => {
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

      let finalUrl: string | null = null;
      try {
        const res = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data?.success && data?.url) {
          finalUrl = data.url as string;
        }
      } catch {
        // Fallback local data URL si falla la subida
      }

      if (!finalUrl) {
        finalUrl = await archivoADataUrl(file);
      }

      if (!finalUrl) {
        mostrarToast?.("No se pudo adjuntar el archivo.", "err");
        return null;
      }

      if (!omitirBorrador) {
        if (tipo === "foto") {
          setFotosBorrador((prev) => [...prev, finalUrl!]);
        } else {
          setAudiosBorrador((prev) => [...prev, finalUrl!]);
        }
        mostrarToast?.(
          `${tipo === "foto" ? "Foto" : "Audio"} adjuntado a la descripción`,
          "ok"
        );
      }
      return finalUrl;
    } catch (err) {
      console.error("Error subiendo evidencia:", err);
      mostrarToast?.("Error al subir evidencia.", "err");
      return null;
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const detenerYSubirAudioSiGrabando = async (omitirBorrador = true): Promise<string | null> => {
    if (!grabandoAudio) return null;

    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    setGrabandoAudio(false);
    setSegundosAudio(0);

    const activePcSessionId = pcMicSessionIdRef.current;
    pcMicSessionIdRef.current = null;

    let browserBlob: { blob: Blob; mime: string } | null = null;
    const rec = mediaRecorderRef.current;
    mediaRecorderRef.current = null;

    if (rec && rec.state !== "inactive") {
      browserBlob = await new Promise<{ blob: Blob; mime: string } | null>((resolve) => {
        const mime = rec.mimeType || "audio/webm";
        rec.onstop = () => {
          try {
            rec.stream.getTracks().forEach((t) => t.stop());
          } catch { }
          const b = new Blob(audioChunksRef.current, { type: mime });
          resolve(b.size > 0 ? { blob: b, mime } : null);
        };
        try {
          rec.stop();
        } catch {
          resolve(null);
        }
      });
    }

    if (browserBlob && browserBlob.blob.size > 500) {
      if (activePcSessionId) {
        fetch("/api/taller/pc-mic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop", sessionId: activePcSessionId, skipTranscribe: true }),
        }).catch(() => { });
      }
      const ext = browserBlob.mime.includes("mp4")
        ? "m4a"
        : browserBlob.mime.includes("ogg")
          ? "ogg"
          : "webm";
      const file = new File([browserBlob.blob], `audio_${Date.now()}.${ext}`, {
        type: browserBlob.mime,
      });
      return await subirArchivoEvidencia(file, "audio", omitirBorrador);
    }

    if (activePcSessionId) {
      try {
        setSubiendoArchivo(true);
        const res = await fetch("/api/taller/pc-mic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "stop",
            sessionId: activePcSessionId,
            skipTranscribe: true,
          }),
        });
        const data = await res.json();
        if (data?.success && data?.audioBase64) {
          const binStr = atob(data.audioBase64);
          const bytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) {
            bytes[i] = binStr.charCodeAt(i);
          }
          const wavFile = new File([bytes], `audio_pc_${Date.now()}.wav`, {
            type: "audio/wav",
          });
          return await subirArchivoEvidencia(wavFile, "audio", omitirBorrador);
        }
      } catch (err) {
        console.error("Error al detener grabación de PC:", err);
      } finally {
        setSubiendoArchivo(false);
      }
    }

    if (browserBlob && browserBlob.blob.size > 0) {
      const ext = browserBlob.mime.includes("mp4")
        ? "m4a"
        : browserBlob.mime.includes("ogg")
          ? "ogg"
          : "webm";
      const file = new File([browserBlob.blob], `audio_${Date.now()}.${ext}`, {
        type: browserBlob.mime,
      });
      return await subirArchivoEvidencia(file, "audio", omitirBorrador);
    }

    return null;
  };

  const handleAgregarManual = async () => {
    const limpio = descripcion.trim();
    if (!limpio || subiendoArchivo) return;

    let audioRecienGrabado: string | null = null;
    if (grabandoAudio) {
      audioRecienGrabado = await detenerYSubirAudioSiGrabando(true);
    }

    const audiosFinales = audioRecienGrabado
      ? [...audiosBorrador, audioRecienGrabado]
      : audiosBorrador;

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
      ...(fotosBorrador.length > 0 ? { fotos: fotosBorrador } : {}),
      ...(audiosFinales.length > 0 ? { audios: audiosFinales } : {}),
    };
    setDescripcion("");
    setFotosBorrador([]);
    setAudiosBorrador([]);
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

  const detenerCamaraPc = () => {
    if (streamCamaraPcRef.current) {
      streamCamaraPcRef.current.getTracks().forEach((t) => t.stop());
      streamCamaraPcRef.current = null;
    }
    setCamaraPcAbierta(false);
  };

  const abrirCamaraPcOMovil = async () => {
    const esMovil =
      typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (esMovil || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      inputCamaraRef.current?.click();
      return;
    }
    try {
      detenerCamaraPc();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamCamaraPcRef.current = stream;
      setCamaraPcAbierta(true);
      setTimeout(() => {
        if (videoCamaraPcRef.current) {
          videoCamaraPcRef.current.srcObject = stream;
          videoCamaraPcRef.current.play().catch(() => { });
        }
      }, 50);
    } catch {
      inputCamaraRef.current?.click();
    }
  };

  const capturarFotoDesdeCamaraPc = () => {
    const video = videoCamaraPcRef.current;
    if (!video) return;
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
        void subirArchivoEvidencia(file, "foto");
        detenerCamaraPc();
      },
      "image/jpeg",
      0.9
    );
  };

  const handleToggleAudio = async () => {
    if (grabandoAudio) {
      await detenerYSubirAudioSiGrabando(false);
      return;
    }

    const esMovil =
      typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    let inicioBrowserOk = false;
    let inicioPcNatOk = false;

    // 1. En PC Windows, iniciar grabador nativo del servidor como respaldo / canal directo
    if (!esMovil) {
      const sessionId = `rfu_${Date.now()}`;
      try {
        const res = await fetch("/api/taller/pc-mic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start", sessionId, skipTranscribe: true }),
        });
        const data = await res.json();
        if (res.ok && data?.success) {
          pcMicSessionIdRef.current = sessionId;
          inicioPcNatOk = true;
        }
      } catch {
        // Ignorar si no es servidor Windows local
      }
    }

    // 2. Intentar MediaRecorder del navegador (PC y Móvil)
    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined"
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const candidatosMime = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ];
        const mimeSoportado =
          candidatosMime.find((m) => {
            try {
              return MediaRecorder.isTypeSupported(m);
            } catch {
              return false;
            }
          }) || "";

        const recorder = mimeSoportado
          ? new MediaRecorder(stream, { mimeType: mimeSoportado })
          : new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
        };

        mediaRecorderRef.current = recorder;
        recorder.start(250);
        inicioBrowserOk = true;
      } catch {
        // Si falla getUserMedia en PC pero inicioPcNatOk es true, sigue con el micrófono nativo de PC
      }
    }

    if (inicioBrowserOk || inicioPcNatOk) {
      setGrabandoAudio(true);
      setSegundosAudio(0);
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
      audioTimerRef.current = setInterval(() => {
        setSegundosAudio((prev) => prev + 1);
      }, 1000);
      return;
    }

    // 3. Si es móvil sin HTTPS (sin getUserMedia), abrir selector/grabadora nativa del teléfono
    if (esMovil && inputAudioFallbackRef.current) {
      inputAudioFallbackRef.current.click();
      return;
    }

    mostrarToast?.("No se pudo acceder al micrófono.", "err");
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
  const serviciosSeleccionados = useMemo(() => {
    const list = itemsOrden.filter((it) => it.type !== "PART");
    return [...list].sort((a, b) => {
      const aEsManual = Boolean(a.isManual || String(a.id || "").startsWith("reg-"));
      const bEsManual = Boolean(b.isManual || String(b.id || "").startsWith("reg-"));
      if (aEsManual && !bEsManual) return -1;
      if (!aEsManual && bEsManual) return 1;
      return 0;
    });
  }, [itemsOrden]);

  const totalProductos = productosSeleccionados.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  const totalServicios = serviciosSeleccionados.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);

  const serviciosRapidosFiltrados = useMemo(() => {
    const PRECIOS_RAPIDOS: Record<string, number> = {
      "cambio de aceite": 10,
      "cambio de amortiguadores delanteros": 25,
      "cambio de amortiguadores posteriores": 20,
      "cambio de ruliman delantero": 20,
      "cambio de ruliman posterior": 20,
      "cambio de aceite de caja": 10,
      "cambio de aceite corona": 10,
      "lavado completo": 12,
      "lavado completo mas grafito": 15,
      "lavado completo más grafito": 15,
      "lavado exterior": 6,
      "aspirador interior": 5,
      "limpieza tapicería más lavado": 45,
      "limpieza tapiceria mas lavado": 45,
      "lavado chasis": 10,
      "alineación": 15,
      "alineacion": 15,
      "balanceo": 12,
      "rotación": 8,
      "rotacion": 8,
      "corrección caída": 20,
      "correccion caida": 20,
      "corrección camber": 20,
      "correccion camber": 20,
      "corrección caster": 20,
      "correccion caster": 20,
    };
    const q = busquedaRapido.trim().toLowerCase();
    const presets = (SERVICIOS_RAPIDOS_POR_MODULO[moduloActivo] || []).map((name, i) => {
      const norm = name.trim().toLowerCase();
      const enCat = Array.isArray(serviciosCatalogo)
        ? serviciosCatalogo.find((s: any) => String(s?.name || "").trim().toLowerCase() === norm)
        : null;
      const precioFinal = Number(enCat?.price) > 0 ? Number(enCat.price) : (PRECIOS_RAPIDOS[norm] ?? 10);
      return {
        id: `preset-${moduloActivo}-${i}`,
        name,
        code: `RAP-${i + 1}`,
        price: precioFinal,
      };
    });
    return presets.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [busquedaRapido, moduloActivo, serviciosCatalogo]);

  if (!ordenActiva) return null;

  return (
    <div className="w-full space-y-4 pt-2 animate-fade-in">
      {/* 1. TARJETA DE REGISTRO MANUAL Y ACCIONES RÁPIDAS */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs space-y-3">
        {subiendoArchivo && (
          <div className="flex items-center justify-end">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
              Subiendo archivo...
            </span>
          </div>
        )}

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
              className="flex-1 min-w-0 min-h-[44px] rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 focus:border-blue-500/50 px-3.5 py-2.5 text-base sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={!descripcion.trim() || subiendoArchivo}
              onClick={() => void handleAgregarManual()}
              className="min-h-[44px] px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-200 dark:disabled:bg-white/10 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white text-sm font-semibold shrink-0 transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95 touch-manipulation"
            >
              Añadir
            </button>
          </div>
        </div>

        {/* Botones rápidos: Tomar foto, Subir foto y Audio aparecen al escribir descripción */}
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
          <input
            ref={inputAudioFallbackRef}
            type="file"
            accept="audio/*"
            capture
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void subirArchivoEvidencia(file, "audio");
              e.target.value = "";
            }}
          />

          {(descripcion.trim().length > 0 ||
            fotosBorrador.length > 0 ||
            audiosBorrador.length > 0 ||
            grabandoAudio ||
            subiendoArchivo) && (
              <>
                <button
                  type="button"
                  disabled={subiendoArchivo}
                  onClick={() => void abrirCamaraPcOMovil()}
                  title="Tomar foto"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all animate-fade-in"
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
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all animate-fade-in"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </button>

                <button
                  type="button"
                  disabled={subiendoArchivo}
                  onClick={() => void handleToggleAudio()}
                  title={grabandoAudio ? "Detener y guardar audio" : "Grabar nota de audio"}
                  className={`h-10 sm:h-11 px-3 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all animate-fade-in touch-manipulation ${grabandoAudio
                    ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                    : "bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400"
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                  {grabandoAudio && <span className="text-xs font-bold">{segundosAudio}s</span>}
                </button>
              </>
            )}

          <button
            type="button"
            onClick={() => {
              setModalCarritoAbierto(true);
              setModalRapidoAbierto(false);
            }}
            title="Productos y Servicios"
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-all ${modalCarritoAbierto
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
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-all ${modalRapidoAbierto
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400"
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          </button>
        </div>

        {/* Barra visual cuando está grabando audio en PC o móvil */}
        {grabandoAudio && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-rose-500/40 bg-rose-50/80 dark:bg-rose-500/10 text-rose-700 dark:text-rose-200 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
              <span className="text-xs font-mono font-bold bg-rose-600 text-white px-2 py-0.5 rounded-md">
                {String(Math.floor(segundosAudio / 60)).padStart(2, "0")}:
                {String(segundosAudio % 60).padStart(2, "0")}
              </span>
              <span className="text-xs font-medium truncate">
                Grabando audio...
              </span>
            </div>
            <button
              type="button"
              onClick={() => void handleToggleAudio()}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shrink-0 active:scale-95 transition-all"
            >
              Detener
            </button>
          </div>
        )}

        {/* Vista previa de fotos y audios adjuntos antes de pulsar Añadir */}
        {(fotosBorrador.length > 0 || audiosBorrador.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 animate-fade-in">
            {fotosBorrador.map((url, idx) => (
              <div key={`dfoto-${idx}`} className="relative group">
                <button
                  type="button"
                  onClick={() => setFotoPreviewUrl(url)}
                  className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/15 cursor-zoom-in block"
                >
                  <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => setFotosBorrador((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow cursor-pointer"
                  title="Quitar foto"
                >
                  ×
                </button>
              </div>
            ))}
            {audiosBorrador.map((url, idx) => (
              <MiniAudioPlayer
                key={`daudio-${idx}`}
                src={url}
                compact
                onRemove={() => setAudiosBorrador((prev) => prev.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
        )}

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
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">
                    Todos los Productos y Servicios
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
                      x.name?.toLowerCase() === item.name?.toLowerCase()
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
                    const catAsignada =
                      item.category && item.category !== "General"
                        ? item.category
                        : item.type === "PART"
                        ? "Taller"
                        : metaModulo.label;
                    nuevosItems = [
                      ...itemsOrden,
                      {
                        ...item,
                        id: item.id || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        productId: item.type === "PART" ? item.id : undefined,
                        category: catAsignada,
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
                limitarDosFilasInicial={true}
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
              className="relative w-full max-w-xl sm:max-w-2xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 p-4 shadow-2xl space-y-3"
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
                {serviciosRapidosFiltrados.map((it: any, idx: number) => {
                  const meta = getServicioRapidoMeta(it.name, metaModulo.label);
                  return (
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
                      className="group p-2.5 rounded-xl border border-zinc-200/90 dark:border-white/10 bg-zinc-50/70 hover:bg-zinc-100/90 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] text-left text-xs transition-all cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.98] shadow-2xs hover:shadow-xs hover:border-zinc-300 dark:hover:border-white/20"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${meta.iconBoxClass}`}
                        >
                          {meta.icon}
                        </div>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100 text-xs sm:text-[13px] leading-snug break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1 min-w-0">
                          {it.name}
                        </span>
                      </div>
                      <span className="w-6 h-6 rounded-lg bg-zinc-200/60 dark:bg-white/10 group-hover:bg-violet-600 group-hover:text-white dark:group-hover:bg-violet-500 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 transition-colors">
                        +
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. RESUMEN UNIFICADO AL FINAL (SERVICIOS PRIMERO [MANUALES PRIMERO], LUEGO PRODUCTOS Y EVIDENCIAS) */}
      {(productosSeleccionados.length > 0 ||
        serviciosSeleccionados.length > 0 ||
        evidenciasRegistradas.length > 0) && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs space-y-3.5 animate-fade-in">
            {/* SERVICIOS (PRIMERO) */}
            {serviciosSeleccionados.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
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
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{formatearPrimeraMayuscula(it.name || it.fullName)}</span>
                                {(it.isManual || String(it.id || "").startsWith("reg-")) && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 shrink-0">
                                    Manual
                                  </span>
                                )}
                                {Array.isArray(it.fotos) && it.fotos.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModalFotosAbierto({
                                        titulo: formatearPrimeraMayuscula(it.name || it.fullName),
                                        fotos: it.fotos,
                                      })
                                    }
                                    className="h-7 px-2 rounded-lg border bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                    title={`Ver ${it.fotos.length} foto(s)`}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                    </svg>
                                    {it.fotos.length > 1 && <span>{it.fotos.length}</span>}
                                  </button>
                                )}
                                {Array.isArray(it.audios) && it.audios.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModalAudiosAbierto({
                                        titulo: formatearPrimeraMayuscula(it.name || it.fullName),
                                        audios: it.audios,
                                      })
                                    }
                                    className="h-7 px-2 rounded-lg border bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                    title={`Escuchar ${it.audios.length} audio(s)`}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                    </svg>
                                    {it.audios.length > 1 && <span>{it.audios.length}</span>}
                                  </button>
                                )}
                              </div>
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

            {/* PRODUCTOS (DESPUÉS DE SERVICIOS) */}
            {productosSeleccionados.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
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
                              <div className="flex flex-wrap items-center gap-2">
                                <span>{formatearPrimeraMayuscula(it.name || it.fullName)}</span>
                                {(it.isManual || String(it.id || "").startsWith("reg-")) && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 shrink-0">
                                    Manual
                                  </span>
                                )}
                                {Array.isArray(it.fotos) && it.fotos.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModalFotosAbierto({
                                        titulo: formatearPrimeraMayuscula(it.name || it.fullName),
                                        fotos: it.fotos,
                                      })
                                    }
                                    className="h-7 px-2 rounded-lg border bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                    title={`Ver ${it.fotos.length} foto(s)`}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                    </svg>
                                    {it.fotos.length > 1 && <span>{it.fotos.length}</span>}
                                  </button>
                                )}
                                {Array.isArray(it.audios) && it.audios.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setModalAudiosAbierto({
                                        titulo: formatearPrimeraMayuscula(it.name || it.fullName),
                                        audios: it.audios,
                                      })
                                    }
                                    className="h-7 px-2 rounded-lg border bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                    title={`Escuchar ${it.audios.length} audio(s)`}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                    </svg>
                                    {it.audios.length > 1 && <span>{it.audios.length}</span>}
                                  </button>
                                )}
                              </div>
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

            {/* EVIDENCIAS (FOTOS Y AUDIOS) */}
            {evidenciasRegistradas.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
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

      {/* Modal flotante minimalista para ver fotos de un ítem */}
      {modalFotosAbierto && (
        <div
          onClick={() => setModalFotosAbierto(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[82dvh] overflow-y-auto rounded-2xl bg-white dark:bg-[#141417] border border-zinc-200/80 dark:border-white/10 p-3.5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate">
                {modalFotosAbierto.titulo}
              </span>
              <button
                type="button"
                onClick={() => setModalFotosAbierto(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 text-xs cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>
            <div
              className={`grid gap-2 ${modalFotosAbierto.fotos.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
            >
              {modalFotosAbierto.fotos.map((fUrl, i) => (
                <button
                  key={`mf-${i}`}
                  type="button"
                  onClick={() => setFotoPreviewUrl(fUrl)}
                  className="rounded-xl overflow-hidden border border-zinc-200/70 dark:border-white/10 bg-zinc-50 dark:bg-black/40 cursor-zoom-in"
                >
                  <img
                    src={fUrl}
                    alt={`Foto ${i + 1}`}
                    className="w-full max-h-[50vh] object-contain mx-auto"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal flotante minimalista para escuchar audios de un ítem */}
      {modalAudiosAbierto && (
        <div
          onClick={() => setModalAudiosAbierto(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm max-h-[80dvh] overflow-y-auto rounded-2xl bg-white dark:bg-[#141417] border border-zinc-200/80 dark:border-white/10 p-3.5 space-y-2.5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate">
                {modalAudiosAbierto.titulo}
              </span>
              <button
                type="button"
                onClick={() => setModalAudiosAbierto(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 text-xs cursor-pointer shrink-0 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {modalAudiosAbierto.audios.map((aUrl, i) => (
                <MiniAudioPlayer key={`ma-${i}`} src={aUrl} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal simple para ampliar foto */}
      {fotoPreviewUrl && (
        <div
          onClick={() => setFotoPreviewUrl(null)}
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={fotoPreviewUrl}
            alt="Evidencia ampliada"
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Modal cámara en vivo para PC */}
      {camaraPcAbierta && (
        <div
          onClick={() => detenerCamaraPc()}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                Tomar foto
              </span>
              <button
                type="button"
                onClick={() => detenerCamaraPc()}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 dark:bg-white/10 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoCamaraPcRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => detenerCamaraPc()}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => capturarFotoDesdeCamaraPc()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Capturar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
