import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isProtectedAdminEmail } from "@/lib/admin-accounts";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().min(1, "El correo es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = LoginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0]?.message || "Datos incompletos" },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    console.log(`[LOGIN ATTEMPT] Identifier: '${cleanEmail}'`);

    let authenticatedUser: any = null;
    let redirectTo = "/gerencia";

    // 1. Verificar si existe en la tabla User tradicional (ROOT / Admin)
    const legacyUser = await withRetry(() =>
      prisma.user.findFirst({
        where: cleanEmail.includes("@")
          ? { email: cleanEmail }
          : { OR: [{ email: cleanEmail }, { email: `${cleanEmail}@gmail.com` }, { name: cleanEmail }] },
      })
    );

    if (legacyUser && legacyUser.passwordHash) {
      const match =
        (await bcrypt.compare(cleanPassword, legacyUser.passwordHash)) ||
        (await bcrypt.compare(password, legacyUser.passwordHash));

      if (match) {
        const isSuperAdmin = legacyUser.role === "ROOT";
        const isPanelSelector = isSuperAdmin && isProtectedAdminEmail(legacyUser.email);
        redirectTo = isPanelSelector ? "/modulos" : isSuperAdmin ? "/gerencia" : "/cliente";
        authenticatedUser = {
          id: legacyUser.id,
          email: legacyUser.email,
          name: legacyUser.name,
          role: legacyUser.role,
          branch: "Principal",
          isSuperAdmin,
          accessOficina: isSuperAdmin,
          accessPos: isSuperAdmin,
          accessTaller: isSuperAdmin,
          isPanelSelector,
        };
      }
    }

    // 2. Si no autenticó en User, verificar en la tabla AppUserAccess (Usuarios creados en Gerencia)
    if (!authenticatedUser) {
      const appUser = await withRetry(() =>
        cleanEmail.includes("@")
          ? prisma.appUserAccess.findUnique({ where: { email: cleanEmail } })
          : prisma.appUserAccess.findFirst({
              where: {
                OR: [{ email: cleanEmail }, { email: `${cleanEmail}@gmail.com` }, { username: cleanEmail }, { name: cleanEmail }],
              },
            })
      );

      if (appUser) {
        if (appUser.status && appUser.status.toLowerCase() === "suspendido") {
          return NextResponse.json(
            { success: false, error: "Usuario suspendido. Contacta a Gerencia." },
            { status: 403 }
          );
        }

        // Comparar contraseña con pinCode (o hash bcrypt si fuera el caso)
        let match = false;
        const storedPin = String(appUser.pinCode || "").trim();

        if (storedPin) {
          if (cleanPassword === storedPin || password === storedPin) {
            match = true;
          } else if (storedPin.startsWith("$2a$") || storedPin.startsWith("$2b$")) {
            match = await bcrypt.compare(cleanPassword, storedPin);
          }
        }

        if (match) {
          const roleUpper = (appUser.role || "").toUpperCase();
          const isGerente =
            roleUpper === "GERENCIA" ||
            roleUpper === "ROOT" ||
            roleUpper === "ADMIN" ||
            roleUpper === "GERENTE";

          // Determinar panel de destino
          if (isGerente) {
            redirectTo = "/gerencia";
          } else if (
            roleUpper === "PRESUPUESTO" ||
            roleUpper === "PRESUPUESTOS" ||
            roleUpper === "PROPUESTA" ||
            roleUpper === "PROPUESTAS"
          ) {
            redirectTo = "/presupuestos";
          } else if (roleUpper === "POS" || appUser.accessPos) {
            redirectTo = "/pos";
          } else if (roleUpper === "TALLER" || appUser.accessTaller) {
            redirectTo = "/taller";
          } else if (roleUpper === "OFICINA" || appUser.accessOficina) {
            redirectTo = "/oficina";
          } else if (roleUpper === "CLIENTE") {
            redirectTo = "/cliente";
          } else {
            redirectTo = "/pos";
          }

          authenticatedUser = {
            id: appUser.id,
            email: appUser.email,
            name: appUser.name,
            role: appUser.role,
            branch:
              appUser.branch && appUser.branch.toLowerCase().includes("sucursal")
                ? "Sucursal"
                : "Principal",
            accessOficina: Boolean(appUser.accessOficina),
            accessPos: Boolean(appUser.accessPos),
            accessTaller: Boolean(appUser.accessTaller),
            isSuperAdmin: isGerente,
          };

          // Actualizar último acceso del usuario
          try {
            await prisma.appUserAccess.update({
              where: { id: appUser.id },
              data: { lastAccess: "Hoy" },
            });
          } catch {}
        }
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, error: "Credenciales incorrectas. Verifica tu correo y contraseña." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso",
      user: authenticatedUser,
      redirectTo,
    });

    response.cookies.set("auth_session", JSON.stringify(authenticatedUser), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error("Login server error:", error);
    return NextResponse.json(
      { success: false, error: "Ocurrió un error en el servidor al iniciar sesión." },
      { status: 500 }
    );
  }
}
