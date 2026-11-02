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
        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500/60 transition-colors text-left flex items-center justify-between gap-2 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 py-0.5">
          {todosSeleccionados ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <span>⭐</span>
              <span>Todos los módulos (5)</span>
            </span>
          ) : (
            seleccionados.map((modId) => {
              const mod = MODULOS_DISPONIBLES.find((m) => m.id === modId);
              return (
                <span
                  key={modId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80"
                >
                  <span className="text-[11px]">{mod?.icon}</span>
                  <span>{modId}</span>
                  <span
                    onClick={(e) => toggleModulo(modId, e)}
                    className="ml-0.5 text-blue-400 hover:text-rose-600 cursor-pointer font-bold px-0.5 text-[10px]"
                    title={`Quitar ${modId}`}
                  >
                    ✕
                  </span>
                </span>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-1 text-zinc-400 flex-shrink-0">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
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
        <div className="absolute z-50 left-0 right-0 mt-1.5 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl space-y-1 animate-in fade-in zoom-in-95 duration-150">
          {/* Fila superior: Marcar / Desmarcar todos */}
          <div className="flex items-center justify-between pb-2 mb-1 px-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              Seleccionar módulos ({seleccionados.length} de {MODULOS_DISPONIBLES.length})
            </span>
            <button
              type="button"
              onClick={toggleTodos}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50"
            >
              {todosSeleccionados ? "Deseleccionar todos" : "✓ Marcar todos"}
            </button>
          </div>

          {/* Opciones con checkbox */}
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {MODULOS_DISPONIBLES.map((mod) => {
              const estaMarcado = seleccionados.includes(mod.id);
              return (
                <div
                  key={mod.id}
                  onClick={() => toggleModulo(mod.id)}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                    estaMarcado
                      ? "bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        estaMarcado
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                      }`}
                    >
                      {estaMarcado && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-base">{mod.icon}</span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {mod.label}
                    </span>
                  </div>

                  {estaMarcado && (
                    <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                      Activo
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pie de mensaje explicativo */}
          <div className="pt-2 px-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] text-zinc-400">
              Aparecerá en los módulos que tengan el check activo.
            </span>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-xs font-bold px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
