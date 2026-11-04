import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AccesoPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("auth_session")?.value;

  if (sessionCookie) {
    try {
      let user: any = null;
      try {
        user = JSON.parse(decodeURIComponent(sessionCookie));
      } catch {
        user = JSON.parse(sessionCookie);
      }

      if (user) {
        const roleUpper = (user.role || "").toUpperCase();
        const isGerente =
          roleUpper === "GERENCIA" ||
          roleUpper === "ROOT" ||
          roleUpper === "ADMIN" ||
          roleUpper === "GERENTE" ||
          user.isSuperAdmin;

        if (isGerente) {
          redirect("/gerencia");
        } else if (roleUpper === "POS" || user.accessPos) {
          redirect("/pos");
        } else if (roleUpper === "TALLER" || user.accessTaller) {
          redirect("/taller");
        } else if (roleUpper === "OFICINA" || user.accessOficina) {
          redirect("/oficina");
        } else if (roleUpper === "PRESUPUESTO" || roleUpper === "PRESUPUESTOS") {
          redirect("/presupuestos");
        } else if (roleUpper === "CLIENTE") {
          redirect("/cliente");
        }
      }
    } catch {}
  }

  redirect("/login");
}
