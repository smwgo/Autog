/**
 * Generador de XML para Factura Electrónica SRI Ecuador (Esquema v1.1.0).
 * Cumple con especificaciones técnicas del SRI para comprobantes Offline.
 */

export interface ItemFacturaSri {
  codigoPrincipal?: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  precioTotalSinImpuesto: number;
  // Impuesto:
  codigoImpuesto?: string;        // "2" para IVA (default)
  codigoPorcentaje?: string;      // "4" para 15%, "2" para 12%, "0" para 0% (default: "4")
  tarifa?: number;                // 15, 12, 0 (default: 15)
  baseImponible?: number;
  valorImpuesto?: number;
}

export interface PagoFacturaSri {
  formaPago: string; // "01" Efectivo, "16" Débito, "19" Crédito, "20" Transferencia/Otros
  total: number;
  plazo?: number;
  unidadTiempo?: string; // "dias"
}

export interface EmisorSri {
  razonSocial: string;
  nombreComercial?: string;
  ruc: string;
  dirMatriz: string;
  dirEstablecimiento?: string;
  contribuyenteEspecial?: string;
  obligadoContabilidad: boolean;
  regimenTributario?: string; // "RIMPE Emprendedor", "RIMPE Negocio Popular", "General"
  ambiente: string;           // "1" (Pruebas) o "2" (Producción)
  estab: string;              // "001"
  ptoEmi: string;             // "001"
}

export interface CompradorSri {
  tipoIdentificacion: string; // "04" RUC, "05" Cédula, "06" Pasaporte, "07" Consumidor Final, "08" Exterior
  razonSocial: string;
  identificacion: string;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export interface FacturaDataSri {
  emisor: EmisorSri;
  comprador: CompradorSri;
  secuencial: string | number; // "000000001"
  claveAcceso: string;
  fechaEmision: Date | string; // Date o "DD/MM/YYYY"
  items: ItemFacturaSri[];
  pagos: PagoFacturaSri[];
  propina?: number;
  campoAdicionales?: { nombre: string; valor: string }[];
}

/**
 * Escapar caracteres especiales para XML seguro
 */
export function escapeXml(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/[\r\n\t]/g, " ")
    .trim();
}

/**
 * Mapeo de tipo de identificación para el SRI:
 * 04: RUC (13 dígitos)
 * 05: Cédula (10 dígitos)
 * 06: Pasaporte
 * 07: Consumidor Final (identificación "9999999999999")
 * 08: Identificación del exterior
 */
export function determinarTipoIdentificacion(ident: string): { tipo: string; identLimpia: string } {
  const limpia = String(ident || "").trim().replace(/\s+/g, "");
  if (!limpia || limpia === "9999999999" || limpia === "9999999999999" || limpia.toLowerCase().includes("consumidor")) {
    return { tipo: "07", identLimpia: "9999999999999" };
  }
  if (/^\d{13}$/.test(limpia)) {
    return { tipo: "04", identLimpia: limpia };
  }
  if (/^\d{10}$/.test(limpia)) {
    return { tipo: "05", identLimpia: limpia };
  }
  return { tipo: "06", identLimpia: limpia };
}

/**
 * Mapeo de método de pago a código SRI Tabla 24:
 * 01: Sin utilización del sistema financiero (Efectivo)
 * 16: Tarjeta de débito
 * 19: Tarjeta de crédito
 * 20: Otros con utilización del sistema financiero (Transferencia, Depósito, Cheque)
 */
export function determinarFormaPagoSri(metodo: string): string {
  const m = String(metodo || "").toLowerCase();
  if (m.includes("tarjeta debito") || m.includes("débito")) return "16";
  if (m.includes("tarjeta") || m.includes("credito") || m.includes("crédito")) return "19";
  if (m.includes("transferencia") || m.includes("deposito") || m.includes("depósito") || m.includes("cheque")) return "20";
  return "01"; // Efectivo por defecto
}

export function formatFechaSlash(fecha: Date | string): string {
  let d: Date;
  if (typeof fecha === "string") {
    if (fecha.includes("/")) {
      const parts = fecha.split("/");
      if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        return fecha;
      }
    }
    d = new Date(fecha);
  } else {
    d = fecha;
  }
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = String(d.getFullYear());
  return `${dia}/${mes}/${anio}`;
}

export function generarXmlFactura(data: FacturaDataSri): string {
  const { emisor, comprador, claveAcceso, items, pagos } = data;

  const fechaEmisionStr = formatFechaSlash(data.fechaEmision);
  const secuencialFormateado = String(data.secuencial).replace(/\D/g, "").padStart(9, "0");
  const estabFormateado = String(emisor.estab || "001").replace(/\D/g, "").padStart(3, "0").slice(-3);
  const ptoEmiFormateado = String(emisor.ptoEmi || "001").replace(/\D/g, "").padStart(3, "0").slice(-3);

  // Calcular totales e impuestos agrupados
  let totalSinImpuestos = 0;
  let totalDescuento = 0;
  const impuestosAgrupados: { [key: string]: { codigo: string; codigoPorcentaje: string; base: number; valor: number; tarifa: number } } = {};

  const itemsProcesados = items.map((it, idx) => {
    const cant = Number(it.cantidad || 1);
    const pUnit = Number(it.precioUnitario || 0);
    const desc = Number(it.descuento || 0);
    const subtotal = Number((cant * pUnit - desc).toFixed(2));
    const tarifa = it.tarifa !== undefined ? it.tarifa : 15;
    const codPorc = it.codigoPorcentaje || (tarifa === 15 ? "4" : tarifa === 12 ? "2" : "0");
    const codImp = it.codigoImpuesto || "2";
    const valorImp = Number((subtotal * (tarifa / 100)).toFixed(2));

    totalSinImpuestos += subtotal;
    totalDescuento += desc;

    const key = `${codImp}_${codPorc}`;
    if (!impuestosAgrupados[key]) {
      impuestosAgrupados[key] = {
        codigo: codImp,
        codigoPorcentaje: codPorc,
        base: 0,
        valor: 0,
        tarifa,
      };
    }
    impuestosAgrupados[key].base += subtotal;
    impuestosAgrupados[key].valor += valorImp;

    return {
      codigoPrincipal: it.codigoPrincipal || `ITEM-${idx + 1}`,
      codigoAuxiliar: it.codigoAuxiliar,
      descripcion: it.descripcion,
      cantidad: cant.toFixed(2),
      precioUnitario: pUnit.toFixed(2),
      descuento: desc.toFixed(2),
      precioTotalSinImpuesto: subtotal.toFixed(2),
      codigoImpuesto: codImp,
      codigoPorcentaje: codPorc,
      tarifa: tarifa.toFixed(2),
      baseImponible: subtotal.toFixed(2),
      valorImpuesto: valorImp.toFixed(2),
    };
  });

  totalSinImpuestos = Number(totalSinImpuestos.toFixed(2));
  totalDescuento = Number(totalDescuento.toFixed(2));

  let totalImpuestosSum = 0;
  for (const k in impuestosAgrupados) {
    impuestosAgrupados[k].base = Number(impuestosAgrupados[k].base.toFixed(2));
    impuestosAgrupados[k].valor = Number(impuestosAgrupados[k].valor.toFixed(2));
    totalImpuestosSum += impuestosAgrupados[k].valor;
  }
  totalImpuestosSum = Number(totalImpuestosSum.toFixed(2));

  const propina = Number((data.propina || 0).toFixed(2));
  const importeTotal = Number((totalSinImpuestos + totalImpuestosSum + propina).toFixed(2));

  // Régimen Tributario opcional en infoTributaria
  let regimenTag = "";
  if (emisor.regimenTributario?.toUpperCase().includes("RIMPE")) {
    regimenTag = `<contribuyenteRimpe>CONTRIBUYENTE RÉGIMEN RIMPE</contribuyenteRimpe>`;
  }

  // XML Construction
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<factura id="comprobante" version="1.1.0">
  <infoTributaria>
    <ambiente>${escapeXml(emisor.ambiente)}</ambiente>
    <tipoEmision>1</tipoEmision>
    <razonSocial>${escapeXml(emisor.razonSocial)}</razonSocial>
    ${emisor.nombreComercial ? `<nombreComercial>${escapeXml(emisor.nombreComercial)}</nombreComercial>` : ""}
    <ruc>${escapeXml(emisor.ruc)}</ruc>
    <claveAcceso>${escapeXml(claveAcceso)}</claveAcceso>
    <codDoc>01</codDoc>
    <estab>${estabFormateado}</estab>
    <ptoEmi>${ptoEmiFormateado}</ptoEmi>
    <secuencial>${secuencialFormateado}</secuencial>
    <dirMatriz>${escapeXml(emisor.dirMatriz)}</dirMatriz>
    ${regimenTag}
  </infoTributaria>
  <infoFactura>
    <fechaEmision>${fechaEmisionStr}</fechaEmision>
    <dirEstablecimiento>${escapeXml(emisor.dirEstablecimiento || emisor.dirMatriz)}</dirEstablecimiento>
    ${emisor.contribuyenteEspecial ? `<contribuyenteEspecial>${escapeXml(emisor.contribuyenteEspecial)}</contribuyenteEspecial>` : ""}
    <obligadoContabilidad>${emisor.obligadoContabilidad ? "SI" : "NO"}</obligadoContabilidad>
    <tipoIdentificacionComprador>${escapeXml(comprador.tipoIdentificacion)}</tipoIdentificacionComprador>
    <razonSocialComprador>${escapeXml(comprador.razonSocial)}</razonSocialComprador>
    <identificacionComprador>${escapeXml(comprador.identificacion)}</identificacionComprador>
    ${comprador.direccion ? `<direccionComprador>${escapeXml(comprador.direccion)}</direccionComprador>` : ""}
    <totalSinImpuestos>${totalSinImpuestos.toFixed(2)}</totalSinImpuestos>
    <totalDescuento>${totalDescuento.toFixed(2)}</totalDescuento>
    <totalConImpuestos>
${Object.values(impuestosAgrupados)
  .map(
    (imp) => `      <totalImpuesto>
        <codigo>${imp.codigo}</codigo>
        <codigoPorcentaje>${imp.codigoPorcentaje}</codigoPorcentaje>
        <baseImponible>${imp.base.toFixed(2)}</baseImponible>
        <valor>${imp.valor.toFixed(2)}</valor>
      </totalImpuesto>`
  )
  .join("\n")}
    </totalConImpuestos>
    <propina>${propina.toFixed(2)}</propina>
    <importeTotal>${importeTotal.toFixed(2)}</importeTotal>
    <moneda>DOLAR</moneda>
    <pagos>
${pagos
  .map(
    (p) => `      <pago>
        <formaPago>${p.formaPago}</formaPago>
        <total>${Number(p.total).toFixed(2)}</total>
        ${p.plazo ? `<plazo>${p.plazo}</plazo>` : ""}
        ${p.unidadTiempo ? `<unidadTiempo>${escapeXml(p.unidadTiempo)}</unidadTiempo>` : ""}
      </pago>`
  )
  .join("\n")}
    </pagos>
  </infoFactura>
  <detalles>
${itemsProcesados
  .map(
    (item) => `    <detalle>
      <codigoPrincipal>${escapeXml(item.codigoPrincipal)}</codigoPrincipal>
      ${item.codigoAuxiliar ? `<codigoAuxiliar>${escapeXml(item.codigoAuxiliar)}</codigoAuxiliar>` : ""}
      <descripcion>${escapeXml(item.descripcion)}</descripcion>
      <cantidad>${item.cantidad}</cantidad>
      <precioUnitario>${item.precioUnitario}</precioUnitario>
      <descuento>${item.descuento}</descuento>
      <precioTotalSinImpuesto>${item.precioTotalSinImpuesto}</precioTotalSinImpuesto>
      <impuestos>
        <impuesto>
          <codigo>${item.codigoImpuesto}</codigo>
          <codigoPorcentaje>${item.codigoPorcentaje}</codigoPorcentaje>
          <tarifa>${item.tarifa}</tarifa>
          <baseImponible>${item.baseImponible}</baseImponible>
          <valor>${item.valorImpuesto}</valor>
        </impuesto>
      </impuestos>
    </detalle>`
  )
  .join("\n")}
  </detalles>`;

  // Campos adicionales (Email, teléfono, etc.)
  const campos: { nombre: string; valor: string }[] = [];
  if (comprador.email) campos.push({ nombre: "Email", valor: comprador.email });
  if (comprador.telefono) campos.push({ nombre: "Telefono", valor: comprador.telefono });
  if (comprador.direccion) campos.push({ nombre: "Direccion", valor: comprador.direccion });
  if (data.campoAdicionales) {
    for (const ca of data.campoAdicionales) {
      if (ca.nombre && ca.valor && !campos.some((c) => c.nombre === ca.nombre)) {
        campos.push(ca);
      }
    }
  }

  if (campos.length > 0) {
    xml += `\n  <infoAdicional>
${campos.map((c) => `    <campoAdicional nombre="${escapeXml(c.nombre)}">${escapeXml(c.valor)}</campoAdicional>`).join("\n")}
  </infoAdicional>`;
  }

  xml += `\n</factura>`;

  return xml;
}

