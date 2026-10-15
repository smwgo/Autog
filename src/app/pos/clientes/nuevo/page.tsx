"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";

export default function NuevoClientePage() {
  const router = useRouter();

  // Paso actual (1: Datos del cliente, 2: Datos del vehículo)
  const [paso, setPaso] = useState<1 | 2>(1);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formulario
  const [tipoCliente, setTipoCliente] = useState<"Personal" | "Empresa">("Personal");
  const [esVip, setEsVip] = useState(false);
  const [identificacion, setIdentificacion] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");

  // Paso 2: Vehículo
  const [asociarVehiculo, setAsociarVehiculo] = useState<boolean>(true);
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("2024");
  const [kilometraje, setKilometraje] = useState("");
  const [combustible, setCombustible] = useState("Gasolina");

  const handleSiguiente = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setPaso(2);
  };

  const handleSubmitFinal = async () => {
    try {
      setGuardando(true);
      setErrorMsg(null);

      const payload: any = {
        tipoCliente,
        identificacion: identificacion.trim(),
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        email: email.trim() || undefined,
        direccion: direccion.trim() || undefined,
        esVip,
      };

      if (asociarVehiculo && placa.trim()) {
        payload.placa = placa.trim().toUpperCase();
        payload.marca = marca.trim() || undefined;
        payload.modelo = modelo.trim() || undefined;
        payload.anio = anio ? parseInt(anio, 10) : undefined;
        payload.kilometraje = kilometraje ? parseInt(kilometraje.replace(/\D/g, ""), 10) : undefined;
        payload.combustible = combustible;
      }

      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar el cliente.");
      }

      router.push("/pos/clientes");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al registrar cliente.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-blue-600 selection:text-white">
      <Header />

      <main className="flex-grow flex items-start sm:items-center justify-center p-3 sm:p-6 md:p-12 relative overflow-y-auto pb-12 sm:pb-8">
        {/* Glow de fondo ambiental sutil en celeste/azul */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[800px] h-[250px] sm:h-[450px] bg-blue-600/15 blur-[100px] sm:blur-[140px] pointer-events-none rounded-full" />

        {/* Card Contenedor Estilo Onboarding (Adaptable a móviles Android / iOS y Desktop) */}
        <div className="relative w-full max-w-4xl lg:max-w-5xl bg-zinc-900/95 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-12 shadow-2xl backdrop-blur-xl my-2 sm:my-auto">
          
          {/* Header Superior */}
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h1 className="text-base sm:text-xl font-medium text-white tracking-tight">
                {paso === 1 ? "Registro de Cliente" : "Vehículo Asociado"}
              </h1>
            </div>

            <Link
              href="/pos/clientes"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 transition-all"
              title="Cerrar y volver a Clientes"
            >
              ✕
            </Link>
          </div>

          {/* Barra de Progreso por Pasos */}
          <div className="flex items-center gap-3 mb-5 sm:mb-8">
            <div className="flex-1 flex gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-blue-600 transition-all duration-300" />
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${paso === 2 ? "bg-blue-600" : "bg-zinc-800"}`} />
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

          {/* PASO 1: DATOS DEL CLIENTE (SIEMPRE PRIMERO) */}
          {paso === 1 && (
            <form onSubmit={handleSiguiente} className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-zinc-200 mb-2.5 sm:mb-3">
                  Tipo
                </p>

                {/* Tarjetas de Selección de Tipo de Cliente (2 columnas táctiles en móvil) */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => setTipoCliente("Personal")}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                      tipoCliente === "Personal"
                        ? "bg-blue-500/10 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        tipoCliente === "Personal"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-white/[0.05] text-zinc-400"
                      }`}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="font-medium text-xs sm:text-sm text-white">Persona</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoCliente("Empresa")}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                      tipoCliente === "Empresa"
                        ? "bg-blue-500/10 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        tipoCliente === "Empresa"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-white/[0.05] text-zinc-400"
                      }`}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className="font-medium text-xs sm:text-sm text-white">Empresa</span>
                  </button>
                </div>
              </div>

              {/* Campos de Entrada (text-base en móvil para evitar zoom automático en iOS Safari) */}
              <div className="space-y-3.5 sm:space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      {tipoCliente === "Empresa" ? "RUC" : "Cédula"}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder={tipoCliente === "Empresa" ? "1790012345001" : "0912345678"}
                      value={identificacion}
                      onChange={(e) => setIdentificacion(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0991234567"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {tipoCliente === "Empresa" ? "Razón Social" : "Nombres y Apellidos"}
                  </label>
                  <input
                    type="text"
                    autoComplete="name"
                    autoCapitalize="words"
                    placeholder={tipoCliente === "Empresa" ? "Transportes Andinos S.A." : "Juan Carlos Pérez"}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      placeholder="cliente@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Dirección
                    </label>
                    <input
                      type="text"
                      autoComplete="street-address"
                      autoCapitalize="sentences"
                      placeholder="Av. Principal y Secundaria"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Barra Inferior (Botón Full-Width en móvil y fácil de tocar con el pulgar) */}
              <div className="pt-5 sm:pt-6 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <span className="text-xs text-zinc-500 text-center sm:text-left">
                  Toma menos de 2 minutos
                </span>

                <button
                  type="submit"
                  className="w-full sm:w-auto h-12 px-7 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <span>Continuar</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </form>
          )}

          {/* PASO 2: VEHÍCULO ASOCIADO (OPCIONAL) */}
          {paso === 2 && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-zinc-200 mb-2.5 sm:mb-3">
                  Vehículo
                </p>

                <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => setAsociarVehiculo(true)}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                      asociarVehiculo
                        ? "bg-blue-500/10 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        asociarVehiculo
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-white/[0.05] text-zinc-400"
                      }`}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 17h.01M16 17h.01M3 13l2-5a2 2 0 011.8-1.2h10.4a2 2 0 011.8 1.2l2 5m-18 0h18m-18 0v4a1 1 0 001 1h1m16-5v4a1 1 0 01-1 1h-1" />
                      </svg>
                    </div>
                    <span className="font-medium text-xs sm:text-sm text-white">Vehículo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAsociarVehiculo(false)}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                      !asociarVehiculo
                        ? "bg-blue-500/10 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        !asociarVehiculo
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-white/[0.05] text-zinc-400"
                      }`}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </div>
                    <span className="font-medium text-xs sm:text-sm text-white">Omitir</span>
                  </button>
                </div>
              </div>

              {asociarVehiculo && (
                <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-950/60 border border-zinc-800/80 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Placa del Vehículo
                      </label>
                      <input
                        type="text"
                        autoCapitalize="characters"
                        placeholder="ABC-1234"
                        value={placa}
                        onChange={(e) => setPlaca(e.target.value)}
                        className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white font-mono uppercase font-bold placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Marca
                      </label>
                      <input
                        type="text"
                        autoCapitalize="words"
                        placeholder="Toyota, Chevrolet, Hyundai..."
                        value={marca}
                        onChange={(e) => setMarca(e.target.value)}
                        className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Modelo
                      </label>
                      <input
                        type="text"
                        autoCapitalize="words"
                        placeholder="Hilux, D-Max, Tucson..."
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                        className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
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
                        </select>
                      </div>
                    </div>
                  </div>

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
                </div>
              )}

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
                      <span>Finalizar y Guardar</span>
                      <span>✓</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
