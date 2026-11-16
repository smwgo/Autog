import { notFound, redirect } from "next/navigation";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ShortLinkRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cleanCode = String(code || "").trim();
  if (!cleanCode) {
    notFound();
  }

  let targetPath: string | null = null;
  try {
    const rows = await withRetry(async () => {
      return (await prisma.$queryRawUnsafe(
        `SELECT "targetPath" FROM "ShortLink" WHERE "code" = $1 LIMIT 1`,
        cleanCode
      )) as any[];
    });
    if (Array.isArray(rows) && rows.length > 0 && rows[0]?.targetPath) {
      targetPath = String(rows[0].targetPath);
    }
  } catch {
    targetPath = null;
  }

  if (!targetPath || !targetPath.startsWith("/")) {
    notFound();
  }

  redirect(targetPath);
}
