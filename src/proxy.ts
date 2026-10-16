import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract client IP honoring Cloudflare WAF and Vercel reverse proxy
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";

  // Clone request headers and inject resolved client IP for backend audit logging
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-client-ip", clientIp);

  // Protected API routes check (e.g. /api/privado/*)
  if (pathname.startsWith("/api/privado/")) {
    const sessionToken =
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value ||
      request.cookies.get("auth-token")?.value ||
      request.headers.get("authorization");

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado. Sesión inválida o expirada.",
        },
        { status: 401 }
      );
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
