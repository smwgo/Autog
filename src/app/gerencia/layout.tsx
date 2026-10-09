import { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationCenter } from "@/components/NotificationCenter";

export default async function GerenciaLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const userRole = String(session?.user?.role || "").toUpperCase();

  if (!session || userRole !== "GERENCIA") {
    redirect("/auth/login");
  }

  const navItems = [
    { name: "Resumen", href: "/gerencia", icon: "📊" },
    { name: "Finanzas", href: "/gerencia/finanzas", icon: "💰" },
    { name: "Inventario", href: "/gerencia/inventario", icon: "📦" },
    { name: "Recursos Humanos", href: "/gerencia/rrhh", icon: "👥" },
    { name: "Auditoría", href: "/gerencia/auditoria", icon: "📋" },
    { name: "Usuarios", href: "/gerencia/usuarios", icon: "🛡️" },
    { name: "Configuración", href: "/gerencia/configuracion", icon: "⚙️" },
  ];

  return (
    <div className="flex h-screen bg-[#e8e8e8] text-zinc-800">
      <aside className="w-[250px] border-r border-zinc-300 bg-[#f3f3f3] flex flex-col h-full">
        <div className="px-6 py-5 border-b border-zinc-300/80">
          <Link href="/dashboard" className="text-[30px] font-black tracking-tighter text-blue-600 leading-none">
            AutoPro <span className="text-zinc-500 text-[18px] font-semibold tracking-normal align-middle ml-1">Gerencia</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[18px] font-medium transition-colors ${
                item.href === "/gerencia"
                  ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                  : "text-zinc-700 hover:bg-zinc-200/80"
              }`}
            >
              <span className="text-[20px] w-6 inline-flex justify-center">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="border-t border-zinc-300 bg-[#f5f5f5] p-4">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {session.user.name?.charAt(0)?.toUpperCase() || "G"}
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-zinc-900">{session.user.name}</span>
              <span className="text-xs text-zinc-500">{session.user.location}</span>
            </div>
          </div>

          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-200 transition-colors">
              Cerrar Sesión
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-0">
        {children}
      </main>
    </div>
  );
}
