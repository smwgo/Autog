import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function ensureShortLinkTable() {
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "ShortLink" (
      "code" TEXT PRIMARY KEY,
      "targetPath" TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  );
}

function generateShortCode(length = 6): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : "";

    if (!rawUrl || !rawUrl.startsWith("/")) {
      return NextResponse.json(
        { success: false, error: "Ruta de destino inválida." },
        { status: 400 }
      );
    }

    return await withRetry(async () => {
      await ensureShortLinkTable();

      const existing: any[] = await prisma.$queryRawUnsafe(
        `SELECT "code" FROM "ShortLink" WHERE "targetPath" = $1 LIMIT 1`,
        rawUrl
      );

      if (existing.length > 0 && existing[0]?.code) {
        const code = String(existing[0].code);
        return NextResponse.json({
          success: true,
          code,
          shortPath: `/p/${code}`,
        });
      }

      let code = generateShortCode(6);
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash: any[] = await prisma.$queryRawUnsafe(
          `SELECT "code" FROM "ShortLink" WHERE "code" = $1 LIMIT 1`,
          code
        );
        if (clash.length === 0) break;
        code = generateShortCode(6);
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO "ShortLink" ("code", "targetPath") VALUES ($1, $2)`,
        code,
        rawUrl
      );

      return NextResponse.json({
        success: true,
        code,
        shortPath: `/p/${code}`,
      });
    });
  } catch (error: any) {
    console.error("Error al crear link corto:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "No se pudo generar el enlace corto." },
      { status: 500 }
    );
  }
}
