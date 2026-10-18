"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface RequestedPartItem {
  name: string;
  quantity: number;
  available: boolean;
  stock?: number;
  code?: string;
}

interface PartRequestRecord {
  id: string;
  dbId: string;
  requestNumber: string;
  date: string;
  mechanic: string;
  orderId: string;
  vehicle: string;
  items: RequestedPartItem[];
  status: string;
  urgency: string;
  notes?: string;
}

interface ProductRef {
  id: string;
  code: string;
  name: string;
  stock: number;
  price: number;
}

interface OrderRef {
  id: string;
  vehicle: string;
  plate: string;
  mechanic: string;
}

export default function SolicitudRepuestosPage() {
  const [requests, setRequests] = useState<PartRequestRecord[]>([]);
  const [products, setProducts] = useState<ProductRef[]>([]);
  const [ordenesActivas, setOrdenesActivas] = useState<OrderRef[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);
  const [detalleReq, setDetalleReq] = useState<PartRequestRecord | null>(null);

  // Modal Nueva Petición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [mecanico, setMecanico] = useState("Carlos Rodríguez");
  const [orderId, setOrderId] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [repuestos, setRepuestos] = useState("");
  const [urgencia, setUrgencia] = useState("Normal");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const cargarSolicitudes = useCallback(async () => {
    try {
      setCargando(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("busqueda", searchTerm.trim());
      if (filterStatus) params.set("estado", filterStatus);

      const res = await fetch(`/api/taller/repuestos?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
        if (Array.isArray(data.products)) {
          setProducts(data.products);
        }
      }
    } catch (err) {
      console.error("Error al cargar peticiones desde Neon:", err);
    } finally {
      setCargando(false);
    }
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  useEffect(() => {
    fetch("/api/taller/ordenes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.orders)) {
          setOrdenesActivas(d.orders);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectOrder = (ordId: string) => {
    setOrderId(ordId);
    const found = ordenesActivas.find((o) => o.id === ordId);
    if (found) {
      setVehiculo(`${found.vehicle} (${found.plate})`);
      if (found.mechanic) setMecanico(found.mechanic);
    }
  };

  const handleAgregarProductoCatalogo = (prod: ProductRef) => {
    const linea = `1x ${prod.name}`;
    setRepuestos((prev) => (prev.trim() ? `${prev.trim()}\n${linea}` : linea));
  };

  const handleCrearPeticionTaller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mecanico.trim() || !repuestos.trim()) {
      alert("Por favor completa el nombre del mecánico y los repuestos.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/taller/repuestos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mechanic: mecanico.trim(),
          orderId: orderId.trim() || "ORD-TALLER",
          vehicle: vehiculo.trim() || "Vehículo Taller",
          repuestosText: repuestos.trim(),
          urgency: urgencia,
          notes: notas.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al enviar la petición");
      }

      setMensajeExito(
        `Petición registrada y enviada a Bodega/POS: #${data.requestNumber || ""}`
      );
      setOrderId("");
      setVehiculo("");
      setRepuestos("");
      setNotas("");
      await cargarSolicitudes();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  const handleCambiarEstado = async (req: PartRequestRecord, nuevoEstado: string) => {
    try {
      const id = req.dbId || req.id;
      setActualizandoId(id);

      const res = await fetch("/api/taller/repuestos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: nuevoEstado,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al actualizar estado");
      }

      setRequests((prev) =>
        prev.map((r) => (r.dbId === id || r.id === id ? { ...r, status: nuevoEstado } : r))
      );
      if (detalleReq && (detalleReq.dbId === id || detalleReq.id === id)) {
        setDetalleReq({ ...detalleReq, status: nuevoEstado });
      }
    } catch (err: any) {
      alert(err.message || "No se pudo actualizar el estado.");
    } finally {
      setActualizandoId(null);
    }
  };

  const handleEliminar = async (req: PartRequestRecord) => {
    if (!window.confirm(`¿Eliminar la solicitud ${req.id}?`)) return;
    try {
      const id = req.dbId || req.id;
      setActualizandoId(id);
      const res = await fetch(`/api/taller/repuestos?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al eliminar solicitud");
      }
      setRequests((prev) => prev.filter((r) => r.dbId !== id && r.id !== id));
      if (detalleReq && (detalleReq.dbId === id || detalleReq.id === id)) {
        setDetalleReq(null);
      }
    } catch (err: any) {
      alert(err.message || "No se pudo eliminar la solicitud.");
    } finally {
      setActualizandoId(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Pendiente":
        return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30";
      case "Aprobado":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30";
      case "Entregado":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30";
      case "Rechazado":
        return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/30";
      default:
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    if (urgency === "Alta" || urgency === "Urgente") {
      return (
        <span className="text-rose-500 text-sm font-bold animate-pulse" title={`Urgencia ${urgency}`}>
          ⚠️ {urgency}
        </span>
      );
    }
    return <span className="text-zinc-500 text-sm">Normal</span>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 md:p-10 max-w-7xl mx-auto w-full flex flex-col">
        {/* Navigation / Breadcrumb */}
        <div className="order-1 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/taller"
              title="Volver al Panel de Taller"
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              Solicitud de Repuestos
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              {cargando ? "..." : requests.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setModalAbierto(true);
              setMensajeExito(null);
            }}
            className="h-11 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-6 rounded-xl font-medium transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
          >
            <span>+</span> Nueva Petición
          </button>
        </div>

        {/* Resumen Cards Desplegable en Móvil: debajo de Estado */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-500 flex items-center justify-center text-xl shrink-0">
                🔩
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{cargando ? "..." : requests.length}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Totales</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 flex items-center justify-center text-xl shrink-0">
                ⏳
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {cargando ? "..." : requests.filter(r => r.status === "Pendiente").length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Pendientes</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-500 flex items-center justify-center text-xl shrink-0">
                📦
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {cargando ? "..." : requests.filter(r => r.status === "Aprobado").length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Aprobadas</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                ✅
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {cargando ? "..." : requests.filter(r => r.status === "Entregado").length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Entregadas</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Buscador y Filtros */}
        <div className="order-2 sm:order-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-6">
          <div className="relative w-full flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">🔍</span>
            <input
              type="text"
              placeholder="Buscar por ID, vehículo, orden o mecánico..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-zinc-400 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

          <div className="relative w-full sm:w-48 shrink-0">
            <button
              type="button"
              onClick={() => setFiltroMenuAbierto(!filtroMenuAbierto)}
              className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <span>
                {filterStatus ? filterStatus : "Estado"}
              </span>
              <svg className={`w-4 h-4 text-zinc-400 transition-transform ${filtroMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filtroMenuAbierto && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFiltroMenuAbierto(false)} />
                <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { id: "", label: "Estado" },
                    { id: "Pendiente", label: "Pendiente" },
                    { id: "Aprobado", label: "Aprobado" },
                    { id: "Entregado", label: "Entregado" },
                    { id: "Rechazado", label: "Rechazado" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => {
                        setFilterStatus(opcion.id);
                        setFiltroMenuAbierto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        filterStatus === opcion.id
                          ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opcion.label}</span>
                      {filterStatus === opcion.id && (
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

        {/* Contenido de Solicitudes */}
        <div className="order-4">
        {cargando ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm font-medium text-zinc-500">Cargando solicitudes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {requests.map((req) => (
              <div
                key={req.dbId || req.id}
                className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-sm flex flex-col"
              >
                {/* Card Header */}
                <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start bg-zinc-50/50 dark:bg-zinc-800/20">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{req.id}</span>
                      <select
                        disabled={actualizandoId === req.dbId || actualizandoId === req.id}
                        value={req.status}
                        onChange={(e) => handleCambiarEstado(req, e.target.value)}
                        className={`h-11 text-xs font-bold px-3 rounded-xl border cursor-pointer focus:outline-none ${getStatusStyle(
                          req.status
                        )}`}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Aprobado">Aprobado</option>
                        <option value="Entregado">Entregado</option>
                        <option value="Rechazado">Rechazado</option>
                      </select>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{req.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getUrgencyIcon(req.urgency)}
                    <button
                      type="button"
                      onClick={() => handleEliminar(req)}
                      title="Eliminar solicitud"
                      className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-400 hover:text-rose-500 rounded-xl transition-colors text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex-grow">
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Vehículo / Orden</p>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                        🚗 {req.vehicle}
                      </p>
                      <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {req.orderId}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                      Artículos Solicitados
                    </p>
                    <ul className="space-y-2">
                      {req.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 rounded-lg border border-zinc-100 dark:border-zinc-800"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">
                              {item.quantity}x
                            </span>
                            <span className="text-zinc-600 dark:text-zinc-400">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.stock !== undefined && (
                              <span className="text-[11px] text-zinc-400">Stock: {item.stock}</span>
                            )}
                            {item.available ? (
                              <span
                                className="w-2.5 h-2.5 rounded-full bg-emerald-500"
                                title="En inventario"
                              ></span>
                            ) : (
                              <span
                                className="w-2.5 h-2.5 rounded-full bg-rose-500"
                                title="Sin stock"
                              ></span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 sm:p-5 pt-0 mt-auto">
                  <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
                        👨‍🔧
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          Solicitante
                        </p>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {req.mechanic}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetalleReq(req)}
                      className="h-11 px-4 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {requests.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <span className="text-5xl mb-4 block">🔩</span>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  No se encontraron peticiones
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Intenta buscar con otro término o crea una nueva petición.
                </p>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Modal Detalles de Petición (Bottom-sheet on small screens) */}
        {detalleReq && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 pb-8 sm:pb-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {detalleReq.id} • {detalleReq.orderId}
                  </span>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Detalle de Solicitud a Bodega
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDetalleReq(null)}
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                <div>
                  <p className="text-xs text-zinc-400">Mecánico Solicitante</p>
                  <p className="font-bold text-zinc-900 dark:text-white">{detalleReq.mechanic}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Vehículo</p>
                  <p className="font-bold text-zinc-900 dark:text-white">{detalleReq.vehicle}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Urgencia</p>
                  <p className="font-bold text-zinc-900 dark:text-white">{detalleReq.urgency}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Estado Actual</p>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">{detalleReq.status}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-zinc-500 mb-2">
                  Ítems y Disponibilidad en Inventario
                </p>
                <ul className="space-y-2">
                  {detalleReq.items.map((it, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center text-sm px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {it.quantity}x {it.name}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          it.available
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                        }`}
                      >
                        {it.available ? "En Stock" : "Sin Stock"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {detalleReq.notes && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl">
                  <strong>Notas:</strong> {detalleReq.notes}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCambiarEstado(detalleReq, "Aprobado")}
                    className="flex-1 sm:flex-none h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer flex items-center justify-center"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCambiarEstado(detalleReq, "Entregado")}
                    className="flex-1 sm:flex-none h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer flex items-center justify-center"
                  >
                    Marcar Entregado
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDetalleReq(null)}
                  className="h-11 px-5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer flex items-center justify-center"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Nueva Petición de Taller (Bottom-sheet on small screens) */}
        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-zinc-900 border border-zinc-800 p-6 pb-8 sm:pb-6 shadow-2xl flex flex-col gap-4 text-white max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-lg shrink-0">
                    🔩
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Petición de Repuestos</h3>
                    <span className="text-xs text-indigo-400">
                      Sincronizado con Inventario y Mostrador POS
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="w-10 h-10 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {mensajeExito ? (
                <div className="py-8 text-center flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl border border-emerald-500/30">
                    ✓
                  </div>
                  <h4 className="text-lg font-bold text-white">¡Petición Registrada!</h4>
                  <p className="text-xs text-zinc-400 max-w-xs">{mensajeExito}</p>
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="mt-4 h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCrearPeticionTaller} className="space-y-4">
                  {ordenesActivas.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">
                        Vincular con Orden Activa
                      </label>
                      <select
                        value={orderId}
                        onChange={(e) => handleSelectOrder(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Seleccionar orden o escribir abajo --</option>
                        {ordenesActivas.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.id} • {o.vehicle} ({o.plate})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">
                        Nombre del Mecánico *
                      </label>
                      <select
                        value={mecanico}
                        onChange={(e) => setMecanico(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Carlos Rodríguez">Carlos Rodríguez</option>
                        <option value="Luis Martínez">Luis Martínez</option>
                        <option value="Andrés Castro">Andrés Castro</option>
                        <option value="Ana Torres">Ana Torres</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1">
                        Urgencia
                      </label>
                      <select
                        value={urgencia}
                        onChange={(e) => setUrgencia(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Alta">Alta</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">
                      Vehículo / Placa *
                    </label>
                    <input
                      type="text"
                      required
                      value={vehiculo}
                      onChange={(e) => setVehiculo(e.target.value)}
                      placeholder="Ej. Toyota Hilux (ABC-123)"
                      className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {products.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                        Agregar rápido desde Inventario:
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl bg-zinc-950 border border-zinc-800">
                        {products.slice(0, 12).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleAgregarProductoCatalogo(p)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-zinc-200 hover:text-white transition-colors cursor-pointer min-h-[36px]"
                          >
                            + {p.name} ({p.stock})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">
                      Repuestos / Piezas Requeridas (uno por línea o separados por coma) *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={repuestos}
                      onChange={(e) => setRepuestos(e.target.value)}
                      placeholder={"Ej:\n1x Filtro de Aceite\n4x Aceite Sintético 5W-30"}
                      className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500 resize-y"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-400 block mb-1">
                      Notas adicionales
                    </label>
                    <input
                      type="text"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Especificaciones de marca o número de parte..."
                      className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalAbierto(false)}
                      className="h-11 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={enviando}
                      className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                    >
                      {enviando ? "Enviando..." : "Enviar Petición"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <TallerMobileNav />
    </div>
  );
}
