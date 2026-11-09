"use client";

import React, { useState, useRef } from "react";
import type {
  CarWashConfigData,
  CarWashCategory,
  CarWashSubcategory,
  CarWashVehicleType,
  CarWashPackage,
  CarWashAddon,
  AvailabilityStatus,
} from "@/app/api/taller/carwash/route";

export interface CarWashEnrichedService {
  id: string;
  code: string;
  name: string;
  category: string;
  basePrice: number | null;
  price: number | null;
  promoPrice: number | null;
  priceConfigured: boolean;
  estimatedMinutes: number;
  requiresBay: boolean;
  active: boolean;
  archived?: boolean;
  categoryId: string;
  subcategoryId: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  galleryUrls: string[];
  priceByVehicleType: Record<string, number>;
  durationByVehicleType: Record<string, number>;
  applicableVehicleTypes: string[];
  includesList: string[];
  excludesList: string[];
  materialsIncluded: string[];
  associatedAddonIds: string[];
  conditionsText: string;
  availability: AvailabilityStatus;
  order: number;
}

const AVAILABILITY_OPTIONS: AvailabilityStatus[] = [
  "Disponible",
  "Alta demanda",
  "Sujeto a cupo",
  "No disponible",
];

const FALLBACK_CARWASH_IMG =
  "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=900&q=80";

async function uploadImageToR2CarWash(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "carwash");
  const res = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error || "Error al subir imagen a Cloudflare R2");
  }
  return data.url as string;
}

// ============================================================================
// 1. MODAL DE DETALLE VISUAL DE SERVICIO O PAQUETE (SECCIÓN 7 DEL PROMPT)
// ============================================================================
export function ModalDetalleServicioCarWash({
  item,
  kind,
  config,
  selectedVehicleTypeId,
  isSelected,
  selectedAddonIds,
  onToggleSelect,
  onToggleAddon,
  onEditItem,
  onClose,
}: {
  item: CarWashEnrichedService | CarWashPackage | null;
  kind: "SERVICE" | "PACKAGE";
  config: CarWashConfigData;
  selectedVehicleTypeId: string;
  isSelected: boolean;
  selectedAddonIds: string[];
  onToggleSelect: () => void;
  onToggleAddon: (addonId: string) => void;
  onEditItem?: () => void;
  onClose: () => void;
}) {
  if (!item) return null;

  const isPkg = kind === "PACKAGE";
  const pkgItem = isPkg ? (item as CarWashPackage) : null;
  const srvItem = !isPkg ? (item as CarWashEnrichedService) : null;

  const currentVt = config.vehicleTypes.find((v) => v.id === selectedVehicleTypeId);
  const priceByVt = item.priceByVehicleType?.[selectedVehicleTypeId];
  const basePrice = item.basePrice;
  const effectivePrice =
    typeof priceByVt === "number" && priceByVt > 0
      ? priceByVt
      : item.promoPrice && item.promoPrice > 0
      ? item.promoPrice
      : basePrice;

  const includes = isPkg ? pkgItem?.includedProcedures || [] : srvItem?.includesList || [];
  const excludes = isPkg ? pkgItem?.excludedProcedures || [] : srvItem?.excludesList || [];
  const materials = item.materialsIncluded || [];
  const includedAddonIds = isPkg ? pkgItem?.includedAddonIds || [] : [];

  const applicableAddons = config.addons.filter((a) => a.active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl my-auto animate-fade-in">
        {/* Cabecera con fotografía R2 */}
        <div className="relative h-56 sm:h-64 w-full bg-zinc-900 overflow-hidden">
          <img
            src={item.imageUrl || FALLBACK_CARWASH_IMG}
            alt={item.name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_CARWASH_IMG;
            }}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          <div className="absolute top-3 right-3 flex items-center gap-2">
            {onEditItem && (
              <button
                type="button"
                onClick={onEditItem}
                className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-zinc-900 text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                ✏️ Editar en Admin
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="absolute bottom-4 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-black">
                  {isPkg ? "Paquete Comercial" : "Servicio Individual"}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    item.availability === "Disponible"
                      ? "bg-emerald-500/90 text-white"
                      : item.availability === "No disponible"
                      ? "bg-rose-500/90 text-white"
                      : "bg-amber-500/90 text-black"
                  }`}
                >
                  {item.availability}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white backdrop-blur-xs">
                  ⏱️ {item.estimatedMinutes} min aprox.
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {item.name}
              </h3>
            </div>

            <div className="bg-black/65 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2 text-right shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-zinc-300 block">
                Tarifa {currentVt ? `(${currentVt.name})` : "Vigente"}
              </span>
              {effectivePrice && effectivePrice > 0 ? (
                <div className="flex items-baseline justify-end gap-1.5">
                  {item.promoPrice && basePrice && item.promoPrice < basePrice && (
                    <span className="text-xs line-through text-zinc-400">
                      ${Number(basePrice).toFixed(2)}
                    </span>
                  )}
                  <span className="text-2xl font-black text-amber-400">
                    ${Number(effectivePrice).toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-bold text-amber-300">
                  Pendiente de configuración
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contenido detallado */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[68vh] overflow-y-auto">
          {/* Descripción completa */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
              Descripción del Servicio
            </h4>
            <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">
              {item.fullDescription || item.shortDescription || "Sin descripción adicional."}
            </p>
          </div>

          {/* Qué incluye y Qué no incluye */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25">
              <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2.5 flex items-center gap-1.5">
                <span>✓</span> Qué incluye
              </h5>
              {includes.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-zinc-800 dark:text-zinc-200">
                  {includes.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500 italic">
                  Procedimientos estándar según configuración del servicio.
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3">
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
                  <span>✕</span> Qué no incluye
                </h5>
                {excludes.length > 0 ? (
                  <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {excludes.map((exc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{exc}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-zinc-500">Sin exclusiones específicas registradas.</p>
                )}
              </div>

              {materials.length > 0 && (
                <div className="pt-2 border-t border-zinc-200 dark:border-white/10">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    🧴 Productos / Materiales Incluidos
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {materials.map((m, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-[11px] font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tarifas por Tipo de Vehículo */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
            <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2.5">
              🚗 Tipos de Vehículo Admitidos y Tarifas Configuradas
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {config.vehicleTypes
                .filter(
                  (vt) =>
                    vt.active &&
                    (!item.applicableVehicleTypes?.length ||
                      item.applicableVehicleTypes.includes(vt.id))
                )
                .map((vt) => {
                  const vtPrice =
                    item.priceByVehicleType?.[vt.id] && item.priceByVehicleType[vt.id] > 0
                      ? item.priceByVehicleType[vt.id]
                      : item.basePrice;
                  const isCurrentVt = vt.id === selectedVehicleTypeId;
                  return (
                    <div
                      key={vt.id}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                        isCurrentVt
                          ? "bg-amber-50 dark:bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-200 font-bold"
                          : "bg-white dark:bg-black/30 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <span className="truncate flex items-center gap-1">
                        <span>{vt.icon}</span>
                        <span className="truncate">{vt.name}</span>
                      </span>
                      <span className="font-mono text-sm font-black mt-1 text-amber-600 dark:text-amber-400">
                        {vtPrice && vtPrice > 0 ? `$${Number(vtPrice).toFixed(2)}` : "S/C"}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Complementos disponibles */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              ➕ Complementos / Servicios Adicionales Disponibles
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {applicableAddons.slice(0, 8).map((addon) => {
                const alreadyInPkg = includedAddonIds.includes(addon.id);
                const isAddonSel = selectedAddonIds.includes(addon.id);
                return (
                  <button
                    key={addon.id}
                    type="button"
                    disabled={alreadyInPkg}
                    onClick={() => onToggleAddon(addon.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      alreadyInPkg
                        ? "bg-emerald-50/80 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 cursor-default"
                        : isAddonSel
                        ? "bg-amber-50 dark:bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-200 font-semibold"
                        : "bg-white hover:bg-zinc-50 dark:bg-black/30 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold block truncate">{addon.name}</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        +{addon.estimatedMinutes} min
                      </span>
                    </div>
                    {alreadyInPkg ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                        ✓ Incluido ($0)
                      </span>
                    ) : (
                      <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 shrink-0">
                        {isAddonSel ? "✓ " : "+"}${Number(addon.price || 0).toFixed(2)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condiciones de contratación */}
          {item.conditionsText && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
              <strong className="font-bold">📌 Condiciones y recomendaciones: </strong>
              {item.conditionsText}
            </div>
          )}
        </div>

        {/* Pie de acciones */}
        <div className="p-4 sm:p-5 bg-zinc-50 dark:bg-black/40 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            disabled={item.availability === "No disponible" || !effectivePrice}
            onClick={() => {
              onToggleSelect();
              onClose();
            }}
            className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-all shadow-md ${
              isSelected
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-black"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSelected
              ? "✕ Quitar de mi selección"
              : `✓ Seleccionar ${isPkg ? "Paquete" : "Servicio"} (${
                  effectivePrice ? `$${Number(effectivePrice).toFixed(2)}` : "S/C"
                })`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. MODAL FORMULARIO PARA CREAR / EDITAR SERVICIO INDIVIDUAL (SECCIÓN 2 DEL PROMPT)
// ============================================================================
export function ModalServicioCarWashForm({
  initialService,
  config,
  onSave,
  onDelete,
  onClose,
  mostrarToast,
}: {
  initialService?: Partial<CarWashEnrichedService> | null;
  config: CarWashConfigData;
  onSave: (serviceData: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
}) {
  const isEditing = Boolean(initialService?.id);
  const [name, setName] = useState(initialService?.name || "");
  const [code, setCode] = useState(initialService?.code || "");
  const [categoryId, setCategoryId] = useState(
    initialService?.categoryId || config.categories[0]?.id || "cw_cat_exterior"
  );
  const [subcategoryId, setSubcategoryId] = useState(
    initialService?.subcategoryId || ""
  );
  const [shortDescription, setShortDescription] = useState(
    initialService?.shortDescription || ""
  );
  const [fullDescription, setFullDescription] = useState(
    initialService?.fullDescription || ""
  );
  const [imageUrl, setImageUrl] = useState(initialService?.imageUrl || "");
  const [basePrice, setBasePrice] = useState<string>(
    initialService?.basePrice !== null && initialService?.basePrice !== undefined
      ? String(initialService.basePrice)
      : ""
  );
  const [promoPrice, setPromoPrice] = useState<string>(
    initialService?.promoPrice !== null && initialService?.promoPrice !== undefined
      ? String(initialService.promoPrice)
      : ""
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>(
    String(initialService?.estimatedMinutes || 30)
  );
  const [priceByVehicleType, setPriceByVehicleType] = useState<Record<string, number>>(
    initialService?.priceByVehicleType || {}
  );
  const [applicableVehicleTypes, setApplicableVehicleTypes] = useState<string[]>(
    initialService?.applicableVehicleTypes?.length
      ? initialService.applicableVehicleTypes
      : config.vehicleTypes.map((v) => v.id)
  );
  const [includesText, setIncludesText] = useState(
    (initialService?.includesList || []).join("\n")
  );
  const [excludesText, setExcludesText] = useState(
    (initialService?.excludesList || []).join("\n")
  );
  const [materialsText, setMaterialsText] = useState(
    (initialService?.materialsIncluded || []).join(", ")
  );
  const [associatedAddonIds, setAssociatedAddonIds] = useState<string[]>(
    initialService?.associatedAddonIds || []
  );
  const [conditionsText, setConditionsText] = useState(
    initialService?.conditionsText || ""
  );
  const [availability, setAvailability] = useState<AvailabilityStatus>(
    initialService?.availability || "Disponible"
  );
  const [order, setOrder] = useState<string>(String(initialService?.order || 1));
  const [active, setActive] = useState<boolean>(
    initialService?.active !== undefined ? initialService.active : true
  );

  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const subcatsForCategory = config.subcategories.filter(
    (s) => s.categoryId === categoryId
  );

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImg(true);
      const url = await uploadImageToR2CarWash(file);
      setImageUrl(url);
      mostrarToast("Fotografía subida a Cloudflare R2", "ok");
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir imagen", "err");
    } finally {
      setUploadingImg(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      mostrarToast("Ingresa el nombre del servicio", "err");
      return;
    }
    try {
      setSaving(true);
      await onSave({
        id: initialService?.id,
        code: code.trim() || undefined,
        name: name.trim(),
        categoryId,
        subcategoryId: subcategoryId || subcatsForCategory[0]?.id || "",
        shortDescription: shortDescription.trim(),
        fullDescription: fullDescription.trim(),
        imageUrl: imageUrl.trim(),
        basePrice: basePrice.trim() !== "" ? Number(basePrice) : null,
        promoPrice: promoPrice.trim() !== "" ? Number(promoPrice) : null,
        estimatedMinutes: Number(estimatedMinutes) || 30,
        priceByVehicleType,
        applicableVehicleTypes,
        includesList: includesText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        excludesList: excludesText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        materialsIncluded: materialsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        associatedAddonIds,
        conditionsText: conditionsText.trim(),
        availability,
        order: Number(order) || 1,
        active,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl my-auto animate-fade-in"
      >
        <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black">
              {isEditing ? "✏️ Editar Servicio de Car Wash" : "➕ Nuevo Servicio de Car Wash"}
            </h3>
            <p className="text-xs text-zinc-400">
              Configuración persistente e imágenes almacenadas en Cloudflare R2
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-zinc-900 dark:text-white">
          {/* Datos básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Nombre del Servicio *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Lavado Exterior Snow Foam"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Código / SKU
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CW-SRV-001"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs sm:text-sm"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Disponibilidad
              </label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs sm:text-sm"
              >
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categoría, Subcategoría, Precio Base, Promo, Duración, Orden */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Categoría Principal
              </label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  const firstSub = config.subcategories.find(
                    (s) => s.categoryId === e.target.value
                  );
                  setSubcategoryId(firstSub?.id || "");
                }}
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
              >
                {config.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Subcategoría
              </label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
              >
                <option value="">General</option>
                {subcatsForCategory.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Precio Base ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="Ej. 12.00"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Precio Promo ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                placeholder="Opcional"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>
          </div>

          {/* Fotografía Cloudflare R2 + Duración + Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
            <div className="sm:col-span-6 flex items-center gap-3">
              <img
                src={imageUrl || FALLBACK_CARWASH_IMG}
                alt="Preview"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = FALLBACK_CARWASH_IMG;
                }}
                className="w-16 h-16 rounded-xl object-cover border border-zinc-300 dark:border-white/10 shrink-0"
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Fotografía del Servicio (Cloudflare R2)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploadingImg}
                    onClick={() => fileRef.current?.click()}
                    className="px-3 h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold shrink-0 cursor-pointer"
                  >
                    {uploadingImg ? "Subiendo..." : "📷 Subir R2"}
                  </button>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Duración (min)
              </label>
              <input
                type="number"
                min="5"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Orden Visual
              </label>
              <input
                type="number"
                min="1"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-end pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span>Servicio Activo</span>
              </label>
            </div>
          </div>

          {/* Tarifas diferenciadas por Tipo de Vehículo */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                🚗 Tipos de Vehículo Aplicables y Tarifas Específicas ($)
              </span>
              <span className="text-[11px] text-zinc-500">
                Si dejas el precio vacío en un vehículo, usará el Precio Base (${basePrice || "0"})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {config.vehicleTypes.map((vt) => {
                const isChecked = applicableVehicleTypes.includes(vt.id);
                return (
                  <div
                    key={vt.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      isChecked
                        ? "bg-white dark:bg-black/40 border-amber-400/60"
                        : "bg-zinc-100/60 dark:bg-white/[0.01] border-zinc-200 dark:border-white/5 opacity-60"
                    }`}
                  >
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setApplicableVehicleTypes((prev) => [...prev, vt.id]);
                          } else {
                            setApplicableVehicleTypes((prev) =>
                              prev.filter((id) => id !== vt.id)
                            );
                          }
                        }}
                        className="accent-amber-500"
                      />
                      <span>{vt.icon}</span>
                      <span className="truncate">{vt.name}</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!isChecked}
                      value={priceByVehicleType[vt.id] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPriceByVehicleType((prev) => {
                          const next = { ...prev };
                          if (val === "" || Number(val) <= 0) {
                            delete next[vt.id];
                          } else {
                            next[vt.id] = Number(val);
                          }
                          return next;
                        });
                      }}
                      placeholder={basePrice || "Base"}
                      className="w-20 h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-zinc-50 dark:bg-black/50 font-mono text-xs text-right"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Descripciones y Listas de Qué Incluye / Qué No Incluye */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Descripción Corta (Tarjeta)
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Resumen breve para la tarjeta del catálogo"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Productos / Materiales Incluidos (separados por coma)
              </label>
              <input
                type="text"
                value={materialsText}
                onChange={(e) => setMaterialsText(e.target.value)}
                placeholder="Shampoo pH Neutro, Cera Carnauba, Microfibra..."
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
              Descripción Completa
            </label>
            <textarea
              rows={2}
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              placeholder="Explicación detallada del procedimiento..."
              className="w-full p-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                ✓ Qué incluye (un punto por línea)
              </label>
              <textarea
                rows={3}
                value={includesText}
                onChange={(e) => setIncludesText(e.target.value)}
                placeholder={"Lavado exterior pH neutro\nEnjuague a presión\nSecado con microfibra"}
                className="w-full p-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-rose-700 dark:text-rose-400 block mb-1">
                ✕ Qué no incluye (un punto por línea)
              </label>
              <textarea
                rows={3}
                value={excludesText}
                onChange={(e) => setExcludesText(e.target.value)}
                placeholder={"Desmontaje de asientos\nPulido correctivo"}
                className="w-full p-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
          </div>

          {/* Condiciones */}
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
              Condiciones o Recomendaciones del Servicio
            </label>
            <input
              type="text"
              value={conditionsText}
              onChange={(e) => setConditionsText(e.target.value)}
              placeholder="Ej. Retirar objetos de valor antes de entregar el vehículo."
              className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-black/40 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between gap-3">
          {isEditing && onDelete && initialService?.id ? (
            <button
              type="button"
              onClick={() => onDelete(initialService.id!)}
              className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold cursor-pointer"
            >
              🗑️ Eliminar / Archivar
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs sm:text-sm font-black shadow-md cursor-pointer"
            >
              {saving ? "Guardando..." : "💾 Guardar Servicio"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 3. PANEL DE ADMINISTRACIÓN MANUAL INTEGRAL CAR WASH (SECCIONES 2, 3, 4, 5, 8 y 9)
// ============================================================================
export function ModalConfiguracionCarWash({
  config,
  onSaveConfig,
  onClose,
  mostrarToast,
}: {
  config: CarWashConfigData;
  onSaveConfig: (updated: CarWashConfigData) => Promise<void>;
  onClose: () => void;
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
}) {
  const [tab, setTab] = useState<
    "categorias" | "vehiculos" | "paquetes" | "adicionales" | "reglas"
  >("categorias");

  const [draft, setDraft] = useState<CarWashConfigData>(() =>
    JSON.parse(JSON.stringify(config))
  );
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Estado para edición rápida de un paquete
  const [editingPkgId, setEditingPkgId] = useState<string | null>(
    draft.packages[0]?.id || null
  );

  const handleUploadImageForEntity = async (
    file: File,
    key: string,
    onUrl: (url: string) => void
  ) => {
    try {
      setUploadingKey(key);
      const url = await uploadImageToR2CarWash(file);
      onUrl(url);
      mostrarToast("Imagen actualizada en Cloudflare R2", "ok");
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir imagen", "err");
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await onSaveConfig(draft);
      mostrarToast("Configuración de Car Wash guardada correctamente", "ok");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const activeEditingPkg = draft.packages.find((p) => p.id === editingPkgId) || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl max-w-6xl w-full overflow-hidden shadow-2xl my-auto animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
              <span>⚙️</span> Administración Manual de Car Wash & Detailing
            </h3>
            <p className="text-xs text-zinc-400">
              Gestiona las 12 categorías principales, tipos de vehículos, paquetes, complementos, tarifas e imágenes R2
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer self-end sm:self-auto"
          >
            ✕
          </button>
        </div>

        {/* Pestañas */}
        <div className="px-6 pt-3 bg-zinc-100 dark:bg-black/40 border-b border-zinc-200 dark:border-white/10 flex flex-wrap gap-1.5">
          {[
            { id: "categorias", label: "1. Categorías Principales (12)", icon: "🗂️" },
            { id: "vehiculos", label: "2. Tipos de Vehículos", icon: "🚗" },
            { id: "paquetes", label: "3. Paquetes de Lavado", icon: "💎" },
            { id: "adicionales", label: "4. Servicios Adicionales", icon: "➕" },
            { id: "reglas", label: "5. Impuestos y Bahías", icon: "🏛️" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                tab === t.id
                  ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 border-t border-x border-zinc-200 dark:border-white/10"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Cuerpo de configuración */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-4 text-zinc-900 dark:text-white">
          {/* TAB 1: CATEGORÍAS PRINCIPALES */}
          {tab === "categorias" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Configura las tarjetas principales: fotografía R2, precio inicial, duración estimada, disponibilidad y orden.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const newCat: CarWashCategory = {
                      id: `cw_cat_${Date.now()}`,
                      name: "Nueva Categoría de Lavado",
                      slug: `cat-${Date.now()}`,
                      icon: "🚿",
                      shortDescription: "Descripción de la nueva categoría.",
                      imageUrl: FALLBACK_CARWASH_IMG,
                      startingPrice: 10,
                      estimatedMinutes: 30,
                      availability: "Disponible",
                      active: true,
                      order: draft.categories.length + 1,
                    };
                    setDraft((prev) => ({
                      ...prev,
                      categories: [...prev.categories, newCat],
                    }));
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold cursor-pointer shrink-0"
                >
                  + Agregar Categoría
                </button>
              </div>

              <div className="space-y-2.5">
                {draft.categories
                  .sort((a, b) => a.order - b.order)
                  .map((cat, idx) => (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
                    >
                      <div className="lg:col-span-4 flex items-center gap-2.5">
                        <img
                          src={cat.imageUrl || FALLBACK_CARWASH_IMG}
                          alt={cat.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-300 dark:border-white/10"
                        />
                        <input
                          type="text"
                          value={cat.icon}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              categories: prev.categories.map((c) =>
                                c.id === cat.id ? { ...c, icon: val } : c
                              ),
                            }));
                          }}
                          className="w-10 h-9 text-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-sm"
                        />
                        <input
                          type="text"
                          value={cat.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              categories: prev.categories.map((c) =>
                                c.id === cat.id ? { ...c, name: val } : c
                              ),
                            }));
                          }}
                          className="flex-1 h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-bold"
                        />
                      </div>

                      <div className="lg:col-span-3">
                        <input
                          type="text"
                          value={cat.shortDescription}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              categories: prev.categories.map((c) =>
                                c.id === cat.id ? { ...c, shortDescription: val } : c
                              ),
                            }));
                          }}
                          placeholder="Descripción corta"
                          className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                        />
                      </div>

                      <div className="lg:col-span-2 flex items-center gap-1.5">
                        <div className="flex-1">
                          <span className="text-[10px] text-zinc-500 block">Desde ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={cat.startingPrice ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraft((prev) => ({
                                ...prev,
                                categories: prev.categories.map((c) =>
                                  c.id === cat.id
                                    ? { ...c, startingPrice: val === "" ? null : Number(val) }
                                    : c
                                ),
                              }));
                            }}
                            className="w-full h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] text-zinc-500 block">Minutos</span>
                          <input
                            type="number"
                            value={cat.estimatedMinutes ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraft((prev) => ({
                                ...prev,
                                categories: prev.categories.map((c) =>
                                  c.id === cat.id
                                    ? { ...c, estimatedMinutes: val === "" ? null : Number(val) }
                                    : c
                                ),
                              }));
                            }}
                            className="w-full h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-3 flex items-center justify-end gap-1.5">
                        <label className="px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-white/10 hover:bg-zinc-300 text-[11px] font-semibold cursor-pointer">
                          {uploadingKey === cat.id ? "..." : "📷 Foto R2"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                void handleUploadImageForEntity(f, cat.id, (url) => {
                                  setDraft((prev) => ({
                                    ...prev,
                                    categories: prev.categories.map((c) =>
                                      c.id === cat.id ? { ...c, imageUrl: url } : c
                                    ),
                                  }));
                                });
                              }
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            if (idx === 0) return;
                            const list = [...draft.categories].sort((a, b) => a.order - b.order);
                            const temp = list[idx - 1].order;
                            list[idx - 1].order = list[idx].order;
                            list[idx].order = temp;
                            setDraft((prev) => ({ ...prev, categories: [...list] }));
                          }}
                          className="w-7 h-7 rounded-lg border border-zinc-300 dark:border-white/10 text-xs cursor-pointer"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...draft.categories].sort((a, b) => a.order - b.order);
                            if (idx >= list.length - 1) return;
                            const temp = list[idx + 1].order;
                            list[idx + 1].order = list[idx].order;
                            list[idx].order = temp;
                            setDraft((prev) => ({ ...prev, categories: [...list] }));
                          }}
                          className="w-7 h-7 rounded-lg border border-zinc-300 dark:border-white/10 text-xs cursor-pointer"
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDraft((prev) => ({
                              ...prev,
                              categories: prev.categories.map((c) =>
                                c.id === cat.id ? { ...c, active: !c.active } : c
                              ),
                            }));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            cat.active
                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              : "bg-zinc-300 dark:bg-white/10 text-zinc-600"
                          }`}
                        >
                          {cat.active ? "Activa" : "Inactiva"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 2: TIPOS DE VEHÍCULOS */}
          {tab === "vehiculos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Administra los tipos y tamaños de vehículos para el cálculo de tarifas diferenciadas.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const newVt: CarWashVehicleType = {
                      id: `vt_${Date.now()}`,
                      name: "Nuevo Tipo de Vehículo",
                      code: `VT_${draft.vehicleTypes.length + 1}`,
                      icon: "🚗",
                      description: "Descripción del tamaño o categoría vehicular",
                      active: true,
                      order: draft.vehicleTypes.length + 1,
                    };
                    setDraft((prev) => ({
                      ...prev,
                      vehicleTypes: [...prev.vehicleTypes, newVt],
                    }));
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold cursor-pointer"
                >
                  + Agregar Tipo de Vehículo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {draft.vehicleTypes
                  .sort((a, b) => a.order - b.order)
                  .map((vt) => (
                    <div
                      key={vt.id}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 flex items-center justify-between gap-2.5"
                    >
                      <input
                        type="text"
                        value={vt.icon}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => ({
                            ...prev,
                            vehicleTypes: prev.vehicleTypes.map((v) =>
                              v.id === vt.id ? { ...v, icon: val } : v
                            ),
                          }));
                        }}
                        className="w-10 h-9 text-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-base"
                      />
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={vt.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              vehicleTypes: prev.vehicleTypes.map((v) =>
                                v.id === vt.id ? { ...v, name: val } : v
                              ),
                            }));
                          }}
                          className="w-full h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-bold"
                        />
                        <input
                          type="text"
                          value={vt.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              vehicleTypes: prev.vehicleTypes.map((v) =>
                                v.id === vt.id ? { ...v, description: val } : v
                              ),
                            }));
                          }}
                          className="w-full h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-black/20 text-[11px] text-zinc-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((prev) => ({
                            ...prev,
                            vehicleTypes: prev.vehicleTypes.map((v) =>
                              v.id === vt.id ? { ...v, active: !v.active } : v
                            ),
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                          vt.active
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-300 dark:bg-white/10 text-zinc-500"
                        }`}
                      >
                        {vt.active ? "Activo" : "Inactivo"}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 3: PAQUETES DE LAVADO CONFIGURABLES */}
          {tab === "paquetes" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const newPkg: CarWashPackage = {
                      id: `pkg_${Date.now()}`,
                      code: `PKG-CW-${draft.packages.length + 1}`,
                      name: "Nuevo Paquete de Lavado",
                      categoryId: draft.categories[0]?.id || "cw_cat_completo",
                      shortDescription: "Descripción corta del paquete comercial.",
                      fullDescription: "Descripción detallada del paquete comercial.",
                      imageUrl: FALLBACK_CARWASH_IMG,
                      basePrice: 15,
                      promoPrice: null,
                      priceByVehicleType: {},
                      estimatedMinutes: 45,
                      applicableVehicleTypes: draft.vehicleTypes.map((v) => v.id),
                      includedProcedures: ["Lavado exterior", "Secado con microfibra"],
                      excludedProcedures: [],
                      includedAddonIds: [],
                      materialsIncluded: ["Shampoo pH Neutro"],
                      conditionsText: "",
                      availability: "Disponible",
                      badgeText: "Nuevo",
                      active: true,
                      order: draft.packages.length + 1,
                    };
                    setDraft((prev) => ({
                      ...prev,
                      packages: [...prev.packages, newPkg],
                    }));
                    setEditingPkgId(newPkg.id);
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black cursor-pointer"
                >
                  + Crear Nuevo Paquete Comercial
                </button>

                <div className="space-y-1.5">
                  {draft.packages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setEditingPkgId(p.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-2 cursor-pointer ${
                        editingPkgId === p.id
                          ? "bg-amber-50 dark:bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-200 font-bold"
                          : "bg-zinc-50 dark:bg-white/[0.03] border-zinc-200 dark:border-white/10"
                      }`}
                    >
                      <div className="truncate">
                        <span className="text-xs font-bold block truncate">{p.name}</span>
                        <span className="text-[10px] text-zinc-500">
                          Base: ${p.basePrice ?? 0} • {p.estimatedMinutes} min
                        </span>
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          p.active ? "bg-emerald-500" : "bg-zinc-400"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-8">
                {activeEditingPkg ? (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold block mb-1">Nombre del Paquete</label>
                        <input
                          type="text"
                          value={activeEditingPkg.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              packages: prev.packages.map((p) =>
                                p.id === activeEditingPkg.id ? { ...p, name: val } : p
                              ),
                            }));
                          }}
                          className="w-full h-9 px-3 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">Categoría</label>
                        <select
                          value={activeEditingPkg.categoryId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              packages: prev.packages.map((p) =>
                                p.id === activeEditingPkg.id ? { ...p, categoryId: val } : p
                              ),
                            }));
                          }}
                          className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                        >
                          {draft.categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-bold block mb-1">Precio Base ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={activeEditingPkg.basePrice ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              packages: prev.packages.map((p) =>
                                p.id === activeEditingPkg.id
                                  ? { ...p, basePrice: val === "" ? null : Number(val) }
                                  : p
                              ),
                            }));
                          }}
                          className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">Precio Promo ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={activeEditingPkg.promoPrice ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              packages: prev.packages.map((p) =>
                                p.id === activeEditingPkg.id
                                  ? { ...p, promoPrice: val === "" ? null : Number(val) }
                                  : p
                              ),
                            }));
                          }}
                          className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold block mb-1">Duración (min)</label>
                        <input
                          type="number"
                          value={activeEditingPkg.estimatedMinutes}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 30;
                            setDraft((prev) => ({
                              ...prev,
                              packages: prev.packages.map((p) =>
                                p.id === activeEditingPkg.id ? { ...p, estimatedMinutes: val } : p
                              ),
                            }));
                          }}
                          className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* Tarifas por tipo de vehículo del paquete */}
                    <div>
                      <label className="text-xs font-bold block mb-1.5">
                        Tarifas del Paquete por Tipo de Vehículo ($)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {draft.vehicleTypes.map((vt) => (
                          <div
                            key={vt.id}
                            className="p-2 rounded-lg bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10 flex items-center justify-between gap-1.5"
                          >
                            <span className="text-[11px] truncate">
                              {vt.icon} {vt.name}
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={activeEditingPkg.priceByVehicleType?.[vt.id] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDraft((prev) => ({
                                  ...prev,
                                  packages: prev.packages.map((p) => {
                                    if (p.id !== activeEditingPkg.id) return p;
                                    const nextMap = { ...(p.priceByVehicleType || {}) };
                                    if (val === "" || Number(val) <= 0) {
                                      delete nextMap[vt.id];
                                    } else {
                                      nextMap[vt.id] = Number(val);
                                    }
                                    return { ...p, priceByVehicleType: nextMap };
                                  }),
                                }));
                              }}
                              placeholder={String(activeEditingPkg.basePrice || "")}
                              className="w-16 h-7 px-1.5 rounded border border-zinc-300 dark:border-white/15 bg-zinc-50 dark:bg-black/50 font-mono text-xs text-right"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Procedimientos incluidos */}
                    <div>
                      <label className="text-xs font-bold block mb-1">
                        Procedimientos que incluye el paquete (uno por línea)
                      </label>
                      <textarea
                        rows={3}
                        value={(activeEditingPkg.includedProcedures || []).join("\n")}
                        onChange={(e) => {
                          const lines = e.target.value.split("\n");
                          setDraft((prev) => ({
                            ...prev,
                            packages: prev.packages.map((p) =>
                              p.id === activeEditingPkg.id
                                ? { ...p, includedProcedures: lines }
                                : p
                            ),
                          }));
                        }}
                        className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                      />
                    </div>

                    {/* Adicionales ya incluidos en el paquete (para evitar cobro doble) */}
                    <div>
                      <label className="text-xs font-bold block mb-1.5">
                        Complementos ya incluidos sin costo extra en este paquete (evita cobro doble):
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {draft.addons.map((addon) => {
                          const inc = (activeEditingPkg.includedAddonIds || []).includes(addon.id);
                          return (
                            <button
                              key={addon.id}
                              type="button"
                              onClick={() => {
                                setDraft((prev) => ({
                                  ...prev,
                                  packages: prev.packages.map((p) => {
                                    if (p.id !== activeEditingPkg.id) return p;
                                    const currentIds = p.includedAddonIds || [];
                                    return {
                                      ...p,
                                      includedAddonIds: inc
                                        ? currentIds.filter((id) => id !== addon.id)
                                        : [...currentIds, addon.id],
                                    };
                                  }),
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                inc
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold"
                                  : "bg-white dark:bg-black/30 border-zinc-300 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              {inc ? "✓ " : "+ "}
                              {addon.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* TAB 4: SERVICIOS ADICIONALES / COMPLEMENTOS */}
          {tab === "adicionales" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Configura los servicios adicionales, su precio, duración y si pueden contratarse por separado o solo junto con un servicio principal.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const newAddon: CarWashAddon = {
                      id: `addon_${Date.now()}`,
                      code: `ADD-CW-${draft.addons.length + 1}`,
                      name: "Nuevo Complemento",
                      description: "Descripción del servicio adicional",
                      imageUrl: FALLBACK_CARWASH_IMG,
                      price: 8,
                      promoPrice: null,
                      priceByVehicleType: {},
                      estimatedMinutes: 20,
                      availability: "Disponible",
                      canBeStandalone: true,
                      applicableCategoryIds: [],
                      applicableVehicleTypes: [],
                      active: true,
                      order: draft.addons.length + 1,
                    };
                    setDraft((prev) => ({
                      ...prev,
                      addons: [...prev.addons, newAddon],
                    }));
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold cursor-pointer"
                >
                  + Agregar Servicio Adicional
                </button>
              </div>

              <div className="space-y-2.5">
                {draft.addons.map((addon) => (
                  <div
                    key={addon.id}
                    className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
                  >
                    <div className="lg:col-span-3 flex items-center gap-2.5">
                      <img
                        src={addon.imageUrl || FALLBACK_CARWASH_IMG}
                        alt={addon.name}
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <input
                        type="text"
                        value={addon.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => ({
                            ...prev,
                            addons: prev.addons.map((a) =>
                              a.id === addon.id ? { ...a, name: val } : a
                            ),
                          }));
                        }}
                        className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-bold"
                      />
                    </div>

                    <div className="lg:col-span-4">
                      <input
                        type="text"
                        value={addon.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraft((prev) => ({
                            ...prev,
                            addons: prev.addons.map((a) =>
                              a.id === addon.id ? { ...a, description: val } : a
                            ),
                          }));
                        }}
                        className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                      />
                    </div>

                    <div className="lg:col-span-2 flex items-center gap-1.5">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Precio ($)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={addon.price ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraft((prev) => ({
                              ...prev,
                              addons: prev.addons.map((a) =>
                                a.id === addon.id
                                  ? { ...a, price: val === "" ? null : Number(val) }
                                  : a
                              ),
                            }));
                          }}
                          className="w-20 h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Minutos</span>
                        <input
                          type="number"
                          value={addon.estimatedMinutes}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 15;
                            setDraft((prev) => ({
                              ...prev,
                              addons: prev.addons.map((a) =>
                                a.id === addon.id ? { ...a, estimatedMinutes: val } : a
                              ),
                            }));
                          }}
                          className="w-16 h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-3 flex items-center justify-end gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addon.canBeStandalone}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setDraft((prev) => ({
                              ...prev,
                              addons: prev.addons.map((a) =>
                                a.id === addon.id ? { ...a, canBeStandalone: checked } : a
                              ),
                            }));
                          }}
                          className="accent-amber-500"
                        />
                        <span>Contratable solo</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setDraft((prev) => ({
                            ...prev,
                            addons: prev.addons.map((a) =>
                              a.id === addon.id ? { ...a, active: !a.active } : a
                            ),
                          }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          addon.active
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-zinc-300 dark:bg-white/10 text-zinc-500"
                        }`}
                      >
                        {addon.active ? "Activo" : "Inactivo"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: IMPUESTOS Y BAHÍAS DE RESERVA */}
          {tab === "reglas" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  🏛️ Reglas Fiscales y de Precios
                </h4>
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Porcentaje de Impuesto / IVA (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={draft.taxRatePercent}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        taxRatePercent: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-32 h-9 px-3 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={draft.pricesIncludeTax}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        pricesIncludeTax: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span>Los precios mostrados en tarjetas ya incluyen impuestos</span>
                </label>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  🚿 Bahías de Lavado / Estaciones para Reserva
                </h4>
                <p className="text-[11px] text-zinc-500">
                  Una bahía por línea (usadas para validar disponibilidad real de citas):
                </p>
                <textarea
                  rows={4}
                  value={(draft.bays || []).join("\n")}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      bays: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                  className="w-full p-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-black/40 border-t border-zinc-200 dark:border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveAll}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs sm:text-sm font-black shadow-md cursor-pointer"
          >
            {saving ? "Guardando..." : "💾 Guardar Toda la Configuración"}
          </button>
        </div>
      </div>
    </div>
  );
}
