"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

const SUGERENCIAS_CUPO = [300, 500, 800, 1500, 3000];

function NuevoCreditoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clientes cargados para autocompletado y coincidencia inteligente
  const [clientesLista, setClientesLista] = useState<any[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [mostrarDropdownNombre, setMostrarDropdownNombre] = useState(false);
  const [mostrarDropdownCedula, setMostrarDropdownCedula] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);

  const dropdownNombreRef = useRef<HTMLDivElement>(null);
  const dropdownCedulaRef = useRef<HTMLDivElement>(null);

  // Formulario
  const [tipoCliente, setTipoCliente] = useState<"Personal" | "Empresa">("Personal");
  const [customerName, setCustomerName] = useState("");
  const [identification, setIdentification] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimit, setCreditLimit] = useState<number | string>(500);
  const [currentBalance, setCurrentBalance] = useState<number | string>(0);
  const [dueDate, setDueDate] = useState("2026-11-30");
  const [status, setStatus] = useState<"AL_DIA" | "POR_VENCER" | "VENCIDO">("AL_DIA");
  const [notes, setNotes] = useState("");

  // Cargar clientes existentes del sistema
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        setCargandoClientes(true);
        const res = await fetch("/api/clientes");
        const data = await res.json();
        if (data.success && Array.isArray(data.clientes)) {
          setClientesLista(data.clientes);
        }
      } catch (e) {
        console.error("Error al cargar lista de clientes:", e);
      } finally {
        setCargandoClientes(false);
      }
    };
    cargarClientes();
  }, []);

  // Manejar clics fuera de los dropdowns para cerrarlos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownNombreRef.current && !dropdownNombreRef.current.contains(event.target as Node)) {
        setMostrarDropdownNombre(false);
      }
      if (dropdownCedulaRef.current && !dropdownCedulaRef.current.contains(event.target as Node)) {
        setMostrarDropdownCedula(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Si viene con ID de edición, cargar datos
  useEffect(() => {
    if (!editId) return;

    const cargarDato = async () => {
      try {
        setCargando(true);
        const res = await fetch("/api/pos/creditos");
        const data = await res.json();
        if (data.success && Array.isArray(data.creditos)) {
          const item = data.creditos.find((c: any) => c.id === editId);
          if (item) {
            setCustomerName(item.customerName || "");
            setIdentification(item.identification || "");
            setPhone(item.phone || "");
            setCreditLimit(item.creditLimit || 500);
            setCurrentBalance(item.currentBalance || 0);
            setDueDate(item.dueDate || "2026-11-30");
            setStatus(item.status || "AL_DIA");
            setNotes(item.notes || "");
            if (
              item.identification?.length === 13 ||
              item.customerName?.toLowerCase().includes("taller") ||
              item.customerName?.toLowerCase().includes("s.a.")
            ) {
              setTipoCliente("Empresa");
            }
          }
        }
      } catch (err: any) {
        console.error("Error al cargar crédito para editar:", err);
      } finally {
        setCargando(false);
      }
    };

    cargarDato();
  }, [editId]);

  // Filtrado de clientes para Nombres y Apellidos
  const clientesFiltradosNombre = useMemo(() => {
    if (!customerName.trim()) {
      return clientesLista.slice(0, 6);
    }
    const term = customerName.toLowerCase().trim();
    return clientesLista
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.identification?.toLowerCase().includes(term) ||
          (c.phone && c.phone.toLowerCase().includes(term))
      )
      .slice(0, 8);
  }, [clientesLista, customerName]);

  // Filtrado de clientes para Cédula / RUC
  const clientesFiltradosCedula = useMemo(() => {
    if (!identification.trim() || identification.trim().length < 2) return [];
    const term = identification.toLowerCase().trim();
    return clientesLista
      .filter((c) => c.identification?.toLowerCase().includes(term))
      .slice(0, 6);
  }, [clientesLista, identification]);

  // Seleccionar un cliente de cualquier dropdown o coincidencia exacta
  const seleccionarCliente = (cliente: any) => {
    setCustomerName(cliente.name || "");
    setIdentification(cliente.identification || "");
    setPhone(cliente.phone || "");
    if (cliente.type === "Empresa" || cliente.identification?.length === 13) {
      setTipoCliente("Empresa");
    } else {
      setTipoCliente("Personal");
    }
    setClienteSeleccionado(cliente);
    setMostrarDropdownNombre(false);
    setMostrarDropdownCedula(false);
  };

  // Manejar cambio en Cédula / RUC y autocompletar coincidencia
  const handleCedulaChange = (val: string) => {
    setIdentification(val);
    setMostrarDropdownCedula(true);

    const limpio = val.trim().toLowerCase();
    const matchExacto = clientesLista.find(
      (c) => c.identification?.trim().toLowerCase() === limpio
    );

    if (matchExacto) {
      setCustomerName(matchExacto.name || "");
      setPhone(matchExacto.phone || "");
      if (matchExacto.type === "Empresa" || matchExacto.identification?.length === 13) {
        setTipoCliente("Empresa");
      } else {
        setTipoCliente("Personal");
      }
      setClienteSeleccionado(matchExacto);
    } else {
      if (clienteSeleccionado && clienteSeleccionado.identification !== val) {
        setClienteSeleccionado(null);
      }
    }
  };

  // Manejar cambio en Nombre y buscar coincidencia
  const handleNombreChange = (val: string) => {
    setCustomerName(val);
    setMostrarDropdownNombre(true);

    const limpio = val.trim().toLowerCase();
    const matchExacto = clientesLista.find(
      (c) => c.name?.trim().toLowerCase() === limpio
    );

    if (matchExacto) {
      setIdentification(matchExacto.identification || "");
      setPhone(matchExacto.phone || "");
      if (matchExacto.type === "Empresa" || matchExacto.identification?.length === 13) {
        setTipoCliente("Empresa");
      } else {
        setTipoCliente("Personal");
      }
      setClienteSeleccionado(matchExacto);
    } else {
      if (clienteSeleccionado && clienteSeleccionado.name !== val) {
        setClienteSeleccionado(null);
      }
    }
  };

  const handleGuardar = async (crearOtro: boolean = false) => {
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg("Por favor ingresa o selecciona el nombre del cliente o empresa.");
      return;
    }

    if (!identification.trim()) {
      setErrorMsg("Por favor ingresa el RUC o Cédula.");
      return;
    }

    const limiteNum = Number(creditLimit);
    if (isNaN(limiteNum) || limiteNum <= 0) {
      setErrorMsg("Por favor ingresa un cupo límite válido mayor a 0.");
      return;
    }

    try {
      setGuardando(true);

      const payload = {
        id: editId || undefined,
        customerName: customerName.trim(),
        identification: identification.trim(),
        phone: phone.trim() || "N/A",
        creditLimit: limiteNum,
        currentBalance: Number(currentBalance) || 0,
        dueDate,
        status,
        notes: notes.trim(),
      };

      const res = await fetch("/api/pos/creditos", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar la línea de crédito.");
      }

      setGuardando(false);

      if (crearOtro) {
        setMensajeExito(`¡Crédito para "${customerName.trim()}" registrado con éxito!`);
        setCustomerName("");
        setIdentification("");
        setPhone("");
        setCreditLimit(500);
        setCurrentBalance(0);
        setNotes("");
        setClienteSeleccionado(null);
        setTimeout(() => setMensajeExito(null), 4000);
      } else {
        router.push("/pos/creditos");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al conectar con el servidor.");
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-blue-600 selection:text-white pb-24 md:pb-0">
      <Header />

      <main className="flex-grow flex items-start sm:items-center justify-center p-3 sm:p-6 md:p-12 relative overflow-y-auto pb-12 sm:pb-8">
        {/* Glow de fondo ambiental sutil en celeste/azul */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[800px] h-[250px] sm:h-[450px] bg-blue-600/15 blur-[100px] sm:blur-[140px] pointer-events-none rounded-full" />

        {/* Card Contenedor Estilo Onboarding Exacto a Nuevo Cliente */}
        <div className="relative w-full max-w-4xl lg:max-w-5xl bg-zinc-900/95 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-12 shadow-2xl backdrop-blur-xl my-2 sm:my-auto">
          {/* Header Superior */}
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
            <div className="flex items-center gap-3">
              <Link
                href="/pos/creditos"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 transition-all"
                title="Volver a Créditos"
                aria-label="Volver"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-base sm:text-xl font-medium text-white tracking-tight">
                {editId ? "Editar Línea de Crédito" : "Registro de Crédito"}
              </h1>
            </div>

            <Link
              href="/pos/creditos"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 transition-all text-sm font-semibold"
              title="Cerrar y volver a Créditos"
            >
              ✕
            </Link>
          </div>

          {/* Notificaciones */}
          {mensajeExito && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
              <span>✓</span>
              <span>{mensajeExito}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {cargando ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">Cargando datos del crédito...</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGuardar(false);
              }}
              className="space-y-4 sm:space-y-6 animate-in fade-in duration-300"
            >
              {/* Tarjetas de Selección de Tipo (Personal / Empresa) */}
              <div>
                <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                  <p className="text-xs sm:text-sm font-semibold text-zinc-200">
                    Tipo de Titular
                  </p>
                  {clienteSeleccionado && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-in fade-in">
                      <span>✓</span>
                      <span>Cliente verificado</span>
                    </span>
                  )}
                </div>

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
                    <span className="font-medium text-xs sm:text-sm text-white">Persona Natural</span>
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
                    <span className="font-medium text-xs sm:text-sm text-white">Empresa / Taller</span>
                  </button>
                </div>
              </div>

              {/* Campos de Identificación y Contacto con Búsqueda Inteligente */}
              <div className="space-y-3.5 sm:space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  {/* Cédula o RUC con Coincidencia Automática */}
                  <div className="relative" ref={dropdownCedulaRef}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-zinc-300">
                        {tipoCliente === "Empresa" ? "RUC" : "Cédula"} <span className="text-blue-400">*</span>
                      </label>
                      {clienteSeleccionado && (
                        <span className="text-[11px] text-emerald-400 font-mono">
                          Coincidencia encontrada
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        placeholder={tipoCliente === "Empresa" ? "1790012345001" : "0912345678"}
                        value={identification}
                        onFocus={() => {
                          if (identification.trim().length >= 2) setMostrarDropdownCedula(true);
                        }}
                        onChange={(e) => handleCedulaChange(e.target.value)}
                        className={`w-full h-11 sm:h-12 pl-3.5 pr-9 sm:px-4 rounded-xl border bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none transition-colors font-mono ${
                          clienteSeleccionado
                            ? "border-emerald-500/60 focus:border-emerald-400 ring-1 ring-emerald-500/20"
                            : "border-zinc-800 focus:border-blue-500"
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none text-xs">
                        {clienteSeleccionado ? "✓" : "🔍"}
                      </div>
                    </div>

                    {/* Popover con sugerencias de coincidencia por cédula */}
                    {mostrarDropdownCedula && clientesFiltradosCedula.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto divide-y divide-zinc-800/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1.5 bg-zinc-800/50 text-[11px] text-zinc-400 font-medium">
                          Clientes coincidentes por identificación
                        </div>
                        {clientesFiltradosCedula.map((c) => (
                          <button
                            key={c.id || c.identification}
                            type="button"
                            onClick={() => seleccionarCliente(c)}
                            className="w-full text-left p-3 hover:bg-blue-600/15 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-white group-hover:text-blue-300 truncate">
                                  {c.name}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  c.type === "Empresa" || c.identification?.length === 13
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                }`}>
                                  {c.type === "Empresa" || c.identification?.length === 13 ? "Empresa" : "Persona"}
                                </span>
                              </div>
                              <div className="text-xs font-mono text-zinc-400 mt-0.5">
                                Cédula/RUC: <span className="text-zinc-200">{c.identification}</span>
                                {c.phone && <span className="ml-2 text-zinc-500">| {c.phone}</span>}
                              </div>
                            </div>
                            <span className="text-xs text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0 font-medium">
                              Cargar &rarr;
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      WhatsApp / Teléfono
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="0991234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Nombres y Apellidos con Búsqueda y Selección Interactiva */}
                <div className="relative" ref={dropdownNombreRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      {tipoCliente === "Empresa" ? "Razón Social o Nombre del Taller" : "Nombres y Apellidos"} <span className="text-blue-400">*</span>
                    </label>
                    <span className="text-[11px] text-zinc-500">
                      Puedes buscar y seleccionar de clientes registrados
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      placeholder={tipoCliente === "Empresa" ? "Taller Mecánico San José o Transportes Andinos" : "Carlos Méndez"}
                      value={customerName}
                      onFocus={() => setMostrarDropdownNombre(true)}
                      onChange={(e) => handleNombreChange(e.target.value)}
                      className={`w-full h-11 sm:h-12 pl-3.5 pr-10 sm:px-4 rounded-xl border bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none transition-colors ${
                        clienteSeleccionado
                          ? "border-emerald-500/60 focus:border-emerald-400 ring-1 ring-emerald-500/20"
                          : "border-zinc-800 focus:border-blue-500"
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-zinc-500">
                      {customerName && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerName("");
                            setClienteSeleccionado(null);
                          }}
                          className="hover:text-white p-1 text-xs"
                          title="Limpiar campo"
                        >
                          ✕
                        </button>
                      )}
                      <span className="text-xs pointer-events-none">🔍</span>
                    </div>
                  </div>

                  {/* Dropdown de Búsqueda y Selección de Clientes */}
                  {mostrarDropdownNombre && clientesFiltradosNombre.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto divide-y divide-zinc-800/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 bg-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                        <span>{customerName.trim() ? "Resultados de búsqueda" : "Clientes registrados recientemente"}</span>
                        <span>{clientesFiltradosNombre.length} encontrados</span>
                      </div>
                      {clientesFiltradosNombre.map((c) => (
                        <button
                          key={c.id || c.identification}
                          type="button"
                          onClick={() => seleccionarCliente(c)}
                          className="w-full text-left p-3 hover:bg-blue-600/15 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-white group-hover:text-blue-300 truncate">
                                {c.name}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                c.type === "Empresa" || c.identification?.length === 13
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              }`}>
                                {c.type === "Empresa" || c.identification?.length === 13 ? "Empresa" : "Persona"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                              <span className="font-mono text-zinc-300 flex items-center gap-1">
                                <span className="text-zinc-500">ID:</span> {c.identification}
                              </span>
                              {c.phone && (
                                <span className="font-mono text-zinc-400 flex items-center gap-1">
                                  <span className="text-zinc-500">Tel:</span> {c.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-medium shrink-0 flex items-center gap-1">
                            <span>Seleccionar</span>
                            <span>&rarr;</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Condiciones de la Línea de Crédito */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Cupo Límite Autorizado ($) <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                      <input
                        type="number"
                        min="1"
                        step="10"
                        required
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        placeholder="500"
                        className="w-full h-11 sm:h-12 pl-8 pr-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white font-mono font-bold placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* Chips de sugerencia rápida */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-zinc-500 mr-0.5">Sugerencias:</span>
                      {SUGERENCIAS_CUPO.map((monto) => (
                        <button
                          key={monto}
                          type="button"
                          onClick={() => setCreditLimit(monto)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                            Number(creditLimit) === monto
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-white/[0.05] hover:bg-white/[0.08] text-zinc-400 hover:text-white"
                          }`}
                        >
                          ${monto}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Saldo Deudor Inicial ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentBalance}
                        onChange={(e) => setCurrentBalance(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-11 sm:h-12 pl-8 pr-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white font-mono font-bold placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-2">
                      Ingresa 0 si no registra facturas pendientes de pago.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Fecha Límite de Pago
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Estado del Crédito
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full h-11 sm:h-12 px-3 sm:px-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="AL_DIA">Al Día (Sin atrasos)</option>
                      <option value="POR_VENCER">Por Vencer (Próximo a plazo)</option>
                      <option value="VENCIDO">Vencido (Plazo expirado)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Observaciones o Notas (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Línea aprobada por gerencia comercial, facturación mensual..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Barra Inferior de Acciones */}
              <div className="pt-5 sm:pt-6 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <Link
                  href="/pos/creditos"
                  className="w-full sm:w-auto h-11 sm:h-12 px-6 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  Cancelar
                </Link>

                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
                  {!editId && (
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() => handleGuardar(true)}
                      className="w-full sm:w-auto h-11 sm:h-12 px-5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-200 hover:text-white font-medium text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      + Guardar y Crear Otro
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={guardando}
                    className="w-full sm:w-auto h-12 px-7 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                  >
                    {guardando ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <span>{editId ? "Guardar Cambios" : "Guardar Crédito"}</span>
                        <span>✓</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </main>

      <PosMobileNav />
    </div>
  );
}

export default function NuevoCreditoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NuevoCreditoContent />
    </Suspense>
  );
}
