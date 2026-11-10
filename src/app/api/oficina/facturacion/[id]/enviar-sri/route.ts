import { NextResponse } from "next/server";
import { transmitirFacturaExistenteAlSri } from "@/lib/sri/facturaService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const enviarCorreo = Boolean(body.enviarCorreo);

    const res = await transmitirFacturaExistenteAlSri(id, { enviarCorreo });

    return NextResponse.json(res);
  } catch (err: any) {
    console.error(`Error enviando factura ${params} al SRI:`, err);
    return NextResponse.json(
      { error: err.message || "Error al transmitir factura al SRI" },
      { status: 500 }
    );
  }
}

