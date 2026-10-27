"use client";

import React, { useState, useEffect, useMemo } from "react";

export type EspecialidadTipo = "taller" | "lubricentro" | "carwash" | "tecnicentro";

export interface ItemPedidoRapido {
  id: string;
  type: "SERVICE" | "PART";
  category: string;
  code: string;
  name: string;
  price: number;
  qty: number;
  status: "Pendiente" | "En Proceso" | "Listo";
}

export interface ModalFormularioRapidoProps {
  isOpen: boolean;
  onClose: () => void;
  especialidadInicial?: EspecialidadTipo;
  ordenActiva?: any | null;
  onGuardarItems?: (
    itemsNuevos: ItemPedidoRapido[],
    especialidad: EspecialidadTipo
  ) => Promise<void> | void;
  mostrarToast?: (mensaje: string, tipo?: "ok" | "err" | "info") => void;
  onCambiarEspecialidad?: (especialidad: EspecialidadTipo) => void;
}

const ESPECIALIDADES_INFO = [
  {
    id: "taller" as EspecialidadTipo,
    label: "Taller",
    color: "blue",
    activeClass: "bg-blue-600 border-blue-400/50 text-white shadow-lg shadow-blue-600/30",
    presets: [
      { name: "Diagnóstico Computarizado", price: 20 },
      { name: "Afinamiento de Motor", price: 60 },
      { name: "Cambio Pastillas de Freno", price: 25 },
      { name: "Mantenimiento Suspensión", price: 45 },
      { name: "Cambio de Embrague", price: 80 },
      { name: "Revisión General", price: 15 },
    ],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.455.087.935-.012 1.39" />
      </svg>
    ),
  },
  {
    id: "lubricentro" as EspecialidadTipo,
    label: "Lubricentro",
    color: "amber",
    activeClass: "bg-amber-600 border-amber-400/50 text-white shadow-lg shadow-amber-600/30",
    presets: [
      { name: "Cambio Aceite 10W-40", price: 35 },
      { name: "Cambio Aceite 5W-30", price: 45 },
      { name: "Filtro de Aceite", price: 8 },
      { name: "Filtro de Aire", price: 12 },
      { name: "Líquido de Frenos DOT 4", price: 10 },
      { name: "Refrigerante Radiador", price: 15 },
    ],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      </svg>
    ),
  },
  {
    id: "carwash" as EspecialidadTipo,
    label: "Car Wash",
    color: "cyan",
    activeClass: "bg-cyan-600 border-cyan-400/50 text-white shadow-lg shadow-cyan-600/30",
    presets: [
      { name: "Lavado Express", price: 10 },
      { name: "Lavado Completo + Aspirado", price: 18 },
      { name: "Lavado de Salón Interior", price: 40 },
      { name: "Lavado y Desengrase Motor", price: 20 },
      { name: "Encerado y Pulido", price: 35 },
      { name: "Detailing Completo", price: 80 },
    ],
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    id: "tecnicentro" as EspecialidadTipo,
    label: "Tecnicentro",
    color: "emerald",
    activeClass: "bg-emerald-600 border-emerald-400/50 text-white shadow-lg shadow-emerald-600/30",
    presets: [
      { name: "Alineación Computarizada", price: 20 },
      { name: "Balanceo por Rueda (x4)", price: 16 },
      { name: "Parche y Enllante", price: 8 },
      { name: "Diagnóstico y Cambio Batería", price: 15 },
      { name: "Rotación de Neumáticos", price: 12 },
      { name: "Chequeo Presión con Nitrógeno", price: 10 },
    ],
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
  ordenActiva,
  onGuardarItems,
  mostrarToast,
  onCambiarEspecialidad,
}: ModalFormularioRapidoProps) {
  const [especialidad, setEspecialidad] = useState<EspecialidadTipo>(especialidadInicial);
  const [filas, setFilas] = useState<
    { id: string; name: string; qty: number; price: number }[]
  >([{ id: "1", name: "", qty: 1, price: 0 }]);
  const [guardando, setGuardando] = useState(false);

  // Sincronizar especialidad inicial al abrir
  useEffect(() => {
    if (isOpen) {
      setEspecialidad(especialidadInicial);
    }
  }, [isOpen, especialidadInicial]);

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

  // Total acumulado
  const total = useMemo(() => {
    return filas.reduce(
      (acc, it) => acc + (Number(it.qty) || 0) * (Number(it.price) || 0),
      0
    );
  }, [filas]);

  const cambiarEspecialidad = (esp: EspecialidadTipo) => {
    setEspecialidad(esp);
    onCambiarEspecialidad?.(esp);
  };

  const agregarFila = (nombreDefecto = "", precioDefecto = 0) => {
    setFilas((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        name: nombreDefecto,
        qty: 1,
        price: precioDefecto,
      },
    ]);
  };

  const actualizarFila = (
    id: string,
    campo: "name" | "qty" | "price",
    valor: any
  ) => {
    setFilas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f))
    );
  };

  const eliminarFila = (id: string) => {
    if (filas.length <= 1) {
      setFilas([{ id: "1", name: "", qty: 1, price: 0 }]);
      return;
    }
    setFilas((prev) => prev.filter((f) => f.id !== id));
  };

  const aplicarPreset = (p: { name: string; price: number }) => {
    if (filas.length === 1 && !filas[0].name.trim()) {
      setFilas([{ id: filas[0].id, name: p.name, qty: 1, price: p.price }]);
    } else {
      agregarFila(p.name, p.price);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const validas = filas.filter((f) => f.name.trim().length > 0);
    if (validas.length === 0) {
      mostrarToast?.("Ingresa al menos un servicio o concepto a realizar", "err");
      return;
    }

    const itemsAConstruir: ItemPedidoRapido[] = validas.map((f, idx) => ({
      id: `item_${Date.now()}_${idx}`,
      type: "SERVICE",
      category: espActiva.label,
      code: `PED-${idx + 1}`,
      name: f.name.trim(),
      price: Number(f.price) || 0,
      qty: Number(f.qty) || 1,
      status: "En Proceso",
    }));

    setGuardando(true);
    try {
      if (onGuardarItems) {
        await onGuardarItems(itemsAConstruir, especialidad);
      }
      setFilas([{ id: "1", name: "", qty: 1, price: 0 }]);
      onClose();
    } catch (err: any) {
      console.error("Error al registrar pedido:", err);
      mostrarToast?.(err?.message || "Error al registrar el pedido", "err");
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none truncate">
                Registrar Trabajo
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleGuardar} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Especialidad (4 botones limpios) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {ESPECIALIDADES_INFO.map((op) => {
                const activo = especialidad === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => cambiarEspecialidad(op.id)}
                    className={`h-9 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      activo
                        ? op.activeClass
                        : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-white/5 hover:bg-zinc-200/60 dark:hover:bg-white/10"
                    }`}
                  >
                    {op.icon}
                    <span>{op.label}</span>
                  </button>
                );
              })}
            </div>


          {/* Pedido / Trabajos a Realizar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Trabajos a realizar
              </label>
              <button
                type="button"
                onClick={() => agregarFila()}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                + Añadir fila
              </button>
            </div>

            <div className="space-y-1.5">
              {filas.map((f) => {
                const subtotal = (Number(f.qty) || 0) * (Number(f.price) || 0);
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-1.5 bg-zinc-50 dark:bg-white/[0.02] p-1.5 rounded-xl border border-zinc-200/60 dark:border-white/5"
                  >
                    {/* Concepto */}
                    <input
                      type="text"
                      value={f.name}
                      onChange={(e) => actualizarFila(f.id, "name", e.target.value)}
                      placeholder="Servicio o trabajo a realizar"
                      autoFocus={filas.length === 1 && !f.name}
                      className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    {/* Cantidad */}
                    <input
                      type="number"
                      min={1}
                      value={f.qty}
                      onChange={(e) =>
                        actualizarFila(f.id, "qty", parseInt(e.target.value, 10) || 1)
                      }
                      className="w-14 h-9 px-2 rounded-lg bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-center text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      title="Cantidad"
                    />

                    {/* Precio */}
                    <div className="relative w-20">
                      <span className="absolute left-2 top-2.5 text-[10px] text-zinc-400">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={f.price === 0 ? "" : f.price}
                        onChange={(e) =>
                          actualizarFila(f.id, "price", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-full h-9 pl-5 pr-1.5 rounded-lg bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-right text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        title="Precio"
                      />
                    </div>

                    {/* Subtotal */}
                    <span className="w-14 text-right text-xs font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                      ${subtotal.toFixed(2)}
                    </span>

                    {/* Eliminar */}
                    <button
                      type="button"
                      onClick={() => eliminarFila(f.id)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                      title="Eliminar fila"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pie: Total y Guardar */}
          <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total</span>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                ${total.toFixed(2)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="h-10 px-5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {guardando ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
