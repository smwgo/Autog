export type SriDocumentType = "FACTURA" | "NOTA_CREDITO" | "NOTA_DEBITO" | "RETENCION" | "GUIA_REMISION";

export type SriStatus = "PENDING" | "PROCESSING" | "SENT" | "AUTHORIZED" | "REJECTED" | "ERROR";

export interface SriDocumentPayload {
  type: SriDocumentType;
  accessKey: string;
  xmlData: string;
  location: "PRINCIPAL" | "SUCURSAL";
  userId: string;
}

export interface SriResponse {
  success: boolean;
  status: SriStatus;
  authDate?: Date;
  responseCode?: string;
  errorMessage?: string;
  rideUrl?: string; // If generated
}

export interface SriConfig {
  environment: "TEST" | "PRODUCTION";
  autoRetry: boolean;
  maxRetries: number;
  batchProcessing: boolean;
}
