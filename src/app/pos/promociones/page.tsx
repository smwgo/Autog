"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface Promotion {
  id: string;
  code: string;
  title: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minPurchase: number;
  category: string;
  validUntil: string;
  active: boolean;
  usesCount: number;
}

export default function PromocionesPage() {
  const [promociones, setPromociones] = useState<Promotion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODAS" | "ACTIVAS" | "INACTIVAS">("TODAS");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);
  const [promoAEliminar, setPromoAEliminar] = useState<Promotion | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPromociones = useCallback(async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/pos/promociones", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.promociones)) {
        setPromociones(data.promociones);
      }
    } catch (err) {
      console.error("Error cargando promociones desde Neon DB:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchPromociones();
  }, [fetchPromociones]);

  // ACTIVAR / DESACTIVAR PROMOCIÓN EN NEON DB (PUT)
  const toggleEstado = async (promo: Promotion) => {
    setGuardando(true);
    try {
      const res = await fetch("/api/pos/promociones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: promo.id,
          active: !promo.active,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al actualizar estado en Neon DB");
      }
      showToast(
        `Promoción ${promo.code} ${!promo.active ? "activada" : "desactivada"} en Neon DB.`
      );
      await fetchPromociones();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  // CONFIRMAR ELIMINAR PROMOCIÓN DE NEON DB (DELETE)
  const confirmarEliminar = async () => {
    if (!promoAEliminar) return;
    setEliminando(true);
    try {
      const res = await fetch(
        `/api/pos/promociones?id=${encodeURIComponent(promoAEliminar.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al eliminar promoción de Neon DB");
      }
      showToast(`Promoción ${promoAEliminar.code} eliminada.`);
      setPromoAEliminar(null);
      await fetchPromociones();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setEliminando(false);
    }
  };

  const copiarCodigo = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const filtradas = promociones.filter((p) => {
    const coincideTexto =
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (!coincideTexto) return false;
    if (filtroEstado === "ACTIVAS") return p.active;
    if (filtroEstado === "INACTIVAS") return !p.active;
    return true;
  });

  const activasCount = promociones.filter((p) => p.active).length;
  const totalUsos = promociones.reduce((sum, p) => sum + p.usesCount, 0);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-bottom duration-200">
          <span className="text-emerald-400">✓</span>
          <span>{toast}</span>
        </div>
      )}

      <main className="flex-grow p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full flex flex-col">
        {/* Header */}
        <div className="order-1 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/pos"
              title="Volver a Panel POS"
              className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Promociones
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              {promociones.length}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/pos/promociones/nueva"
              className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Nueva Promoción</span>
            </Link>
          </div>
        </div>

        {/* Métricas / KPIs Desplegable en Móvil: debajo de Estado */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* Promociones Activas */}
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-500/15 border border-orange-500/25 text-orange-400 flex items-center justify-center text-xl shrink-0">
                🔥
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {activasCount}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Activas</h3>
              </div>
            </div>

            {/* Canjes Realizados */}
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center text-xl shrink-0">
                🎟️
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {totalUsos}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Canjes</h3>
              </div>
            </div>

            {/* Total Promociones */}
            <div className="bg-white dark:bg-zinc-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3.5 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-500/15 border border-purple-500/25 text-purple-400 flex items-center justify-center text-xl shrink-0">
                📊
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {promociones.length}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">Total Campañas</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Filtros y Buscador */}
        <div className="order-2 sm:order-3 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm"
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
              className="w-full h-11 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-sm font-medium flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <span>
                {filtroEstado === "ACTIVAS"
                  ? "Activas"
                  : filtroEstado === "INACTIVAS"
                  ? "Inactivas"
                  : "Estado"}
              </span>
              <svg className={`w-4 h-4 text-zinc-400 transition-transform ${filtroMenuAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filtroMenuAbierto && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setFiltroMenuAbierto(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { id: "TODAS", label: "Estado" },
                    { id: "ACTIVAS", label: "Activas" },
                    { id: "INACTIVAS", label: "Inactivas" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => {
                        setFiltroEstado(opcion.id as any);
                        setFiltroMenuAbierto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                        filtroEstado === opcion.id
                          ? "bg-blue-600/15 text-blue-400"
                          : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                      }`}
                    >
                      <span>{opcion.label}</span>
                      {filtroEstado === opcion.id && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Lista de Promociones en Grid */}
        <div className="order-4">
        {cargando ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500">
            Cargando promociones desde Neon PostgreSQL...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500">
            No se encontraron promociones con los filtros aplicados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtradas.map((promo) => (
              <div
                key={promo.id}
                className={`rounded-2xl p-6 border transition-all relative overflow-hidden bg-white dark:bg-zinc-900 ${
                  promo.active
                    ? "border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md"
                    : "border-zinc-200/50 dark:border-zinc-800/50 opacity-60 bg-zinc-50/50 dark:bg-zinc-900/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    {promo.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        promo.active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                      }`}
                    >
                      {promo.active ? "Activo" : "Inactivo"}
                    </span>
                    <Link
                      href={`/pos/promociones/nueva?id=${promo.id}`}
                      className="cursor-pointer w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm hover:bg-zinc-200 flex items-center justify-center active:scale-95"
                      title="Editar promoción"
                    >
                      ✏️
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPromoAEliminar(promo)}
                      disabled={guardando || eliminando}
                      className="cursor-pointer w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm hover:bg-rose-100 flex items-center justify-center active:scale-95"
                      title="Eliminar promoción"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-1">
                  {promo.title}
                </h3>

                {/* Badge de Descuento */}
                <div className="my-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">
                    {promo.discountType === "PERCENT"
                      ? `${promo.discountValue}%`
                      : `$${promo.discountValue}`}
                  </span>
                  <span className="text-xs text-zinc-500 font-medium">de descuento</span>
                </div>

                {/* Código con botón copiar */}
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-between mb-4 border border-zinc-200/70 dark:border-zinc-700/60">
                  <span className="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200 tracking-wide">
                    {promo.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copiarCodigo(promo.code, promo.id)}
                    className="h-9 px-3 rounded-lg bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-50 shadow-xs cursor-pointer flex items-center justify-center active:scale-95"
                  >
                    {copiadoId === promo.id ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>

                <div className="text-xs text-zinc-500 space-y-1 mb-5">
                  <div className="flex justify-between">
                    <span>Compra mínima:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {promo.minPurchase > 0 ? `$${promo.minPurchase}` : "Sin mínimo"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Válido hasta:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {promo.validUntil}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Canjes:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {promo.usesCount} ventas
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => toggleEstado(promo)}
                  className={`w-full h-11 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center active:scale-98 ${
                    promo.active
                      ? "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  }`}
                >
                  {promo.active ? "Desactivar" : "Activar Promoción"}
                </button>
              </div>
            ))}
          </div>
        )}
        </div>


        {/* Modal Flotante de Confirmación de Eliminación */}
        {promoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-150 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center text-xl mx-auto mb-3">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                ¿Eliminar promoción?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
                Se eliminará <strong className="text-zinc-900 dark:text-white font-medium">{promoAEliminar.code}</strong> ({promoAEliminar.title}).
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPromoAEliminar(null)}
                  disabled={eliminando}
                  className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarEliminar}
                  disabled={eliminando}
                  className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-medium transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-rose-500/20"
                >
                  {eliminando ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Nav for Mobile */}
      <PosMobileNav />
    </div>
  );
}
