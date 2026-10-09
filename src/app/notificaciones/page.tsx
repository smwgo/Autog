"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useState } from "react";

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Bienvenido a AutoG. Completa tu perfil para más beneficios.", date: "Justo ahora", read: false },
    { id: 2, text: "Tienes un 10% de descuento en tu primer servicio de mantenimiento.", date: "Hace 2h", read: false },
    { id: 3, text: "Tu vehículo ha sido registrado exitosamente en nuestro sistema.", date: "Hace 1 día", read: true },
    { id: 4, text: "El repuesto que estabas buscando (Filtro de Aceite) ya está disponible.", date: "Hace 2 días", read: true },
  ]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-24 pb-16 px-6 md:px-12 max-w-4xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Notificaciones
          </h1>
          {notifications.some(n => !n.read) && (
            <button 
              onClick={markAllAsRead}
              className="text-sm font-medium text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <svg className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Todo al día</h3>
              <p className="text-zinc-500 dark:text-zinc-400">No tienes notificaciones en este momento.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {notifications.map((n) => (
                <div key={n.id} className={`p-6 flex gap-4 transition-colors ${!n.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                  <div className="mt-1">
                    {!n.read ? (
                      <span className="flex h-3 w-3 rounded-full bg-blue-500"></span>
                    ) : (
                      <span className="flex h-3 w-3 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                    )}
                  </div>
                  <div className="flex-grow">
                    <p className={`text-base ${!n.read ? 'text-zinc-900 dark:text-zinc-100 font-semibold' : 'text-zinc-600 dark:text-zinc-400 font-medium'}`}>
                      {n.text}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">{n.date}</span>
                      <button 
                        onClick={() => deleteNotification(n.id)}
                        className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
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
    </div>
  );
}
