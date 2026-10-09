import { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { GlobalSearch } from "@/components/GlobalSearch";
import { NotificationCenter } from "@/components/NotificationCenter";

export default async function PosLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const userRole = String(session?.user?.role || "").toUpperCase();

  if (!session || !["GERENCIA", "POS", "CAJA", "SUPERVISOR"].includes(userRole)) {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-100 dark:bg-zinc-950">
      <header className="h-14 bg-zinc-900 text-white flex items-center justify-between px-4 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-blue-400">
            AutoPro <span className="text-zinc-400 text-sm font-normal">POS</span>
          </Link>
          <nav className="hidden md:flex gap-4 text-sm font-medium">
            <Link href="/pos" className="hover:text-blue-400 transition-colors">Venta Nueva</Link>
            <Link href="/pos/cotizaciones" className="hover:text-blue-400 transition-colors">Cotizaciones</Link>
            <Link href="/pos/agenda" className="hover:text-blue-400 transition-colors">Agenda Diaria</Link>
            <Link href="/pos/ordenes" className="hover:text-blue-400 transition-colors">Órdenes Taller</Link>
            <Link href="/pos/historial" className="hover:text-blue-400 transition-colors">Historial Ventas</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <GlobalSearch />
          <NotificationCenter />
          <span className="px-2 py-1 rounded bg-zinc-800 text-xs font-bold text-zinc-300 border border-zinc-700">
            {session.user.location}
          </span>
          <div className="flex flex-col text-right pl-2 border-l border-zinc-800">
            <span className="text-sm font-bold text-white">{session.user.name}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
