import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_SIG_COOKIE_NAME,
  verifySignedSessionCookie,
  verifySignedSessionToken,
  isStaffSession,
  isAdminSession,
} from "@/lib/signed-tokens";

function isPublicApiRequest(pathname: string, method: string): boolean {
  if (
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/register" ||
    pathname === "/api/auth/me" ||
    pathname === "/api/presupuestos/whatsapp-catalogo" ||
    pathname === "/api/taller/operacion"
  ) {
    return true;
  }
  if (pathname === "/api/storage/download" && method === "GET") return true;
  if (pathname === "/api/servicios-taller" && method === "GET") return true;
  if (pathname === "/api/productos" && method === "GET") return true;
  if (pathname === "/api/empresa" && method === "GET") return true;
  if (pathname === "/api/solicitudes" && method === "POST") return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // Extract client IP honoring Cloudflare WAF and Vercel reverse proxy
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  // Clone request headers and inject resolved client IP for backend audit logging
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-client-ip", clientIp);

  // Si el cliente envía Authorization: Bearer (respaldo para iframes/webviews sin cookies),
  // propagarlo también como cookie firmada interna para handlers que usan getVerifiedSessionFromRequest/cookies()
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const bearerToken = authHeader.slice(7).trim();
      const bearerSession = verifySignedSessionToken(bearerToken);
      if (bearerSession) {
        const dotIdx = bearerToken.indexOf(".");
        const encodedJson = dotIdx > 0 ? bearerToken.slice(0, dotIdx).trim() : "";
        const bearerSig = dotIdx > 0 ? bearerToken.slice(dotIdx + 1).trim() : "";
        if (encodedJson && bearerSig) {
          try {
            const rawJson = Buffer.from(encodedJson, "base64url").toString("utf8");
            const existingCookie = requestHeaders.get("cookie") || "";
            const injected = `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawJson)}; ${SESSION_SIG_COOKIE_NAME}=${bearerSig}`;
            requestHeaders.set(
              "cookie",
              existingCookie ? `${existingCookie}; ${injected}` : injected
            );
          } catch {}
        }
      }
    }
  }

  // Centralized verification for internal & privileged API routes
  if (pathname.startsWith("/api/") && !isPublicApiRequest(pathname, method)) {
    const rawSession = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const sigCookie = request.cookies.get(SESSION_SIG_COOKIE_NAME)?.value;
    let session = verifySignedSessionCookie(rawSession, sigCookie);

    if (!session) {
      const authHeader = request.headers.get("authorization") || "";
      if (authHeader.startsWith("Bearer ")) {
        session = verifySignedSessionToken(authHeader.slice(7).trim());
      }
    }

    if (!session) {
      const reason = !rawSession
        ? "missing_session"
        : !sigCookie
          ? "missing_sig"
          : "invalid_sig";
      console.warn(`[proxy 401] ${method} ${pathname} -> ${reason}`);
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado. Sesión inválida o expirada.",
          reason,
        },
        { status: 401 }
      );
    }

    if (pathname.startsWith("/api/gerencia/")) {
      if (!isAdminSession(session)) {
        return NextResponse.json(
          {
            success: false,
            error: "Acceso denegado. Requiere permisos de Gerencia.",
          },
          { status: 403 }
        );
      }
    } else if (
      !pathname.startsWith("/api/cliente/") &&
      pathname !== "/api/vehiculos" &&
      pathname !== "/api/realtime/events"
    ) {
      if (!isStaffSession(session)) {
        return NextResponse.json(
          {
            success: false,
            error: "Acceso denegado. Requiere permisos de personal autorizado.",
          },
          { status: 403 }
        );
      }
    }
  }

  // Allow iframe embedding for IDE webviews and dev tools
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
