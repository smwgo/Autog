"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/pos", label: "POS", icon: "🏪", exact: true },
  { href: "/pos/venta", label: "Venta", icon: "🛒" },
  { href: "/pos/facturas", label: "Facturas", icon: "🧾" },
  { href: "/pos/clientes", label: "Clientes", icon: "👥" },
  { href: "/pos/catalogo", label: "Productos", icon: "📦" },
  { href: "/pos/servicios", label: "Servicios", icon: "⚙️" },
  { href: "/pos/caja", label: "Caja", icon: "💵" },
  { href: "/pos/cotizaciones", label: "Cotiz.", icon: "📝" },
  { href: "/pos/promociones", label: "Promos", icon: "🏷️" },
  { href: "/pos/creditos", label: "Créditos", icon: "💳" },
];

export function PosMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación móvil de POS"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center overflow-x-auto no-scrollbar px-1.5 py-1.5 gap-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[60px] py-1.5 px-2 rounded-xl transition-all active:scale-95 shrink-0 ${
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
              }`}
            >
              <span className="text-base leading-none mb-1">{item.icon}</span>
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-[56px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
