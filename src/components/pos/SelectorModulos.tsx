"use client";

import React, { useState, useRef, useEffect } from "react";

export const MODULOS_DISPONIBLES = [
  { id: "Tienda", label: "Tienda", icon: "🏪" },
  { id: "Taller", label: "Taller", icon: "🔧" },
  { id: "Lubricentro", label: "Lubricentro", icon: "🛢️" },
  { id: "Car Wash", label: "Car Wash", icon: "🚿" },
  { id: "Tecnicentro", label: "Tecnicentro", icon: "⚙️" },
] as const;

export type ModuloId = (typeof MODULOS_DISPONIBLES)[number]["id"];

export function parsearModulos(valor?: string | null): ModuloId[] {
  if (!valor) return ["Tienda"];
  const limpio = valor.trim();
  if (!limpio) return ["Tienda"];
  if (limpio.toLowerCase() === "todos") {
    return MODULOS_DISPONIBLES.map((m) => m.id);
  }
  const parts = limpio.split(",").map((s) => s.trim());
  const validos = parts.filter((p): p is ModuloId =>
    MODULOS_DISPONIBLES.some((m) => m.id === p)
  );
  return validos.length > 0 ? validos : ["Tienda"];
}

export function serializarModulos(modulos: ModuloId[]): string {
  if (!modulos || modulos.length === 0) return "Tienda";
  return modulos.join(", ");
}

interface SelectorModulosProps {
  value: string;
  onChange: (nuevoValor: string) => void;
  className?: string;
  id?: string;
}

export default function SelectorModulos({
  value,
  onChange,
  className = "",
  id = "selector-modulos",
}: SelectorModulosProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const seleccionados = parsearModulos(value);
  const todosSeleccionados = seleccionados.length === MODULOS_DISPONIBLES.length;

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(event.target as Node)
      ) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleModulo = (modId: ModuloId, e?: React.MouseEvent) => {
    e?.stopPropagation();
    let nuevos: ModuloId[];
    if (seleccionados.includes(modId)) {
      nuevos = seleccionados.filter((id) => id !== modId);
      // Mantener al menos uno seleccionado para evitar que quede vacío
      if (nuevos.length === 0) nuevos = [modId];
    } else {
      nuevos = [...seleccionados, modId];
    }
    onChange(serializarModulos(nuevos));
  };

  const toggleTodos = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (todosSeleccionados) {
      // Si todos están marcados, dejar solo Tienda por defecto
      onChange("Tienda");
    } else {
      // Marcar todos los módulos
      onChange(MODULOS_DISPONIBLES.map((m) => m.id).join(", "));
    }
  };

  return (
    <div ref={contenedorRef} className={`relative w-full ${className}`} id={id}>
      {/* Botón trigger principal que abre el desplegable */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="w-full min-h-[48px] px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-left flex items-center justify-between gap-2 shadow-2xs cursor-pointer focus:outline-none focus:border-blue-500"
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 py-0.5">
          {todosSeleccionados ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80">
              <span>⭐</span>
              <span>Todos los módulos (5)</span>
            </span>
          ) : (
            seleccionados.map((modId) => {
              const mod = MODULOS_DISPONIBLES.find((m) => m.id === modId);
              return (
                <span
                  key={modId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80"
                >
                  <span className="text-[11px]">{mod?.icon}</span>
                  <span>{modId}</span>
                  <span
                    onClick={(e) => toggleModulo(modId, e)}
                    className="text-zinc-400 hover:text-rose-500 cursor-pointer font-bold ml-0.5 text-[10px] leading-none transition-colors"
                    title={`Quitar ${modId}`}
                  >
                    ✕
                  </span>
                </span>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400 flex-shrink-0">
          <span className="text-xs font-medium text-zinc-400 font-mono">
            {seleccionados.length}/5
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              abierto ? "rotate-180 text-blue-600" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Menú desplegable multi-selección */}
      {abierto && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 p-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Fila superior: Marcar / Desmarcar todos */}
          <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-zinc-100 dark:border-zinc-800/80">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Módulos ({seleccionados.length}/{MODULOS_DISPONIBLES.length})
            </span>
            <button
              type="button"
              onClick={toggleTodos}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors cursor-pointer"
            >
              {todosSeleccionados ? "Desmarcar todos" : "Marcar todos"}
            </button>
          </div>

          {/* Opciones con checkbox */}
          <div className="space-y-0.5 max-h-64 overflow-y-auto pr-0.5">
            {MODULOS_DISPONIBLES.map((mod) => {
              const estaMarcado = seleccionados.includes(mod.id);
              return (
                <div
                  key={mod.id}
                  onClick={() => toggleModulo(mod.id)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors select-none ${
                    estaMarcado
                      ? "bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                        estaMarcado
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                      }`}
                    >
                      {estaMarcado && (
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-base leading-none">{mod.icon}</span>
                    <span className="text-xs font-medium">
                      {mod.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pie de acción */}
          <div className="pt-1.5 px-1 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-end">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-xs font-semibold px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
