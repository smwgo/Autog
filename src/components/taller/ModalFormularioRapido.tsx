"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { getClientActiveBranch } from "@/lib/branch";

export type EspecialidadTipo = "taller" | "lubricentro" | "carwash" | "tecnicentro";

interface PedidoItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface ModalFormularioRapidoProps {
  isOpen: boolean;
  onClose: () => void;
  especialidadInicial?: EspecialidadTipo;
  mecanicos?: string[];
  empleadoLogueado?: { id?: string; nombre?: string; [key: string]: any };
  clientesCatalogo?: any[];
  onOrdenCreada?: (nuevaOrden: any, cliente?: any, tipo?: "Taller" | "Lubricentro" | "Lavado") => void;
  mostrarToast?: (mensaje: string, tipo?: any) => void;
  onCambiarEspecialidad?: (especialidad: EspecialidadTipo) => void;
}

const ESPECIALIDADES_INFO = [
  {
    id: "taller" as EspecialidadTipo,
    label: "Taller",
    tipoBackend: "Taller" as const,
    color: "blue",
    activeClass: "bg-blue-600 text-white shadow-lg shadow-blue-500/30 border-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    presets: ["Diagnóstico", "Frenos", "Suspensión", "Afinamiento", "Escaneo", "Batería", "Embrague"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.455.087.935-.012 1.39" />
      </svg>
    ),
  },
  {
    id: "lubricentro" as EspecialidadTipo,
    label: "Lubricentro",
    tipoBackend: "Lubricentro" as const,
    color: "amber",
    activeClass: "bg-amber-600 text-white shadow-lg shadow-amber-500/30 border-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    presets: ["Aceite", "Filtro-Aceite", "Filtro-Aire", "Refrigerante", "Caja", "Corona", "Grasa"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      </svg>
    ),
  },
  {
    id: "carwash" as EspecialidadTipo,
    label: "Car Wash",
    tipoBackend: "Lavado" as const,
    color: "purple",
    activeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-300 shadow-sm shadow-purple-500/10 border-purple-500/30",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    presets: ["Lavado", "Completo", "Encerado", "Motor", "Salón", "Chasis", "Pulido"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    id: "tecnicentro" as EspecialidadTipo,
    label: "Tecnicentro",
    tipoBackend: "Taller" as const,
    color: "emerald",
    activeClass: "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 border-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    presets: ["Alineación", "Balanceo", "Enllante", "Parche", "Rotación", "Presión", "Válvula"],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 6v6M3 12h6m6 0h6" />
      </svg>
    ),
  },
];

export default function ModalFormularioRapido({
  isOpen,
  onClose,
  especialidadInicial = "taller",
  mecanicos = ["Hernan Marquez", "Carlos Rodríguez", "Luis Martínez", "Ana Torres", "Miguel Ángel"],
  empleadoLogueado,
  clientesCatalogo = [],
  onOrdenCreada,
  mostrarToast,
  onCambiarEspecialidad,
}: ModalFormularioRapidoProps) {
  const [especialidad, setEspecialidad] = useState<EspecialidadTipo>(especialidadInicial);
  const [placa, setPlaca] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [cliente, setCliente] = useState("");
  const [celular, setCelular] = useState("");
  const [mecanico, setMecanico] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteEncontrado, setClienteEncontrado] = useState(false);
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [items, setItems] = useState<PedidoItem[]>([
    { id: "item-1", name: "", qty: 1, price: 0 },
  ]);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar especialidad inicial y mecánico por defecto al abrir
  useEffect(() => {
    if (isOpen) {
      setEspecialidad(especialidadInicial);
      const defaultMec =
        empleadoLogueado?.nombre && mecanicos.includes(empleadoLogueado.nombre)
          ? empleadoLogueado.nombre
          : mecanicos[0] || "Hernan Marquez";
      setMecanico(defaultMec);
    }
  }, [isOpen, especialidadInicial, empleadoLogueado, mecanicos]);

  // Manejar tecla ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !guardando) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, guardando, onClose]);

  // Especialidad activa actual
  const espActiva = useMemo(
    () => ESPECIALIDADES_INFO.find((e) => e.id === especialidad) || ESPECIALIDADES_INFO[0],
    [especialidad]
  );

  // Cálculo automático del total en vivo
  const totalCalculado = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  }, [items]);

  // Búsqueda inteligente de placa
  const buscarPorPlaca = async (placaValor: string) => {
    const clean = placaValor.trim().toUpperCase();
    if (!clean || clean.length < 3) return;

    // 1. Búsqueda rápida en catálogo local en memoria
    if (clientesCatalogo.length > 0) {
      for (const c of clientesCatalogo) {
        if (Array.isArray(c.vehicles)) {
          const matchVeh = c.vehicles.find(
            (v: any) => v.plate && v.plate.trim().toUpperCase() === clean
          );
          if (matchVeh) {
            setClienteId(c.id);
            setCliente(c.name || "");
            setCelular(c.phone || "");
            setVehiculo(`${matchVeh.brand || ""} ${matchVeh.model || ""}`.trim());
            setClienteEncontrado(true);
            return;
          }
        }
      }
    }

    // 2. Consulta en tiempo real a PostgreSQL vía API
    try {
      setBuscandoPlaca(true);
      const res = await fetch(`/api/taller/operacion?query=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (data.success && data.found) {
        if (data.customer) {
          setClienteId(data.customer.id || null);
          setCliente(data.customer.name || "");
          setCelular(data.customer.phone || "");
        }
        if (data.vehicle) {
          setVehiculo(`${data.vehicle.brand || ""} ${data.vehicle.model || ""}`.trim());
        }
        setClienteEncontrado(true);
      } else {
        setClienteEncontrado(false);
      }
    } catch (err) {
      console.warn("Aviso consultando placa:", err);
    } finally {
      setBuscandoPlaca(false);
    }
  };

  const handlePlacaChange = (val: string) => {
    const upper = val.toUpperCase();
    setPlaca(upper);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (upper.trim().length >= 4) {
      searchDebounceRef.current = setTimeout(() => {
        void buscarPorPlaca(upper);
      }, 450);
    } else {
      setClienteEncontrado(false);
    }
  };

  // Manejadores de Ítems del Pedido
  const handleItemChange = (id: string, field: "name" | "qty" | "price", value: string | number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const agregarFilaItem = (nombreInicial = "") => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: nombreInicial,
        qty: 1,
        price: 0,
      },
    ]);
  };

  const eliminarFilaItem = (id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        return [{ id: "item-1", name: "", qty: 1, price: 0 }];
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  const aplicarPreset = (presetName: string) => {
    // Si la última fila está vacía, la llenamos; si no, agregamos una nueva fila
    setItems((prev) => {
      const last = prev[prev.length - 1];
      if (last && !last.name.trim()) {
        return prev.map((it, idx) =>
          idx === prev.length - 1 ? { ...it, name: presetName } : it
        );
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: presetName,
          qty: 1,
          price: 0,
        },
      ];
    });
  };

  const resetFormulario = () => {
    setPlaca("");
    setVehiculo("");
    setCliente("");
    setCelular("");
    setClienteId(null);
    setClienteEncontrado(false);
    setItems([{ id: "item-1", name: "", qty: 1, price: 0 }]);
  };

  // Guardar Orden
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();

    const placaLimpia = placa.trim().toUpperCase();
    const clienteLimpio = cliente.trim();

    if (!clienteLimpio) {
      if (mostrarToast) mostrarToast("Ingresa el nombre del Cliente.", "info");
      return;
    }

    if (!placaLimpia) {
      if (mostrarToast) mostrarToast("Ingresa la Placa del vehículo.", "info");
      return;
    }

    const itemsValidos = items
      .filter((it) => it.name.trim().length > 0)
      .map((it, idx) => ({
        id: it.id || `item_${Date.now()}_${idx}`,
        type: "SERVICE",
        category: espActiva.label,
        code: `SRV-${idx + 1}`,
        name: it.name.trim(),
        price: Number(it.price) || 0,
        qty: Number(it.qty) || 1,
        status: "En Proceso",
      }));

    const motivoResumen = itemsValidos.length > 0
      ? `[${espActiva.label}] ${itemsValidos.map((i) => i.name).join(", ")}`
      : `[${espActiva.label}] Ingreso manual`;

    try {
      setGuardando(true);
      const branchActiva = getClientActiveBranch("/taller") === "SUCURSAL" ? "SUCURSAL" : "PRINCIPAL";

      // 1. Crear Orden en Neon DB con todos sus datos e ítems
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREAR_ORDEN_ETAPA_1",
          customerId: clienteId || undefined,
          tipoCliente: "Personal",
          nombres: clienteLimpio,
          identificacion: clienteId ? undefined : `CLI-${Date.now().toString().slice(-6)}`,
          telefono: celular.trim() || "S/N",
          ingresadoPor: empleadoLogueado?.nombre || "Recepción",
          mechanic: mecanico || "Hernan Marquez",
          motivoIngreso: motivoResumen,
          placa: placaLimpia,
          marca: vehiculo.trim() || "Vehículo",
          modelo: "General",
          items: itemsValidos,
          totalCost: totalCalculado,
          branch: branchActiva,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.activeOrder) {
        throw new Error(data.error || "No se pudo registrar la orden.");
      }

      // Si se especificaron ítems pero la orden vino sin sincronizar el total/items, aseguramos actualización
      let ordenFinal = data.activeOrder;
      if (itemsValidos.length > 0 && (!ordenFinal.items || ordenFinal.items.length === 0)) {
        try {
          const resUpdate = await fetch("/api/taller/operacion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "ACTUALIZAR_ORDEN",
              orderId: ordenFinal.id,
              items: itemsValidos,
              notes: motivoResumen,
            }),
          });
          const updateData = await resUpdate.json();
          if (updateData.success && updateData.activeOrder) {
            ordenFinal = updateData.activeOrder;
          }
        } catch (eUpdate) {
          console.warn("Aviso al actualizar ítems:", eUpdate);
        }
      }

      // Notificar creación a la vista principal
      if (onOrdenCreada) {
        onOrdenCreada(ordenFinal, data.customer, espActiva.tipoBackend);
      }

      // Cambiar el selector de la pantalla a la especialidad registrada
      if (onCambiarEspecialidad) {
        onCambiarEspecialidad(especialidad);
      }

      if (mostrarToast) {
        mostrarToast(`✅ Orden #${ordenFinal.orderNumber} creada (${espActiva.label} - ${placaLimpia})`, "ok");
      }

      resetFormulario();
      onClose();
    } catch (err: any) {
      console.error("Error al registrar orden rápida:", err);
      if (mostrarToast) {
        mostrarToast(err?.message || "Error al crear la orden.", "err");
      }
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all">
        {/* CABECERA MINIMALISTA */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-zinc-200/80 dark:bg-white/10 text-zinc-700 dark:text-zinc-200">
              <svg className="w-5 h-5 text-blue-500 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">Registro Manual</h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  Modo Formulario
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Directo • Rápido • Inteligente</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* CONTENIDO DEL FORMULARIO */}
        <form onSubmit={handleGuardar} className="p-4 sm:p-5 space-y-4">
          {/* SELECTOR DE ESPECIALIDAD (4 EN 1) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
              Especialidad
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
              {ESPECIALIDADES_INFO.map((esp) => {
                const activo = especialidad === esp.id;
                return (
                  <button
                    key={esp.id}
                    type="button"
                    onClick={() => setEspecialidad(esp.id)}
                    className={`h-9 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activo
                        ? esp.activeClass
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5"
                    }`}
                  >
                    {esp.icon}
                    <span>{esp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CAMPOS CLAVE: PLACA, VEHÍCULO, CLIENTE, CELULAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* PLACA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Placa
                </label>
                {buscandoPlaca ? (
                  <span className="text-[10px] text-blue-500 font-medium animate-pulse">Buscando...</span>
                ) : clienteEncontrado ? (
                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
                    ✓ Registrado
                  </span>
                ) : null}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={placa}
                  onChange={(e) => handlePlacaChange(e.target.value)}
                  onBlur={() => buscarPorPlaca(placa)}
                  placeholder="Ej. ABC-123"
                  className="w-full h-10 px-3 pr-8 rounded-xl text-sm font-bold uppercase tracking-wide bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:normal-case placeholder:font-normal placeholder:text-zinc-400"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* VEHÍCULO */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                Vehículo
              </label>
              <input
                type="text"
                value={vehiculo}
                onChange={(e) => setVehiculo(e.target.value)}
                placeholder="Ej. Hilux 2022"
                className="w-full h-10 px-3 rounded-xl text-sm bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* CLIENTE */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                Cliente
              </label>
              <input
                type="text"
                required
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre o Empresa"
                className="w-full h-10 px-3 rounded-xl text-sm bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-400"
              />
            </div>

            {/* CELULAR */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                Celular
              </label>
              <input
                type="text"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="WhatsApp / Teléfono"
                className="w-full h-10 px-3 rounded-xl text-sm bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* MECÁNICO */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
              Mecánico
            </label>
            <select
              value={mecanico}
              onChange={(e) => setMecanico(e.target.value)}
              className="w-full h-10 px-3 rounded-xl text-sm bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all cursor-pointer"
            >
              {mecanicos.map((mec) => (
                <option key={mec} value={mec} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                  {mec}
                </option>
              ))}
            </select>
          </div>

          {/* SECCIÓN PEDIDO */}
          <div className="pt-2 border-t border-zinc-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Pedido
              </label>
              <button
                type="button"
                onClick={() => agregarFilaItem()}
                className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>+ Añadir</span>
              </button>
            </div>

            {/* PRESETS RÁPIDOS DE 1 PALABRA SEGÚN LA ESPECIALIDAD */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {espActiva.presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => aplicarPreset(preset)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all shrink-0 cursor-pointer hover:scale-105 active:scale-95 ${espActiva.badgeClass} bg-white dark:bg-white/5`}
                  title={`Añadir ${preset}`}
                >
                  + {preset}
                </button>
              ))}
            </div>

            {/* FILAS DE ÍTEMS */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      placeholder={idx === 0 ? "Concepto / Servicio" : "Otro servicio..."}
                      className="w-full h-9 px-3 rounded-xl text-xs bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-zinc-400"
                    />
                  </div>

                  <div className="w-16 shrink-0">
                    <input
                      type="number"
                      min={1}
                      value={item.qty || ""}
                      onChange={(e) => handleItemChange(item.id, "qty", parseInt(e.target.value, 10) || 1)}
                      title="Cantidad"
                      placeholder="Cant."
                      className="w-full h-9 px-2 text-center rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="w-24 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-zinc-400">
                        S/
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={item.price === 0 && !item.name ? "" : item.price}
                        onChange={(e) => handleItemChange(item.id, "price", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        title="Precio"
                        className="w-full h-9 pl-7 pr-2 text-right rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => eliminarFilaItem(item.id)}
                    className="h-9 w-9 flex items-center justify-center rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                    title="Eliminar fila"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* PIE DEL MODAL: TOTAL Y GUARDAR */}
          <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Total</span>
              <span className="text-xl font-extrabold text-zinc-900 dark:text-white leading-tight">
                S/ {totalCalculado.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={guardando}
                className="h-10 px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className={`h-10 px-6 rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${espActiva.activeClass}`}
              >
                {guardando ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
