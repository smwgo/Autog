import { NextResponse } from "next/server";
import { getVerifiedSessionFromRequest, isAdminSession } from "@/lib/signed-tokens";

export async function POST(req: Request) {
  const session = getVerifiedSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }
  if (!isAdminSession(session)) {
    return NextResponse.json({ success: false, error: "Requiere permisos de Gerencia." }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const ambiente = body.ambiente || "1";

    const host = String(ambiente) === "2" ? "cel.sri.gob.ec" : "celcer.sri.gob.ec";
    const recepcionUrl = `https://${host}/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl`;
    const autorizacionUrl = `https://${host}/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl`;

    const start = Date.now();
    const res = await fetch(recepcionUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });
    const duration = Date.now() - start;

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `El servidor del SRI respondió con código HTTP ${res.status}`,
          ambiente: String(ambiente) === "2" ? "Producción" : "Pruebas",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      ambiente: String(ambiente) === "2" ? "Producción (cel.sri.gob.ec)" : "Pruebas (celcer.sri.gob.ec)",
      status: "CONECTADO",
      latenciaMs: duration,
      recepcionUrl,
      autorizacionUrl,
      mensaje: `Conexión exitosa con los servidores oficiales del SRI (${String(ambiente) === "2" ? "Producción" : "Pruebas"}). Latencia: ${duration}ms.`,
    });
  } catch (err: any) {
    console.error("Error probando conexión con SRI:", err);
    return NextResponse.json(
      {
        success: false,
        error: `No se pudo conectar con el SRI: ${err.message}`,
      },
      { status: 500 }
    );
  }
}

