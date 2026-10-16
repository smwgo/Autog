"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from "@/components/Header";
import { ClienteMobileNav } from "@/components/ClienteMobileNav";

interface InvoiceItem {
  dbId?: string;
  id: string;
  uuid: string;
  date: string;
  concept: string;
  amount: number;
  status: 'Pagada' | 'Pendiente';
  paymentMethod: string;
  items?: { description: string; amount: number }[];
}

function FacturasPagosContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get('id') || searchParams.get('factura') || '';

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(idParam);
  const [statusFilter, setStatusFilter] = useState('Todas'); // Todas, Pagada, Pendiente

  // Estados interactivos para modales y notificaciones
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<InvoiceItem | null>(null);
  const [invoiceToPay, setInvoiceToPay] = useState<InvoiceItem | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('Tarjeta de Crédito');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modal para crear nueva factura en Neon DB (POST)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newConcept, setNewConcept] = useState('');
  const [newAmount, setNewAmount] = useState('150.00');
  const [newStatus, setNewStatus] = useState<'Pagada' | 'Pendiente'>('Pendiente');
  const [newPaymentMethod, setNewPaymentMethod] = useState('Por Definir');

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cliente/facturas', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.facturas)) {
        setInvoices(data.facturas);
      }
    } catch (err) {
      console.error('Error cargando facturas desde Neon DB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (idParam) {
      setSearchTerm(idParam);
    }
  }, [idParam]);

  // Descarga real de archivo XML (CFDI simulado)
  const handleDownloadXML = (inv: InvoiceItem) => {
    const subtotal = (inv.amount / 1.16).toFixed(2);
    const iva = (inv.amount - Number(subtotal)).toFixed(2);

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante 
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4" 
  Version="4.0" 
  Serie="F" 
  Folio="${inv.id}" 
  Fecha="${inv.date}" 
  SubTotal="${subtotal}" 
  Total="${inv.amount.toFixed(2)}" 
  Moneda="MXN" 
  TipoDeComprobante="I" 
  MetodoPago="PUE" 
  LugarExpedicion="64000">
  <cfdi:Emisor Rfc="AGU200101XYZ" Nombre="AUTOG TALLER AUTOMOTRIZ S.A. DE C.V." RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="XAXX010101000" Nombre="PUBLICO EN GENERAL" UsoCFDI="G03" DomicilioFiscalReceptor="64000" RegimenFiscalReceptor="616"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="78181500" Cantidad="1" ClaveUnidad="E48" Descripcion="${inv.concept}" ValorUnitario="${subtotal}" Importe="${subtotal}"/>
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${iva}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${subtotal}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${iva}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital UUID="${inv.uuid}" FechaTimbrado="${inv.date}T12:00:00" RfcProvCertif="SAT970701NN3"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${inv.id}_CFDI.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(`Factura XML (${inv.id}.xml) descargada con éxito.`);
  };

  // Descarga / Impresión de PDF
  const handleDownloadPDF = (inv: InvoiceItem) => {
    showNotification(`Generando comprobante PDF para ${inv.id}...`);
    setSelectedInvoiceModal(inv);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.print();
      }
    }, 500);
  };

  // Descarga de Reporte Anual en formato CSV
  const handleDownloadAnnualReport = () => {
    const csvRows = [
      ['ID Factura', 'UUID', 'Fecha', 'Concepto', 'Total (MXN)', 'Estado', 'Forma de Pago'],
      ...invoices.map(i => [
        i.id,
        i.uuid,
        i.date,
        `"${i.concept}"`,
        Number(i.amount).toFixed(2),
        i.status,
        `"${i.paymentMethod}"`
      ])
    ];

    const csvContent = csvRows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Facturacion_AutoG_${new Date().getFullYear()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('Reporte anual de facturación descargado en CSV.');
  };

  // Procesar Pago Real en Neon DB (PUT /api/cliente/facturas)
  const handleConfirmPayment = async () => {
    if (!invoiceToPay) return;
    setIsProcessingPayment(true);
    try {
      const res = await fetch('/api/cliente/facturas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: invoiceToPay.id,
          status: 'Pagada',
          paymentMethod: selectedPaymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar pago en Neon DB');
      }
      showNotification(`¡Pago registrado en Neon DB para ${invoiceToPay.id}!`);
      setInvoiceToPay(null);
      await fetchInvoices();
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Crear nueva factura en Neon DB (POST /api/cliente/facturas)
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcept.trim()) return;
    setIsProcessingPayment(true);
    try {
      const amountVal = Number(newAmount) || 0;
      const res = await fetch('/api/cliente/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: newConcept.trim(),
          amount: amountVal,
          status: newStatus,
          paymentMethod: newStatus === 'Pagada' && newPaymentMethod === 'Por Definir' ? 'Tarjeta de Crédito' : newPaymentMethod,
          items: [{ description: newConcept.trim(), amount: Number((amountVal / 1.16).toFixed(2)) }],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al crear factura en Neon DB');
      }
      setIsNewModalOpen(false);
      setNewConcept('');
      setNewAmount('150.00');
      showNotification(`Factura ${data.factura?.id || ''} creada en Neon DB.`);
      await fetchInvoices();
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Eliminar factura de Neon DB (DELETE /api/cliente/facturas)
  const handleDeleteInvoice = async (invId: string) => {
    setIsProcessingPayment(true);
    try {
      const res = await fetch(`/api/cliente/facturas?id=${encodeURIComponent(invId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar factura');
      }
      setSelectedInvoiceModal(null);
      showNotification(`Factura ${invId} eliminada de Neon DB.`);
      await fetchInvoices();
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.concept.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.uuid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todas' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-bottom duration-200">
          <span className="text-emerald-400">✓</span>
          <span>{notification}</span>
        </div>
      )}
      
      <main className="flex-grow p-6 md:p-12 max-w-6xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6 flex flex-wrap justify-between items-center gap-3">
          <Link href="/cliente" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Facturas Neon DB ({invoices.length})</span>
            </div>
            <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <span>RFC:</span>
              <span className="font-bold text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                XAXX010101000
              </span>
            </div>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-indigo-500 bg-opacity-10 flex items-center justify-center text-2xl">
                🧾
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Facturas y Pagos
              </h1>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="cursor-pointer min-h-[44px] h-11 bg-indigo-600 hover:bg-indigo-700 text-white px-5 rounded-xl font-bold transition-colors shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 text-base sm:text-sm flex-1 sm:flex-initial"
            >
              <span>+</span> Nueva Factura
            </button>
            <button 
              type="button"
              onClick={handleDownloadAnnualReport}
              className="cursor-pointer min-h-[44px] h-11 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-500 text-zinc-700 dark:text-zinc-300 px-5 rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] text-base sm:text-sm flex-1 sm:flex-initial"
            >
              <span>⬇️</span> Reporte Anual
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <input 
              type="text" 
              placeholder="Buscar por número de factura (ej. F-2023-0899) o concepto..." 
              className="w-full pl-12 pr-12 py-3.5 min-h-[44px] rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all dark:text-white font-medium text-base sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 top-3.5 text-zinc-400 text-lg">🔍</span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="cursor-pointer absolute right-2 top-2 w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar shrink-0">
            {['Todas', 'Pagada', 'Pendiente'].map(status => (
              <button 
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`cursor-pointer min-h-[44px] px-5 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-colors text-base sm:text-sm flex items-center justify-center ${statusFilter === status ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500">
              Cargando facturas desde Neon PostgreSQL...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center shadow-sm">
              <span className="text-4xl mb-4 block opacity-50">🧾</span>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No se encontraron facturas</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">Intenta cambiar los filtros o el término de búsqueda.</p>
              {(searchTerm || statusFilter !== 'Todas') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('Todas');
                  }}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold text-sm hover:bg-indigo-100 transition-colors"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            filteredInvoices.map((inv) => (
              <div 
                key={inv.id} 
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col md:flex-row gap-6 items-center group"
              >
                {/* Status Indicator */}
                <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex-shrink-0">
                  {inv.status === 'Pagada' ? (
                    <span className="text-emerald-500 text-3xl font-black">✓</span>
                  ) : (
                    <span className="text-amber-500 text-3xl font-black">!</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-grow w-full">
                  <div className="flex justify-between items-start mb-2">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceModal(inv)}
                      className="cursor-pointer min-h-[44px] font-bold font-mono text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5"
                      title="Clic para ver detalle completo"
                    >
                      <span>{inv.id}</span>
                      <span className="text-xs opacity-75">🔍</span>
                    </button>
                    <span className={`md:hidden px-3 py-1 rounded-full text-xs font-bold border ${inv.status === 'Pagada' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'}`}>
                      {inv.status}
                    </span>
                  </div>
                  <h3 
                    onClick={() => setSelectedInvoiceModal(inv)}
                    className="cursor-pointer text-lg font-bold text-zinc-900 dark:text-white mb-1 leading-tight hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {inv.concept}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400 mt-3">
                    <span className="flex items-center gap-1">📅 {inv.date}</span>
                    <span className="flex items-center gap-1">💳 {inv.paymentMethod}</span>
                    <span className="flex items-center gap-1 hidden lg:flex font-mono text-xs">📄 UUID: {inv.uuid}</span>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="w-full md:w-auto flex flex-row md:flex-col justify-between items-center md:items-end gap-4 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 pl-0 md:pl-6 shrink-0">
                  <div className="text-left md:text-right">
                    <p className={`text-2xl font-black ${inv.status === 'Pagada' ? 'text-zinc-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}`}>
                      ${Number(inv.amount).toFixed(2)}
                    </p>
                    <span className={`hidden md:inline-block px-2 py-0.5 mt-1 rounded text-xs font-bold border ${inv.status === 'Pagada' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'}`}>
                      {inv.status}
                    </span>
                  </div>
                  
                  {/* Botones con funciones conectadas */}
                  <div className="flex gap-2">
                    {inv.status === 'Pendiente' ? (
                      <button 
                        type="button"
                        onClick={() => setInvoiceToPay(inv)}
                        className="cursor-pointer min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-500/20 whitespace-nowrap text-base sm:text-sm active:scale-[0.98] flex items-center justify-center"
                      >
                        Pagar Ahora
                      </button>
                    ) : (
                      <>
                        <button 
                          type="button"
                          onClick={() => handleDownloadXML(inv)}
                          className="cursor-pointer min-h-[44px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap text-base sm:text-sm flex items-center gap-2 active:scale-[0.98]" 
                          title="Descargar archivo CFDI XML"
                        >
                          <span className="text-indigo-600 dark:text-indigo-400">{'</>'}</span> XML
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDownloadPDF(inv)}
                          className="cursor-pointer min-h-[44px] bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-bold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap text-base sm:text-sm flex items-center gap-2 active:scale-[0.98]" 
                          title="Ver e Imprimir comprobante PDF"
                        >
                          📄 PDF
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL: VISTA PREVIA Y DETALLE COMPLETO DE FACTURA        */}
      {/* ======================================================== */}
      {/* ======================================================== */}
      {/* MODAL: VISTA PREVIA Y DETALLE COMPLETO DE FACTURA        */}
      {/* ======================================================== */}
      {selectedInvoiceModal && (
        <div 
          onClick={() => setSelectedInvoiceModal(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <button
              type="button"
              onClick={() => setSelectedInvoiceModal(null)}
              className="cursor-pointer absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-base sm:text-lg"
            >
              ✕
            </button>

            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800 mb-6 pr-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🧾</span>
                  <span className="text-xl font-black text-zinc-900 dark:text-white">Auto/G Taller Automotriz</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  RFC: AGU200101XYZ • Régimen General de Ley Personas Morales
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Av. Principal 1245, Zona Industrial
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mb-2 border ${
                  selectedInvoiceModal.status === 'Pagada'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                }`}>
                  {selectedInvoiceModal.status}
                </span>
                <p className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
                  {selectedInvoiceModal.id}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Fecha: {selectedInvoiceModal.date}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs mb-6">
              <div>
                <p className="font-bold text-zinc-500 uppercase tracking-wider mb-1">Receptor:</p>
                <p className="font-semibold text-zinc-900 dark:text-white">Cliente General</p>
                <p className="text-zinc-500 dark:text-zinc-400">RFC: XAXX010101000</p>
                <p className="text-zinc-500 dark:text-zinc-400">Uso CFDI: G03 - Gastos en general</p>
              </div>
              <div>
                <p className="font-bold text-zinc-500 uppercase tracking-wider mb-1">Detalles de Operación:</p>
                <p className="font-semibold text-zinc-900 dark:text-white">{selectedInvoiceModal.concept}</p>
                <p className="text-zinc-500 dark:text-zinc-400">Forma de Pago: {selectedInvoiceModal.paymentMethod}</p>
                <p className="font-mono text-zinc-500 dark:text-zinc-400">Moneda: MXN (Pesos)</p>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                Conceptos y Partidas
              </h4>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden text-sm overflow-x-auto">
                <table className="w-full text-left min-w-[280px]">
                  <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                    <tr>
                      <th className="p-3">Descripción</th>
                      <th className="p-3 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {(selectedInvoiceModal.items && selectedInvoiceModal.items.length > 0) ? (
                      selectedInvoiceModal.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 text-zinc-900 dark:text-zinc-200">{item.description}</td>
                          <td className="p-3 text-right font-medium text-zinc-900 dark:text-zinc-200">
                            ${Number(item.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3 text-zinc-900 dark:text-zinc-200">{selectedInvoiceModal.concept}</td>
                        <td className="p-3 text-right font-medium text-zinc-900 dark:text-zinc-200">
                          ${(selectedInvoiceModal.amount / 1.16).toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 mb-6">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                <p className="font-mono">UUID Fiscal Timbrado:</p>
                <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 break-all">
                  {selectedInvoiceModal.uuid}
                </p>
              </div>
              <div className="w-full sm:w-48 text-right space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Subtotal:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    ${(selectedInvoiceModal.amount / 1.16).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">IVA (16%):</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    ${(selectedInvoiceModal.amount - (selectedInvoiceModal.amount / 1.16)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black border-t border-zinc-200 dark:border-zinc-700 pt-1 text-zinc-900 dark:text-white">
                  <span>Total:</span>
                  <span>${Number(selectedInvoiceModal.amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handleDeleteInvoice(selectedInvoiceModal.id)}
                disabled={isProcessingPayment}
                className="cursor-pointer min-h-[44px] h-11 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold text-base sm:text-xs transition-colors flex items-center justify-center"
              >
                🗑️ Eliminar de Neon DB
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadXML(selectedInvoiceModal)}
                  className="cursor-pointer min-h-[44px] h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-base sm:text-xs flex items-center justify-center gap-1.5 transition-colors flex-1 sm:flex-initial"
                >
                  <span>{'</>'}</span> XML
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                  className="cursor-pointer min-h-[44px] h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base sm:text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm flex-1 sm:flex-initial"
                >
                  <span>📄</span> Imprimir / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceModal(null)}
                  className="cursor-pointer min-h-[44px] h-11 px-4 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-base sm:text-xs transition-colors flex items-center justify-center flex-1 sm:flex-initial"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PAGAR AHORA (PASARELA DE PAGO EN NEON DB)         */}
      {/* ======================================================== */}
      {invoiceToPay && (
        <div 
          onClick={() => setInvoiceToPay(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <button
              type="button"
              onClick={() => setInvoiceToPay(null)}
              className="cursor-pointer absolute top-4 right-4 sm:top-5 sm:right-5 w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-base sm:text-sm"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl">
                💳
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Pagar Factura</h3>
                <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{invoiceToPay.id}</p>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-5">
              <p className="text-xs text-zinc-500 mb-1">Concepto:</p>
              <p className="font-semibold text-zinc-900 dark:text-white text-sm mb-3">{invoiceToPay.concept}</p>
              <div className="flex justify-between items-baseline border-t border-zinc-200 dark:border-zinc-700 pt-2">
                <span className="text-xs text-zinc-500">Monto total:</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  ${Number(invoiceToPay.amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Selecciona Método de Pago
              </label>
              {[
                { id: 'Tarjeta de Crédito', icon: '💳', label: 'Tarjeta de Crédito / Débito' },
                { id: 'Transferencia Bancaria (SPEI)', icon: '🏦', label: 'Transferencia SPEI Inmediata' },
                { id: 'Efectivo en Caja', icon: '💵', label: 'Pagar en Caja del Taller' },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`cursor-pointer p-3.5 min-h-[48px] rounded-2xl border text-sm font-semibold flex items-center gap-3 transition-all ${
                    selectedPaymentMethod === m.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payMethod"
                    checked={selectedPaymentMethod === m.id}
                    onChange={() => setSelectedPaymentMethod(m.id)}
                    className="text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setInvoiceToPay(null)}
                className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-base sm:text-sm flex items-center justify-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleConfirmPayment}
                className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all text-base sm:text-sm shadow-md shadow-indigo-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? 'Procesando...' : `Pagar $${Number(invoiceToPay.amount).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NUEVA FACTURA EN NEON DB (POST)                   */}
      {/* ======================================================== */}
      {isNewModalOpen && (
        <div
          onClick={() => setIsNewModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="cursor-pointer absolute top-4 right-4 sm:top-5 sm:right-5 w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-base sm:text-sm"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Emitir Nueva Factura (Neon DB)
            </h3>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Concepto de Facturación
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Mantenimiento Preventivo Toyota Hilux"
                  value={newConcept}
                  onChange={(e) => setNewConcept(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Monto Total ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Estado
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as 'Pagada' | 'Pendiente')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Pagada">Pagada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Forma de Pago
                </label>
                <select
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                >
                  <option value="Por Definir">Por Definir</option>
                  <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                  <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                  <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                  <option value="Efectivo">Efectivo</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-base sm:text-sm flex items-center justify-center text-zinc-700 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base sm:text-sm flex items-center justify-center"
                >
                  {isProcessingPayment ? 'Guardando...' : 'Guardar en Neon DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navegación móvil fija */}
      <ClienteMobileNav />
    </div>
  );
}

export default function FacturasPagosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-8 text-zinc-500">Cargando facturas...</div>}>
      <FacturasPagosContent />
    </Suspense>
  );
}
