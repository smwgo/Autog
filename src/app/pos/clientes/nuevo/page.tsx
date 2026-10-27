"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { getClientActiveBranch } from "@/lib/branch";

function NuevoClienteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  // Paso actual (1: Datos del cliente, 2: Datos del vehículo)
  const [paso, setPaso] = useState<1 | 2>(1);
  const [cargando, setCargando] = useState(Boolean(editId));
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

  // Foto de Perfil / Logo
  const [fotoCliente, setFotoCliente] = useState("");
  const [subiendoFotoCliente, setSubiendoFotoCliente] = useState(false);
  const [errorFotoCliente, setErrorFotoCliente] = useState<string | null>(null);

  // Paso 2: Vehículo
  const [asociarVehiculo, setAsociarVehiculo] = useState<boolean>(true);
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("2024");
  const [kilometraje, setKilometraje] = useState("");
  const [combustible, setCombustible] = useState("Gasolina");

  // Foto de Vehículo
  const [fotoVehiculo, setFotoVehiculo] = useState("");
  const [subiendoFotoVehiculo, setSubiendoFotoVehiculo] = useState(false);
  const [errorFotoVehiculo, setErrorFotoVehiculo] = useState<string | null>(null);

  // Subir foto de cliente / empresa a Cloudflare R2 o storage API
  const handleSubirFotoCliente = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorFotoCliente("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    try {
      setSubiendoFotoCliente(true);
      setErrorFotoCliente(null);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "clientes");

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Error al subir la foto.");
      }

      setFotoCliente(data.url);
    } catch (err: any) {
      setErrorFotoCliente(err?.message || "No se pudo subir la foto del cliente.");
    } finally {
      setSubiendoFotoCliente(false);
    }
  };

  // Subir foto de vehículo
  const handleSubirFotoVehiculo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorFotoVehiculo("Por favor selecciona un archivo de imagen válido.");
      return;
    }

    try {
      setSubiendoFotoVehiculo(true);
      setErrorFotoVehiculo(null);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "vehiculos");

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Error al subir la foto.");
      }

      setFotoVehiculo(data.url);
    } catch (err: any) {
      setErrorFotoVehiculo(err?.message || "No se pudo subir la foto del vehículo.");
    } finally {
      setSubiendoFotoVehiculo(false);
    }
  };

  // Cargar cliente existente si es edición
  useEffect(() => {
    if (!editId) return;

    const cargarCliente = async () => {
      try {
        setCargando(true);
        const res = await fetch("/api/clientes");
        const data = await res.json();
        if (data.success && Array.isArray(data.clientes)) {
          const c = data.clientes.find((item: any) => item.id === editId);
          if (c) {
            setTipoCliente(c.type === "Empresa" ? "Empresa" : "Personal");
            setEsVip(Boolean(c.vip));
            setIdentificacion(c.identification || "");
            setNombre(c.name || "");
            setTelefono(c.phone || "");
            setEmail(c.email || "");
            setDireccion(c.address || "");
            setFotoCliente(c.avatar || c.imageUrl || "");

            if (c.vehicles && c.vehicles.length > 0) {
              setAsociarVehiculo(true);
              const v = c.vehicles[0];
              setPlaca(v.plate || "");
              setMarca(v.brand || "");
              setModelo(v.model || "");
              setAnio(v.year ? String(v.year) : "2024");
              setKilometraje(v.mileage ? String(v.mileage) : "");
              setCombustible(v.fuelType || "Gasolina");

              let vPhoto = v.imageUrl || "";
              if (!vPhoto && v.photosJson) {
                try {
                  const parsed = typeof v.photosJson === "string" ? JSON.parse(v.photosJson) : v.photosJson;
                  if (Array.isArray(parsed) && parsed.length > 0) vPhoto = parsed[0];
                } catch {
                  // ignorar error de json
                }
              }
              setFotoVehiculo(vPhoto || "");
            } else {
              setAsociarVehiculo(false);
            }
          }
        }
      } catch (err) {
        console.error("Error al cargar datos del cliente para editar:", err);
      } finally {
        setCargando(false);
      }
    };

    cargarCliente();
  }, [editId]);

  const handleSiguiente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg("El nombre del cliente o razón social es obligatorio.");
      return;
    }
    setErrorMsg(null);
    setPaso(2);
  };

  const handleSubmitFinal = async () => {
    try {
      setGuardando(true);
      setErrorMsg(null);

      const sedeActual = getClientActiveBranch("/pos/clientes") === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL";

      const payload: any = {
        id: editId || undefined,
        name: nombre.trim(),
        tipoCliente,
        type: tipoCliente,
        identificacion: identificacion.trim(),
        identification: identificacion.trim(),
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        phone: telefono.trim(),
        email: email.trim() || undefined,
        direccion: direccion.trim() || undefined,
        address: direccion.trim() || undefined,
        esVip,
        vip: esVip,
        avatar: fotoCliente.trim() || undefined,
        imageUrl: fotoCliente.trim() || undefined,
        fotoCliente: fotoCliente.trim() || undefined,
        branch: sedeActual,
      };

      if (asociarVehiculo && placa.trim()) {
        payload.placa = placa.trim().toUpperCase();
        payload.marca = marca.trim() || undefined;
        payload.modelo = modelo.trim() || undefined;
        payload.anio = anio ? parseInt(anio, 10) : undefined;
        payload.kilometraje = kilometraje ? parseInt(kilometraje.replace(/\D/g, ""), 10) : undefined;
        payload.combustible = combustible;
        payload.fotoVehiculo = fotoVehiculo.trim() || undefined;
        payload.vehicleImageUrl = fotoVehiculo.trim() || undefined;
      }

      const res = await fetch("/api/clientes", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo guardar la información del cliente.");
      }

      router.push("/pos/clientes");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white font-sans selection:bg-blue-600 selection:text-white pb-24 md:pb-0">
      <Header />

      <main className="flex-grow flex items-start sm:items-center justify-center p-3 sm:p-6 md:p-12 relative overflow-y-auto pb-12 sm:pb-8">
        {/* Glow de fondo ambiental sutil en celeste/azul */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[800px] h-[250px] sm:h-[450px] bg-blue-600/10 dark:bg-blue-600/15 blur-[100px] sm:blur-[140px] pointer-events-none rounded-full" />

        {/* Card Contenedor Estilo Onboarding */}
        <div className="relative w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-12 shadow-xl dark:shadow-2xl backdrop-blur-xl my-2 sm:my-auto text-zinc-900 dark:text-white">
          {/* Header Superior */}
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              {paso === 1 ? (
                <Link
                  href="/pos/clientes"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-95 transition-all"
                  title="Volver a Clientes"
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
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                  title="Volver al paso anterior"
                  aria-label="Volver al paso anterior"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              )}
              <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {editId
                  ? paso === 1
                    ? "Editar Cliente"
                    : "Editar Vehículo Asociado"
                  : paso === 1
                  ? "Registro de Cliente"
                  : "Vehículo Asociado"}
              </h1>
            </div>

            <Link
              href="/pos/clientes"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              title="Cerrar y volver a Clientes"
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
                  paso === 2 ? "bg-blue-600" : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            </div>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 shrink-0 font-medium">
              {paso} de 2
            </span>
          </div>

          {/* Mensaje de error si ocurre */}
          {errorMsg && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {cargando ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Cargando datos del cliente...</p>
            </div>
          ) : (
            <>
              {/* PASO 1: DATOS DEL CLIENTE */}
              {paso === 1 && (
                <form onSubmit={handleSiguiente} className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2.5 sm:mb-3">
                      Tipo
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => setTipoCliente("Personal")}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          tipoCliente === "Personal"
                            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-900 dark:text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                            : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                            tipoCliente === "Personal"
                              ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              : "bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white">Persona</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTipoCliente("Empresa")}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          tipoCliente === "Empresa"
                            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-900 dark:text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                            : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                            tipoCliente === "Empresa"
                              ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              : "bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white">Empresa</span>
                      </button>
                    </div>
                  </div>

                  {/* Foto de Perfil o Logo */}
                  <div className="flex justify-center py-1">
                    <div className="relative group">
                      <label
                        className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-dashed ${
                          fotoCliente
                            ? "border-blue-500/50 dark:border-blue-500/50"
                            : "border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-400"
                        } flex flex-col items-center justify-center overflow-hidden shadow-sm cursor-pointer transition-all duration-200 active:scale-95 ${
                          subiendoFotoCliente ? "opacity-60 pointer-events-none" : ""
                        }`}
                        title="Subir foto"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          disabled={subiendoFotoCliente}
                          onChange={handleSubirFotoCliente}
                          className="hidden"
                        />

                        {subiendoFotoCliente ? (
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : fotoCliente ? (
                          <>
                            <img
                              src={fotoCliente}
                              alt="Foto de perfil"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <circle cx="12" cy="13" r="3" />
                              </svg>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors">
                            <span className="text-3xl">
                              {tipoCliente === "Empresa" ? "🏢" : "👤"}
                            </span>
                          </div>
                        )}
                      </label>

                      {fotoCliente && !subiendoFotoCliente && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFotoCliente("");
                          }}
                          title="Eliminar foto"
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-90 z-10"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Campos de Entrada */}
                  <div className="space-y-3.5 sm:space-y-4 pt-1">
                    {/* Nombres y Apellidos arriba */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        {tipoCliente === "Empresa" ? "Razón Social" : "Nombres y Apellidos"} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        autoCapitalize="words"
                        placeholder={tipoCliente === "Empresa" ? "Transportes Andinos S.A." : "Juan Carlos Pérez"}
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* Cédula y WhatsApp abajo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          {tipoCliente === "Empresa" ? "RUC" : "Cédula"}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder={tipoCliente === "Empresa" ? "1790012345001" : "0912345678"}
                          value={identificacion}
                          onChange={(e) => setIdentificacion(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          WhatsApp
                        </label>
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="0991234567"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
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
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Dirección
                        </label>
                        <input
                          type="text"
                          autoComplete="street-address"
                          autoCapitalize="sentences"
                          placeholder="Av. Principal y Secundaria"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Barra Inferior */}
                  <div className="pt-5 sm:pt-6 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
                      {editId ? "Paso 1: Modifica los datos principales" : "Toma menos de 2 minutos"}
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

              {/* PASO 2: VEHÍCULO ASOCIADO */}
              {paso === 2 && (
                <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2.5 sm:mb-3">
                      Vehículo
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => setAsociarVehiculo(true)}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          asociarVehiculo
                            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-900 dark:text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                            : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                            asociarVehiculo
                              ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              : "bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 17h.01M16 17h.01M3 13l2-5a2 2 0 011.8-1.2h10.4a2 2 0 011.8 1.2l2 5m-18 0h18m-18 0v4a1 1 0 001 1h1m16-5v4a1 1 0 01-1 1h-1" />
                          </svg>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white">Vehículo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAsociarVehiculo(false)}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          !asociarVehiculo
                            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-900 dark:text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                            : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                            !asociarVehiculo
                              ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                              : "bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                          </svg>
                        </div>
                        <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white">Omitir</span>
                      </button>
                    </div>
                  </div>

                  {asociarVehiculo && (
                    <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 animate-in fade-in duration-200">
                      {/* Foto del Vehículo */}
                      <div className="flex justify-center py-1">
                        <div className="relative group">
                          <label
                            className={`relative w-44 sm:w-52 h-28 sm:h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-950 border-2 border-dashed ${
                              fotoVehiculo
                                ? "border-blue-500/50"
                                : "border-zinc-300 dark:border-zinc-800 hover:border-blue-500"
                            } flex flex-col items-center justify-center overflow-hidden shadow-xs cursor-pointer transition-all duration-200 active:scale-95 ${
                              subiendoFotoVehiculo ? "opacity-60 pointer-events-none" : ""
                            }`}
                            title="Subir foto del vehículo"
                          >
                            <input
                              type="file"
                              accept="image/*"
                              disabled={subiendoFotoVehiculo}
                              onChange={handleSubirFotoVehiculo}
                              className="hidden"
                            />

                            {subiendoFotoVehiculo ? (
                              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : fotoVehiculo ? (
                              <>
                                <img
                                  src={fotoVehiculo}
                                  alt="Vehículo"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <circle cx="12" cy="13" r="3" />
                                  </svg>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors">
                                <span className="text-3xl">🚗</span>
                              </div>
                            )}
                          </label>

                          {fotoVehiculo && !subiendoFotoVehiculo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setFotoVehiculo("");
                              }}
                              title="Eliminar foto"
                              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-90 z-10"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                            Placa del Vehículo
                          </label>
                          <input
                            type="text"
                            autoCapitalize="characters"
                            placeholder="ABC-1234"
                            value={placa}
                            onChange={(e) => setPlaca(e.target.value)}
                            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white font-mono uppercase font-bold placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                            Marca
                          </label>
                          <input
                            type="text"
                            autoCapitalize="words"
                            placeholder="Toyota, Chevrolet, Hyundai..."
                            value={marca}
                            onChange={(e) => setMarca(e.target.value)}
                            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                            Modelo
                          </label>
                          <input
                            type="text"
                            autoCapitalize="words"
                            placeholder="Hilux, D-Max, Tucson..."
                            value={modelo}
                            onChange={(e) => setModelo(e.target.value)}
                            className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:col-span-2 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                              Año
                            </label>
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="2024"
                              value={anio}
                              onChange={(e) => setAnio(e.target.value)}
                              className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                              Combustible
                            </label>
                            <select
                              value={combustible}
                              onChange={(e) => setCombustible(e.target.value)}
                              className="w-full h-11 sm:h-12 px-2.5 sm:px-3 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
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
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Kilometraje
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Ej. 45,000 km"
                          value={kilometraje}
                          onChange={(e) => setKilometraje(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  {/* Barra Inferior */}
                  <div className="pt-5 sm:pt-6 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setPaso(1)}
                      className="w-full sm:w-auto h-11 sm:h-12 px-5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-transparent text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
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

export default function NuevoClientePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NuevoClienteContent />
    </Suspense>
  );
}
