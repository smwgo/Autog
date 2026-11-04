import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("auth_session")?.value;

    if (sessionCookie) {
      let parsed: any = null;
      try {
        parsed = JSON.parse(decodeURIComponent(sessionCookie));
      } catch {
        try {
          parsed = JSON.parse(sessionCookie);
        } catch {}
      }

      if (parsed && (parsed.email || parsed.id || parsed.role)) {
        const roleUpper = (parsed.role || "").toUpperCase();
        let singleWord = "Usuario";

        if (roleUpper === "POS" || parsed.name === "POS" || parsed.email?.includes("pos@")) {
          singleWord = "POS";
        } else if (roleUpper === "TALLER" || parsed.name === "Taller") {
          singleWord = "Taller";
        } else if (roleUpper === "OFICINA" || parsed.name === "Oficina") {
          singleWord = "Oficina";
        } else if (roleUpper === "PRESUPUESTO") {
          singleWord = "Presupuesto";
        } else if (roleUpper === "CLIENTE") {
          singleWord = "Cliente";
        } else if (parsed.name && (parsed.name.toLowerCase().includes("administrador") || parsed.name.toLowerCase().includes("admin") || roleUpper === "ROOT")) {
          singleWord = "Admin";
        } else if (parsed.name) {
          singleWord = parsed.name.trim().split(/\s+/)[0] || "Usuario";
        }

        return NextResponse.json({
          success: true,
          user: {
            ...parsed,
            name: singleWord,
            fullName: parsed.name || singleWord,
          },
        });
      }
    }

    return NextResponse.json({ success: false, user: null });
  } catch (error: any) {
    return NextResponse.json({ success: false, user: null }, { status: 200 });
  }
}
