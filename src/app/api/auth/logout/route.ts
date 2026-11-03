import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Sesión cerrada" });
  response.cookies.set("auth_session", "", {
    path: "/",
    maxAge: 0,
  });
  return response;
}
