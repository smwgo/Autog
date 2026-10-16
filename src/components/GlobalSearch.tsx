"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  href: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.results)) {
          setResults(data.results);
        }
      } catch (e) {
        console.error("Error al buscar en Neon DB:", e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Manejo de atajo Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors w-64 cursor-pointer"
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
                placeholder="Busca por placa (ABC123), cliente, teléfono o factura..." 
                className="flex-1 bg-transparent text-lg outline-none dark:text-white"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setQuery("");
                  setResults([]);
                }} 
                className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
              >
                ESC
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto p-2">
              {loading ? (
                <div className="py-8 text-center text-zinc-400 text-sm">
                  <span className="inline-block animate-spin mr-2">⚙️</span>
                  Buscando en Neon DB...
                </div>
              ) : query.length >= 2 ? (
                results.length > 0 ? (
                  <div className="p-2 space-y-1">
                    <div className="text-xs font-bold text-zinc-500 px-3 pb-2 uppercase tracking-wider">
                      Resultados en Vivo ({results.length})
                    </div>
                    {results.map((item) => (
                      <Link 
                        key={item.id}
                        href={item.href} 
                        onClick={() => {
                          setIsOpen(false);
                          setQuery("");
                        }} 
                        className="flex justify-between items-center p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
                      >
                        <div className="min-w-0 pr-3">
                          <h4 className="font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                            {item.title}
                          </h4>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-bold shrink-0 ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500 text-sm">
                    <p className="mb-1 text-2xl">🔍</p>
                    <p>No se encontraron coincidencias para &quot;{query}&quot; en Neon DB.</p>
                  </div>
                )
              ) : (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  <p className="mb-2 text-3xl">🚗</p>
                  <p>Escribe al menos 2 caracteres para buscar clientes, órdenes o repuestos en tiempo real.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
