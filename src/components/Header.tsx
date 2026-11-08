"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getClientUserBranch, normalizeSede, setClientUserBranch } from "@/lib/branch";
import { BranchTabs } from "@/components/pos/BranchTabs";
import { isProtectedAdminEmail } from "@/lib/admin-accounts";

interface CurrentUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  branch?: string;
  isSuperAdmin?: boolean;
  accessOficina?: boolean;
  accessPos?: boolean;
  accessTaller?: boolean;
}

export function Header() {
  const pathname = usePathname() || "";
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<
    { id: string | number; text: string; date: string; read: boolean }[]
  >([]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string | number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const deleteNotification = (id: string | number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    fetch("/api/notificaciones")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.notificaciones)) {
          setNotifications(data.notificaciones);
        }
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
    // Check initial theme from localStorage or system preference
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark') || 
                         localStorage.getItem('theme') === 'dark' || 
                         (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  useEffect(() => {
    // 1. Cargar desde localStorage si existe
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem("currentUser");
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && (parsed.name || parsed.email)) {
            setCurrentUser(parsed);
            if (parsed.branch && getClientUserBranch() !== normalizeSede(parsed.branch)) {
              setClientUserBranch(normalizeSede(parsed.branch));
            }
          }
        }
      } catch {}
    }

    // 2. Sincronizar con /api/auth/me
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.user) {
          setCurrentUser(data.user);
          if (
            data.user.branch &&
            getClientUserBranch() !== normalizeSede(data.user.branch)
          ) {
            setClientUserBranch(normalizeSede(data.user.branch));
          }
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("currentUser", JSON.stringify(data.user));
            } catch {}
          }
        }
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("user_profile");
        localStorage.removeItem("autog_user_branch");
        localStorage.removeItem("autog_active_branch");
        document.cookie = "auth_session=; path=/; max-age=0";
      } catch {}
      window.location.href = "/login";
    }
  };

  const isSucursalUser = (() => {
    if (!mounted) return false;
    const b = (currentUser?.branch || "").toUpperCase();
    if (b.includes("SUCURSAL")) return true;
    if (typeof window !== "undefined") {
      const stored = (localStorage.getItem("autog_user_branch") || "").toUpperCase();
      if (stored.includes("SUCURSAL")) return true;
    }
    return false;
  })();

  const singleWordName = (() => {
    const inPos = pathname.startsWith("/pos");
    const inTaller = pathname.startsWith("/taller");
    const inOficina = pathname.startsWith("/oficina");
    const inGerencia = pathname.startsWith("/gerencia");

    if (currentUser) {
      const r = (currentUser.role || "").toUpperCase();
      const raw = (currentUser.name || currentUser.email?.split("@")[0] || "").trim();

      // Si el nombre tiene un número o identificador específico (ej. "POS 2"), respetarlo
      if (raw.toUpperCase() === "POS 2" || currentUser.email?.toLowerCase().includes("pos2@")) {
        return "POS 2";
      }
      if (r === "POS" || raw.toUpperCase() === "POS" || currentUser.email?.toLowerCase().includes("pos@")) {
        return "POS";
      }
      if (r === "TALLER" || raw.toUpperCase() === "TALLER") {
        return raw.toUpperCase().includes("2") ? "Taller 2" : "Taller";
      }
      if (r === "OFICINA" || raw.toUpperCase() === "OFICINA") {
        return raw.toUpperCase().includes("2") ? "Oficina 2" : "Oficina";
      }

      // Si estamos en un módulo operativo específico
      if (inPos) return "POS";
      if (inTaller) return "Taller";
      if (inOficina) return "Oficina";

      if (raw.toLowerCase().includes("administrador") || raw.toLowerCase().includes("admin") || r === "ROOT" || r === "GERENCIA") {
        return "Admin";
      }

      return raw || (inPos ? "POS" : inTaller ? "Taller" : inOficina ? "Oficina" : "Admin");
    }

    if (inPos) return "POS";
    if (inTaller) return "Taller";
    if (inOficina) return "Oficina";
    return inGerencia ? "Admin" : "POS";
  })();

  const userPanelHref = (() => {
    const role = (currentUser?.role || "").toUpperCase();
    if (
      isProtectedAdminEmail(currentUser?.email) &&
      (role === "ROOT" || currentUser?.isSuperAdmin)
    ) {
      return "/modulos";
    }
    if (role === "PRESUPUESTO" || role === "PRESUPUESTOS" || role === "PROPUESTA" || role === "PROPUESTAS") {
      return "/presupuestos";
    }
    if (pathname.startsWith("/pos") || currentUser?.role === "POS" || currentUser?.accessPos) return "/pos";
    if (pathname.startsWith("/taller") || currentUser?.role === "Taller" || currentUser?.accessTaller) return "/taller";
    if (pathname.startsWith("/oficina") || currentUser?.role === "Oficina" || currentUser?.accessOficina) return "/oficina";
    if (currentUser?.role === "Cliente") return "/cliente";
    return "/gerencia";
  })();
  const roleUpper = (currentUser?.role || "").toUpperCase();
  const isAdministrator =
    Boolean(currentUser?.isSuperAdmin) ||
    isProtectedAdminEmail(currentUser?.email) ||
    pathname.startsWith("/gerencia") ||
    pathname.startsWith("/modulos") ||
    ["ROOT", "ADMIN", "ADMINISTRADOR", "GERENCIA", "GERENTE"].includes(roleUpper);

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md pt-[env(safe-area-inset-top,0px)]">
      <div className="container mx-auto flex min-h-16 flex-wrap items-center justify-between gap-y-1 py-2 px-4 sm:h-16 sm:flex-nowrap sm:py-0 sm:px-6 md:px-12">
        <Link href="/" className="flex shrink-0 items-center gap-2 min-h-[44px]">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            {/* Ícono automotriz (Llave/Herramienta) */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-xl flex items-center gap-1.5">
            <span className="text-blue-600 dark:text-blue-500 font-black">Auto</span>
            <span className="text-zinc-400 dark:text-zinc-600 font-light px-0.5">/</span>
            <span className="text-zinc-900 dark:text-white font-black">G</span>
          </span>
        </Link>
        <div className="hidden md:flex gap-6"></div>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:ml-0 sm:gap-3 text-zinc-600 dark:text-zinc-300">
          {mounted && isAdministrator && (
            <BranchTabs iconOnly isAdmin={isAdministrator} />
          )}

          <button onClick={toggleTheme} aria-label="Toggle Theme" className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-blue-600 transition-colors">
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
            )}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notificaciones" 
              className="hover:text-blue-600 transition-colors relative flex items-center justify-center min-w-[44px] min-h-[44px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] font-bold text-white items-center justify-center">{unreadCount}</span>
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                <div className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top,0px)+4rem)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-80 max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80dvh]">
                  <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-zinc-900 dark:text-white">Notificaciones</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full font-semibold">{unreadCount} nuevas</span>
                  </div>
                  <div className="max-h-[60dvh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                        No tienes notificaciones
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-zinc-50 dark:border-zinc-800/50 flex flex-col gap-2 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                          <div className="flex justify-between items-start gap-2">
                            <p className={`text-sm ${!n.read ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-600 dark:text-zinc-400'}`}>{n.text}</p>
                            <button onClick={() => deleteNotification(n.id)} className="text-zinc-400 hover:text-red-500 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center" title="Eliminar">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-zinc-400">{n.date}</span>
                            {!n.read && (
                              <button onClick={() => markAsRead(n.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium min-h-[32px] flex items-center">
                                Marcar visto
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 text-center bg-zinc-50 dark:bg-zinc-950/50">
                    <Link href="/notificaciones" onClick={() => setShowNotifications(false)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium inline-block py-1">
                      Ver todas las notificaciones
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Perfil de Usuario Logeado */}
          {currentUser || pathname.startsWith("/pos") || pathname.startsWith("/taller") || pathname.startsWith("/oficina") || pathname.startsWith("/gerencia") || pathname.startsWith("/modulos") ? (
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
              <Link
                href={userPanelHref}
                suppressHydrationWarning
                aria-label={singleWordName}
                className="flex items-center gap-1 sm:gap-2 h-11 px-2.5 sm:px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer shadow-sm active:scale-95 text-xs font-semibold text-zinc-800 dark:text-zinc-200"
                title={singleWordName}
              >
                <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span suppressHydrationWarning className="max-[374px]:hidden">{singleWordName}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="h-11 min-w-[44px] px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-rose-50 hover:border-rose-300 dark:hover:bg-rose-950/30 dark:hover:border-rose-900 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer shadow-sm active:scale-95 text-xs font-semibold"
                title="Salir"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <Link href="/login" aria-label="Iniciar Sesión" className="hover:text-blue-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            </Link>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
