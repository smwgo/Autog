import { NextResponse } from "next/server";
import forge from "node-forge";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { p12Base64, password } = await req.json();

    if (!p12Base64) {
      return NextResponse.json({ error: "Archivo de firma requerido" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Contraseña requerida" }, { status: 400 });
    }

    let p12Asn1: forge.asn1.Asn1;
    try {
      const p12Der = forge.util.decode64(p12Base64);
      p12Asn1 = forge.asn1.fromDer(p12Der);
    } catch {
      return NextResponse.json(
        { error: "El archivo no tiene un formato PKCS#12 válido (.p12 o .pfx)" },
        { status: 400 }
      );
    }

    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    } catch {
      return NextResponse.json(
        { error: "Contraseña incorrecta o firma dañada" },
        { status: 400 }
      );
    }

    // Extraer certificados de las bolsas (safeContents)
    let cert: forge.pki.Certificate | null = null;
    for (const safeContent of p12.safeContents) {
      for (const safeBag of safeContent.safeBags) {
        if (safeBag.cert) {
          cert = safeBag.cert;
          break;
        }
      }
      if (cert) break;
    }

    if (!cert) {
      return NextResponse.json(
        { error: "No se encontró certificado digital dentro del archivo" },
        { status: 400 }
      );
    }

    // Extraer emisor
    const issuerAttributes = cert.issuer.attributes;
    const issuerCommonName = issuerAttributes.find((attr: any) => attr.name === "commonName" || attr.shortName === "CN")?.value;
    const issuerOrg = issuerAttributes.find((attr: any) => attr.name === "organizationName" || attr.shortName === "O")?.value;
    const entidadEmisora = String(issuerOrg || issuerCommonName || "Entidad certificada");

    // Extraer vigencia
    const notAfter = cert.validity.notAfter;
    const notBefore = cert.validity.notBefore;
    const fechaExpiracion = notAfter.toISOString().split("T")[0];
    const fechaCarga = notBefore.toISOString().split("T")[0];

    // Verificar si está vigente
    const now = new Date();
    const isExpired = now.getTime() > notAfter.getTime();
    const estado = isExpired ? "Expirada" : "Activa";

    return NextResponse.json({
      success: true,
      entidadEmisora,
      fechaExpiracion,
      fechaCarga,
      estado,
      diasRestantes: Math.max(0, Math.ceil((notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
    });
  } catch (error: any) {
    console.error("Error validando firma p12:", error);
    return NextResponse.json(
      { error: error?.message || "Error al procesar la firma electrónica" },
      { status: 500 }
    );
  }
}

