"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdminSession, isStaffSession } from "@/lib/signed-tokens";

export default function GerenciaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json().catch(() => null);

        if (!active) return;

        if (!res.ok || !data?.success || !data?.user) {
          router.replace("/login");
          return;
        }

        const user = data.user;
        const roleUpper = String(user.role || "").trim().toUpperCase();
        const isManager =
          user.isSuperAdmin ||
          ["ROOT", "ADMIN", "ADMINISTRADOR", "GERENCIA", "GERENTE"].includes(roleUpper);

        if (isManager) {
          setAuthorized(true);
          return;
        }

        // Si no tiene permisos de gerencia, redirigir a su módulo legítimo
        if (roleUpper === "CLIENT" || roleUpper === "CLIENTE" || roleUpper === "CUSTOMER") {
          router.replace("/cliente");
          return;
        }

        if (roleUpper === "TALLER" || user.accessTaller) {
          router.replace("/taller");
          return;
        }

        if (roleUpper === "OFICINA" || user.accessOficina) {
          router.replace("/oficina");
          return;
        }

        if (roleUpper === "POS" || user.accessPos) {
          router.replace("/pos");
          return;
        }

        router.replace("/cliente");
      } catch {
        if (active) router.replace("/login");
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, [router]);

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Verificando permisos de Gerencia...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
