"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";
import { ClienteMobileNav } from "@/components/ClienteMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { Paginacion, paginarLista } from "@/components/Paginacion";

interface VehicleOption {
  id: string;
  name: string;
  plate: string;
}

type ServiceOption = { id: string; name: string; time: string; category?: string };

interface ClientAppointmentItem {
  id: string;
  code: string;
  vehicleId: string | null;
  vehicleName: string;
  plate: string;
  serviceId: string | null;
  serviceName: string;
  preferredDate: string;
  preferredTime: string;
  comments: string | null;
  status: string;
  createdAt: string;
}

const SERVICES: ServiceOption[] = [
  { id: 'SRV-01', name: 'Mantenimiento Preventivo (Cambio de aceite, filtros)', time: '1-2 hrs' },
  { id: 'SRV-02', name: 'Revisión General y Diagnóstico', time: '1 hr' },
  { id: 'SRV-03', name: 'Cambio de Pastillas de Freno', time: '2 hrs' },
  { id: 'SRV-04', name: 'Alineación y Balanceo', time: '1 hr' },
  { id: 'SRV-05', name: 'Otro (Especificar en comentarios)', time: 'Variable' },
];

export default function AgendarCitaPage() {
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [appointments, setAppointments] = useState<ClientAppointmentItem[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [searchAppointments, setSearchAppointments] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');

  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [searchService, setSearchService] = useState('');
  const [servicesList, setServicesList] = useState(SERVICES);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [comments, setComments] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Estado para editar cita existente (CRUD PUT)
  const [editingCita, setEditingCita] = useState<ClientAppointmentItem | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editService, setEditService] = useState('');
  const [editStatus, setEditStatus] = useState('Pendiente');
  const [editComments, setEditComments] = useState('');

  // Confirmación de borrado (CRUD DELETE)
  const [citaToDelete, setCitaToDelete] = useState<ClientAppointmentItem | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchAppointments = useCallback(async () => {
    try {
      setLoadingAppointments(true);
      const res = await fetch('/api/cliente/citas', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.citas)) {
        setAppointments(data.citas);
      }
    } catch (err) {
      console.error('Error cargando citas de base de datos:', err);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  // Cargar vehículos reales desde Neon y catálogo de servicios
  useEffect(() => {
    fetchAppointments();

    fetch('/api/vehiculos', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.vehiculos) && data.vehiculos.length > 0) {
          const mapped: VehicleOption[] = data.vehiculos.map((v: any) => ({
            id: v.id,
            name: `${v.brand} ${v.model} ${v.year || ''}`.trim(),
            plate: v.plate,
          }));
          setVehicles(mapped);
          setSelectedVehicle(mapped[0].id);
        }
      })
      .catch((err) => console.error('Error cargando vehículos para citas:', err));

    fetch('/api/servicios-taller?activos=true')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.servicios) && data.servicios.length > 0) {
          const mapped = data.servicios.map((s: any) => ({
            id: s.code || s.id,
            name: s.name,
            time: s.estimatedMinutes ? `${s.estimatedMinutes} min` : '30-45 min',
            category: s.category || 'Taller',
          }));
          mapped.push({
            id: 'SRV-OTRO',
            name: 'Otro (Especificar en comentarios)',
            time: 'Variable',
            category: 'Personalizado',
          });
          setServicesList(mapped);
        }
      })
      .catch((err) => console.error('Error cargando servicios para citas:', err));
  }, [fetchAppointments]);

  const filteredServices = servicesList.filter((s) => {
    if (!searchService.trim()) return true;
    const term = searchService.toLowerCase();
    return s.name.toLowerCase().includes(term) || (s.category && s.category.toLowerCase().includes(term));
  });

  // CREAR CITA (POST /api/cliente/citas)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vehObj = vehicles.find((v) => v.id === selectedVehicle);
    const srvObj = servicesList.find((s) => s.id === selectedService);
    if (!vehObj || !srvObj) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cliente/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehObj.id,
          vehicleName: vehObj.name,
          plate: vehObj.plate,
          serviceId: srvObj.id,
          serviceName: srvObj.name,
          preferredDate: selectedDate,
          preferredTime: selectedTime,
          comments,
          status: 'Pendiente',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al registrar cita en base de datos');
      }
      await fetchAppointments();
      setIsSubmitted(true);
      showToast(`Cita ${data.cita?.code || ''} guardada correctamente.`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ABRIR MODAL DE EDICIÓN (PUT)
  const handleOpenEdit = (cita: ClientAppointmentItem) => {
    setEditingCita(cita);
    setEditDate(cita.preferredDate);
    setEditTime(cita.preferredTime);
    setEditService(cita.serviceName);
    setEditStatus(cita.status);
    setEditComments(cita.comments || '');
  };

  const handleUpdateCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCita) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cliente/citas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCita.id,
          preferredDate: editDate,
          preferredTime: editTime,
          serviceName: editService,
          status: editStatus,
          comments: editComments,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar cita');
      }
      setEditingCita(null);
      showToast(`Cita ${editingCita.code} actualizada correctamente.`);
      fetchAppointments();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ELIMINAR CITA (DELETE)
  const handleDeleteCita = async () => {
    if (!citaToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/cliente/citas?id=${encodeURIComponent(citaToDelete.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar cita');
      }
      showToast(`Cita ${citaToDelete.code} eliminada correctamente.`);
      setCitaToDelete(null);
      fetchAppointments();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAppointments = appointments.filter((c) => {
    const matchesSearch =
      c.vehicleName.toLowerCase().includes(searchAppointments.toLowerCase()) ||
      c.plate.toLowerCase().includes(searchAppointments.toLowerCase()) ||
      c.serviceName.toLowerCase().includes(searchAppointments.toLowerCase()) ||
      c.code.toLowerCase().includes(searchAppointments.toLowerCase());
    const matchesStatus = statusFilter === 'Todas' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const [paginaActual, setPaginaActual] = useState(1);
  useEffect(() => {
    setPaginaActual(1);
  }, [searchAppointments, statusFilter]);

  const { itemsPaginados: appointmentsPaginados, paginaValida } = paginarLista(
    filteredAppointments,
    paginaActual
  );

  if (isSubmitted) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-12 max-w-lg w-full text-center border border-zinc-200 dark:border-zinc-800 shadow-xl">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-4xl sm:text-5xl mx-auto mb-6">
              ✓
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white mb-4">Cita guardada</h2>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base mb-8">
              Tu solicitud ha sido registrada con éxito. Nos contactaremos pronto para confirmar tu asistencia.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button 
                onClick={() => {
                  setIsSubmitted(false);
                  setComments('');
                }}
                className="cursor-pointer min-h-[44px] h-11 px-6 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-base sm:text-sm flex items-center justify-center"
              >
                Ver Mis Citas / Agendar Otra
              </button>
              <Link 
                href="/cliente"
                className="min-h-[44px] h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-lg shadow-emerald-500/20 text-base sm:text-sm flex items-center justify-center"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        </main>
        <ClienteMobileNav />
      </div>
    );
  }

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
          <Link href="/cliente" className="text-sm font-medium text-emerald-600 hover:text-emerald-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Citas registradas ({appointments.length})</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex items-center gap-3 mb-10">
          <Link
            href="/cliente"
            title="Volver a Portal de Cliente"
            className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="w-12 h-12 rounded-xl bg-emerald-500 bg-opacity-10 flex items-center justify-center text-2xl shrink-0">
            📅
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Citas y Agenda
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Programa una nueva visita o administra tus citas registradas en tiempo real.
            </p>
          </div>
        </div>

        {/* KPIs / Resumen Desplegable en Móvil */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-2 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-8">
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                📅
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {appointments.length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Citas Totales</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-teal-500/15 border border-teal-500/25 text-teal-500 dark:text-teal-400 flex items-center justify-center text-xl shrink-0">
                ✅
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-teal-600 dark:text-teal-400">
                  {appointments.filter((c) => c.status === 'Confirmada').length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Confirmadas</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                ⏳
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {appointments.filter((c) => c.status === 'Pendiente').length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Pendientes</h3>
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
              value={searchAppointments}
              onChange={(e) => setSearchAppointments(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-zinc-400 shadow-sm"
            />
            {searchAppointments && (
              <button
                type="button"
                onClick={() => setSearchAppointments('')}
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
              className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal transition-all cursor-pointer shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Todas">Estado</option>
              <option value="Confirmada">Confirmadas</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Cancelada">Canceladas</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Mis Citas Programadas (CRUD Read / Update / Delete) */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <span>📋</span> Mis Citas Programadas
            </h2>
            <button
              type="button"
              onClick={fetchAppointments}
              className="cursor-pointer text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              ↻ Actualizar
            </button>
          </div>

          {loadingAppointments ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-sm text-zinc-500">
              Cargando citas...
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-sm text-zinc-500">
              No tienes citas programadas actualmente. Usa el formulario inferior para agendar una.
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-sm text-zinc-500">
              No se encontraron citas con los filtros aplicados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointmentsPaginados.map((cita) => (
                <div
                  key={cita.id}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm flex flex-col justify-between gap-4 hover:border-emerald-400 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {cita.code}
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          cita.status === 'Confirmada'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            : cita.status === 'Cancelada'
                            ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                            : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                        }`}
                      >
                        {cita.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {cita.vehicleName} <span className="font-mono text-xs text-zinc-500">({cita.plate})</span>
                    </h3>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                      🔧 {cita.serviceName}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-3">
                      <span>📅 Fecha: <strong className="text-zinc-800 dark:text-zinc-200">{cita.preferredDate}</strong></span>
                      <span>⏰ Hora: <strong className="text-zinc-800 dark:text-zinc-200">{cita.preferredTime}</strong></span>
                    </div>
                    {cita.comments && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 italic bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        &ldquo;{cita.comments}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cita)}
                      className="cursor-pointer min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-colors flex items-center justify-center"
                    >
                      ✏️ Editar / Reprogramar
                    </button>
                    <button
                      type="button"
                      onClick={() => setCitaToDelete(cita)}
                      className="cursor-pointer min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center justify-center"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loadingAppointments && filteredAppointments.length > 0 && (
            <div className="mt-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
              <Paginacion
                paginaActual={paginaValida}
                totalElementos={filteredAppointments.length}
                onCambiarPagina={setPaginaActual}
                className="border-t-0"
              />
            </div>
          )}
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-6 md:px-10 pt-8 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Solicitar Nueva Cita</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Completa los 4 pasos para registrar tu cita en el taller.</p>
          </div>
          <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8">
            
            {/* Step 1: Vehicle */}
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">1</span>
                ¿Qué vehículo requiere atención?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {vehicles.map((v) => (
                  <label 
                    key={v.id} 
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${selectedVehicle === v.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                  >
                    <input 
                      type="radio" 
                      name="vehicle" 
                      className="hidden"
                      value={v.id}
                      checked={selectedVehicle === v.id}
                      onChange={() => setSelectedVehicle(v.id)}
                    />
                    <div className="font-bold text-zinc-900 dark:text-white mb-1">{v.name}</div>
                    <div className="text-sm font-mono text-zinc-500 dark:text-zinc-400">{v.plate}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2: Service */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">2</span>
                  ¿Qué servicio necesitas?
                </h3>
                {selectedService && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 w-fit">
                    ✓ 1 seleccionado
                  </span>
                )}
              </div>

              {/* Buscador de servicios */}
              <div className="mb-3 relative">
                <input
                  type="text"
                  placeholder="Buscar servicio (ej. aceite, frenos, diagnóstico, lavado)..."
                  value={searchService}
                  onChange={(e) => setSearchService(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] focus:outline-none focus:border-emerald-500 dark:text-white transition-all font-medium"
                />
                <span className="absolute left-3.5 top-3.5 text-zinc-400">🔍</span>
                {searchService && (
                  <button
                    type="button"
                    onClick={() => setSearchService('')}
                    className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 -mt-1.5"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Lista interactiva de servicios */}
              <div className="grid grid-cols-1 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {filteredServices.map((s) => {
                  const isSelected = selectedService === s.id;
                  return (
                    <label 
                      key={s.id} 
                      className={`cursor-pointer p-4 min-h-[48px] rounded-xl border-2 transition-all flex justify-between items-center gap-3 ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/15 shadow-sm ring-1 ring-emerald-500/30' 
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input 
                          type="radio" 
                          name="service" 
                          className="w-5 h-5 accent-emerald-500 flex-shrink-0 cursor-pointer"
                          value={s.id}
                          checked={isSelected}
                          onChange={() => setSelectedService(s.id)}
                        />
                        <div className="min-w-0">
                          <span className={`font-bold text-sm sm:text-base block truncate ${isSelected ? 'text-emerald-900 dark:text-emerald-200' : 'text-zinc-900 dark:text-white'}`}>
                            {s.name}
                          </span>
                          {s.category && (
                            <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                              {s.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                          ⏱️ {s.time}
                        </span>
                        {isSelected && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-base font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}

                {filteredServices.length === 0 && (
                  <div className="p-6 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                      No se encontró ningún servicio con &quot;{searchService}&quot;
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedService('SRV-OTRO');
                        setSearchService('');
                      }}
                      className="text-xs font-bold text-emerald-600 hover:underline min-h-[44px] inline-flex items-center"
                    >
                      Seleccionar &quot;Otro (Especificar en comentarios)&quot;
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Date & Time */}
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">3</span>
                Fecha y Hora de Preferencia
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Fecha Sugerida</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-emerald-500 dark:text-white font-medium text-base sm:text-sm min-h-[44px]"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Hora Sugerida</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-emerald-500 dark:text-white font-medium text-base sm:text-sm min-h-[44px]"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  >
                    <option value="">Selecciona un horario...</option>
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="12:00 PM">12:00 PM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 4: Comments */}
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">4</span>
                Detalles Adicionales (Opcional)
              </h3>
              <textarea 
                placeholder="Ej. Hay un ruido extraño al frenar..."
                className="w-full px-4 py-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-emerald-500 transition-all dark:text-white resize-none h-32 text-base sm:text-sm"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                type="submit"
                disabled={isSubmitting || !selectedVehicle || !selectedService || !selectedDate || !selectedTime}
                className="cursor-pointer w-full md:w-auto ml-auto block bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-base sm:text-lg font-bold px-10 py-4 min-h-[48px] rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Guardando...' : 'Solicitar Cita'}
              </button>
            </div>

          </form>
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL: EDITAR / REPROGRAMAR CITA (PUT NEON)              */}
      {/* ======================================================== */}
      {editingCita && (
        <div
          onClick={() => setEditingCita(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <button
              type="button"
              onClick={() => setEditingCita(null)}
              className="cursor-pointer absolute top-4 right-4 w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-base sm:text-sm"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">
              Editar Cita {editingCita.code}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
              {editingCita.vehicleName} ({editingCita.plate})
            </p>

            <form onSubmit={handleUpdateCita} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Servicio
                </label>
                <input
                  type="text"
                  required
                  value={editService}
                  onChange={(e) => setEditService(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Hora
                  </label>
                  <input
                    type="text"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
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
                  <option value="Confirmada">Confirmada</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Comentarios
                </label>
                <textarea
                  rows={3}
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm text-zinc-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCita(null)}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-base sm:text-sm text-zinc-700 dark:text-zinc-300 flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base sm:text-sm flex items-center justify-center"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN DE CITA (DELETE NEON)       */}
      {/* ======================================================== */}
      {citaToDelete && (
        <div
          onClick={() => setCitaToDelete(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center text-2xl mx-auto mb-4">
              🗑️
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
              ¿Eliminar Cita {citaToDelete.code}?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
              Se eliminará permanentemente la cita para <strong>{citaToDelete.vehicleName}</strong>.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCitaToDelete(null)}
                className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-base sm:text-sm flex items-center justify-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteCita}
                className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base sm:text-sm flex items-center justify-center"
              >
                {isSubmitting ? 'Borrando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navegación móvil fija */}
      <ClienteMobileNav />
    </div>
  );
}
