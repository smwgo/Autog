import { NextResponse } from "next/server";
import { uploadToR2, validateFileMetadata } from "@/lib/r2";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo para subir." },
        { status: 400 }
      );
    }

    const validation = validateFileMetadata(file.size, file.type);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToR2({
      buffer,
      mimeType: file.type,
      folder,
      originalName: file.name,
    });

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.publicUrl,
    });
  } catch (error: any) {
    console.error("Error al procesar subida a Cloudflare R2:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al procesar la subida del archivo.",
      },
      { status: 500 }
    );
  }
}
