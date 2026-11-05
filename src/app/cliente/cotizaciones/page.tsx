"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";
import { ClienteMobileNav } from "@/components/ClienteMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface QuoteLineItem {
  name: string;
  price: number;
  qty: number;
}

interface ClientQuoteRecord {
  dbId?: string;
  id: string;
  date: string;
  vehicle: string;
  status: string; // Pendiente, Aprobada, Rechazada
  items: QuoteLineItem[];
  notes: string;
}

export default function CotizacionesClientePage() {
  const [quotes, setQuotes] = useState<ClientQuoteRecord[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modal para crear nueva solicitud/cotización (POST)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState('Toyota Hilux 2020 (ABC-123)');
  const [newNotes, setNewNotes] = useState('');
  const [newItems, setNewItems] = useState<QuoteLineItem[]>([
    { name: 'Diagnóstico Computarizado', price: 45, qty: 1 },
  ]);

  // Modal para editar cotización existente (PUT)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState('');
  const [editStatus, setEditStatus] = useState('Pendiente');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<QuoteLineItem[]>([]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cliente/cotizaciones', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.cotizaciones)) {
        setQuotes(data.cotizaciones);
        if (data.cotizaciones.length > 0 && !selectedQuoteId) {
          setSelectedQuoteId(data.cotizaciones[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando cotizaciones desde Neon:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedQuoteId]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const activeQuote = quotes.find((q) => q.id === selectedQuoteId) || quotes[0] || null;

  const getSubtotal = (items: QuoteLineItem[]) =>
    (items || []).reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 1), 0);

  // APROBAR / RECHAZAR COTIZACIÓN EN NEON DB (PUT)
  const handleStatusChange = async (newStatus: 'Aprobada' | 'Rechazada' | 'Pendiente') => {
    if (!activeQuote) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cliente/cotizaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeQuote.id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar estado en Neon DB');
      }
      showToast(
        newStatus === 'Aprobada'
          ? `¡Cotización ${activeQuote.id} aprobada y orden generada en el Taller!`
          : `Cotización ${activeQuote.id} marcada como ${newStatus}.`
      );
      await fetchQuotes();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // CREAR NUEVA COTIZACIÓN EN NEON DB (POST)
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = newItems.filter((i) => i.name.trim() !== '');
    if (!newVehicle.trim() || validItems.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cliente/cotizaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: newVehicle.trim(),
          status: 'Pendiente',
          items: validItems,
          notes: newNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al crear cotización en Neon DB');
      }
      setIsNewModalOpen(false);
      setNewNotes('');
      setNewItems([{ name: 'Diagnóstico Computarizado', price: 45, qty: 1 }]);
      showToast(`Cotización ${data.cotizacion?.id || ''} creada en Neon DB.`);
      await fetchQuotes();
      if (data.cotizacion?.id) {
        setSelectedQuoteId(data.cotizacion.id);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ABRIR MODAL DE EDICIÓN COMPLETA (PUT)
  const openEditQuoteModal = () => {
    if (!activeQuote) return;
    setEditVehicle(activeQuote.vehicle);
    setEditStatus(activeQuote.status);
    setEditNotes(activeQuote.notes || '');
    setEditItems(activeQuote.items.map((i) => ({ ...i })));
    setIsEditModalOpen(true);
  };

  const handleSaveEditQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cliente/cotizaciones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeQuote.id,
          vehicle: editVehicle,
          status: editStatus,
          notes: editNotes,
          items: editItems.filter((i) => i.name.trim() !== ''),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar cotización');
      }
      setIsEditModalOpen(false);
      showToast(`Cotización ${activeQuote.id} actualizada en Neon DB.`);
      await fetchQuotes();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ELIMINAR COTIZACIÓN EN NEON DB (DELETE)
  const handleDeleteQuote = async (quoteId: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/cliente/cotizaciones?id=${encodeURIComponent(quoteId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar cotización');
      }
      showToast(`Cotización ${quoteId} eliminada de Neon DB.`);
      const remaining = quotes.filter((q) => q.id !== quoteId);
      setQuotes(remaining);
      if (selectedQuoteId === quoteId) {
        setSelectedQuoteId(remaining[0]?.id || '');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.notes && q.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'Todas' || q.status === statusFilter;
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
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6 flex justify-between items-center">
          <Link href="/cliente" className="text-sm font-medium text-purple-600 hover:text-purple-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cotizaciones Neon DB ({quotes.length})</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div className="flex items-center gap-3">
            <Link
              href="/cliente"
              title="Volver a Portal de Cliente"
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="w-12 h-12 rounded-xl bg-purple-500 bg-opacity-10 flex items-center justify-center text-2xl shrink-0">
              📝
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Mis Cotizaciones
              </h1>
              <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
                Revisa, solicita y aprueba presupuestos de tus vehículos en tiempo real.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="cursor-pointer min-h-[44px] h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 rounded-2xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 text-base sm:text-sm w-full sm:w-auto"
          >
            <span>+</span> Nueva Cotización
          </button>
        </div>

        {/* KPIs / Resumen Desplegable en Móvil */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-2 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-8">
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-500 dark:text-purple-400 flex items-center justify-center text-xl shrink-0">
                📝
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {quotes.length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Cotizaciones</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                ⏳
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {quotes.filter((q) => q.status === 'Pendiente').length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Pendientes</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                ✅
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {quotes.filter((q) => q.status === 'Aprobada').length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Aprobadas</h3>
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
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-zinc-400 shadow-sm"
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

          <div className="relative w-full sm:w-48 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal transition-all cursor-pointer shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="Todas">Estado</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Aprobada">Aprobadas</option>
              <option value="Rechazada">Rechazadas</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500">
            Cargando cotizaciones...
          </div>
        ) : quotes.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <p className="text-zinc-500 mb-4">No hay cotizaciones registradas.</p>
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="cursor-pointer px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm"
            >
              Crear Primera Cotización
            </button>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-sm text-zinc-500">
            No se encontraron cotizaciones con los filtros aplicados.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: List of Quotes */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-2">Presupuestos Recientes</h3>
              
              {filteredQuotes.map((quote) => {
                const isActive = activeQuote?.id === quote.id;
                const subtotal = getSubtotal(quote.items);
                const total = subtotal * 1.16;

                return (
                  <button 
                    key={quote.id}
                    onClick={() => setSelectedQuoteId(quote.id)}
                    className={`cursor-pointer text-left p-6 rounded-3xl border-2 transition-all flex flex-col gap-3 ${isActive ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-500/10 shadow-md' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm'}`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                          {quote.id}
                        </span>
                        <h4 className="font-bold text-zinc-900 dark:text-white mt-2">{quote.vehicle}</h4>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${
                        quote.status === 'Pendiente'
                          ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                          : quote.status === 'Rechazada'
                          ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                      }`}>
                        {quote.status}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-end w-full mt-2">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">{quote.date}</span>
                      <span className="font-black text-lg text-purple-600 dark:text-purple-400">${total.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Column: Quote Details */}
            <div className="lg:col-span-7">
              {activeQuote ? (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  
                  {/* Detail Header */}
                  <div className="p-6 md:p-8 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-1">
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                      <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Detalle del Presupuesto</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={openEditQuoteModal}
                          className="cursor-pointer min-h-[44px] text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3.5 py-2.5 rounded-xl transition-colors flex items-center justify-center"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuote(activeQuote.id)}
                          disabled={isSubmitting}
                          className="cursor-pointer min-h-[44px] text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 px-3.5 py-2.5 rounded-xl transition-colors flex items-center justify-center"
                        >
                          🗑️ Eliminar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== 'undefined') window.print();
                          }}
                          className="cursor-pointer min-h-[44px] text-xs font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20 px-3.5 py-2.5 rounded-xl transition-colors flex items-center justify-center"
                        >
                          📄 Descargar PDF
                        </button>
                      </div>
                    </div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{activeQuote.vehicle}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-mono text-sm">{activeQuote.id} • {activeQuote.date}</p>
                  </div>

                  {/* Items List */}
                  <div className="p-6 md:p-8 flex-grow overflow-x-auto">
                    
                    {activeQuote.notes && (
                      <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-300">
                        <span className="text-xl">⚠️</span>
                        <p className="text-sm font-medium leading-relaxed">{activeQuote.notes}</p>
                      </div>
                    )}

                    <table className="w-full text-left min-w-[320px]">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                          <th className="pb-3 font-bold">Concepto</th>
                          <th className="pb-3 font-bold text-center">Cant.</th>
                          <th className="pb-3 font-bold text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {activeQuote.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-4">
                              <p className="font-bold text-sm text-zinc-900 dark:text-white">{item.name}</p>
                              <p className="text-xs text-zinc-500">${Number(item.price).toFixed(2)} c/u</p>
                            </td>
                            <td className="py-4 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {item.qty}
                            </td>
                            <td className="py-4 text-right font-bold text-zinc-900 dark:text-white">
                              ${(Number(item.price) * Number(item.qty)).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals & Actions */}
                  <div className="p-6 md:p-8 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
                    <div className="w-full md:w-1/2 ml-auto space-y-2 text-sm mb-8">
                      <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                        <span>Subtotal</span>
                        <span>${getSubtotal(activeQuote.items).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                        <span>IVA (16%)</span>
                        <span>${(getSubtotal(activeQuote.items) * 0.16).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-2 flex justify-between items-center">
                        <span className="text-base font-bold text-zinc-900 dark:text-white">Total a Pagar</span>
                        <span className="text-3xl font-black text-purple-600 dark:text-purple-400">
                          ${(getSubtotal(activeQuote.items) * 1.16).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {activeQuote.status === 'Pendiente' ? (
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <button 
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleStatusChange('Rechazada')}
                          className="cursor-pointer flex-1 min-h-[48px] h-12 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 dark:hover:border-rose-500/30 transition-colors flex items-center justify-center text-base sm:text-sm"
                        >
                          Rechazar
                        </button>
                        <button 
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleStatusChange('Aprobada')}
                          className="cursor-pointer flex-1 min-h-[48px] h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 font-bold text-white transition-colors shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 text-base sm:text-sm"
                        >
                          <span>✓</span> {isSubmitting ? 'Procesando...' : 'Aprobar Trabajo'}
                        </button>
                      </div>
                    ) : activeQuote.status === 'Rechazada' ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full py-3.5 px-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 font-bold text-sm">
                        <span>❌ Este presupuesto fue rechazado</span>
                        <button
                          type="button"
                          onClick={() => handleStatusChange('Pendiente')}
                          className="cursor-pointer text-xs underline min-h-[44px] flex items-center"
                        >
                          Reabrir como Pendiente
                        </button>
                      </div>
                    ) : (
                      <div className="w-full py-4 min-h-[48px] rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 font-bold text-center flex justify-center items-center gap-2">
                        <span>✅</span> Este presupuesto ya fue aprobado en Neon DB
                      </div>
                    )}
                  </div>

                </div>
              ) : null}
            </div>

          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL: NUEVA COTIZACIÓN (POST NEON)                      */}
      {/* ======================================================== */}
      {isNewModalOpen && (
        <div
          onClick={() => setIsNewModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="cursor-pointer absolute top-4 right-4 w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-base sm:text-sm"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Solicitar / Crear Cotización
            </h3>
            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Vehículo
                </label>
                <input
                  type="text"
                  required
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    Conceptos / Repuestos
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewItems([...newItems, { name: '', price: 50, qty: 1 }])}
                    className="cursor-pointer text-xs font-bold text-purple-600 hover:underline min-h-[44px] inline-flex items-center"
                  >
                    + Añadir Concepto
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {newItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Concepto..."
                        required
                        value={it.name}
                        onChange={(e) => {
                          const copy = [...newItems];
                          copy[idx].name = e.target.value;
                          setNewItems(copy);
                        }}
                        className="col-span-6 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-xs min-h-[44px] text-zinc-900 dark:text-white"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Precio"
                        required
                        value={it.price}
                        onChange={(e) => {
                          const copy = [...newItems];
                          copy[idx].price = Number(e.target.value);
                          setNewItems(copy);
                        }}
                        className="col-span-3 px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-xs min-h-[44px] text-zinc-900 dark:text-white"
                      />
                      <input
                        type="number"
                        min={1}
                        required
                        value={it.qty}
                        onChange={(e) => {
                          const copy = [...newItems];
                          copy[idx].qty = Number(e.target.value);
                          setNewItems(copy);
                        }}
                        className="col-span-2 px-2 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-xs min-h-[44px] text-zinc-900 dark:text-white text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}
                        disabled={newItems.length <= 1}
                        className="col-span-1 text-rose-500 font-bold text-sm disabled:opacity-30 min-h-[44px] min-w-[32px] flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Observaciones / Notas Técnicas
                </label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Describe el síntoma o requerimiento..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm text-zinc-900 dark:text-white resize-none"
                />
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
                  disabled={isSubmitting}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-base sm:text-sm flex items-center justify-center"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar en Neon DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR COTIZACIÓN (PUT NEON)                      */}
      {/* ======================================================== */}
      {isEditModalOpen && activeQuote && (
        <div
          onClick={() => setIsEditModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="cursor-pointer absolute top-4 right-4 w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-base sm:text-sm"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Editar Cotización {activeQuote.id}
            </h3>
            <form onSubmit={handleSaveEditQuote} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Vehículo
                  </label>
                  <input
                    type="text"
                    required
                    value={editVehicle}
                    onChange={(e) => setEditVehicle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Estado
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aprobada">Aprobada</option>
                    <option value="Rechazada">Rechazada</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400">
                    Conceptos
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditItems([...editItems, { name: '', price: 50, qty: 1 }])}
                    className="cursor-pointer text-xs font-bold text-purple-600 hover:underline min-h-[44px] inline-flex items-center"
                  >
                    + Añadir Concepto
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {editItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        required
                        value={it.name}
                        onChange={(e) => {
                          const copy = [...editItems];
                          copy[idx].name = e.target.value;
                          setEditItems(copy);
                        }}
                        className="col-span-6 px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-xs min-h-[44px] text-zinc-900 dark:text-white"
                      />
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={it.price}
                        onChange={(e) => {
                          const copy = [...editItems];
                          copy[idx].price = Number(e.target.value);
                          setEditItems(copy);
                        }}
                        className="col-span-3 px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-xs min-h-[44px] text-zinc-900 dark:text-white"
                      />
                      <input
                        type="number"
                        min={1}
                        required
                        value={it.qty}
                        onChange={(e) => {
                          const copy = [...editItems];
                          copy[idx].qty = Number(e.target.value);
                          setEditItems(copy);
                        }}
                        className="col-span-2 px-2 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-xs min-h-[44px] text-zinc-900 dark:text-white text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                        disabled={editItems.length <= 1}
                        className="col-span-1 text-rose-500 font-bold text-sm disabled:opacity-30 min-h-[44px] min-w-[32px] flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Notas
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-base sm:text-sm flex items-center justify-center text-zinc-700 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-base sm:text-sm flex items-center justify-center"
                >
                  {isSubmitting ? 'Guardando...' : 'Actualizar Cotización'}
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
