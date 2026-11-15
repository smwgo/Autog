import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_SIG_COOKIE_NAME,
  verifySignedSessionCookie,
  verifySignedSessionToken,
  createSignedSessionToken,
} from "@/lib/signed-tokens";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const sigCookie = cookieStore.get(SESSION_SIG_COOKIE_NAME)?.value;

    let parsed = verifySignedSessionCookie(sessionCookie, sigCookie);
    if (!parsed) {
      const authHeader = req.headers.get("authorization") || "";
      if (authHeader.startsWith("Bearer ")) {
        parsed = verifySignedSessionToken(authHeader.slice(7).trim());
      }
    }

    if (parsed && (parsed.email || parsed.id || parsed.role)) {
        const sessionToken = createSignedSessionToken(JSON.stringify(parsed));
        const roleUpper = (parsed.role || "").toUpperCase();
        const branchUpper = String(parsed.branch || "").toUpperCase();
        const isSucursal = branchUpper.includes("SUCURSAL");
        const branchFormatted = isSucursal ? "Sucursal" : "Principal";

        let singleWord = "Usuario";

        if (parsed.name && parsed.name.trim()) {
          singleWord = parsed.name.trim();
        } else if (roleUpper === "POS" || parsed.email?.includes("pos@")) {
          singleWord = isSucursal ? "POS 2" : "POS";
        } else if (roleUpper === "TALLER") {
          singleWord = isSucursal ? "Taller 2" : "Taller";
        } else if (roleUpper === "OFICINA") {
          singleWord = isSucursal ? "Oficina 2" : "Oficina";
        } else if (
          roleUpper === "PRESUPUESTO" ||
          roleUpper === "PRESUPUESTOS" ||
          roleUpper === "PROPUESTA" ||
          roleUpper === "PROPUESTAS"
        ) {
          singleWord = "Presupuesto";
        } else if (roleUpper === "CLIENTE") {
          singleWord = "Cliente";
        } else if (roleUpper === "ROOT" || roleUpper === "GERENCIA" || roleUpper === "ADMIN") {
          singleWord = "Admin";
        }

        return NextResponse.json({
          success: true,
          sessionToken,
          user: {
            ...parsed,
            name: singleWord,
            fullName: parsed.name || singleWord,
            branch: branchFormatted,
          },
        });
    }

    return NextResponse.json({ success: false, user: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, user: null }, { status: 200 });
  }
}
