"use client";

import React, { useState } from "react";

export function VehicleSearch() {
  const steps = [
    { label: "1. Marca", placeholder: "Ej. Toyota, Chevrolet, Ford" },
    { label: "2. Modelo", placeholder: "Ej. Hilux, Spark, F-150" },
    { label: "3. Año", placeholder: "Ej. 2022" },
    { label: "4. Versión / Motor", placeholder: "Ej. 2.8 Diesel, 1.4 Gasolina" }
  ];

  const categories = [
    { title: "Repuestos y accesorios", icon: "⚙️", desc: "Piezas y componentes" },
    { title: "Lubricantes", icon: "💧", desc: "Aceites y fluidos" },
    { title: "Filtros", icon: "🎛️", desc: "Aire, aceite y cabina" },
    { title: "Talleres y servicios", icon: "🛠️", desc: "Mantenimiento y revisión" }
  ];

  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  
  // Datos del formulario de solicitud Landing
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [vehiculoInfo, setVehiculoInfo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [solicitudExitosa, setSolicitudExitosa] = useState<any | null>(null);

  const abrirModalPara = (catTitulo?: string) => {
    if (catTitulo) {
      setCategoriaSeleccionada(catTitulo);
      setDetalle(`Solicitud de ${catTitulo}${busqueda ? `: ${busqueda}` : ""}`);
    } else if (busqueda) {
      setCategoriaSeleccionada("Búsqueda");
      setDetalle(busqueda);
    } else {
      setCategoriaSeleccionada("Repuestos");
      setDetalle("");
    }
    setSolicitudExitosa(null);
    setModalAbierto(true);
  };

  const handleEnviarPedidoLanding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !telefono.trim()) {
      alert("Por favor ingresa tu nombre y teléfono.");
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        type: "SELECTOR",
        customerName: nombre.trim(),
        customerPhone: telefono.trim(),
        vehicleInfo: vehiculoInfo.trim() || "Vehículo no especificado",
        itemsSummary: detalle.trim() || `Pedido de ${categoriaSeleccionada || "Selector"}`,
        totalEstimated: 0,
      };

      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al enviar el pedido");
      }

      setSolicitudExitosa(data.solicitud);
      setNombre("");
      setTelefono("");
      setVehiculoInfo("");
      setDetalle("");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="w-full mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row select-none">
      {/* Columna Izquierda: Selección de Vehículo */}
      <div className="w-full md:w-1/3 bg-zinc-50 dark:bg-zinc-900 p-8 md:p-10 border-r border-zinc-200 dark:border-zinc-800 flex flex-col gap-6 rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Tu Vehículo</h3>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Selecciona tu vehículo.</p>
        </div>

        <div className="aspect-[4/3] w-full rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 overflow-hidden relative flex items-center justify-center border border-zinc-200 dark:border-zinc-800/80">
          <div className="text-center p-6 flex flex-col items-center">
            <span className="text-5xl mb-3">🚗</span>
            <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
              Tu vehículo
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Completa los 4 pasos para ver compatibilidad exacta
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {steps.map((step) => (
            <div 
              key={step.label}
              onClick={() => {
                setVehiculoInfo(step.placeholder);
                abrirModalPara("Vehículo");
              }}
              className="w-full h-14 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-cyan-500/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-between shadow-sm cursor-pointer transition-all"
            >
              <span className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
                {step.label}
              </span>
              <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* Columna Derecha: Búsqueda y Categorías */}
      <div className="w-full md:w-2/3 p-8 md:p-10 flex flex-col bg-white dark:bg-zinc-950 rounded-b-2xl md:rounded-bl-none md:rounded-r-2xl">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">¿Qué necesitas?</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Repuestos y servicios garantizados.</p>
        </div>

        {/* Input con Acción */}
        <div className="relative mb-10">
          <input 
            type="text" 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") abrirModalPara();
            }}
            placeholder="Ej. Filtro de aire, Aceite sintético..." 
            className="w-full pl-14 pr-28 py-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-cyan-500 font-medium transition-all"
          />
          <svg className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <button
            type="button"
            onClick={() => abrirModalPara()}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            Pedir
          </button>
        </div>

        {/* Categorías Interactivas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
          {categories.map((cat) => (
            <div 
              key={cat.title} 
              onClick={() => abrirModalPara(cat.title)}
              className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/40 hover:bg-cyan-500/5 flex items-start gap-4 bg-zinc-50 dark:bg-zinc-900/50 cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-2xl shadow-sm shrink-0">
                {cat.icon}
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-900 dark:text-white">{cat.title}</h4>
                  <span className="text-xs text-cyan-500 font-medium opacity-0 hover:opacity-100 transition-opacity">Pedir →</span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{cat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Flotante de Pedido Directo desde Landing */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-lg">
                  🚗
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Solicitar Pedido</h3>
                  <span className="text-xs text-cyan-400">
                    Origen: Selector
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {solicitudExitosa ? (
              <div className="py-8 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-3xl border border-cyan-500/30">
                  ✓
                </div>
                <h4 className="text-lg font-bold text-white">¡Pedido Registrado con Éxito!</h4>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Tu solicitud <span className="font-mono font-bold text-cyan-300">#{solicitudExitosa.requestNumber}</span> ha llegado directamente a la caja del POS.
                </p>
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnviarPedidoLanding} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">WhatsApp / Teléfono *</label>
                    <input
                      type="tel"
                      required
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="0991234567"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">Vehículo</label>
                    <input
                      type="text"
                      value={vehiculoInfo}
                      onChange={(e) => setVehiculoInfo(e.target.value)}
                      placeholder="Ej. Toyota Hilux 2022"
                      className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Repuesto o Servicio Solicitado *</label>
                  <textarea
                    rows={3}
                    required
                    value={detalle}
                    onChange={(e) => setDetalle(e.target.value)}
                    placeholder="Detalla qué repuesto o trabajo necesitas..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="px-6 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 active:scale-95 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer disabled:opacity-50"
                  >
                    {enviando ? "Enviando..." : "Enviar Pedido"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
