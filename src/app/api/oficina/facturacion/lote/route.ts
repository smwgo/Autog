import { NextResponse } from "next/server";
import { transmitirLoteAlSri, cambiarDecisionSri } from "@/lib/sri/facturaService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invoiceIds, accion = "enviar_sri", enviarCorreo = false } = body;

    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar al menos una factura para procesar." },
        { status: 400 }
      );
    }

    if (accion === "enviar_sri") {
      const res = await transmitirLoteAlSri(invoiceIds, { enviarCorreo });
      return NextResponse.json({
        accion: "enviar_sri",
        ...res,
      });
    }

    if (accion === "no_enviar") {
      const res = await cambiarDecisionSri(invoiceIds, "NO_ENVIAR");
      return NextResponse.json({
        accion: "no_enviar",
        mensaje: `${invoiceIds.length} facturas marcadas como 'No Enviar al SRI'.`,
        ...res,
      });
    }

    if (accion === "habilitar") {
      const res = await cambiarDecisionSri(invoiceIds, "HABILITAR");
      return NextResponse.json({
        accion: "habilitar",
        mensaje: `${invoiceIds.length} facturas habilitadas para envío al SRI.`,
        ...res,
      });
    }

    return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
  } catch (err: any) {
    console.error("Error en procesamiento por lote SRI:", err);
    return NextResponse.json(
      { error: err.message || "Error al procesar lote de facturas." },
      { status: 500 }
    );
  }
}
