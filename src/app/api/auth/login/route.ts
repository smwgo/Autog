import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isProtectedAdminEmail } from "@/lib/admin-accounts";
import {
  SESSION_COOKIE_NAME,
  SESSION_SIG_COOKIE_NAME,
  signSessionCookieValue,
  createSignedSessionToken,
} from "@/lib/signed-tokens";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().min(1, "El correo es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export async function POST(req: Request) {
  try {
    const clientIp = getClientIpFromRequest(req);
    const rl = checkRateLimit("auth:login", clientIp, 15, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos de inicio de sesión. Intenta nuevamente en ${Math.ceil(rl.retryAfterSeconds / 60)} min.`,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

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

        // Comparar contraseña con pinCode (soporta hash bcrypt y migración automática de PIN legado)
        let match = false;
        let needsPinUpgrade = false;
        const storedPin = String(appUser.pinCode || "").trim();

        if (storedPin) {
          if (storedPin.startsWith("$2a$") || storedPin.startsWith("$2b$") || storedPin.startsWith("$2y$")) {
            match =
              (await bcrypt.compare(cleanPassword, storedPin)) ||
              (await bcrypt.compare(password, storedPin));
          } else if (cleanPassword === storedPin || password === storedPin) {
            match = true;
            needsPinUpgrade = true;
          }
        }

        if (match) {
          if (needsPinUpgrade) {
            try {
              const hashedPin = await bcrypt.hash(storedPin, 10);
              await prisma.appUserAccess.update({
                where: { id: appUser.id },
                data: { pinCode: hashedPin },
              });
            } catch {}
          }
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

    const nowMs = Date.now();
    const sessionPayload = {
      ...authenticatedUser,
      iat: nowMs,
      exp: nowMs + 1000 * 60 * 60 * 24 * 7,
    };
    const sessionJson = JSON.stringify(sessionPayload);
    const sessionToken = createSignedSessionToken(sessionJson);

    const response = NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso",
      user: authenticatedUser,
      sessionToken,
      redirectTo,
    });

    const forwardedProto = req.headers.get("x-forwarded-proto") || "";
    const isHttps = forwardedProto.includes("https") || req.url.startsWith("https://");
    const cookieCommon = {
      secure: isHttps,
      sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    };

    response.cookies.set(SESSION_COOKIE_NAME, sessionJson, {
      ...cookieCommon,
      httpOnly: false,
    });
    response.cookies.set(SESSION_SIG_COOKIE_NAME, signSessionCookieValue(sessionJson), {
      ...cookieCommon,
      httpOnly: true,
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
