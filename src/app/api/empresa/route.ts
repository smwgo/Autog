import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const company = await prisma.companyConfig
      .findUnique({
        where: { id: "default" },
        select: {
          nombreComercial: true,
          razonSocial: true,
          direccion: true,
          telefono: true,
          correo: true,
        },
      })
      .catch(() => null);

    return NextResponse.json({
      success: true,
      empresa: company || {
        nombreComercial: "",
        razonSocial: "",
        direccion: "",
        telefono: "",
        correo: "",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al consultar información de empresa" },
      { status: 500 }
    );
  }
}
