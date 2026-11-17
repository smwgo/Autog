"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type?: string;
  icon?: string;
  title?: string;
  text: string;
  date: string;
  read: boolean;
  link?: string;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notificaciones");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.notificaciones)) {
        setNotifications(data.notificaciones);
        setCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error("Error al obtener notificaciones:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarcarLeidas = async () => {
    const ids = notifications.map((n) => n.id);
    setCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (ids.length > 0) {
      try {
        await fetch("/api/notificaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
      } catch {}
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Abrir centro de notificaciones"
        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors relative cursor-pointer"
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
              <button onClick={handleMarcarLeidas} className="text-xs text-blue-600 hover:underline min-h-[32px] flex items-center cursor-pointer">
                Marcar leídas
              </button>
            </div>
            <div className="max-h-[60dvh] overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer ${
                      !item.read ? "bg-blue-50/20 dark:bg-blue-900/10" : ""
                    }`}
                  >
                    <Link href={item.link || "/notificaciones"} onClick={() => setIsOpen(false)}>
                      <div className="flex gap-2.5">
                        <span className="text-lg mt-0.5">{item.icon || "🔔"}</span>
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                            {item.title || "Aviso"}
                          </p>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                            {item.text}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1.5">{item.date}</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 text-sm">
                  No tienes notificaciones en este momento.
                </div>
              )}
            </div>
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-center">
              <Link
                href="/notificaciones"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors min-h-[36px] inline-flex items-center"
              >
                Ver Historial Completo
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
