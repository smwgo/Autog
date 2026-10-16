"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Inicio", icon: "🏠" },
  { href: "/tienda", label: "Tienda", icon: "🛒" },
  { href: "/servicios", label: "Servicios", icon: "🛠️" },
  { href: "/promociones", label: "Ofertas", icon: "🏷️" },
  { href: "/agendar", label: "Citas", icon: "📅" },
  { href: "/contacto", label: "Contacto", icon: "📞" },
];

export function PublicMobileNav() {
  const pathname = usePathname();

  // No mostrar en paneles internos que ya tienen su propia barra
  if (
    pathname.startsWith("/cliente") ||
    pathname.startsWith("/oficina") ||
    pathname.startsWith("/gerencia") ||
    pathname.startsWith("/pos") ||
    pathname.startsWith("/taller")
  ) {
    return null;
  }

  return (
    <>
      <div className="h-20 md:hidden" aria-hidden="true" />
      <nav
        aria-label="Navegación Móvil Principal"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-around px-1 py-1.5 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-2 rounded-xl transition-all active:scale-95 ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-500/10 font-bold"
                    : "text-zinc-500 dark:text-zinc-400 font-medium"
                }`}
              >
                <span className="text-base leading-none mb-0.5">{item.icon}</span>
                <span className="text-[10px] tracking-tight truncate max-w-[54px]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
