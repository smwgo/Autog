"use client";

import React, { useState, useEffect } from "react";
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

export function BranchTabs({ onChange, className = "", size = "md" }: BranchTabsProps) {
  const [userBranch, setUserBranch] = useState<SedeType>("PRINCIPAL");
  const [activeBranch, setActiveBranchState] = useState<FiltroSedeType>("PRINCIPAL");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const uBranch = getClientUserBranch();
    const aBranch = getClientActiveBranch();
    setUserBranch(uBranch);
    setActiveBranchState(aBranch);

    const handleBranchChange = (e: any) => {
      setUserBranch(getClientUserBranch());
      setActiveBranchState(getClientActiveBranch());
    };

    window.addEventListener("autog-branch-change", handleBranchChange);
    return () => window.removeEventListener("autog-branch-change", handleBranchChange);
  }, []);

  const handleSelect = (branch: FiltroSedeType) => {
    if (userBranch === "SUCURSAL") return; // Operador de sucursal bloqueado en sucursal
    setActiveBranchState(branch);
    setClientActiveBranch(branch);
    if (onChange) onChange(branch);
  };

  if (!mounted) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 text-xs text-zinc-400 ${className}`}>
        <span>🏢 Sede</span>
      </div>
    );
  }

  // Si el usuario pertenece a Sucursal, solo ve y opera en Sucursal (sin selector)
  if (userBranch === "SUCURSAL") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 text-xs font-bold shadow-xs ${className}`}
        title="Operando exclusivamente en Sucursal"
      >
        <span>📍</span>
        <span>Sucursal</span>
      </div>
    );
  }

  // Para usuarios de Sede Principal / Administrador: puede alternar Principal / Sucursal / Ambas
  return (
    <div
      className={`inline-flex items-center p-1 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs ${className}`}
      role="tablist"
      aria-label="Filtro de Sede"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeBranch === "PRINCIPAL"}
        onClick={() => handleSelect("PRINCIPAL")}
        className={`flex items-center gap-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          activeBranch === "PRINCIPAL"
            ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm border border-zinc-200/60 dark:border-zinc-700 font-bold"
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-800/50"
        } ${size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5"}`}
      >
        <span>🏢</span>
        <span><span className="hidden sm:inline">Sede </span>Principal</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeBranch === "SUCURSAL"}
        onClick={() => handleSelect("SUCURSAL")}
        className={`flex items-center gap-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          activeBranch === "SUCURSAL"
            ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm border border-zinc-200/60 dark:border-zinc-700 font-bold"
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-800/50"
        } ${size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5"}`}
      >
        <span>📍</span>
        <span>Sucursal</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeBranch === "AMBOS"}
        onClick={() => handleSelect("AMBOS")}
        className={`flex items-center gap-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          activeBranch === "AMBOS"
            ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-zinc-200/60 dark:border-zinc-700 font-bold"
            : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/50 dark:hover:bg-zinc-800/50"
        } ${size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5"}`}
      >
        <span>🌐</span>
        <span>Ambas</span>
      </button>
    </div>
  );
}
