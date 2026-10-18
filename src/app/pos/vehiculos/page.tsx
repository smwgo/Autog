"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface VehicleItem {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  mileage: number | null;
  vin: string | null;
  fuelType: string | null;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerIdentification?: string | null;
  origin: "Cliente" | "Taller" | "Ambos";
  tallerVisits: number;
  lastVisit?: string | null;
  createdAt?: string;
}

export default function PosVehiculosPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroOrigen, setFiltroOrigen] = useState<"TODOS" | "CLIENTE" | "TALLER">("TODOS");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);

  // Modales
  const [modalRegistroAbierto, setModalRegistroAbierto] = useState(false);
  const [vehiculoDetalle, setVehiculoDetalle] = useState<VehicleItem | null>(null);
  const [vehiculoAEditar, setVehiculoAEditar] = useState<VehicleItem | null>(null);
  const [vehiculoAEliminar, setVehiculoAEliminar] = useState<VehicleItem | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Notificaciones
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  // Formulario Registro / Edición
  const [formPlaca, setFormPlaca] = useState("");
  const [formMarca, setFormMarca] = useState("");
  const [formModelo, setFormModelo] = useState("");
  const [formAnio, setFormAnio] = useState("");
  const [formColor, setFormColor] = useState("");
  const [formKilometraje, setFormKilometraje] = useState("");
  const [formCombustible, setFormCombustible] = useState("Gasolina");
  const [formVin, setFormVin] = useState("");
  const [formClienteNombre, setFormClienteNombre] = useState("");
  const [formClienteTelefono, setFormClienteTelefono] = useState("");

  const cargarVehiculos = useCallback(async (busqueda = "", silencioso = false) => {
    try {
      if (!silencioso) setCargando(true);
      const url = busqueda.trim()
        ? `/api/pos/vehiculos?busqueda=${encodeURIComponent(busqueda.trim())}`
        : "/api/pos/vehiculos";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setVehicles(data.vehicles || []);
      } else {
        setErrorMensaje(data.error || "No se pudieron obtener los vehículos.");
      }
    } catch (err: any) {
      console.error("Error al cargar vehículos:", err);
      setErrorMensaje("Error de conexión al cargar los vehículos.");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarVehiculos();
  }, [cargarVehiculos]);

  // Búsqueda instantánea con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarVehiculos(searchTerm, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, cargarVehiculos]);

  // Abrir modal de nuevo registro
  const abrirModalNuevo = () => {
    setVehiculoAEditar(null);
    setFormPlaca("");
    setFormMarca("");
    setFormModelo("");
    setFormAnio(new Date().getFullYear().toString());
    setFormColor("");
    setFormKilometraje("");
    setFormCombustible("Gasolina");
    setFormVin("");
    setFormClienteNombre("");
    setFormClienteTelefono("");
    setModalRegistroAbierto(true);
  };

  // Abrir modal para editar
  const abrirModalEditar = (item: VehicleItem) => {
    setVehiculoAEditar(item);
    setFormPlaca(item.plate);
    setFormMarca(item.brand);
    setFormModelo(item.model);
    setFormAnio(item.year ? item.year.toString() : "");
    setFormColor(item.color || "");
    setFormKilometraje(item.mileage ? item.mileage.toString() : "");
    setFormCombustible(item.fuelType || "Gasolina");
    setFormVin(item.vin || "");
    setFormClienteNombre(item.customerName || "");
    setFormClienteTelefono(item.customerPhone || "");
    setModalRegistroAbierto(true);
  };

  // Guardar (Crear o Actualizar)
  const handleGuardarVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlaca.trim() || !formMarca.trim() || !formModelo.trim()) {
      alert("Por favor completa los campos obligatorios: Placa, Marca y Modelo.");
      return;
    }

    try {
      setGuardando(true);
      const payload: any = {
        plate: formPlaca.trim().toUpperCase(),
        brand: formMarca.trim(),
        model: formModelo.trim(),
        year: formAnio ? parseInt(formAnio, 10) : null,
        color: formColor.trim() || null,
        mileage: formKilometraje ? parseInt(formKilometraje, 10) : 0,
        fuelType: formCombustible,
        vin: formVin.trim().toUpperCase() || null,
        customerName: formClienteNombre.trim() || "Cliente Mostrador",
        customerPhone: formClienteTelefono.trim() || null,
      };

      let res;
      if (vehiculoAEditar) {
        payload.id = vehiculoAEditar.id;
        res = await fetch("/api/pos/vehiculos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/pos/vehiculos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito(
          vehiculoAEditar
            ? `Vehículo ${payload.plate} actualizado correctamente.`
            : `Vehículo ${payload.plate} registrado con éxito.`
        );
        setTimeout(() => setMensajeExito(null), 3500);
        setModalRegistroAbierto(false);
        await cargarVehiculos(searchTerm, true);
      } else {
        alert(data.error || "No se pudo guardar el vehículo.");
      }
    } catch (err) {
      console.error("Error al guardar vehículo:", err);
      alert("Error de conexión al procesar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  // Confirmar eliminación
  const handleConfirmarEliminar = async () => {
    if (!vehiculoAEliminar) return;
    try {
      setEliminando(true);
      const res = await fetch(`/api/pos/vehiculos?id=${encodeURIComponent(vehiculoAEliminar.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito(`Vehículo ${vehiculoAEliminar.plate} eliminado.`);
        setTimeout(() => setMensajeExito(null), 3500);
        setVehiculoAEliminar(null);
        if (vehiculoDetalle?.id === vehiculoAEliminar.id) {
          setVehiculoDetalle(null);
        }
        await cargarVehiculos(searchTerm, true);
      } else {
        alert(data.error || "No se pudo eliminar el vehículo.");
      }
    } catch (e) {
      console.error("Error al eliminar vehículo:", e);
      alert("Error de conexión al eliminar el vehículo.");
    } finally {
      setEliminando(false);
    }
  };

  // Filtrado
  const vehiculosFiltrados = useMemo(() => {
    return vehicles.filter((v) => {
      if (filtroOrigen === "CLIENTE") return v.origin === "Cliente" || v.origin === "Ambos";
      if (filtroOrigen === "TALLER") return v.origin === "Taller" || v.origin === "Ambos" || v.tallerVisits > 0;
      return true;
    });
  }, [vehicles, filtroOrigen]);

  // Métricas
  const totalVehiculos = vehicles.length;
  const totalTaller = vehicles.filter((v) => v.origin === "Taller" || v.tallerVisits > 0).length;
  const totalCliente = vehicles.filter((v) => v.origin === "Cliente" || v.origin === "Ambos").length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* Cabecera / Navegación */}
        <div className="flex flex-col">
          <div className="order-1 mb-4 sm:mb-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <Link 
                href="/pos"
                title="Volver a Panel POS"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                Vehículos
              </h1>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 shrink-0">
                {vehicles.length}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                href="/pos/vehiculos/nuevo"
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nuevo Vehículo</span>
              </Link>
            </div>
          </div>

          {/* Notificaciones */}
          {mensajeExito && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in flex items-center justify-between">
              <span>✓ {mensajeExito}</span>
              <button
                onClick={() => setMensajeExito(null)}
                className="text-emerald-500 hover:text-emerald-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {errorMensaje && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-medium animate-in fade-in flex items-center justify-between">
              <span>⚠️ {errorMensaje}</span>
              <button
                onClick={() => setErrorMensaje(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* KPIs / Métricas Desplegables */}
          <CollapsibleMetrics className="order-3 sm:order-2 mb-2 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-8">
              {/* Total Vehículos */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center text-xl shrink-0">
                  🚗
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                    {totalVehiculos}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Total Registrados</h3>
                </div>
              </div>

              {/* Con Taller */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center text-xl shrink-0">
                  🔧
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {totalTaller}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Desde Taller</h3>
                </div>
              </div>

              {/* Desde Clientes */}
              <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center text-xl shrink-0">
                  👤
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {totalCliente}
                  </p>
                  <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Desde Clientes</h3>
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
                placeholder="Buscar por placa, marca, modelo o cliente..."
                className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-400 shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-52 shrink-0">
              <button
                type="button"
                onClick={() => setFiltroMenuAbierto(!filtroMenuAbierto)}
                className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <span>
                  {filtroOrigen === "CLIENTE"
                    ? "Origen: Clientes"
                    : filtroOrigen === "TALLER"
                    ? "Origen: Taller"
                    : "Origen: Todos"}
                </span>
                <svg className={`w-4 h-4 text-zinc-400 transition-transform ${filtroMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {filtroMenuAbierto && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setFiltroMenuAbierto(false)} 
                  />
                  <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    {[
                      { id: "TODOS", label: "Todos los orígenes" },
                      { id: "CLIENTE", label: "Registrados por Clientes" },
                      { id: "TALLER", label: "Registrados en Taller" },
                    ].map((opcion) => (
                      <button
                        key={opcion.id}
                        type="button"
                        onClick={() => {
                          setFiltroOrigen(opcion.id as any);
                          setFiltroMenuAbierto(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                          filtroOrigen === opcion.id
                            ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-medium"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                        }`}
                      >
                        <span>{opcion.label}</span>
                        {filtroOrigen === opcion.id && (
                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Listado de Vehículos */}
        <div className="order-4">
          {cargando ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Cargando vehículos unificados...
            </div>
          ) : vehiculosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              No se encontraron vehículos registrados con esos criterios.
            </div>
          ) : (
            <>
              {/* Vista Móvil (Tarjetas táctiles) */}
              <div className="md:hidden space-y-3.5">
                {vehiculosFiltrados.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30">
                          🚗
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-sm text-indigo-600 dark:text-indigo-400 tracking-wider">
                              {v.plate}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                                v.origin === "Ambos"
                                  ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30"
                                  : v.origin === "Taller"
                                  ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                                  : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30"
                              }`}
                            >
                              {v.origin}
                            </span>
                          </div>
                          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {v.brand} {v.model} {v.year ? `(${v.year})` : ""}
                          </p>
                        </div>
                      </div>

                      {v.tallerVisits > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                          🔧 {v.tallerVisits} {v.tallerVisits === 1 ? "visita" : "visitas"}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 space-y-1">
                      <p>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Cliente:</span>{" "}
                        {v.customerName}
                      </p>
                      {v.customerPhone && (
                        <p>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">Teléfono:</span>{" "}
                          <span className="font-mono">{v.customerPhone}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/pos/venta?placa=${encodeURIComponent(v.plate)}`}
                          className="h-10 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1"
                          title="Cobrar en POS Venta"
                        >
                          <span>🛒</span>
                          <span>Venta</span>
                        </Link>
                        <Link
                          href={`/taller/ordenes/nueva?placa=${encodeURIComponent(v.plate)}&cliente=${encodeURIComponent(v.customerName)}`}
                          className="h-10 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 active:scale-95 transition-all text-xs font-semibold flex items-center gap-1"
                          title="Crear Orden en Taller"
                        >
                          <span>🔧</span>
                          <span>Taller</span>
                        </Link>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setVehiculoDetalle(v)}
                          className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 flex items-center justify-center active:scale-95 transition-all"
                          title="Ver Detalle"
                        >
                          👁️
                        </button>
                        <Link
                          href={`/pos/vehiculos/nuevo?id=${encodeURIComponent(v.id)}`}
                          className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 flex items-center justify-center active:scale-95 transition-all"
                          title="Editar Vehículo"
                        >
                          ✏️
                        </Link>
                        <button
                          type="button"
                          onClick={() => setVehiculoAEliminar(v)}
                          className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-rose-600 flex items-center justify-center active:scale-95 transition-all"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista Escritorio (Tabla fluida) */}
              <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3.5 px-4">Placa</th>
                        <th className="py-3.5 px-4">Vehículo</th>
                        <th className="py-3.5 px-4">Propietario / Cliente</th>
                        <th className="py-3.5 px-4 text-center">Origen</th>
                        <th className="py-3.5 px-4 text-center">Taller</th>
                        <th className="py-3.5 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {vehiculosFiltrados.map((v) => (
                        <tr key={v.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-500/20 inline-block">
                              {v.plate}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-zinc-900 dark:text-white block">
                              {v.brand} {v.model}
                            </span>
                            <span className="text-xs text-zinc-400 block">
                              {v.year ? `${v.year} • ` : ""}{v.fuelType || "Gasolina"}{v.color ? ` • ${v.color}` : ""}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                              {v.customerName}
                            </span>
                            {v.customerPhone && (
                              <span className="text-xs text-zinc-400 font-mono block">
                                {v.customerPhone}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block ${
                                v.origin === "Ambos"
                                  ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30"
                                  : v.origin === "Taller"
                                  ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30"
                                  : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30"
                              }`}
                            >
                              {v.origin}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap text-xs">
                            {v.tallerVisits > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-500/20">
                                🔧 {v.tallerVisits} {v.tallerVisits === 1 ? "visita" : "visitas"}
                              </span>
                            ) : (
                              <span className="text-zinc-400">Sin visitas</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex justify-center items-center gap-1.5">
                              {/* Cobrar en Venta */}
                              <Link
                                href={`/pos/venta?placa=${encodeURIComponent(v.plate)}`}
                                className="px-2.5 h-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition-all active:scale-95 flex items-center gap-1 cursor-pointer text-xs font-semibold"
                                title="Crear venta o cobrar repuestos para este vehículo"
                              >
                                <span>🛒</span>
                                <span>Venta</span>
                              </Link>

                              {/* Crear Orden de Taller */}
                              <Link
                                href={`/taller/ordenes/nueva?placa=${encodeURIComponent(v.plate)}&cliente=${encodeURIComponent(v.customerName)}`}
                                className="px-2.5 h-8 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 transition-all active:scale-95 flex items-center gap-1 cursor-pointer text-xs font-semibold"
                                title="Abrir nueva orden de trabajo en Taller"
                              >
                                <span>🔧</span>
                                <span>Taller</span>
                              </Link>

                              {/* Ver Detalle */}
                              <button
                                onClick={() => setVehiculoDetalle(v)}
                                className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                                title="Ver ficha técnica"
                              >
                                👁️
                              </button>

                              {/* Editar */}
                              <Link
                                href={`/pos/vehiculos/nuevo?id=${encodeURIComponent(v.id)}`}
                                className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                                title="Editar vehículo"
                              >
                                ✏️
                              </Link>

                              {/* Eliminar */}
                              <button
                                onClick={() => setVehiculoAEliminar(v)}
                                className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                                title="Eliminar vehículo"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal: Ficha Detallada del Vehículo */}
        {vehiculoDetalle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-500 flex items-center justify-center text-xl font-bold">
                    🚗
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                      {vehiculoDetalle.brand} {vehiculoDetalle.model}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">Placa: {vehiculoDetalle.plate}</p>
                  </div>
                </div>
                <button
                  onClick={() => setVehiculoDetalle(null)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Datos Técnicos en Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[11px]">Año:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{vehiculoDetalle.year || "No registrado"}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[11px]">Combustible:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{vehiculoDetalle.fuelType || "Gasolina"}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[11px]">Color:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{vehiculoDetalle.color || "No registrado"}</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[11px]">Kilometraje:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white font-mono">
                    {vehiculoDetalle.mileage ? `${vehiculoDetalle.mileage.toLocaleString()} km` : "No registrado"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 col-span-2">
                  <span className="text-zinc-400 block text-[11px]">Chasis / VIN:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white font-mono">
                    {vehiculoDetalle.vin || "Sin VIN registrado"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-zinc-800 col-span-2">
                  <span className="text-zinc-400 block text-[11px]">Propietario Asociado:</span>
                  <span className="font-bold text-zinc-900 dark:text-white block text-sm">
                    {vehiculoDetalle.customerName}
                  </span>
                  {vehiculoDetalle.customerPhone && (
                    <span className="text-xs text-zinc-500 font-mono block mt-0.5">
                      Teléfono: {vehiculoDetalle.customerPhone}
                    </span>
                  )}
                </div>
              </div>

              {/* Botones rápidos */}
              <div className="flex gap-2 pt-2">
                <Link
                  href={`/pos/venta?placa=${encodeURIComponent(vehiculoDetalle.plate)}`}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <span>🛒</span>
                  <span>Cobrar en Venta</span>
                </Link>
                <Link
                  href={`/taller/ordenes/nueva?placa=${encodeURIComponent(vehiculoDetalle.plate)}&cliente=${encodeURIComponent(vehiculoDetalle.customerName)}`}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <span>🔧</span>
                  <span>Abrir en Taller</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Registrar o Editar Vehículo */}
        {modalRegistroAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {vehiculoAEditar ? "Editar Vehículo" : "Registrar Nuevo Vehículo"}
                </h3>
                <button
                  onClick={() => setModalRegistroAbierto(false)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarVehiculo} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                      Placa / Patente *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ABC-1234"
                      value={formPlaca}
                      onChange={(e) => setFormPlaca(e.target.value.toUpperCase())}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono uppercase text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Toyota, Ford, Chevrolet..."
                      value={formMarca}
                      onChange={(e) => setFormMarca(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Hilux, Civic, Spark..."
                      value={formModelo}
                      onChange={(e) => setFormModelo(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                      Año
                    </label>
                    <input
                      type="number"
                      placeholder="2022"
                      value={formAnio}
                      onChange={(e) => setFormAnio(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                      Color
                    </label>
                    <input
                      type="text"
                      placeholder="Blanco, Negro, Azul..."
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                      Combustible
                    </label>
                    <select
                      value={formCombustible}
                      onChange={(e) => setFormCombustible(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Gasolina">Gasolina</option>
                      <option value="Diésel">Diésel</option>
                      <option value="Híbrido">Híbrido</option>
                      <option value="Eléctrico">Eléctrico</option>
                      <option value="Gas GLP">Gas GLP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                      Kilometraje (km)
                    </label>
                    <input
                      type="number"
                      placeholder="45000"
                      value={formKilometraje}
                      onChange={(e) => setFormKilometraje(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-600 dark:text-zinc-400 font-semibold mb-1">
                      VIN / Chasis
                    </label>
                    <input
                      type="text"
                      placeholder="17 dígitos..."
                      value={formVin}
                      onChange={(e) => setFormVin(e.target.value.toUpperCase())}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono uppercase text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 mb-2">Datos del Propietario / Cliente</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-500 mb-1">Nombre o Empresa</label>
                      <input
                        type="text"
                        placeholder="Juan Pérez"
                        value={formClienteNombre}
                        onChange={(e) => setFormClienteNombre(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-500 mb-1">Teléfono / WhatsApp</label>
                      <input
                        type="text"
                        placeholder="0991234567"
                        value={formClienteTelefono}
                        onChange={(e) => setFormClienteTelefono(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalRegistroAbierto(false)}
                    disabled={guardando}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {guardando ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>{vehiculoAEditar ? "Actualizar" : "Guardar Vehículo"}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirmación de Eliminación */}
        {vehiculoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-2xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  ¿Eliminar Vehículo?
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Se retirará el vehículo con placa{" "}
                  <span className="font-mono font-bold text-indigo-600">
                    {vehiculoAEliminar.plate}
                  </span>{" "}
                  ({vehiculoAEliminar.brand} {vehiculoAEliminar.model}).
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVehiculoAEliminar(null)}
                  disabled={eliminando}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarEliminar}
                  disabled={eliminando}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {eliminando ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Eliminar</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <PosMobileNav />
    </div>
  );
}
