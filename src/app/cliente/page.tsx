"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

// ============================================================================
// TIPOS E INTERFACES DEL PANEL DEL CLIENTE
// ============================================================================
interface VehicleHealth {
  nextOilChangeKm: number;
  kmUntilOil: number;
  oilPercent: number;
  frenos: string;
  neumaticos: string;
  bateria: string;
  suspension: string;
  lastServiceDate: string;
  statusText: string;
  activeOrder?: any | null;
}

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year?: number;
  mileage?: number;
  color?: string;
  fuelType?: string;
  health?: VehicleHealth;
}

interface ChecklistItem {
  id: string;
  name: string;
  completed: boolean;
  status: string;
  price?: number;
}

interface ChatMessage {
  id: string;
  author: string;
  role: string;
  text?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

interface ActiveOrder {
  id: string;
  orderNumber: string;
  plate: string;
  vehicle: string;
  client: string;
  mechanic: string;
  status: string;
  statusColor?: string;
  progress: number;
  checklistProgress: number;
  mileage?: number;
  fuelLevel?: string;
  generalCondition?: string;
  totalCost: number;
  paidAmount?: number;
  hasPriceAuthorized: boolean;
  trackingPin: string;
  dateIn: string;
  estimatedOut: string;
  checklistItems: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  findings?: any[];
  evidencePhotos?: any[];
  receptionPhotos?: any[];
  internalChat: ChatMessage[];
  deliverySignatureUrl?: string;
  deliverySignedBy?: string;
  deliverySignedAt?: string;
  deliveryStatus?: string;
  technicalReportUrl?: string;
}

interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
  total: number;
  category?: string;
  code?: string;
}

interface Invoice {
  id: string;
  number: string;
  source: string;
  date: string;
  total: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  status: string;
  paymentMethod: string;
  paymentStatus?: "Pagado" | "Abono parcial / Saldo pendiente" | "Por confirmar en caja" | string;
  paidAmount?: number;
  pendingBalance?: number;
  vehicle?: string;
  plate?: string;
  concept?: string;
  itemsCount: number;
  items?: InvoiceItem[];
}

interface QuoteItem {
  name: string;
  qty: number;
  price: number;
  total: number;
  category?: string;
  code?: string;
}

interface Quote {
  id: string;
  quoteNumber: string;
  date: string;
  vehicle: string;
  plate?: string;
  status: string;
  subtotal: number;
  total: number;
  notes?: string;
  items: QuoteItem[];
}

interface CreditAccount {
  id: string;
  customerName: string;
  identification: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  dueDate: string;
  status: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  notes?: string;
}

interface ClinicalHistoryVisit {
  id: string;
  orderNumber: string;
  plate: string;
  vehicle: string;
  date: string;
  mileage?: number;
  mechanic?: string;
  cost: number;
  status?: string;
  services?: string[];
  findings?: any[];
  beforePhotos?: any[];
  afterPhotos?: any[];
  technicalReportUrl?: string | null;
  deliverySignatureUrl?: string | null;
  notes?: string;
}

interface CustomerProfile {
  id: string;
  name: string;
  identification: string;
  phone: string;
  email: string;
  address: string;
  type: string;
  vip: boolean;
}

// 6 etapas del proceso en taller (estilo moderno con colores)
const ETAPAS_PROCESO_DETALLADAS = [
  { id: "01", key: "pendiente", label: "Pendiente", color: "rose", desc: "Recepción y registro" },
  { id: "02", key: "diagnostico", label: "En Diagnóstico", color: "blue", desc: "Inspección técnica inicial" },
  { id: "03", key: "repuestos", label: "Esperando Repuestos", color: "amber", desc: "Suministro de partes" },
  { id: "04", key: "aprobacion", label: "Esperando Aprobación", color: "purple", desc: "Cotización enviada al cliente" },
  { id: "05", key: "reparacion", label: "En Reparación", color: "cyan", desc: "Trabajos en pista y banco" },
  { id: "06", key: "completado", label: "Completado / Listo", color: "emerald", desc: "Listo para entrega y retiro" },
];

function getEtapaDetalladaIndex(status: string): number {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("entregad") || s.includes("cerrad") || s.includes("listo") || s.includes("terminad")) return 5;
  if (s.includes("repar") || s.includes("proceso") || s.includes("pista") || s.includes("trabajo")) return 4;
  if (s.includes("aprob") || s.includes("presupuesto") || s.includes("cotiz")) return 3;
  if (s.includes("repuesto") || s.includes("pieza") || s.includes("pedid")) return 2;
  if (s.includes("diagn") || s.includes("inspecc") || s.includes("evalu")) return 1;
  return 0; // Pendiente
}

export default function ClientePanel() {

  const [cargando, setCargando] = useState(true);
  const [cliente, setCliente] = useState<CustomerProfile | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehicle[]>([]);
  const [vehiculoSeleccionadoPlaca, setVehiculoSeleccionadoPlaca] = useState<string | null>(null);

  const [ordenActiva, setOrdenActiva] = useState<ActiveOrder | null>(null);
  const [todasLasOrdenes, setTodasLasOrdenes] = useState<ActiveOrder[]>([]);
  const [facturas, setFacturas] = useState<Invoice[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Quote[]>([]);
  const [creditos, setCreditos] = useState<CreditAccount | null>(null);
  const [historialClinico, setHistorialClinico] = useState<ClinicalHistoryVisit[]>([]);
  const [clientesDisponibles, setClientesDisponibles] = useState<any[]>([]);
  const [mostrarSelectorCliente, setMostrarSelectorCliente] = useState(false);
  const [filtroBusquedaCliente, setFiltroBusquedaCliente] = useState("");

  // Modales y estados de interactividad
  const [facturaExpandidaId, setFacturaExpandidaId] = useState<string | null>(null);
  const [aprobandoCotizacionId, setAprobandoCotizacionId] = useState<string | null>(null);
  const [modalTicketDigital, setModalTicketDigital] = useState<Invoice | null>(null);
  const [modalAbonarCredito, setModalAbonarCredito] = useState(false);
  const [modalVoyEnCamino, setModalVoyEnCamino] = useState(false);
  const [modalSolicitarServicio, setModalSolicitarServicio] = useState(false);
  const [modalNuevoVehiculo, setModalNuevoVehiculo] = useState(false);
  const [modalFirma, setModalFirma] = useState(false);
  const [fotoAmpliadaUrl, setFotoAmpliadaUrl] = useState<string | null>(null);
  const [toastMensaje, setToastMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [filtroOrigenFactura, setFiltroOrigenFactura] = useState<"todos" | "pos" | "taller" | "online">("todos");

  // Estado del modal "Voy en camino"
  const [etaMinutos, setEtaMinutos] = useState<number>(15);
  const [notaCamino, setNotaCamino] = useState("");
  const [enviandoCamino, setEnviandoCamino] = useState(false);

  // Estado del modal "Solicitar servicio"
  const [tipoServicioDeseado, setTipoServicioDeseado] = useState("Mantenimiento Preventivo");
  const [notaServicioDeseado, setNotaServicioDeseado] = useState("");

  // Formulario de Nuevo Vehículo
  const [nuevaPlaca, setNuevaPlaca] = useState("");
  const [nuevaMarca, setNuevaMarca] = useState("");
  const [nuevoModelo, setNuevoModelo] = useState("");
  const [nuevoAnio, setNuevoAnio] = useState(String(new Date().getFullYear()));
  const [nuevoKm, setNuevoKm] = useState("");
  const [nuevoCombustible, setNuevoCombustible] = useState("Gasolina");
  const [guardandoVehiculo, setGuardandoVehiculo] = useState(false);

  // Estado del chat con taller
  const [nuevoMensajeTexto, setNuevoMensajeTexto] = useState("");
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);
  const [adjuntoUrl, setAdjuntoUrl] = useState<string | null>(null);
  const [adjuntoNombre, setAdjuntoNombre] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Canvas de Firma Digital
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tieneFirmaTrazada, setTieneFirmaTrazada] = useState(false);
  const [guardandoFirma, setGuardandoFirma] = useState(false);

  // Cargar datos unificados del cliente desde Neon
  const cargarDashboard = async (clienteIdDoc?: string) => {
    try {
      setCargando(true);
      const url = clienteIdDoc
        ? `/api/cliente/dashboard?identificacion=${encodeURIComponent(clienteIdDoc)}`
        : `/api/cliente/dashboard`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setCliente(data.customer || null);
        const vehs: Vehicle[] = data.vehicles || [];
        setVehiculos(vehs);
        setOrdenActiva(data.activeOrder || null);
        setTodasLasOrdenes(data.allOrders || []);
        setFacturas(data.invoices || []);
        setCotizaciones(data.quotes || []);
        setCreditos(data.credits || null);
        setHistorialClinico(data.history || []);
        setClientesDisponibles(data.availableCustomers || []);

        if (data.activeOrder?.plate) {
          setVehiculoSeleccionadoPlaca(data.activeOrder.plate.trim().toUpperCase());
        } else if (vehs.length > 0 && !vehiculoSeleccionadoPlaca) {
          setVehiculoSeleccionadoPlaca(vehs[0].plate.trim().toUpperCase());
        }
      }
    } catch (err) {
      console.error("Error al cargar dashboard de cliente:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  // Objeto del vehículo actualmente seleccionado
  const vehiculoActivo = useMemo(() => {
    if (!vehiculoSeleccionadoPlaca) return vehiculos[0] || null;
    return (
      vehiculos.find(
        (v) => v.plate.trim().toUpperCase() === vehiculoSeleccionadoPlaca.trim().toUpperCase()
      ) || vehiculos[0] || null
    );
  }, [vehiculos, vehiculoSeleccionadoPlaca]);

  // Orden activa filtrada para el vehículo seleccionado
  const ordenActivaVehiculo = useMemo(() => {
    if (!vehiculoSeleccionadoPlaca) return ordenActiva;
    const match = todasLasOrdenes.find(
      (o) =>
        o.plate.trim().toUpperCase() === vehiculoSeleccionadoPlaca.trim().toUpperCase() &&
        !o.status.toLowerCase().includes("entregad") &&
        !o.status.toLowerCase().includes("cerrad")
    );
    return match || (ordenActiva?.plate.trim().toUpperCase() === vehiculoSeleccionadoPlaca.trim().toUpperCase() ? ordenActiva : null);
  }, [vehiculoSeleccionadoPlaca, ordenActiva, todasLasOrdenes]);

  // Facturas filtradas para el vehículo seleccionado y filtro de origen (POS, Taller, Tienda Online)
  const facturasFiltradas = useMemo(() => {
    let list = facturas;
    if (vehiculoSeleccionadoPlaca) {
      const pl = vehiculoSeleccionadoPlaca.trim().toUpperCase();
      list = list.filter(
        (f) =>
          (!f.vehicle && !f.plate) ||
          (f.vehicle && f.vehicle.toUpperCase().includes(pl)) ||
          (f.plate && f.plate.toUpperCase().includes(pl))
      );
    }
    if (filtroOrigenFactura !== "todos") {
      if (filtroOrigenFactura === "pos") {
        list = list.filter((f) => f.source.toLowerCase().includes("pos") || f.source.toLowerCase().includes("mostrador"));
      } else if (filtroOrigenFactura === "taller") {
        list = list.filter((f) => f.source.toLowerCase().includes("taller") || f.source.toLowerCase().includes("ot"));
      } else if (filtroOrigenFactura === "online") {
        list = list.filter((f) => f.source.toLowerCase().includes("online") || f.source.toLowerCase().includes("tienda"));
      }
    }
    return list;
  }, [facturas, vehiculoSeleccionadoPlaca, filtroOrigenFactura]);

  // Cotizaciones filtradas
  const cotizacionesFiltradas = useMemo(() => {
    if (!vehiculoSeleccionadoPlaca) return cotizaciones;
    return cotizaciones.filter(
      (q) =>
        !q.plate ||
        q.plate.trim().toUpperCase() === vehiculoSeleccionadoPlaca.trim().toUpperCase()
    );
  }, [cotizaciones, vehiculoSeleccionadoPlaca]);

  // Cotizaciones pendientes de aprobación
  const cotizacionesPendientes = useMemo(() => {
    return cotizacionesFiltradas.filter(
      (q) => q.status.toLowerCase() === "pendiente" || q.status.toLowerCase() === "borrador"
    );
  }, [cotizacionesFiltradas]);

  // Historial clínico filtrado para el vehículo seleccionado
  const historialFiltrado = useMemo(() => {
    if (!vehiculoSeleccionadoPlaca) return historialClinico;
    return historialClinico.filter(
      (h) => h.plate.trim().toUpperCase() === vehiculoSeleccionadoPlaca.trim().toUpperCase()
    );
  }, [historialClinico, vehiculoSeleccionadoPlaca]);

  // Aprobar Cotización / Presupuesto en 1 toque en tiempo real
  const handleAprobarCotizacion = async (quote: Quote) => {
    try {
      setAprobandoCotizacionId(quote.id);
      const res = await fetch("/api/cliente/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APROBAR_COTIZACION",
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          orderId: ordenActivaVehiculo?.id || ordenActiva?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCotizaciones((prev) =>
          prev.map((q) => (q.id === quote.id ? { ...q, status: "Aprobada" } : q))
        );
        setToastMensaje({
          tipo: "success",
          texto: `¡Presupuesto ${quote.quoteNumber} autorizado con éxito! La oficina y el taller han recibido la confirmación y comenzarán los trabajos inmediatamente.`,
        });
        setTimeout(() => setToastMensaje(null), 6000);
        if (cliente?.identification) {
          cargarDashboard(cliente.identification);
        }
      } else {
        setToastMensaje({
          tipo: "error",
          texto: data.error || "No se pudo autorizar el presupuesto.",
        });
      }
    } catch (err) {
      console.error("Error al aprobar cotización:", err);
      setToastMensaje({
        tipo: "error",
        texto: "Error de conexión al aprobar presupuesto.",
      });
    } finally {
      setAprobandoCotizacionId(null);
    }
  };

  // Notificar llegada al taller ("¡Voy en camino!")
  const handleNotificarVoyEnCamino = async () => {
    try {
      setEnviandoCamino(true);
      const res = await fetch("/api/cliente/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VOY_EN_CAMINO",
          etaMinutos,
          vehiclePlate: vehiculoSeleccionadoPlaca || ordenActivaVehiculo?.plate,
          orderId: ordenActivaVehiculo?.id || ordenActiva?.id,
          nota: notaCamino,
          author: cliente?.name || "Cliente",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setModalVoyEnCamino(false);
        setNotaCamino("");
        setToastMensaje({
          tipo: "success",
          texto: data.message || `🚗 ¡Aviso enviado! El equipo del taller sabe que llegas en ${etaMinutos} min.`,
        });
        setTimeout(() => setToastMensaje(null), 6000);
        if (cliente?.identification) {
          cargarDashboard(cliente.identification);
        }
      } else {
        setToastMensaje({
          tipo: "error",
          texto: data.error || "No se pudo enviar el aviso al taller.",
        });
      }
    } catch (err) {
      console.error("Error al notificar llegada:", err);
      setToastMensaje({
        tipo: "error",
        texto: "Error de red al notificar llegada.",
      });
    } finally {
      setEnviandoCamino(false);
    }
  };

  // Generar y descargar Factura / Comprobante en PDF imprimible
  const descargarFacturaPdf = (factura: Invoice) => {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Por favor permite ventanas emergentes para generar la Factura en PDF.");
      return;
    }

    const fechaFormateada = new Date(factura.date).toLocaleDateString("es-EC", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const isPOS = factura.source.includes("POS") || factura.source.includes("Mostrador");
    const isOnline = factura.source.includes("Online") || factura.source.includes("Tienda");
    const tipoDoc = isPOS ? "COMPROBANTE DE VENTA POS" : isOnline ? "COMPROBANTE PEDIDO ONLINE" : "FACTURA DE SERVICIO DE TALLER";

    const itemsHtml =
      factura.items && factura.items.length > 0
        ? factura.items
            .map(
              (it, idx) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 8px;text-align:center;font-weight:600;color:#334155;">${it.qty}</td>
          <td style="padding:10px 8px;font-family:monospace;font-size:11px;color:#64748b;">${it.code || `ITM-${idx + 1}`}</td>
          <td style="padding:10px 8px;color:#0f172a;">
            <strong>${it.name}</strong>
            ${it.category ? `<span style="display:inline-block;margin-left:6px;padding:2px 6px;border-radius:4px;font-size:10px;background:#f1f5f9;color:#475569;">${it.category}</span>` : ""}
          </td>
          <td style="padding:10px 8px;text-align:right;font-family:monospace;color:#334155;">$${Number(it.price).toFixed(2)}</td>
          <td style="padding:10px 8px;text-align:right;font-family:monospace;font-weight:700;color:#0f172a;">$${Number(it.total).toFixed(2)}</td>
        </tr>
      `
            )
            .join("")
        : `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:10px 8px;text-align:center;font-weight:600;">1</td>
          <td style="padding:10px 8px;font-family:monospace;font-size:11px;color:#64748b;">SRV-GEN</td>
          <td style="padding:10px 8px;color:#0f172a;"><strong>${factura.concept || "Servicio técnico y consumibles de garaje"}</strong></td>
          <td style="padding:10px 8px;text-align:right;font-family:monospace;">$${Number(factura.total).toFixed(2)}</td>
          <td style="padding:10px 8px;text-align:right;font-family:monospace;font-weight:700;">$${Number(factura.total).toFixed(2)}</td>
        </tr>
      `;

    const subtotal = Number(factura.subtotal || factura.total / 1.15).toFixed(2);
    const iva = Number(factura.tax || factura.total - factura.total / 1.15).toFixed(2);
    const total = Number(factura.total).toFixed(2);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
      `AUTOG|${factura.number}|${cliente?.identification || "0923849120"}|${total}|${factura.date}`
    )}`;

    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Factura ${factura.number} - AutoG</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; background: #f8fafc; }
          .invoice-box { max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; }
          .logo-text { font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
          .logo-text span { color: #2563eb; }
          .company-info { font-size: 12px; color: #64748b; line-height: 1.4; margin-top: 4px; }
          .doc-info { text-align: right; }
          .doc-title { font-size: 14px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
          .doc-number { font-size: 20px; font-weight: 900; font-family: monospace; color: #2563eb; margin: 4px 0; }
          .doc-date { font-size: 12px; color: #64748b; }
          .badge-status { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 6px; }
          .badge-pagado { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
          .badge-pendiente { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
          .badge-caja { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
          .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 12px; }
          .grid-info strong { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; padding: 10px 8px; text-align: left; }
          .totals-wrap { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
          .qr-box { display: flex; align-items: center; gap: 14px; }
          .qr-box img { width: 100px; height: 100px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; }
          .qr-text { font-size: 11px; color: #64748b; max-width: 220px; line-height: 1.4; }
          .totals-table { width: 280px; font-size: 13px; }
          .totals-table div { display: flex; justify-content: space-between; padding: 4px 0; }
          .total-final { font-size: 18px; font-weight: 900; color: #0f172a; border-top: 2px solid #2563eb; padding-top: 8px; margin-top: 6px; }
          .footer-note { margin-top: 32px; padding-top: 16px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 11px; color: #94a3b8; }
          .no-print { margin-bottom: 16px; text-align: right; }
          .btn-print { background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; }
          .btn-print:hover { background: #1d4ed8; }
          @media print {
            body { background: #fff; padding: 0; }
            .invoice-box { border: none; box-shadow: none; padding: 0; max-width: 100%; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
        </div>

        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="logo-text">Auto<span>G</span></div>
              <div class="company-info">
                <strong>AUTOG SISTEMA AUTOMOTRIZ & POS</strong><br/>
                RUC: 0992384912001 • Matriz Guayaquil<br/>
                Av. Principal y Palmeras 450 • Tel: +593 99 876 5432<br/>
                Email: facturacion@autog.com • www.autog.com
              </div>
            </div>
            <div class="doc-info">
              <div class="doc-title">${tipoDoc}</div>
              <div class="doc-number">${factura.number}</div>
              <div class="doc-date">Fecha: ${fechaFormateada}</div>
              <div class="badge-status ${
                (factura.paymentStatus || "").includes("Pagado")
                  ? "badge-pagado"
                  : (factura.paymentStatus || "").includes("Abono")
                  ? "badge-pendiente"
                  : "badge-caja"
              }">
                ● ${factura.paymentStatus || "Pagado"}
              </div>
            </div>
          </div>

          <div class="grid-info">
            <div>
              <strong>DATOS DEL CLIENTE</strong><br/>
              Nombre: <strong>${cliente?.name || "Juan Pérez González"}</strong><br/>
              Cédula / RUC: ${cliente?.identification || "0923849120"}<br/>
              Teléfono: ${cliente?.phone || "+593 99 876 5432"}<br/>
              Dirección: ${cliente?.address || "Guayaquil, Ecuador"}
            </div>
            <div>
              <strong>DATOS DE LA COMPRA / SERVICIO</strong><br/>
              Origen: <strong>${factura.source}</strong><br/>
              Método de Pago: <strong>${factura.paymentMethod}</strong><br/>
              ${factura.vehicle ? `Vehículo: <strong>${factura.vehicle}</strong><br/>` : ""}
              ${factura.plate ? `Placa: <strong>${factura.plate}</strong><br/>` : ""}
              Estado SRI: Autorizado Electrónicamente
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:50px;text-align:center;">Cant.</th>
                <th style="width:100px;">Código</th>
                <th>Descripción / Repuesto / Mano de Obra</th>
                <th style="width:100px;text-align:right;">P. Unit</th>
                <th style="width:110px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals-wrap">
            <div class="qr-box">
              <img src="${qrUrl}" alt="QR Fiscal SRI" />
              <div class="qr-text">
                <strong>Verificación Digital SRI</strong><br/>
                Comprobante electrónico emitido con validez tributaria. Escanee para autenticar.
              </div>
            </div>

            <div class="totals-table">
              <div>
                <span>Subtotal (15%):</span>
                <span style="font-family:monospace;">$${subtotal}</span>
              </div>
              <div>
                <span>IVA 15%:</span>
                <span style="font-family:monospace;">$${iva}</span>
              </div>
              <div class="total-final">
                <span>TOTAL FACTURADO:</span>
                <span style="color:#059669;font-family:monospace;">$${total}</span>
              </div>
              ${
                factura.pendingBalance && factura.pendingBalance > 0
                  ? `
              <div style="font-size:12px;color:#d97706;margin-top:6px;font-weight:700;">
                <span>Saldo Pendiente:</span>
                <span style="font-family:monospace;">$${Number(factura.pendingBalance).toFixed(2)}</span>
              </div>`
                  : ""
              }
            </div>
          </div>

          <div class="footer-note">
            AutoG Taller & Repuestos Especializados • Garantía asegurada de repuestos y mano de obra.
          </div>
        </div>

        <script>
          setTimeout(() => { window.print(); }, 400);
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  // Generar y descargar Cotización en PDF
  const descargarCotizacionPdf = (quote: Quote) => {
    const win = window.open("", "_blank");
    if (!win) {
      alert("Por favor permite ventanas emergentes para ver el Presupuesto en PDF.");
      return;
    }

    const itemsHtml = quote.items
      .map(
        (it) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 8px;text-align:center;font-weight:600;color:#334155;">${it.qty}</td>
        <td style="padding:10px 8px;color:#0f172a;">
          <strong>${it.name}</strong>
          ${it.category ? `<span style="display:inline-block;margin-left:6px;padding:2px 6px;border-radius:4px;font-size:10px;background:#f1f5f9;color:#475569;">${it.category}</span>` : ""}
        </td>
        <td style="padding:10px 8px;text-align:right;font-family:monospace;color:#334155;">$${Number(it.price).toFixed(2)}</td>
        <td style="padding:10px 8px;text-align:right;font-family:monospace;font-weight:700;color:#0f172a;">$${Number(it.total || it.price * it.qty).toFixed(2)}</td>
      </tr>
    `
      )
      .join("");

    const subtotal = Number(quote.subtotal || quote.total / 1.15).toFixed(2);
    const iva = (quote.total - Number(subtotal)).toFixed(2);
    const total = Number(quote.total).toFixed(2);

    win.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Presupuesto ${quote.quoteNumber} - AutoG</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 24px; background: #f8fafc; }
          .quote-box { max-width: 800px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 24px; }
          .logo-text { font-size: 26px; font-weight: 900; color: #0f172a; }
          .logo-text span { color: #f59e0b; }
          .doc-info { text-align: right; }
          .doc-title { font-size: 14px; font-weight: 800; color: #1e293b; text-transform: uppercase; }
          .doc-number { font-size: 20px; font-weight: 900; font-family: monospace; color: #d97706; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          th { background: #f8fafc; color: #475569; text-transform: uppercase; font-size: 11px; font-weight: 700; padding: 10px 8px; text-align: left; }
          .total-box { margin-left: auto; width: 280px; font-size: 13px; }
          .total-box div { display: flex; justify-content: space-between; padding: 4px 0; }
          .total-final { font-size: 18px; font-weight: 900; color: #0f172a; border-top: 2px solid #f59e0b; padding-top: 8px; margin-top: 6px; }
          .no-print { margin-bottom: 16px; text-align: right; }
          .btn-print { background: #d97706; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; }
          @media print { body { background: #fff; padding: 0; } .quote-box { border: none; } .no-print { display: none !important; } }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Imprimir Presupuesto / PDF</button>
        </div>
        <div class="quote-box">
          <div class="header">
            <div>
              <div class="logo-text">Auto<span>G</span> Presupuestos</div>
              <div style="font-size:12px;color:#64748b;margin-top:4px;">Taller Mecánico & Repuestos Autorizados</div>
            </div>
            <div class="doc-info">
              <div class="doc-title">Cotización Oficial de Taller</div>
              <div class="doc-number">${quote.quoteNumber}</div>
              <div style="font-size:12px;color:#64748b;">Fecha: ${quote.date}</div>
            </div>
          </div>
          <div style="margin-bottom:20px;padding:12px;background:#fefce8;border:1px solid #fef08a;border-radius:10px;font-size:12px;">
            <strong>Vehículo:</strong> ${quote.vehicle} ${quote.plate ? `(Placa: ${quote.plate})` : ""}<br/>
            <strong>Observaciones Técnicas:</strong> ${quote.notes || "Inspección técnica general."}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:50px;text-align:center;">Cant.</th>
                <th>Repuesto / Servicio</th>
                <th style="width:100px;text-align:right;">P. Unit</th>
                <th style="width:110px;text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="total-box">
            <div><span>Subtotal:</span><span style="font-family:monospace;">$${subtotal}</span></div>
            <div><span>IVA 15%:</span><span style="font-family:monospace;">$${iva}</span></div>
            <div class="total-final"><span>Total Estimado:</span><span style="color:#b45309;font-family:monospace;">$${total}</span></div>
          </div>
        </div>
        <script>setTimeout(() => { window.print(); }, 400);</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  // Subir adjunto para el chat del taller
  const handleSubirAdjuntoR2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSubiendoAdjunto(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "chat-cliente");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setAdjuntoUrl(data.url);
        setAdjuntoNombre(file.name);
      } else {
        alert("No se pudo subir el archivo adjunto.");
      }
    } catch (err) {
      console.error("Error al subir archivo a R2:", err);
      alert("Error de conexión al subir archivo.");
    } finally {
      setSubiendoAdjunto(false);
    }
  };

  // Enviar mensaje al taller
  const handleEnviarMensaje = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ordenDestino = ordenActivaVehiculo || ordenActiva;
    if (!ordenDestino) return;
    if (!nuevoMensajeTexto.trim() && !adjuntoUrl) return;

    try {
      setEnviandoMensaje(true);
      const res = await fetch("/api/cliente/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ENVIAR_MENSAJE_CHAT",
          orderId: ordenDestino.id,
          author: cliente?.name || ordenDestino.client || "Cliente",
          text: nuevoMensajeTexto.trim(),
          attachmentUrl: adjuntoUrl,
          attachmentName: adjuntoNombre,
        }),
      });

      const data = await res.json();
      if (data.success && data.chat) {
        setOrdenActiva((prev) => (prev ? { ...prev, internalChat: data.chat } : null));
        setNuevoMensajeTexto("");
        setAdjuntoUrl(null);
        setAdjuntoNombre(null);
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    } finally {
      setEnviandoMensaje(false);
    }
  };

  // Guardar nuevo vehículo en Neon DB
  const handleGuardarNuevoVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente || !nuevaPlaca.trim()) return;

    try {
      setGuardandoVehiculo(true);
      const res = await fetch("/api/cliente/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REGISTRAR_VEHICULO",
          customerId: cliente.id,
          plate: nuevaPlaca.trim().toUpperCase(),
          brand: nuevaMarca.trim() || "Vehículo",
          model: nuevoModelo.trim() || "General",
          year: nuevoAnio ? parseInt(nuevoAnio, 10) : new Date().getFullYear(),
          mileage: nuevoKm ? parseInt(nuevoKm, 10) : 0,
          fuelType: nuevoCombustible,
        }),
      });

      const data = await res.json();
      if (data.success && data.vehicle) {
        setModalNuevoVehiculo(false);
        setNuevaPlaca("");
        setNuevaMarca("");
        setNuevoModelo("");
        setNuevoKm("");
        await cargarDashboard(cliente.identification);
        setVehiculoSeleccionadoPlaca(data.vehicle.plate);
        setToastMensaje({
          tipo: "success",
          texto: data.message || `Vehículo ${data.vehicle.plate} guardado con éxito.`,
        });
        setTimeout(() => setToastMensaje(null), 5000);
      } else {
        alert(data.error || "No se pudo registrar el vehículo.");
      }
    } catch (err) {
      console.error("Error al registrar vehículo:", err);
      alert("Error de conexión al guardar el vehículo.");
    } finally {
      setGuardandoVehiculo(false);
    }
  };

  // Canvas de firma digital
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setTieneFirmaTrazada(true);
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const limpiarFirma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTieneFirmaTrazada(false);
  };

  const handleGuardarFirma = async () => {
    const canvas = canvasRef.current;
    const ordenDestino = ordenActivaVehiculo || ordenActiva;
    if (!canvas || !ordenDestino) return;

    try {
      setGuardandoFirma(true);
      const dataUrl = canvas.toDataURL("image/png");

      const res = await fetch("/api/cliente/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FIRMAR_RECEPCION",
          orderId: ordenDestino.id,
          signatureUrl: dataUrl,
          signerName: cliente?.name || ordenDestino.client,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOrdenActiva((prev) =>
          prev
            ? {
                ...prev,
                deliverySignatureUrl: dataUrl,
                deliveryStatus: "Firmado por Cliente",
                deliverySignedAt: new Date().toISOString(),
              }
            : null
        );
        setModalFirma(false);
        setToastMensaje({ tipo: "success", texto: "Firma de recepción registrada exitosamente." });
        setTimeout(() => setToastMensaje(null), 5000);
      }
    } catch (err) {
      console.error("Error al guardar firma:", err);
      alert("Error al guardar la firma.");
    } finally {
      setGuardandoFirma(false);
    }
  };

  // Cálculo de índice de etapa para el stepper vertical
  const etapaActualIdx = ordenActivaVehiculo
    ? getEtapaDetalladaIndex(ordenActivaVehiculo.status)
    : 4; // Por defecto paso 5 (En Reparación) como en la captura

  const ordenMostrada = ordenActivaVehiculo || ordenActiva || {
    id: "ord-demo-1042",
    orderNumber: "1042",
    plate: vehiculoActivo?.plate || "KXPT45",
    vehicle: vehiculoActivo ? `${vehiculoActivo.brand} ${vehiculoActivo.model}` : "Toyota Corolla 2019",
    client: cliente?.name || "Camila Rojas",
    mechanic: "Diego Muñoz",
    status: "En Reparación",
    progress: 62,
    checklistProgress: 25,
    mileage: 85000,
    generalCondition: "Mantención de los 85.000 km y ruido al frenar",
    totalCost: 172.514,
    paidAmount: 50.0,
    hasPriceAuthorized: true,
    trackingPin: "8492",
    dateIn: "16 oct 2026",
    estimatedOut: "19 oct 2026",
    checklistItems: [
      { id: "c1", name: "Revisión de frenos delanteros", completed: true, status: "Listo", price: 35.0 },
      { id: "c2", name: "Cambio de aceite y filtro", completed: false, status: "En Proceso", price: 35.0 },
      { id: "c3", name: "Cambio de pastillas de freno", completed: false, status: "Pendiente", price: 62.514 },
      { id: "c4", name: "Prueba de ruta", completed: false, status: "Pendiente", price: 40.0 },
    ],
    completedCount: 1,
    totalCount: 4,
    internalChat: [],
  };

  const modulosCliente = [
    {
      title: "Taller & Proceso",
      href: "/cliente/taller",
      color: "bg-blue-600",
      gradient: "from-blue-600 via-indigo-600 to-blue-700",
      icon: (
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
      badge: (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Paso {etapaActualIdx + 1}/6
        </span>
      ),
      subtitle: `Orden #${ordenMostrada.orderNumber} • ${ordenMostrada.status || "En Taller"}`,
    },
    {
      title: "Mis Créditos",
      href: "/cliente/creditos",
      color: "bg-amber-500",
      gradient: "from-amber-500 via-orange-500 to-amber-600",
      icon: (
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
          <circle cx="7" cy="15" r="1" fill="currentColor" />
          <line x1="11" x2="16" y1="15" y2="15" />
        </svg>
      ),
      badge: (
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
          ${creditos ? creditos.availableCredit.toFixed(0) : "430"} disp.
        </span>
      ),
      subtitle: `Saldo adeudado: ${creditos ? creditos.currentBalance.toFixed(2) : "170.00"}`,
    },
    {
      title: "Mis Facturas",
      href: "/cliente/facturas",
      color: "bg-indigo-500",
      gradient: "from-indigo-500 to-purple-600",
      icon: (
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M16 8h-8m8 4h-8m6 4h-6" />
        </svg>
      ),
      badge: (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-bold">
          ${facturasFiltradas.length} Facturas
        </span>
      ),
      subtitle: "Compras en mostrador POS y taller",
    },
    {
      title: "Cotizaciones",
      href: "/cliente/cotizaciones",
      color: "bg-purple-500",
      gradient: "from-fuchsia-500 to-purple-600",
      icon: (
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
      ),
      badge: cotizacionesPendientes.length > 0 ? (
        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold animate-pulse shadow-xs">
          ${cotizacionesPendientes.length} Por aprobar
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-bold">
          ${cotizacionesFiltradas.length} Presupuestos
        </span>
      ),
      subtitle: "Aprobación y costos estimados",
    },
    {
      title: "Mis Vehículos",
      href: "/cliente/vehiculos",
      color: "bg-sky-500",
      gradient: "from-sky-500 to-blue-600",
      icon: (
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      ),
      badge: (
        <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-[10px] font-bold text-sky-700 dark:text-sky-300 font-mono">
          ${vehiculoActivo ? vehiculoActivo.plate : `${vehiculos.length} Autos`}
        </span>
      ),
      subtitle: `${vehiculos.length} Vehículos en garaje digital`,
    },
    {
      title: "Agendar Citas",
      href: "/cliente/citas",
      color: "bg-rose-500",
      gradient: "from-rose-500 to-pink-600",
      icon: (
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      ),
      badge: (
        <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-[10px] font-bold text-rose-700 dark:text-rose-300">
          Online 24/7
        </span>
      ),
      subtitle: "Turnos de taller y alineación 3D",
    },
    {
      title: "Historial Clínico",
      href: "/cliente/historial",
      color: "bg-teal-500",
      gradient: "from-teal-400 to-cyan-600",
      icon: (
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 12h6M9 16h6" />
        </svg>
      ),
      badge: (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-bold">
          ${historialClinico.length} Visitas
        </span>
      ),
      subtitle: "Bitácora técnica y garantías",
    },
    {
      title: "Mi Perfil",
      href: "/cliente/perfil",
      color: "bg-slate-700",
      gradient: "from-zinc-700 via-slate-800 to-zinc-900",
      icon: (
        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      badge: (
        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-[10px] font-bold text-blue-700 dark:text-blue-300">
          ${cliente?.vip ? "VIP" : "Titular"}
        </span>
      ),
      subtitle: cliente?.name ? cliente.name : "Datos personales y RUC",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 font-sans antialiased selection:bg-blue-600/20 selection:text-blue-900 pb-16">
      {/* =====================================================================
          BARRA DE NAVEGACIÓN OFICIAL AUTOG (EXACTA A LA CAPTURA DEL USUARIO)
          ===================================================================== */}
      <Header />

      {/* =====================================================================
          TOAST NOTIFICATION FLOTANTE
          ===================================================================== */}
      {toastMensaje && (
        <div className="fixed top-20 right-4 z-50 max-w-md animate-bounce-short">
          <div
            className={`p-4 rounded-2xl shadow-xl border flex items-start gap-3 backdrop-blur-md ${
              toastMensaje.tipo === "success"
                ? "bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                : "bg-rose-50/95 dark:bg-rose-950/90 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
            }`}
          >
            <span className="text-xl">
              {toastMensaje.tipo === "success" ? "✅" : "⚠️"}
            </span>
            <div className="text-xs sm:text-sm font-medium leading-relaxed">
              {toastMensaje.texto}
            </div>
            <button
              onClick={() => setToastMensaje(null)}
              className="ml-auto text-slate-400 hover:text-slate-700 dark:hover:text-white text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-BARRA CONTEXTUAL: ORDEN EN TALLER + ACCIÓN "VOY EN CAMINO" + CLIENTE
          ===================================================================== */}
      <div className="border-b border-slate-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          {/* Orden activa e identificador */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Volver al Inicio"
              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">
                Portal Cliente
              </span>
              <span className="text-slate-300 dark:text-zinc-700">•</span>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>Orden #{ordenMostrada.orderNumber || "1042"}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h1>
            </div>
          </div>

          {/* ACCIONES RÁPIDAS: "¡VOY EN CAMINO!" + SELECTOR */}
          <div className="flex items-center gap-2">
            {/* Botón Principal: ¡Voy en camino al taller! */}
            <button
              type="button"
              onClick={() => setModalVoyEnCamino(true)}
              className="h-9 px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <span>🚗</span>
              <span className="font-bold">¡Voy en camino!</span>
            </button>

            {/* Botón: Solicitar Servicio o Repuesto */}
            <button
              type="button"
              onClick={() => setModalSolicitarServicio(true)}
              className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-medium text-xs sm:text-sm hidden md:flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <span>⚡</span>
              <span>Solicitar</span>
            </button>

            {/* Selector de perfil cliente */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMostrarSelectorCliente(!mostrarSelectorCliente)}
                className="h-9 px-2.5 sm:px-3 rounded-xl bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-200 flex items-center gap-2 transition-all cursor-pointer"
              >
                <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center">
                  {cliente?.name ? cliente.name.slice(0, 2).toUpperCase() : "CL"}
                </div>
                <span className="font-medium hidden sm:inline max-w-[110px] truncate">
                  {cliente?.name || "Camila Rojas"}
                </span>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Dropdown de conmutador de cuentas */}
              {mostrarSelectorCliente && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-2.5 z-40 animate-fade-in">
                  <div className="px-2 py-1.5 border-b border-slate-100 dark:border-zinc-800 mb-2">
                    <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider block">
                      Cambiar de Cliente
                    </span>
                    <input
                      type="text"
                      value={filtroBusquedaCliente}
                      onChange={(e) => setFiltroBusquedaCliente(e.target.value)}
                      placeholder="Buscar cliente o cédula..."
                      className="w-full mt-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {clientesDisponibles
                      .filter((c) => {
                        const q = filtroBusquedaCliente.toLowerCase();
                        return (
                          c.name.toLowerCase().includes(q) ||
                          c.identification.toLowerCase().includes(q)
                        );
                      })
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setMostrarSelectorCliente(false);
                            cargarDashboard(c.identification);
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            c.id === cliente?.id
                              ? "bg-blue-50 text-blue-900 font-semibold border border-blue-200"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="truncate">
                            <strong className="block text-slate-900 truncate">{c.name}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {c.identification} • {c.phone}
                            </span>
                          </div>
                          {c.id === cliente?.id && <span className="text-blue-600 font-bold">✓</span>}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SELECTOR HORIZONTAL DE VEHÍCULOS DEL CLIENTE
          ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 shrink-0 mr-1">
            Mis Vehículos:
          </span>
          {vehiculos.map((v) => {
            const isSelected =
              vehiculoSeleccionadoPlaca?.toUpperCase() === v.plate.trim().toUpperCase();
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVehiculoSeleccionadoPlaca(v.plate)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? "bg-white dark:bg-zinc-800 border-blue-500 text-blue-900 dark:text-blue-300 font-bold shadow-xs ring-2 ring-blue-500/20"
                    : "bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="font-mono">{v.plate}</span>
                <span className="text-slate-400 dark:text-zinc-500">({v.brand} {v.model})</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setModalNuevoVehiculo(true)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-dashed border-slate-300 dark:border-zinc-700 text-xs font-medium text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
          >
            <span>+</span>
            <span>Registrar otro auto</span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          MÓDULOS PRINCIPALES DEL CLIENTE (TARJETAS DE ACCESO DIRECTO)
          ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Módulos del Cliente</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold font-mono">
                8 accesos
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Ingresa directamente a cada módulo o consulta el estado en tiempo real
            </p>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 hidden sm:inline">
            Toca una tarjeta para ingresar al módulo correspondiente
          </span>
        </div>

        {/* Módulos POS para el Portal de Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {modulosCliente.map((mod, index) => (
            <Link 
              key={mod.href} 
              href={mod.href}
              className="group block bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 min-h-[96px] sm:min-h-[104px] border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 transition-all duration-300 ease-out hover:-translate-y-1.5 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.06)] hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.97] overflow-hidden relative flex flex-col justify-center"
            >
              {/* Esquina con color suave: sutil y elegante */}
              <div
                style={{ animationDelay: `${index * 0.4}s` }}
                className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-[0.08] dark:opacity-5 rounded-bl-full -mr-10 -mt-10 transition-all duration-500 ease-out group-hover:scale-125 group-hover:opacity-20 dark:group-hover:opacity-15 auto-corner-mobile sm:animate-none pointer-events-none`}
              />
              {/* Destello de brillo diagonal: visible en modo claro y oscuro */}
              <div 
                style={{ animationDelay: `${index * 0.4}s` }}
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full auto-shine-mobile sm:animate-none transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-zinc-400/15 dark:via-white/[0.07] to-transparent pointer-events-none" 
              />

              <div className="flex items-center justify-between gap-3 min-w-0 relative z-10 w-full">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br ${mod.gradient} shadow-md flex items-center justify-center flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3`}
                  >
                    {mod.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm sm:text-base font-semibold text-zinc-800 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200 truncate">
                        {mod.title}
                      </h3>
                      {mod.badge}
                    </div>
                    <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                      {mod.subtitle}
                    </p>
                  </div>
                </div>

                {/* Flecha a la derecha con animación sutil en hover */}
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-transparent flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:border-blue-200 dark:group-hover:border-transparent group-hover:translate-x-1 transition-all duration-200 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

            {/* =====================================================================
          SECCIÓN DE SOPORTE Y CONTACTO RÁPIDO
          ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-12 w-full">
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-2xl shrink-0">
              🛡️
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Centro de Asistencia & Garantía AutoG
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                ¿Tienes alguna consulta técnica sobre tu vehículo, repuestos o facturas? Estamos disponibles para asistirte.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setModalSolicitarServicio(true)}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              ⚡ Solicitar Servicio
            </button>
            <a
              href="https://wa.me/593998765432"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
            >
              <span>💬</span>
              <span>WhatsApp Taller</span>
            </a>
          </div>
        </div>
      </section>

      {/* =====================================================================
          MODAL 1: "¡VOY EN CAMINO AL TALLER!"
          ===================================================================== */}
      {modalVoyEnCamino && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                  🚗
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    ¡Voy en camino al taller!
                  </h3>
                  <p className="text-xs text-slate-500">
                    Avisa al equipo para que preparen tu recepción o entrega
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalVoyEnCamino(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  ¿En cuántos minutos estimas llegar?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 30, 60].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setEtaMinutos(min)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        etaMinutos === min
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {min === 60 ? "1 hora" : `${min} min`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Vehículo
                </label>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <span className="font-semibold text-slate-900">
                    {vehiculoActivo ? `${vehiculoActivo.brand} ${vehiculoActivo.model}` : "Vehículo en taller"}
                  </span>
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {vehiculoActivo?.plate || ordenMostrada.plate}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Mensaje o Nota Opcional
                </label>
                <textarea
                  rows={2}
                  value={notaCamino}
                  onChange={(e) => setNotaCamino(e.target.value)}
                  placeholder="Ej: Traigo el repuesto que faltaba / Vengo a retirar mi vehículo..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalVoyEnCamino(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={enviandoCamino}
                  onClick={handleNotificarVoyEnCamino}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  {enviandoCamino ? "Enviando..." : "🚗 Enviar Aviso al Taller"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: "SOLICITAR SERVICIO O REPUESTO"
          ===================================================================== */}
      {modalSolicitarServicio && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
                  ⚡
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Solicitar Servicio o Repuesto
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atención directa e inmediata con la jefatura técnica
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalSolicitarServicio(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tipo de Requerimiento
                </label>
                <select
                  value={tipoServicioDeseado}
                  onChange={(e) => setTipoServicioDeseado(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium"
                >
                  <option value="Mantenimiento Preventivo">Mantenimiento Preventivo (Cambio de aceite, filtros)</option>
                  <option value="Revisión de Frenos o Suspensión">Revisión de Frenos o Suspensión</option>
                  <option value="Diagnóstico Computarizado">Diagnóstico Computarizado (Scanner)</option>
                  <option value="Cotización de Repuestos Nuevos">Cotización de Repuestos Nuevos</option>
                  <option value="Alineación y Balanceo">Alineación 3D y Balanceo</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Detalles adicionales
                </label>
                <textarea
                  rows={3}
                  value={notaServicioDeseado}
                  onChange={(e) => setNotaServicioDeseado(e.target.value)}
                  placeholder="Describe lo que notas en tu auto o el repuesto exacto que necesitas..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-900 space-y-1">
                <span className="font-bold block">Canal Directo de WhatsApp:</span>
                <p className="leading-tight text-[11px] text-blue-800">
                  Se generará una conversación oficial con el técnico a cargo para confirmar fecha, hora y disponibilidad de bahía.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalSolicitarServicio(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `Hola, soy ${cliente?.name || "Cliente"} (Doc: ${cliente?.identification}). Deseo solicitar: ${tipoServicioDeseado} para mi auto ${vehiculoActivo ? `${vehiculoActivo.brand} ${vehiculoActivo.model} (${vehiculoActivo.plate})` : ""}. Nota: ${notaServicioDeseado}`;
                    window.open(`https://wa.me/593998765432?text=${encodeURIComponent(text)}`, "_blank");
                    setModalSolicitarServicio(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>💬</span>
                  <span>Contactar por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: REGISTRAR NUEVO VEHÍCULO
          ===================================================================== */}
      {modalNuevoVehiculo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Registrar Nuevo Vehículo
              </h3>
              <button
                type="button"
                onClick={() => setModalNuevoVehiculo(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarNuevoVehiculo} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Placa (Obligatoria)
                </label>
                <input
                  type="text"
                  required
                  value={nuevaPlaca}
                  onChange={(e) => setNuevaPlaca(e.target.value.toUpperCase())}
                  placeholder="Ej: ABC-1234"
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Marca</label>
                  <input
                    type="text"
                    value={nuevaMarca}
                    onChange={(e) => setNuevaMarca(e.target.value)}
                    placeholder="Toyota, Ford..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Modelo</label>
                  <input
                    type="text"
                    value={nuevoModelo}
                    onChange={(e) => setNuevoModelo(e.target.value)}
                    placeholder="Hilux, Corolla..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Año</label>
                  <input
                    type="number"
                    value={nuevoAnio}
                    onChange={(e) => setNuevoAnio(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kilometraje</label>
                  <input
                    type="number"
                    value={nuevoKm}
                    onChange={(e) => setNuevoKm(e.target.value)}
                    placeholder="45000"
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoVehiculo(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoVehiculo || !nuevaPlaca.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {guardandoVehiculo ? "Guardando..." : "Guardar Auto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          </div>
  );
}
