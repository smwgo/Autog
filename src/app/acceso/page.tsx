import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type AuthSession = {
  role?: string;
  isSuperAdmin?: boolean;
  accessPos?: boolean;
  accessTaller?: boolean;
  accessOficina?: boolean;
};

export default async function AccesoPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("auth_session")?.value;

  if (sessionCookie) {
    let user: AuthSession | null = null;
    try {
      user = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      try {
        user = JSON.parse(sessionCookie);
      } catch {
        user = null;
      }
    }

    if (user) {
      const roleUpper = typeof user.role === "string" ? user.role.toUpperCase() : "";
      const isGerente =
        roleUpper === "GERENCIA" ||
        roleUpper === "ROOT" ||
        roleUpper === "ADMIN" ||
        roleUpper === "GERENTE" ||
        user.isSuperAdmin;

      if (isGerente) {
        redirect("/gerencia");
      } else if (
        roleUpper === "PRESUPUESTO" ||
        roleUpper === "PRESUPUESTOS" ||
        roleUpper === "PROPUESTA" ||
        roleUpper === "PROPUESTAS"
      ) {
        redirect("/presupuestos");
      } else if (roleUpper === "POS" || user.accessPos) {
        redirect("/pos");
      } else if (roleUpper === "TALLER" || user.accessTaller) {
        redirect("/taller");
      } else if (roleUpper === "OFICINA" || user.accessOficina) {
        redirect("/oficina");
      } else if (roleUpper === "CLIENTE") {
        redirect("/cliente");
      }
    }
  }

  redirect("/login");
}
