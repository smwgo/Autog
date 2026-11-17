"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  getCachedAudioDuration,
  resolveAudioDuration,
  setCachedAudioDuration,
} from "@/lib/audio-duration";
import { normalizarUrlAudioReproduccion } from "@/lib/taller-audio-processor";

export function formatearTiempoAudio(seg: number) {
  if (!Number.isFinite(seg) || seg < 0) return "0:00";
  const total = Math.floor(seg);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function MiniAudioPlayer({
  src,
  onRemove,
  compact = false,
  initialDuration,
}: {
  src: string;
  onRemove?: () => void;
  compact?: boolean;
  initialDuration?: number | null;
}) {
  const effectiveSrc = normalizarUrlAudioReproduccion(src);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolvingInfinityRef = useRef(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [tiempoActual, setTiempoActual] = useState(0);
  const [duracion, setDuracion] = useState(() => {
    const cached = getCachedAudioDuration(src) || getCachedAudioDuration(effectiveSrc);
    if (cached > 0) return cached;
    return initialDuration && Number.isFinite(initialDuration) && initialDuration > 0
      ? initialDuration
      : 0;
  });

  useEffect(() => {
    let active = true;
    const cached = getCachedAudioDuration(src) || getCachedAudioDuration(effectiveSrc);
    const fallbackInit =
      initialDuration && Number.isFinite(initialDuration) && initialDuration > 0
        ? initialDuration
        : 0;
    const initial = cached > 0 ? cached : fallbackInit;
    setDuracion(initial);
    setTiempoActual(0);
    resolvingInfinityRef.current = false;
    if (initial <= 0 && effectiveSrc) {
      void resolveAudioDuration(effectiveSrc).then((d) => {
        if (active && d > 0) {
          setCachedAudioDuration(src, d);
          setDuracion((prev) => (prev > 0 ? prev : d));
        }
      });
    }
    return () => {
      active = false;
    };
  }, [src, effectiveSrc, initialDuration]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (reproduciendo) {
      el.pause();
    } else {
      el.volume = 1.0;
      el.muted = false;
      el.play().catch(() => {
        try {
          el.load();
          void el.play().catch(() => {});
        } catch {}
      });
    }
  };

  const progreso =
    duracion > 0 && Number.isFinite(duracion)
      ? Math.min(100, (tiempoActual / duracion) * 100)
      : 0;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/90 dark:bg-white/[0.04] ${
        compact ? "px-2.5 py-1.5 min-w-[200px]" : "px-3 py-2 w-full"
      }`}
    >
      <audio
        ref={audioRef}
        src={effectiveSrc}
        playsInline
        preload="auto"
        onPlay={() => setReproduciendo(true)}
        onPause={() => setReproduciendo(false)}
        onEnded={() => {
          setReproduciendo(false);
          setTiempoActual(0);
        }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          const d = el.duration;
          if (Number.isFinite(d) && d > 0) {
            setCachedAudioDuration(src, d);
            setDuracion(d);
          } else if (d === Infinity && !resolvingInfinityRef.current) {
            resolvingInfinityRef.current = true;
            el.currentTime = 1e101;
          }
        }}
        onDurationChange={(e) => {
          const el = e.currentTarget;
          const d = el.duration;
          if (Number.isFinite(d) && d > 0) {
            setCachedAudioDuration(src, d);
            setDuracion(d);
            if (resolvingInfinityRef.current) {
              resolvingInfinityRef.current = false;
              el.currentTime = 0;
            }
          }
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          const d = el.duration;
          if (resolvingInfinityRef.current) {
            if (Number.isFinite(d) && d > 0) {
              setCachedAudioDuration(src, d);
              setDuracion(d);
            }
            resolvingInfinityRef.current = false;
            el.currentTime = 0;
            setTiempoActual(0);
            return;
          }
          setTiempoActual(el.currentTime || 0);
          if (Number.isFinite(d) && d > 0 && d !== duracion) {
            setCachedAudioDuration(src, d);
            setDuracion(d);
          }
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
        {!reproduciendo && tiempoActual === 0 && duracion > 0
          ? formatearTiempoAudio(duracion)
          : `${formatearTiempoAudio(tiempoActual)}${duracion > 0 ? ` / ${formatearTiempoAudio(duracion)}` : ""}`}
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
