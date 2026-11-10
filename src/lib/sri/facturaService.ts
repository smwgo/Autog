/**
 * Servicio Centralizado de Facturación Electrónica SRI Ecuador.
 * Conecta base de datos Neon (CompanyConfig, Sale, ClientInvoice) con el motor de firma y Web Services SRI.
 * Soporta emisión inmediata, registro previo para decisión en Oficina y transmisión por lotes (Semana, Quincena, Mes).
 */

import { prisma, withRetry } from "@/lib/prisma";
import { generarClaveAcceso } from "./claveAcceso";
import {
  generarXmlFactura,
  determinarTipoIdentificacion,
  determinarFormaPagoSri,
  FacturaDataSri,
  ItemFacturaSri,
} from "./xmlFactura";
import { firmarXmlXadesBes } from "./firmaXades";
import { SriClient } from "./sriClient";
import { generarRidePdf } from "./ride";
import { enviarFacturaPorCorreo } from "./mailer";

export interface EmitirFacturaOptions {
  saleId?: string;
  orderId?: string;
  enviarCorreo?: boolean;
  enviarInmediatoSri?: boolean; // false por defecto si se decide en Oficina
}

export interface EmitirFacturaInput {
  clienteNombre: string;
  clienteIdentificacion: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  clienteDireccion?: string;
  items: {
    codigo?: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento?: number;
    tarifaIva?: number; // 15, 12, 0 (default: 15)
  }[];
  metodoPago?: string; // "Efectivo", "Tarjeta", "Transferencia", etc.
  observaciones?: string;
  vehiculoInfo?: string;
  options?: EmitirFacturaOptions;
}

export async function emitirFacturaElectronica(input: EmitirFacturaInput) {
  return await withRetry(async () => {
    // 1. Obtener configuración tributaria de la empresa
    const config = await prisma.companyConfig.findFirst({
      where: { id: "default" },
    });

    if (!config || !config.ruc) {
      throw new Error("No se ha configurado el RUC de la empresa en Gerencia > Configuración.");
    }

    const ambiente = String(config.ambienteSri || "1"); // 1 = Pruebas, 2 = Producción
    const estab = String(config.estabSecuencial || "001").padStart(3, "0");
    const ptoEmi = String(config.ptoEmiSecuencial || "001").padStart(3, "0");

    // 2. Obtener y actualizar el secuencial de factura atómicamente
    const secuencialActual = config.secuencialFactura || 1;
    const secuencialFormateado = String(secuencialActual).padStart(9, "0");
    const numeroFactura = `${estab}-${ptoEmi}-${secuencialFormateado}`;

    // Incrementar secuencial para la próxima emisión
    await prisma.companyConfig.update({
      where: { id: "default" },
      data: { secuencialFactura: secuencialActual + 1 },
    });

    // 3. Normalizar datos del comprador
    const { tipo: tipoIdent, identLimpia } = determinarTipoIdentificacion(input.clienteIdentificacion);
    const nombreComprador = input.clienteNombre.trim() || (tipoIdent === "07" ? "CONSUMIDOR FINAL" : "CLIENTE");

    // 4. Calcular Clave de Acceso (49 dígitos)
    const fechaEmision = new Date();
    const { claveAcceso } = generarClaveAcceso({
      fechaEmision,
      tipoComprobante: "01",
      ruc: config.ruc,
      ambiente,
      estab,
      ptoEmi,
      secuencial: secuencialActual,
    });

    // 5. Preparar ítems para XML y RIDE
    const itemsSri: ItemFacturaSri[] = input.items.map((it, idx) => {
      const cant = Number(it.cantidad || 1);
      const pUnit = Number(it.precioUnitario || 0);
      const desc = Number(it.descuento || 0);
      const sub = Number((cant * pUnit - desc).toFixed(2));
      const tarifa = it.tarifaIva !== undefined ? it.tarifaIva : (config.iva || 15);
      const codPorc = tarifa === 15 ? "4" : tarifa === 12 ? "2" : "0";

      return {
        codigoPrincipal: it.codigo || `ITEM-${idx + 1}`,
        descripcion: it.descripcion,
        cantidad: cant,
        precioUnitario: pUnit,
        descuento: desc,
        precioTotalSinImpuesto: sub,
        codigoImpuesto: "2",
        codigoPorcentaje: codPorc,
        tarifa,
        baseImponible: sub,
        valorImpuesto: Number((sub * (tarifa / 100)).toFixed(2)),
      };
    });

    // Totales
    let subtotal15 = 0;
    let subtotal0 = 0;
    let totalDescuento = 0;

    for (const it of itemsSri) {
      if (it.tarifa === 15) subtotal15 += it.precioTotalSinImpuesto;
      else subtotal0 += it.precioTotalSinImpuesto;
      totalDescuento += it.descuento || 0;
    }

    subtotal15 = Number(subtotal15.toFixed(2));
    subtotal0 = Number(subtotal0.toFixed(2));
    const subtotalSinImpuestos = Number((subtotal15 + subtotal0).toFixed(2));
    const iva15 = Number((subtotal15 * 0.15).toFixed(2));
    const importeTotal = Number((subtotalSinImpuestos + iva15).toFixed(2));

    const codFormaPago = determinarFormaPagoSri(input.metodoPago || "Efectivo");

    // 6. Construir XML no firmado
    const facturaDataSri: FacturaDataSri = {
      emisor: {
        razonSocial: config.razonSocial,
        nombreComercial: config.nombreComercial || undefined,
        ruc: config.ruc,
        dirMatriz: config.direccion || "Matriz",
        dirEstablecimiento: config.direccion || "Sucursal",
        obligadoContabilidad: Boolean(config.obligadoContabilidad),
        regimenTributario: config.regimenTributario || undefined,
        ambiente,
        estab,
        ptoEmi,
      },
      comprador: {
        tipoIdentificacion: tipoIdent,
        razonSocial: nombreComprador,
        identificacion: identLimpia,
        direccion: input.clienteDireccion || undefined,
        telefono: input.clienteTelefono || undefined,
        email: input.clienteEmail || undefined,
      },
      secuencial: secuencialActual,
      claveAcceso,
      fechaEmision,
      items: itemsSri,
      pagos: [
        {
          formaPago: codFormaPago,
          total: importeTotal,
        },
      ],
      campoAdicionales: [
        ...(input.vehiculoInfo ? [{ nombre: "Vehiculo", valor: input.vehiculoInfo }] : []),
        ...(input.observaciones ? [{ nombre: "Observaciones", valor: input.observaciones }] : []),
      ],
    };

    const xmlSinFirmar = generarXmlFactura(facturaDataSri);

    // 7. Decisión de envío: Inmediato vs Pendiente para Oficina
    const enviarInmediato = Boolean(input.options?.enviarInmediatoSri);
    let xmlFirmado: string | null = null;
    let estadoSri = "PENDIENTE_ENVIO";
    let mensajesSri: any[] = [];
    let numeroAutorizacion: string | null = null;
    let fechaAutorizacion: string | null = null;
    let xmlAutorizado: string | null = null;

    if (enviarInmediato) {
      if (config.firmaArchivoBase64 && config.firmaClave) {
        try {
          xmlFirmado = await firmarXmlXadesBes(xmlSinFirmar, {
            p12Base64: config.firmaArchivoBase64,
            password: config.firmaClave,
          });

          // Enviar al SRI Web Service Offline
          const sriClient = new SriClient(ambiente);
          const resultadoSri = await sriClient.procesarFacturaCompleta(xmlFirmado, claveAcceso);

          if (resultadoSri.estadoFinal === "AUTORIZADO") {
            estadoSri = "AUTORIZADO";
            numeroAutorizacion = resultadoSri.autorizacion?.numeroAutorizacion || claveAcceso;
            fechaAutorizacion = resultadoSri.autorizacion?.fechaAutorizacion || new Date().toISOString();
            xmlAutorizado = resultadoSri.autorizacion?.xmlAutorizado || xmlFirmado;
          } else if (resultadoSri.estadoFinal === "DEVUELTA") {
            estadoSri = "DEVUELTA";
            mensajesSri = resultadoSri.recepcion.mensajes;
          } else if (resultadoSri.estadoFinal === "NO AUTORIZADO") {
            estadoSri = "NO_AUTORIZADO";
            mensajesSri = resultadoSri.autorizacion?.mensajes || [];
          } else if (resultadoSri.estadoFinal === "ERROR_COMUNICACION") {
            estadoSri = "RECIBIDA";
            mensajesSri = [{ mensaje: "Enviado o en proceso de validación por SRI", tipo: "INFO" }];
          } else {
            estadoSri = "EN_PROCESO";
          }
        } catch (signErr: any) {
          console.error("Error al firmar o enviar comprobante al SRI:", signErr);
          estadoSri = "PENDIENTE";
          mensajesSri = [{ mensaje: signErr.message || "Error al firmar XML", tipo: "ERROR" }];
        }
      } else {
        estadoSri = "PENDIENTE_FIRMA";
        mensajesSri = [{ mensaje: "Firma electrónica .p12 no configurada en Gerencia", tipo: "ADVERTENCIA" }];
      }
    } else {
      // Queda guardado como PENDIENTE_ENVIO para revisión y envío por lote o individual en Oficina
      estadoSri = "PENDIENTE_ENVIO";
      mensajesSri = [{ mensaje: "Registrada desde POS. Pendiente de decisión o envío en Oficina.", tipo: "INFO" }];
    }

    // 8. Registrar en Neon (ClientInvoice)
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fechaStr = new Date().toISOString().split("T")[0];

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ClientInvoice" (
        "id", "invoiceNumber", "uuid", "claveAcceso", "date", "concept", "vehicle",
        "clientName", "clientRfc", "tipoIdentificacion", "clientEmail", "clientPhone", "clientAddress",
        "amount", "subtotal", "iva", "propina", "status", "estadoSri",
        "numeroAutorizacion", "fechaAutorizacion", "mensajesSri", "xmlFirmado", "xmlAutorizado",
        "paymentMethod", "itemsJson", "orderId", "saleId", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24,
        $25, $26, $27, $28, CURRENT_TIMESTAMP
      )`,
      invoiceId,
      numeroFactura,
      claveAcceso,
      claveAcceso,
      fechaStr,
      input.observaciones || "Factura de Venta POS",
      input.vehiculoInfo || null,
      nombreComprador,
      identLimpia,
      tipoIdent,
      input.clienteEmail || null,
      input.clienteTelefono || null,
      input.clienteDireccion || null,
      importeTotal,
      subtotalSinImpuestos,
      iva15,
      0,
      estadoSri === "AUTORIZADO" ? "Autorizado" : (estadoSri === "DEVUELTA" ? "Rechazado" : "Pendiente"),
      estadoSri,
      numeroAutorizacion,
      fechaAutorizacion,
      JSON.stringify(mensajesSri),
      xmlFirmado,
      xmlAutorizado,
      input.metodoPago || "Efectivo",
      JSON.stringify(input.items),
      input.options?.orderId || null,
      input.options?.saleId || null
    );

    return {
      success: true,
      invoiceId,
      numeroFactura,
      claveAcceso,
      estadoSri,
      numeroAutorizacion,
      fechaAutorizacion,
      mensajesSri,
      importeTotal,
    };
  });
}

/**
 * Transmite una factura ya registrada en Neon al Web Service oficial del SRI
 */
export async function transmitirFacturaExistenteAlSri(
  invoiceId: string,
  options?: { enviarCorreo?: boolean }
) {
  return await withRetry(async () => {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "ClientInvoice" WHERE "id" = $1 OR "invoiceNumber" = $1 OR "claveAcceso" = $1 LIMIT 1`,
      invoiceId
    );

    if (!rows || rows.length === 0) {
      throw new Error(`Factura con identificador ${invoiceId} no encontrada`);
    }

    const inv = rows[0];

    // Si ya está autorizada oficialmente
    if (inv.estadoSri === "AUTORIZADO") {
      return {
        success: true,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        estadoSri: "AUTORIZADO",
        numeroAutorizacion: inv.numeroAutorizacion,
        mensaje: "El comprobante ya se encuentra previamente autorizado por el SRI.",
      };
    }

    const config = await prisma.companyConfig.findFirst({ where: { id: "default" } });
    if (!config || !config.ruc) {
      throw new Error("No hay RUC configurado para la empresa en Gerencia.");
    }
    if (!config.firmaArchivoBase64 || !config.firmaClave) {
      throw new Error("Falta cargar el archivo .p12 y contraseña de firma en Gerencia > Configuración.");
    }

    const ambiente = String(config.ambienteSri || "1");
    const claveAcceso = inv.claveAcceso || inv.uuid;

    // Obtener o generar XML firmado
    let xmlFirmado = inv.xmlFirmado;

    if (!xmlFirmado) {
      let items: any[] = [];
      try {
        items = JSON.parse(inv.itemsJson || "[]");
      } catch {
        items = [];
      }

      if (items.length === 0) {
        items = [
          {
            descripcion: inv.concept || "Servicio / Venta de mostrador",
            cantidad: 1,
            precioUnitario: Number(inv.amount || 0),
            descuento: 0,
            tarifa: 15,
          },
        ];
      }

      const { tipo: tipoIdent } = determinarTipoIdentificacion(inv.clientRfc);
      const totalNum = Number(inv.amount || 0);

      const itemsSri: ItemFacturaSri[] = items.map((it: any, i: number) => {
        const cant = Number(it.quantity || it.cantidad || 1);
        const pUnit = Number(it.price || it.precioUnitario || 0);
        const desc = Number(it.discount || it.descuento || 0);
        const sub = Number((cant * pUnit - desc).toFixed(2));
        const tarifa = it.tarifaIva !== undefined ? it.tarifaIva : (it.tarifa !== undefined ? it.tarifa : 15);
        const codPorc = tarifa === 15 ? "4" : tarifa === 12 ? "2" : "0";

        return {
          codigoPrincipal: it.code || it.codigo || `ITEM-${i + 1}`,
          descripcion: it.name || it.descripcion || "Servicio",
          cantidad: cant,
          precioUnitario: pUnit,
          descuento: desc,
          precioTotalSinImpuesto: sub,
          codigoImpuesto: "2",
          codigoPorcentaje: codPorc,
          tarifa,
          baseImponible: sub,
          valorImpuesto: Number((sub * (tarifa / 100)).toFixed(2)),
        };
      });

      const xmlSinFirmar = generarXmlFactura({
        emisor: {
          razonSocial: config.razonSocial,
          nombreComercial: config.nombreComercial || undefined,
          ruc: config.ruc,
          dirMatriz: config.direccion || "Matriz",
          obligadoContabilidad: Boolean(config.obligadoContabilidad),
          regimenTributario: config.regimenTributario || undefined,
          ambiente,
          estab: config.estabSecuencial || "001",
          ptoEmi: config.ptoEmiSecuencial || "001",
        },
        comprador: {
          tipoIdentificacion: tipoIdent,
          razonSocial: inv.clientName || "CONSUMIDOR FINAL",
          identificacion: inv.clientRfc || "9999999999999",
          direccion: inv.clientAddress || undefined,
          telefono: inv.clientPhone || undefined,
          email: inv.clientEmail || undefined,
        },
        secuencial: inv.invoiceNumber.split("-")[2] || "000000001",
        claveAcceso,
        fechaEmision: inv.date || new Date(),
        items: itemsSri,
        pagos: [
          {
            formaPago: determinarFormaPagoSri(inv.paymentMethod),
            total: totalNum,
          },
        ],
      });

      xmlFirmado = await firmarXmlXadesBes(xmlSinFirmar, {
        p12Base64: config.firmaArchivoBase64,
        password: config.firmaClave,
      });
    }

    // Transmisión al Web Service del SRI
    const sriClient = new SriClient(ambiente);
    const resSri = await sriClient.procesarFacturaCompleta(xmlFirmado, claveAcceso);

    let nuevoEstadoSri = "PENDIENTE";
    let statusUi = "Pendiente";
    let numeroAutorizacion = inv.numeroAutorizacion;
    let fechaAutorizacion = inv.fechaAutorizacion;
    let xmlAutorizado = inv.xmlAutorizado;

    if (resSri.estadoFinal === "AUTORIZADO") {
      nuevoEstadoSri = "AUTORIZADO";
      statusUi = "Autorizado";
      numeroAutorizacion = resSri.autorizacion?.numeroAutorizacion || claveAcceso;
      fechaAutorizacion = resSri.autorizacion?.fechaAutorizacion || new Date().toISOString();
      xmlAutorizado = resSri.autorizacion?.xmlAutorizado || xmlFirmado;
    } else if (resSri.estadoFinal === "DEVUELTA") {
      nuevoEstadoSri = "DEVUELTA";
      statusUi = "Rechazado";
    } else if (resSri.estadoFinal === "NO AUTORIZADO") {
      nuevoEstadoSri = "NO_AUTORIZADO";
      statusUi = "Rechazado";
    } else if (resSri.estadoFinal === "ERROR_COMUNICACION") {
      nuevoEstadoSri = "RECIBIDA";
    }

    const mensajesSri = resSri.autorizacion?.mensajes || resSri.recepcion.mensajes || [];

    await prisma.$executeRawUnsafe(
      `UPDATE "ClientInvoice"
       SET "estadoSri" = $2,
           "status" = $3,
           "numeroAutorizacion" = COALESCE($4, "numeroAutorizacion"),
           "fechaAutorizacion" = COALESCE($5, "fechaAutorizacion"),
           "xmlFirmado" = COALESCE($6, "xmlFirmado"),
           "xmlAutorizado" = COALESCE($7, "xmlAutorizado"),
           "mensajesSri" = $8,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      inv.id,
      nuevoEstadoSri,
      statusUi,
      numeroAutorizacion || null,
      fechaAutorizacion || null,
      xmlFirmado || null,
      xmlAutorizado || null,
      JSON.stringify(mensajesSri)
    );

    // Si se autorizó y se solicitó enviar correo
    let correoEnviado = false;
    let correoError: string | undefined = undefined;

    if (nuevoEstadoSri === "AUTORIZADO" && options?.enviarCorreo && inv.clientEmail) {
      try {
        let itemsRide: any[] = [];
        try { itemsRide = JSON.parse(inv.itemsJson || "[]"); } catch { itemsRide = []; }
        if (itemsRide.length === 0) {
          itemsRide = [{ codigoPrincipal: "SERV", descripcion: inv.concept || "Servicio", cantidad: 1, precioUnitario: Number(inv.amount || 0), descuento: 0, precioTotalSinImpuesto: Number(inv.amount || 0) }];
        }

        const rideBuffer = await generarRidePdf({
          emisor: {
            razonSocial: config.razonSocial,
            nombreComercial: config.nombreComercial || undefined,
            ruc: config.ruc,
            dirMatriz: config.direccion || "Matriz",
            dirEstablecimiento: config.direccion || "Sucursal",
            obligadoContabilidad: Boolean(config.obligadoContabilidad),
            regimenTributario: config.regimenTributario || undefined,
          },
          factura: {
            numero: inv.invoiceNumber,
            claveAcceso,
            numeroAutorizacion: numeroAutorizacion || undefined,
            fechaAutorizacion: fechaAutorizacion || undefined,
            ambiente,
            tipoEmision: "1",
            fechaEmision: inv.date || new Date().toISOString().split("T")[0],
          },
          comprador: {
            razonSocial: inv.clientName || "Consumidor Final",
            identificacion: inv.clientRfc || "9999999999999",
            direccion: inv.clientAddress || undefined,
            telefono: inv.clientPhone || undefined,
            email: inv.clientEmail,
          },
          items: itemsRide.map((it: any) => ({
            codigoPrincipal: it.code || it.codigo || "ITM",
            descripcion: it.name || it.descripcion || "Ítem",
            cantidad: Number(it.quantity || it.cantidad || 1),
            precioUnitario: Number(it.price || it.precioUnitario || 0),
            descuento: Number(it.discount || it.descuento || 0),
            precioTotalSinImpuesto: Number(it.total || (it.price * it.quantity) || 0),
          })),
          totales: {
            subtotal15: Number(inv.subtotal || inv.amount || 0),
            subtotal0: 0,
            subtotalSinImpuestos: Number(inv.subtotal || inv.amount || 0),
            totalDescuento: 0,
            iva15: Number(inv.iva || 0),
            importeTotal: Number(inv.amount || 0),
          },
          pagos: [{ formaPago: inv.paymentMethod || "Efectivo", total: Number(inv.amount || 0) }],
        });

        const mailRes = await enviarFacturaPorCorreo({
          to: inv.clientEmail,
          clienteNombre: inv.clientName || "Cliente",
          numeroFactura: inv.invoiceNumber,
          claveAcceso,
          fechaEmision: inv.date || new Date().toISOString().split("T")[0],
          total: Number(inv.amount || 0),
          pdfBuffer: rideBuffer,
          xmlContent: xmlAutorizado || xmlFirmado,
          empresaNombre: config.nombreComercial || config.razonSocial,
        });

        if (mailRes.success) {
          correoEnviado = true;
          await prisma.$executeRawUnsafe(
            `UPDATE "ClientInvoice" SET "correoEnviado" = true, "fechaEnvioCorreo" = CURRENT_TIMESTAMP WHERE "id" = $1`,
            inv.id
          );
        } else {
          correoError = mailRes.error;
        }
      } catch (mErr: any) {
        correoError = mErr.message;
      }
    }

    return {
      success: nuevoEstadoSri === "AUTORIZADO",
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      estadoSri: nuevoEstadoSri,
      numeroAutorizacion,
      mensajes: mensajesSri,
      correoEnviado,
      correoError,
    };
  });
}

/**
 * Transmite un lote de facturas seleccionadas o agrupadas por periodo al SRI
 */
export async function transmitirLoteAlSri(
  invoiceIds: string[],
  options?: { enviarCorreo?: boolean }
) {
  const resultados: any[] = [];
  let autorizados = 0;
  let devueltos = 0;
  let errores = 0;

  for (const id of invoiceIds) {
    try {
      const res = await transmitirFacturaExistenteAlSri(id, options);
      if (res.estadoSri === "AUTORIZADO") {
        autorizados++;
      } else if (res.estadoSri === "DEVUELTA" || res.estadoSri === "NO_AUTORIZADO") {
        devueltos++;
      }
      resultados.push(res);
    } catch (err: any) {
      errores++;
      resultados.push({
        success: false,
        invoiceId: id,
        estadoSri: "ERROR",
        error: err.message,
      });
    }
    // Breve intervalo para evitar saturación de conexiones SOAP
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return {
    total: invoiceIds.length,
    autorizados,
    devueltos,
    errores,
    resultados,
  };
}

/**
 * Modifica la decisión tributaria de un grupo de facturas (No Enviar vs Habilitar)
 */
export async function cambiarDecisionSri(
  invoiceIds: string[],
  accion: "NO_ENVIAR" | "HABILITAR"
) {
  const nuevoEstado = accion === "NO_ENVIAR" ? "NO_ENVIAR" : "PENDIENTE_ENVIO";
  const nuevoStatus = accion === "NO_ENVIAR" ? "Excluido" : "Pendiente";

  await prisma.$executeRawUnsafe(
    `UPDATE "ClientInvoice"
     SET "estadoSri" = $2,
         "status" = $3,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = ANY($1::text[])`,
    invoiceIds,
    nuevoEstado,
    nuevoStatus
  );

  return { success: true, actualizados: invoiceIds.length };
}
