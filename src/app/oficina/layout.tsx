import { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OficinaLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const userRole = String(session?.user?.role || "").toUpperCase();

  if (!session || !["GERENCIA", "OFICINA"].includes(userRole)) {
    redirect("/auth/login");
  }

  const navItems = [
    { name: "Dashboard", href: "/oficina", icon: "📊" },
    { name: "Clientes", href: "/oficina/clientes", icon: "👥" },
    { name: "Proveedores", href: "/oficina/proveedores", icon: "🏢" },
    { name: "Ventas & Facturación", href: "/oficina/ventas", icon: "🧾" },
    { name: "Facturación SRI", href: "/oficina/sri", icon: "🇪🇨" },
    { name: "Inventario & Compras", href: "/oficina/inventario", icon: "📦" },
    { name: "Caja y Bancos", href: "/oficina/caja", icon: "💵" },
    { name: "CxC y CxP", href: "/oficina/cuentas", icon: "⚖️" },
    { name: "Documentos", href: "/oficina/documentos", icon: "📂" },
    { name: "Reportes", href: "/oficina/reportes", icon: "📈" },
  ];

  return (
    <div className="flex h-screen bg-zinc-100 dark:bg-zinc-950">
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <Link href="/dashboard" className="text-2xl font-bold tracking-tighter text-blue-600 dark:text-blue-500">
            AutoPro <span className="text-zinc-400 text-sm font-normal tracking-normal ml-1">Oficina</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
              {session.user.name?.charAt(0) || "O"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">{session.user.name}</span>
              <span className="text-xs text-zinc-500">{session.user.location}</span>
            </div>
          </div>
          <form action="/api/auth/signout" method="POST">
             <button type="submit" className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors">
               Cerrar Sesión
             </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
