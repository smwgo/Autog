import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { isProtectedAdminEmail } from "@/lib/admin-accounts";

const panels = [
  {
    title: "Gerencia",
    href: "/gerencia",
    icon: "chart",
    color: "from-blue-600 to-indigo-600",
    accent: "bg-blue-100/70 dark:bg-blue-500/10",
  },
  {
    title: "Oficina",
    href: "/oficina",
    icon: "office",
    color: "from-amber-500 to-orange-600",
    accent: "bg-amber-100/70 dark:bg-amber-500/10",
  },
  {
    title: "POS",
    href: "/pos",
    icon: "cart",
    color: "from-emerald-500 to-teal-600",
    accent: "bg-emerald-100/70 dark:bg-emerald-500/10",
  },
  {
    title: "Taller",
    href: "/taller",
    icon: "wrench",
    color: "from-sky-500 to-blue-600",
    accent: "bg-sky-100/70 dark:bg-sky-500/10",
  },
  {
    title: "Propuesta",
    href: "/presupuestos",
    icon: "document",
    color: "from-violet-500 to-purple-600",
    accent: "bg-violet-100/70 dark:bg-violet-500/10",
  },
];

export const dynamic = "force-dynamic";

export default async function ModulosPage() {
  const sessionCookie = (await cookies()).get("auth_session")?.value;
  let user: { email?: string; role?: string; isSuperAdmin?: boolean } | null = null;

  if (sessionCookie) {
    try {
      user = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      try {
        user = JSON.parse(sessionCookie);
      } catch {
        user = null;
      }
    }
  }

  if (
    !isProtectedAdminEmail(user?.email) ||
    (user?.role?.toUpperCase() !== "ROOT" && !user?.isSuperAdmin)
  ) {
    redirect("/acceso");
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {panels.map((panel) => (
            <Link
              key={panel.href}
              href={panel.href}
              className="group relative flex min-h-[132px] items-center gap-5 overflow-hidden rounded-[28px] border border-zinc-200 bg-white px-6 py-5 shadow-[0_4px_16px_rgba(24,24,27,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 dark:focus-visible:ring-offset-zinc-950 sm:px-7"
            >
              <span
                className={`pointer-events-none absolute -right-7 -top-14 h-36 w-36 rounded-full ${panel.accent}`}
                aria-hidden="true"
              />
              <span
                className={`relative flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br ${panel.color} text-white shadow-md`}
                aria-hidden="true"
              >
                <svg
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
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
                      <path d="M14 2v6h6M8 13h8M8 17h8" />
                    </>
                  )}
                </svg>
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block text-xl font-medium text-zinc-900 dark:text-white sm:text-[22px]">
                  {panel.title}
                </span>
              </span>
              <span
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 transition group-hover:translate-x-1 group-hover:border-zinc-300 group-hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                aria-hidden="true"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
