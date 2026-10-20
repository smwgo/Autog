"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export interface ModalNuevaOrdenProps {
  isOpen: boolean;
  onClose: () => void;
  empleadoLogueado: { id: string; nombre: string };
  mecanicos: string[];
  clientesCatalogo: any[];
  onOrdenCreada: (nuevaOrden: any, cliente?: any, tipo?: "Taller" | "Lubricentro") => void;
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
}

export default function ModalNuevaOrdenTrabajo({
  isOpen,
  onClose,
  empleadoLogueado,
  mecanicos,
  clientesCatalogo,
  onOrdenCreada,
  mostrarToast,
}: ModalNuevaOrdenProps) {
  // Stepper deslizable: 1 = Cliente, 2 = Vehículo, 3 = Orden
  const [pasoActivo, setPasoActivo] = useState<1 | 2 | 3>(1);

  // =========================================================================
  // PASO 1: CLIENTE
  // =========================================================================
  const [tipoCliente, setTipoCliente] = useState<"Persona" | "Empresa">("Persona");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [mostrarDropdownClientes, setMostrarDropdownClientes] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [mostrarFormNuevoCliente, setMostrarFormNuevoCliente] = useState(false);

  // Campos del cliente nuevo (igual que en módulo Clientes)
  const [nuevoClienteIdentificacion, setNuevoClienteIdentificacion] = useState("");
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("");
  const [nuevoClienteEmail, setNuevoClienteEmail] = useState("");
  const [nuevoClienteDireccion, setNuevoClienteDireccion] = useState("");

  // =========================================================================
  // PASO 2: VEHÍCULO
  // =========================================================================
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState<string>("NUEVO");
  const [vehiculoPlaca, setVehiculoPlaca] = useState("");
  const [vehiculoMarca, setVehiculoMarca] = useState("");
  const [vehiculoModelo, setVehiculoModelo] = useState("");
  const [vehiculoAnio, setVehiculoAnio] = useState(String(new Date().getFullYear()));
  const [vehiculoKm, setVehiculoKm] = useState("");
  const [vehiculoTipo, setVehiculoTipo] = useState("Auto");
  const [mostrarFormNuevoVehiculo, setMostrarFormNuevoVehiculo] = useState(false);

  // =========================================================================
  // PASO 3: DATOS DE LA ORDEN
  // =========================================================================
  const [tipoIngreso, setTipoIngreso] = useState<"Taller" | "Lubricentro">("Taller");
  const [ingresadoPor, setIngresadoPor] = useState(empleadoLogueado.nombre || "Hernan Marquez");
  const [asignacionesTecnicos, setAsignacionesTecnicos] = useState<
    { id: string; nombre: string; tarea: string }[]
  >([
    {
      id: "asig-1",
      nombre: empleadoLogueado.nombre || mecanicos[0] || "Carlos Rodríguez",
      tarea: "Diagnóstico y mantenimiento",
    },
  ]);
  const [mostrarFlotanteAsignar, setMostrarFlotanteAsignar] = useState(false);
  const [flotanteTecnicoSeleccionado, setFlotanteTecnicoSeleccionado] = useState("");
  const [busquedaTecnico, setBusquedaTecnico] = useState("");
  const [flotanteTarea, setFlotanteTarea] = useState("");
  const [emailContacto, setEmailContacto] = useState("");
  const [motivoIngreso, setMotivoIngreso] = useState("");
  const [creando, setCreando] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownTecnicoRef = useRef<HTMLDivElement | null>(null);
  const [mostrarDropdownTecnicos, setMostrarDropdownTecnicos] = useState(false);

  // Sincronizar el usuario logueado
  useEffect(() => {
    if (empleadoLogueado?.nombre) {
      setIngresadoPor(empleadoLogueado.nombre);
      setAsignacionesTecnicos((prev) => {
        if (prev.length === 0) {
          return [
            {
              id: "asig-1",
              nombre: empleadoLogueado.nombre,
              tarea: "Diagnóstico y mantenimiento",
            },
          ];
        }
        return prev;
      });
    }
  }, [empleadoLogueado, isOpen]);

  // Lista única consolidada de todos los técnicos conocidos
  const listaMecanicosUnica = useMemo(() => {
    const asignadosNombres = asignacionesTecnicos.map((a) => a.nombre);
    return Array.from(
      new Set(
        [empleadoLogueado?.nombre, ...mecanicos, ...asignadosNombres].filter(
          (m): m is string => Boolean(m && String(m).trim().length > 0)
        )
      )
    );
  }, [empleadoLogueado?.nombre, mecanicos, asignacionesTecnicos]);

  // Técnicos filtrados por término de búsqueda
  const mecanicosFiltrados = useMemo(() => {
    const q = busquedaTecnico.trim().toLowerCase();
    if (!q) return listaMecanicosUnica;
    return listaMecanicosUnica.filter((m) => m.toLowerCase().includes(q));
  }, [listaMecanicosUnica, busquedaTecnico]);

  // Cerrar dropdown de clientes y técnicos al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMostrarDropdownClientes(false);
      }
      if (dropdownTecnicoRef.current && !dropdownTecnicoRef.current.contains(event.target as Node)) {
        setMostrarDropdownTecnicos(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [listaClientes, setListaClientes] = useState<any[]>(clientesCatalogo || []);

  useEffect(() => {
    if (Array.isArray(clientesCatalogo) && clientesCatalogo.length > 0) {
      setListaClientes(clientesCatalogo);
    } else {
      fetch("/api/clientes")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.clientes)) {
            setListaClientes(d.clientes);
          }
        })
        .catch(() => {});
    }
  }, [clientesCatalogo]);

  // Filtrado reactivo en catálogo de clientes
  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.trim().toLowerCase();
    if (!q) return [];
    return (listaClientes || []).filter((c) => {
      const matchName = c.name?.toLowerCase().includes(q);
      const matchDoc = c.identification?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      const matchPlate = c.vehicles?.some((v: any) => v.plate?.toLowerCase().includes(q));
      return matchName || matchDoc || matchPhone || matchEmail || matchPlate;
    }).slice(0, 10);
  }, [busquedaCliente, listaClientes]);

  // Al elegir un cliente del catálogo (estilo POS)
  const handleSeleccionarCliente = (c: any) => {
    setClienteSeleccionado(c);
    setMostrarDropdownClientes(false);
    setMostrarFormNuevoCliente(false);
    setBusquedaCliente(c.name || "");
    setEmailContacto(c.email || "");

    // Si tiene vehículos asociados en Neon, precargar el primero
    if (Array.isArray(c.vehicles) && c.vehicles.length > 0) {
      const v = c.vehicles[0];
      setVehiculoSeleccionadoId(v.id || "0");
      setVehiculoPlaca(v.plate || "");
      setVehiculoMarca(v.brand || "");
      setVehiculoModelo(v.model || "");
      setVehiculoKm(v.mileage ? String(v.mileage) : "");
      setMostrarFormNuevoVehiculo(false);
    } else {
      setVehiculoSeleccionadoId("NUEVO");
      setVehiculoPlaca("");
      setVehiculoMarca("");
      setVehiculoModelo("");
      setVehiculoKm("");
      setMostrarFormNuevoVehiculo(true);
    }

    // Avanzar suavemente al paso de Vehículo
    setPasoActivo(2);
  };

  // Al elegir registrar un nuevo cliente (formulario igual a Clientes)
  const handleIniciarNuevoCliente = () => {
    setClienteSeleccionado(null);
    setMostrarFormNuevoCliente(true);
    setMostrarDropdownClientes(false);
    setNuevoClienteNombre(busquedaCliente.trim());
    setNuevoClienteIdentificacion("");
    setNuevoClienteTelefono("");
    setNuevoClienteEmail("");
    setNuevoClienteDireccion("");
  };

  // Al elegir un vehículo existente del cliente
  const handleSeleccionarVehiculo = (v: any) => {
    setVehiculoSeleccionadoId(v.id);
    setVehiculoPlaca(v.plate || "");
    setVehiculoMarca(v.brand || "");
    setVehiculoModelo(v.model || "");
    setVehiculoKm(v.mileage ? String(v.mileage) : "");
    setMostrarFormNuevoVehiculo(false);
    // Avanzar suavemente al paso de la orden
    setPasoActivo(3);
  };

  const resetFormularioCompleto = () => {
    setPasoActivo(1);
    setTipoCliente("Persona");
    setBusquedaCliente("");
    setMostrarDropdownClientes(false);
    setClienteSeleccionado(null);
    setMostrarFormNuevoCliente(false);
    setNuevoClienteIdentificacion("");
    setNuevoClienteNombre("");
    setNuevoClienteTelefono("");
    setNuevoClienteEmail("");
    setNuevoClienteDireccion("");
    setVehiculoSeleccionadoId("NUEVO");
    setVehiculoPlaca("");
    setVehiculoMarca("");
    setVehiculoModelo("");
    setVehiculoKm("");
    setVehiculoTipo("Auto");
    setMostrarFormNuevoVehiculo(false);
    setEmailContacto("");
    setMotivoIngreso("");
    setTipoIngreso("Taller");
    setIngresadoPor(empleadoLogueado.nombre || "Hernan Marquez");
    setAsignacionesTecnicos([
      {
        id: "asig-1",
        nombre: empleadoLogueado.nombre || mecanicos[0] || "Hernan Marquez",
        tarea: "Diagnóstico y mantenimiento",
      },
    ]);
  };

  // Crear la orden directamente en Neon DB y entrar a la página
  const handleCrearOrdenFinal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Validar Cliente
    const nombreFinal = (
      clienteSeleccionado ? clienteSeleccionado.name : nuevoClienteNombre
    ).trim();

    if (!nombreFinal) {
      mostrarToast("Por favor selecciona o ingresa el nombre del cliente", "err");
      setPasoActivo(1);
      return;
    }

    // 2. Validar Vehículo
    const placaFinal = vehiculoPlaca.trim().toUpperCase();
    if (!placaFinal) {
      mostrarToast("Por favor ingresa la placa del vehículo", "err");
      setPasoActivo(2);
      return;
    }

    try {
      setCreando(true);
      const mecanicosTexto =
        asignacionesTecnicos.length > 0
          ? asignacionesTecnicos
              .map((a) => (a.tarea ? `${a.nombre} (${a.tarea})` : a.nombre))
              .join(", ")
          : empleadoLogueado.nombre || "Sin asignar";

      const motivoFinal =
        tipoIngreso === "Lubricentro"
          ? `[Lubricentro] ${motivoIngreso.trim() || "Mantenimiento y lubricación"}`
          : (motivoIngreso.trim() || "Ingreso a taller");

      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREAR_ORDEN_ETAPA_1",
          customerId: clienteSeleccionado?.id || undefined,
          tipoCliente,
          nombres: nombreFinal,
          identificacion: (
            clienteSeleccionado?.identification || nuevoClienteIdentificacion
          ).trim(),
          telefono: (clienteSeleccionado?.phone || nuevoClienteTelefono).trim(),
          email: (emailContacto || nuevoClienteEmail || clienteSeleccionado?.email || "").trim() || undefined,
          ingresadoPor: ingresadoPor.trim() || empleadoLogueado.nombre,
          mechanic: mecanicosTexto,
          motivoIngreso: motivoFinal,
          placa: placaFinal,
          marca: vehiculoMarca.trim() || "Vehículo",
          modelo: vehiculoModelo.trim() || "General",
          kilometraje: vehiculoKm ? parseInt(vehiculoKm, 10) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.activeOrder) {
        onOrdenCreada(data.activeOrder, data.customer, tipoIngreso);
        mostrarToast(
          `Orden #${data.activeOrder.orderNumber} creada para ${nombreFinal} (${placaFinal})`
        );
        resetFormularioCompleto();
        onClose();
      } else {
        mostrarToast(data.error || "No se pudo crear la orden", "err");
      }
    } catch (err: any) {
      mostrarToast(err.message || "Error al conectar con la base de datos", "err");
    } finally {
      setCreando(false);
    }
  };

  if (!isOpen) return null;

  const tieneCliente = Boolean(clienteSeleccionado || nuevoClienteNombre.trim());
  const tieneVehiculo = Boolean(vehiculoPlaca.trim());

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl lg:max-w-4xl bg-[#141417] text-white border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] transition-all"
      >
        {/* Cabecera Superior: Título + Stepper Deslizable + Botón X */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm">
              OT
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {(asignacionesTecnicos?.[0]?.nombre || empleadoLogueado?.nombre) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <strong className="text-white font-semibold">{asignacionesTecnicos?.[0]?.nombre || empleadoLogueado?.nombre}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stepper Deslizable Horizontal */}
          <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setPasoActivo(1)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                pasoActivo === 1
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : tieneCliente
                  ? "text-emerald-400 hover:text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                {tieneCliente ? "✓" : "1"}
              </span>
              <span>1. Cliente</span>
            </button>

            <span className="text-zinc-600">→</span>

            <button
              type="button"
              onClick={() => tieneCliente && setPasoActivo(2)}
              disabled={!tieneCliente}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                pasoActivo === 2
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 cursor-pointer"
                  : tieneVehiculo
                  ? "text-emerald-400 hover:text-white cursor-pointer"
                  : tieneCliente
                  ? "text-zinc-300 hover:text-white cursor-pointer"
                  : "text-zinc-600 cursor-not-allowed"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                {tieneVehiculo ? "✓" : "2"}
              </span>
              <span>2. Vehículo</span>
            </button>

            <span className="text-zinc-600">→</span>

            <button
              type="button"
              onClick={() => tieneCliente && tieneVehiculo && setPasoActivo(3)}
              disabled={!tieneCliente || !tieneVehiculo}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                pasoActivo === 3
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 cursor-pointer"
                  : tieneCliente && tieneVehiculo
                  ? "text-zinc-300 hover:text-white cursor-pointer"
                  : "text-zinc-600 cursor-not-allowed"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                3
              </span>
              <span>3. Orden</span>
            </button>
          </div>

          {/* Botón X para cerrar sin llenar */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer text-sm"
            title="Cerrar y ver panel de taller"
          >
            ✕
          </button>
        </div>

        {/* Contenido Principal con Contenedor Deslizable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* =================================================================
              PASO 1: BUSCADOR Y SELECCIÓN DE CLIENTE (O FORMULARIO COMPLETO)
              ================================================================= */}
          {pasoActivo === 1 && (
            <div className="space-y-5 animate-fade-in">

              {/* Barra de Búsqueda Inteligente con Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={busquedaCliente}
                      onChange={(e) => {
                        setBusquedaCliente(e.target.value);
                        setMostrarDropdownClientes(true);
                        if (clienteSeleccionado && e.target.value !== clienteSeleccionado.name) {
                          setClienteSeleccionado(null);
                        }
                      }}
                      onFocus={() => {
                        if (busquedaCliente.trim()) setMostrarDropdownClientes(true);
                      }}
                      placeholder="Buscar cliente, cédula o WhatsApp..."
                      className="w-full h-12 pl-11 pr-24 rounded-2xl bg-black/40 border border-white/15 focus:border-blue-500 text-white text-sm placeholder:text-zinc-500 focus:outline-none transition-all shadow-inner"
                      autoFocus
                    />
                    <svg
                      className="w-5 h-5 text-zinc-400 absolute left-3.5 top-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>

                    {busquedaCliente && (
                      <button
                        type="button"
                        onClick={() => {
                          setBusquedaCliente("");
                          setClienteSeleccionado(null);
                        }}
                        className="absolute right-3 top-3 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleIniciarNuevoCliente}
                    className="h-12 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-md shadow-blue-600/30"
                  >
                    <span className="text-sm font-bold">+</span>
                    <span>Nuevo</span>
                  </button>
                </div>

                {/* Lista de Coincidencias al Escribir */}
                {busquedaCliente.trim().length > 0 && !clienteSeleccionado && (
                  <div className="mt-3 bg-[#18181c] border border-white/15 rounded-2xl shadow-xl p-2 space-y-2">
                    {/* Botón destacado siempre visible arriba SIN DESLIZAR */}
                    <div
                      onClick={handleIniciarNuevoCliente}
                      className="p-2.5 sm:p-3 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-200 border border-blue-500/30 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-300">
                          +
                        </span>
                        <span className="text-xs sm:text-sm font-semibold">
                          Nuevo cliente
                        </span>
                      </div>
                      <span className="text-xs text-blue-400 font-medium">Crear →</span>
                    </div>

                    {/* Scroll únicamente para los resultados existentes */}
                    {clientesFiltrados.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                        {clientesFiltrados.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSeleccionarCliente(c)}
                            className="p-3 rounded-xl hover:bg-white/10 cursor-pointer transition-all flex items-center justify-between gap-3 group bg-white/[0.02]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center text-sm shrink-0 border border-blue-500/30 group-hover:scale-105 transition-transform">
                                {(c.name || "C").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                                <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-400">
                                  {c.identification && (
                                    <span className="font-mono text-zinc-300">{c.identification}</span>
                                  )}
                                  {c.phone && <span>• WhatsApp: {c.phone}</span>}
                                  {c.email && (
                                    <span className="truncate max-w-[160px]"> • {c.email}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold">
                                {c.vehicles?.length || 0} auto(s)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 text-center text-xs text-zinc-400">
                        Sin resultados
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Si ya seleccionó un cliente existente (Card Resumen estilo POS) */}
              {clienteSeleccionado && !mostrarFormNuevoCliente && (
                <div className="p-4 rounded-2xl bg-blue-600/[0.08] border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-md shadow-blue-600/30">
                      {(clienteSeleccionado.name || "C").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-white">
                          {clienteSeleccionado.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                          ✓ Seleccionado
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-zinc-400 mt-0.5">
                        {clienteSeleccionado.identification && (
                          <span className="font-mono text-zinc-300">
                            Doc: {clienteSeleccionado.identification}
                          </span>
                        )}
                        {clienteSeleccionado.phone && (
                          <span>WhatsApp: {clienteSeleccionado.phone}</span>
                        )}
                        {clienteSeleccionado.email && (
                          <span>Email: {clienteSeleccionado.email}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setClienteSeleccionado(null);
                        setBusquedaCliente("");
                      }}
                      className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasoActivo(2)}
                      className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                    >
                      <span>Continuar al Vehículo</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Formulario Completo de Cliente Nuevo (Mismo formato que el módulo Clientes) */}
              {mostrarFormNuevoCliente && (
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-blue-500/30 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      <h4 className="text-sm font-bold text-white">
                        Nuevo Cliente
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMostrarFormNuevoCliente(false)}
                      className="text-xs text-zinc-400 hover:text-white"
                    >
                      Volver
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                    <div className="sm:col-span-2">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Nombre Completo o Razón Social *
                      </label>
                      <input
                        type="text"
                        value={nuevoClienteNombre}
                        onChange={(e) => setNuevoClienteNombre(e.target.value)}
                        placeholder="Ej: Camila Soto Riquelme"
                        className="w-full h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500 text-white text-xs focus:outline-none"
                        required
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Cédula / RUC / RUT *
                      </label>
                      <input
                        type="text"
                        value={nuevoClienteIdentificacion}
                        onChange={(e) => setNuevoClienteIdentificacion(e.target.value)}
                        placeholder="Ej: 17945320-4"
                        className="w-full h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500 text-white font-mono text-xs focus:outline-none"
                        required
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Teléfono / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        value={nuevoClienteTelefono}
                        onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                        placeholder="Ej: +56 9 3322 1100"
                        className="w-full h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500 text-white text-xs focus:outline-none"
                        required
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={nuevoClienteEmail}
                        onChange={(e) => {
                          setNuevoClienteEmail(e.target.value);
                          setEmailContacto(e.target.value);
                        }}
                        placeholder="correo@ejemplo.com"
                        className="w-full h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500 text-white text-xs focus:outline-none"
                      />
                    </div>

                    <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Dirección (Opcional)
                      </label>
                      <input
                        type="text"
                        value={nuevoClienteDireccion}
                        onChange={(e) => setNuevoClienteDireccion(e.target.value)}
                        placeholder="Ciudad o sector"
                        className="w-full h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!nuevoClienteNombre.trim()) {
                          mostrarToast("Ingresa el nombre del cliente", "err");
                          return;
                        }
                        setPasoActivo(2);
                      }}
                      className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                    >
                      <span>Guardar Cliente y Pasar al Vehículo</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              PASO 2: VEHÍCULO DEL CLIENTE (SELECCIÓN O FORMULARIO NUEVO)
              ================================================================= */}
          {pasoActivo === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Vehículo
                  </h3>
                  <p className="text-xs text-zinc-400 font-normal">
                    Cliente: <span className="text-zinc-200">{clienteSeleccionado?.name || nuevoClienteNombre}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Icono Registrar otro vehículo para este cliente */}
                  {clienteSeleccionado?.vehicles?.length > 0 && !mostrarFormNuevoVehiculo && (
                    <button
                      type="button"
                      onClick={() => {
                        setVehiculoSeleccionadoId("NUEVO");
                        setVehiculoPlaca("");
                        setVehiculoMarca("");
                        setVehiculoModelo("");
                        setVehiculoKm("");
                        setMostrarFormNuevoVehiculo(true);
                      }}
                      title="Registrar otro vehículo nuevo para este cliente"
                      aria-label="Registrar otro vehículo"
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                        <circle cx="7" cy="17" r="2" />
                        <path d="M9 17h6" />
                        <circle cx="17" cy="17" r="2" />
                      </svg>
                    </button>
                  )}

                  {/* Icono volver a lista de vehículos guardados si está en el form de nuevo */}
                  {clienteSeleccionado?.vehicles?.length > 0 && mostrarFormNuevoVehiculo && (
                    <button
                      type="button"
                      onClick={() => setMostrarFormNuevoVehiculo(false)}
                      title="Ver vehículos guardados"
                      aria-label="Ver vehículos guardados"
                      className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </button>
                  )}

                  {/* Icono Cambiar Cliente */}
                  <button
                    type="button"
                    onClick={() => setPasoActivo(1)}
                    title="Cambiar cliente"
                    aria-label="Cambiar cliente"
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-blue-500/15 border border-white/10 hover:border-blue-500/40 text-zinc-400 hover:text-blue-400 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Si el cliente ya tiene vehículos registrados en Neon */}
              {clienteSeleccionado?.vehicles?.length > 0 && !mostrarFormNuevoVehiculo && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {clienteSeleccionado.vehicles.map((v: any) => {
                      const seleccionado = vehiculoSeleccionadoId === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => handleSeleccionarVehiculo(v)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            seleccionado
                              ? "bg-emerald-600/15 border-emerald-500 shadow-md ring-1 ring-emerald-500/50"
                              : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10"
                          }`}
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-normal text-zinc-100 leading-tight">
                              {[v.brand, v.model].filter(Boolean).join(" ")
                                ? `${[v.brand, v.model].filter(Boolean).join(" ")} ${v.year ? `(${v.year})` : ""}`.trim()
                                : v.plate}
                            </p>
                            <div>
                              <span className="px-2 py-0.5 rounded-lg bg-black/60 border border-white/10 font-mono text-xs font-bold text-zinc-200 inline-block">
                                {v.plate}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {seleccionado ? (
                              <span className="w-8 h-8 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-sm shadow-sm">
                                ✓
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300">
                                Elegir →
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Formulario de Vehículo (Si es nuevo o el cliente no tenía vehículos) */}
              {(mostrarFormNuevoVehiculo || !clienteSeleccionado?.vehicles?.length) && (
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-zinc-200">
                      Datos del Vehículo:
                    </span>
                    {clienteSeleccionado?.vehicles?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMostrarFormNuevoVehiculo(false)}
                        className="text-xs text-zinc-400 hover:text-white cursor-pointer"
                      >
                        Ver guardados
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="col-span-1">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Placa *
                      </label>
                      <input
                        type="text"
                        value={vehiculoPlaca}
                        onChange={(e) => setVehiculoPlaca(e.target.value.toUpperCase())}
                        placeholder="Ej: ABC-1234"
                        className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/15 focus:border-emerald-500 text-white font-mono font-bold uppercase text-sm tracking-wider focus:outline-none"
                        required
                        autoFocus
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={vehiculoMarca}
                        onChange={(e) => setVehiculoMarca(e.target.value)}
                        placeholder="Ej: Toyota"
                        className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-emerald-500 text-white text-xs sm:text-sm focus:outline-none"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Modelo
                      </label>
                      <input
                        type="text"
                        value={vehiculoModelo}
                        onChange={(e) => setVehiculoModelo(e.target.value)}
                        placeholder="Ej: Hilux"
                        className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-emerald-500 text-white text-xs sm:text-sm focus:outline-none"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Kilometraje (Km)
                      </label>
                      <input
                        type="number"
                        value={vehiculoKm}
                        onChange={(e) => setVehiculoKm(e.target.value)}
                        placeholder="Ej: 48500"
                        className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-emerald-500 text-white font-mono text-xs sm:text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="col-span-1">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Año
                      </label>
                      <input
                        type="text"
                        value={vehiculoAnio}
                        onChange={(e) => setVehiculoAnio(e.target.value)}
                        placeholder="2024"
                        className="w-full h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-zinc-300 font-semibold block mb-1">
                        Tipo de Carrocería
                      </label>
                      <select
                        value={vehiculoTipo}
                        onChange={(e) => setVehiculoTipo(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-[#1c1c21] border border-white/10 text-white text-xs focus:outline-none cursor-pointer"
                      >
                        <option value="Auto">Auto / Sedán</option>
                        <option value="SUV">SUV</option>
                        <option value="Camioneta">Camioneta / Pick-up</option>
                        <option value="Moto">Moto</option>
                        <option value="Camión">Camión / Pesado</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!vehiculoPlaca.trim()) {
                            mostrarToast("Ingresa la placa del vehículo", "err");
                            return;
                          }
                          setPasoActivo(3);
                        }}
                        className="w-full h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
                      >
                        <span>Confirmar Vehículo</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* =================================================================
              PASO 3: DATOS DE LA ORDEN (RESPONSABLES, MOTIVO Y CONFIRMACIÓN)
              ================================================================= */}
          {pasoActivo === 3 && (
            <div className="space-y-5 animate-fade-in">
              {/* Tarjeta Resumen de Cliente + Vehículo */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-lg shrink-0 border border-blue-500/20">
                    🚗
                  </div>
                  <div className="min-w-0">
                    <span className="text-zinc-100 font-normal block text-sm truncate">
                      {vehiculoMarca || "Vehículo"} {vehiculoModelo} {vehiculoPlaca ? `(${vehiculoPlaca})` : ""}
                    </span>
                    <span className="text-zinc-400 font-normal block truncate">
                      Cliente: <span className="text-zinc-200">{clienteSeleccionado?.name || nuevoClienteNombre}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPasoActivo(2)}
                    title="Cambiar auto"
                    aria-label="Cambiar auto"
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                      <circle cx="7" cy="17" r="2" />
                      <path d="M9 17h6" />
                      <circle cx="17" cy="17" r="2" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasoActivo(1)}
                    title="Cambiar cliente"
                    aria-label="Cambiar cliente"
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-blue-500/15 border border-white/10 hover:border-blue-500/40 text-zinc-400 hover:text-blue-400 flex items-center justify-center transition-all cursor-pointer shadow-xs"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Formulario de Asignación de Técnicos */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="block text-zinc-300 font-semibold text-xs flex items-center gap-2">
                    <span>Técnico</span>
                    {asignacionesTecnicos.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                        {asignacionesTecnicos.length}
                      </span>
                    )}
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setFlotanteTecnicoSeleccionado("");
                      setBusquedaTecnico("");
                      setFlotanteTarea(
                        tipoIngreso === "Lubricentro"
                          ? "Cambio de aceite y filtros"
                          : "Diagnóstico y reparación"
                      );
                      setMostrarDropdownTecnicos(true);
                      setMostrarFlotanteAsignar(true);
                    }}
                    className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-600/20 active:scale-95"
                  >
                    <span className="text-sm font-bold leading-none">+</span>
                    <span>Asignar Técnico</span>
                  </button>
                </div>

                {/* Tarjetas de Técnicos Asignados y Qué van a hacer */}
                {asignacionesTecnicos.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-zinc-400 space-y-2">
                    <p>No hay técnicos asignados aún para esta orden.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setFlotanteTecnicoSeleccionado(listaMecanicosUnica[0] || empleadoLogueado.nombre || "");
                        setFlotanteTarea(
                          tipoIngreso === "Lubricentro"
                            ? "Cambio de aceite y filtros"
                            : "Diagnóstico y reparación"
                        );
                        setMostrarFlotanteAsignar(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-blue-400 font-semibold text-xs cursor-pointer"
                    >
                      + Asignar primer técnico
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {asignacionesTecnicos.map((asig) => (
                      <div
                        key={asig.id}
                        className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-300 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-500/30">
                            {asig.nombre.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <strong className="text-white text-xs block truncate">{asig.nombre}</strong>
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                              <span className="text-blue-400">📋</span>
                              <span className="truncate">{asig.tarea || "Trabajo general"}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAsignacionesTecnicos((prev) => prev.filter((a) => a.id !== asig.id))}
                          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0 text-xs"
                          title="Quitar técnico"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FLOTANTE / MODAL DE ASIGNACIÓN DE TÉCNICO Y TAREA */}
              {mostrarFlotanteAsignar && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                  <div className="w-full max-w-md bg-[#16161a] border border-white/15 rounded-3xl shadow-2xl p-5 space-y-4 animate-scale-in">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-300 flex items-center justify-center font-bold text-sm border border-blue-500/30">
                          👷
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">Asignar Técnico</h4>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteAsignar(false)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Seleccionar Empleado con Buscador Dropdown */}
                    <div className="space-y-1.5 relative" ref={dropdownTecnicoRef}>
                      <label className="block text-zinc-300 font-semibold text-xs">
                        Técnico:
                      </label>

                      <div className="relative">
                        <input
                          type="text"
                          value={busquedaTecnico}
                          onChange={(e) => {
                            setBusquedaTecnico(e.target.value);
                            setMostrarDropdownTecnicos(true);
                          }}
                          onFocus={() => {
                            setMostrarDropdownTecnicos(true);
                          }}
                          placeholder="Buscar..."
                          className="w-full h-11 pl-10 pr-16 rounded-xl bg-black/40 border border-white/15 focus:border-blue-500 text-white text-xs sm:text-sm placeholder:text-zinc-500 focus:outline-none transition-all cursor-text"
                        />
                        <svg
                          className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>

                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {busquedaTecnico && (
                            <button
                              type="button"
                              onClick={() => {
                                setBusquedaTecnico("");
                                setFlotanteTecnicoSeleccionado("");
                                setMostrarDropdownTecnicos(true);
                              }}
                              className="text-zinc-400 hover:text-white cursor-pointer p-1 text-xs"
                              title="Borrar nombre"
                            >
                              ✕
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setMostrarDropdownTecnicos((prev) => !prev)}
                            className="text-zinc-400 hover:text-white cursor-pointer p-1"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${mostrarDropdownTecnicos ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Dropdown flotante con los técnicos */}
                      {mostrarDropdownTecnicos && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#16161b] border border-white/15 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                          {mecanicosFiltrados.length > 0 ? (
                            <div className="p-1 space-y-0.5">
                              {mecanicosFiltrados.map((m) => {
                                const seleccionado = flotanteTecnicoSeleccionado.trim().toLowerCase() === m.trim().toLowerCase();
                                return (
                                  <div
                                    key={m}
                                    onClick={() => {
                                      setFlotanteTecnicoSeleccionado(m);
                                      setBusquedaTecnico(m);
                                      setMostrarDropdownTecnicos(false);
                                    }}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-between transition-colors ${
                                      seleccionado
                                        ? "bg-blue-600 text-white font-semibold"
                                        : "text-zinc-200 hover:bg-white/[0.08]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className={`w-2 h-2 rounded-full shrink-0 ${seleccionado ? "bg-white" : "bg-emerald-400"}`} />
                                      <span className="truncate">{m}</span>
                                    </div>
                                    {seleccionado && <span className="text-xs">✓</span>}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 text-center space-y-2">
                              <p className="text-xs text-zinc-400">No se encontró "{busquedaTecnico}"</p>
                              {busquedaTecnico.trim() && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFlotanteTecnicoSeleccionado(busquedaTecnico.trim());
                                    setBusquedaTecnico(busquedaTecnico.trim());
                                    setMostrarDropdownTecnicos(false);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Usar "{busquedaTecnico.trim()}"
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Qué va a hacer */}
                    <div className="space-y-1.5">
                      <label className="block text-zinc-300 font-semibold text-xs">
                        Labor:
                      </label>
                      <input
                        type="text"
                        value={flotanteTarea}
                        onChange={(e) => setFlotanteTarea(e.target.value)}
                        placeholder="Labor..."
                        className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500 text-white text-xs sm:text-sm focus:outline-none"
                        autoFocus
                      />

                      {/* Sugerencias Rápidas de Tarea */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(tipoIngreso === "Lubricentro"
                          ? [
                              { nombre: "Aceite", color: "bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20" },
                              { nombre: "Filtros", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20" },
                              { nombre: "Fluidos", color: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20" },
                              { nombre: "Frenos", color: "bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/20" },
                              { nombre: "Batería", color: "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20" },
                              { nombre: "Engrase", color: "bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20" },
                            ]
                          : [
                              { nombre: "Diagnóstico", color: "bg-blue-500/10 border-blue-500/20 text-blue-300 hover:bg-blue-500/20" },
                              { nombre: "Mantenimiento", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20" },
                              { nombre: "Frenos", color: "bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/20" },
                              { nombre: "Motor", color: "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20" },
                              { nombre: "Suspensión", color: "bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20" },
                              { nombre: "Eléctrico", color: "bg-cyan-500/10 border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20" },
                            ]
                        ).map((sug) => (
                          <button
                            key={sug.nombre}
                            type="button"
                            onClick={() => setFlotanteTarea(sug.nombre)}
                            className={`px-2.5 py-1 rounded-xl border text-xs font-normal transition-all cursor-pointer ${sug.color}`}
                          >
                            {sug.nombre}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Botón Guardar Asignación */}
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setMostrarFlotanteAsignar(false)}
                        className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!flotanteTecnicoSeleccionado.trim() && !busquedaTecnico.trim()}
                        onClick={() => {
                          const tecnicoFinal = flotanteTecnicoSeleccionado.trim() || busquedaTecnico.trim();
                          if (!tecnicoFinal) return;
                          const nuevaAsig = {
                            id: `asig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                            nombre: tecnicoFinal,
                            tarea:
                              flotanteTarea.trim() ||
                              (tipoIngreso === "Lubricentro"
                                ? "Servicio de lubricación"
                                : "Diagnóstico y reparación"),
                          };
                          setAsignacionesTecnicos((prev) => [
                            ...prev.filter((a) => a.nombre !== tecnicoFinal),
                            nuevaAsig,
                          ]);
                          setMostrarFlotanteAsignar(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-600/30"
                      >
                        Registrar Asignación
                      </button>
                    </div>
                  </div>
                </div>
              )}

                {/* Motivo de ingreso */}
                <div>
                  <textarea
                    rows={3}
                    value={motivoIngreso}
                    onChange={(e) => setMotivoIngreso(e.target.value)}
                    placeholder="Motivo de ingreso..."
                    className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 focus:border-blue-500 text-white text-xs sm:text-sm focus:outline-none resize-none"
                  />
                </div>
              </div>
          )}
        </div>

        {/* Pie Inferior: Cancelar + Navegación + Crear Orden */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-white/10 flex items-center justify-between bg-black/30">
          <button
            type="button"
            onClick={onClose}
            disabled={creando}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            {pasoActivo < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (pasoActivo === 1) {
                    if (!tieneCliente) {
                      mostrarToast("Selecciona o ingresa un cliente primero", "err");
                      return;
                    }
                    setPasoActivo(2);
                  } else if (pasoActivo === 2) {
                    if (!tieneVehiculo) {
                      mostrarToast("Ingresa la placa del vehículo", "err");
                      return;
                    }
                    setPasoActivo(3);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-95"
              >
                <span>Siguiente</span>
                <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCrearOrdenFinal}
                disabled={creando}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-400/40 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-lg shadow-blue-600/30 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {creando ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    <span>Creando orden...</span>
                  </>
                ) : (
                  <>
                    <span>Crear orden</span>
                    <span>✓</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
