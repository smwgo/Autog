/**
 * Generador de RIDE (Representación Impresa de Documento Electrónico) en formato PDF
 * según los lineamientos de diseño oficial del SRI Ecuador.
 */

import PDFDocument from "pdfkit";
// @ts-ignore
import bwipjs from "bwip-js";

export interface RideItem {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
}

export interface RideData {
  emisor: {
    razonSocial: string;
    nombreComercial?: string;
    ruc: string;
    dirMatriz: string;
    dirEstablecimiento?: string;
    obligadoContabilidad: boolean;
    regimenTributario?: string;
    logoUrl?: string;
  };
  factura: {
    numero: string; // ej: "001-001-000000001"
    claveAcceso: string;
    numeroAutorizacion?: string;
    fechaAutorizacion?: string;
    ambiente: "1" | "2" | string; // 1 = PRUEBAS, 2 = PRODUCCIÓN
    tipoEmision?: string;         // 1 = NORMAL
    fechaEmision: string;         // DD/MM/YYYY
  };
  comprador: {
    razonSocial: string;
    identificacion: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  items: RideItem[];
  totales: {
    subtotal15: number;
    subtotal0: number;
    subtotalNoObjeto?: number;
    subtotalExento?: number;
    subtotalSinImpuestos: number;
    totalDescuento: number;
    iva15: number;
    propina?: number;
    importeTotal: number;
  };
  pagos: {
    formaPago: string; // "Sin utilización del sistema financiero (Efectivo)", etc.
    total: number;
  }[];
  infoAdicional?: { nombre: string; valor: string }[];
}

export async function generarRidePdf(data: RideData): Promise<Buffer> {
  // 1. Generar código de barras de la clave de acceso
  let barcodeBuffer: Buffer | null = null;
  try {
    barcodeBuffer = await bwipjs.toBuffer({
      bcid: "code128",
      text: data.factura.claveAcceso,
      scale: 2,
      height: 9,
      includetext: false,
    });
  } catch (err) {
    console.warn("No se pudo generar código de barras:", err);
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 30,
      info: {
        Title: `RIDE Factura ${data.factura.numero}`,
        Author: data.emisor.razonSocial,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err: Error) => reject(err));

    const leftColX = 30;
    const rightColX = 310;
    const colWidth = 255;
    let y = 30;

    // --- COLUMNA IZQUIERDA: DATOS DEL EMISOR ---
    // Si hay logo o texto comercial
    if (data.emisor.nombreComercial) {
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#18181b").text(data.emisor.nombreComercial.toUpperCase(), leftColX, y, { width: colWidth });
      y = doc.y + 4;
    } else {
      doc.fontSize(13).font("Helvetica-Bold").fillColor("#18181b").text(data.emisor.razonSocial.toUpperCase(), leftColX, y, { width: colWidth });
      y = doc.y + 4;
    }

    doc.roundedRect(leftColX, y, colWidth, 160, 6).lineWidth(0.8).strokeColor("#cbd5e1").stroke();
    const boxPadX = leftColX + 8;
    let boxY = y + 8;

    doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#0f172a").text(data.emisor.razonSocial, boxPadX, boxY, { width: colWidth - 16 });
    boxY = doc.y + 4;

    doc.fontSize(7.5).font("Helvetica-Bold").text("Dirección Matriz: ", boxPadX, boxY, { continued: true })
       .font("Helvetica").text(data.emisor.dirMatriz || "N/A", { width: colWidth - 16 });
    boxY = doc.y + 3;

    doc.fontSize(7.5).font("Helvetica-Bold").text("Dirección Sucursal: ", boxPadX, boxY, { continued: true })
       .font("Helvetica").text(data.emisor.dirEstablecimiento || data.emisor.dirMatriz || "N/A", { width: colWidth - 16 });
    boxY = doc.y + 4;

    doc.fontSize(7.5).font("Helvetica-Bold").text("OBLIGADO A LLEVAR CONTABILIDAD: ", boxPadX, boxY, { continued: true })
       .font("Helvetica").text(data.emisor.obligadoContabilidad ? "SI" : "NO");
    boxY = doc.y + 4;

    if (data.emisor.regimenTributario) {
      doc.fontSize(7.5).font("Helvetica-Bold").text("Régimen Tributario: ", boxPadX, boxY, { continued: true })
         .font("Helvetica").text(data.emisor.regimenTributario);
      boxY = doc.y + 4;
    }

    // --- COLUMNA DERECHA: RECUADRO FISCAL SRI ---
    const rucY = 30;
    doc.roundedRect(rightColX, rucY, colWidth, 195, 6).lineWidth(0.8).strokeColor("#cbd5e1").stroke();
    let rY = rucY + 8;
    const rPadX = rightColX + 8;

    doc.fontSize(10).font("Helvetica-Bold").fillColor("#0f172a").text(`R.U.C.: ${data.emisor.ruc}`, rPadX, rY);
    rY = doc.y + 2;

    doc.fontSize(11).font("Helvetica-Bold").fillColor("#0f172a").text("F A C T U R A", rPadX, rY);
    rY = doc.y + 2;

    doc.fontSize(9).font("Helvetica-Bold").text(`No. ${data.factura.numero}`, rPadX, rY);
    rY = doc.y + 3;

    doc.fontSize(7.5).font("Helvetica-Bold").text("NÚMERO DE AUTORIZACIÓN:", rPadX, rY);
    rY = doc.y + 1;
    doc.fontSize(7.5).font("Helvetica").text(data.factura.numeroAutorizacion || data.factura.claveAcceso, rPadX, rY, { width: colWidth - 16 });
    rY = doc.y + 3;

    doc.fontSize(7.5).font("Helvetica-Bold").text("FECHA Y HORA DE AUTORIZACIÓN: ", rPadX, rY, { continued: true })
       .font("Helvetica").text(data.factura.fechaAutorizacion || "PENDIENTE");
    rY = doc.y + 3;

    const ambLabel = String(data.factura.ambiente) === "2" ? "PRODUCCIÓN" : "PRUEBAS";
    doc.fontSize(7.5).font("Helvetica-Bold").text("AMBIENTE: ", rPadX, rY, { continued: true })
       .font("Helvetica").text(ambLabel);
    rY = doc.y + 2;

    doc.fontSize(7.5).font("Helvetica-Bold").text("EMISIÓN: ", rPadX, rY, { continued: true })
       .font("Helvetica").text("NORMAL");
    rY = doc.y + 3;

    doc.fontSize(7.5).font("Helvetica-Bold").text("CLAVE DE ACCESO:", rPadX, rY);
    rY = doc.y + 2;

    // Código de barras
    if (barcodeBuffer) {
      try {
        doc.image(barcodeBuffer, rPadX, rY, { width: colWidth - 16, height: 26 });
        rY += 28;
      } catch (err) {
        rY += 4;
      }
    }

    doc.fontSize(7).font("Helvetica").text(data.factura.claveAcceso, rPadX, rY, { width: colWidth - 16, align: "center" });

    // --- DATOS DEL CLIENTE / RECEPTOR ---
    const clientY = Math.max(y + 165, rucY + 200);
    doc.roundedRect(leftColX, clientY, colWidth * 2 + 25, 45, 6).lineWidth(0.8).strokeColor("#cbd5e1").stroke();

    const cPadX = leftColX + 8;
    let cY = clientY + 6;

    doc.fontSize(8).font("Helvetica-Bold").text("Razón Social / Nombres: ", cPadX, cY, { continued: true })
       .font("Helvetica").text(data.comprador.razonSocial, { width: 330 });
    
    doc.fontSize(8).font("Helvetica-Bold").text("Identificación: ", 380, cY, { continued: true })
       .font("Helvetica").text(data.comprador.identificacion);

    cY += 13;
    doc.fontSize(8).font("Helvetica-Bold").text("Fecha de Emisión: ", cPadX, cY, { continued: true })
       .font("Helvetica").text(data.factura.fechaEmision);

    if (data.comprador.direccion) {
      doc.fontSize(8).font("Helvetica-Bold").text("Dirección: ", 240, cY, { continued: true })
         .font("Helvetica").text(data.comprador.direccion, { width: 290 });
    }

    // --- TABLA DE DETALLES ---
    let tableY = clientY + 54;
    const tableWidth = colWidth * 2 + 25;

    const drawTableHeader = (headerY: number) => {
      doc.rect(leftColX, headerY, tableWidth, 18).fillColor("#f1f5f9").fill();
      doc.rect(leftColX, headerY, tableWidth, 18).strokeColor("#cbd5e1").lineWidth(0.8).stroke();

      doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#0f172a");
      doc.text("Cod. Principal", leftColX + 6, headerY + 5, { width: 65 });
      doc.text("Cant.", leftColX + 75, headerY + 5, { width: 35, align: "right" });
      doc.text("Descripción", leftColX + 120, headerY + 5, { width: 230 });
      doc.text("P. Unitario", leftColX + 355, headerY + 5, { width: 55, align: "right" });
      doc.text("Descuento", leftColX + 415, headerY + 5, { width: 55, align: "right" });
      doc.text("Precio Total", leftColX + 475, headerY + 5, { width: 55, align: "right" });
      return headerY + 18;
    };

    tableY = drawTableHeader(tableY);

    // Filas con paginación automática A4 para facturas largas
    const pageBottomLimit = doc.page.height - 50;
    doc.font("Helvetica").fontSize(7.5).fillColor("#1e293b");
    for (const item of data.items) {
      const rowHeight = 16;
      if (tableY + rowHeight > pageBottomLimit) {
        doc.addPage();
        tableY = drawTableHeader(40);
        doc.font("Helvetica").fontSize(7.5).fillColor("#1e293b");
      }
      doc.rect(leftColX, tableY, tableWidth, rowHeight).strokeColor("#e2e8f0").lineWidth(0.5).stroke();

      doc.text(item.codigoPrincipal || "-", leftColX + 6, tableY + 4, { width: 65 });
      doc.text(Number(item.cantidad).toFixed(2), leftColX + 75, tableY + 4, { width: 35, align: "right" });
      doc.text(item.descripcion, leftColX + 120, tableY + 4, { width: 230 });
      doc.text(`$${Number(item.precioUnitario).toFixed(2)}`, leftColX + 355, tableY + 4, { width: 55, align: "right" });
      doc.text(`$${Number(item.descuento || 0).toFixed(2)}`, leftColX + 415, tableY + 4, { width: 55, align: "right" });
      doc.text(`$${Number(item.precioTotalSinImpuesto).toFixed(2)}`, leftColX + 475, tableY + 4, { width: 55, align: "right" });

      tableY += rowHeight;
    }

    // --- SECCIÓN INFERIOR: INFO ADICIONAL + TOTALES ---
    let bottomY = tableY + 12;
    if (bottomY + 155 > doc.page.height - 30) {
      doc.addPage();
      bottomY = 40;
    }
    const infoWidth = 270;
    const totalsWidth = 250;
    const totalsX = leftColX + tableWidth - totalsWidth;

    // Caja Info Adicional
    let infoH = 65;
    const camposExtras = [
      data.comprador.email ? { nombre: "Email", valor: data.comprador.email } : null,
      data.comprador.telefono ? { nombre: "Teléfono", valor: data.comprador.telefono } : null,
      ...(data.infoAdicional || []),
    ].filter(Boolean) as { nombre: string; valor: string }[];

    if (camposExtras.length > 2) infoH += (camposExtras.length - 2) * 12;

    doc.roundedRect(leftColX, bottomY, infoWidth, infoH, 6).lineWidth(0.8).strokeColor("#cbd5e1").stroke();
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#0f172a").text("INFORMACIÓN ADICIONAL", leftColX + 8, bottomY + 6);

    let curInfoY = bottomY + 18;
    for (const c of camposExtras) {
      doc.fontSize(7.5).font("Helvetica-Bold").text(`${c.nombre}: `, leftColX + 8, curInfoY, { continued: true })
         .font("Helvetica").text(c.valor, { width: infoWidth - 16 });
      curInfoY += 12;
    }

    // Formas de pago debajo de info adicional
    let pagosY = bottomY + infoH + 8;
    doc.roundedRect(leftColX, pagosY, infoWidth, 40, 6).lineWidth(0.8).strokeColor("#cbd5e1").stroke();
    doc.fontSize(7.5).font("Helvetica-Bold").text("Forma de Pago", leftColX + 8, pagosY + 6);
    doc.text("Total", leftColX + infoWidth - 55, pagosY + 6, { align: "right", width: 45 });

    let pRowY = pagosY + 18;
    for (const p of data.pagos) {
      doc.fontSize(7).font("Helvetica").text(p.formaPago, leftColX + 8, pRowY, { width: infoWidth - 65 });
      doc.text(`$${Number(p.total).toFixed(2)}`, leftColX + infoWidth - 55, pRowY, { align: "right", width: 45 });
      pRowY += 10;
    }

    // Caja de Totales (Derecha)
    const lineTotal = (label: string, value: number, isBold: boolean = false) => {
      doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor("#0f172a");
      doc.text(label, totalsX + 8, curTotY, { width: 140 });
      doc.text(`$${Number(value).toFixed(2)}`, totalsX + 155, curTotY, { align: "right", width: 85 });
      curTotY += 13;
    };

    let curTotY = bottomY + 6;
    doc.roundedRect(totalsX, bottomY, totalsWidth, 145, 6).lineWidth(0.8).strokeColor("#cbd5e1").stroke();

    lineTotal("SUBTOTAL 15%", data.totales.subtotal15);
    lineTotal("SUBTOTAL 0%", data.totales.subtotal0);
    lineTotal("SUBTOTAL NO OBJETO DE IVA", data.totales.subtotalNoObjeto || 0);
    lineTotal("SUBTOTAL EXENTO DE IVA", data.totales.subtotalExento || 0);
    lineTotal("SUBTOTAL SIN IMPUESTOS", data.totales.subtotalSinImpuestos);
    lineTotal("TOTAL DESCUENTO", data.totales.totalDescuento);
    lineTotal("IVA 15%", data.totales.iva15);
    lineTotal("PROPINA", data.totales.propina || 0);

    doc.moveTo(totalsX + 8, curTotY).lineTo(totalsX + totalsWidth - 8, curTotY).lineWidth(0.5).strokeColor("#94a3b8").stroke();
    curTotY += 4;
    lineTotal("VALOR TOTAL", data.totales.importeTotal, true);

    doc.end();
  });
}
