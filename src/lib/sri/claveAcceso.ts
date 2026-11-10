/**
 * Generador y Validador de Clave de Acceso para Comprobantes Electrónicos SRI Ecuador (Ficha Técnica SRI).
 * 
 * Estructura de la Clave de Acceso (49 dígitos numéricos):
 * 1. Fecha de Emisión (8 dígitos): ddmmaaaa
 * 2. Tipo de Comprobante (2 dígitos): 01 = Factura, 04 = Nota de Crédito, etc.
 * 3. Número de RUC del Emisor (13 dígitos)
 * 4. Tipo de Ambiente (1 dígito): 1 = Pruebas, 2 = Producción
 * 5. Serie (6 dígitos): Establecimiento (3 dígitos) + Punto de Emisión (3 dígitos)
 * 6. Secuencial (9 dígitos): Número del comprobante rellenado con ceros a la izquierda
 * 7. Código Numérico (8 dígitos): Código aleatorio o correlativo
 * 8. Tipo de Emisión (1 dígito): 1 = Normal
 * 9. Dígito Verificador Módulo 11 (1 dígito)
 */

export function calcularDigitoModulo11(cadena48: string): number {
  if (!cadena48 || cadena48.length !== 48 || !/^\d+$/.test(cadena48)) {
    throw new Error(`La cadena para calcular el dígito verificador debe tener exactamente 48 dígitos numéricos (recibido: ${cadena48?.length || 0})`);
  }

  let factor = 2;
  let suma = 0;

  for (let i = cadena48.length - 1; i >= 0; i--) {
    suma += parseInt(cadena48.charAt(i), 10) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }

  const residuo = suma % 11;
  const dv = 11 - residuo;

  if (dv === 11) return 0;
  if (dv === 10) return 1;
  return dv;
}

export interface ClaveAccesoParams {
  fechaEmision: Date | string; // Date o "DD/MM/YYYY" o "YYYY-MM-DD"
  tipoComprobante?: string;    // "01" para Factura, "04" para Nota de Crédito (default: "01")
  ruc: string;                 // RUC de 13 dígitos
  ambiente?: string | number;  // "1" (Pruebas) o "2" (Producción) (default: "1")
  estab?: string;              // 3 dígitos, ej: "001"
  ptoEmi?: string;             // 3 dígitos, ej: "001"
  secuencial: string | number; // hasta 9 dígitos, ej: 1 -> "000000001"
  codigoNumerico?: string;     // 8 dígitos numéricos (si no se proporciona se autogenera)
  tipoEmision?: string;        // "1" para Emisión Normal (default: "1")
}

export function formatFechaSri(fecha: Date | string): string {
  let d: Date;
  if (typeof fecha === "string") {
    if (fecha.includes("/")) {
      const parts = fecha.split("/");
      if (parts[0].length === 2 && parts[2].length === 4) {
        // "DD/MM/YYYY" -> "DDMMYYYY"
        return `${parts[0]}${parts[1]}${parts[2]}`;
      }
    }
    d = new Date(fecha);
  } else {
    d = fecha;
  }

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = String(d.getFullYear());
  return `${dia}${mes}${anio}`;
}

export function generarClaveAcceso(params: ClaveAccesoParams): {
  claveAcceso: string;
  codigoNumerico: string;
  secuencialFormateado: string;
  serie: string;
} {
  const fechaStr = formatFechaSri(params.fechaEmision);
  const tipoComp = String(params.tipoComprobante || "01").padStart(2, "0");
  const rucLimpio = String(params.ruc || "").trim().replace(/\D/g, "");

  if (rucLimpio.length !== 13) {
    throw new Error(`El RUC del emisor debe tener 13 dígitos numéricos (recibido: ${rucLimpio})`);
  }

  const amb = String(params.ambiente || "1");
  const estabStr = String(params.estab || "001").trim().replace(/\D/g, "").padStart(3, "0").slice(-3);
  const ptoEmiStr = String(params.ptoEmi || "001").trim().replace(/\D/g, "").padStart(3, "0").slice(-3);
  const serie = `${estabStr}${ptoEmiStr}`;

  const secNum = parseInt(String(params.secuencial).replace(/\D/g, "") || "1", 10);
  const secuencialFormateado = String(secNum).padStart(9, "0");

  let codNum = params.codigoNumerico ? String(params.codigoNumerico).trim().replace(/\D/g, "") : "";
  if (codNum.length !== 8) {
    // Generar código numérico determinista o aleatorio de 8 dígitos
    const randomSeed = Math.floor(10000000 + Math.random() * 90000000);
    codNum = String(randomSeed).slice(0, 8);
  }

  const tipoEmi = String(params.tipoEmision || "1");

  const cadena48 = `${fechaStr}${tipoComp}${rucLimpio}${amb}${serie}${secuencialFormateado}${codNum}${tipoEmi}`;
  const digitoVerificador = calcularDigitoModulo11(cadena48);
  const claveAcceso = `${cadena48}${digitoVerificador}`;

  return {
    claveAcceso,
    codigoNumerico: codNum,
    secuencialFormateado,
    serie,
  };
}

export function validarClaveAcceso(clave: string): boolean {
  if (!clave || clave.length !== 49 || !/^\d+$/.test(clave)) return false;
  const cadena48 = clave.substring(0, 48);
  const dvEsperado = parseInt(clave.charAt(48), 10);
  return calcularDigitoModulo11(cadena48) === dvEsperado;
}

