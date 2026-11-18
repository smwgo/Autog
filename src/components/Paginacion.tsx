"use client";

import React from "react";

export const POR_PAGINA_DEFAULT = 20;

export function paginarLista<T>(
  items: T[],
  paginaActual: number,
  porPagina = POR_PAGINA_DEFAULT
): {
  itemsPaginados: T[];
  paginaValida: number;
  totalPaginas: number;
} {
  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const paginaValida = Math.min(Math.max(1, paginaActual), totalPaginas);
  const indiceInicio = (paginaValida - 1) * porPagina;
  return {
    itemsPaginados: items.slice(indiceInicio, indiceInicio + porPagina),
    paginaValida,
    totalPaginas,
  };
}

interface PaginacionProps {
  paginaActual: number;
  totalElementos: number;
  porPagina?: number;
  onCambiarPagina: (pagina: number) => void;
  className?: string;
}

export function Paginacion({
  paginaActual,
  totalElementos,
  porPagina = POR_PAGINA_DEFAULT,
  onCambiarPagina,
  className = "",
}: PaginacionProps) {
  const totalPaginas = Math.max(1, Math.ceil(totalElementos / porPagina));
  const paginaValida = Math.min(Math.max(1, paginaActual), totalPaginas);

  return (
    <div
      className={`px-3.5 py-2.5 sm:px-4 sm:py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-1 text-xs text-zinc-500 dark:text-zinc-400 ${className}`}
    >
      <button
        type="button"
        onClick={() => onCambiarPagina(Math.max(1, paginaValida - 1))}
        disabled={paginaValida <= 1}
        aria-label="Página anterior"
        className="h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center shadow-xs"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="min-w-8 h-8 px-2 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs shadow-blue-500/20 flex items-center justify-center select-none">
        {paginaValida}
      </span>

      <button
        type="button"
        onClick={() => onCambiarPagina(Math.min(totalPaginas, paginaValida + 1))}
        disabled={paginaValida >= totalPaginas || totalElementos === 0}
        aria-label="Página siguiente"
        className="h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center shadow-xs"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
