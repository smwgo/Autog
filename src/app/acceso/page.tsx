"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isProtectedAdminEmail } from "@/lib/admin-accounts";

type AuthSession = {
  email?: string;
  role?: string;
  isSuperAdmin?: boolean;
  accessPos?: boolean;
  accessTaller?: boolean;
  accessOficina?: boolean;
  isPanelSelector?: boolean;
};

function resolveDestination(user: AuthSession | null): string {
  if (!user) return "/login";

  if (
    isProtectedAdminEmail(user.email) &&
    (user.role?.toUpperCase() === "ROOT" || user.isSuperAdmin)
  ) {
    return "/modulos";
  }

  const roleUpper = typeof user.role === "string" ? user.role.toUpperCase() : "";
  const isGerente =
    roleUpper === "GERENCIA" ||
    roleUpper === "ROOT" ||
    roleUpper === "ADMIN" ||
    roleUpper === "GERENTE" ||
    user.isSuperAdmin;

  if (isGerente) {
    return "/gerencia";
  }
  if (
    roleUpper === "PRESUPUESTO" ||
    roleUpper === "PRESUPUESTOS" ||
    roleUpper === "PROPUESTA" ||
    roleUpper === "PROPUESTAS"
  ) {
    return "/presupuestos";
  }
  if (roleUpper === "POS" || user.accessPos) {
    return "/pos";
  }
  if (roleUpper === "TALLER" || user.accessTaller) {
    return "/taller";
  }
  if (roleUpper === "OFICINA" || user.accessOficina) {
    return "/oficina";
  }
  if (roleUpper === "CLIENTE") {
    return "/cliente";
  }
  return "/login";
}

function readClientSession(): AuthSession | null {
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

export default function AccesoPage() {
  const router = useRouter();

  useEffect(() => {
    const user = readClientSession();
    router.replace(resolveDestination(user));
  }, [router]);

  return null;
}
