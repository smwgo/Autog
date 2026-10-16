"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

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
  const [modalAbierto, setModalAbierto] = useState(false);
  const [promoAEditar, setPromoAEditar] = useState<Promotion | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Formulario Crear / Editar promo
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [nuevoValor, setNuevoValor] = useState(10);
  const [nuevoMinimo, setNuevoMinimo] = useState(0);
  const [nuevaCategoria, setNuevaCategoria] = useState("General");
  const [nuevaFecha, setNuevaFecha] = useState("2026-12-31");

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

  const abrirModalCrear = () => {
    setPromoAEditar(null);
    setNuevoCodigo("");
    setNuevoTitulo("");
    setNuevoTipo("PERCENT");
    setNuevoValor(10);
    setNuevoMinimo(0);
    setNuevaCategoria("General");
    setNuevaFecha("2026-12-31");
    setModalAbierto(true);
  };

  const abrirModalEditar = (p: Promotion) => {
    setPromoAEditar(p);
    setNuevoCodigo(p.code);
    setNuevoTitulo(p.title);
    setNuevoTipo(p.discountType);
    setNuevoValor(p.discountValue);
    setNuevoMinimo(p.minPurchase);
    setNuevaCategoria(p.category);
    setNuevaFecha(p.validUntil);
    setModalAbierto(true);
  };

  // CREAR O ACTUALIZAR PROMOCIÓN EN NEON DB (POST / PUT)
  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCodigo.trim() || !nuevoTitulo.trim()) {
      showToast("Por favor completa el código y título de la promoción.");
      return;
    }

    setGuardando(true);
    try {
      const isEdit = Boolean(promoAEditar);
      const res = await fetch("/api/pos/promociones", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: promoAEditar!.id } : {}),
          code: nuevoCodigo.trim().toUpperCase(),
          title: nuevoTitulo.trim(),
          discountType: nuevoTipo,
          discountValue: Number(nuevoValor),
          minPurchase: Number(nuevoMinimo),
          category: nuevaCategoria,
          validUntil: nuevaFecha,
          active: isEdit ? promoAEditar!.active : true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar promoción en Neon DB");
      }

      setModalAbierto(false);
      setPromoAEditar(null);
      showToast(
        isEdit
          ? `Promoción ${nuevoCodigo.toUpperCase()} actualizada en Neon DB.`
          : `Promoción ${nuevoCodigo.toUpperCase()} creada en Neon DB.`
      );
      await fetchPromociones();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

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

  // ELIMINAR PROMOCIÓN DE NEON DB (DELETE)
  const handleEliminar = async (promo: Promotion) => {
    setGuardando(true);
    try {
      const res = await fetch(
        `/api/pos/promociones?id=${encodeURIComponent(promo.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al eliminar promoción de Neon DB");
      }
      showToast(`Promoción ${promo.code} eliminada de Neon DB.`);
      await fetchPromociones();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setGuardando(false);
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

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* Navegación y Título */}
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit"
          >
            &larr; Volver al panel POS
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Promociones Neon DB ({promociones.length})</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <span className="text-4xl select-none mt-1">🏷️</span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Promociones
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Cupones, descuentos de temporada y combos promocionales sincronizados con Neon PostgreSQL.
              </p>
            </div>
          </div>

          <button
            onClick={abrirModalCrear}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer"
          >
            <span>➕</span>
            <span>Nueva Promoción</span>
          </button>
        </div>

        {/* Métricas / KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Promociones Activas
              </span>
              <span className="text-xl">🔥</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
              {activasCount}
            </p>
            <span className="text-xs text-zinc-500">Disponibles para aplicar en POS</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Total Canjes Realizados
              </span>
              <span className="text-xl">🎟️</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
              {totalUsos}
            </p>
            <span className="text-xs text-zinc-500">Cupones utilizados en ventas</span>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Total Promociones
              </span>
              <span className="text-xl">📊</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-2">
              {promociones.length}
            </p>
            <span className="text-xs text-zinc-500">Campañas registradas en Neon</span>
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
              placeholder="Buscar por código, título o categoría..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(["TODAS", "ACTIVAS", "INACTIVAS"] as const).map((estado) => (
              <button
                key={estado}
                onClick={() => setFiltroEstado(estado)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filtroEstado === estado
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {estado === "TODAS" ? "Todas" : estado === "ACTIVAS" ? "Activas" : "Inactivas"}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Promociones en Grid */}
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
                    <button
                      type="button"
                      onClick={() => abrirModalEditar(promo)}
                      className="cursor-pointer px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs hover:bg-zinc-200"
                      title="Editar promoción"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(promo)}
                      disabled={guardando}
                      className="cursor-pointer px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs hover:bg-rose-100"
                      title="Eliminar de Neon DB"
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
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-50 shadow-xs cursor-pointer"
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
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

        {/* Modal Crear / Editar Promoción */}
        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>🏷️</span>
                  <span>{promoAEditar ? `Editar ${promoAEditar.code}` : "Nueva Promoción / Cupón"}</span>
                </h3>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGuardar} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Código de Cupón
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoCodigo}
                    onChange={(e) => setNuevoCodigo(e.target.value.toUpperCase())}
                    placeholder="EJ: VERANO20"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono font-bold uppercase focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Título / Descripción
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoTitulo}
                    onChange={(e) => setNuevoTitulo(e.target.value)}
                    placeholder="20% de descuento en cambio de aceite"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Tipo Descuento
                    </label>
                    <select
                      value={nuevoTipo}
                      onChange={(e) => setNuevoTipo(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-orange-500 outline-none"
                    >
                      <option value="PERCENT">Porcentaje (%)</option>
                      <option value="FIXED">Monto Fijo ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Valor
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={nuevoValor}
                      onChange={(e) => setNuevoValor(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Compra Mínima ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={nuevoMinimo}
                      onChange={(e) => setNuevoMinimo(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={nuevaCategoria}
                      onChange={(e) => setNuevaCategoria(e.target.value)}
                      placeholder="Servicios / Repuestos"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Vigencia hasta
                  </label>
                  <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {guardando ? "Guardando en Neon..." : "Guardar en Neon DB"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalAbierto(false)}
                    className="px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 font-semibold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
