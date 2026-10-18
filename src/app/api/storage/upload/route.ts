import { NextResponse } from "next/server";
import {
  uploadToR2,
  validateFileMetadata,
  getSignedUploadUrl,
  isR2Configured,
} from "@/lib/r2";

export const dynamic = "force-dynamic";

// GET: Generar Presigned URL de subida directa a Cloudflare R2
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mimeType = searchParams.get("mimeType") || "image/jpeg";
    const folder = searchParams.get("folder") || "taller";
    const fileName = searchParams.get("fileName") || "evidencia.jpg";

    if (!isR2Configured()) {
      return NextResponse.json({
        success: true,
        r2Configured: false,
        uploadUrl: null,
        key: `${folder}/${Date.now()}-${fileName}`,
        publicUrl: null,
      });
    }

    const signed = await getSignedUploadUrl({
      mimeType,
      folder,
      originalName: fileName,
    });

    return NextResponse.json({
      success: true,
      r2Configured: true,
      ...signed,
    });
  } catch (error: any) {
    console.error("Error al generar Presigned URL de R2:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al generar URL firmada." },
      { status: 500 }
    );
  }
}

// POST: Subir archivo a Cloudflare R2 (o fallback base64 seguro en entorno local sin credenciales)
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "taller";

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

    if (isR2Configured()) {
      const result = await uploadToR2({
        buffer,
        mimeType: file.type,
        folder,
        originalName: file.name,
      });

      return NextResponse.json({
        success: true,
        storage: "cloudflare-r2",
        key: result.key,
        url: result.publicUrl || `/api/storage/download?key=${encodeURIComponent(result.key)}`,
      });
    }

    // Fallback instantáneo para entorno sin variables R2 definidas
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;
    const key = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;

    return NextResponse.json({
      success: true,
      storage: "r2-compatible-inline",
      key,
      url: dataUrl,
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
