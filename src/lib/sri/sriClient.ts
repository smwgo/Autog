/**
 * Cliente SOAP para Web Services Offline del SRI Ecuador.
 * Permite enviar comprobantes firmados y consultar el estado de autorización oficial.
 * 
 * Endpoints:
 * Ambiente 1 (Pruebas):
 * - Recepción: https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline
 * - Autorización: https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline
 * 
 * Ambiente 2 (Producción):
 * - Recepción: https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline
 * - Autorización: https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline
 */

export interface SriMensaje {
  identificador?: string;
  mensaje: string;
  informacionAdicional?: string;
  tipo?: string; // "ERROR" | "ADVERTENCIA" | "INFORMACION"
}

export interface SriRecepcionResult {
  success: boolean;
  estado: "RECIBIDA" | "DEVUELTA" | "ERROR_COMUNICACION";
  mensajes: SriMensaje[];
  rawResponse?: string;
}

export interface SriAutorizacionResult {
  success: boolean;
  estado: "AUTORIZADO" | "NO AUTORIZADO" | "EN PROCESO" | "NO ENCONTRADO" | "ERROR_COMUNICACION";
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  xmlAutorizado?: string;
  mensajes: SriMensaje[];
  rawResponse?: string;
}

export class SriClient {
  private recepcionUrl: string;
  private autorizacionUrl: string;

  constructor(ambiente: "1" | "2" | string = "1") {
    const isProduccion = String(ambiente) === "2";
    const host = isProduccion ? "cel.sri.gob.ec" : "celcer.sri.gob.ec";

    this.recepcionUrl = `https://${host}/comprobantes-electronicos-ws/RecepcionComprobantesOffline`;
    this.autorizacionUrl = `https://${host}/comprobantes-electronicos-ws/AutorizacionComprobantesOffline`;
  }

  /**
   * Extrae mensajes del XML de respuesta del SRI
   */
  private parseMensajes(xml: string): SriMensaje[] {
    const mensajes: SriMensaje[] = [];
    const mensajeRegex = /<mensaje>([\s\S]*?)<\/mensaje>/g;
    let match;

    while ((match = mensajeRegex.exec(xml)) !== null) {
      const block = match[1];
      const idMatch = block.match(/<identificador>([\s\S]*?)<\/identificador>/);
      const msgMatch = block.match(/<mensaje>([\s\S]*?)<\/mensaje>/);
      const infoMatch = block.match(/<informacionAdicional>([\s\S]*?)<\/informacionAdicional>/);
      const tipoMatch = block.match(/<tipo>([\s\S]*?)<\/tipo>/);

      mensajes.push({
        identificador: idMatch ? idMatch[1].trim() : undefined,
        mensaje: msgMatch ? msgMatch[1].trim() : "Mensaje del SRI",
        informacionAdicional: infoMatch ? infoMatch[1].trim() : undefined,
        tipo: tipoMatch ? tipoMatch[1].trim() : "ERROR",
      });
    }

    return mensajes;
  }

  /**
   * Envía un comprobante XML firmado al Web Service de Recepción del SRI
   */
  async enviarComprobante(xmlFirmado: string, timeoutMs: number = 15000): Promise<SriRecepcionResult> {
    const xmlBase64 = Buffer.from(xmlFirmado, "utf8").toString("base64");

    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:validarComprobante>
      <xml>${xmlBase64}</xml>
    </ec:validarComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const response = await fetch(this.recepcionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          "SOAPAction": "",
        },
        body: soapEnvelope,
        signal: AbortSignal.timeout(timeoutMs),
      });

      const rawResponse = await response.text();

      // Parsear respuesta
      const estadoMatch = rawResponse.match(/<estado>([A-Z_]+)<\/estado>/i);
      const estado = (estadoMatch ? estadoMatch[1].toUpperCase() : "DEVUELTA") as "RECIBIDA" | "DEVUELTA";
      const mensajes = this.parseMensajes(rawResponse);

      return {
        success: estado === "RECIBIDA",
        estado,
        mensajes,
        rawResponse,
      };
    } catch (err: any) {
      console.error("Error al comunicar con RecepcionComprobantes SRI:", err);
      return {
        success: false,
        estado: "ERROR_COMUNICACION",
        mensajes: [{ mensaje: `Fallo de conexión con SRI Recepción: ${err.message}`, tipo: "ERROR" }],
      };
    }
  }

  /**
   * Consulta el estado de autorización de un comprobante por su Clave de Acceso (49 dígitos)
   */
  async consultarAutorizacion(claveAcceso: string, timeoutMs: number = 15000): Promise<SriAutorizacionResult> {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soapenv:Header/>
  <soapenv:Body>
    <ec:autorizacionComprobante>
      <claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>
    </ec:autorizacionComprobante>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const response = await fetch(this.autorizacionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          "SOAPAction": "",
        },
        body: soapEnvelope,
        signal: AbortSignal.timeout(timeoutMs),
      });

      const rawResponse = await response.text();

      const estadoMatch = rawResponse.match(/<estado>([A-Z_ ]+)<\/estado>/i);
      const estadoRaw = estadoMatch ? estadoMatch[1].toUpperCase().trim() : "NO ENCONTRADO";

      let estado: "AUTORIZADO" | "NO AUTORIZADO" | "EN PROCESO" | "NO ENCONTRADO" = "NO ENCONTRADO";
      if (estadoRaw.includes("AUTORIZADO") && !estadoRaw.includes("NO")) {
        estado = "AUTORIZADO";
      } else if (estadoRaw.includes("NO AUTORIZADO")) {
        estado = "NO AUTORIZADO";
      } else if (estadoRaw.includes("PROCESO")) {
        estado = "EN PROCESO";
      }

      const numAutMatch = rawResponse.match(/<numeroAutorizacion>([0-9]+)<\/numeroAutorizacion>/i);
      const fechaAutMatch = rawResponse.match(/<fechaAutorizacion>([^<]+)<\/fechaAutorizacion>/i);
      const comprobanteMatch = rawResponse.match(/<comprobante>([\s\S]*?)<\/comprobante>/i);

      let xmlAutorizado: string | undefined = undefined;
      if (comprobanteMatch) {
        let content = comprobanteMatch[1].trim();
        // Quitar CDATA si existe
        if (content.startsWith("<![CDATA[") && content.endsWith("]]>")) {
          content = content.substring(9, content.length - 3).trim();
        }
        xmlAutorizado = content;
      }

      const mensajes = this.parseMensajes(rawResponse);

      return {
        success: estado === "AUTORIZADO",
        estado,
        numeroAutorizacion: numAutMatch ? numAutMatch[1].trim() : undefined,
        fechaAutorizacion: fechaAutMatch ? fechaAutMatch[1].trim() : undefined,
        xmlAutorizado,
        mensajes,
        rawResponse,
      };
    } catch (err: any) {
      console.error("Error al comunicar con AutorizacionComprobantes SRI:", err);
      return {
        success: false,
        estado: "ERROR_COMUNICACION",
        mensajes: [{ mensaje: `Fallo de conexión con SRI Autorización: ${err.message}`, tipo: "ERROR" }],
      };
    }
  }

  /**
   * Flujo completo: Envía a recepción y espera/consulta la autorización
   */
  async procesarFacturaCompleta(
    xmlFirmado: string,
    claveAcceso: string,
    maxIntentosAutorizacion: number = 4,
    intervaloMs: number = 2000
  ): Promise<{
    recepcion: SriRecepcionResult;
    autorizacion?: SriAutorizacionResult;
    estadoFinal: "AUTORIZADO" | "DEVUELTA" | "NO AUTORIZADO" | "EN PROCESO" | "ERROR_COMUNICACION";
  }> {
    // 1. Enviar comprobante
    const recepcion = await this.enviarComprobante(xmlFirmado);

    if (!recepcion.success && recepcion.estado !== "RECIBIDA") {
      // Verificar si ya fue autorizado previamente (ej: clave repetida)
      const errorExiste = recepcion.mensajes.some((m) =>
        m.mensaje?.toLowerCase().includes("clave de acceso registrada") ||
        m.informacionAdicional?.toLowerCase().includes("clave de acceso registrada")
      );

      if (!errorExiste) {
        return {
          recepcion,
          estadoFinal: recepcion.estado === "ERROR_COMUNICACION" ? "ERROR_COMUNICACION" : "DEVUELTA",
        };
      }
    }

    // 2. Esperar e intentar consultar la autorización
    let autorizacion: SriAutorizacionResult | undefined = undefined;

    for (let i = 0; i < maxIntentosAutorizacion; i++) {
      await new Promise((resolve) => setTimeout(resolve, intervaloMs));
      autorizacion = await this.consultarAutorizacion(claveAcceso);

      if (autorizacion.estado === "AUTORIZADO" || autorizacion.estado === "NO AUTORIZADO") {
        break;
      }
    }

    const estadoFinal = autorizacion?.estado === "AUTORIZADO"
      ? "AUTORIZADO"
      : autorizacion?.estado === "NO AUTORIZADO"
      ? "NO AUTORIZADO"
      : "EN PROCESO";

    return {
      recepcion,
      autorizacion,
      estadoFinal,
    };
  }
}

