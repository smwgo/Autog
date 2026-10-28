"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

interface PedidoItem {
  id: string;
  name: string;
  code?: string;
  qty: number;
  supplierName?: string;
  notes?: string;
  imageUrl?: string | null;
  orderNumber?: string;
  vehicle?: string;
  plate?: string;
}

interface FotoItem {
  id: string;
  url: string;
}

export default function PaginaCatalogoProveedor() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = typeof params?.token === "string" ? decodeURIComponent(params.token) : "";
  const isDaily = token === "diario" || token.startsWith("daily_") || searchParams?.get("mode") === "daily";

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any | null>(null);
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [fotoModal, setFotoModal] = useState<string | null>(null);

  useEffect(() => {
    async function cargarCatalogo() {
      try {
        setCargando(true);
        setError("");
        const endpoint = isDaily
          ? `/api/presupuestos/whatsapp-catalogo?mode=daily`
          : `/api/presupuestos/whatsapp-catalogo?orderId=${encodeURIComponent(token)}`;

        const res = await fetch(endpoint);
        const data = await res.json();

        if (data.success) {
          if (data.mode === "daily") {
            setItems(data.pedidos || []);
          } else {
            setOrder(data.order || null);
            setItems(data.items || []);
            setFotos(data.fotos || []);
          }
        } else {
          setError(data.error || "No se encontró el requerimiento de repuestos.");
        }
      } catch {
        setError("Error de conexión al cargar el pedido de repuestos.");
      } finally {
        setCargando(false);
      }
    }

    if (token) {
      cargarCatalogo();
    }
  }, [token, isDaily]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      {/* Barra Superior Minimalista */}
      <header className="sticky top-0 z-30 px-4 sm:px-6 py-3.5 bg-[#0a0a0c]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-blue-600/30">
              AG
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">
                {isDaily ? "Requerimiento Diario de Repuestos" : "Requerimiento de Repuestos e Insumos"}
              </h1>
              <p className="text-[11px] text-zinc-400">
                Catálogo Digital para Proveedores Autorizados
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            ● Cotización Activa
          </span>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {cargando ? (
          <div className="p-16 text-center space-y-3 bg-[#111113] rounded-3xl border border-white/10">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-400">Cargando catálogo de repuestos...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center bg-[#111113] rounded-3xl border border-rose-500/30 space-y-3">
            <div className="text-3xl">⚠️</div>
            <h2 className="text-base font-bold text-white">{error}</h2>
            <p className="text-xs text-zinc-400">
              Verifica el enlace o solicita un nuevo enlace actualizado por WhatsApp.
            </p>
          </div>
        ) : (
          <>
            {/* Ficha del Vehículo (en modo individual) */}
            {!isDaily && order && (
              <div className="p-5 sm:p-6 rounded-3xl bg-[#111113] border border-white/10 shadow-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 font-mono text-xs font-bold border border-blue-500/30">
                      #{order.orderNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-zinc-800 text-white font-mono text-xs font-bold border border-white/10 uppercase">
                      Placa: {order.plate}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {order.vehicle}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Fecha de recepción: {order.dateIn ? new Date(order.dateIn).toLocaleDateString() : "Hoy"}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-zinc-400 block">Total Repuestos a Cotizar</span>
                  <span className="text-2xl font-black text-blue-400">
                    {items.length} {items.length === 1 ? "Ítem" : "Ítems"}
                  </span>
                </div>
              </div>
            )}

            {/* Listado de Repuestos con Fotos Grandes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>📦</span>
                  <span>
                    {isDaily ? `Lista Consolidada de Pedidos (${items.length})` : "Repuestos Solicitados"}
                  </span>
                </h3>
                <span className="text-xs text-zinc-400">
                  Fotos de muestra y especificaciones
                </span>
              </div>

              {items.length === 0 ? (
                <div className="p-12 text-center bg-[#111113] rounded-2xl border border-white/10 text-zinc-400 text-sm">
                  No hay repuestos pendientes de cotización en este pedido.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-[#111113] rounded-3xl border border-white/10 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xl hover:border-white/20 transition-colors"
                    >
                      <div className="space-y-3">
                        {/* Cabecera del Ítem */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                              Ítem #{idx + 1} {item.code ? `• Código: ${item.code}` : ""}
                            </span>
                            <h4 className="text-base font-bold text-white leading-snug">
                              {item.name}
                            </h4>
                            {isDaily && (item.vehicle || item.plate) && (
                              <p className="text-xs text-blue-400 font-medium">
                                Para: {item.vehicle} ({item.plate})
                              </p>
                            )}
                          </div>

                          <div className="px-3 py-1.5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 font-black text-sm shrink-0">
                            Cant: {item.qty}
                          </div>
                        </div>

                        {/* Foto Grande del Repuesto / Muestra */}
                        {item.imageUrl ? (
                          <div
                            onClick={() => setFotoModal(item.imageUrl!)}
                            className="w-full h-48 sm:h-56 rounded-2xl bg-black border border-white/10 overflow-hidden relative group cursor-pointer"
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-semibold text-white gap-1 backdrop-blur-xs">
                              <span>🔍</span>
                              <span>Ampliar foto</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-24 rounded-2xl bg-zinc-900/60 border border-dashed border-white/10 flex items-center justify-center text-xs text-zinc-500 gap-1.5">
                            <span>📷</span>
                            <span>Sin foto de muestra</span>
                          </div>
                        )}

                        {/* Notas del Técnico / Especificación */}
                        {item.notes && (
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-300">
                            <strong className="text-white block mb-0.5">Nota técnica:</strong>
                            {item.notes}
                          </div>
                        )}
                      </div>

                      {/* Pie con Proveedor */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
                        <span>Asignado a: <strong className="text-zinc-200">{item.supplierName || "Proveedor General"}</strong></span>
                        <span className="text-emerald-400 font-medium">Disponible para cotizar</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Galería adicional de Evidencias del Vehículo */}
            {!isDaily && fotos.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>📸</span>
                  <span>Fotos de Inspección del Vehículo ({fotos.length})</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {fotos.map((f, fIdx) => (
                    <div
                      key={f.id || fIdx}
                      onClick={() => setFotoModal(f.url)}
                      className="h-28 rounded-2xl bg-black border border-white/10 overflow-hidden cursor-pointer relative group"
                    >
                      <img
                        src={f.url}
                        alt="Evidencia"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold text-white">
                        🔍 Ver
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal Flotante de Foto Ampliada */}
      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setFotoModal(null)}
              className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 flex items-center justify-center text-lg z-10 cursor-pointer"
            >
              ✕
            </button>
            <img
              src={fotoModal}
              alt="Repuesto ampliado"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
