"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getClientUserBranch,
  getClientActiveBranch,
  setClientActiveBranch,
  FiltroSedeType,
  SedeType,
} from "@/lib/branch";

interface BranchTabsProps {
  onChange?: (branch: FiltroSedeType) => void;
  className?: string;
  size?: "sm" | "md";
}

const OPTIONS: { value: FiltroSedeType; label: string; icon: string }[] = [
  { value: "PRINCIPAL", label: "Principal", icon: "🏢" },
  { value: "SUCURSAL",  label: "Sucursal",       icon: "📍" },
  { value: "AMBOS",     label: "Ambas",           icon: "🌐" },
];

export function BranchTabs({ onChange, className = "", size = "md" }: BranchTabsProps) {
  const [userBranch, setUserBranch] = useState<SedeType>("PRINCIPAL");
  const [activeBranch, setActiveBranchState] = useState<FiltroSedeType>("PRINCIPAL");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setUserBranch(getClientUserBranch());
    setActiveBranchState(getClientActiveBranch());

    const handleBranchChange = () => {
      setUserBranch(getClientUserBranch());
      setActiveBranchState(getClientActiveBranch());
    };
    window.addEventListener("autog-branch-change", handleBranchChange);
    return () => window.removeEventListener("autog-branch-change", handleBranchChange);
  }, []);

  // Cerrar al click fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = (branch: FiltroSedeType) => {
    if (userBranch === "SUCURSAL") return;
    setActiveBranchState(branch);
    setClientActiveBranch(branch);
    setOpen(false);
    if (onChange) onChange(branch);
  };

  // Skeleton antes de montar
  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800/60 text-sm text-zinc-400 ${className}`}>
        <span>🏢 Sede</span>
      </div>
    );
  }

  // Usuario de Sucursal: solo etiqueta fija, sin menú
  if (userBranch === "SUCURSAL") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-sm font-bold shadow-xs ${className}`}
        title="Operando exclusivamente en Sucursal"
      >
        <span>📍</span>
        <span>Sucursal</span>
      </div>
    );
  }

  const active = OPTIONS.find((o) => o.value === activeBranch) ?? OPTIONS[0];
  const isSmall = size === "sm";

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-md border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer active:scale-95 font-semibold text-zinc-700 dark:text-zinc-200 ${
          isSmall ? "px-2.5 py-1 text-[11px]" : "px-4 py-2 text-sm"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{active.icon}</span>
        <span>{active.label}</span>
        <svg
          className={`w-3 h-3 text-zinc-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 mt-1.5 min-w-[148px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left"
        >
          {OPTIONS.map((opt) => {
            const isActive = activeBranch === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-sm transition-colors cursor-pointer ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                }`}
              >
                <span>{opt.icon}</span>
                <span className="flex-1 text-left">{opt.label}</span>
                {isActive && (
                  <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
