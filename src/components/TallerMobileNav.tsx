"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/taller", label: "Taller", icon: "🔧", exact: true },
  { href: "/taller/ordenes", label: "Órdenes", icon: "🚗" },
  { href: "/taller/inspecciones", label: "Inspecc.", icon: "📋" },
  { href: "/taller/tareas", label: "Tareas", icon: "🛠️" },
  { href: "/taller/historial", label: "Historial", icon: "📖" },
  { href: "/taller/repuestos", label: "Repuestos", icon: "🔩" },
  { href: "/taller/tiempos", label: "Tiempos", icon: "⏱️" },
];

export function TallerMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación móvil de Taller"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="grid grid-cols-7 gap-0.5 px-1 py-1.5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
              }`}
            >
              <span className="text-base leading-none mb-1">{item.icon}</span>
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
