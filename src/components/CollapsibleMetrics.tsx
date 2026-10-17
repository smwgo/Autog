"use client";

import React, { useState } from "react";

interface CollapsibleMetricsProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Contenedor de métricas / KPIs responsivo:
 * - En MÓVIL (< sm): Se muestra como un campo desplegable colapsado por defecto para ahorrar espacio vertical.
 * - En ESCRITORIO (>= sm): Se muestra siempre visible y sin alteraciones en el layout ni diseño original.
 */
export function CollapsibleMetrics({
  children,
  title = "Ver métricas y resumen",
  subtitle,
  defaultOpen = false,
  className = "mb-6 sm:mb-8",
}: CollapsibleMetricsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      {/* Botón desplegable visible ÚNICAMENTE en móvil */}
      <div className="sm:hidden mb-2.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate pr-2">
            <span className="text-sm shrink-0">📊</span>
            <span className="truncate">{title}</span>
            {subtitle && (
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal truncate hidden min-[360px]:inline">
                • {subtitle}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 font-medium">
            <span>{isOpen ? "Ocultar" : "Mostrar"}</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
      </div>

      {/* Contenedor de métricas: En móvil se despliega u oculta con isOpen; en escritorio (sm:) SIEMPRE visible */}
      <div className={`${isOpen ? "block animate-in fade-in duration-200" : "hidden"} sm:block`}>
        {children}
      </div>
    </div>
  );
}

export default CollapsibleMetrics;
