"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Header } from "@/components/Header";

// Estructura de registro de historial con detalles de facturación y garantía
interface ServiceItem {
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

const SERVICE_HISTORY: ServiceItem[] = [
  {
    id: 'ORD-2023-1045',
    invoiceId: 'F-2023-0899',
    uuid: 'A1B2C3D4-E5F6-7890-9988-1234567890AB',
    date: '15 Sep 2023',
    vehicle: 'Toyota Hilux 2020 (ABC-123)',
    mileage: '45,200 km',
    type: 'Mantenimiento Preventivo',
    details: 'Cambio de aceite sintético 5W-30, filtro de aceite, revisión de fluidos y ajuste de frenos.',
    laborCost: 65.00,
    partsCost: 94.48,
    cost: 185.00,
    paymentMethod: 'Tarjeta de Crédito (Visa •••• 4242)',
    warranty: {
      active: true,
      expires: '15 Mar 2024 o 50,000 km',
      coverage: 'Cubre mano de obra de lubricación, estanqueidad de filtros y calibración de zapatas/pastillas.'
    }
  },
  {
    id: 'ORD-2023-0892',
    invoiceId: 'F-2023-0850',
    uuid: 'B2C3D4E5-F6G7-8901-7766-2345678901BC',
    date: '02 Jul 2023',
    vehicle: 'Honda Civic 2018 (XYZ-987)',
    mileage: '65,500 km',
    type: 'Reparación Sistema de Frenos',
    details: 'Reemplazo de pastillas de freno delanteras cerámicas y rectificación de discos.',
    laborCost: 80.00,
    partsCost: 101.47,
    cost: 210.50,
    paymentMethod: 'Transferencia Bancaria (SPEI)',
    warranty: {
      active: true,
      expires: '02 Ene 2024',
      coverage: 'Garantía en rectificación de discos y libre de vibración al frenado por 6 meses.'
    }
  },
  {
    id: 'ORD-2022-1205',
    invoiceId: 'F-2022-0412',
    uuid: 'C3D4E5F6-G7H8-9012-5544-3456789012CD',
    date: '10 Nov 2022',
    vehicle: 'Ford Escape 2021 (QWE-554)',
    mileage: '40,100 km',
    type: 'Alineación y Balanceo',
    details: 'Alineación computarizada, balanceo de 4 ruedas y rotación de llantas.',
    laborCost: 38.79,
    partsCost: 0.00,
    cost: 45.00,
    paymentMethod: 'Efectivo',
    warranty: {
      active: false,
      expires: '10 Feb 2023',
      coverage: 'Garantía de alineación y balanceo estándar por 90 días naturales.'
    }
  },
  {
    id: 'ORD-2022-0540',
    invoiceId: 'F-2022-0198',
    uuid: 'D4E5F6G7-H8I9-0123-3322-4567890123DE',
    date: '15 May 2022',
    vehicle: 'Toyota Hilux 2020 (ABC-123)',
    mileage: '35,000 km',
    type: 'Mantenimiento Preventivo',
    details: 'Cambio de aceite, filtros de aire y cabina. Revisión general de suspensión.',
    laborCost: 55.00,
    partsCost: 74.31,
    cost: 150.00,
    paymentMethod: 'Tarjeta de Débito',
    warranty: {
      active: false,
      expires: '15 Nov 2022',
      coverage: 'Garantía de lubricantes y filtros de cabina hasta el siguiente intervalo programado.'
    }
  }
];

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

  const [selectedVehicle, setSelectedVehicle] = useState(getInitialVehicle);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modales y feedback de acciones
  const [selectedWarranty, setSelectedWarranty] = useState<ServiceItem | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (vehiculoParam) {
      setSelectedVehicle(getInitialVehicle());
    }
  }, [vehiculoParam]);

  const filteredHistory = SERVICE_HISTORY.filter(record => {
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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
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
        <div className="mb-6">
          <Link href="/cliente" className="text-sm font-medium text-amber-600 hover:text-amber-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500 bg-opacity-10 flex items-center justify-center text-2xl">
              📖
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Historial
            </h1>
          </div>
          
          {/* Controles de Filtro: Desplegable y Buscador debajo de Historial */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            {/* Buscador Expandido */}
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por servicio, repuesto, orden (ej. ORD-2023-1045)..."
                className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="cursor-pointer absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
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
                className="cursor-pointer appearance-none w-full pl-3.5 pr-8 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
              >
                <option value="Todos">Todos los vehículos</option>
                <option value="Toyota Hilux">Toyota Hilux</option>
                <option value="Honda Civic">Honda Civic</option>
                <option value="Ford Escape">Ford Escape</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline / List */}
        <div className="space-y-6">
          {filteredHistory.length === 0 ? (
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
                key={record.id}
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
                  
                  {/* Warranty Badge - Texto corto */}
                  <div>
                    {record.warranty.active ? (
                      <button
                        type="button"
                        onClick={() => setSelectedWarranty(record)}
                        className="cursor-pointer text-left inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                        title={`Vence: ${record.warranty.expires} (Clic para ver certificado)`}
                      >
                        <span>🛡️</span>
                        <span>Garantía Activa</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedWarranty(record)}
                        className="cursor-pointer text-left inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        title="Garantía concluida"
                      >
                        <span>⚠️</span>
                        <span>Garantía Expirada</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right block: Action / Price */}
                <div className="md:w-1/6 flex flex-row md:flex-col justify-between items-end md:justify-center md:items-end border-t md:border-t-0 border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 pl-0 md:pl-6 shrink-0">
                  <div className="text-left md:text-right w-full mb-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Costo Total</p>
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">${record.cost.toFixed(2)}</p>
                  </div>
                  
                  {/* Botón Ver Factura - Navega a la página de facturas */}
                  <Link
                    href={`/cliente/facturas?id=${record.invoiceId}`}
                    className="cursor-pointer text-amber-700 dark:text-amber-400 font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap active:scale-[0.98] border border-amber-200/60 dark:border-amber-500/20 shadow-xs flex items-center justify-center text-sm"
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setSelectedWarranty(null)}
              className="cursor-pointer absolute top-5 right-5 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl">
                🛡️
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Certificado de Garantía</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Orden: {selectedWarranty.id}</p>
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
              className="cursor-pointer w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
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
