"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";

interface OrderRequest {
  id: string;
  requestNumber: string;
  type: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  vehicleInfo?: string | null;
  itemsSummary: string;
  itemsJson?: string | null;
  totalEstimated?: number | string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
}

export default function SolicitudesPosPage() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<OrderRequest[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [solicitudDetalle, setSolicitudDetalle] = useState<OrderRequest | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const cargarSolicitudes = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/solicitudes");
      const data = await res.json();
      if (res.ok && data.success) {
        setSolicitudes(data.solicitudes || []);
      }
    } catch (err) {
      console.error("Error al cargar solicitudes de Neon:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const obtenerOrigenPedido = (tipo?: string): "Selector" | "Tienda" | "Taller" => {
    if (!tipo) return "Selector";
    const t = tipo.toUpperCase();
    if (t.includes("TALLER") || t.includes("MECANICO") || t.includes("ORDEN")) return "Taller";
    if (t.includes("TIENDA") || t.includes("ECOMMERCE") || t.includes("PRODUCTO")) return "Tienda";
    return "Selector";
  };

  const renderOrigenBadge = (tipo?: string) => {
    const origen = obtenerOrigenPedido(tipo);
    if (origen === "Taller") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border mb-1 bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-300">
          <span>🔧</span>
          <span>Taller</span>
        </span>
      );
    }
    if (origen === "Tienda") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border mb-1 bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-300">
          <span>🛒</span>
          <span>Tienda</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium border mb-1 bg-cyan-500/15 border-cyan-500/30 text-cyan-600 dark:text-cyan-300">
        <span>🚗</span>
        <span>Selector</span>
      </span>
    );
  };

  const filtradas = solicitudes.filter((s) => {
    const matchEstado =
      filtroEstado === "TODOS" ||
      (filtroEstado === "PENDIENTES" && s.status === "PENDIENTE") ||
      (filtroEstado === "DESPACHADOS" && s.status === "DESPACHADO");

    const matchTipo = !filtroTipo || obtenerOrigenPedido(s.type) === filtroTipo;

    const term = searchTerm.toLowerCase();
    const matchBusqueda =
      !searchTerm ||
      s.requestNumber.toLowerCase().includes(term) ||
      s.customerName.toLowerCase().includes(term) ||
      (s.customerPhone && s.customerPhone.toLowerCase().includes(term)) ||
      (s.vehicleInfo && s.vehicleInfo.toLowerCase().includes(term)) ||
      s.itemsSummary.toLowerCase().includes(term);

    return matchEstado && matchTipo && matchBusqueda;
  });

  const contarPendientes = solicitudes.filter((s) => s.status === "PENDIENTE").length;
  const contarDespachados = solicitudes.filter((s) => s.status === "DESPACHADO").length;

  const handleCambiarEstado = async (id: string, nuevoEstado: string) => {
    setProcesandoId(id);
    try {
      const res = await fetch("/api/solicitudes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nuevoEstado }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await cargarSolicitudes();
        if (solicitudDetalle?.id === id) {
          setSolicitudDetalle(data.solicitud);
        }
      } else {
        alert(data.error || "Error al actualizar estado en Neon.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const handleEliminar = async (id: string, num: string) => {
    if (!confirm(`¿Eliminar la solicitud ${num}?`)) return;
    setProcesandoId(id);
    try {
      const res = await fetch(`/api/solicitudes?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        await cargarSolicitudes();
        if (solicitudDetalle?.id === id) setSolicitudDetalle(null);
      } else {
        alert(data.error || "Error al eliminar solicitud.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcesandoId(null);
    }
  };

  const despacharEnPos = (s: OrderRequest) => {
    sessionStorage.setItem("pos_despacho_solicitud", JSON.stringify(s));
    router.push("/pos/venta?despachar=" + s.id);
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "TALLER":
      case "SERVICIO":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "REPUESTO":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      default:
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link 
                href="/pos"
                title="Volver a Panel POS"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Pedidos
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm shadow-orange-500/20">
                {contarPendientes}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/pos/venta"
              className="h-10 px-4 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 shadow-sm shadow-emerald-500/20"
            >
              <span>🛒</span>
              Ir a Ventas
            </Link>
          </div>
        </div>

        {/* Resumen Cards con el diseño exacto de Clientes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div 
            onClick={() => setFiltroEstado("TODOS")}
            className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl border shadow-sm relative overflow-hidden flex items-center gap-4 cursor-pointer transition-all hover:-translate-y-0.5 ${
              filtroEstado === "TODOS"
                ? "border-blue-500 ring-2 ring-blue-500/10 shadow-md"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-xl flex-shrink-0">
              📥
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando ? "..." : solicitudes.length}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Totales</h3>
            </div>
          </div>

          <div 
            onClick={() => setFiltroEstado("PENDIENTES")}
            className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl border shadow-sm relative overflow-hidden flex items-center gap-4 cursor-pointer transition-all hover:-translate-y-0.5 ${
              filtroEstado === "PENDIENTES"
                ? "border-orange-500 ring-2 ring-orange-500/10 shadow-md"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 text-xl flex-shrink-0">
              ⏳
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {cargando ? "..." : contarPendientes}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Pendientes</h3>
            </div>
          </div>

          <div 
            onClick={() => setFiltroEstado("DESPACHADOS")}
            className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl border shadow-sm relative overflow-hidden flex items-center gap-4 cursor-pointer transition-all hover:-translate-y-0.5 ${
              filtroEstado === "DESPACHADOS"
                ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-md"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              ✅
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {cargando ? "..." : contarDespachados}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Despachados</h3>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-grow w-full md:w-auto relative">
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-emerald-500 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-3.5 top-3 text-zinc-400 text-sm">🔍</span>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3.5 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 outline-none focus:border-emerald-500"
            >
              <option value="">Todos</option>
              <option value="Selector">Selector</option>
              <option value="Tienda">Tienda</option>
              <option value="Taller">Taller</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    N° Solicitud / Fecha
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Cliente / Contacto
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Origen / Vehículo
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Detalle Solicitado
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">
                    Acción Despacho
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {cargando ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                      <div className="inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-sm">Cargando solicitudes...</p>
                    </td>
                  </tr>
                ) : filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <span className="text-4xl mb-3 block">📥</span>
                      <p className="text-zinc-900 dark:text-white font-bold text-base mb-1">
                        No hay solicitudes pendientes
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Cuando un cliente pida un repuesto, servicio o cita en la web, aparecerá aquí inmediatamente.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtradas.map((s) => {
                    const esPendiente = s.status === "PENDIENTE";
                    const fechaFormatted = new Date(s.createdAt).toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors ${
                          esPendiente ? "bg-amber-50/10" : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {s.requestNumber}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">{fechaFormatted}</div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-semibold text-zinc-900 dark:text-white text-sm">
                            {s.customerName}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {s.customerPhone ? `📞 ${s.customerPhone}` : ""}
                            {s.customerEmail ? ` • ${s.customerEmail}` : ""}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {renderOrigenBadge(s.type)}
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                            {s.vehicleInfo || "Vehículo no especificado"}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 max-w-xs truncate">
                            {s.itemsSummary}
                          </div>
                          {s.totalEstimated && parseFloat(s.totalEstimated.toString()) > 0 && (
                            <div className="text-xs font-bold text-emerald-600">
                              Est: ${parseFloat(s.totalEstimated.toString()).toFixed(2)}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              esPendiente
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {esPendiente ? (
                              <button
                                onClick={() => despacharEnPos(s)}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                                title="Cargar directamente a Nueva Venta para facturar y despachar"
                              >
                                <span>⚡</span> Despachar en POS
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCambiarEstado(s.id, "PENDIENTE")}
                                disabled={procesandoId === s.id}
                                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              >
                                Reabrir
                              </button>
                            )}

                            <button
                              onClick={() => setSolicitudDetalle(s)}
                              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                              title="Ver detalles"
                            >
                              👁️
                            </button>

                            <button
                              onClick={() => handleEliminar(s.id, s.requestNumber)}
                              disabled={procesandoId === s.id}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                              title="Eliminar"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400">
            <span>Total en lista: {filtradas.length} solicitudes</span>
          </div>
        </div>
      </main>

      {/* MODAL: Ver Detalle de Solicitud */}
      {solicitudDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {solicitudDetalle.requestNumber}
                </h3>
                {renderOrigenBadge(solicitudDetalle.type)}
              </div>
              <button
                onClick={() => setSolicitudDetalle(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-zinc-500 font-medium">Cliente:</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white mt-0.5">
                    {solicitudDetalle.customerName}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium">Teléfono / WhatsApp:</span>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white mt-0.5">
                    {solicitudDetalle.customerPhone || "No registrado"}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium">Vehículo:</span>
                  <p className="font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">
                    {solicitudDetalle.vehicleInfo || "No registrado"}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 font-medium">Estado:</span>
                  <p className="font-bold text-emerald-600 mt-0.5">{solicitudDetalle.status}</p>
                </div>
              </div>

              <div>
                <p className="font-bold uppercase text-zinc-500 tracking-wider mb-1.5">Detalle Solicitado</p>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm">
                  {solicitudDetalle.itemsSummary}
                </div>
              </div>

              {solicitudDetalle.notes && (
                <div>
                  <p className="font-bold uppercase text-zinc-500 tracking-wider mb-1.5">Notas del Cliente</p>
                  <p className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {solicitudDetalle.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              {solicitudDetalle.status === "PENDIENTE" ? (
                <button
                  onClick={() => handleCambiarEstado(solicitudDetalle.id, "DESPACHADO")}
                  className="px-4 py-2 rounded-lg border border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold text-xs cursor-pointer"
                >
                  ✓ Marcar como Despachado
                </button>
              ) : (
                <button
                  onClick={() => handleCambiarEstado(solicitudDetalle.id, "PENDIENTE")}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-bold text-xs cursor-pointer"
                >
                  Reabrir a Pendiente
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSolicitudDetalle(null)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => despacharEnPos(solicitudDetalle)}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer"
                >
                  ⚡ Despachar en POS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
