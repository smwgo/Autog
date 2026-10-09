import { ReactNode } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnlineStatus } from "@/components/OnlineStatus";

export default async function TallerLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const userRole = String(session?.user?.role || "").toUpperCase();

  if (!session || !["GERENCIA", "TALLER", "SUPERVISOR"].includes(userRole)) {
    redirect("/auth/login");
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-zinc-300">
      <OnlineStatus />
      
      {/* Top Header */}
      <header className="h-16 bg-black border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-2xl font-bold text-amber-500">
            AutoPro <span className="text-zinc-500 text-sm font-normal">Taller</span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-bold tracking-wide">
            <Link href="/taller" className="hover:text-amber-400 transition-colors">Mi Tablero</Link>
            <Link href="/taller/mis-trabajos" className="hover:text-amber-400 transition-colors">Historial</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 rounded bg-zinc-800 text-xs font-bold text-amber-500 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
            {session.user.location}
          </span>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white">
               {session.user.name?.charAt(0)}
             </div>
             <span className="text-sm font-bold text-white hidden sm:block">{session.user.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
