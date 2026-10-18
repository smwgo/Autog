"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

interface ClienteItem {
  id: string;
  name: string;
  phone?: string | null;
  identification?: string | null;
}

function NuevoVehiculoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  // Pasos: 1: Datos del Vehículo, 2: Propietario / Cliente
  const [paso, setPaso] = useState<1 | 2>(1);
  const [cargando, setCargando] = useState(Boolean(editId));
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Paso 1: Vehículo
  const [tipoVehiculo, setTipoVehiculo] = useState<"Auto" | "SUV" | "Camioneta" | "Moto">("Auto");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("2024");
  const [combustible, setCombustible] = useState("Gasolina");
  const [kilometraje, setKilometraje] = useState("");
  const [color, setColor] = useState("");
  const [vin, setVin] = useState("");

  // Paso 2: Propietario / Cliente
  const [asociarCliente, setAsociarCliente] = useState<boolean>(true);
  const [clientesDisponibles, setClientesDisponibles] = useState<ClienteItem[]>([]);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [identificacionCliente, setIdentificacionCliente] = useState("");

  // Cargar lista de clientes para vincular rápidamente
  useEffect(() => {
    async function fetchClientes() {
      try {
        const res = await fetch("/api/clientes");
        const data = await res.json();
        if (data.success && Array.isArray(data.clientes)) {
          setClientesDisponibles(data.clientes);
        }
      } catch (err) {
        console.error("Error al cargar clientes:", err);
      }
    }
    fetchClientes();
  }, []);

  // Cargar vehículo existente si es edición
  useEffect(() => {
    if (!editId) return;

    const cargarVehiculo = async () => {
      try {
        setCargando(true);
        const res = await fetch("/api/pos/vehiculos");
        const data = await res.json();
        if (data.success && Array.isArray(data.vehicles)) {
          const v = data.vehicles.find((item: any) => item.id === editId || item.plate === editId);
          if (v) {
            setPlaca(v.plate || "");
            setMarca(v.brand || "");
            setModelo(v.model || "");
            setAnio(v.year ? String(v.year) : "2024");
            setCombustible(v.fuelType || "Gasolina");
            setKilometraje(v.mileage ? String(v.mileage) : "");
            setColor(v.color || "");
            setVin(v.vin || "");

            if (v.customerName && v.customerName !== "Cliente Mostrador" && v.customerName !== "Consumidor Final") {
              setAsociarCliente(true);
              setNombreCliente(v.customerName || "");
              setTelefonoCliente(v.customerPhone || "");
              setIdentificacionCliente(v.customerIdentification || "");
              if (v.customerId) setClienteSeleccionadoId(v.customerId);
            } else {
              setAsociarCliente(false);
            }
          }
        }
      } catch (err) {
        console.error("Error al cargar vehículo:", err);
      } finally {
        setCargando(false);
      }
    };

    cargarVehiculo();
  }, [editId]);

  const handleSelectClienteExistente = (cId: string) => {
    setClienteSeleccionadoId(cId);
    if (!cId) {
      setNombreCliente("");
      setTelefonoCliente("");
      setIdentificacionCliente("");
      return;
    }
    const c = clientesDisponibles.find((item) => item.id === cId);
    if (c) {
      setNombreCliente(c.name || "");
      setTelefonoCliente(c.phone || "");
      setIdentificacionCliente(c.identification || "");
    }
  };

  const handleSiguiente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placa.trim()) {
      setErrorMsg("La placa del vehículo es obligatoria.");
      return;
    }
    if (!marca.trim()) {
      setErrorMsg("La marca del vehículo es obligatoria.");
      return;
    }
    if (!modelo.trim()) {
      setErrorMsg("El modelo del vehículo es obligatorio.");
      return;
    }
    setErrorMsg(null);
    setPaso(2);
  };

  const handleSubmitFinal = async () => {
    try {
      setGuardando(true);
      setErrorMsg(null);

      const payload: any = {
        id: editId || undefined,
        plate: placa.trim().toUpperCase(),
        brand: marca.trim(),
        model: modelo.trim(),
        year: anio ? parseInt(anio, 10) : null,
        fuelType: combustible,
        mileage: kilometraje ? parseInt(kilometraje.replace(/\D/g, ""), 10) : 0,
        color: color.trim() || null,
        vin: vin.trim().toUpperCase() || null,
        customerId: asociarCliente && clienteSeleccionadoId ? clienteSeleccionadoId : undefined,
        customerName: asociarCliente ? nombreCliente.trim() || "Cliente Mostrador" : "Cliente Mostrador",
        customerPhone: asociarCliente ? telefonoCliente.trim() || null : null,
        customerIdentification: asociarCliente ? identificacionCliente.trim() || null : null,
      };

      const res = await fetch("/api/pos/vehiculos", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar el vehículo.");
      }

      router.push("/pos/vehiculos");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-blue-600 selection:text-white pb-24 md:pb-0">
      <Header />

      <main className="flex-grow flex items-start sm:items-center justify-center p-3 sm:p-6 md:p-12 relative overflow-y-auto pb-12 sm:pb-8">
        {/* Glow de fondo ambiental sutil */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[800px] h-[250px] sm:h-[450px] bg-blue-600/15 blur-[100px] sm:blur-[140px] pointer-events-none rounded-full" />

        {/* Card Contenedor Estilo Onboarding */}
        <div className="relative w-full max-w-4xl lg:max-w-5xl bg-zinc-900/95 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-12 shadow-2xl backdrop-blur-xl my-2 sm:my-auto">
          {/* Header Superior */}
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              {paso === 1 ? (
                <Link
                  href="/pos/vehiculos"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 transition-all"
                  title="Volver a Vehículos"
                  aria-label="Volver"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                  title="Volver al paso anterior"
                  aria-label="Volver al paso anterior"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              )}
              <h1 className="text-base sm:text-xl font-medium text-white tracking-tight">
                {editId
                  ? paso === 1
                    ? "Editar Vehículo"
                    : "Editar Propietario"
                  : paso === 1
                  ? "Nuevo Vehículo"
                  : "Propietario / Cliente"}
              </h1>
            </div>

            <Link
              href="/pos/vehiculos"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 transition-all"
              title="Cerrar y volver a Vehículos"
            >
              ✕
            </Link>
          </div>

          {/* Barra de Progreso por Pasos */}
          <div className="flex items-center gap-3 mb-5 sm:mb-8">
            <div className="flex-1 flex gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-blue-600 transition-all duration-300" />
              <div
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  paso === 2 ? "bg-blue-600" : "bg-zinc-800"
                }`}
              />
            </div>
            <span className="text-xs font-mono text-zinc-400 shrink-0 font-medium">
              {paso} de 2
            </span>
          </div>

          {/* Mensaje de error si ocurre */}
          {errorMsg && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs sm:text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {cargando ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">Cargando datos del vehículo...</p>
            </div>
          ) : (
            <>
              {/* PASO 1: DATOS DEL VEHÍCULO */}
              {paso === 1 && (
                <form onSubmit={handleSiguiente} className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                  {/* Selector de Tipo de Vehículo */}
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-200 mb-2.5 sm:mb-3">
                      Tipo de Vehículo
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                      {[
                        {
                          id: "Auto",
                          label: "Auto",
                          icon: (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                              <circle cx="7" cy="17" r="2" />
                              <path d="M9 17h6" />
                              <circle cx="17" cy="17" r="2" />
                            </svg>
                          ),
                        },
                        {
                          id: "SUV",
                          label: "SUV",
                          icon: (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="10" width="18" height="6" rx="2" />
                              <path d="M5 10l2-5h10l2 5" />
                              <circle cx="7" cy="16" r="2" />
                              <circle cx="17" cy="16" r="2" />
                            </svg>
                          ),
                        },
                        {
                          id: "Camioneta",
                          label: "Camioneta",
                          icon: (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 14h3M18 14h3M5 14V8a2 2 0 0 1 2-2h5l3 4h3a2 2 0 0 1 2 2v2" />
                              <circle cx="8" cy="16" r="2" />
                              <circle cx="16" cy="16" r="2" />
                              <path d="M10 16h4" />
                            </svg>
                          ),
                        },
                        {
                          id: "Moto",
                          label: "Moto",
                          icon: (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="5" cy="16" r="3" />
                              <circle cx="19" cy="16" r="3" />
                              <path d="M12 16h2l2-7h-4l-3 4" />
                              <path d="M8 8h3" />
                            </svg>
                          ),
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTipoVehiculo(item.id as any)}
                          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                            tipoVehiculo === item.id
                              ? "bg-blue-500/10 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                              : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                              tipoVehiculo === item.id
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-white/[0.05] text-zinc-400"
                            }`}
                          >
                            {item.icon}
                          </div>
                          <span className="font-medium text-xs sm:text-sm">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bloque de Formulario con la estética exacta */}
                  <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Placa del Vehículo <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          autoCapitalize="characters"
                          placeholder="ABC-1234"
                          value={placa}
                          onChange={(e) => setPlaca(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white font-mono uppercase font-bold placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Marca <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          autoCapitalize="words"
                          placeholder="Toyota, Chevrolet, Hyundai..."
                          value={marca}
                          onChange={(e) => setMarca(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Modelo <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          autoCapitalize="words"
                          placeholder="Hilux, D-Max, Tucson..."
                          value={modelo}
                          onChange={(e) => setModelo(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:col-span-2 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                            Año
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="2024"
                            value={anio}
                            onChange={(e) => setAnio(e.target.value)}
                            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                            Combustible
                          </label>
                          <select
                            value={combustible}
                            onChange={(e) => setCombustible(e.target.value)}
                            className="w-full h-11 sm:h-12 px-2.5 sm:px-3 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                          >
                            <option value="Gasolina">Gasolina</option>
                            <option value="Diésel">Diésel</option>
                            <option value="Híbrido">Híbrido</option>
                            <option value="Eléctrico">Eléctrico</option>
                            <option value="Gas GLP/GNV">Gas GLP/GNV</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Kilometraje
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Ej. 45,000 km"
                          value={kilometraje}
                          onChange={(e) => setKilometraje(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Color
                        </label>
                        <input
                          type="text"
                          placeholder="Blanco, Negro, Plata, Gris..."
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          VIN / Chasis
                        </label>
                        <input
                          type="text"
                          placeholder="Opcional (17 dígitos)"
                          value={vin}
                          onChange={(e) => setVin(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white font-mono uppercase placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Barra Inferior */}
                  <div className="pt-5 sm:pt-6 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
                    <Link
                      href="/pos/vehiculos"
                      className="w-full sm:w-auto h-11 sm:h-12 px-5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <span>Cancelar</span>
                    </Link>

                    <button
                      type="submit"
                      className="w-full sm:w-auto h-12 px-7 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <span>Siguiente: Propietario</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 2: PROPIETARIO / CLIENTE */}
              {paso === 2 && (
                <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                  {/* Selector Toggle: Cliente o Omitir */}
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-200 mb-2.5 sm:mb-3">
                      Propietario / Cliente
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 mb-4">
                      <button
                        type="button"
                        onClick={() => setAsociarCliente(true)}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          asociarCliente
                            ? "bg-blue-500/10 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                            : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                            asociarCliente
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-white/[0.05] text-zinc-400"
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="font-medium text-xs sm:text-sm text-white">Asignar Propietario</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAsociarCliente(false)}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          !asociarCliente
                            ? "bg-blue-500/10 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                            : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                            !asociarCliente
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-white/[0.05] text-zinc-400"
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                          </svg>
                        </div>
                        <span className="font-medium text-xs sm:text-sm text-white">Omitir (Cliente Mostrador)</span>
                      </button>
                    </div>
                  </div>

                  {asociarCliente && (
                    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-950/60 border border-zinc-800/80 animate-in fade-in duration-200">
                      {/* Selector de Cliente Existente */}
                      {clientesDisponibles.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                            Seleccionar Cliente Existente (Opcional)
                          </label>
                          <select
                            value={clienteSeleccionadoId}
                            onChange={(e) => handleSelectClienteExistente(e.target.value)}
                            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                          >
                            <option value="">-- Escribir nuevo o elegir de la lista --</option>
                            {clientesDisponibles.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} {c.identification ? `(${c.identification})` : ""} {c.phone ? `• Tel: ${c.phone}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                            Nombre del Propietario / Cliente <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Juan Pérez o Empresa SA"
                            value={nombreCliente}
                            onChange={(e) => setNombreCliente(e.target.value)}
                            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                            Teléfono / WhatsApp
                          </label>
                          <input
                            type="text"
                            placeholder="099 123 4567"
                            value={telefonoCliente}
                            onChange={(e) => setTelefonoCliente(e.target.value)}
                            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Cédula / RUC / Identificación
                        </label>
                        <input
                          type="text"
                          placeholder="1724567890"
                          value={identificacionCliente}
                          onChange={(e) => setIdentificacionCliente(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {/* Resumen previo del Vehículo registrado */}
                  <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono uppercase font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                        {placa || "SIN PLACA"}
                      </span>
                      <span className="font-semibold text-zinc-200">
                        {marca} {modelo} {anio ? `(${anio})` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaso(1)}
                      className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                    >
                      Editar vehículo
                    </button>
                  </div>

                  {/* Barra Inferior */}
                  <div className="pt-5 sm:pt-6 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setPaso(1)}
                      className="w-full sm:w-auto h-11 sm:h-12 px-5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span>&larr;</span>
                      <span>Atrás</span>
                    </button>

                    <button
                      type="button"
                      disabled={guardando}
                      onClick={handleSubmitFinal}
                      className="w-full sm:w-auto h-12 px-7 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {guardando ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <span>{editId ? "Guardar Cambios" : "Finalizar y Guardar"}</span>
                          <span>✓</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <PosMobileNav />
    </div>
  );
}

export default function NuevoVehiculoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NuevoVehiculoContent />
    </Suspense>
  );
}
