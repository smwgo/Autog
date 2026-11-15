import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_SIG_COOKIE_NAME } from "@/lib/signed-tokens";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Sesión cerrada" });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(SESSION_SIG_COOKIE_NAME, "", {
    path: "/",
    httpOnly: true,
    maxAge: 0,
  });
  return response;
}
