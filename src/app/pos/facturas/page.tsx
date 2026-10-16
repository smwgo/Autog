"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface SaleItem {
  id: string;
  code: string;
  name: string;
  price: number | string;
  quantity: number;
  total: number | string;
}

interface CustomerInfo {
  id: string;
  name: string;
  identification?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Sale {
  id: string;
  saleNumber: string;
  customerName: string;
  subtotal: number | string;
  tax: number | string;
  discount?: number | string;
  total: number | string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: SaleItem[];
  customer?: CustomerInfo | null;
}

export default function FacturasPosPage() {
  const [ventas, setVentas] = useState<Sale[]>([]);
  const [cargando, setCargando] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODAS" | "COMPLETADA" | "ANULADA">("TODAS");
  
  // Modales
  const [ventaDetalle, setVentaDetalle] = useState<Sale | null>(null);
  const [ventaEditar, setVentaEditar] = useState<Sale | null>(null);
  const [editNombreCliente, setEditNombreCliente] = useState("");
  const [editMetodoPago, setEditMetodoPago] = useState("");
  const [editEstado, setEditEstado] = useState("");

  const [accionEnCurso, setAccionEnCurso] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const ticketRef = useRef<HTMLDivElement>(null);

  // Cargar ventas reales desde Neon
  const cargarVentas = useCallback(async (busqueda = "", silencioso = false) => {
    try {
      if (!silencioso) setCargando(true);
      const url = busqueda.trim()
        ? `/api/ventas?busqueda=${encodeURIComponent(busqueda.trim())}`
        : "/api/ventas";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setVentas(data.ventas || []);
      } else {
        setErrorMensaje(data.error || "No se pudieron obtener las ventas de Neon.");
      }
    } catch (err: any) {
      console.error("Error al cargar facturas de Neon:", err);
      setErrorMensaje("Error de conexión al cargar las facturas de Neon.");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarVentas();
  }, [cargarVentas]);

  // Manejo de búsqueda instantánea
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarVentas(searchTerm, true);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, cargarVentas]);

  // UPDATE: Guardar cambios editados en Neon
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventaEditar) return;

    try {
      setAccionEnCurso(true);
      const res = await fetch("/api/ventas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ventaEditar.id,
          customerName: editNombreCliente,
          paymentMethod: editMetodoPago,
          status: editEstado,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito(`Factura ${ventaEditar.saleNumber} actualizada en Neon exitosamente.`);
        setTimeout(() => setMensajeExito(null), 4000);
        setVentaEditar(null);
        await cargarVentas(searchTerm, true);
      } else {
        alert(data.error || "No se pudo actualizar la factura.");
      }
    } catch (err) {
      console.error("Error al actualizar factura:", err);
      alert("Error de conexión al guardar los cambios.");
    } finally {
      setAccionEnCurso(false);
    }
  };

  // UPDATE: Anular venta en Neon y devolver inventario
  const handleAnular = async (v: Sale) => {
    if (
      !confirm(
        `¿Seguro de anular la factura ${v.saleNumber}? Se reincorporará el stock de ${v.items?.length || 0} producto(s) a Neon y se ajustará el cuadre de caja si fue en efectivo.`
      )
    ) {
      return;
    }

    try {
      setAccionEnCurso(true);
      const res = await fetch("/api/ventas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: v.id, status: "Anulada" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito(`Factura ${v.saleNumber} anulada e inventario reabastecido en Neon.`);
        setTimeout(() => setMensajeExito(null), 4000);
        await cargarVentas(searchTerm, true);
        if (ventaDetalle?.id === v.id) {
          setVentaDetalle((prev) => (prev ? { ...prev, status: "Anulada" } : null));
        }
      } else {
        alert(data.error || "No se pudo anular la factura.");
      }
    } catch (err) {
      console.error("Error al anular factura:", err);
      alert("Error de conexión al anular la factura.");
    } finally {
      setAccionEnCurso(false);
    }
  };

  // DELETE: Eliminar venta definitivamente de Neon
  const handleEliminar = async (v: Sale) => {
    if (
      !confirm(
        `⚠️ ATENCIÓN: ¿Deseas ELIMINAR definitivamente la factura ${v.saleNumber} de la base de datos Neon? Esta acción borrará el registro y sus líneas de detalle de forma permanente.`
      )
    ) {
      return;
    }

    try {
      setAccionEnCurso(true);
      const res = await fetch(`/api/ventas?id=${v.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMensajeExito(`Factura ${v.saleNumber} eliminada de Neon.`);
        setTimeout(() => setMensajeExito(null), 4000);
        if (ventaDetalle?.id === v.id) setVentaDetalle(null);
        await cargarVentas(searchTerm, true);
      } else {
        alert(data.error || "No se pudo eliminar la factura.");
      }
    } catch (err) {
      console.error("Error al eliminar venta:", err);
      alert("Error de conexión al eliminar la factura.");
    } finally {
      setAccionEnCurso(false);
    }
  };

  const abrirModalEditar = (v: Sale) => {
    setVentaEditar(v);
    setEditNombreCliente(v.customerName || "Consumidor Final");
    setEditMetodoPago(v.paymentMethod || "Efectivo");
    setEditEstado(v.status || "Completada");
  };

  const handleImprimir = () => {
    window.print();
  };

  // Filtrado por estado
  const ventasFiltradas = ventas.filter((v) => {
    if (filtroEstado === "COMPLETADA") return v.status?.toLowerCase() !== "anulada";
    if (filtroEstado === "ANULADA") return v.status?.toLowerCase() === "anulada";
    return true;
  });

  // Estadísticas en tiempo real
  const totalFacturado = ventas
    .filter((v) => v.status?.toLowerCase() !== "anulada")
    .reduce((acc, curr) => acc + Number(curr.total || 0), 0);

  const totalCompletadas = ventas.filter((v) => v.status?.toLowerCase() !== "anulada").length;
  const totalAnuladas = ventas.filter((v) => v.status?.toLowerCase() === "anulada").length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full print:p-0 print:m-0">
        {/* Cabecera / Navegación */}
        <div className="print:hidden">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/pos"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit"
            >
              &larr; Volver al panel POS
            </Link>

            <button
              onClick={() => cargarVentas(searchTerm)}
              disabled={cargando}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <span className={cargando ? "animate-spin" : ""}>🔄</span>
              <span>Actualizar datos de Neon</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-start gap-4">
              <span className="text-4xl select-none mt-1">🧾</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Facturas
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    🟢 Conectado a Neon
                  </span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Control integral de ventas del POS: consulta, edición de datos, reimpresión, anulación y eliminación real.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/pos/venta"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <span>🛒</span>
                <span>Facturar en POS</span>
              </Link>
            </div>
          </div>

          {/* Notificaciones */}
          {mensajeExito && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium animate-in fade-in flex items-center justify-between">
              <span>✓ {mensajeExito}</span>
              <button
                onClick={() => setMensajeExito(null)}
                className="text-emerald-500 hover:text-emerald-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {errorMensaje && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-medium animate-in fade-in flex items-center justify-between">
              <span>⚠️ {errorMensaje}</span>
              <button
                onClick={() => setErrorMensaje(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* KPIs / Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Total Facturado
                </span>
                <span className="text-xl">💰</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
                ${totalFacturado.toFixed(2)}
              </p>
              <span className="text-xs text-zinc-500">Monto total de ventas válidas en Neon</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Facturas Válidas
                </span>
                <span className="text-xl">✅</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {totalCompletadas}
              </p>
              <span className="text-xs text-zinc-500">Comprobantes activos</span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Anuladas
                </span>
                <span className="text-xl">⚠️</span>
              </div>
              <p className="text-2xl font-bold text-rose-500 mt-2">
                {totalAnuladas}
              </p>
              <span className="text-xs text-zinc-500">Ventas anuladas</span>
            </div>
          </div>

          {/* Filtros y Buscador */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-96">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
                🔍
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por # factura, cliente, cédula..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(["TODAS", "COMPLETADA", "ANULADA"] as const).map((estado) => (
                <button
                  key={estado}
                  onClick={() => setFiltroEstado(estado)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    filtroEstado === estado
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {estado === "TODAS" ? "Todas" : estado === "COMPLETADA" ? "Completadas" : "Anuladas"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de Facturas */}
        <div className="print:hidden bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          {cargando ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Consultando facturas en Neon...
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
              No se encontraron facturas en Neon con los criterios seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4"># Factura</th>
                    <th className="py-3.5 px-4">Fecha y Hora</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Método</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {ventasFiltradas.map((v) => {
                    const esAnulada = v.status?.toLowerCase() === "anulada";
                    const fecha = new Date(v.createdAt).toLocaleString("es-EC", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr
                        key={v.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {v.saleNumber}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {fecha}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-zinc-800 dark:text-zinc-200">
                          <div>{v.customerName || "Consumidor Final"}</div>
                          {v.customer?.identification && (
                            <span className="text-[11px] text-zinc-400 font-mono">
                              CI: {v.customer.identification}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                            {v.paymentMethod || "Efectivo"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          ${Number(v.total || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              esAnulada
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {esAnulada ? "Anulada" : "Completada"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Ver / Imprimir */}
                            <button
                              onClick={() => setVentaDetalle(v)}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Ver Comprobante"
                            >
                              <span>👁️</span>
                              <span>Ver</span>
                            </button>

                            {/* Editar */}
                            <button
                              onClick={() => abrirModalEditar(v)}
                              disabled={accionEnCurso}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold transition-colors cursor-pointer"
                              title="Editar datos de Factura"
                            >
                              ✏️
                            </button>

                            {/* Anular */}
                            {!esAnulada && (
                              <button
                                onClick={() => handleAnular(v)}
                                disabled={accionEnCurso}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                                title="Anular Factura y devolver stock"
                              >
                                Anular
                              </button>
                            )}

                            {/* Eliminar Definitivamente */}
                            <button
                              onClick={() => handleEliminar(v)}
                              disabled={accionEnCurso}
                              className="px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                              title="Eliminar permanentemente de Neon"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Editar Factura (UPDATE) */}
        {ventaEditar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>✏️</span>
                  <span>Editar Factura #{ventaEditar.saleNumber}</span>
                </h3>
                <button
                  onClick={() => setVentaEditar(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardarEdicion} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Cliente / Razón Social
                  </label>
                  <input
                    type="text"
                    required
                    value={editNombreCliente}
                    onChange={(e) => setEditNombreCliente(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={editMetodoPago}
                    onChange={(e) => setEditMetodoPago(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta Débito/Crédito</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Crédito">Crédito Interno</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Estado de Factura
                  </label>
                  <select
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Completada">Completada</option>
                    <option value="Anulada">Anulada</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 text-xs text-zinc-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Monto Total:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      ${Number(ventaEditar.total || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Artículos vendidos:</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {ventaEditar.items?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={accionEnCurso}
                    className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {accionEnCurso ? "Guardando en Neon..." : "Guardar Cambios"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVentaEditar(null)}
                    className="px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 font-semibold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Detalle / Comprobante de Factura (READ & PRINT) */}
        {ventaDetalle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative max-h-[90vh] flex flex-col">
              {/* Header Modal */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 print:hidden">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧾</span>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Factura #{ventaDetalle.saleNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setVentaDetalle(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Contenido Imprimible / Ticket */}
              <div
                ref={ticketRef}
                className="overflow-y-auto flex-grow my-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 font-mono text-xs"
              >
                <div className="text-center mb-4 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
                  <h4 className="font-bold text-base text-zinc-900 dark:text-white">
                    TALLER AUTOMOTRIZ & REPUESTOS
                  </h4>
                  <p className="text-zinc-500 mt-0.5">COMPROBANTE DE VENTA / FACTURA</p>
                  <p className="text-zinc-500 font-bold mt-1"># {ventaDetalle.saleNumber}</p>
                  <p className="text-zinc-400 mt-1">
                    {new Date(ventaDetalle.createdAt).toLocaleString("es-EC")}
                  </p>
                </div>

                <div className="space-y-1 mb-4 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                  <p>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">Cliente: </span>
                    {ventaDetalle.customerName || "Consumidor Final"}
                  </p>
                  {ventaDetalle.customer?.identification && (
                    <p>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">RUC/CI: </span>
                      {ventaDetalle.customer.identification}
                    </p>
                  )}
                  {ventaDetalle.customer?.phone && (
                    <p>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">Teléfono: </span>
                      {ventaDetalle.customer.phone}
                    </p>
                  )}
                  <p>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">Método de Pago: </span>
                    {ventaDetalle.paymentMethod || "Efectivo"}
                  </p>
                  <p>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">Estado: </span>
                    <span
                      className={`font-bold ${
                        ventaDetalle.status?.toLowerCase() === "anulada"
                          ? "text-rose-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {ventaDetalle.status?.toUpperCase() || "COMPLETADA"}
                    </span>
                  </p>
                </div>

                {/* Items */}
                <div className="mb-4 pb-3 border-b border-dashed border-zinc-300 dark:border-zinc-700">
                  <div className="grid grid-cols-12 font-bold text-zinc-800 dark:text-zinc-200 mb-2">
                    <span className="col-span-6">Descripción</span>
                    <span className="col-span-2 text-center">Cant</span>
                    <span className="col-span-2 text-right">P.U</span>
                    <span className="col-span-2 text-right">Total</span>
                  </div>
                  <div className="space-y-1.5 text-zinc-600 dark:text-zinc-300">
                    {ventaDetalle.items?.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 text-[11px]">
                        <span className="col-span-6 truncate font-medium">{item.name}</span>
                        <span className="col-span-2 text-center">{item.quantity}</span>
                        <span className="col-span-2 text-right">
                          ${Number(item.price || 0).toFixed(2)}
                        </span>
                        <span className="col-span-2 text-right font-bold text-zinc-800 dark:text-zinc-100">
                          ${Number(item.total || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totales */}
                <div className="space-y-1.5 text-right font-bold text-zinc-800 dark:text-zinc-200">
                  <div className="flex justify-between text-zinc-500">
                    <span>Subtotal:</span>
                    <span>${Number(ventaDetalle.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {Number(ventaDetalle.discount || 0) > 0 && (
                    <div className="flex justify-between text-orange-500">
                      <span>Descuento:</span>
                      <span>-${Number(ventaDetalle.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-500">
                    <span>IVA:</span>
                    <span>${Number(ventaDetalle.tax || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-900 dark:text-white pt-1 border-t border-zinc-300 dark:border-zinc-700">
                    <span>TOTAL:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ${Number(ventaDetalle.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="text-center mt-6 pt-3 border-t border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 text-[10px]">
                  ¡Gracias por su preferencia!
                </div>
              </div>

              {/* Botones de acción del Modal */}
              <div className="flex items-center gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 print:hidden">
                <button
                  type="button"
                  onClick={handleImprimir}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>🖨️</span>
                  <span>Imprimir Comprobante</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVentaDetalle(null)}
                  className="px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 font-semibold text-xs cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
