"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

const CATEGORIAS_SUGERIDAS = [
  "General",
  "Servicios",
  "Repuestos",
  "Llantas",
  "Frenos",
  "Mantenimiento",
  "Lubricantes",
  "Baterías",
];

function NuevaPromocionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [esEdicion, setEsEdicion] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campos del formulario
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = useState<number | string>(15);
  const [minPurchase, setMinPurchase] = useState<number | string>(0);
  const [category, setCategory] = useState("General");
  const [validUntil, setValidUntil] = useState("2026-12-31");
  const [active, setActive] = useState(true);

  // Generador de código aleatorio de promoción
  const generarCodigoAleatorio = () => {
    const prefijos = ["PROMO", "DESCUENTO", "OFERTA", "ESPECIAL", "AUTO", "VIP"];
    const prefijo = prefijos[Math.floor(Math.random() * prefijos.length)];
    const sufijo = Math.floor(100 + Math.random() * 900);
    const nuevo = `${prefijo}${discountValue ? Math.round(Number(discountValue)) : sufijo}`;
    setCode(nuevo.toUpperCase());
  };

  // Botones de vigencia rápida
  const aplicarVigenciaRapida = (dias: number) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    const yyyy = fecha.getFullYear();
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");
    setValidUntil(`${yyyy}-${mm}-${dd}`);
  };

  const aplicarFinDeAno = () => {
    const yyyy = new Date().getFullYear();
    setValidUntil(`${yyyy}-12-31`);
  };

  // Si viene con ID para editar, cargamos los datos existentes
  useEffect(() => {
    if (editId) {
      setEsEdicion(true);
      cargarPromoAEditar(editId);
    } else {
      // Valor por defecto inicial si es nueva
      if (!code) {
        generarCodigoAleatorio();
      }
    }
  }, [editId]);

  const cargarPromoAEditar = async (id: string) => {
    try {
      setCargandoDatos(true);
      const res = await fetch("/api/pos/promociones", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.promociones)) {
        const encontrada = data.promociones.find((p: any) => p.id === id || p.code === id);
        if (encontrada) {
          setCode(encontrada.code);
          setTitle(encontrada.title);
          setDiscountType(encontrada.discountType);
          setDiscountValue(encontrada.discountValue);
          setMinPurchase(encontrada.minPurchase);
          setCategory(encontrada.category || "General");
          setValidUntil(encontrada.validUntil);
          setActive(encontrada.active);
        } else {
          setErrorMsg("No se encontró la promoción a editar.");
        }
      }
    } catch (err: any) {
      setErrorMsg("Error al obtener datos de la promoción: " + err.message);
    } finally {
      setCargandoDatos(false);
    }
  };

  const handleGuardar = async (crearOtra: boolean = false) => {
    setErrorMsg(null);

    const codigoLimpio = code.trim().toUpperCase();
    const tituloLimpio = title.trim();
    const valorNum = Number(discountValue);
    const minimoNum = Number(minPurchase);

    if (!codigoLimpio) {
      setErrorMsg("Debes ingresar un código para la promoción.");
      return;
    }

    if (!tituloLimpio) {
      setErrorMsg("Debes ingresar un título o descripción para la promoción.");
      return;
    }

    if (isNaN(valorNum) || valorNum <= 0) {
      setErrorMsg("El valor del descuento debe ser un número mayor a 0.");
      return;
    }

    if (discountType === "PERCENT" && valorNum > 100) {
      setErrorMsg("El porcentaje de descuento no puede ser superior al 100%.");
      return;
    }

    if (isNaN(minimoNum) || minimoNum < 0) {
      setErrorMsg("La compra mínima debe ser un valor válido igual o mayor a 0.");
      return;
    }

    if (!validUntil) {
      setErrorMsg("Debes especificar una fecha de vigencia.");
      return;
    }

    try {
      setGuardando(true);

      const payload = {
        ...(esEdicion && editId ? { id: editId } : {}),
        code: codigoLimpio,
        title: tituloLimpio,
        discountType,
        discountValue: valorNum,
        minPurchase: minimoNum,
        category: category.trim() || "General",
        validUntil,
        active,
      };

      const res = await fetch("/api/pos/promociones", {
        method: esEdicion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo guardar la promoción en la base de datos.");
      }

      setGuardando(false);

      if (crearOtra && !esEdicion) {
        setMensajeExito(`¡Promoción "${codigoLimpio}" creada con éxito! Puedes registrar la siguiente.`);
        // Reiniciar formulario para una nueva
        setTitle("");
        setDiscountValue(15);
        setMinPurchase(0);
        generarCodigoAleatorio();
        setTimeout(() => setMensajeExito(null), 4000);
      } else {
        setMensajeExito(
          esEdicion
            ? `¡Promoción "${codigoLimpio}" actualizada exitosamente!`
            : `¡Promoción "${codigoLimpio}" creada exitosamente!`
        );
        setTimeout(() => {
          router.push("/pos/promociones");
        }, 1000);
      }
    } catch (err: any) {
      setGuardando(false);
      setErrorMsg(err.message || "Ocurrió un error inesperado al guardar.");
    }
  };

  // Cálculo de ejemplo para la vista previa
  const compraEjemplo = 100;
  const valorNumPreview = Number(discountValue) || 0;
  const ahorroEjemplo =
    discountType === "PERCENT"
      ? (compraEjemplo * valorNumPreview) / 100
      : Math.min(valorNumPreview, compraEjemplo);
  const totalEjemplo = Math.max(0, compraEjemplo - ahorroEjemplo);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-12">
      <Header />

      <main className="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full">
        {/* Breadcrumb de Regreso */}
        <div className="mb-6">
          <Link
            href="/pos/promociones"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors w-fit group"
          >
            <span className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-blue-600 group-hover:border-blue-500 shadow-xs transition-all">
              &larr;
            </span>
            <span>Volver a Promociones</span>
          </Link>
        </div>

        {/* Encabezado Principal */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl sm:text-3xl shadow-sm border border-blue-500/20 shrink-0">
              🏷️
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                {esEdicion ? "Editar Promoción" : "Nueva Promoción"}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {esEdicion
                  ? "Modifica las condiciones, valor de descuento o vigencia del cupón."
                  : "Crea cupones y descuentos para aplicar en caja o ventas del taller."}
              </p>
            </div>
          </div>

          {/* Acciones Superiores */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Link
              href="/pos/promociones"
              className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </Link>

            {!esEdicion && (
              <button
                type="button"
                onClick={() => handleGuardar(true)}
                disabled={guardando || cargandoDatos}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 active:scale-95 text-zinc-900 dark:text-zinc-100 text-sm font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span>➕</span>
                <span>Guardar y Crear Otra</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleGuardar(false)}
              disabled={guardando || cargandoDatos}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {guardando ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{esEdicion ? "Actualizar Promoción" : "Guardar Promoción"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mensajes de Alerta / Notificación */}
        {mensajeExito && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm animate-in fade-in zoom-in-95 duration-200 shadow-sm">
            <span className="text-2xl">🎉</span>
            <div className="flex-1 font-bold">{mensajeExito}</div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-3 text-red-800 dark:text-red-300 text-sm animate-in fade-in duration-200 shadow-sm">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-bold">Por favor verifica los datos</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{errorMsg}</p>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-300 font-bold px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {cargandoDatos ? (
          <div className="p-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">Cargando datos de la promoción...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            {/* Columna Izquierda: Formulario Principal (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Tarjeta 1: Información Básica */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📌</span>
                  <span>Identificación del Cupón</span>
                </h2>

                <div className="space-y-4">
                  {/* Código del Cupón */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Código de Cupón *
                      </label>
                      <button
                        type="button"
                        onClick={generarCodigoAleatorio}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                        title="Generar código automático"
                      >
                        🔄 Auto-generar
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="EJ: VERANO20"
                        className="w-full px-4 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono font-bold uppercase text-base sm:text-lg text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all shadow-inner"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                      El código que el cajero o cliente ingresará para aplicar el descuento.
                    </p>
                  </div>

                  {/* Título o Descripción */}
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Título / Descripción *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej: 20% de descuento en cambio de aceite"
                      className="w-full px-4 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>

                  {/* Categoría y Badges Rápidos */}
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Categoría Aplicable
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Ej: General, Servicios, Repuestos..."
                      className="w-full px-4 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />

                    {/* Sugerencias Rápidas */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {CATEGORIAS_SUGERIDAS.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            category.toLowerCase() === cat.toLowerCase()
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Configuración del Descuento */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>💰</span>
                  <span>Monto y Tipo de Descuento</span>
                </h2>

                <div className="space-y-5">
                  {/* Selector visual Tipo de Descuento */}
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-2">
                      Tipo de Beneficio
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDiscountType("PERCENT")}
                        className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-sm transition-all cursor-pointer ${
                          discountType === "PERCENT"
                            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-600 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-600"
                            : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span className="text-lg">%</span>
                        <span>Porcentaje (%)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDiscountType("FIXED")}
                        className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-sm transition-all cursor-pointer ${
                          discountType === "FIXED"
                            ? "bg-blue-50 dark:bg-blue-500/10 border-blue-600 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-600"
                            : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span className="text-lg">$</span>
                        <span>Monto Fijo ($)</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Valor numérico */}
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                        Valor del Descuento {discountType === "PERCENT" ? "(%)" : "($)"} *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-base">
                          {discountType === "PERCENT" ? "%" : "$"}
                        </span>
                        <input
                          type="number"
                          min="1"
                          max={discountType === "PERCENT" ? 100 : undefined}
                          required
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          placeholder={discountType === "PERCENT" ? "15" : "20"}
                          className="w-full pl-9 pr-4 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-bold text-zinc-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Compra mínima */}
                    <div>
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                        Compra Mínima Requerida ($)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-base">
                          $
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={minPurchase}
                          onChange={(e) => setMinPurchase(e.target.value)}
                          placeholder="0"
                          className="w-full pl-9 pr-4 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-bold text-zinc-900 dark:text-white text-base focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        0 = Aplica sin importar el monto total.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Vigencia y Estado */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📅</span>
                  <span>Vigencia y Estado</span>
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block mb-1.5">
                      Fecha Límite de Validez *
                    </label>
                    <input
                      type="date"
                      required
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="w-full px-4 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />

                    {/* Atajos de fecha */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <span className="text-xs text-zinc-400 mr-1">Atajos:</span>
                      <button
                        type="button"
                        onClick={() => aplicarVigenciaRapida(7)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                      >
                        +7 Días
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarVigenciaRapida(15)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                      >
                        +15 Días
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarVigenciaRapida(30)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                      >
                        +1 Mes
                      </button>
                      <button
                        type="button"
                        onClick={() => aplicarVigenciaRapida(90)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                      >
                        +3 Meses
                      </button>
                      <button
                        type="button"
                        onClick={aplicarFinDeAno}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 cursor-pointer"
                      >
                        Fin de Año
                      </button>
                    </div>
                  </div>

                  {/* Interruptor Estado Activo */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">Estado Activo</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Si está activa, podrá ser canjeada inmediatamente en el Punto de Venta.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActive(!active)}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        active ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          active ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Vista Previa en Vivo (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Tarjeta de Vista Previa */}
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-sm sticky top-6">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800 mb-5">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👁️</span> Vista Previa en Vivo
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {active ? "● ACTIVA" : "○ INACTIVA"}
                  </span>
                </div>

                {/* Ticket Cupon Visual */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white p-5 border border-zinc-700/60 shadow-xl">
                  {/* Patrón de brillo decorativo */}
                  <div className="absolute top-0 right-0 -mt-6 -mr-6 w-28 h-28 rounded-full bg-blue-500/20 blur-2xl pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-28 h-28 rounded-full bg-orange-500/20 blur-2xl pointer-events-none"></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold tracking-wider text-orange-400 uppercase bg-orange-500/15 border border-orange-500/30 px-2 py-0.5 rounded-md">
                        {category || "General"}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        Válido: {validUntil || "----"}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-lg text-white mb-3 line-clamp-2">
                      {title || "Título de la promoción..."}
                    </h4>

                    {/* Descuento Destacado */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400">
                        {discountType === "PERCENT"
                          ? `${discountValue || 0}%`
                          : `$${discountValue || 0}`}
                      </span>
                      <span className="text-xs text-zinc-300 font-medium">DE DESCUENTO</span>
                    </div>

                    {/* Línea punteada divisoria estilo cupón */}
                    <div className="border-t border-dashed border-zinc-700 my-4 relative">
                      <div className="absolute -left-7 -top-2 w-4 h-4 rounded-full bg-white dark:bg-zinc-900"></div>
                      <div className="absolute -right-7 -top-2 w-4 h-4 rounded-full bg-white dark:bg-zinc-900"></div>
                    </div>

                    {/* Código del cupón */}
                    <div className="bg-zinc-800/80 border border-zinc-700/80 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-400 block font-semibold">CÓDIGO:</span>
                        <span className="font-mono font-black text-base text-blue-400 tracking-wider">
                          {code || "CODIGO-AQUI"}
                        </span>
                      </div>
                      <span className="text-xs bg-zinc-700/60 px-2.5 py-1 rounded-md text-zinc-300 font-medium">
                        {Number(minPurchase) > 0 ? `Min. $${minPurchase}` : "Sin compra mín."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulador de Ahorro */}
                <div className="mt-5 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>🧮</span> Ejemplo de aplicación en caja:
                  </h4>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 font-medium">
                    <div className="flex justify-between">
                      <span>Venta ejemplo:</span>
                      <span>${compraEjemplo}.00</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Ahorro del cliente:</span>
                      <span>-${ahorroEjemplo.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-900 dark:text-white font-bold pt-1 border-t border-zinc-200 dark:border-zinc-700">
                      <span>Total final a pagar:</span>
                      <span>${totalEjemplo.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Botón Guardar Inferior en Mobile */}
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 lg:hidden">
                  <button
                    type="button"
                    onClick={() => handleGuardar(false)}
                    disabled={guardando || cargandoDatos}
                    className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {guardando ? "Guardando..." : esEdicion ? "Actualizar Promoción" : "Guardar Promoción"}
                  </button>
                </div>
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

export default function NuevaPromocionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <NuevaPromocionContent />
    </Suspense>
  );
}
