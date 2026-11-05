"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getClientUserBranch,
  getClientActiveBranch,
  setClientActiveBranch,
  FiltroSedeType,
  SedeType,
} from "@/lib/branch";
import { isProtectedAdminEmail } from "@/lib/admin-accounts";

interface BranchTabsProps {
  onChange?: (branch: FiltroSedeType) => void;
  className?: string;
  size?: "sm" | "md";
  iconOnly?: boolean;
}

const OPTIONS: { value: FiltroSedeType; label: string; icon: string }[] = [
  { value: "PRINCIPAL", label: "Principal", icon: "🏢" },
  { value: "SUCURSAL",  label: "Sucursal",       icon: "📍" },
  { value: "AMBOS",     label: "Ambas",           icon: "🌐" },
];

function checkIsAdminUser(user: any): boolean {
  if (!user) return false;
  const roleUpper = String(user.role || "").toUpperCase();
  return (
    Boolean(user.isSuperAdmin) ||
    isProtectedAdminEmail(user.email) ||
    ["ROOT", "ADMIN", "ADMINISTRADOR", "GERENCIA", "GERENTE"].includes(roleUpper)
  );
}

export function BranchTabs({ onChange, className = "", size = "sm", iconOnly = false }: BranchTabsProps) {
  const [userBranch, setUserBranch] = useState<SedeType>("PRINCIPAL");
  const [activeBranch, setActiveBranchState] = useState<FiltroSedeType>("PRINCIPAL");
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setUserBranch(getClientUserBranch());
    setActiveBranchState(getClientActiveBranch());

    let foundLocal = false;
    try {
      const raw = localStorage.getItem("currentUser");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.email || parsed.role || parsed.name)) {
          setIsAdmin(checkIsAdminUser(parsed));
          foundLocal = true;
        }
      }
    } catch {}

    if (!foundLocal) {
      try {
        const match = document.cookie
          .split("; ")
          .find((row) => row.startsWith("auth_session="));
        if (match) {
          const rawCookie = match.slice("auth_session=".length);
          const parsedCookie = (() => {
            try {
              return JSON.parse(decodeURIComponent(rawCookie));
            } catch {
              return JSON.parse(rawCookie);
            }
          })();
          if (parsedCookie && (parsedCookie.email || parsedCookie.role)) {
            setIsAdmin(checkIsAdminUser(parsedCookie));
            foundLocal = true;
          }
        }
      } catch {}
    }

    if (!foundLocal) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => {
          if (data?.success && data?.user) {
            setIsAdmin(checkIsAdminUser(data.user));
          }
        })
        .catch(() => {});
    }

    const handleBranchChange = () => {
      setUserBranch(getClientUserBranch());
      const nextActive = getClientActiveBranch();
      setActiveBranchState(nextActive);
      if (!iconOnly && onChange) {
        onChange(nextActive);
      }
    };
    window.addEventListener("autog-branch-change", handleBranchChange);
    return () => window.removeEventListener("autog-branch-change", handleBranchChange);
  }, [iconOnly, onChange]);

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
    if (!isAdmin && userBranch === "SUCURSAL") return;
    setActiveBranchState(branch);
    setClientActiveBranch(branch);
    setOpen(false);
    if (onChange) onChange(branch);
  };

  // Este botón solo sale en la barra superior (iconOnly) y solo para administradores
  if (!mounted || !isAdmin || !iconOnly) {
    return null;
  }

  const active = OPTIONS.find((o) => o.value === activeBranch) ?? OPTIONS[0];
  const isSmall = size === "sm";

  return (
    <div ref={ref} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={`Sede activa: ${active.label}`}
        className={
          iconOnly
            ? `inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl border transition-all cursor-pointer active:scale-95 shadow-2xs text-base ${
                activeBranch === "SUCURSAL"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                  : activeBranch === "AMBOS"
                  ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/25"
                  : "bg-white dark:bg-zinc-900 text-blue-700 dark:text-blue-400 border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500"
              }`
            : `inline-flex items-center gap-1.5 rounded-md border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-600 transition-all cursor-pointer active:scale-95 font-semibold text-zinc-700 dark:text-zinc-200 ${
                isSmall ? "px-2.5 py-1 text-[11px]" : "px-4 py-2 text-sm"
              }`
        }
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{active.icon}</span>
        {!iconOnly && (
          <>
            <span>{active.label}</span>
            <svg
              className={`w-3 h-3 text-zinc-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 mt-1.5 min-w-[148px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right"
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
