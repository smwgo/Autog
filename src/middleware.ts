import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = String(token?.role || "").toUpperCase();

    // Route Protection Logic
    if (path.startsWith("/gerencia") && role !== "GERENCIA") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    
    if (path.startsWith("/oficina") && !["GERENCIA", "OFICINA"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/pos") && !["GERENCIA", "POS", "CAJA", "SUPERVISOR"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/taller") && !["GERENCIA", "TALLER", "SUPERVISOR"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    secret: process.env.NEXTAUTH_SECRET || "supersecret_fallback_key",
  }
);

export const config = {
  matcher: [
    "/portal/:path*", 
    "/gerencia/:path*", 
    "/oficina/:path*", 
    "/pos/:path*", 
    "/taller/:path*",
    "/inventario/:path*",
    "/api/protected/:path*"
  ],
};
