"use client";

import { useState } from "react";
import Link from "next/link";

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors w-64"
      >
        <span>🔍</span> Buscar cliente, placa, orden...
        <span className="ml-auto text-[10px] bg-zinc-200 dark:bg-zinc-900 px-1.5 py-0.5 rounded font-bold">Ctrl+K</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-20 px-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-4">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
              <span className="text-xl">🔍</span>
              <input 
                type="text" 
                autoFocus
                placeholder="Busca por placa (ABC123), cédula, teléfono o factura..." 
                className="flex-1 bg-transparent text-lg outline-none dark:text-white"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button onClick={() => setIsOpen(false)} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700">ESC</button>
            </div>
            
            <div className="max-h-96 overflow-y-auto p-2">
              {query.length > 2 ? (
                <div className="p-2 space-y-1">
                  <div className="text-xs font-bold text-zinc-500 px-3 pb-2 uppercase tracking-wider">Resultados (MocK)</div>
                  <Link href="/pos" onClick={() => setIsOpen(false)} className="flex justify-between items-center p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">Juan Pérez</h4>
                      <p className="text-xs text-zinc-500">Cliente • 0991234567 • ABC-123</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-bold">Ver Perfil</span>
                  </Link>
                  <Link href="/taller/orden/OT-1042" onClick={() => setIsOpen(false)} className="flex justify-between items-center p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">Orden #OT-1042</h4>
                      <p className="text-xs text-zinc-500">Taller • Toyota RAV4 • En Trabajo</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold">Ver Orden</span>
                  </Link>
                  <Link href="/oficina/sri" onClick={() => setIsOpen(false)} className="flex justify-between items-center p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">Factura 001-002-000045</h4>
                      <p className="text-xs text-zinc-500">SRI • Autorizada • $120.00</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded font-bold">Ver XML</span>
                  </Link>
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  <p className="mb-2 text-3xl">🚗</p>
                  <p>Escribe al menos 3 caracteres para buscar en toda la plataforma.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
