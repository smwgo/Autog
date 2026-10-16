"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";

interface HistoryRecord {
  id: string;
  dbId: string;
  serviceCode: string;
  date: string;
  vehicle: string;
  plate: string;
  client: string;
  services: string[];
  cost: string;
  costNumeric: number;
  mechanic: string;
  mileage: string;
  notes?: string;
  orderNumber?: string;
}

export default function HistorialServiciosPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<HistoryRecord | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);

  // Formulario nuevo registro de historial
  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const [client, setClient] = useState("");
  const [servicesInput, setServicesInput] = useState("");
  const [costInput, setCostInput] = useState("");
  const [mechanic, setMechanic] = useState("Carlos Rodríguez");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarHistorial = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("busqueda", searchTerm.trim());

      const res = await fetch(`/api/taller/historial?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setRecords(data.history);
      }
    } catch (err) {
      console.error("Error al cargar historial desde Neon:", err);
    } finally {
      setCargando(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const handleCrearHistorial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle.trim() || !plate.trim() || !client.trim()) {
      alert("Por favor completa Vehículo, Placa y Cliente.");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/taller/historial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle: vehicle.trim(),
          plate: plate.trim().toUpperCase(),
          client: client.trim(),
          services: servicesInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          cost: parseFloat(costInput || "0") || 0,
          mechanic,
          mileage: mileage.trim() || "N/A",
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo guardar el registro");
      }

      setModalNuevo(false);
      setVehicle("");
      setPlate("");
      setClient("");
      setServicesInput("");
      setCostInput("");
      setMileage("");
      setNotes("");
      await cargarHistorial();
    } catch (err: any) {
      alert(err.message || "Error al guardar en Neon.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (rec: HistoryRecord) => {
    if (!window.confirm(`¿Eliminar el registro histórico ${rec.id} (${rec.plate})?`)) return;
    try {
      const id = rec.dbId || rec.id;
      const res = await fetch(`/api/taller/historial?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al eliminar registro");
      }
      setRecords((prev) => prev.filter((r) => r.dbId !== id && r.id !== id));
      if (detalleSeleccionado?.id === rec.id) setDetalleSeleccionado(null);
    } catch (err: any) {
      alert(err.message || "No se pudo eliminar el registro.");
    }
  };

  const handleExportarCSV = () => {
    if (records.length === 0) {
      alert("No hay registros para exportar.");
      return;
    }
    const headers = ["Codigo", "Fecha", "Vehiculo", "Placa", "Cliente", "Mecanico", "Kilometraje", "Costo", "Servicios"];
    const rows = records.map((r) => [
      r.id,
      r.date,
      `"${r.vehicle.replace(/"/g, '""')}"`,
      r.plate,
      `"${r.client.replace(/"/g, '""')}"`,
      `"${r.mechanic}"`,
      `"${r.mileage}"`,
      r.costNumeric.toFixed(2),
      `"${(r.services || []).join("; ").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historial_taller_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/taller"
            className="text-sm font-medium text-purple-600 hover:text-purple-500 flex items-center gap-1 w-fit min-h-[44px] md:min-h-0 items-center"
          >
            &larr; Volver al Panel de Taller
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 sm:mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-500 bg-opacity-10 flex items-center justify-center text-2xl shrink-0">
                📖
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  Historial de Servicios
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  {records.length} servicios almacenados en Neon DB
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={handleExportarCSV}
              className="h-11 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-purple-500 dark:hover:border-purple-500 text-zinc-700 dark:text-zinc-300 px-5 rounded-xl font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>📥</span> Exportar Reporte
            </button>

            <button
              type="button"
              onClick={() => setModalNuevo(true)}
              className="h-11 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>+</span> Registrar Servicio
            </button>
          </div>
        </div>

        {/* Big Search Bar */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 sm:mb-8">
          <div className="relative max-w-3xl mx-auto">
            <input
              type="text"
              placeholder="Ingresa la placa (Ej: ABC-123), nombre del cliente o ID del servicio..."
              className="w-full pl-12 sm:pl-14 pr-4 sm:pr-6 py-3.5 sm:py-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all dark:text-white text-base sm:text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 sm:left-5 top-3.5 sm:top-4 text-zinc-400 text-xl sm:text-2xl">🔍</span>
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm font-medium text-zinc-500">Consultando historial en Neon DB...</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {records.map((record) => (
              <div
                key={record.dbId || record.id}
                className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors shadow-sm flex flex-col md:flex-row gap-4 sm:gap-6"
              >
                {/* Left Column: Date & ID */}
                <div className="md:w-48 flex-shrink-0 flex flex-col justify-center border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 pb-4 md:pb-0 md:pr-6">
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                    Fecha de Servicio
                  </p>
                  <p className="text-lg sm:text-xl font-bold text-purple-700 dark:text-purple-400 mb-2">
                    {record.date}
                  </p>
                  <span className="inline-block bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono px-2.5 py-1 rounded-md w-fit">
                    {record.id}
                  </span>
                </div>

                {/* Middle Column: Vehicle & Services */}
                <div className="flex-grow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 sm:mb-4 gap-2">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        {record.vehicle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-bold">
                          {record.plate}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">👤 {record.client}</span>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-0.5">Kilometraje</p>
                      <p className="font-medium text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">{record.mileage}</p>
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-500/5 rounded-2xl p-3.5 sm:p-4 border border-purple-100 dark:border-purple-500/10">
                    <p className="text-xs sm:text-sm font-bold text-purple-900 dark:text-purple-300 mb-2">
                      Trabajos Realizados:
                    </p>
                    <ul className="list-disc list-inside text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm space-y-1">
                      {record.services.map((service, idx) => (
                        <li key={idx}>{service}</li>
                      ))}
                    </ul>
                    {record.notes && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 pt-2 border-t border-purple-200/50 dark:border-purple-800/30">
                        <strong>Observaciones:</strong> {record.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column: Cost & Actions */}
                <div className="md:w-48 flex-shrink-0 flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 pt-4 md:pt-0 md:pl-6">
                  <div className="flex md:flex-col justify-between items-end md:items-start">
                    <div>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-1">Mecánico</p>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2 md:mb-4">
                        {record.mechanic}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-1">Costo Total</p>
                      <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{record.cost}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setDetalleSeleccionado(record)}
                      className="w-full h-11 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-500/20 dark:hover:bg-purple-500/30 dark:text-purple-300 rounded-xl text-sm font-bold transition-colors cursor-pointer flex items-center justify-center"
                    >
                      Ver Factura / Detalle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(record)}
                      className="w-full h-11 text-xs text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      Eliminar registro
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {records.length === 0 && (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-5xl mb-4 block">🚗</span>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  No se encontraron registros
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                  No hay historial de servicios que coincida con &quot;{searchTerm}&quot;.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal Detalle / Factura (Bottom-sheet on small screens) */}
        {detalleSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 pb-8 sm:pb-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    {detalleSeleccionado.id}
                  </span>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Comprobante de Servicio Técnico
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetalleSeleccionado(null)}
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                <div>
                  <p className="text-xs text-zinc-400">Cliente</p>
                  <p className="font-bold text-zinc-900 dark:text-white">{detalleSeleccionado.client}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Fecha</p>
                  <p className="font-bold text-zinc-900 dark:text-white">{detalleSeleccionado.date}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Vehículo</p>
                  <p className="font-bold text-zinc-900 dark:text-white">{detalleSeleccionado.vehicle}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Placa / Km</p>
                  <p className="font-mono font-bold text-zinc-900 dark:text-white">
                    {detalleSeleccionado.plate} • {detalleSeleccionado.mileage}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-zinc-500 mb-2">Detalle de Trabajos</p>
                <ul className="space-y-2">
                  {detalleSeleccionado.services.map((srv, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center text-sm px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800"
                    >
                      <span className="text-zinc-800 dark:text-zinc-200">✓ {srv}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {detalleSeleccionado.notes && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-purple-50/60 dark:bg-purple-950/20 p-3 rounded-xl">
                  <strong>Notas del Mecánico ({detalleSeleccionado.mechanic}):</strong>{" "}
                  {detalleSeleccionado.notes}
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Total Facturado</span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {detalleSeleccionado.cost}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <Link
                  href={`/pos/venta?placa=${encodeURIComponent(detalleSeleccionado.plate)}`}
                  className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center"
                >
                  Ir a Facturación POS
                </Link>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-11 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer flex items-center justify-center"
                >
                  🖨️ Imprimir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nuevo Registro en Historial (Bottom-sheet on small screens) */}
        {modalNuevo && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 pb-8 sm:pb-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  📖 Registrar Servicio en Historial (Neon DB)
                </h3>
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrearHistorial} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Vehículo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Mazda CX-5 2021"
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Placa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: PBA-4512"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value.toUpperCase())}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm font-mono uppercase dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Cliente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Fernanda Morales"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Kilometraje
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 55,000 km"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Mecánico
                    </label>
                    <select
                      value={mechanic}
                      onChange={(e) => setMechanic(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                    >
                      <option value="Carlos Rodríguez">Carlos Rodríguez</option>
                      <option value="Luis Martínez">Luis Martínez</option>
                      <option value="Andrés Castro">Andrés Castro</option>
                      <option value="Ana Torres">Ana Torres</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                      Costo Total (USD) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ej: 145.00"
                      value={costInput}
                      onChange={(e) => setCostInput(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                    Servicios Realizados (separados por coma) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cambio de aceite, Alineación 3D, Limpieza de frenos"
                    value={servicesInput}
                    onChange={(e) => setServicesInput(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-zinc-500 block mb-1">
                    Observaciones
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Notas de entrega o recomendaciones..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm dark:text-white resize-y"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalNuevo(false)}
                    className="h-11 px-5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="h-11 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center"
                  >
                    {guardando ? "Guardando..." : "Guardar en Historial"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <TallerMobileNav />
    </div>
  );
}
