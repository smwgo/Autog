"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface LubricentroExpressProps {
  empleadoLogueado: { id: string; nombre: string };
  mecanicos?: string[];
  clientesCatalogo?: any[];
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
  onOrdenCreada?: (orden: any) => void;
  onCambiarATaller?: () => void;
  ordenActiva?: any;
}

export interface ServicioExpressItem {
  id: string;
  name: string;
  category: "Lubricantes" | "Filtros" | "Llantera" | "Baterías" | "Lavado";
  empleado_id: string;
  empleado_nombre: string;
  detalles?: string;
}

export default function LubricentroExpress({
  empleadoLogueado,
  mecanicos = [],
  clientesCatalogo = [],
  mostrarToast,
  onOrdenCreada,
  onCambiarATaller,
  ordenActiva,
}: LubricentroExpressProps) {
  const router = useRouter();

  // =========================================================================
  // 1. CABECERA: PLACA, CLIENTE Y KILOMETRAJE CON CÁLCULO DE PRÓXIMO CAMBIO
  // =========================================================================
  const [placa, setPlaca] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [vehiculoMarcaModelo, setVehiculoMarcaModelo] = useState("");
  const [kmActual, setKmActual] = useState<string>("");
  const [intervaloAceite, setIntervaloAceite] = useState<number>(5000); // +5.000 km por defecto
  const [clienteEncontrado, setClienteEncontrado] = useState<boolean>(false);
  const [buscandoVehiculo, setBuscandoVehiculo] = useState<boolean>(false);

  useEffect(() => {
    if (ordenActiva) {
      if (ordenActiva.plate) setPlaca(ordenActiva.plate);
      if (ordenActiva.client) setClienteNombre(ordenActiva.client);
      if (ordenActiva.clientPhone) setClienteTelefono(ordenActiva.clientPhone);
      if (ordenActiva.vehicle) setVehiculoMarcaModelo(ordenActiva.vehicle);
      if (ordenActiva.mileage) setKmActual(String(ordenActiva.mileage));
      setClienteEncontrado(true);
    }
  }, [ordenActiva]);

  // =========================================================================
  // MULTI-EMPLEADO: SELECCIÓN DEL EMPLEADO QUE ESTÁ MARCANDO EL TRABAJO
  // =========================================================================
  const listaEmpleados = useMemo(() => {
    const nombres = Array.from(
      new Set(
        [
          empleadoLogueado?.nombre,
          ...mecanicos,
          "Hernan Marquez",
          "Carlos Rodríguez",
          "Luis Martínez",
          "Ana Torres",
        ].filter(Boolean)
      )
    );
    return nombres.map((nom, idx) => ({
      id: nom === empleadoLogueado?.nombre ? empleadoLogueado?.id || `emp-${idx}` : `emp-${idx}`,
      nombre: nom,
    }));
  }, [empleadoLogueado, mecanicos]);

  const [empleadoActivo, setEmpleadoActivo] = useState<{ id: string; nombre: string }>(
    listaEmpleados[0] || { id: "emp-1", nombre: "Técnico Express" }
  );

  // Registro dinámico multi-empleado de servicios marcados (CERO PRECIOS EN GARAJE)
  const [serviciosAsignados, setServiciosAsignados] = useState<Record<string, ServicioExpressItem>>({});

  // Cálculo automático del Próximo Cambio de Aceite
  const kmProximoCambio = useMemo(() => {
    const numActual = parseInt(kmActual.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numActual) || numActual <= 0) return null;
    return numActual + intervaloAceite;
  }, [kmActual, intervaloAceite]);

  // Búsqueda inteligente por Placa o Cédula en el catálogo de Neon
  const buscarPlacaDebounced = useRef<NodeJS.Timeout | null>(null);

  const handleCambioPlaca = (val: string) => {
    const limpio = val.toUpperCase().replace(/\s+/g, "");
    setPlaca(limpio);

    if (buscarPlacaDebounced.current) clearTimeout(buscarPlacaDebounced.current);

    if (limpio.length >= 3) {
      setBuscandoVehiculo(true);
      buscarPlacaDebounced.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/clientes?q=${encodeURIComponent(limpio)}`);
          if (res.ok) {
            const data = await res.json();
            const clientes = data.clientes || data || [];
            if (Array.isArray(clientes) && clientes.length > 0) {
              let vehiculoMatch: any = null;
              let clienteMatch: any = null;

              for (const c of clientes) {
                if (Array.isArray(c.vehicles)) {
                  const v = c.vehicles.find(
                    (veh: any) =>
                      veh.plate?.toUpperCase().replace(/\s+/g, "") === limpio
                  );
                  if (v) {
                    vehiculoMatch = v;
                    clienteMatch = c;
                    break;
                  }
                }
              }

              if (vehiculoMatch && clienteMatch) {
                setClienteNombre(clienteMatch.name || "");
                setClienteTelefono(clienteMatch.phone || "");
                setVehiculoMarcaModelo(
                  `${vehiculoMatch.brand || ""} ${vehiculoMatch.model || ""}`.trim()
                );
                if (vehiculoMatch.mileage) {
                  setKmActual(String(vehiculoMatch.mileage));
                }
                setClienteEncontrado(true);
                mostrarToast(`Vehículo encontrado: ${clienteMatch.name}`);
              } else {
                setClienteEncontrado(false);
              }
            }
          }
        } catch {
          // ignore error
        } finally {
          setBuscandoVehiculo(false);
        }
      }, 400);
    } else {
      setClienteEncontrado(false);
      setBuscandoVehiculo(false);
    }
  };

  // Helper para asignar o quitar un servicio asociando al empleado activo
  const toggleServicioMultiEmpleado = (
    key: string,
    name: string,
    category: "Lubricantes" | "Filtros" | "Llantera" | "Baterías" | "Lavado",
    detalles?: string
  ) => {
    setServiciosAsignados((prev) => {
      const copy = { ...prev };
      if (copy[key]) {
        delete copy[key];
      } else {
        copy[key] = {
          id: key,
          name,
          category,
          empleado_id: empleadoActivo.id,
          empleado_nombre: empleadoActivo.nombre,
          detalles,
        };
      }
      return copy;
    });
  };

  // =========================================================================
  // 2. ESTACIONES EXPRESS (SELECCIÓN EN 1 TOQUE - CERO PRECIOS)
  // =========================================================================
  const [estacionActiva, setEstacionActiva] = useState<"lubricantes" | "filtros" | "llantas" | "baterias" | "lavado">("lubricantes");

  // A) Lubricantes y Fluidos
  const [viscosidad, setViscosidad] = useState<string>("");
  const [tipoBase, setTipoBase] = useState<string>("");
  const [galonesAceite, setGalonesAceite] = useState<number>(1);

  // C) Llantera y Parches (Selector Visual 4 ruedas + Repuesto)
  const [ruedaSeleccionada, setRuedaSeleccionada] = useState<"DI" | "DD" | "TI" | "TD" | "REP">("DI");

  // D) Baterías y Cambios Rápidos
  const [fotoBateriaR2, setFotoBateriaR2] = useState<string | null>(null);
  const [subiendoFotoR2, setSubiendoFotoR2] = useState(false);
  const inputFotoBateriaRef = useRef<HTMLInputElement | null>(null);

  // Estado de guardado y Sticker Térmico QR
  const [enviandoAPos, setEnviandoAPos] = useState(false);
  const [mostrarModalStickerQr, setMostrarModalStickerQr] = useState(false);
  const [datosStickerGenerado, setDatosStickerGenerado] = useState<any | null>(null);

  // Subir foto rápida de batería a Cloudflare R2
  const handleSubirFotoBateriaR2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSubiendoFotoR2(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "baterias-express");

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setFotoBateriaR2(data.url);
        toggleServicioMultiEmpleado(
          "bat-cambio",
          "Cambio de Batería con Garantía",
          "Baterías",
          `Foto de serie en R2: ${data.url}`
        );
        mostrarToast("Foto de batería guardada en Cloudflare R2");
      } else {
        mostrarToast(data.error || "No se pudo subir la foto", "err");
      }
    } catch {
      mostrarToast("Error de conexión al subir la imagen", "err");
    } finally {
      setSubiendoFotoR2(false);
    }
  };

  // Lista de items compilados para la orden
  const itemsCompilados = useMemo(() => {
    return Object.values(serviciosAsignados);
  }, [serviciosAsignados]);

  // Conteo de items activos por estación para las pestañas
  const conteoEstaciones = useMemo(() => {
    const items = Object.values(serviciosAsignados);
    const lub = items.filter((i) => i.category === "Lubricantes").length;
    const fil = items.filter((i) => i.category === "Filtros").length;
    const lla = items.filter((i) => i.category === "Llantera").length;
    const bat = items.filter((i) => i.category === "Baterías").length;
    const lav = items.filter((i) => i.category === "Lavado").length;
    return {
      lubricantes: lub,
      filtros: fil,
      llantas: lla,
      baterias: bat,
      lavado: lav,
      total: items.length,
    };
  }, [serviciosAsignados]);

  // =========================================================================
  // PASE DIRECTO A POS DE OFICINA EN 1 CLIC + GENERACIÓN DE STICKER TÉRMICO QR
  // =========================================================================
  const handleEnviarAOficinaPosYSticker = async () => {
    const placaFinal = placa.trim().toUpperCase();
    if (!placaFinal) {
      mostrarToast("Por favor ingresa la placa del vehículo", "err");
      return;
    }
    if (itemsCompilados.length === 0) {
      mostrarToast("Marca al menos un servicio en las estaciones express", "err");
      return;
    }

    try {
      setEnviandoAPos(true);
      const kmNum = parseInt(kmActual.replace(/[^0-9]/g, ""), 10) || 0;

      const payload = {
        action: "REGISTRAR_LUBRICENTRO_EXPRESS",
        placa: placaFinal,
        marcaModelo: vehiculoMarcaModelo || "Auto Express",
        clienteNombre: clienteNombre.trim() || `Cliente Placa ${placaFinal}`,
        clienteTelefono: clienteTelefono.trim(),
        kmActual: kmNum,
        kmProximoCambio: kmProximoCambio || (kmNum > 0 ? kmNum + 5000 : 5000),
        viscosidad,
        tipoBase,
        serviciosExpress: itemsCompilados,
        fotoBateriaUrl: fotoBateriaR2 || null,
        crearSolicitudPos: true,
      };

      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        // Guardar en sessionStorage para que el módulo POS (/pos/venta) lo precargue de inmediato
        if (data.solicitudPos) {
          try {
            sessionStorage.setItem(
              "pos_despacho_solicitud",
              JSON.stringify(data.solicitudPos)
            );
          } catch {}
        }

        const stickerInfo = {
          placa: placaFinal,
          cliente: clienteNombre.trim() || "Cliente Express",
          vehiculo: vehiculoMarcaModelo || "Vehículo",
          kmActual: kmNum,
          kmProximo: data.kmProximoCambio || kmProximoCambio,
          viscosidad: viscosidad || "10W-30",
          tipoBase: tipoBase || "Semi-Sintético",
          servicios: itemsCompilados,
          solicitudId: data.solicitudPos?.requestNumber || "LUB-POS",
          fecha: new Date().toLocaleDateString("es-EC", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          hora: new Date().toLocaleTimeString("es-EC", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
            `AUTOG-LUBRICENTRO|PLACA:${placaFinal}|KM_PROX:${data.kmProximoCambio || kmProximoCambio}|FECHA:${new Date().toISOString().split("T")[0]}`
          )}`,
        };

        setDatosStickerGenerado(stickerInfo);
        setMostrarModalStickerQr(true);
        mostrarToast("¡Orden enviada a POS de Oficina y registrada en Neon!");

        if (onOrdenCreada && data.activeOrder) {
          onOrdenCreada(data.activeOrder);
        }
      } else {
        mostrarToast(data.error || "No se pudo registrar en la base de datos", "err");
      }
    } catch {
      mostrarToast("Error de conexión al guardar el servicio", "err");
    } finally {
      setEnviandoAPos(false);
    }
  };

  const handleLimpiarFormulario = () => {
    setPlaca("");
    setClienteNombre("");
    setClienteTelefono("");
    setVehiculoMarcaModelo("");
    setKmActual("");
    setViscosidad("");
    setTipoBase("");
    setServiciosAsignados({});
    setFotoBateriaR2(null);
    setMostrarModalStickerQr(false);
  };

  return (
    <div className="space-y-6 animate-fade-in text-white pb-24">


      {/* =====================================================================
          1. CABECERA: PLACA + CÁLCULO AUTOMÁTICO DE PRÓXIMO CAMBIO
          ===================================================================== */}
      <section className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Placa y Vehículo */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <span>Placa o Cédula</span>
                {buscandoVehiculo && (
                  <span className="text-[10px] text-blue-400 animate-pulse font-normal">Buscando en Neon...</span>
                )}
              </label>

              {clienteEncontrado && (
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Registrado en Neon
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={placa}
                onChange={(e) => handleCambioPlaca(e.target.value)}
                placeholder="ABC-1234"
                className="w-40 sm:w-44 h-11 px-3 rounded-xl bg-black/40 border border-white/10 font-mono text-base font-bold text-blue-300 tracking-wider focus:outline-none focus:border-blue-500 uppercase placeholder:text-zinc-600 shadow-inner"
              />
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Nombre del Cliente"
                className="flex-1 h-11 px-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 placeholder:text-zinc-600 shadow-inner"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={vehiculoMarcaModelo}
                onChange={(e) => setVehiculoMarcaModelo(e.target.value)}
                placeholder="Marca y Modelo (ej: Toyota Hilux)"
                className="flex-1 h-8 px-3 rounded-lg bg-black/30 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 placeholder:text-zinc-600"
              />
              <input
                type="text"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                placeholder="Teléfono WhatsApp"
                className="w-36 h-8 px-3 rounded-lg bg-black/30 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Kilometraje Actual e Intervalo de Próximo Cambio */}
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Kilometraje Actual</span>
              </label>
              <span className="text-[10px] text-zinc-400">Intervalo de cambio</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={kmActual}
                  onChange={(e) => setKmActual(e.target.value)}
                  placeholder="Ej: 45.200"
                  className="w-full h-11 px-3 pr-10 rounded-xl bg-black/40 border border-white/10 font-mono text-sm sm:text-base font-bold text-amber-300 focus:outline-none focus:border-amber-500 placeholder:text-zinc-600 shadow-inner"
                />
                <span className="absolute right-3 top-3 text-xs text-zinc-500 font-mono">KM</span>
              </div>

              {/* Selector de 1 Toque para Intervalo */}
              <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
                {[
                  { label: "+3k", valor: 3000 },
                  { label: "+5k", valor: 5000 },
                  { label: "+8k", valor: 8000 },
                  { label: "+10k", valor: 10000 },
                ].map((item) => (
                  <button
                    key={item.valor}
                    type="button"
                    onClick={() => setIntervaloAceite(item.valor)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all cursor-pointer ${
                      intervaloAceite === item.valor
                        ? "bg-amber-500 text-black shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Atribución operativa:</span>
              <span className="text-blue-300 font-mono font-bold">
                👷 {empleadoActivo.nombre}
              </span>
            </div>
          </div>

          {/* Tarjeta Visual: Etiqueta Próximo Cambio Calculada */}
          <div className="lg:col-span-3">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-black/40 to-blue-500/10 border border-amber-500/30 text-center space-y-1.5 shadow-lg relative">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80 flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Próximo Cambio de Aceite</span>
              </div>

              <div className="font-mono text-xl sm:text-2xl font-black text-white tracking-wide drop-shadow">
                {kmProximoCambio ? (
                  `${kmProximoCambio.toLocaleString("es-EC")} KM`
                ) : (
                  <span className="text-zinc-600 text-base">Ingresa KM Actual</span>
                )}
              </div>

              <div className="text-[10px] text-zinc-400 font-mono">
                {kmActual ? (
                  <span>
                    Actual: <strong className="text-zinc-200">{kmActual} KM</strong> (+{intervaloAceite.toLocaleString()} KM)
                  </span>
                ) : (
                  "Cálculo automático en 1 toque"
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. CARRUSEL DESLIZABLE DE 5 ESTACIONES EXPRESS (SELECCIÓN EN 1 TOQUE)
          ===================================================================== */}
      <section className="space-y-4">
        {/* Barra Deslizable de Pestañas con Iconos Transparentes */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            {
              id: "lubricantes",
              label: "1. Lubricantes & Fluidos",
              icono: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                </svg>
              ),
              color: "text-amber-400 border-amber-500/40 bg-amber-500/15",
              conteo: conteoEstaciones.lubricantes,
            },
            {
              id: "filtros",
              label: "2. Filtros (Check)",
              icono: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.539.092.917.56.917 1.107v1.86a2.25 2.25 0 01-.659 1.59l-5.432 5.432a2.25 2.25 0 00-.659 1.59V19.5a2.25 2.25 0 01-1.076 1.91l-2.25 1.35A.75.75 0 0110 22.11v-6.05a2.25 2.25 0 00-.659-1.59L3.909 9.038A2.25 2.25 0 013.25 7.448V5.585c0-.547.378-1.015.917-1.107A48.507 48.507 0 0112 3z" />
                </svg>
              ),
              color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/15",
              conteo: conteoEstaciones.filtros,
            },
            {
              id: "llantas",
              label: "3. Llantera & Parches",
              icono: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ),
              color: "text-sky-400 border-sky-500/40 bg-sky-500/15",
              conteo: conteoEstaciones.llantas,
            },
            {
              id: "baterias",
              label: "4. Baterías & Cambios",
              icono: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              ),
              color: "text-purple-400 border-purple-500/40 bg-purple-500/15",
              conteo: conteoEstaciones.baterias,
            },
            {
              id: "lavado",
              label: "5. Lavado & Engrase",
              icono: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              ),
              color: "text-teal-400 border-teal-500/40 bg-teal-500/15",
              conteo: conteoEstaciones.lavado,
            },
          ].map((est) => {
            const esActiva = estacionActiva === est.id;
            return (
              <button
                key={est.id}
                type="button"
                onClick={() => setEstacionActiva(est.id as any)}
                className={`h-11 px-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap backdrop-blur-md shrink-0 active:scale-95 ${
                  esActiva
                    ? est.color + " shadow-lg"
                    : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <span>{est.icono}</span>
                <span>{est.label}</span>
                {est.conteo > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white/20 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                    {est.conteo}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ===================================================================
            A) ESTACIÓN 1: LUBRICANTES Y FLUIDOS
            =================================================================== */}
        {estacionActiva === "lubricantes" && (
          <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-5 space-y-5 animate-fade-in">
            {/* Viscosidad del Aceite */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Viscosidad del Aceite de Motor:
                </label>
                <span className="text-[11px] text-zinc-400 font-mono">
                  Asignando a: <strong className="text-blue-300 font-bold">{empleadoActivo.nombre}</strong>
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {["0W-20", "5W-30", "10W-30", "10W-40", "15W-40", "20W-50"].map((visc) => {
                  const key = `aceite-${visc}`;
                  const marcado = Boolean(serviciosAsignados[key]);
                  return (
                    <button
                      key={visc}
                      type="button"
                      onClick={() => {
                        setViscosidad(visc);
                        toggleServicioMultiEmpleado(
                          key,
                          `Aceite Motor ${visc} ${tipoBase || ""}`,
                          "Lubricantes",
                          `${galonesAceite} Galón(es)`
                        );
                      }}
                      className={`h-12 rounded-xl border font-mono font-bold text-xs sm:text-sm transition-all cursor-pointer flex flex-col items-center justify-center ${
                        marcado
                          ? "bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-500/25 scale-[1.02]"
                          : "bg-black/30 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{visc}</span>
                      {marcado && (
                        <span className="text-[9px] font-sans font-bold bg-black/40 text-amber-200 px-1 rounded mt-0.5">
                          {serviciosAsignados[key]?.empleado_nombre?.split(" ")[0]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Base del Aceite + Galones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Tipo de Base:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["100% Sintético", "Semi-Sintético", "Mineral"].map((base) => {
                    const sel = tipoBase === base;
                    return (
                      <button
                        key={base}
                        type="button"
                        onClick={() => setTipoBase(sel ? "" : base)}
                        className={`h-11 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center text-center px-1 ${
                          sel
                            ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                            : "bg-black/30 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {base}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cantidad de Galones / Cuartos */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Cantidad Suministrada:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((cant) => (
                    <button
                      key={cant}
                      type="button"
                      onClick={() => setGalonesAceite(cant)}
                      className={`flex-1 h-11 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        galonesAceite === cant
                          ? "bg-blue-600 border-blue-400 text-white shadow-sm"
                          : "bg-black/30 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {cant} Gal
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fluidos Adicionales */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs font-semibold text-zinc-300 block">
                Fluidos y Lubricantes Adicionales (Toca para asignar a {empleadoActivo.nombre}):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  "Aceite Caja Manual",
                  "Aceite Transmisión Automática (ATF)",
                  "Aceite Diferencial",
                  "Refrigerante / Coolant",
                  "Líquido de Frenos",
                  "Hidráulico",
                ].map((fluido) => {
                  const key = `fluido-${fluido.toLowerCase().replace(/\s+/g, "-")}`;
                  const marcado = Boolean(serviciosAsignados[key]);
                  return (
                    <button
                      key={fluido}
                      type="button"
                      onClick={() => toggleServicioMultiEmpleado(key, fluido, "Lubricantes")}
                      className={`p-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        marcado
                          ? "bg-amber-500/15 border-amber-500/50 text-white shadow-sm"
                          : "bg-black/30 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="truncate block font-semibold">{fluido}</span>
                        {marcado && (
                          <span className="text-[10px] text-amber-300 block mt-0.5 truncate">
                            👷 {serviciosAsignados[key]?.empleado_nombre}
                          </span>
                        )}
                      </div>
                      <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] shrink-0 ${
                        marcado ? "bg-amber-500 border-amber-400 text-black font-bold" : "border-white/20 text-transparent"
                      }`}>
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            B) ESTACIÓN 2: FILTROS (CHECK RÁPIDO EN 1 TOQUE)
            =================================================================== */}
        {estacionActiva === "filtros" && (
          <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Toca cada filtro reemplazado. Quedará registrado al empleado activo:</span>
              <span className="text-emerald-400 font-bold">👷 {empleadoActivo.nombre}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[
                {
                  key: "fil-aceite",
                  label: "Filtro de Aceite",
                  desc: "Reemplazo con cambio de lubricante",
                  icono: "🛢️",
                },
                {
                  key: "fil-aire",
                  label: "Filtro de Aire Motor",
                  desc: "Limpieza o cambio de elemento",
                  icono: "🌪️",
                },
                {
                  key: "fil-cabina",
                  label: "Filtro de Cabina (A/C)",
                  desc: "Filtro antipolen y aire acondicionado",
                  icono: "❄️",
                },
                {
                  key: "fil-combustible",
                  label: "Filtro Combustible / Diésel",
                  desc: "Separador de agua o cartucho",
                  icono: "⛽",
                },
              ].map((f) => {
                const activo = Boolean(serviciosAsignados[f.key]);
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => toggleServicioMultiEmpleado(f.key, f.label, "Filtros")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 active:scale-[0.98] ${
                      activo
                        ? "bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10 text-white"
                        : "bg-black/30 border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{f.icono}</span>
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold transition-colors ${
                        activo ? "bg-emerald-500 border-emerald-400 text-black" : "border-white/20 text-transparent"
                      }`}>
                        ✓
                      </div>
                    </div>

                    <div>
                      <strong className="text-sm font-bold block">{f.label}</strong>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">{f.desc}</span>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${
                        activo ? "text-emerald-400" : "text-zinc-500"
                      }`}>
                        {activo ? "✓ Reemplazado" : "+ Marcar"}
                      </span>
                      {activo && (
                        <span className="text-[10px] text-zinc-300 font-mono">
                          👷 {serviciosAsignados[f.key]?.empleado_nombre?.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            C) ESTACIÓN 3: LLANTERA Y PARCHES (SELECTOR VISUAL DE 4 RUEDAS)
            =================================================================== */}
        {estacionActiva === "llantas" && (
          <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-5 space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Esquema Visual Minimalista */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[11px] font-semibold text-zinc-400 mb-3 tracking-wider uppercase">
                  Esquema de Llantas (Toca para seleccionar)
                </span>

                <div className="w-56 p-4 rounded-3xl bg-white/[0.02] border border-white/5 relative flex flex-col items-center gap-6">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    ▲ Frente del Auto ▲
                  </span>

                  {/* Llantas Delanteras */}
                  <div className="w-full flex items-center justify-between">
                    {(["DI", "DD"] as const).map((r) => {
                      const sel = ruedaSeleccionada === r;
                      const count = Object.keys(serviciosAsignados).filter((k) => k.includes(`-${r}`)).length;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRuedaSeleccionada(r)}
                          className={`w-14 h-16 rounded-xl border font-mono text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                            sel
                              ? "bg-sky-500 border-sky-400 text-black shadow-lg shadow-sky-500/30 scale-105"
                              : "bg-[#18181b] border-white/15 text-zinc-300 hover:border-white/30"
                          }`}
                        >
                          <span>{r}</span>
                          <span className="text-[9px] opacity-75">{r === "DI" ? "Del. Izq" : "Del. Der"}</span>
                          {count > 0 && (
                            <span className="text-[9px] font-bold bg-black/40 text-sky-200 px-1 rounded mt-0.5">
                              {count} serv
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Llantas Traseras */}
                  <div className="w-full flex items-center justify-between">
                    {(["TI", "TD"] as const).map((r) => {
                      const sel = ruedaSeleccionada === r;
                      const count = Object.keys(serviciosAsignados).filter((k) => k.includes(`-${r}`)).length;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRuedaSeleccionada(r)}
                          className={`w-14 h-16 rounded-xl border font-mono text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                            sel
                              ? "bg-sky-500 border-sky-400 text-black shadow-lg shadow-sky-500/30 scale-105"
                              : "bg-[#18181b] border-white/15 text-zinc-300 hover:border-white/30"
                          }`}
                        >
                          <span>{r}</span>
                          <span className="text-[9px] opacity-75">{r === "TI" ? "Tras. Izq" : "Tras. Der"}</span>
                          {count > 0 && (
                            <span className="text-[9px] font-bold bg-black/40 text-sky-200 px-1 rounded mt-0.5">
                              {count} serv
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Rueda de Repuesto */}
                  <button
                    type="button"
                    onClick={() => setRuedaSeleccionada("REP")}
                    className={`h-9 px-4 rounded-xl border font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      ruedaSeleccionada === "REP"
                        ? "bg-sky-500 border-sky-400 text-black shadow-md shadow-sky-500/30"
                        : "bg-[#18181b] border-white/15 text-zinc-300 hover:border-white/30"
                    }`}
                  >
                    <span>REP: Repuesto</span>
                  </button>
                </div>
              </div>

              {/* Botones de Acción para la Rueda Activa */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-mono font-bold text-xs border border-sky-500/30">
                    Rueda Activa: {ruedaSeleccionada}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Asignando a: <strong className="text-sky-300">{empleadoActivo.nombre}</strong>
                  </span>
                </div>

                {/* Parches y Servicios en 1 Clic */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: `parche-${ruedaSeleccionada}`, label: `Parche Llanta (${ruedaSeleccionada})` },
                    { key: `vulc-${ruedaSeleccionada}`, label: `Vulcanizado (${ruedaSeleccionada})` },
                    { key: `mont-${ruedaSeleccionada}`, label: `Montaje Llanta Nueva (${ruedaSeleccionada})` },
                    { key: `bal-${ruedaSeleccionada}`, label: `Balanceo (${ruedaSeleccionada})` },
                    { key: `psi-${ruedaSeleccionada}`, label: `Calibración PSI / N₂ (${ruedaSeleccionada})` },
                  ].map((s) => {
                    const sel = Boolean(serviciosAsignados[s.key]);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => toggleServicioMultiEmpleado(s.key, s.label, "Llantera")}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          sel
                            ? "bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm"
                            : "bg-black/30 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="truncate block">{s.label}</span>
                          {sel && (
                            <span className="text-[10px] text-zinc-400 block mt-0.5 truncate">
                              👷 {serviciosAsignados[s.key]?.empleado_nombre}
                            </span>
                          )}
                        </div>
                        <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[10px] shrink-0 ${
                          sel ? "bg-sky-500 border-sky-400 text-black font-bold" : "border-white/20 text-transparent"
                        }`}>
                          ✓
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Servicios Globales de Tren de Rodaje */}
                <div className="flex gap-2.5 pt-2">
                  {[
                    { key: "rotacion-4-llantas", label: "🔄 Rotación 4 Llantas" },
                    { key: "alineacion-computarizada", label: "📐 Alineación" },
                  ].map((glob) => {
                    const sel = Boolean(serviciosAsignados[glob.key]);
                    return (
                      <button
                        key={glob.key}
                        type="button"
                        onClick={() => toggleServicioMultiEmpleado(glob.key, glob.label, "Llantera")}
                        className={`flex-1 h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          sel
                            ? "bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm"
                            : "bg-black/30 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span>{glob.label}</span>
                        {sel && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            D) ESTACIÓN 4: BATERÍAS Y CAMBIOS RÁPIDOS
            =================================================================== */}
        {estacionActiva === "baterias" && (
          <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-5 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tarjeta 1: Cambio de Batería con Foto R2 */}
              <div className={`p-4 rounded-2xl border transition-all space-y-3 ${
                serviciosAsignados["bat-cambio"]
                  ? "bg-purple-500/15 border-purple-500/40 text-white"
                  : "bg-black/30 border-white/10 text-zinc-300"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🔋</span>
                    <div>
                      <strong className="text-sm font-bold block">Cambio de Batería</strong>
                      <span className="text-[11px] text-zinc-400">Instalación y garantía registrada</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleServicioMultiEmpleado("bat-cambio", "Cambio de Batería", "Baterías")}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      serviciosAsignados["bat-cambio"]
                        ? "bg-purple-500 border-purple-400 text-white"
                        : "bg-white/5 border-white/10 text-zinc-300 hover:text-white"
                    }`}
                  >
                    {serviciosAsignados["bat-cambio"] ? "✓ Marcado" : "+ Marcar"}
                  </button>
                </div>

                {/* Subida Rápida a Cloudflare R2 */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 block">
                      Foto de Batería / Garantía
                    </span>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      {fotoBateriaR2 ? "✓ Guardada en Cloudflare R2" : "Toma foto del código o serie"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      ref={inputFotoBateriaRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleSubirFotoBateriaR2}
                      className="hidden"
                    />

                    {fotoBateriaR2 ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={fotoBateriaR2}
                          alt="Batería"
                          className="w-9 h-9 rounded-lg object-cover border border-purple-400/40"
                        />
                        <button
                          type="button"
                          onClick={() => inputFotoBateriaRef.current?.click()}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300"
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => inputFotoBateriaRef.current?.click()}
                        disabled={subiendoFotoR2}
                        className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {subiendoFotoR2 ? (
                          <span>Subiendo R2...</span>
                        ) : (
                          <>
                            <span>📷</span>
                            <span>Tomar Foto</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tarjetas 2, 3, 4 */}
              {[
                { key: "bat-diag", label: "Diagnóstico Batería & Alternador", desc: "Prueba de voltaje bajo carga", icono: "⚡" },
                { key: "bat-plumas", label: "Cambio de Plumas Limpiaparabrisas", desc: "Instalación delantera o trasera", icono: "🌧️" },
                { key: "bat-focos", label: "Cambio de Focos / Bombillos", desc: "Halógeno o LED de faro y dirección", icono: "💡" },
              ].map((b) => {
                const activo = Boolean(serviciosAsignados[b.key]);
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => toggleServicioMultiEmpleado(b.key, b.label, "Baterías")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      activo
                        ? "bg-purple-500/15 border-purple-500/40 text-white"
                        : "bg-black/30 border-white/10 text-zinc-300 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{b.icono}</span>
                      <div>
                        <strong className="text-sm font-bold block">{b.label}</strong>
                        <span className="text-[11px] text-zinc-400">{b.desc}</span>
                        {activo && (
                          <span className="text-[10px] text-purple-300 block mt-0.5">
                            👷 {serviciosAsignados[b.key]?.empleado_nombre}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                      activo ? "bg-purple-500 border-purple-400 text-white" : "border-white/20 text-transparent"
                    }`}>
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            E) ESTACIÓN 5: LAVADO Y ENGRASE
            =================================================================== */}
        {estacionActiva === "lavado" && (
          <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-5 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { key: "lav-express", label: "Lavado Express Exterior", desc: "Presión, shampoo y secado de carrocería", icono: "🚿" },
                { key: "lav-completo", label: "Lavado Completo (Chasis + Motor)", desc: "Desengrasado y lavado integral", icono: "🧽" },
                { key: "lav-aspirado", label: "Aspirado & Limpieza Interior", desc: "Asientos, alfombras y tablero", icono: "✨" },
                { key: "lav-engrase", label: "Engrase de Chasis / Pulverizado", desc: "Terminales, crucetas y bajos", icono: "🧴" },
              ].map((lav) => {
                const activo = Boolean(serviciosAsignados[lav.key]);
                return (
                  <button
                    key={lav.key}
                    type="button"
                    onClick={() => toggleServicioMultiEmpleado(lav.key, lav.label, "Lavado")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.98] ${
                      activo
                        ? "bg-teal-500/15 border-teal-500/50 shadow-md shadow-teal-500/10 text-white"
                        : "bg-black/30 border-white/10 text-zinc-300 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lav.icono}</span>
                      <div>
                        <strong className="text-sm font-bold block">{lav.label}</strong>
                        <span className="text-[11px] text-zinc-400 block mt-0.5">{lav.desc}</span>
                        {activo && (
                          <span className="text-[10px] text-teal-300 block mt-0.5">
                            👷 {serviciosAsignados[lav.key]?.empleado_nombre}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                      activo ? "bg-teal-500 border-teal-400 text-black" : "border-white/20 text-transparent"
                    }`}>
                      ✓
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          BARRA INFERIOR FIJA Y MINIMALISTA: PASE DIRECTO A POS + GENERAR STICKER
          ===================================================================== */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d10]/95 backdrop-blur-xl border-t border-white/10 p-3 sm:p-4 shadow-2xl">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Resumen de iconos marcados con técnicos */}
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-xs font-bold">
                {placa ? placa : "SIN PLACA"}
              </span>
              <span className="text-xs font-semibold text-zinc-300">
                {itemsCompilados.length} servicio(s)
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-md">
              {itemsCompilados.map((it) => (
                <span
                  key={it.id}
                  className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-zinc-300 flex items-center gap-1 shrink-0"
                >
                  <span className="text-emerald-400">●</span>
                  <span className="truncate max-w-[120px]">{it.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono font-normal">
                    ({it.empleado_nombre?.split(" ")[0]})
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Botón Principal: Enviar a Oficina (POS) y Generar Sticker QR */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleLimpiarFormulario}
              disabled={enviandoAPos}
              className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={handleEnviarAOficinaPosYSticker}
              disabled={enviandoAPos}
              className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {enviandoAPos ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  <span>Enviando a POS...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Enviar a Oficina (POS) y Generar Sticker QR</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODAL: STICKER TÉRMICO CON QR PARA PARABRISAS Y PASE A POS
          ===================================================================== */}
      {mostrarModalStickerQr && datosStickerGenerado && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#111113] border border-white/20 rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-in">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-lg border border-emerald-500/30">
                  🏷️
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Sticker Térmico con QR Generado
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Listo para imprimir y pegar en el parabrisas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMostrarModalStickerQr(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* STICKER FORMATO TÉRMICO DE PARABRISAS (FONDO CLARO PARA IMPRESIÓN DIRECTA) */}
            <div
              id="sticker-termico-imprimible"
              className="p-5 rounded-2xl bg-white text-black font-sans shadow-xl border-2 border-slate-300 space-y-4"
            >
              {/* Encabezado del Taller */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                    LUBRICENTRO EXPRESS
                  </span>
                  <strong className="text-base font-black tracking-tight">AutoG Service Center</strong>
                </div>
                <div className="text-right font-mono text-[11px] font-bold">
                  <div>{datosStickerGenerado.fecha}</div>
                  <div className="text-slate-500">{datosStickerGenerado.hora}</div>
                </div>
              </div>

              {/* Fila Placa y Auto */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">PLACA:</span>
                  <span className="font-mono text-xl font-black bg-slate-100 px-3 py-0.5 rounded border border-slate-300">
                    {datosStickerGenerado.placa}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">VEHÍCULO:</span>
                  <span className="text-xs font-bold text-slate-800">{datosStickerGenerado.vehiculo}</span>
                </div>
              </div>

              {/* Kilometrajes: Actual vs Próximo Cambio */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">KM ACTUAL:</span>
                  <strong className="font-mono text-sm text-slate-700">
                    {datosStickerGenerado.kmActual ? `${datosStickerGenerado.kmActual.toLocaleString()} KM` : "N/D"}
                  </strong>
                </div>

                <div className="border-l border-slate-200 pl-3">
                  <span className="text-[10px] font-black uppercase text-amber-700 block tracking-wider">
                    PRÓXIMO CAMBIO:
                  </span>
                  <strong className="font-mono text-lg font-black text-slate-900">
                    {datosStickerGenerado.kmProximo ? `${datosStickerGenerado.kmProximo.toLocaleString()} KM` : "N/D"}
                  </strong>
                </div>
              </div>

              {/* Aceite y Filtros Aplicados */}
              <div className="text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Aceite Suministrado:</span>
                  <strong className="font-semibold text-slate-900">
                    {datosStickerGenerado.viscosidad} {datosStickerGenerado.tipoBase}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Servicios ejecutados:</span>
                  <span className="font-mono font-medium">
                    {datosStickerGenerado.servicios.length} trabajos
                  </span>
                </div>
              </div>

              {/* QR Code para Escaneo del Parabrisas */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-700 block uppercase">
                    Escanea para ver tu historial
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Panel del Cliente y Recordatorio
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 block">
                    ID: {datosStickerGenerado.solicitudId}
                  </span>
                </div>

                <img
                  src={datosStickerGenerado.qrUrl}
                  alt="QR Próximo Cambio"
                  className="w-16 h-16 rounded-lg border border-slate-300 p-1 bg-white"
                />
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>🖨️</span>
                <span>Imprimir Sticker Térmico</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/pos/venta")}
                className="w-full sm:flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                <span>💼</span>
                <span>Ir al POS de Oficina a Cobrar</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
