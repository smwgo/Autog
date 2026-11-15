import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_SIG_COOKIE_NAME,
  verifySignedSessionCookie,
} from "@/lib/signed-tokens";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const sigCookie = cookieStore.get(SESSION_SIG_COOKIE_NAME)?.value;

    const parsed = verifySignedSessionCookie(sessionCookie, sigCookie);
    if (parsed && (parsed.email || parsed.id || parsed.role)) {
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
