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

  const role = session.user.role;

  // Redirigir según el rol del usuario
  if (role === 'GERENCIA') {
    redirect('/gerencia');
  } else if (role === 'CLIENTE') {
    redirect('/portal/vehiculos');
  } else {
    redirect(`/${role.toLowerCase()}`);
  }

  return null;
}
