"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";
import { ClienteMobileNav } from "@/components/ClienteMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

// Estructura del Vehículo en Neon PostgreSQL
interface NeonVehicle {
  id: string;
  customerId: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  mileage: number | null;
  vin: string | null;
  fuelType: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    identification: string;
  };
}

const SERVICES_LIST = [
  { id: 'SRV-01', name: 'Mantenimiento Preventivo (Aceite y Filtros)', time: '1-2 hrs' },
  { id: 'SRV-02', name: 'Revisión General y Diagnóstico Computarizado', time: '1 hr' },
  { id: 'SRV-03', name: 'Servicio de Frenos (Pastillas / Discos)', time: '2 hrs' },
  { id: 'SRV-04', name: 'Alineación, Balanceo y Suspensión', time: '1.5 hrs' },
  { id: 'SRV-05', name: 'Sistema de Climatización (A/C)', time: '1 hr' },
  { id: 'SRV-06', name: 'Otro Servicio Mecánico o Eléctrico', time: 'Variable' },
];

export default function MisVehiculosPage() {
  const [vehicles, setVehicles] = useState<NeonVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('Todas');
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modales
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<NeonVehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<NeonVehicle | null>(null);
  const [appointmentVehicle, setAppointmentVehicle] = useState<NeonVehicle | null>(null);

  // Estados de formulario (Crear / Editar)
  const [formPlate, setFormPlate] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState('2022');
  const [formMileage, setFormMileage] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formFuelType, setFormFuelType] = useState('Gasolina');
  const [formVin, setFormVin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Estados de Agendar Cita (Panel Lateral)
  const [selectedService, setSelectedService] = useState('SRV-01');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('Mañana (08:30 AM - 11:30 AM)');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [appointmentSuccess, setAppointmentSuccess] = useState(false);

  // Notificación flotante
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3800);
  };

  // Cargar vehículos desde Neon (READ)
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/vehiculos');
      const data = await res.json();

      if (data.success && Array.isArray(data.vehicles)) {
        setVehicles(data.vehicles);
      } else {
        throw new Error(data.error || 'No se pudieron cargar los vehículos');
      }
    } catch (err: any) {
      console.error('Error fetching vehicles:', err);
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Determinar ícono según modelo/tipo
  const getVehicleIcon = (brand: string, model: string) => {
    const text = `${brand} ${model}`.toLowerCase();
    if (text.includes('hilux') || text.includes('pickup') || text.includes('truck')) return '🚙';
    if (text.includes('escape') || text.includes('suv') || text.includes('rav4') || text.includes('cr-v')) return '🚙';
    return '🚗';
  };

  // Estado dinámico según kilometraje
  const getVehicleStatus = (mileage: number | null) => {
    if (!mileage) return { label: 'Al Día', style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' };
    if (mileage > 60000) return { label: 'Mantenimiento Próximo', style: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' };
    if (mileage % 10000 > 8000) return { label: 'En Taller', style: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30' };
    return { label: 'Al Día', style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' };
  };

  // Abrir modal de creación
  const openCreateModal = () => {
    setFormPlate('');
    setFormBrand('');
    setFormModel('');
    setFormYear('2022');
    setFormMileage('');
    setFormColor('');
    setFormFuelType('Gasolina');
    setFormVin('');
    setFormError(null);
    setIsAddVehicleOpen(true);
  };

  // Abrir modal de edición
  const openEditModal = (vehicle: NeonVehicle) => {
    setEditingVehicle(vehicle);
    setFormPlate(vehicle.plate);
    setFormBrand(vehicle.brand);
    setFormModel(vehicle.model);
    setFormYear(vehicle.year ? String(vehicle.year) : '2022');
    setFormMileage(vehicle.mileage !== null ? String(vehicle.mileage) : '');
    setFormColor(vehicle.color || '');
    setFormFuelType(vehicle.fuelType || 'Gasolina');
    setFormVin(vehicle.vin || '');
    setFormError(null);
  };

  // Guardar nuevo vehículo en Neon (CREATE)
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/vehiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate: formPlate,
          brand: formBrand,
          model: formModel,
          year: formYear ? parseInt(formYear, 10) : null,
          mileage: formMileage ? parseInt(formMileage, 10) : 0,
          color: formColor || null,
          fuelType: formFuelType,
          vin: formVin || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar vehículo');
      }

      showToast(`¡Vehículo ${formBrand} ${formModel} (${data.vehicle.plate}) guardado correctamente!`);
      setIsAddVehicleOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.message || 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actualizar vehículo existente en Neon (UPDATE)
  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/vehiculos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingVehicle.id,
          plate: formPlate,
          brand: formBrand,
          model: formModel,
          year: formYear ? parseInt(formYear, 10) : null,
          mileage: formMileage ? parseInt(formMileage, 10) : 0,
          color: formColor || null,
          fuelType: formFuelType,
          vin: formVin || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar vehículo');
      }

      showToast(`¡Vehículo ${data.vehicle.plate} actualizado correctamente!`);
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.message || 'Error al actualizar vehículo');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar vehículo de Neon (DELETE)
  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/vehiculos?id=${encodeURIComponent(vehicleToDelete.id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar vehículo');
      }

      showToast(`Vehículo ${vehicleToDelete.plate} eliminado correctamente.`);
      setVehicleToDelete(null);
      fetchVehicles();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Abrir panel lateral de Agendar Cita
  const handleOpenAppointment = (vehicle: NeonVehicle) => {
    setAppointmentVehicle(vehicle);
    setAppointmentSuccess(false);
    setSelectedDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
    setAppointmentNotes('');
  };

  const handleSubmitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentVehicle) return;
    setIsSubmitting(true);
    try {
      const srvObj = SERVICES_LIST.find((s) => s.id === selectedService);
      const res = await fetch('/api/cliente/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: appointmentVehicle.id,
          vehicleName: `${appointmentVehicle.brand} ${appointmentVehicle.model} ${appointmentVehicle.year || ''}`.trim(),
          plate: appointmentVehicle.plate,
          serviceId: selectedService,
          serviceName: srvObj ? srvObj.name : selectedService,
          preferredDate: selectedDate,
          preferredTime: selectedTimeSlot,
          comments: appointmentNotes,
          status: 'Pendiente',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo guardar la cita');
      }
      setAppointmentSuccess(true);
      showToast(`Cita ${data.cita?.code || ''} registrada.`);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.vin && v.vin.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBrand = brandFilter === 'Todas' || v.brand === brandFilter;
    return matchesSearch && matchesBrand;
  });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      {/* Notificación Toast flotante */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-bottom duration-200">
          <span className="text-emerald-400">✓</span>
          <span>{notification}</span>
        </div>
      )}

      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6 flex justify-between items-center">
          <Link href="/cliente" className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center gap-1 w-fit min-h-[44px] sm:min-h-0 items-center">
            &larr; Volver a Portal de Cliente
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Vehículos ({vehicles.length})</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8 sm:mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/cliente"
                title="Volver a Portal de Cliente"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="w-12 h-12 rounded-xl bg-blue-500 bg-opacity-10 flex items-center justify-center text-2xl shrink-0">
                🚗
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Mis Vehículos
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 sm:px-6 h-11 rounded-xl font-medium transition-colors shadow-sm flex items-center justify-center gap-2 hover:shadow-md active:scale-[0.98] w-full sm:w-auto"
          >
            <span className="text-xl leading-none font-bold">+</span> Agregar Vehículo
          </button>
        </div>

        {/* KPIs / Resumen Desplegable en Móvil */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-2 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-8">
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-500 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
                🚗
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {vehicles.length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Vehículos</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                ✅
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {vehicles.filter((v) => (v.mileage || 0) < 50000).length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Al Día</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                ⚠️
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {vehicles.filter((v) => (v.mileage || 0) >= 50000).length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Mantenimiento</h3>
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
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm"
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
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal transition-all cursor-pointer shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todas">Marca</option>
              {Array.from(new Set(vehicles.map((v) => v.brand).filter(Boolean))).map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Estado de Carga */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 animate-pulse space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800"></div>
                  <div className="w-20 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>
                </div>
                <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>
                  <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estado de Error */}
        {error && !loading && (
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-8 text-center my-6">
            <span className="text-4xl block mb-2">⚠️</span>
            <h3 className="text-lg font-bold text-rose-800 dark:text-rose-400 mb-1">Error de conexión</h3>
            <p className="text-sm text-rose-600 dark:text-rose-400/80 mb-4">{error}</p>
            <button
              onClick={fetchVehicles}
              className="cursor-pointer px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              Reintentar Conexión
            </button>
          </div>
        )}

        {/* Vehicles Grid (Neon DB) */}
        {!loading && !error && (
          filteredVehicles.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-sm text-zinc-500">
              No se encontraron vehículos con los filtros aplicados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle) => {
              const statusInfo = getVehicleStatus(vehicle.mileage);
              const icon = getVehicleIcon(vehicle.brand, vehicle.model);

              return (
                <div
                  key={vehicle.id}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col relative group"
                >
                  {/* Card Header */}
                  <div className="p-6 pb-0 flex justify-between items-start">
                    <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-4xl shadow-inner">
                      {icon}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${statusInfo.style}`}>
                        {statusInfo.label}
                      </span>
                      {/* Botones rápidos de Editar y Eliminar (CRUD) */}
                      <div className="flex gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEditModal(vehicle)}
                          title="Editar vehículo"
                          className="cursor-pointer p-1.5 rounded-lg bg-zinc-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors text-xs"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => setVehicleToDelete(vehicle)}
                          title="Eliminar vehículo"
                          className="cursor-pointer p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors text-xs"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-grow">
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-1">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium mb-6 flex-wrap">
                      <span>{vehicle.year || 'S/A'}</span>
                      <span>•</span>
                      <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 font-mono text-zinc-700 dark:text-zinc-300 tracking-wider">
                        {vehicle.plate}
                      </span>
                      {vehicle.fuelType && (
                        <>
                          <span>•</span>
                          <span className="text-xs text-zinc-500">{vehicle.fuelType}</span>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
                          <span>⏲️</span> Kilometraje
                        </p>
                        <p className="font-bold text-zinc-900 dark:text-white">
                          {vehicle.mileage !== null ? vehicle.mileage.toLocaleString() : '0'}{' '}
                          <span className="text-xs font-normal">km</span>
                        </p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 flex items-center gap-1">
                          <span>📅</span> Próx. Servicio
                        </p>
                        <p className="font-bold text-zinc-900 dark:text-white text-sm">
                          {vehicle.mileage && vehicle.mileage > 60000 ? '15 Nov 2023' : '15 Oct 2023'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer - Botones de Acción */}
                  <div className="p-6 pt-0 mt-auto">
                    <div className="flex gap-3">
                      <Link
                        href={`/cliente/historial?vehiculo=${encodeURIComponent(vehicle.brand + ' ' + vehicle.model)}`}
                        className="cursor-pointer flex-1 h-11 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs sm:text-sm text-center flex items-center justify-center active:scale-[0.98]"
                      >
                        Ver Historial
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleOpenAppointment(vehicle)}
                        className="cursor-pointer flex-1 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 font-bold text-blue-600 dark:text-blue-400 transition-colors text-xs sm:text-sm text-center flex items-center justify-center active:scale-[0.98]"
                      >
                        Agendar Cita
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

              {/* Add New Vehicle Card Placeholder */}
              <button
                type="button"
                onClick={openCreateModal}
                className="cursor-pointer bg-transparent border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl p-6 flex flex-col items-center justify-center text-zinc-500 hover:text-blue-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all min-h-[320px] group"
              >
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
                  +
                </div>
                <h3 className="font-bold text-lg mb-1">Agregar otro vehículo</h3>
                <p className="text-sm text-center max-w-[200px]">
                  Registra tu vehículo en el sistema.
                </p>
              </button>
            </div>
          )
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR NUEVO VEHÍCULO (NEON CREATE)            */}
      {/* ======================================================== */}
      {isAddVehicleOpen && (
        <div 
          onClick={() => setIsAddVehicleOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setIsAddVehicleOpen(false)}
              className="cursor-pointer absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center font-bold text-lg"
            >
              ✕
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🚗</span>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Registrar Vehículo</h2>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Ingresa los datos para registrar el vehículo.
              </p>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Marca *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Toyota"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Hilux / Yaris"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Año
                  </label>
                  <input
                    type="number"
                    min="1990"
                    max="2030"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Placa / Patente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. ABC-123"
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Kilometraje Actual (km)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej. 45000"
                    value={formMileage}
                    onChange={(e) => setFormMileage(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Combustible
                  </label>
                  <select
                    value={formFuelType}
                    onChange={(e) => setFormFuelType(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Gasolina">Gasolina</option>
                    <option value="Diésel">Diésel</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="Eléctrico">Eléctrico</option>
                    <option value="GLP / GNC">GLP / GNC</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="cursor-pointer h-11 px-5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors text-sm shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDITAR VEHÍCULO (NEON UPDATE)                     */}
      {/* ======================================================== */}
      {editingVehicle && (
        <div 
          onClick={() => setEditingVehicle(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setEditingVehicle(null)}
              className="cursor-pointer absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center font-bold text-lg"
            >
              ✕
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">✏️</span>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Editar Vehículo</h2>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Actualiza los datos del vehículo.
              </p>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateVehicle} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Marca
                  </label>
                  <input
                    type="text"
                    required
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Modelo
                  </label>
                  <input
                    type="text"
                    required
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Año
                  </label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Placa
                  </label>
                  <input
                    type="text"
                    required
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Kilometraje (km)
                  </label>
                  <input
                    type="number"
                    value={formMileage}
                    onChange={(e) => setFormMileage(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Combustible
                  </label>
                  <select
                    value={formFuelType}
                    onChange={(e) => setFormFuelType(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Gasolina">Gasolina</option>
                    <option value="Diésel">Diésel</option>
                    <option value="Híbrido">Híbrido</option>
                    <option value="Eléctrico">Eléctrico</option>
                    <option value="GLP / GNC">GLP / GNC</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="cursor-pointer h-11 px-5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors text-sm shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN (NEON DELETE)               */}
      {/* ======================================================== */}
      {vehicleToDelete && (
        <div 
          onClick={() => setVehicleToDelete(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative"
          >
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-3xl mx-auto mb-4">
              🗑️
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              ¿Eliminar Vehículo?
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              Se eliminará <strong className="text-zinc-900 dark:text-white">{vehicleToDelete.brand} {vehicleToDelete.model}</strong> ({vehicleToDelete.plate}) de forma permanente.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
                className="cursor-pointer flex-1 h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm flex items-center justify-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteVehicle}
                className="cursor-pointer flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? 'Borrando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PANEL LATERAL DERECHO: AGENDAR CITA                      */}
      {/* ======================================================== */}
      {appointmentVehicle && (
        <div 
          onClick={() => setAppointmentVehicle(null)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-stretch sm:justify-end animate-in fade-in duration-300"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-none w-full max-w-md sm:max-w-lg max-h-[90vh] sm:max-h-none h-auto sm:h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 md:p-8 animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 relative"
          >
            {/* Header del Panel Lateral */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-2xl">
                  📅
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Agendar Cita</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Programa tu visita al taller de manera rápida.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAppointmentVehicle(null)}
                className="cursor-pointer w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-base transition-colors"
                title="Cerrar panel"
              >
                ✕
              </button>
            </div>

            {appointmentSuccess ? (
              <div className="flex-grow flex flex-col justify-center items-center text-center py-6">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-4xl mb-5">
                  ✓
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                  ¡Cita Solicitada con Éxito!
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm max-w-sm mx-auto mb-6">
                  Hemos registrado la solicitud para tu <strong className="text-zinc-900 dark:text-white">{appointmentVehicle.brand} {appointmentVehicle.model}</strong> ({appointmentVehicle.plate}).
                  Nos contactaremos para confirmar tu llegada.
                </p>

                <div className="w-full bg-zinc-50 dark:bg-zinc-800/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 text-left text-sm space-y-2.5 mb-8">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Vehículo:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{appointmentVehicle.brand} {appointmentVehicle.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Fecha solicitada:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Horario:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">{selectedTimeSlot}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Servicio:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {SERVICES_LIST.find(s => s.id === selectedService)?.name.split(' (')[0]}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    onClick={() => setAppointmentVehicle(null)}
                    className="cursor-pointer flex-1 min-h-[44px] h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors text-base sm:text-sm shadow-sm flex items-center justify-center"
                  >
                    Cerrar
                  </button>
                  <Link
                    href="/cliente/citas"
                    className="flex-1 min-h-[44px] h-11 px-6 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-base sm:text-sm text-center flex items-center justify-center"
                  >
                    Ver mis citas
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAppointment} className="flex-grow flex flex-col justify-between">
                <div className="space-y-5">
                  {/* Vehículo seleccionado */}
                  <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-800 flex items-center justify-center text-2xl shadow-sm shrink-0">
                        {getVehicleIcon(appointmentVehicle.brand, appointmentVehicle.model)}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white text-sm">
                          {appointmentVehicle.brand} {appointmentVehicle.model} ({appointmentVehicle.year || 'S/A'})
                        </p>
                        <p className="text-xs font-mono text-blue-700 dark:text-blue-400">
                          Placa: {appointmentVehicle.plate} • {appointmentVehicle.mileage || 0} km
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      Auto Activo
                    </span>
                  </div>

                  {/* Servicio */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                      Servicio Requerido
                    </label>
                    <select
                      value={selectedService}
                      onChange={(e) => setSelectedService(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm min-h-[44px] focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {SERVICES_LIST.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                      Fecha Preferida
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm min-h-[44px] focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Horario */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                      Franja Horaria
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        'Mañana (08:30 AM - 11:30 AM)',
                        'Mediodía (11:30 AM - 02:00 PM)',
                        'Tarde (02:00 PM - 05:30 PM)'
                      ].map((slot) => (
                        <label
                          key={slot}
                          className={`cursor-pointer p-3 min-h-[44px] rounded-xl border text-xs sm:text-xs font-semibold flex items-center gap-2 transition-all ${
                            selectedTimeSlot === slot
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="timeSlot"
                            checked={selectedTimeSlot === slot}
                            onChange={() => setSelectedTimeSlot(slot)}
                            className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span>{slot}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-2">
                      Detalles o Síntomas (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      placeholder="Ej. Ruido en las pastillas delanteras, cambio de aceite..."
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-base sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Botones de acción del panel */}
                <div className="flex gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-800 mt-6">
                  <button
                    type="button"
                    onClick={() => setAppointmentVehicle(null)}
                    className="cursor-pointer flex-1 min-h-[44px] h-11 px-5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-base sm:text-sm flex items-center justify-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer flex-1 min-h-[44px] h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors text-base sm:text-sm shadow-md active:scale-[0.98] flex items-center justify-center"
                  >
                    Confirmar Cita
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Navegación móvil fija */}
      <ClienteMobileNav />
    </div>
  );
}
