import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
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

    console.log(`[LOGIN ATTEMPT] Email: '${cleanEmail}'`);

    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { email: cleanEmail },
      })
    );

    console.log(`[LOGIN USER LOOKUP] Found user:`, user ? { id: user.id, email: user.email, role: user.role, hasHash: !!user.passwordHash } : null);

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Credenciales incorrectas. Verifica tu correo y contraseña." },
        { status: 401 }
      );
    }

    const match = (await bcrypt.compare(cleanPassword, user.passwordHash)) || (await bcrypt.compare(password, user.passwordHash));
    console.log(`[LOGIN BCRYPT MATCH]:`, match);

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Credenciales incorrectas. Verifica tu correo y contraseña." },
        { status: 401 }
      );
    }

    const isSuperAdmin = user.role === "ROOT";
    const redirectTo = isSuperAdmin ? "/gerencia" : "/cliente";

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperAdmin,
    };

    const response = NextResponse.json({
      success: true,
      message: "Inicio de sesión exitoso",
      user: userData,
      redirectTo,
    });

    response.cookies.set("auth_session", JSON.stringify(userData), {
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
