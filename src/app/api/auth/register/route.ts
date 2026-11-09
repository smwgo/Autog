import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

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

        // Crear o actualizar Customer asociado
        const ident = whatsapp?.trim() || cleanEmail;
        const customer = await tx.customer.upsert({
          where: { identification: ident },
          update: {
            name: nombre.trim(),
            phone: whatsapp?.trim() || "N/A",
            email: cleanEmail,
            type: tipoFactura === "empresa" ? "Empresa" : "Personal",
            address: direccion?.trim() || null,
          },
          create: {
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

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
    });
  } catch (error: any) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al crear la cuenta en base de datos." },
      { status: 500 }
    );
  }
}
