import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  console.log("Cookies received in /dashboard:", cookieStore.getAll());

  const session = await getServerSession(authOptions);
  console.log("Session resolved in /dashboard:", session);

  if (!session) {
    redirect("/auth/login");
  }

  const role = String(session.user.role || "").toUpperCase();
  const roleRoutes: Record<string, string> = {
    GERENCIA: "/gerencia",
    OFICINA: "/oficina",
    TALLER: "/taller",
    POS: "/pos",
    CLIENTE: "/portal/vehiculos",
    CAJA: "/pos",
    SUPERVISOR: "/taller",
  };

  redirect(roleRoutes[role] || "/dashboard");

  return null;
}
