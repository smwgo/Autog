import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  SESSION_COOKIE_NAME,
  SESSION_SIG_COOKIE_NAME,
  signSessionCookieValue,
  createSignedSessionToken,
} from "@/lib/signed-tokens";

export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Correo electrónico inválido").max(100),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100),
  whatsapp: z.string().max(30).optional().nullable(),
  tipoFactura: z.string().max(30).optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parseResult = RegisterSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Datos inválidos en el formulario.";
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const { nombre, email, password, whatsapp, tipoFactura, direccion } = parseResult.data;

    const cleanEmail = email.trim().toLowerCase();

    // Verificar si el usuario ya existe
    const existing = await withRetry(() =>
      prisma.user.findUnique({
        where: { email: cleanEmail },
      })
    );

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Ya existe una cuenta registrada con este correo electrónico." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Crear Usuario y Cliente en Neon PostgreSQL en una sola transacción
    const result = await withRetry(() =>
      prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: nombre.trim(),
            email: cleanEmail,
            passwordHash,
            role: "CLIENT",
          },
        });

        // Asociar o crear Customer sin sobrescribir cuentas de otros correos
        const ident = whatsapp?.trim() || cleanEmail;
        const existingCustomer = await tx.customer.findUnique({
          where: { identification: ident },
        });

        if (
          existingCustomer &&
          existingCustomer.email &&
          existingCustomer.email.toLowerCase() !== cleanEmail
        ) {
          throw new Error(
            "CONFLICT_IDENT:Este número de WhatsApp o identificación ya pertenece a otra cuenta registrada."
          );
        }

        const customer = existingCustomer
          ? await tx.customer.update({
              where: { id: existingCustomer.id },
              data: {
                name: existingCustomer.name || nombre.trim(),
                phone: existingCustomer.phone && existingCustomer.phone !== "N/A"
                  ? existingCustomer.phone
                  : whatsapp?.trim() || "N/A",
                email: existingCustomer.email || cleanEmail,
                type: existingCustomer.type || (tipoFactura === "empresa" ? "Empresa" : "Personal"),
                address: existingCustomer.address || direccion?.trim() || null,
              },
            })
          : await tx.customer.create({
              data: {
                identification: ident,
                name: nombre.trim(),
                phone: whatsapp?.trim() || "N/A",
                email: cleanEmail,
                type: tipoFactura === "empresa" ? "Empresa" : "Personal",
                address: direccion?.trim() || null,
              },
            });

        return { user, customer };
      })
    );

    const sessionUser = {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      branch: "Principal",
      isSuperAdmin: false,
      accessOficina: false,
      accessPos: false,
      accessTaller: false,
    };

    const sessionJson = JSON.stringify(sessionUser);
    const sessionToken = createSignedSessionToken(sessionJson);

    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      sessionToken,
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
    if (String(error?.message || "").startsWith("CONFLICT_IDENT:")) {
      return NextResponse.json(
        { success: false, error: String(error.message).replace("CONFLICT_IDENT:", "") },
        { status: 409 }
      );
    }
    console.error("Error en registro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear la cuenta en base de datos." },
      { status: 500 }
    );
  }
}
