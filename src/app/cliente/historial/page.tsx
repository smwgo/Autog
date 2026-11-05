"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from "@/components/Header";
import { ClienteMobileNav } from "@/components/ClienteMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface ServiceItem {
  dbId?: string;
  id: string;
  invoiceId: string;
  uuid: string;
  date: string;
  vehicle: string;
  mileage: string;
  type: string;
  details: string;
  laborCost: number;
  partsCost: number;
  cost: number;
  paymentMethod: string;
  warranty: {
    active: boolean;
    expires: string;
    coverage: string;
  };
}

function HistorialServiciosContent() {
  const searchParams = useSearchParams();
  const vehiculoParam = searchParams.get('vehiculo');

  const getInitialVehicle = () => {
    if (!vehiculoParam) return 'Todos';
    const param = vehiculoParam.toLowerCase();
    if (param.includes('hilux') || param.includes('toyota')) return 'Toyota Hilux';
    if (param.includes('civic') || param.includes('honda')) return 'Honda Civic';
    if (param.includes('escape') || param.includes('ford')) return 'Ford Escape';
    return vehiculoParam;
  };

  const [historyList, setHistoryList] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(getInitialVehicle);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modales y feedback de acciones
  const [selectedWarranty, setSelectedWarranty] = useState<ServiceItem | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Crear / Editar Servicio en Neon DB (POST / PUT)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceItem | null>(null);
  const [formVehicle, setFormVehicle] = useState('Toyota Hilux 2020 (ABC-123)');
  const [formMileage, setFormMileage] = useState('48,000 km');
  const [formType, setFormType] = useState('Mantenimiento Preventivo');
  const [formDetails, setFormDetails] = useState('');
  const [formCost, setFormCost] = useState('185.00');
  const [formWarrantyActive, setFormWarrantyActive] = useState(true);
  const [formWarrantyExpires, setFormWarrantyExpires] = useState('6 meses o 10,000 km');
  const [formWarrantyCoverage, setFormWarrantyCoverage] = useState(
    'Garantía integral en mano de obra y repuestos instalados por AutoG.'
  );

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cliente/historial', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.historial)) {
        setHistoryList(data.historial);
      }
    } catch (err) {
      console.error('Error cargando historial desde Neon DB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (vehiculoParam) {
      setSelectedVehicle(getInitialVehicle());
    }
  }, [vehiculoParam]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setFormVehicle('Toyota Hilux 2020 (ABC-123)');
    setFormMileage('48,000 km');
    setFormType('Mantenimiento Preventivo');
    setFormDetails('');
    setFormCost('185.00');
    setFormWarrantyActive(true);
    setFormWarrantyExpires('6 meses o 10,000 km');
    setFormWarrantyCoverage('Garantía integral en mano de obra y repuestos instalados por AutoG.');
    setIsFormOpen(true);
  };

  const openEditModal = (rec: ServiceItem) => {
    setEditingRecord(rec);
    setFormVehicle(rec.vehicle);
    setFormMileage(rec.mileage);
    setFormType(rec.type);
    setFormDetails(rec.details);
    setFormCost(String(rec.cost));
    setFormWarrantyActive(rec.warranty.active);
    setFormWarrantyExpires(rec.warranty.expires);
    setFormWarrantyCoverage(rec.warranty.coverage);
    setIsFormOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const method = editingRecord ? 'PUT' : 'POST';
      const payload = {
        ...(editingRecord ? { dbId: editingRecord.dbId, id: editingRecord.id } : {}),
        vehicle: formVehicle,
        mileage: formMileage,
        type: formType,
        details: formDetails,
        cost: Number(formCost) || 0,
        warrantyActive: formWarrantyActive,
        warrantyExpires: formWarrantyExpires,
        warrantyCoverage: formWarrantyCoverage,
      };
      const res = await fetch('/api/cliente/historial', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error guardando historial en Neon DB');
      }
      setIsFormOpen(false);
      showToast(
        editingRecord
          ? `Registro ${editingRecord.id} actualizado en Neon DB.`
          : 'Nuevo servicio registrado en el historial de Neon DB.'
      );
      await fetchHistory();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (rec: ServiceItem) => {
    setIsSubmitting(true);
    try {
      const targetId = rec.dbId || rec.id;
      const res = await fetch(`/api/cliente/historial?id=${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar registro');
      }
      showToast(`Registro ${rec.id} eliminado de Neon DB.`);
      await fetchHistory();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHistory = historyList.filter(record => {
    const matchesVehicle = selectedVehicle === 'Todos' || record.vehicle.toLowerCase().includes(selectedVehicle.toLowerCase());
    if (!matchesVehicle) return false;

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return (
      record.type.toLowerCase().includes(term) ||
      record.details.toLowerCase().includes(term) ||
      record.id.toLowerCase().includes(term) ||
      record.invoiceId.toLowerCase().includes(term) ||
      record.vehicle.toLowerCase().includes(term) ||
      record.date.toLowerCase().includes(term)
    );
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

      <main className="flex-grow p-6 md:p-12 max-w-5xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6 flex justify-between items-center">
          <Link href="/cliente" className="text-sm font-medium text-amber-600 hover:text-amber-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Historial Neon DB ({historyList.length})</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/cliente"
                title="Volver a Portal de Cliente"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="w-12 h-12 rounded-xl bg-amber-500 bg-opacity-10 flex items-center justify-center text-2xl shrink-0">
                📖
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Historial
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Trabajos realizados y certificados de garantía.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="cursor-pointer min-h-[44px] h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 rounded-2xl transition-all shadow-md shadow-amber-500/20 text-base sm:text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span>+</span> Registrar Servicio
            </button>
          </div>
          
          {/* KPIs / Resumen Desplegable en Móvil */}
          <CollapsibleMetrics className="order-3 sm:order-2 mb-2 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-8">
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                  🔧
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                    {historyList.length}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Servicios Totales</h3>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                  🛡️
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {historyList.filter((r) => r.warranty?.active).length}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Garantías Vigentes</h3>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-500 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
                  💵
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                    ${historyList.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0).toFixed(2)}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Invertido</h3>
                </div>
              </div>
            </div>
          </CollapsibleMetrics>

          {/* Filtros y Buscador */}
          <div className="order-2 sm:order-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-6">
            <div className="relative w-full flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
                🔍
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-zinc-400 shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Desplegable de Vehículo */}
            <div className="relative w-full sm:w-60 shrink-0">
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal transition-all cursor-pointer shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="Todos">Todos los vehículos</option>
                <option value="Toyota Hilux">Toyota Hilux</option>
                <option value="Honda Civic">Honda Civic</option>
                <option value="Ford Escape">Ford Escape</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline / List */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500">
              Cargando historial de servicios...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center shadow-sm">
              <span className="text-4xl mb-4 block opacity-50">🔍</span>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">No se encontraron resultados</h3>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-4">
                No hay servicios que coincidan con los filtros aplicados.
              </p>
              {(searchTerm || selectedVehicle !== 'Todos') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedVehicle('Todos');
                  }}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-sm transition-colors"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          ) : (
            filteredHistory.map((record) => (
              <div
                key={record.dbId || record.id}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col md:flex-row gap-6 relative overflow-hidden group"
              >
                {/* Decorative Side Line (Timeline visual) */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 group-hover:w-2 transition-all"></div>

                {/* Left block: Date & Vehicle */}
                <div className="md:w-1/3 flex flex-col gap-1 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 pb-4 md:pb-0 md:pr-6">
                  <span className="text-amber-600 dark:text-amber-400 font-black text-lg">{record.date}</span>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                      {record.id}
                    </span>
                    <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30">
                      {record.invoiceId}
                    </span>
                  </div>
                  <h4 className="font-bold text-zinc-900 dark:text-white mt-1">{record.vehicle}</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <span>⏲️</span> {record.mileage}
                  </p>
                </div>

                {/* Middle block: Details */}
                <div className="md:w-1/2 flex flex-col">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{record.type}</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4 flex-grow text-sm md:text-base">
                    {record.details}
                  </p>
                  
                  {/* Warranty Badge & CRUD Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {record.warranty.active ? (
                      <button
                        type="button"
                        onClick={() => setSelectedWarranty(record)}
                        className="cursor-pointer text-left inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                        title={`Vence: ${record.warranty.expires} (Clic para ver certificado)`}
                      >
                        <span>🛡️</span>
                        <span>Garantía Activa</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedWarranty(record)}
                        className="cursor-pointer text-left inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        title="Garantía concluida"
                      >
                        <span>⚠️</span>
                        <span>Garantía Expirada</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(record)}
                      className="cursor-pointer min-h-[44px] px-3.5 py-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-colors flex items-center justify-center"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(record)}
                      disabled={isSubmitting}
                      className="cursor-pointer min-h-[44px] px-3.5 py-2 rounded-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center justify-center"
                    >
                      🗑️ Borrar
                    </button>
                  </div>
                </div>

                {/* Right block: Action / Price */}
                <div className="md:w-1/6 flex flex-row md:flex-col justify-between items-end md:justify-center md:items-end border-t md:border-t-0 border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 pl-0 md:pl-6 shrink-0">
                  <div className="text-left md:text-right w-full mb-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Costo Total</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">${Number(record.cost).toFixed(2)}</p>
                  </div>
                  
                  {/* Botón Ver Factura - Navega a la página de facturas */}
                  <Link
                    href={`/cliente/facturas?id=${record.invoiceId}`}
                    className="cursor-pointer text-amber-700 dark:text-amber-400 font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 px-4 py-2.5 min-h-[44px] h-11 rounded-xl transition-all whitespace-nowrap active:scale-[0.98] border border-amber-200/60 dark:border-amber-500/20 shadow-xs flex items-center justify-center text-base sm:text-sm"
                  >
                    Ver Factura
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL: DETALLES DE GARANTÍA                              */}
      {/* ======================================================== */}
      {selectedWarranty && (
        <div 
          onClick={() => setSelectedWarranty(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <button
              type="button"
              onClick={() => setSelectedWarranty(null)}
              className="cursor-pointer absolute top-4 right-4 sm:top-5 sm:right-5 w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-base sm:text-sm"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl">
                🛡️
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Certificado de Garantía</h3>
                <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">Orden: {selectedWarranty.id}</p>
              </div>
            </div>

            <div className="space-y-3 text-sm mb-6">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs text-zinc-500 block mb-0.5">Vehículo y Servicio:</span>
                <p className="font-semibold text-zinc-900 dark:text-white">{selectedWarranty.vehicle}</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">{selectedWarranty.type}</p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs text-zinc-500 block mb-0.5">Vigencia:</span>
                <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>{selectedWarranty.warranty.expires}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedWarranty.warranty.active
                       ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                  }`}>
                    {selectedWarranty.warranty.active ? 'Activa' : 'Expirada'}
                  </span>
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs text-zinc-500 block mb-0.5">Términos de Cobertura:</span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {selectedWarranty.warranty.coverage}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedWarranty(null)}
              className="cursor-pointer w-full min-h-[44px] h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-base sm:text-sm transition-colors flex items-center justify-center"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREAR / EDITAR SERVICIO EN NEON DB                */}
      {/* ======================================================== */}
      {isFormOpen && (
        <div
          onClick={() => setIsFormOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="cursor-pointer absolute top-4 right-4 sm:top-5 sm:right-5 w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-base sm:text-sm"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingRecord ? `Editar Registro ${editingRecord.id}` : 'Registrar Servicio en Historial'}
            </h3>

            <form onSubmit={handleSaveRecord} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Vehículo (y Placa)
                  </label>
                  <input
                    type="text"
                    required
                    value={formVehicle}
                    onChange={(e) => setFormVehicle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Kilometraje
                  </label>
                  <input
                    type="text"
                    required
                    value={formMileage}
                    onChange={(e) => setFormMileage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Tipo de Servicio
                  </label>
                  <input
                    type="text"
                    required
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Costo Total ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Detalles del Trabajo Realizado
                </label>
                <textarea
                  rows={2}
                  required
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Vigencia Garantía
                  </label>
                  <input
                    type="text"
                    value={formWarrantyExpires}
                    onChange={(e) => setFormWarrantyExpires(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-1 sm:mt-4 min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={formWarrantyActive}
                    onChange={(e) => setFormWarrantyActive(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600"
                  />
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Garantía Activa
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Cobertura de Garantía
                </label>
                <input
                  type="text"
                  value={formWarrantyCoverage}
                  onChange={(e) => setFormWarrantyCoverage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-base sm:text-sm flex items-center justify-center text-zinc-700 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base sm:text-sm flex items-center justify-center"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
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

export default function HistorialServiciosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-8 text-zinc-500">Cargando historial...</div>}>
      <HistorialServiciosContent />
    </Suspense>
  );
}
