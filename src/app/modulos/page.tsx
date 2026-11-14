"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { isProtectedAdminEmail } from "@/lib/admin-accounts";

const panels = [
  {
    title: "Gerencia",
    href: "/gerencia",
    icon: "chart",
    color: "bg-blue-500",
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    title: "Oficina",
    href: "/oficina",
    icon: "office",
    color: "bg-amber-500",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    title: "POS",
    href: "/pos",
    icon: "cart",
    color: "bg-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    title: "Taller",
    href: "/taller",
    icon: "wrench",
    color: "bg-sky-500",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    title: "Propuesta",
    href: "/presupuestos",
    icon: "document",
    color: "bg-purple-500",
    gradient: "from-violet-500 to-purple-600",
  },
];

function readClientSessionUser(): { email?: string; role?: string; isSuperAdmin?: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const local = localStorage.getItem("currentUser");
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {}
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith("auth_session="));
    if (match) {
      const raw = match.slice("auth_session=".length);
      try {
        return JSON.parse(decodeURIComponent(raw));
      } catch {
        return JSON.parse(raw);
      }
    }
  } catch {}
  return null;
}

export default function ModulosPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      let user = readClientSessionUser();
      if (!user) {
        try {
          const res = await fetch("/api/auth/me");
          const data = await res.json();
          if (data?.success && data?.user) {
            user = data.user;
          }
        } catch {}
      }

      if (
        !isProtectedAdminEmail(user?.email) ||
        (user?.role?.toUpperCase() !== "ROOT" && !user?.isSuperAdmin)
      ) {
        router.replace("/acceso");
      }
    };
    void checkAccess();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {panels.map((panel, index) => (
            <Link
              key={panel.href}
              href={panel.href}
              className="group block bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-6 min-h-[96px] sm:min-h-[104px] border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all duration-300 ease-out hover:-translate-y-1.5 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.97] overflow-hidden relative flex flex-col justify-center"
            >
              {/* Esquina con color suave */}
              <div
                style={{ animationDelay: `${index * 0.4}s` }}
                className={`absolute top-0 right-0 w-32 h-32 ${panel.color} opacity-[0.08] dark:opacity-5 rounded-bl-full -mr-10 -mt-10 transition-all duration-500 ease-out group-hover:scale-125 group-hover:opacity-20 dark:group-hover:opacity-15 auto-corner-mobile sm:animate-none pointer-events-none`}
              />
              {/* Destello de brillo diagonal */}
              <div
                style={{ animationDelay: `${index * 0.4}s` }}
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full auto-shine-mobile sm:animate-none transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-zinc-400/15 dark:via-white/[0.07] to-transparent pointer-events-none"
              />

              <div className="flex items-center justify-between gap-3 min-w-0 relative z-10 w-full">
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${panel.gradient} shadow-md flex items-center justify-center flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3`}
                  >
                    <svg
                      className="w-6 h-6 sm:w-7 sm:h-7 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {panel.icon === "chart" && (
                        <>
                          <path d="M5 19V10" />
                          <path d="M12 19V5" />
                          <path d="M19 19v-7" />
                        </>
                      )}
                      {panel.icon === "office" && (
                        <>
                          <path d="M12 2v20" />
                          <path d="M5 7h14" />
                          <path d="M7 3h10v18H7z" />
                          <path d="M10 11h.01M14 11h.01M10 15h.01M14 15h.01M11 21v-3h2v3" />
                        </>
                      )}
                      {panel.icon === "cart" && (
                        <>
                          <circle cx="9" cy="20" r="1" />
                          <circle cx="18" cy="20" r="1" />
                          <path d="M2 3h2l2.4 11.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5" />
                        </>
                      )}
                      {panel.icon === "wrench" && (
                        <path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4l-3.1 3.1-3.3-3.3 3.4-2.8Z" />
                      )}
                      {panel.icon === "document" && (
                        <>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" x2="8" y1="13" />
                          <line x1="16" x2="8" y1="17" />
                          <line x1="10" x2="8" y1="9" />
                        </>
                      )}
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-normal text-zinc-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 truncate">
                    {panel.title}
                  </h3>
                </div>

                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-transparent flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:border-blue-200 dark:group-hover:border-transparent group-hover:translate-x-1 transition-all duration-200 shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
