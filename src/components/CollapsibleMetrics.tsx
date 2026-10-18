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
 * Contenedor de métricas responsivo:
 * - En MÓVIL (< sm): Se muestra como un campo desplegable con solo una palabra ("Métricas"), debajo de Estado, sin íconos y sin la palabra "Mostrar".
 * - En ESCRITORIO (>= sm): Se muestra siempre visible.
 */
export function CollapsibleMetrics({
  children,
  defaultOpen = false,
  className = "order-3 sm:order-2 mb-6 sm:mb-8",
}: CollapsibleMetricsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      {/* Botón desplegable visible ÚNICAMENTE en móvil: sin íconos, una sola palabra ("Métricas"), sin la palabra "Mostrar" */}
      <div className="sm:hidden mb-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full h-11 flex items-center justify-between px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-normal text-zinc-800 dark:text-zinc-200 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
        >
          <span>Métricas</span>
          <svg
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Contenedor de métricas: En móvil se despliega u oculta con isOpen; en escritorio (sm:) SIEMPRE visible */}
      <div className={`${isOpen ? "block animate-in fade-in duration-200 mb-3" : "hidden"} sm:block`}>
        {children}
      </div>
    </div>
  );
}

export default CollapsibleMetrics;
