/**
 * Firmador Digital XAdES-BES Enveloped para Comprobantes Electrónicos SRI Ecuador.
 * Utiliza certificados digitales PKCS#12 (.p12 / .pfx) emitidos por entidades certificadoras
 * ecuatorianas autorizadas (Security Data, BCE, ANF, UANATACA, Consejo de la Judicatura, etc.).
 * 
 * Cumple con la especificación técnica del SRI:
 * - Algoritmo de Digest: SHA-1
 * - Algoritmo de Firma: RSA-SHA1 (http://www.w3.org/2000/09/xmldsig#rsa-sha1)
 * - Canonicalización: C14N (http://www.w3.org/TR/2001/REC-xml-c14n-20010315)
 * - Estándar: XAdES-BES enveloped (http://uri.etsi.org/01903/v1.3.2#)
 */

import forge from "node-forge";

export interface FirmaP12Credentials {
  p12Base64: string;
  password: string;
}

export interface CertificadoInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
}

/**
 * Extraer clave privada y certificado X.509 de un archivo .p12 base64
 */
export function extraerCredencialesP12(credentials: FirmaP12Credentials): {
  key: forge.pki.rsa.PrivateKey;
  cert: forge.pki.Certificate;
  certB64: string;
  info: CertificadoInfo;
} {
  const p12Der = forge.util.decode64(credentials.p12Base64);
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, credentials.password);

  let cert: forge.pki.Certificate | null = null;
  let key: forge.pki.rsa.PrivateKey | null = null;

  for (const safeContent of p12.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      if (safeBag.cert && !cert) {
        cert = safeBag.cert;
      }
      if (safeBag.key && !key) {
        key = safeBag.key as forge.pki.rsa.PrivateKey;
      }
    }
  }

  if (!cert) {
    throw new Error("No se encontró ningún certificado X.509 en el archivo de firma (.p12)");
  }
  if (!key) {
    throw new Error("No se encontró la clave privada RSA en el archivo de firma (.p12)");
  }

  const certAsn1 = forge.pki.certificateToAsn1(cert);
  const certDer = forge.asn1.toDer(certAsn1).getBytes();
  const certB64 = forge.util.encode64(certDer);

  const issuerAttrs = cert.issuer.attributes;
  const issuerParts = issuerAttrs
    .map((a: any) => `${a.shortName || a.name}=${a.value}`)
    .reverse()
    .join(",");

  const subjectAttrs = cert.subject.attributes;
  const subjectParts = subjectAttrs
    .map((a: any) => `${a.shortName || a.name}=${a.value}`)
    .reverse()
    .join(",");

  // Convertir número de serie a formato decimal
  let serialDec = cert.serialNumber;
  if (/^[0-9a-fA-F]+$/.test(serialDec)) {
    try {
      const bn = new forge.jsbn.BigInteger(serialDec, 16);
      serialDec = bn.toString(10);
    } catch {
      // conservar el valor actual si falla
    }
  }

  return {
    key,
    cert,
    certB64,
    info: {
      subject: subjectParts,
      issuer: issuerParts,
      serialNumber: serialDec,
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
    },
  };
}

/**
 * Calcula el hash SHA-1 en Base64 de una cadena de texto
 */
function sha1B64(text: string): string {
  const md = forge.md.sha1.create();
  md.update(text, "utf8");
  return forge.util.encode64(md.digest().getBytes());
}

/**
 * Canonicalización XML C14N básica para nodos independientes
 */
function canonicalizeAttributes(attrStr: string, inheritedNamespaces: Record<string, string> = {}): string {
  const nsAttrs: Record<string, string> = { ...inheritedNamespaces };
  const regularAttrs: Record<string, string> = {};
  const attrRegex = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrStr)) !== null) {
    const name = match[1];
    const value = match[2] !== undefined ? match[2] : (match[3] || "");
    if (name === "xmlns" || name.startsWith("xmlns:")) {
      nsAttrs[name] = value;
    } else {
      regularAttrs[name] = value;
    }
  }

  const orderedNs = Object.keys(nsAttrs).sort((a, b) => {
    if (a === "xmlns") return -1;
    if (b === "xmlns") return 1;
    return a.localeCompare(b);
  });
  const orderedRegular = Object.keys(regularAttrs).sort((a, b) => a.localeCompare(b));

  const rendered = [
    ...orderedNs.map((k) => `${k}="${nsAttrs[k]}"`),
    ...orderedRegular.map((k) => `${k}="${regularAttrs[k]}"`),
  ];
  return rendered.length > 0 ? " " + rendered.join(" ") : "";
}

/**
 * Canonicalización W3C XML C14N 1.0 (REC-xml-c14n-20010315):
 * - Elimina declaración <?xml ...?>
 * - Normaliza saltos de línea a \n
 * - Expande etiquetas auto-cerradas <tag .../> a <tag ...></tag>
 * - Ordena declaraciones de namespace (xmlns primero) y atributos alfabéticamente
 * - Propaga namespaces heredados del ancestro (ej. ds/etsi desde ds:Signature) al subárbol raíz
 */
function c14n(xml: string, inheritedNamespaces: Record<string, string> = {}): string {
  let clean = xml
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // Expandir self-closing tags a apertura+cierre
  clean = clean.replace(/<([A-Za-z_][\w:.-]*)(\s[^>]*?)?\/>/g, (_m, tag, attrs) => {
    const normalizedAttrs = attrs ? canonicalizeAttributes(attrs) : "";
    return `<${tag}${normalizedAttrs}></${tag}>`;
  });

  // Ordenar atributos e inyectar namespaces heredados únicamente en el elemento raíz del fragmento
  let isRoot = true;
  clean = clean.replace(/<([A-Za-z_][\w:.-]*)(\s[^>]*?)?>/g, (full, tag, attrs) => {
    if (isRoot) {
      isRoot = false;
      const normalized = canonicalizeAttributes(attrs || "", inheritedNamespaces);
      return `<${tag}${normalized}>`;
    }
    if (!attrs) return `<${tag}>`;
    return `<${tag}${canonicalizeAttributes(attrs)}>`;
  });

  return clean;
}

/**
 * Formatea una fecha a ISO 8601 con zona horaria de Ecuador (-05:00)
 */
function getSigningTimeIso(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}T${h}:${min}:${s}-05:00`;
}

/**
 * Firma un XML comprobante del SRI con estándar XAdES-BES Enveloped
 */
export async function firmarXmlXadesBes(
  xmlSinFirmar: string,
  credentials: FirmaP12Credentials
): Promise<string> {
  const { key, cert, certB64, info } = extraerCredencialesP12(credentials);

  // Verificar fecha de expiración
  const now = new Date();
  if (now > info.validTo) {
    throw new Error(`El certificado digital de firma expiró el ${info.validTo.toLocaleDateString("es-EC")}`);
  }

  // Identificadores únicos para la estructura de firma
  const rnd = () => Math.floor(100000 + Math.random() * 900000);
  const signatureId = `Signature${rnd()}-${rnd()}`;
  const signedInfoId = `Signature-SignedInfo${rnd()}-${rnd()}`;
  const signedPropertiesId = `SignedProperties${rnd()}-${rnd()}`;
  const certificateId = `Certificate${rnd()}-${rnd()}`;
  const referenceComprobanteId = `Reference-ID-${rnd()}`;
  const signatureValueId = `SignatureValue${rnd()}-${rnd()}`;
  const objectId = `${signatureId}-Object${rnd()}`;

  const SIG_NS = {
    "xmlns:ds": "http://www.w3.org/2000/09/xmldsig#",
    "xmlns:etsi": "http://uri.etsi.org/01903/v1.3.2#",
  };

  // 1. Obtener Digest del comprobante principal (#comprobante) canonicalizado
  const comprobanteClean = c14n(xmlSinFirmar);
  const digestComprobante = sha1B64(comprobanteClean);

  // 2. Obtener Digest del Certificado X509
  const certDerBytes = forge.util.decode64(certB64);
  const certMd = forge.md.sha1.create();
  certMd.update(certDerBytes);
  const digestCertificado = forge.util.encode64(certMd.digest().getBytes());

  // 3. Preparar Modulus y Exponent del Certificado RSA
  const nBytes = key.n.toByteArray();
  // Quitar byte inicial de signo 0x00 si existe
  const nBuffer = Buffer.from(nBytes);
  const modulusClean = (nBuffer[0] === 0 ? nBuffer.subarray(1) : nBuffer).toString("base64");
  const exponenteB64 = Buffer.from(key.e.toByteArray()).toString("base64");

  // 4. Construir KeyInfo
  const keyInfoXml = `<ds:KeyInfo Id="${certificateId}">
<ds:X509Data>
<ds:X509Certificate>
${certB64}
</ds:X509Certificate>
</ds:X509Data>
<ds:KeyValue>
<ds:RSAKeyValue>
<ds:Modulus>
${modulusClean}
</ds:Modulus>
<ds:Exponent>${exponenteB64}</ds:Exponent>
</ds:RSAKeyValue>
</ds:KeyValue>
</ds:KeyInfo>`;

  const digestKeyInfo = sha1B64(c14n(keyInfoXml, SIG_NS));

  // 5. Construir SignedProperties (XAdES-BES)
  const signingTime = getSigningTimeIso();
  const signedPropertiesXml = `<etsi:SignedProperties Id="${signedPropertiesId}"><etsi:SignedSignatureProperties><etsi:SigningTime>${signingTime}</etsi:SigningTime><etsi:SigningCertificate><etsi:Cert><etsi:CertDigest><ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod><ds:DigestValue>${digestCertificado}</ds:DigestValue></etsi:CertDigest><etsi:IssuerSerial><ds:X509IssuerName>${info.issuer}</ds:X509IssuerName><ds:X509SerialNumber>${info.serialNumber}</ds:X509SerialNumber></etsi:IssuerSerial></etsi:Cert></etsi:SigningCertificate></etsi:SignedSignatureProperties><etsi:SignedDataObjectProperties><etsi:DataObjectFormat ObjectReference="#${referenceComprobanteId}"><etsi:Description>contenido comprobante</etsi:Description><etsi:MimeType>text/xml</etsi:MimeType></etsi:DataObjectFormat></etsi:SignedDataObjectProperties></etsi:SignedProperties>`;

  const digestSignedProperties = sha1B64(c14n(signedPropertiesXml, SIG_NS));

  // 6. Construir SignedInfo
  const signedInfoXml = `<ds:SignedInfo Id="${signedInfoId}">
<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></ds:CanonicalizationMethod>
<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></ds:SignatureMethod>
<ds:Reference Id="SignedPropertiesID-${rnd()}" Type="http://uri.etsi.org/01903#SignedProperties" URI="#${signedPropertiesId}">
<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>
<ds:DigestValue>${digestSignedProperties}</ds:DigestValue>
</ds:Reference>
<ds:Reference URI="#${certificateId}">
<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>
<ds:DigestValue>${digestKeyInfo}</ds:DigestValue>
</ds:Reference>
<ds:Reference Id="${referenceComprobanteId}" URI="#comprobante">
<ds:Transforms>
<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></ds:Transform>
</ds:Transforms>
<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>
<ds:DigestValue>${digestComprobante}</ds:DigestValue>
</ds:Reference>
</ds:SignedInfo>`;

  // 7. Firmar SignedInfo con la Clave Privada RSA-SHA1 (incluyendo namespaces C14N heredados)
  const signedInfoC14n = c14n(signedInfoXml, SIG_NS);
  const md = forge.md.sha1.create();
  md.update(signedInfoC14n, "utf8");
  const rawSignature = key.sign(md);
  const signatureValueB64 = forge.util.encode64(rawSignature);

  // 8. Construir el bloque final de ds:Signature
  const signatureBlock = `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" Id="${signatureId}">
${signedInfoXml}
<ds:SignatureValue Id="${signatureValueId}">
${signatureValueB64}
</ds:SignatureValue>
${keyInfoXml}
<ds:Object Id="${objectId}">
<etsi:QualifyingProperties Target="#${signatureId}">
${signedPropertiesXml}
</etsi:QualifyingProperties>
</ds:Object>
</ds:Signature>`;

  // 9. Inyectar ds:Signature dentro del documento comprobante antes de la etiqueta de cierre </factura>
  const closingTagMatch = xmlSinFirmar.match(/<\/(factura|notaCredito|notaDebito|comprobanteRetencion|guiaRemision)>/i);
  if (!closingTagMatch) {
    throw new Error("El XML no contiene una etiqueta de cierre de comprobante válida (</factura>)");
  }

  const closingTag = closingTagMatch[0];
  const signedXml = xmlSinFirmar.replace(closingTag, `\n${signatureBlock}\n${closingTag}`);

  return signedXml;
}

