"use client";

import React, { useState } from "react";
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

const initialPromotions: Promotion[] = [
  {
    id: "promo-1",
    code: "CAMBIO-ACEITE20",
    title: "20% en Cambio de Aceite y Filtro",
    discountType: "PERCENT",
    discountValue: 20,
    minPurchase: 35,
    category: "Servicios",
    validUntil: "2026-12-31",
    active: true,
    usesCount: 42,
  },
  {
    id: "promo-2",
    code: "FRENOS15",
    title: "$15 de Descuento en Pastillas de Freno",
    discountType: "FIXED",
    discountValue: 15,
    minPurchase: 60,
    category: "Repuestos",
    validUntil: "2026-11-30",
    active: true,
    usesCount: 18,
  },
  {
    id: "promo-3",
    code: "LLANTAS-COMBO",
    title: "Alineación Gratis por Compra de 2 Llantas",
    discountType: "FIXED",
    discountValue: 25,
    minPurchase: 120,
    category: "Llantas",
    validUntil: "2026-12-15",
    active: true,
    usesCount: 9,
  },
  {
    id: "promo-4",
    code: "BIENVENIDA10",
    title: "10% en tu primera compra en mostrador",
    discountType: "PERCENT",
    discountValue: 10,
    minPurchase: 20,
    category: "General",
    validUntil: "2026-10-31",
    active: false,
    usesCount: 65,
  },
];

export default function PromocionesPage() {
  const [promociones, setPromociones] = useState<Promotion[]>(initialPromotions);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODAS" | "ACTIVAS" | "INACTIVAS">("TODAS");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Formulario nueva promo
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [nuevoValor, setNuevoValor] = useState(10);
  const [nuevoMinimo, setNuevoMinimo] = useState(0);
  const [nuevaCategoria, setNuevaCategoria] = useState("General");
  const [nuevaFecha, setNuevaFecha] = useState("2026-12-31");

  const handleCrear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCodigo.trim() || !nuevoTitulo.trim()) {
      alert("Por favor completa el código y título de la promoción.");
      return;
    }

    const promo: Promotion = {
      id: `promo-${Date.now()}`,
      code: nuevoCodigo.trim().toUpperCase(),
      title: nuevoTitulo.trim(),
      discountType: nuevoTipo,
      discountValue: Number(nuevoValor),
      minPurchase: Number(nuevoMinimo),
      category: nuevaCategoria,
      validUntil: nuevaFecha,
      active: true,
      usesCount: 0,
    };

    setPromociones([promo, ...promociones]);
    setModalAbierto(false);
    setNuevoCodigo("");
    setNuevoTitulo("");
    setNuevoValor(10);
    setNuevoMinimo(0);
  };

  const toggleEstado = (id: string) => {
    setPromociones((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
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
      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* Navegación y Título */}
        <div className="mb-6">
          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit"
          >
            &larr; Volver al panel POS
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <span className="text-4xl select-none mt-1">🏷️</span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Promociones
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Cupones, descuentos de temporada y combos promocionales para el mostrador.
              </p>
            </div>
          </div>

          <button
            onClick={() => setModalAbierto(true)}
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
            <span className="text-xs text-zinc-500">Campañas registradas</span>
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
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    promo.active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20"
                  }`}
                >
                  {promo.active ? "Activo" : "Inactivo"}
                </span>
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
                onClick={() => toggleEstado(promo.id)}
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

        {/* Modal Crear Promoción */}
        {modalAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>🏷️</span>
                  <span>Nueva Promoción / Cupón</span>
                </h3>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrear} className="space-y-4 text-sm">
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
                    className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                  >
                    Guardar Promoción
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
