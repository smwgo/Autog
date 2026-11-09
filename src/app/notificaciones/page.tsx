"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicMobileNav } from "@/components/PublicMobileNav";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function NotificacionesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/notificaciones");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.notificaciones)) {
        setNotifications(data.notificaciones);
      }
    } catch (e) {
      console.error("Error al cargar notificaciones desde base de datos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-16 sm:pt-24 pb-24 md:pb-16 px-4 sm:px-6 md:px-12 max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 sm:mb-10 gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              title="Volver"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0 cursor-pointer"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Notificaciones
            </h1>
          </div>
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              className="text-sm font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors min-h-[44px] inline-flex items-center cursor-pointer"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-zinc-400">
              <div className="inline-block animate-spin text-3xl mb-2">⚙️</div>
              <p className="text-sm">Cargando notificaciones...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 sm:p-12 text-center flex flex-col items-center">
              <svg className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Todo al día</h3>
              <p className="text-zinc-500 dark:text-zinc-400">No tienes notificaciones en este momento.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {notifications.map((n) => (
                <div key={n.id} className={`p-4 sm:p-6 flex gap-3 sm:gap-4 transition-colors ${!n.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                  <div className="mt-1 shrink-0 text-lg">
                    {n.icon || (
                      !n.read ? (
                        <span className="flex h-3 w-3 rounded-full bg-blue-500 mt-1"></span>
                      ) : (
                        <span className="flex h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700 mt-1"></span>
                      )
                    )}
                  </div>
                  <div className="flex-grow min-w-0">
                    {n.title && (
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">
                        {n.title}
                      </p>
                    )}
                    <p className={`text-sm sm:text-base ${!n.read ? 'text-zinc-900 dark:text-zinc-100 font-semibold' : 'text-zinc-600 dark:text-zinc-400 font-medium'}`}>
                      {n.text}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-500">{n.date}</span>
                      {n.link && (
                        <Link href={n.link} className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                          Ver detalle
                        </Link>
                      )}
                      <button 
                        onClick={() => deleteNotification(n.id)}
                        className="text-xs sm:text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors min-h-[44px] min-w-[44px] inline-flex items-center -my-2 cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <PublicMobileNav />
    </div>
  );
}
