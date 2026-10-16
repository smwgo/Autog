"use client";

import { useState } from "react";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(3);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir centro de notificaciones"
        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors relative"
      >
        <span className="text-base">🔔</span>
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl z-50 overflow-hidden max-h-[80dvh] flex flex-col">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <h3 className="font-bold text-sm">Notificaciones</h3>
              <button onClick={() => setCount(0)} className="text-xs text-blue-600 hover:underline min-h-[32px] flex items-center">Marcar leídas</button>
            </div>
            <div className="max-h-[60dvh] overflow-y-auto">
              {count > 0 ? (
                <>
                  <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                    <div className="flex gap-2">
                      <span className="text-amber-500 mt-0.5">⚠️</span>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">Stock Crítico</p>
                        <p className="text-xs text-zinc-500 mt-1">Pastillas de freno (SKU-BRK-001) por debajo del mínimo en PRINCIPAL.</p>
                        <p className="text-[10px] text-zinc-400 mt-2">Hace 5 min</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                    <div className="flex gap-2">
                      <span className="text-blue-500 mt-0.5">🚗</span>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">Cliente en Camino</p>
                        <p className="text-xs text-zinc-500 mt-1">Juan Pérez (ABC-123) está en camino al taller.</p>
                        <p className="text-[10px] text-zinc-400 mt-2">Hace 12 min</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                    <div className="flex gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">Orden #OT-1042 Terminada</p>
                        <p className="text-xs text-zinc-500 mt-1">El taller finalizó el trabajo. Listo para facturar en POS.</p>
                        <p className="text-[10px] text-zinc-400 mt-2">Hace 1 hora</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No tienes notificaciones nuevas.
                </div>
              )}
            </div>
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-center">
              <button className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors min-h-[36px] inline-flex items-center">
                Ver Historial Completo
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
