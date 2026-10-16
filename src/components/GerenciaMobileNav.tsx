"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/gerencia", label: "Inicio", icon: "📊" },
  { href: "/gerencia/dashboard", label: "Tablero", icon: "📈" },
  { href: "/gerencia/reportes", label: "Finanzas", icon: "💰" },
  { href: "/gerencia/personal", label: "Personal", icon: "👥" },
  { href: "/gerencia/inventario", label: "Stock", icon: "📦" },
  { href: "/gerencia/auditoria", label: "Auditoría", icon: "🛡️" },
  { href: "/gerencia/configuracion", label: "Ajustes", icon: "⚙️" },
];

export function GerenciaMobileNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="h-20 md:hidden" aria-hidden="true" />
      <nav
        aria-label="Navegación Móvil Gerencia"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-around px-1 py-1.5 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1.5 rounded-xl transition-all active:scale-95 ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10 font-bold"
                    : "text-zinc-500 dark:text-zinc-400 font-medium"
                }`}
              >
                <span className="text-base leading-none mb-0.5">{item.icon}</span>
                <span className="text-[10px] tracking-tight truncate max-w-[54px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
