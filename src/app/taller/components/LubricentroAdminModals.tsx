"use client";

import React, { useState, useEffect } from "react";
import type {
  LubricentroConfigData,
  LubCategoryItem,
  LubSubcategoryItem,
  LubOptionItem,
  LubBrandItem,
  LubVehicleCompatibility,
  LubPresentationVariant,
} from "@/app/api/taller/lubricentro/route";

// ============================================================================
// 1. MODAL DE DETALLE COMPLETO DEL PRODUCTO
// ============================================================================
export function ModalDetalleProductoLubricentro({
  producto,
  config,
  onClose,
  onEditar,
  onAgregarAlCarrito,
}: {
  producto: any | null;
  config: LubricentroConfigData;
  onClose: () => void;
  onEditar: (prod: any) => void;
  onAgregarAlCarrito: (prod: any, qty: number, presentationId?: string) => void;
}) {
  const [selectedPresId, setSelectedPresId] = useState<string>("");
  const [cantidad, setCantidad] = useState<number>(1);
  const [imagenActivaIdx, setImagenActivaIdx] = useState<number>(0);

  useEffect(() => {
    if (producto) {
      const presList: LubPresentationVariant[] = Array.isArray(producto.presentationsAvailable)
        ? producto.presentationsAvailable
        : [];
      setSelectedPresId(presList[0]?.id || "");
      setCantidad(1);
      setImagenActivaIdx(0);
    }
  }, [producto]);

  if (!producto) return null;

  const catObj = config.categories.find((c) => c.id === producto.lubCategoryId);
  const subObj = config.subcategories.find((s) => s.id === producto.lubSubcategoryId);
  const presList: LubPresentationVariant[] = Array.isArray(producto.presentationsAvailable)
    ? producto.presentationsAvailable
    : [];
  const activeVariant = presList.find((v) => v.id === selectedPresId);

  const precioVigente = activeVariant ? Number(activeVariant.price) : Number(producto.price || 0);
  const stockDisponible = activeVariant ? Number(activeVariant.stock) : Number(producto.stock || 0);
  const presentacionLabel = activeVariant
    ? activeVariant.label
    : producto.presentation || "No especificada";
  const unidadMedida = activeVariant
    ? activeVariant.unitOfMeasure
    : producto.unitOfMeasure || "Unidad";

  const imagenes: string[] =
    Array.isArray(producto.galleryUrls) && producto.galleryUrls.length > 0
      ? producto.galleryUrls
      : producto.imageUrl
      ? [producto.imageUrl]
      : [];

  const compatibilidades: LubVehicleCompatibility[] = Array.isArray(producto.compatibilities)
    ? producto.compatibilities
    : [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#111113] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-5"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 dark:border-white/10 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 text-xs font-bold">
                {catObj?.icon || "🛢️"} {catObj?.label || producto.category}
              </span>
              {subObj && (
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 text-xs font-semibold">
                  {subObj.icon} {subObj.label}
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  !producto.active || producto.status === "Inactivo"
                    ? "bg-zinc-200 text-zinc-600 border-zinc-300"
                    : stockDisponible <= 0
                    ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300"
                    : stockDisponible <= (producto.minStock || 5)
                    ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300"
                    : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300"
                }`}
              >
                {!producto.active
                  ? "Inactivo"
                  : stockDisponible <= 0
                  ? "Agotado (0)"
                  : `${producto.status} (${stockDisponible} disp.)`}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
              {producto.name}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
              Marca: <strong className="text-zinc-800 dark:text-zinc-200">{producto.brand || "Sin marca"}</strong> • SKU:{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">{producto.code}</strong>
              {producto.manufacturerCode ? ` • Ref. Fabricante: ${producto.manufacturerCode}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditar(producto);
              }}
              className="h-9 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <span>✏️</span>
              <span>Editar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuerpo en 2 columnas */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Galería R2 */}
          <div className="md:col-span-5 space-y-2.5">
            <div className="aspect-square rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 flex items-center justify-center overflow-hidden">
              {imagenes.length > 0 ? (
                <img
                  src={imagenes[imagenActivaIdx] || imagenes[0]}
                  alt={producto.name}
                  className="w-full h-full object-contain p-3"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <span className="text-4xl block opacity-50">{catObj?.icon || "🛢️"}</span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 block font-medium">
                    Sin imagen registrada en R2
                  </span>
                </div>
              )}
            </div>
            {imagenes.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {imagenes.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImagenActivaIdx(idx)}
                    className={`w-14 h-14 rounded-xl border overflow-hidden shrink-0 cursor-pointer ${
                      imagenActivaIdx === idx
                        ? "border-amber-500 ring-2 ring-amber-500/30"
                        : "border-zinc-200 dark:border-white/10 opacity-70"
                    }`}
                  >
                    <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ficha Técnica y Especificaciones */}
          <div className="md:col-span-7 space-y-4">
            {producto.description ? (
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-white/[0.03] p-3.5 rounded-2xl border border-zinc-200 dark:border-white/10">
                {producto.description}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 italic">Sin descripción adicional registrada.</p>
            )}

            {/* Tabla de Atributos Técnicos Reales */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                <span className="text-[11px] text-zinc-500 block">Presentación comercial</span>
                <strong className="text-zinc-900 dark:text-white">{presentacionLabel}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                <span className="text-[11px] text-zinc-500 block">Unidad de medida</span>
                <strong className="text-zinc-900 dark:text-white">{unidadMedida}</strong>
              </div>

              {producto.lubricantBase && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Base del lubricante</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.lubricantBase}</strong>
                </div>
              )}

              {producto.viscosity && (
                <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                  <span className="text-[11px] text-amber-700 dark:text-amber-300 block">Viscosidad SAE</span>
                  <strong className="font-mono text-amber-900 dark:text-amber-200">{producto.viscosity}</strong>
                </div>
              )}

              {producto.fluidType && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Tipo de fluido</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.fluidType}</strong>
                </div>
              )}

              {producto.filterType && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Tipo de filtro</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.filterType}</strong>
                </div>
              )}

              {producto.filterApplication && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Aplicación</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.filterApplication}</strong>
                </div>
              )}

              {producto.fluidClass && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Clase de fluido</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.fluidClass}</strong>
                </div>
              )}

              {producto.voltage && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Voltaje</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.voltage}</strong>
                </div>
              )}

              {producto.capacityAh && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Capacidad / CCA</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.capacityAh}</strong>
                </div>
              )}

              {producto.technology && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Tecnología</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.technology}</strong>
                </div>
              )}

              {producto.dimensionsGroup && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Dimensiones / Grupo</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.dimensionsGroup}</strong>
                </div>
              )}

              {producto.polarity && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Polaridad</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.polarity}</strong>
                </div>
              )}

              {producto.additiveProductType && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Tipo Aditivo / Flush</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.additiveProductType}</strong>
                </div>
              )}

              {producto.greaseType && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Tipo de grasa</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.greaseType}</strong>
                </div>
              )}

              {producto.location && (
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                  <span className="text-[11px] text-zinc-500 block">Ubicación en bodega</span>
                  <strong className="text-zinc-900 dark:text-white">{producto.location}</strong>
                </div>
              )}
            </div>

            {/* Especificaciones técnicas */}
            {Array.isArray(producto.specifications) && producto.specifications.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">
                  Especificaciones y Normas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {producto.specifications.map((sp: string) => (
                    <span
                      key={sp}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/35 text-amber-800 dark:text-amber-300 text-xs font-bold"
                    >
                      {sp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Selector de presentaciones múltiples si existen */}
            {presList.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block">
                  Elegir Presentación Comercial:
                </span>
                <div className="flex flex-wrap gap-2">
                  {presList.map((pv) => {
                    const sel = selectedPresId === pv.id;
                    return (
                      <button
                        key={pv.id}
                        type="button"
                        onClick={() => setSelectedPresId(pv.id)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          sel
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                            : "bg-white dark:bg-white/5 border-zinc-300 dark:border-white/15 text-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {pv.label} — ${Number(pv.price).toFixed(2)} ({pv.stock} disp.)
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Compatibilidad vehicular */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  🚗 Compatibilidad con Vehículos
                </span>
                {compatibilidades.length > 0 ? (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    ✓ {compatibilidades.length} aplicacion(es) verificada(s)
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-zinc-500">
                    Compatibilidad específica no verificada (Uso según norma/viscosidad)
                  </span>
                )}
              </div>
              {compatibilidades.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {compatibilidades.map((c) => (
                    <div
                      key={c.id}
                      className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs"
                    >
                      <strong className="text-zinc-900 dark:text-white">
                        {c.brand} {c.model}
                      </strong>{" "}
                      {c.yearFrom || c.yearTo ? (
                        <span className="text-zinc-500 font-mono">
                          ({c.yearFrom || "..."} - {c.yearTo || "..."})
                        </span>
                      ) : null}
                      {c.engine && (
                        <span className="block text-[11px] text-amber-700 dark:text-amber-300">
                          Motor: {c.engine}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Precio, Cantidad y Botón Agregar */}
            <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-zinc-500 block">Precio de venta vigente</span>
                <strong className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  ${precioVigente.toFixed(2)}
                </strong>
                <span className="text-xs text-zinc-500 ml-1">/ {presentacionLabel}</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-zinc-300 dark:border-white/15 bg-zinc-50 dark:bg-white/5 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCantidad((q) => Math.max(1, q - 1))}
                    className="w-9 h-10 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-white/10 cursor-pointer"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, stockDisponible)}
                    value={cantidad}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) {
                        setCantidad(Math.max(1, Math.min(Math.max(1, stockDisponible), v)));
                      }
                    }}
                    className="w-12 h-10 text-center font-mono text-xs font-bold bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCantidad((q) => Math.min(Math.max(1, stockDisponible), q + 1))}
                    className="w-9 h-10 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-white/10 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!producto.active || stockDisponible <= 0}
                  onClick={() => {
                    onAgregarAlCarrito(producto, cantidad, selectedPresId || undefined);
                    onClose();
                  }}
                  className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 dark:disabled:bg-white/10 text-white disabled:text-zinc-500 text-xs sm:text-sm font-bold cursor-pointer disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  {stockDisponible <= 0 ? "Sin Stock" : "🛒 Agregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// 2. MODAL DE CREACIÓN / EDICIÓN MANUAL DE PRODUCTOS DE LUBRICENTRO
// ============================================================================
export function ModalProductoLubricentroForm({
  productoEditar,
  config,
  defaultCategoryId,
  defaultSubcategoryId,
  onClose,
  onGuardado,
  onConfigActualizada,
}: {
  productoEditar: any | null;
  config: LubricentroConfigData;
  defaultCategoryId: string;
  defaultSubcategoryId: string;
  onClose: () => void;
  onGuardado: (producto: any, mensaje: string) => void;
  onConfigActualizada: (nuevaConfig: LubricentroConfigData) => void;
}) {
  const esEdicion = Boolean(productoEditar?.id);

  const [name, setName] = useState<string>(productoEditar?.name || "");
  const [lubCategoryId, setLubCategoryId] = useState<string>(
    productoEditar?.lubCategoryId || defaultCategoryId || "lub_aceite"
  );
  const [lubSubcategoryId, setLubSubcategoryId] = useState<string>(
    productoEditar?.lubSubcategoryId || defaultSubcategoryId || "lub_aceite_motor"
  );
  const [brand, setBrand] = useState<string>(productoEditar?.brand || "");
  const [code, setCode] = useState<string>(productoEditar?.code || "");
  const [manufacturerCode, setManufacturerCode] = useState<string>(
    productoEditar?.manufacturerCode || ""
  );
  const [description, setDescription] = useState<string>(productoEditar?.description || "");
  const [lubricantBase, setLubricantBase] = useState<string>(
    productoEditar?.lubricantBase || ""
  );
  const [viscosity, setViscosity] = useState<string>(productoEditar?.viscosity || "");
  const [specifications, setSpecifications] = useState<string[]>(
    Array.isArray(productoEditar?.specifications) ? productoEditar.specifications : []
  );
  const [presentation, setPresentation] = useState<string>(
    productoEditar?.presentation || "1 galón"
  );
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>(
    productoEditar?.unitOfMeasure || "Galón"
  );
  const [price, setPrice] = useState<string>(
    productoEditar?.price !== undefined ? String(productoEditar.price) : ""
  );
  const [costPrice, setCostPrice] = useState<string>(
    productoEditar?.costPrice !== undefined && productoEditar?.costPrice !== null
      ? String(productoEditar.costPrice)
      : ""
  );
  const [stock, setStock] = useState<string>(
    productoEditar?.stock !== undefined ? String(productoEditar.stock) : "10"
  );
  const [minStock, setMinStock] = useState<string>(
    productoEditar?.minStock !== undefined ? String(productoEditar.minStock) : "5"
  );
  const [location, setLocation] = useState<string>(productoEditar?.location || "Lubricentro");
  const [active, setActive] = useState<boolean>(
    productoEditar?.active !== undefined ? Boolean(productoEditar.active) : true
  );

  // Campos específicos por categoría
  const [fluidType, setFluidType] = useState<string>(productoEditar?.fluidType || "");
  const [filterType, setFilterType] = useState<string>(productoEditar?.filterType || "");
  const [filterApplication, setFilterApplication] = useState<string>(
    productoEditar?.filterApplication || ""
  );
  const [fluidClass, setFluidClass] = useState<string>(productoEditar?.fluidClass || "");
  const [voltage, setVoltage] = useState<string>(productoEditar?.voltage || "");
  const [capacityAh, setCapacityAh] = useState<string>(productoEditar?.capacityAh || "");
  const [technology, setTechnology] = useState<string>(productoEditar?.technology || "");
  const [dimensionsGroup, setDimensionsGroup] = useState<string>(
    productoEditar?.dimensionsGroup || ""
  );
  const [polarity, setPolarity] = useState<string>(productoEditar?.polarity || "");
  const [additiveProductType, setAdditiveProductType] = useState<string>(
    productoEditar?.additiveProductType || ""
  );
  const [additiveApplication, setAdditiveApplication] = useState<string>(
    productoEditar?.additiveApplication || ""
  );
  const [greaseType, setGreaseType] = useState<string>(productoEditar?.greaseType || "");
  const [greaseApplication, setGreaseApplication] = useState<string>(
    productoEditar?.greaseApplication || ""
  );

  // Galería R2
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    Array.isArray(productoEditar?.galleryUrls) && productoEditar.galleryUrls.length > 0
      ? productoEditar.galleryUrls
      : productoEditar?.imageUrl
      ? [productoEditar.imageUrl]
      : []
  );
  const [subiendoImagen, setSubiendoImagen] = useState<boolean>(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  // Presentaciones múltiples opcionales
  const [presentationsAvailable, setPresentationsAvailable] = useState<LubPresentationVariant[]>(
    Array.isArray(productoEditar?.presentationsAvailable)
      ? productoEditar.presentationsAvailable
      : []
  );
  const [newPresLabel, setNewPresLabel] = useState<string>("");
  const [newPresUnit, setNewPresUnit] = useState<string>("Litro");
  const [newPresPrice, setNewPresPrice] = useState<string>("");
  const [newPresStock, setNewPresStock] = useState<string>("10");

  // Compatibilidades con vehículos
  const [compatibilities, setCompatibilities] = useState<LubVehicleCompatibility[]>(
    Array.isArray(productoEditar?.compatibilities) ? productoEditar.compatibilities : []
  );
  const [compBrand, setCompBrand] = useState<string>("");
  const [compModel, setCompModel] = useState<string>("");
  const [compYearFrom, setCompYearFrom] = useState<string>("");
  const [compYearTo, setCompYearTo] = useState<string>("");
  const [compEngine, setCompEngine] = useState<string>("");

  // Quick-add de opción nueva sin salir del formulario
  const [nuevaSpecInput, setNuevaSpecInput] = useState<string>("");
  const [nuevaMarcaInput, setNuevaMarcaInput] = useState<string>("");
  const [nuevaViscInput, setNuevaViscInput] = useState<string>("");
  const [nuevaPresInput, setNuevaPresInput] = useState<string>("");

  const [guardando, setGuardando] = useState<boolean>(false);
  const [eliminando, setEliminando] = useState<boolean>(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const subcategoriasDeCat = config.subcategories
    .filter((s) => s.categoryId === lubCategoryId && s.active)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (
      subcategoriasDeCat.length > 0 &&
      !subcategoriasDeCat.some((s) => s.id === lubSubcategoryId)
    ) {
      setLubSubcategoryId(subcategoriasDeCat[0].id);
    }
  }, [lubCategoryId]);

  const catActual = config.categories.find((c) => c.id === lubCategoryId);
  const subActual = config.subcategories.find((s) => s.id === lubSubcategoryId);
  const schemaType = catActual?.schemaType || "aceites";
  const subSchemaType = subActual?.subSchemaType || "aceite_motor";

  const handleSubirImagenR2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!tiposPermitidos.includes(file.type)) {
      setErrorImagen("Formato inválido. Usa imágenes JPG, PNG, WEBP o AVIF.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorImagen("La imagen supera el tamaño máximo de 8 MB.");
      return;
    }

    setErrorImagen(null);
    setSubiendoImagen(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "lubricentro-productos");

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "No se pudo subir la imagen a Cloudflare R2");
      }
      setGalleryUrls((prev) => (prev.includes(data.url) ? prev : [...prev, data.url]));
    } catch (err: any) {
      setErrorImagen(err?.message || "Error al subir imagen a Cloudflare R2");
    } finally {
      setSubiendoImagen(false);
    }
  };

  const handleAgregarOpcionRapida = async (
    tipo: "brand" | "viscosity" | "specification" | "presentation",
    valor: string
  ) => {
    const limpio = valor.trim();
    if (!limpio) return;

    const nuevaConfig: LubricentroConfigData = JSON.parse(JSON.stringify(config));
    if (tipo === "brand") {
      if (!nuevaConfig.brands.some((b) => b.name.toLowerCase() === limpio.toLowerCase())) {
        nuevaConfig.brands.push({
          id: `br_${Date.now()}`,
          name: limpio,
          origin: "",
          active: true,
          order: nuevaConfig.brands.length + 1,
        });
      }
      setBrand(limpio);
      setNuevaMarcaInput("");
    } else if (tipo === "viscosity") {
      if (!nuevaConfig.oilConfig.viscosities.some((v) => v.label.toLowerCase() === limpio.toLowerCase())) {
        nuevaConfig.oilConfig.viscosities.push({
          id: `visc_${Date.now()}`,
          label: limpio.toUpperCase(),
          value: limpio.toUpperCase(),
          basePriceRef: Number(price) || 30,
          order: nuevaConfig.oilConfig.viscosities.length + 1,
          active: true,
        });
      }
      setViscosity(limpio.toUpperCase());
      setNuevaViscInput("");
    } else if (tipo === "specification") {
      if (!nuevaConfig.oilConfig.specifications.some((s) => s.label.toLowerCase() === limpio.toLowerCase())) {
        nuevaConfig.oilConfig.specifications.push({
          id: `spec_${Date.now()}`,
          label: limpio,
          value: limpio,
          order: nuevaConfig.oilConfig.specifications.length + 1,
          active: true,
        });
      }
      setSpecifications((prev) => (prev.includes(limpio) ? prev : [...prev, limpio]));
      setNuevaSpecInput("");
    } else if (tipo === "presentation") {
      if (!nuevaConfig.oilConfig.presentations.some((p) => p.label.toLowerCase() === limpio.toLowerCase())) {
        nuevaConfig.oilConfig.presentations.push({
          id: `pres_${Date.now()}`,
          label: limpio,
          unit: unitOfMeasure || "Unidad",
          numericQty: 1,
          order: nuevaConfig.oilConfig.presentations.length + 1,
          active: true,
        });
      }
      setPresentation(limpio);
      setNuevaPresInput("");
    }

    try {
      const res = await fetch("/api/taller/lubricentro", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: nuevaConfig }),
      });
      const d = await res.json();
      if (res.ok && d.success && d.config) {
        onConfigActualizada(d.config);
      }
    } catch {}
  };

  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorForm("El nombre comercial del producto es obligatorio.");
      return;
    }
    const numPrecio = parseFloat(price);
    if (isNaN(numPrecio) || numPrecio < 0) {
      setErrorForm("Ingresa un precio de venta válido.");
      return;
    }

    setErrorForm(null);
    setGuardando(true);
    try {
      const res = await fetch("/api/taller/lubricentro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_PRODUCT",
          product: {
            id: productoEditar?.id,
            name: name.trim(),
            code: code.trim() || undefined,
            brand: brand.trim(),
            lubCategoryId,
            lubSubcategoryId,
            manufacturerCode: manufacturerCode.trim(),
            description: description.trim(),
            lubricantBase,
            viscosity,
            specifications,
            presentation,
            presentationsAvailable,
            unitOfMeasure,
            price: numPrecio,
            costPrice: costPrice.trim() !== "" ? parseFloat(costPrice) : null,
            stock: parseInt(stock, 10) || 0,
            minStock: parseInt(minStock, 10) || 5,
            location: location.trim() || "Lubricentro",
            imageUrl: galleryUrls[0] || null,
            galleryUrls,
            active,
            compatibilities,
            fluidType,
            filterType,
            filterApplication,
            fluidClass,
            voltage,
            capacityAh,
            technology,
            dimensionsGroup,
            polarity,
            additiveProductType,
            additiveApplication,
            greaseType,
            greaseApplication,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar producto en Neon");
      }
      if (data.config) {
        onConfigActualizada(data.config);
      }
      onGuardado(
        data.product,
        esEdicion ? "Producto actualizado en Neon correctamente." : "Producto registrado en Neon correctamente."
      );
      onClose();
    } catch (err: any) {
      setErrorForm(err?.message || "No se pudo guardar el producto.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarODesactivar = async () => {
    if (!productoEditar?.id) return;
    setEliminando(true);
    setErrorForm(null);
    try {
      const res = await fetch(
        `/api/taller/lubricentro?type=product&id=${encodeURIComponent(productoEditar.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo eliminar/desactivar el producto");
      }
      onGuardado(null, data.message || "Operación realizada sobre el producto.");
      onClose();
    } catch (err: any) {
      setErrorForm(err?.message || "Error al eliminar producto");
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#111113] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-white/10 shadow-2xl p-5 sm:p-6"
      >
        <form onSubmit={handleGuardarProducto} className="space-y-5">
          {/* Cabecera */}
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3.5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>{esEdicion ? "✏️" : "➕"}</span>
                <span>
                  {esEdicion ? `Editar Producto: ${productoEditar.name}` : "Registrar Producto en Catálogo de Lubricentro"}
                </span>
              </h3>
              <p className="text-xs text-zinc-500">
                Conectado a la tabla real <code className="font-mono">Product</code> en Neon y almacenamiento Cloudflare R2.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {errorForm && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              ⚠️ {errorForm}
            </div>
          )}

          {/* 1. Datos Generales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Nombre comercial *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Castrol GTX Magnatec 10W-30 Semisintético"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Estado del producto
              </label>
              <button
                type="button"
                onClick={() => setActive((v) => !v)}
                className={`w-full h-10 px-3 rounded-xl border text-xs font-bold cursor-pointer flex items-center justify-between ${
                  active
                    ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                    : "bg-zinc-100 dark:bg-white/5 border-zinc-300 dark:border-white/15 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <span>{active ? "✓ Activo en Catálogo" : "⏸ Inactivo / Oculto"}</span>
                <span className="text-[11px] underline">Cambiar</span>
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Categoría Principal *
              </label>
              <select
                value={lubCategoryId}
                onChange={(e) => setLubCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              >
                {config.categories
                  .filter((c) => c.active)
                  .sort((a, b) => a.order - b.order)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Subcategoría *
              </label>
              <select
                value={lubSubcategoryId}
                onChange={(e) => setLubSubcategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs sm:text-sm focus:outline-none focus:border-amber-500"
              >
                {subcategoriasDeCat.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Marca
              </label>
              <div className="flex gap-1.5">
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="flex-1 h-10 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">Seleccionar marca...</option>
                  {config.brands
                    .filter((b) => b.active)
                    .sort((a, b) => a.order - b.order)
                    .map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-1 mt-1">
                <input
                  type="text"
                  value={nuevaMarcaInput}
                  onChange={(e) => setNuevaMarcaInput(e.target.value)}
                  placeholder="+ Nueva marca..."
                  className="flex-1 h-7 px-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-[11px]"
                />
                {nuevaMarcaInput.trim() && (
                  <button
                    type="button"
                    onClick={() => handleAgregarOpcionRapida("brand", nuevaMarcaInput)}
                    className="px-2 h-7 rounded-lg bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Añadir
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Código SKU (Interno)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej. LUB-ACE-10W30"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono uppercase focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Código / Referencia del Fabricante (OEM)
              </label>
              <input
                type="text"
                value={manufacturerCode}
                onChange={(e) => setManufacturerCode(e.target.value)}
                placeholder="Ej. 90915-YZZD2 / W 712/75"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Ubicación en Bodega / Estante
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Estante A-1 Lubricentro"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 2. Precios, Costo, Stock y Presentación Comercial */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              💰 Precio, Inventario y Presentación Comercial
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Precio Venta ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Costo Compra ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="Opcional"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Existencias (Stock) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Stock Mínimo
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Presentación Comercial
                </label>
                <select
                  value={presentation}
                  onChange={(e) => setPresentation(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="Unidad">Unidad</option>
                  {config.oilConfig.presentations
                    .filter((p) => p.active)
                    .sort((a, b) => a.order - b.order)
                    .map((p) => (
                      <option key={p.id} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                </select>
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    value={nuevaPresInput}
                    onChange={(e) => setNuevaPresInput(e.target.value)}
                    placeholder="+ Otra presentación..."
                    className="flex-1 h-7 px-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-[11px]"
                  />
                  {nuevaPresInput.trim() && (
                    <button
                      type="button"
                      onClick={() => handleAgregarOpcionRapida("presentation", nuevaPresInput)}
                      className="px-2 h-7 rounded-lg bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Unidad de Medida
                </label>
                <select
                  value={unitOfMeasure}
                  onChange={(e) => setUnitOfMeasure(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs focus:outline-none focus:border-amber-500"
                >
                  {["Galón", "Litro", "Cuarto (Qt)", "Unidad", "Envase", "Cartucho", "Pote", "Balde", "Juego"].map(
                    (u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Variantes de presentación adicionales */}
            <div className="pt-2 border-t border-amber-200/70 dark:border-white/10 space-y-2">
              <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block">
                Opcional: Agregar diferentes presentaciones comerciales para este mismo producto (ej. 1 litro y 1 galón):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newPresLabel}
                  onChange={(e) => setNewPresLabel(e.target.value)}
                  placeholder="Ej. Botella 1 Litro"
                  className="h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                />
                <input
                  type="number"
                  step="0.01"
                  value={newPresPrice}
                  onChange={(e) => setNewPresPrice(e.target.value)}
                  placeholder="Precio $"
                  className="w-24 h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono"
                />
                <input
                  type="number"
                  value={newPresStock}
                  onChange={(e) => setNewPresStock(e.target.value)}
                  placeholder="Stock"
                  className="w-20 h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPresLabel.trim() || !newPresPrice.trim()) return;
                    setPresentationsAvailable((prev) => [
                      ...prev,
                      {
                        id: `pv_${Date.now()}`,
                        label: newPresLabel.trim(),
                        unitOfMeasure: newPresUnit || unitOfMeasure,
                        price: parseFloat(newPresPrice) || 0,
                        stock: parseInt(newPresStock, 10) || 0,
                      },
                    ]);
                    setNewPresLabel("");
                    setNewPresPrice("");
                  }}
                  className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
                >
                  + Agregar Variante
                </button>
              </div>
              {presentationsAvailable.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {presentationsAvailable.map((pv) => (
                    <span
                      key={pv.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white dark:bg-black/40 border border-amber-300 text-xs font-semibold"
                    >
                      <span>
                        {pv.label}: <strong>${Number(pv.price).toFixed(2)}</strong> ({pv.stock} disp.)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPresentationsAvailable((prev) => prev.filter((x) => x.id !== pv.id))
                        }
                        className="text-rose-600 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Campos Técnicos Dinámicos según Categoría / Subcategoría */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              🔧 Especificaciones y Campos Específicos ({catActual?.label} → {subActual?.label})
            </h4>

            {/* ACEITE DE MOTOR */}
            {schemaType === "aceites" && subSchemaType === "aceite_motor" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Base del Lubricante
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {config.oilConfig.bases
                      .filter((b) => b.active)
                      .sort((a, b) => a.order - b.order)
                      .map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setLubricantBase(b.label)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                            lubricantBase === b.label
                              ? "bg-amber-500 text-white border-amber-600"
                              : "bg-white dark:bg-black/40 border-zinc-300 dark:border-white/15"
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Viscosidad SAE
                  </label>
                  <select
                    value={viscosity}
                    onChange={(e) => setViscosity(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono font-bold"
                  >
                    <option value="">Seleccionar viscosidad...</option>
                    {config.oilConfig.viscosities
                      .filter((v) => v.active)
                      .sort((a, b) => a.order - b.order)
                      .map((v) => (
                        <option key={v.id} value={v.label}>
                          {v.label}
                        </option>
                      ))}
                  </select>
                  <div className="flex gap-1 mt-1">
                    <input
                      type="text"
                      value={nuevaViscInput}
                      onChange={(e) => setNuevaViscInput(e.target.value)}
                      placeholder="+ Nueva viscosidad (ej. 0W-16)"
                      className="flex-1 h-7 px-2 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-[11px] font-mono"
                    />
                    {nuevaViscInput.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAgregarOpcionRapida("viscosity", nuevaViscInput)}
                        className="px-2 h-7 rounded-lg bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Añadir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ADITIVOS Y FLUSH */}
            {schemaType === "aceites" && (subSchemaType === "aditivos" || subSchemaType === "flush") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Tipo de Producto (Aditivo / Flush)
                  </label>
                  <select
                    value={additiveProductType}
                    onChange={(e) => setAdditiveProductType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar tipo...</option>
                    {config.additivesConfig.productTypes
                      .filter((t) => t.active)
                      .map((t) => (
                        <option key={t.id} value={t.label}>
                          {t.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Aplicación
                  </label>
                  <select
                    value={additiveApplication}
                    onChange={(e) => setAdditiveApplication(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar aplicación...</option>
                    {config.additivesConfig.applications
                      .filter((a) => a.active)
                      .map((a) => (
                        <option key={a.id} value={a.label}>
                          {a.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* GRASAS LUBRICANTES */}
            {schemaType === "aceites" && subSchemaType === "grasas" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Tipo de Grasa
                  </label>
                  <select
                    value={greaseType}
                    onChange={(e) => setGreaseType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar tipo de grasa...</option>
                    {config.greasesConfig.greaseTypes
                      .filter((g) => g.active)
                      .map((g) => (
                        <option key={g.id} value={g.label}>
                          {g.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Aplicación de Grasa
                  </label>
                  <select
                    value={greaseApplication}
                    onChange={(e) => setGreaseApplication(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar aplicación...</option>
                    {config.greasesConfig.applications
                      .filter((a) => a.active)
                      .map((a) => (
                        <option key={a.id} value={a.label}>
                          {a.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* TRANSMISIÓN */}
            {schemaType === "transmision" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Tipo de Fluido de Transmisión
                  </label>
                  <select
                    value={fluidType}
                    onChange={(e) => setFluidType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar tipo...</option>
                    {config.transmissionConfig.fluidTypes
                      .filter((f) => f.active)
                      .map((f) => (
                        <option key={f.id} value={f.label}>
                          {f.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Viscosidad (cuando corresponda)
                  </label>
                  <select
                    value={viscosity}
                    onChange={(e) => setViscosity(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono"
                  >
                    <option value="">N/A o seleccionar...</option>
                    {config.transmissionConfig.viscosities
                      .filter((v) => v.active)
                      .map((v) => (
                        <option key={v.id} value={v.label}>
                          {v.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Base del Lubricante
                  </label>
                  <select
                    value={lubricantBase}
                    onChange={(e) => setLubricantBase(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Opcional...</option>
                    {config.oilConfig.bases.map((b) => (
                      <option key={b.id} value={b.label}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* FILTROS */}
            {schemaType === "filtros" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Tipo Constructivo de Filtro
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar tipo de filtro...</option>
                    {config.filtersConfig.filterTypes
                      .filter((f) => f.active)
                      .map((f) => (
                        <option key={f.id} value={f.label}>
                          {f.label}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Aplicación Vehicular / Motor
                  </label>
                  <input
                    type="text"
                    list="lista-aplicaciones-filtro"
                    value={filterApplication}
                    onChange={(e) => setFilterApplication(e.target.value)}
                    placeholder="Ej. Toyota Hilux / Corolla / Yaris"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  />
                  <datalist id="lista-aplicaciones-filtro">
                    {config.filtersConfig.applications.map((a) => (
                      <option key={a.id} value={a.label} />
                    ))}
                  </datalist>
                </div>
              </div>
            )}

            {/* FLUIDOS */}
            {schemaType === "fluidos" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Clase de Fluido
                  </label>
                  <select
                    value={fluidClass}
                    onChange={(e) => setFluidClass(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar clase de fluido...</option>
                    {config.fluidsConfig.fluidClasses
                      .filter((f) => f.active)
                      .map((f) => (
                        <option key={f.id} value={f.label}>
                          {f.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* BATERÍAS */}
            {schemaType === "baterias" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Voltaje
                  </label>
                  <select
                    value={voltage}
                    onChange={(e) => setVoltage(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar voltaje...</option>
                    {config.batteriesConfig.voltages
                      .filter((v) => v.active)
                      .map((v) => (
                        <option key={v.id} value={v.label}>
                          {v.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Capacidad (Ah / CCA)
                  </label>
                  <select
                    value={capacityAh}
                    onChange={(e) => setCapacityAh(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar capacidad...</option>
                    {config.batteriesConfig.capacities
                      .filter((c) => c.active)
                      .map((c) => (
                        <option key={c.id} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Tecnología
                  </label>
                  <select
                    value={technology}
                    onChange={(e) => setTechnology(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar tecnología...</option>
                    {config.batteriesConfig.technologies
                      .filter((t) => t.active)
                      .map((t) => (
                        <option key={t.id} value={t.label}>
                          {t.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Dimensiones / Grupo BCI
                  </label>
                  <select
                    value={dimensionsGroup}
                    onChange={(e) => setDimensionsGroup(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar grupo...</option>
                    {config.batteriesConfig.dimensionGroups
                      .filter((d) => d.active)
                      .map((d) => (
                        <option key={d.id} value={d.label}>
                          {d.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Polaridad
                  </label>
                  <select
                    value={polarity}
                    onChange={(e) => setPolarity(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  >
                    <option value="">Seleccionar polaridad...</option>
                    {config.batteriesConfig.polarities
                      .filter((p) => p.active)
                      .map((p) => (
                        <option key={p.id} value={p.label}>
                          {p.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {/* Especificaciones Técnicas (API, ACEA, OEM, DOT, NLGI, etc.) */}
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-white/10">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                Especificaciones / Normas Técnicas (Toca para marcar o agrega una nueva)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(schemaType === "transmision"
                  ? config.transmissionConfig.specifications
                  : schemaType === "fluidos"
                  ? config.fluidsConfig.specifications
                  : subSchemaType === "grasas"
                  ? config.greasesConfig.specifications
                  : config.oilConfig.specifications
                )
                  .filter((sp) => sp.active)
                  .map((sp) => {
                    const marcada = specifications.includes(sp.label);
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() =>
                          setSpecifications((prev) =>
                            prev.includes(sp.label)
                              ? prev.filter((x) => x !== sp.label)
                              : [...prev, sp.label]
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          marcada
                            ? "bg-amber-500 text-white border-amber-600"
                            : "bg-white dark:bg-black/40 border-zinc-300 dark:border-white/15 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {marcada ? "✓ " : "+ "}
                        {sp.label}
                      </button>
                    );
                  })}
              </div>

              <div className="flex gap-2 max-w-md pt-1">
                <input
                  type="text"
                  value={nuevaSpecInput}
                  onChange={(e) => setNuevaSpecInput(e.target.value)}
                  placeholder="Agregar otra norma (ej. API SP, DEXOS 1, DOT 5.1)..."
                  className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleAgregarOpcionRapida("specification", nuevaSpecInput)}
                  className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-900 dark:bg-white/10 text-white text-xs font-bold cursor-pointer"
                >
                  + Añadir Norma
                </button>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                Descripción técnica / Observaciones
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles técnicos reales del producto..."
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 4. Imágenes en Cloudflare R2 */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  🖼️ Imágenes del Producto (Cloudflare R2)
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Sube fotografías reales (JPG, PNG, WEBP, máx 8 MB). La primera será la imagen principal.
                </p>
              </div>

              <label className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-xs">
                <span>{subiendoImagen ? "⏳ Subiendo a R2..." : "📤 Subir Imagen a R2"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={subiendoImagen}
                  onChange={handleSubirImagenR2}
                  className="hidden"
                />
              </label>
            </div>

            {errorImagen && (
              <p className="text-xs text-rose-600 font-semibold">⚠️ {errorImagen}</p>
            )}

            {galleryUrls.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {galleryUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative w-24 h-24 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 overflow-hidden group"
                  >
                    <img src={url} alt="" className="w-full h-full object-contain p-1" />
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold">
                        Principal
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setGalleryUrls((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold cursor-pointer"
                      title="Quitar imagen"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">
                Este producto aún no tiene imagen cargada. Se mostrará estado &ldquo;Sin imagen&rdquo;.
              </p>
            )}
          </div>

          {/* 5. Compatibilidades Vehiculares Verificadas */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              🚗 Compatibilidades Vehiculares Verificadas (Opcional)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <input
                type="text"
                value={compBrand}
                onChange={(e) => setCompBrand(e.target.value)}
                placeholder="Marca (ej. Toyota)"
                className="h-9 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
              <input
                type="text"
                value={compModel}
                onChange={(e) => setCompModel(e.target.value)}
                placeholder="Modelo (ej. Hilux)"
                className="h-9 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
              <input
                type="number"
                value={compYearFrom}
                onChange={(e) => setCompYearFrom(e.target.value)}
                placeholder="Año desde"
                className="h-9 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono"
              />
              <input
                type="number"
                value={compYearTo}
                onChange={(e) => setCompYearTo(e.target.value)}
                placeholder="Año hasta"
                className="h-9 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono"
              />
              <input
                type="text"
                value={compEngine}
                onChange={(e) => setCompEngine(e.target.value)}
                placeholder="Motor (ej. 2.8GD / 1.8L)"
                className="h-9 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!compBrand.trim() || !compModel.trim()) return;
                  setCompatibilities((prev) => [
                    ...prev,
                    {
                      id: `comp_${Date.now()}`,
                      brand: compBrand.trim(),
                      model: compModel.trim(),
                      yearFrom: compYearFrom ? parseInt(compYearFrom, 10) : null,
                      yearTo: compYearTo ? parseInt(compYearTo, 10) : null,
                      engine: compEngine.trim(),
                      verified: true,
                    },
                  ]);
                  setCompBrand("");
                  setCompModel("");
                  setCompYearFrom("");
                  setCompYearTo("");
                  setCompEngine("");
                }}
                className="h-9 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-900 dark:bg-white/10 text-white text-xs font-bold cursor-pointer"
              >
                + Asociar Auto
              </button>
            </div>

            {compatibilities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {compatibilities.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-xs font-semibold"
                  >
                    <span>
                      ✓ {c.brand} {c.model}{" "}
                      {c.yearFrom || c.yearTo ? `(${c.yearFrom || "..."} - ${c.yearTo || "..."})` : ""}{" "}
                      {c.engine ? `• ${c.engine}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCompatibilities((prev) => prev.filter((x) => x.id !== c.id))
                      }
                      className="text-rose-600 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Botonera Inferior */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-white/10">
            <div>
              {esEdicion && (
                <button
                  type="button"
                  disabled={eliminando}
                  onClick={handleEliminarODesactivar}
                  className="h-10 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold cursor-pointer"
                >
                  {eliminando ? "Procesando..." : "🗑️ Eliminar / Desactivar"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold cursor-pointer shadow-sm"
              >
                {guardando
                  ? "Guardando en Neon..."
                  : esEdicion
                  ? "💾 Guardar Cambios"
                  : "💾 Registrar Producto"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// 3. MODAL DE CONFIGURACIÓN MANUAL DE CATEGORÍAS, SUBCATEGORÍAS Y OPCIONES
// ============================================================================
export function ModalConfiguracionManualLubricentro({
  config,
  tabInicial = "categorias",
  onClose,
  onConfigGuardada,
}: {
  config: LubricentroConfigData;
  tabInicial?:
    | "categorias"
    | "subcategorias"
    | "aceites"
    | "marcas"
    | "otras_categorias";
  onClose: () => void;
  onConfigGuardada: (nuevaConfig: LubricentroConfigData, mensaje: string) => void;
}) {
  const [tab, setTab] = useState<
    "categorias" | "subcategorias" | "aceites" | "marcas" | "otras_categorias"
  >(tabInicial);
  const [draft, setDraft] = useState<LubricentroConfigData>(() =>
    JSON.parse(JSON.stringify(config))
  );
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensajeAlerta, setMensajeAlerta] = useState<{
    texto: string;
    tipo: "ok" | "err";
  } | null>(null);

  // Estados para nuevas entradas
  const [newCatLabel, setNewCatLabel] = useState<string>("");
  const [newCatIcon, setNewCatIcon] = useState<string>("🛢️");
  const [newCatSchema, setNewCatSchema] = useState<LubCategoryItem["schemaType"]>("aceites");

  const [selectedCatForSub, setSelectedCatForSub] = useState<string>(
    config.categories[0]?.id || "lub_aceite"
  );
  const [newSubLabel, setNewSubLabel] = useState<string>("");
  const [newSubIcon, setNewSubIcon] = useState<string>("🛢️");
  const [newSubSchema, setNewSubSchema] =
    useState<NonNullable<LubSubcategoryItem["subSchemaType"]>>("aceite_motor");

  // Sub-sección en Aceites
  const [oilSubTab, setOilSubTab] = useState<
    "bases" | "cantidades" | "presentaciones" | "viscosidades" | "especificaciones"
  >("viscosidades");
  const [newOptionLabel, setNewOptionLabel] = useState<string>("");
  const [newOptionExtra, setNewOptionExtra] = useState<string>("");

  // Nueva marca
  const [newBrandName, setNewBrandName] = useState<string>("");
  const [newBrandOrigin, setNewBrandOrigin] = useState<string>("");

  // Otras categorías
  const [otherSchemaTab, setOtherSchemaTab] = useState<
    "transmision" | "filtros" | "fluidos" | "baterias" | "aditivos" | "grasas"
  >("transmision");
  const [otherListKey, setOtherListKey] = useState<string>("fluidTypes");
  const [newOtherOptionLabel, setNewOtherOptionLabel] = useState<string>("");

  const persistirConfigEnNeon = async (
    configAGuardar: LubricentroConfigData,
    msgExito = "Configuración guardada en Neon correctamente."
  ) => {
    setGuardando(true);
    setMensajeAlerta(null);
    try {
      const res = await fetch("/api/taller/lubricentro", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configAGuardar }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al guardar configuración en Neon");
      }
      setDraft(data.config);
      setMensajeAlerta({ texto: msgExito, tipo: "ok" });
      onConfigGuardada(data.config, msgExito);
    } catch (err: any) {
      setMensajeAlerta({
        texto: err?.message || "No se pudo guardar en Neon",
        tipo: "err",
      });
    } finally {
      setGuardando(false);
    }
  };

  // Reordenar elementos
  const moverOrden = <T extends { id: string; order: number }>(
    lista: T[],
    index: number,
    direccion: -1 | 1
  ): T[] => {
    const ordenada = [...lista].sort((a, b) => a.order - b.order);
    const destino = index + direccion;
    if (destino < 0 || destino >= ordenada.length) return ordenada;
    const temp = ordenada[index];
    ordenada[index] = ordenada[destino];
    ordenada[destino] = temp;
    return ordenada.map((item, idx) => ({ ...item, order: idx + 1 }));
  };

  const handleEliminarCategoriaSegura = async (catId: string) => {
    setGuardando(true);
    setMensajeAlerta(null);
    try {
      const res = await fetch(
        `/api/taller/lubricentro?type=category&id=${encodeURIComponent(catId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMensajeAlerta({
          texto: data.error || "No se puede eliminar la categoría porque tiene dependencias.",
          tipo: "err",
        });
        return;
      }
      const next = {
        ...draft,
        categories: draft.categories.filter((c) => c.id !== catId),
      };
      setDraft(next);
      onConfigGuardada(next, data.message || "Categoría eliminada.");
      setMensajeAlerta({ texto: data.message || "Categoría eliminada.", tipo: "ok" });
    } catch (err: any) {
      setMensajeAlerta({ texto: err?.message || "Error al eliminar", tipo: "err" });
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarSubcategoriaSegura = async (subId: string) => {
    setGuardando(true);
    setMensajeAlerta(null);
    try {
      const res = await fetch(
        `/api/taller/lubricentro?type=subcategory&id=${encodeURIComponent(subId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setMensajeAlerta({
          texto: data.error || "No se puede eliminar la subcategoría porque tiene productos asociados.",
          tipo: "err",
        });
        return;
      }
      const next = {
        ...draft,
        subcategories: draft.subcategories.filter((s) => s.id !== subId),
      };
      setDraft(next);
      onConfigGuardada(next, data.message || "Subcategoría eliminada.");
      setMensajeAlerta({ texto: data.message || "Subcategoría eliminada.", tipo: "ok" });
    } catch (err: any) {
      setMensajeAlerta({ texto: err?.message || "Error al eliminar", tipo: "err" });
    } finally {
      setGuardando(false);
    }
  };

  // Obtener lista activa en pestaña Aceites
  const getOilList = (): LubOptionItem[] => {
    switch (oilSubTab) {
      case "bases":
        return draft.oilConfig.bases;
      case "cantidades":
        return draft.oilConfig.quantities;
      case "presentaciones":
        return draft.oilConfig.presentations;
      case "viscosidades":
        return draft.oilConfig.viscosities;
      case "especificaciones":
        return draft.oilConfig.specifications;
    }
  };

  const setOilList = (nuevaLista: LubOptionItem[]) => {
    const next = { ...draft, oilConfig: { ...draft.oilConfig } };
    if (oilSubTab === "bases") next.oilConfig.bases = nuevaLista;
    if (oilSubTab === "cantidades") next.oilConfig.quantities = nuevaLista;
    if (oilSubTab === "presentaciones") next.oilConfig.presentations = nuevaLista;
    if (oilSubTab === "viscosidades") next.oilConfig.viscosities = nuevaLista;
    if (oilSubTab === "especificaciones") next.oilConfig.specifications = nuevaLista;
    setDraft(next);
  };

  // Listas de otras categorías
  const OTHER_OPTIONS_MAP: Record<
    string,
    { label: string; keys: { key: string; label: string }[] }
  > = {
    transmision: {
      label: "⚙️ Transmisión",
      keys: [
        { key: "fluidTypes", label: "Tipos de Fluido (ATF, CVT, DCT, MTF...)" },
        { key: "specifications", label: "Especificaciones de Transmisión" },
        { key: "viscosities", label: "Viscosidades de Transmisión (75W-90, 80W-90...)" },
        { key: "presentations", label: "Presentaciones" },
      ],
    },
    filtros: {
      label: "🌪️ Filtros",
      keys: [
        { key: "filterTypes", label: "Tipos de Filtro" },
        { key: "applications", label: "Aplicaciones frecuentes" },
      ],
    },
    fluidos: {
      label: "🌡️ Fluidos",
      keys: [
        { key: "fluidClasses", label: "Clases de Fluido (Refrigerante, DOT 4...)" },
        { key: "specifications", label: "Especificaciones de Fluidos" },
        { key: "presentations", label: "Presentaciones" },
      ],
    },
    baterias: {
      label: "🔋 Baterías",
      keys: [
        { key: "voltages", label: "Voltajes (12V, 24V...)" },
        { key: "capacities", label: "Capacidades (Ah / CCA)" },
        { key: "technologies", label: "Tecnologías (Convencional, AGM, EFB...)" },
        { key: "dimensionGroups", label: "Dimensiones / Grupos BCI" },
        { key: "polarities", label: "Polaridades" },
      ],
    },
    aditivos: {
      label: "🧪 Aditivos y Flush",
      keys: [
        { key: "productTypes", label: "Tipos de Producto" },
        { key: "applications", label: "Aplicaciones" },
        { key: "presentations", label: "Presentaciones" },
      ],
    },
    grasas: {
      label: "🧴 Grasas Lubricantes",
      keys: [
        { key: "greaseTypes", label: "Tipos de Grasa" },
        { key: "specifications", label: "Especificaciones (NLGI...)" },
        { key: "applications", label: "Aplicaciones" },
        { key: "presentations", label: "Presentaciones" },
      ],
    },
  };

  const getOtherOptionList = (): LubOptionItem[] => {
    const sectionKey =
      otherSchemaTab === "transmision"
        ? "transmissionConfig"
        : otherSchemaTab === "filtros"
        ? "filtersConfig"
        : otherSchemaTab === "fluidos"
        ? "fluidsConfig"
        : otherSchemaTab === "baterias"
        ? "batteriesConfig"
        : otherSchemaTab === "aditivos"
        ? "additivesConfig"
        : "greasesConfig";
    return ((draft as any)[sectionKey]?.[otherListKey] || []) as LubOptionItem[];
  };

  const setOtherOptionList = (nuevaLista: LubOptionItem[]) => {
    const sectionKey =
      otherSchemaTab === "transmision"
        ? "transmissionConfig"
        : otherSchemaTab === "filtros"
        ? "filtersConfig"
        : otherSchemaTab === "fluidos"
        ? "fluidsConfig"
        : otherSchemaTab === "baterias"
        ? "batteriesConfig"
        : otherSchemaTab === "aditivos"
        ? "additivesConfig"
        : "greasesConfig";
    setDraft({
      ...draft,
      [sectionKey]: {
        ...(draft as any)[sectionKey],
        [otherListKey]: nuevaLista,
      },
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#111113] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-5"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>⚙️</span>
            <span>Administración</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Pestañas de Configuración */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "categorias", label: "1. Categorías Principales" },
            { id: "subcategorias", label: "2. Subcategorías" },
            { id: "aceites", label: "3. Opciones de Aceites" },
            { id: "otras_categorias", label: "4. Opciones Otras Categorías" },
            { id: "marcas", label: "5. Marcas del Catálogo" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`h-9 px-3.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                tab === t.id
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mensajeAlerta && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold ${
              mensajeAlerta.tipo === "ok"
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
            }`}
          >
            {mensajeAlerta.tipo === "ok" ? "✓ " : "⚠️ "}
            {mensajeAlerta.texto}
          </div>
        )}

        {/* TAB 1: CATEGORÍAS PRINCIPALES */}
        {tab === "categorias" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 flex flex-wrap items-end gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Icono</label>
                <input
                  type="text"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-16 h-9 px-2 text-center rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Nombre de Categoría Principal
                </label>
                <input
                  type="text"
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  placeholder="Ej. Refrigeración / Químicos..."
                  className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Plantilla de Filtros
                </label>
                <select
                  value={newCatSchema}
                  onChange={(e) => setNewCatSchema(e.target.value as any)}
                  className="h-9 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                >
                  <option value="aceites">Aceites / Lubricantes</option>
                  <option value="transmision">Transmisión</option>
                  <option value="filtros">Filtros</option>
                  <option value="fluidos">Fluidos</option>
                  <option value="baterias">Baterías</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newCatLabel.trim()) return;
                  const nueva: LubCategoryItem = {
                    id: `lub_cat_${Date.now()}`,
                    label: newCatLabel.trim(),
                    icon: newCatIcon.trim() || "🛢️",
                    order: draft.categories.length + 1,
                    active: true,
                    schemaType: newCatSchema,
                  };
                  setDraft({ ...draft, categories: [...draft.categories, nueva] });
                  setNewCatLabel("");
                }}
                className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                + Agregar Categoría
              </button>
            </div>

            <div className="space-y-2">
              {[...draft.categories]
                .sort((a, b) => a.order - b.order)
                .map((cat, idx, arr) => (
                  <div
                    key={cat.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-[220px]">
                      <span className="text-xs font-mono text-zinc-400 w-5">#{idx + 1}</span>
                      <input
                        type="text"
                        value={cat.icon}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            categories: draft.categories.map((c) =>
                              c.id === cat.id ? { ...c, icon: e.target.value } : c
                            ),
                          })
                        }
                        className="w-11 h-8 text-center rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-sm"
                      />
                      <input
                        type="text"
                        value={cat.label}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            categories: draft.categories.map((c) =>
                              c.id === cat.id ? { ...c, label: e.target.value } : c
                            ),
                          })
                        }
                        className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-xs font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            categories: moverOrden(arr, idx, -1),
                          })
                        }
                        className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-white/10 text-xs font-bold disabled:opacity-30 cursor-pointer"
                        title="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            categories: moverOrden(arr, idx, 1),
                          })
                        }
                        className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-white/10 text-xs font-bold disabled:opacity-30 cursor-pointer"
                        title="Bajar"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            categories: draft.categories.map((c) =>
                              c.id === cat.id ? { ...c, active: !c.active } : c
                            ),
                          })
                        }
                        className={`px-2.5 h-8 rounded-lg text-xs font-bold border cursor-pointer ${
                          cat.active
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "bg-zinc-100 border-zinc-300 text-zinc-500"
                        }`}
                      >
                        {cat.active ? "Activa" : "Inactiva"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarCategoriaSegura(cat.id)}
                        className="px-2.5 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold cursor-pointer"
                        title="Eliminar si no tiene dependencias"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 2: SUBCATEGORÍAS */}
        {tab === "subcategorias" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-zinc-600">Categoría Padre:</span>
              {draft.categories
                .sort((a, b) => a.order - b.order)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCatForSub(c.id)}
                    className={`h-8 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                      selectedCatForSub === c.id
                        ? "bg-amber-500 text-white border-amber-600"
                        : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10"
                    }`}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 flex flex-wrap items-end gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">Icono</label>
                <input
                  type="text"
                  value={newSubIcon}
                  onChange={(e) => setNewSubIcon(e.target.value)}
                  className="w-14 h-9 text-center rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-sm"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Nueva Subcategoría
                </label>
                <input
                  type="text"
                  value={newSubLabel}
                  onChange={(e) => setNewSubLabel(e.target.value)}
                  placeholder="Nombre de subcategoría..."
                  className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Tipo de Campos
                </label>
                <select
                  value={newSubSchema}
                  onChange={(e) => setNewSubSchema(e.target.value as any)}
                  className="h-9 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                >
                  <option value="aceite_motor">Aceite de Motor (Base, Galones, Viscosidad)</option>
                  <option value="aditivos">Aditivos</option>
                  <option value="flush">Flush / Limpiadores</option>
                  <option value="grasas">Grasas Lubricantes</option>
                  <option value="transmision">Transmisión</option>
                  <option value="filtros">Filtros</option>
                  <option value="fluidos">Fluidos</option>
                  <option value="baterias">Baterías</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newSubLabel.trim()) return;
                  const subsCat = draft.subcategories.filter(
                    (s) => s.categoryId === selectedCatForSub
                  );
                  const nueva: LubSubcategoryItem = {
                    id: `lub_sub_${Date.now()}`,
                    categoryId: selectedCatForSub,
                    label: newSubLabel.trim(),
                    icon: newSubIcon.trim() || "🛢️",
                    order: subsCat.length + 1,
                    active: true,
                    subSchemaType: newSubSchema,
                  };
                  setDraft({ ...draft, subcategories: [...draft.subcategories, nueva] });
                  setNewSubLabel("");
                }}
                className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                + Agregar Subcategoría
              </button>
            </div>

            <div className="space-y-2">
              {draft.subcategories
                .filter((s) => s.categoryId === selectedCatForSub)
                .sort((a, b) => a.order - b.order)
                .map((sub, idx, arr) => (
                  <div
                    key={sub.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="text-xs font-mono text-zinc-400 w-5">#{idx + 1}</span>
                      <input
                        type="text"
                        value={sub.icon}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            subcategories: draft.subcategories.map((s) =>
                              s.id === sub.id ? { ...s, icon: e.target.value } : s
                            ),
                          })
                        }
                        className="w-11 h-8 text-center rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-sm"
                      />
                      <input
                        type="text"
                        value={sub.label}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            subcategories: draft.subcategories.map((s) =>
                              s.id === sub.id ? { ...s, label: e.target.value } : s
                            ),
                          })
                        }
                        className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-xs font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          const reordered = moverOrden(arr, idx, -1);
                          const others = draft.subcategories.filter(
                            (s) => s.categoryId !== selectedCatForSub
                          );
                          setDraft({ ...draft, subcategories: [...others, ...reordered] });
                        }}
                        className="w-8 h-8 rounded-lg border border-zinc-200 text-xs font-bold disabled:opacity-30 cursor-pointer"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() => {
                          const reordered = moverOrden(arr, idx, 1);
                          const others = draft.subcategories.filter(
                            (s) => s.categoryId !== selectedCatForSub
                          );
                          setDraft({ ...draft, subcategories: [...others, ...reordered] });
                        }}
                        className="w-8 h-8 rounded-lg border border-zinc-200 text-xs font-bold disabled:opacity-30 cursor-pointer"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            subcategories: draft.subcategories.map((s) =>
                              s.id === sub.id ? { ...s, active: !s.active } : s
                            ),
                          })
                        }
                        className={`px-2.5 h-8 rounded-lg text-xs font-bold border cursor-pointer ${
                          sub.active
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "bg-zinc-100 border-zinc-300 text-zinc-500"
                        }`}
                      >
                        {sub.active ? "Activa" : "Inactiva"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarSubcategoriaSegura(sub.id)}
                        className="px-2.5 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: OPCIONES MANUALES DE ACEITES */}
        {tab === "aceites" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "viscosidades", label: "Viscosidades (0W-20, 10W-30...)" },
                { id: "bases", label: "Bases del Lubricante" },
                { id: "cantidades", label: "Cantidades Requeridas (Galones)" },
                { id: "presentaciones", label: "Presentaciones Comerciales (1L, 1 Gal...)" },
                { id: "especificaciones", label: "Especificaciones (API, ACEA, OEM)" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setOilSubTab(st.id as any)}
                  className={`h-8 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                    oilSubTab === st.id
                      ? "bg-zinc-900 text-white dark:bg-amber-500 dark:text-black border-zinc-900"
                      : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 flex flex-wrap items-end gap-2.5">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                  Nueva opción para {oilSubTab}
                </label>
                <input
                  type="text"
                  value={newOptionLabel}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  placeholder={
                    oilSubTab === "viscosidades"
                      ? "Ej. 0W-16 o 5W-50"
                      : oilSubTab === "cantidades"
                      ? "Ej. 6 galones"
                      : oilSubTab === "presentaciones"
                      ? "Ej. Balde 2.5 Galones"
                      : "Nombre de la opción..."
                  }
                  className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                />
              </div>
              {oilSubTab === "cantidades" && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                    Equivalente numérico
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newOptionExtra}
                    onChange={(e) => setNewOptionExtra(e.target.value)}
                    placeholder="Ej. 6"
                    className="w-28 h-9 px-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!newOptionLabel.trim()) return;
                  const actual = getOilList();
                  const nuevo: LubOptionItem = {
                    id: `${oilSubTab}_${Date.now()}`,
                    label: newOptionLabel.trim(),
                    value: newOptionLabel.trim(),
                    numericQty:
                      oilSubTab === "cantidades"
                        ? parseFloat(newOptionExtra) || actual.length + 1
                        : 1,
                    order: actual.length + 1,
                    active: true,
                  };
                  setOilList([...actual, nuevo]);
                  setNewOptionLabel("");
                  setNewOptionExtra("");
                }}
                className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
              >
                + Agregar Opción
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {[...getOilList()]
                .sort((a, b) => a.order - b.order)
                .map((item, idx, arr) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-mono text-zinc-400 w-5">#{idx + 1}</span>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) =>
                          setOilList(
                            arr.map((x) =>
                              x.id === item.id
                                ? { ...x, label: e.target.value, value: e.target.value }
                                : x
                            )
                          )
                        }
                        className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-xs font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => setOilList(moverOrden(arr, idx, -1))}
                        className="w-7 h-7 rounded-lg border border-zinc-200 text-xs font-bold disabled:opacity-30 cursor-pointer"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === arr.length - 1}
                        onClick={() => setOilList(moverOrden(arr, idx, 1))}
                        className="w-7 h-7 rounded-lg border border-zinc-200 text-xs font-bold disabled:opacity-30 cursor-pointer"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setOilList(
                            arr.map((x) =>
                              x.id === item.id ? { ...x, active: !x.active } : x
                            )
                          )
                        }
                        className={`px-2.5 h-7 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          item.active
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "bg-zinc-100 border-zinc-300 text-zinc-500"
                        }`}
                      >
                        {item.active ? "Activa" : "Inactiva"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOilList(arr.filter((x) => x.id !== item.id))}
                        className="px-2 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 4: OPCIONES PARA LAS DEMÁS CATEGORÍAS */}
        {tab === "otras_categorias" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(OTHER_OPTIONS_MAP).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setOtherSchemaTab(k as any);
                    setOtherListKey(v.keys[0].key);
                  }}
                  className={`h-8 px-3 rounded-xl border text-xs font-bold cursor-pointer ${
                    otherSchemaTab === k
                      ? "bg-amber-500 text-white border-amber-600"
                      : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {OTHER_OPTIONS_MAP[otherSchemaTab].keys.map((kObj) => (
                <button
                  key={kObj.key}
                  type="button"
                  onClick={() => setOtherListKey(kObj.key)}
                  className={`h-8 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                    otherListKey === kObj.key
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                      : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  {kObj.label}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 flex gap-2">
              <input
                type="text"
                value={newOtherOptionLabel}
                onChange={(e) => setNewOtherOptionLabel(e.target.value)}
                placeholder="Agregar nueva opción..."
                className="flex-1 h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newOtherOptionLabel.trim()) return;
                  const curr = getOtherOptionList();
                  setOtherOptionList([
                    ...curr,
                    {
                      id: `opt_${Date.now()}`,
                      label: newOtherOptionLabel.trim(),
                      value: newOtherOptionLabel.trim(),
                      order: curr.length + 1,
                      active: true,
                    },
                  ]);
                  setNewOtherOptionLabel("");
                }}
                className="h-9 px-4 rounded-xl bg-amber-500 text-white text-xs font-bold cursor-pointer"
              >
                + Añadir
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {[...getOtherOptionList()]
                .sort((a, b) => a.order - b.order)
                .map((opt, idx, arr) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10"
                  >
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) =>
                        setOtherOptionList(
                          arr.map((x) =>
                            x.id === opt.id ? { ...x, label: e.target.value } : x
                          )
                        )
                      }
                      className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-xs font-bold"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setOtherOptionList(
                            arr.map((x) =>
                              x.id === opt.id ? { ...x, active: !x.active } : x
                            )
                          )
                        }
                        className={`px-2.5 h-7 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          opt.active
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "bg-zinc-100 border-zinc-300 text-zinc-500"
                        }`}
                      >
                        {opt.active ? "Activa" : "Inactiva"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setOtherOptionList(arr.filter((x) => x.id !== opt.id))
                        }
                        className="px-2 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 5: MARCAS */}
        {tab === "marcas" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 flex flex-wrap gap-2">
              <input
                type="text"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Nombre de la marca (ej. Castrol, Mobil, Liqui Moly, Bosch)..."
                className="flex-1 min-w-[200px] h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
              <input
                type="text"
                value={newBrandOrigin}
                onChange={(e) => setNewBrandOrigin(e.target.value)}
                placeholder="Origen / Nota (ej. Alemania, EE.UU.)"
                className="w-44 h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newBrandName.trim()) return;
                  const nb: LubBrandItem = {
                    id: `br_${Date.now()}`,
                    name: newBrandName.trim(),
                    origin: newBrandOrigin.trim(),
                    active: true,
                    order: draft.brands.length + 1,
                  };
                  setDraft({ ...draft, brands: [...draft.brands, nb] });
                  setNewBrandName("");
                  setNewBrandOrigin("");
                }}
                className="h-9 px-4 rounded-xl bg-amber-500 text-white text-xs font-bold cursor-pointer"
              >
                + Agregar Marca
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {[...draft.brands]
                .sort((a, b) => a.order - b.order)
                .map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10"
                  >
                    <input
                      type="text"
                      value={b.name}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          brands: draft.brands.map((x) =>
                            x.id === b.id ? { ...x, name: e.target.value } : x
                          ),
                        })
                      }
                      className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          brands: draft.brands.map((x) =>
                            x.id === b.id ? { ...x, active: !x.active } : x
                          ),
                        })
                      }
                      className={`px-2.5 h-7 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        b.active
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "bg-zinc-100 border-zinc-300 text-zinc-500"
                      }`}
                    >
                      {b.active ? "Activa" : "Inactiva"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          brands: draft.brands.filter((x) => x.id !== b.id),
                        })
                      }
                      className="px-2 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Pie de Guardado */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-200 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 text-xs font-bold cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={() => persistirConfigEnNeon(draft)}
            className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold cursor-pointer shadow-sm"
          >
            {guardando ? "Guardando en Neon..." : "💾 Guardar Configuración en Neon"}
          </button>
        </div>
      </div>
    </div>
  );
}
