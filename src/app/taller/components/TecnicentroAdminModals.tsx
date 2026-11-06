"use client";

import React, { useState, useRef } from "react";
import type {
  TecnicentroConfigData,
  TecnicentroCategory,
  TecnicentroSubcategory,
  TecnicentroVehicleType,
  TecnicentroPackage,
  TecnicentroAddon,
  TecAvailability,
  TecPricingMode,
  TecFilterGroup,
} from "@/app/api/taller/tecnicentro/route";

export interface TecnicentroEnrichedService {
  id: string;
  code: string;
  name: string;
  category: string;
  pricingMode: TecPricingMode;
  basePrice: number | null;
  promoPrice: number | null;
  priceByVehicleType: Record<string, number>;
  requiresPriorInspection: boolean;
  defaultUnitsCount: number;
  estimatedMinutes: number;
  applicableVehicleTypes: string[];
  categoryId: string;
  subcategoryId: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  includesList: string[];
  excludesList: string[];
  materialsIncluded: string[];
  partsIncluded: string[];
  associatedAddonIds: string[];
  conditionsText: string;
  availability: TecAvailability;
  alignmentType: string;
  wheelCount: string;
  balanceServiceType: string;
  suspensionInspectionType: string;
  suspensionComponent: string;
  brakeComponent: string;
  brakeServiceType: string;
  diagnosticType: string;
  diagnosticSystem: string;
  steeringComponent: string;
  steeringInspectionClass: string;
  order: number;
  active: boolean;
}

export interface TecnicentroEnrichedTire {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  subCategory?: string;
  presentation?: string;
  price: number;
  costPrice: number | null;
  stock: number;
  minStock: number;
  imageUrl: string;
  status: string;
  categoryId: string;
  subcategoryId: string;
  tireSize: string;
  width: string;
  profile: string;
  rimDiameter: string;
  loadIndex: string;
  speedRating: string;
  modelRef: string;
  specifications: string;
  includesInstallation: boolean;
  compatibilities: Array<{
    brand: string;
    model: string;
    yearFrom?: number;
    yearTo?: number;
    version?: string;
  }>;
  active: boolean;
}

const FALLBACK_TEC_IMG =
  "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80";

const AVAILABILITY_LIST: TecAvailability[] = [
  "Disponible",
  "Alta demanda",
  "Sujeto a cupo",
  "No disponible",
];

async function uploadImageToR2Tecnicentro(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "tecnicentro");
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
// 1. MODAL DE DETALLE VISUAL DE SERVICIO, PAQUETE O NEUMÁTICO
// ============================================================================
export function ModalDetalleTecnicentro({
  item,
  kind,
  config,
  selectedVehicleTypeId,
  isSelected,
  onToggleSelect,
  onEdit,
  onClose,
}: {
  item: TecnicentroEnrichedService | TecnicentroPackage | TecnicentroEnrichedTire | null;
  kind: "SERVICE" | "PACKAGE" | "TIRE";
  config: TecnicentroConfigData;
  selectedVehicleTypeId: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit?: () => void;
  onClose: () => void;
}) {
  if (!item) return null;

  const isTire = kind === "TIRE";
  const isPkg = kind === "PACKAGE";
  const srv = kind === "SERVICE" ? (item as TecnicentroEnrichedService) : null;
  const pkg = isPkg ? (item as TecnicentroPackage) : null;
  const tire = isTire ? (item as TecnicentroEnrichedTire) : null;

  const currentVt = config.vehicleTypes.find((v) => v.id === selectedVehicleTypeId);

  let effectivePrice: number | null = null;
  let quoteRequired = false;
  if (isTire && tire) {
    effectivePrice = tire.price;
  } else if (isPkg && pkg) {
    quoteRequired = pkg.quoteRequired;
    effectivePrice =
      pkg.priceByVehicleType?.[selectedVehicleTypeId] || pkg.promoPrice || pkg.basePrice;
  } else if (srv) {
    quoteRequired = srv.pricingMode === "QUOTE_REQUIRED";
    effectivePrice =
      srv.priceByVehicleType?.[selectedVehicleTypeId] || srv.promoPrice || srv.basePrice;
  }

  const includes = isPkg
    ? pkg?.includedServicesList || []
    : srv
    ? srv.includesList || []
    : tire
    ? [
        `Medida técnica: ${tire.tireSize} (${tire.loadIndex}${tire.speedRating})`,
        `Marca: ${tire.brand} • Modelo/Ref: ${tire.modelRef}`,
        tire.includesInstallation
          ? "Incluye montaje básico en el precio del neumático"
          : "Venta de neumático físico (el servicio de montaje y balanceo se selecciona por separado)",
      ]
    : [];

  const excludes = srv?.excludesList || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl my-auto animate-fade-in">
        {/* Cabecera */}
        <div className="relative h-56 w-full bg-zinc-900 overflow-hidden">
          <img
            src={item.imageUrl || FALLBACK_TEC_IMG}
            alt={item.name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK_TEC_IMG;
            }}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

          <div className="absolute top-3 right-3 flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-zinc-900 text-xs font-bold shadow-md cursor-pointer"
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
                  {isTire
                    ? `Neumático ${tire?.tireSize}`
                    : isPkg
                    ? "Paquete Tecnicentro"
                    : srv?.pricingMode === "PER_WHEEL"
                    ? "Servicio por Rueda"
                    : srv?.pricingMode === "PER_AXLE"
                    ? "Servicio por Eje"
                    : "Servicio Tecnicentro"}
                </span>
                {!isTire && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 text-white">
                    ⏱️ {(srv || pkg)?.estimatedMinutes || 30} min aprox.
                  </span>
                )}
                {isTire && tire && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      tire.stock > 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    }`}
                  >
                    Stock: {tire.stock} unid.
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {item.name}
              </h3>
            </div>

            <div className="bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2 text-right shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-zinc-300 block">
                {isTire
                  ? "Precio Unitario"
                  : `Tarifa ${currentVt ? `(${currentVt.name})` : ""}`}
              </span>
              {quoteRequired || !effectivePrice ? (
                <span className="text-xs font-bold text-amber-300">Precio por cotizar</span>
              ) : (
                <span className="text-2xl font-black text-amber-400 font-mono">
                  ${Number(effectivePrice).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[65vh] overflow-y-auto text-zinc-900 dark:text-white">
          <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">
            {isTire
              ? tire?.specifications
              : (srv || pkg)?.fullDescription || (srv || pkg)?.shortDescription}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25">
              <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2">
                ✓ {isTire ? "Especificaciones y Condiciones" : "Qué incluye el servicio"}
              </h5>
              <ul className="space-y-1.5 text-xs text-zinc-800 dark:text-zinc-200">
                {includes.map((inc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {excludes.length > 0 && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                <h5 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 mb-2">
                  ✕ Qué no incluye (Se cotiza por separado)
                </h5>
                <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {excludes.map((exc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Compatibilidades si es neumático */}
          {isTire && tire && tire.compatibilities?.length > 0 && (
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
                🚗 Compatibilidad Vehicular Registrada
              </h5>
              <div className="flex flex-wrap gap-2">
                {tire.compatibilities.map((c, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs font-semibold"
                  >
                    {c.brand} {c.model}{" "}
                    {c.yearFrom ? `(${c.yearFrom}-${c.yearTo || "Actual"})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Condiciones */}
          {(srv?.conditionsText || pkg?.conditionsText) && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
              <strong>📌 Condición técnica: </strong>
              {srv?.conditionsText || pkg?.conditionsText}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-zinc-50 dark:bg-black/40 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => {
              onToggleSelect();
              onClose();
            }}
            className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black cursor-pointer shadow-md ${
              isSelected
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-amber-500 hover:bg-amber-600 text-black"
            }`}
          >
            {isSelected ? "✕ Quitar de la Selección" : "✓ Seleccionar y Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. MODAL FORMULARIO DE SERVICIO DE TECNICENTRO (SECCIÓN 6 DEL PROMPT)
// ============================================================================
export function ModalServicioTecnicentroForm({
  initialService,
  config,
  onSave,
  onDelete,
  onClose,
  mostrarToast,
}: {
  initialService?: Partial<TecnicentroEnrichedService> | null;
  config: TecnicentroConfigData;
  onSave: (data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
}) {
  const isEditing = Boolean(initialService?.id);
  const [name, setName] = useState(initialService?.name || "");
  const [code, setCode] = useState(initialService?.code || "");
  const [categoryId, setCategoryId] = useState(
    initialService?.categoryId || config.categories[0]?.id || "tc_cat_alineacion"
  );
  const [subcategoryId, setSubcategoryId] = useState(initialService?.subcategoryId || "");
  const [pricingMode, setPricingMode] = useState<TecPricingMode>(
    initialService?.pricingMode || "FIXED"
  );
  const [basePrice, setBasePrice] = useState(
    initialService?.basePrice !== null && initialService?.basePrice !== undefined
      ? String(initialService.basePrice)
      : ""
  );
  const [promoPrice, setPromoPrice] = useState(
    initialService?.promoPrice !== null && initialService?.promoPrice !== undefined
      ? String(initialService.promoPrice)
      : ""
  );
  const [priceByVehicleType, setPriceByVehicleType] = useState<Record<string, number>>(
    initialService?.priceByVehicleType || {}
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    String(initialService?.estimatedMinutes || 30)
  );
  const [imageUrl, setImageUrl] = useState(initialService?.imageUrl || "");
  const [shortDescription, setShortDescription] = useState(
    initialService?.shortDescription || ""
  );
  const [fullDescription, setFullDescription] = useState(
    initialService?.fullDescription || ""
  );
  const [includesText, setIncludesText] = useState(
    (initialService?.includesList || []).join("\n")
  );
  const [excludesText, setExcludesText] = useState(
    (initialService?.excludesList || []).join("\n")
  );
  const [conditionsText, setConditionsText] = useState(
    initialService?.conditionsText || ""
  );
  const [availability, setAvailability] = useState<TecAvailability>(
    initialService?.availability || "Disponible"
  );
  const [applicableVehicleTypes, setApplicableVehicleTypes] = useState<string[]>(
    initialService?.applicableVehicleTypes?.length
      ? initialService.applicableVehicleTypes
      : config.vehicleTypes.map((v) => v.id)
  );
  const [active, setActive] = useState<boolean>(
    initialService?.active !== undefined ? initialService.active : true
  );

  // Campos de filtro específico según categoría
  const [alignmentType, setAlignmentType] = useState(initialService?.alignmentType || "");
  const [wheelCount, setWheelCount] = useState(initialService?.wheelCount || "");
  const [balanceServiceType, setBalanceServiceType] = useState(
    initialService?.balanceServiceType || ""
  );
  const [suspensionInspectionType, setSuspensionInspectionType] = useState(
    initialService?.suspensionInspectionType || ""
  );
  const [suspensionComponent, setSuspensionComponent] = useState(
    initialService?.suspensionComponent || ""
  );
  const [brakeComponent, setBrakeComponent] = useState(
    initialService?.brakeComponent || ""
  );
  const [brakeServiceType, setBrakeServiceType] = useState(
    initialService?.brakeServiceType || ""
  );
  const [diagnosticType, setDiagnosticType] = useState(
    initialService?.diagnosticType || ""
  );
  const [diagnosticSystem, setDiagnosticSystem] = useState(
    initialService?.diagnosticSystem || ""
  );
  const [steeringComponent, setSteeringComponent] = useState(
    initialService?.steeringComponent || ""
  );
  const [steeringInspectionClass, setSteeringInspectionClass] = useState(
    initialService?.steeringInspectionClass || ""
  );

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const currentCat = config.categories.find((c) => c.id === categoryId);
  const subcats = config.subcategories.filter((s) => s.categoryId === categoryId);

  const handleUploadImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setUploading(true);
      const url = await uploadImageToR2Tecnicentro(f);
      setImageUrl(url);
      mostrarToast("Imagen subida a Cloudflare R2", "ok");
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir imagen", "err");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      mostrarToast("El nombre del servicio es obligatorio", "err");
      return;
    }
    try {
      setSaving(true);
      await onSave({
        id: initialService?.id,
        code: code.trim() || undefined,
        name: name.trim(),
        categoryId,
        subcategoryId: subcategoryId || subcats[0]?.id || "",
        pricingMode,
        basePrice: pricingMode === "QUOTE_REQUIRED" || basePrice === "" ? null : Number(basePrice),
        promoPrice: promoPrice === "" ? null : Number(promoPrice),
        priceByVehicleType,
        estimatedMinutes: Number(estimatedMinutes) || 30,
        imageUrl: imageUrl.trim(),
        shortDescription: shortDescription.trim(),
        fullDescription: fullDescription.trim(),
        includesList: includesText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        excludesList: excludesText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        conditionsText: conditionsText.trim(),
        availability,
        applicableVehicleTypes,
        alignmentType,
        wheelCount,
        balanceServiceType,
        suspensionInspectionType,
        suspensionComponent,
        brakeComponent,
        brakeServiceType,
        diagnosticType,
        diagnosticSystem,
        steeringComponent,
        steeringInspectionClass,
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
              {isEditing
                ? "✏️ Editar Servicio de Tecnicentro"
                : "➕ Registrar Servicio de Tecnicentro"}
            </h3>
            <p className="text-xs text-zinc-400">
              Guarda precios, tarifas por vehículo, filtros técnicos e imágenes R2 en Neon
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

        <div className="p-5 sm:p-6 space-y-4 max-h-[74vh] overflow-y-auto text-zinc-900 dark:text-white">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="text-xs font-bold block mb-1">Nombre del Servicio *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Alineación Computarizada 3D Cuatro Ruedas"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs sm:text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-bold block mb-1">Código SKU</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="TC-SRV-001"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs font-bold block mb-1">Disponibilidad</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value as TecAvailability)}
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
              >
                {AVAILABILITY_LIST.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Categoría, Subcategoría, Modalidad de Precio, Precio Base, Duración */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="text-xs font-bold block mb-1">Categoría Principal</label>
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

            <div className="sm:col-span-3">
              <label className="text-xs font-bold block mb-1">Subcategoría</label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
              >
                <option value="">General</option>
                {subcats.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-bold block mb-1">Regla de Precio</label>
              <select
                value={pricingMode}
                onChange={(e) => setPricingMode(e.target.value as TecPricingMode)}
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
              >
                <option value="FIXED">Precio fijo / por vehículo</option>
                <option value="PER_WHEEL">Precio por rueda</option>
                <option value="PER_AXLE">Precio por eje</option>
                <option value="PER_COMPONENT">Precio por componente</option>
                <option value="QUOTE_REQUIRED">Precio por cotizar</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold block mb-1">Precio ($)</label>
              <input
                type="number"
                step="0.01"
                disabled={pricingMode === "QUOTE_REQUIRED"}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="15.00"
                className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>
          </div>

          {/* Atributos dinámicos según la categoría elegida */}
          <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block mb-2">
              🎯 Clasificación técnica para el buscador de {currentCat?.name || "esta categoría"}:
            </span>
            {currentCat?.filterGroup === "alineacion" && (
              <select
                value={alignmentType}
                onChange={(e) => setAlignmentType(e.target.value)}
                className="w-full sm:w-80 h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
              >
                <option value="">Seleccionar tipo de alineación...</option>
                {config.filterOptions.alignmentTypes.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            {currentCat?.filterGroup === "balanceo" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={wheelCount}
                  onChange={(e) => setWheelCount(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Cantidad de ruedas...</option>
                  {config.filterOptions.balanceWheelCounts.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  value={balanceServiceType}
                  onChange={(e) => setBalanceServiceType(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Tipo de balanceo...</option>
                  {config.filterOptions.balanceServiceTypes.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {currentCat?.filterGroup === "suspension" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={suspensionComponent}
                  onChange={(e) => setSuspensionComponent(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Componente de suspensión...</option>
                  {config.filterOptions.suspensionComponents.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  value={suspensionInspectionType}
                  onChange={(e) => setSuspensionInspectionType(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Tipo de servicio/inspección...</option>
                  {config.filterOptions.suspensionInspectionTypes.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {currentCat?.filterGroup === "frenos" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={brakeComponent}
                  onChange={(e) => setBrakeComponent(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Componente de frenos...</option>
                  {config.filterOptions.brakeComponents.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  value={brakeServiceType}
                  onChange={(e) => setBrakeServiceType(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Tipo de servicio...</option>
                  {config.filterOptions.brakeServiceTypes.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {currentCat?.filterGroup === "diagnostico" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={diagnosticType}
                  onChange={(e) => setDiagnosticType(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Tipo de diagnóstico...</option>
                  {config.filterOptions.diagnosticTypes.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  value={diagnosticSystem}
                  onChange={(e) => setDiagnosticSystem(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Sistema electrónico...</option>
                  {config.filterOptions.diagnosticSystems.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {currentCat?.filterGroup === "direccion" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={steeringComponent}
                  onChange={(e) => setSteeringComponent(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Componente dirección / tren...</option>
                  {config.filterOptions.steeringComponents.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  value={steeringInspectionClass}
                  onChange={(e) => setSteeringInspectionClass(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Clase de inspección...</option>
                  {config.filterOptions.steeringInspectionClasses.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Imagen R2 y Duración */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
            <div className="sm:col-span-8 flex items-center gap-3">
              <img
                src={imageUrl || FALLBACK_TEC_IMG}
                alt="Preview"
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-zinc-300 dark:border-white/10"
              />
              <div className="flex-1 space-y-1">
                <span className="text-xs font-bold block">Imagen en Cloudflare R2</span>
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
                    onChange={handleUploadImg}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="px-3 h-8 rounded-lg bg-amber-500 text-black text-xs font-bold cursor-pointer"
                  >
                    {uploading ? "..." : "📷 Subir R2"}
                  </button>
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold block mb-1">Duración (min)</label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                className="w-full h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>

            <div className="sm:col-span-2 pt-3">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Activo</span>
              </label>
            </div>
          </div>

          {/* Tarifas por tipo de vehículo */}
          {pricingMode !== "QUOTE_REQUIRED" && (
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-2">
              <span className="text-xs font-bold block">
                🚗 Tarifas por Tipo de Vehículo (dejar vacío para usar Precio Base)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {config.vehicleTypes.map((vt) => (
                  <div
                    key={vt.id}
                    className="p-2 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 flex items-center justify-between gap-1.5"
                  >
                    <span className="text-[11px] font-semibold truncate">
                      {vt.icon} {vt.name}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={priceByVehicleType[vt.id] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPriceByVehicleType((prev) => {
                          const next = { ...prev };
                          if (val === "" || Number(val) <= 0) delete next[vt.id];
                          else next[vt.id] = Number(val);
                          return next;
                        });
                      }}
                      placeholder={basePrice || "Base"}
                      className="w-16 h-7 px-1.5 rounded border border-zinc-300 dark:border-white/15 bg-zinc-50 dark:bg-black/50 font-mono text-xs text-right"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Descripción y listas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1">Descripción Corta</label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Condiciones del Servicio</label>
              <input
                type="text"
                value={conditionsText}
                onChange={(e) => setConditionsText(e.target.value)}
                placeholder="Ej. Inspección no incluye reemplazo de piezas"
                className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                ✓ Qué incluye (uno por línea)
              </label>
              <textarea
                rows={3}
                value={includesText}
                onChange={(e) => setIncludesText(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-rose-700 dark:text-rose-400 block mb-1">
                ✕ Qué no incluye (uno por línea)
              </label>
              <textarea
                rows={3}
                value={excludesText}
                onChange={(e) => setExcludesText(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-black/40 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between">
          {isEditing && onDelete && initialService?.id ? (
            <button
              type="button"
              onClick={() => onDelete(initialService.id!)}
              className="px-4 py-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300 text-xs font-bold cursor-pointer"
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
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-semibold cursor-pointer"
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
// 3. MODAL FORMULARIO DE NEUMÁTICO / PRODUCTO DE TECNICENTRO (SECCIÓN 10)
// ============================================================================
export function ModalNeumaticoProductoForm({
  initialTire,
  config,
  onSave,
  onDelete,
  onClose,
  mostrarToast,
}: {
  initialTire?: Partial<TecnicentroEnrichedTire> | null;
  config: TecnicentroConfigData;
  onSave: (data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
}) {
  const isEditing = Boolean(initialTire?.id);
  const [name, setName] = useState(initialTire?.name || "");
  const [code, setCode] = useState(initialTire?.code || "");
  const [brand, setBrand] = useState(
    initialTire?.brand || config.filterOptions.tireBrands[0] || "Michelin"
  );
  const [width, setWidth] = useState(initialTire?.width || "205");
  const [profile, setProfile] = useState(initialTire?.profile || "55");
  const [rimDiameter, setRimDiameter] = useState(initialTire?.rimDiameter || "R16");
  const [loadIndex, setLoadIndex] = useState(initialTire?.loadIndex || "91");
  const [speedRating, setSpeedRating] = useState(initialTire?.speedRating || "V");
  const [modelRef, setModelRef] = useState(initialTire?.modelRef || "");
  const [price, setPrice] = useState(String(initialTire?.price ?? 85));
  const [stock, setStock] = useState(String(initialTire?.stock ?? 8));
  const [imageUrl, setImageUrl] = useState(initialTire?.imageUrl || "");
  const [specifications, setSpecifications] = useState(
    initialTire?.specifications || ""
  );
  const [includesInstallation, setIncludesInstallation] = useState(
    Boolean(initialTire?.includesInstallation)
  );
  const [active, setActive] = useState(
    initialTire?.active !== undefined ? initialTire.active : true
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleUploadImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setUploading(true);
      const url = await uploadImageToR2Tecnicentro(f);
      setImageUrl(url);
      mostrarToast("Imagen de neumático subida a R2", "ok");
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir imagen", "err");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const autoName =
      name.trim() ||
      `Neumático ${width}/${profile} ${rimDiameter} ${loadIndex}${speedRating} ${modelRef}`.trim();
    try {
      setSaving(true);
      await onSave({
        id: initialTire?.id,
        code: code.trim() || undefined,
        name: autoName,
        brand,
        width,
        profile,
        rimDiameter,
        loadIndex,
        speedRating,
        modelRef,
        price: Number(price) || 0,
        stock: Number(stock) || 0,
        imageUrl: imageUrl.trim(),
        specifications: specifications.trim(),
        includesInstallation,
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
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl my-auto animate-fade-in"
      >
        <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-black">
              {isEditing ? "✏️ Editar Neumático del Catálogo" : "🛞 Registrar Neumático en Catálogo"}
            </h3>
            <p className="text-xs text-zinc-400">
              Se almacena en la tabla real Product de Neon con sus medidas técnicas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 text-white text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 text-zinc-900 dark:text-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold block mb-1">Nombre Comercial</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Neumático 205/55 R16 91V Primacy 4"
                className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Marca</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Michelin, Bridgestone..."
                className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
          </div>

          {/* Medidas Técnicas del Neumático */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div>
              <label className="text-[11px] font-bold block mb-1">Ancho (mm)</label>
              <input
                type="text"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="205"
                className="w-full h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Perfil (%)</label>
              <input
                type="text"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                placeholder="55"
                className="w-full h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Aro (R)</label>
              <input
                type="text"
                value={rimDiameter}
                onChange={(e) => setRimDiameter(e.target.value)}
                placeholder="R16"
                className="w-full h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Índ. Carga</label>
              <input
                type="text"
                value={loadIndex}
                onChange={(e) => setLoadIndex(e.target.value)}
                placeholder="91"
                className="w-full h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1">Cód. Veloc.</label>
              <input
                type="text"
                value={speedRating}
                onChange={(e) => setSpeedRating(e.target.value.toUpperCase())}
                placeholder="V"
                className="w-full h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold block mb-1">Precio Venta ($)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Stock Real (Unid.)</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Modelo / Referencia</label>
              <input
                type="text"
                value={modelRef}
                onChange={(e) => setModelRef(e.target.value)}
                placeholder="Primacy 4 / AT2"
                className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="URL de imagen en R2..."
              className="flex-1 h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleUploadImg}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="px-3 h-9 rounded-xl bg-amber-500 text-black text-xs font-bold cursor-pointer"
            >
              {uploading ? "..." : "📷 Subir R2"}
            </button>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1">Especificaciones Técnicas</label>
            <textarea
              rows={2}
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={includesInstallation}
              onChange={(e) => setIncludesInstallation(e.target.checked)}
              className="accent-amber-500"
            />
            <span>
              El precio del neumático ya incluye el montaje básico (desmarcar si el montaje se cobra aparte)
            </span>
          </label>
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-black/40 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between">
          {isEditing && onDelete && initialTire?.id ? (
            <button
              type="button"
              onClick={() => onDelete(initialTire.id!)}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 text-rose-600 text-xs font-bold cursor-pointer"
            >
              🗑️ Eliminar / Desactivar
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black cursor-pointer"
            >
              {saving ? "Guardando..." : "💾 Guardar Neumático"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 4. PANEL DE ADMINISTRACIÓN MANUAL DE TECNICENTRO (CATEGORÍAS, PAQUETES, FILTROS)
// ============================================================================
export function ModalConfiguracionTecnicentro({
  config,
  onSaveConfig,
  onClose,
  mostrarToast,
}: {
  config: TecnicentroConfigData;
  onSaveConfig: (updated: TecnicentroConfigData) => Promise<void>;
  onClose: () => void;
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
}) {
  const [tab, setTab] = useState<"categorias" | "paquetes" | "adicionales" | "filtros">(
    "categorias"
  );
  const [draft, setDraft] = useState<TecnicentroConfigData>(() =>
    JSON.parse(JSON.stringify(config))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSaveConfig(draft);
      mostrarToast("Configuración de Tecnicentro guardada en Neon", "ok");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-3xl max-w-5xl w-full overflow-hidden shadow-2xl my-auto animate-fade-in">
        <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-black">
              ⚙️ Administración Manual de Tecnicentro
            </h3>
            <p className="text-xs text-zinc-400">
              Administra las 15 categorías principales, paquetes, complementos y opciones de filtros técnicos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 text-white text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pt-3 bg-zinc-100 dark:bg-black/40 border-b border-zinc-200 dark:border-white/10 flex flex-wrap gap-2">
          {[
            { id: "categorias", label: "1. Categorías Principales (15)" },
            { id: "paquetes", label: "2. Paquetes de Tecnicentro" },
            { id: "adicionales", label: "3. Servicios Adicionales / Insumos" },
            { id: "filtros", label: "4. Opciones de Filtros Técnicos" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`px-3.5 py-2 rounded-t-xl text-xs font-bold cursor-pointer ${
                tab === t.id
                  ? "bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 border-t border-x border-zinc-200 dark:border-white/10"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[68vh] overflow-y-auto space-y-4 text-zinc-900 dark:text-white">
          {tab === "categorias" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">
                  Agrega, edita, ordena o desactiva cualquiera de las categorías del Tecnicentro.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newCat: TecnicentroCategory = {
                      id: `tc_cat_${Date.now()}`,
                      name: "Nueva Categoría Tecnicentro",
                      icon: "🛠️",
                      shortDescription: "Descripción de la categoría.",
                      imageUrl: FALLBACK_TEC_IMG,
                      startingPrice: 10,
                      estimatedMinutes: 30,
                      applicableVehicleTypes: draft.vehicleTypes.map((v) => v.id),
                      availability: "Disponible",
                      filterGroup: "otros",
                      active: true,
                      order: draft.categories.length + 1,
                    };
                    setDraft((prev) => ({
                      ...prev,
                      categories: [...prev.categories, newCat],
                    }));
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold cursor-pointer"
                >
                  + Agregar Categoría
                </button>
              </div>

              {draft.categories
                .sort((a, b) => a.order - b.order)
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                  >
                    <div className="sm:col-span-4 flex items-center gap-2">
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
                        className="w-10 h-8 text-center rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-sm"
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
                        className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-bold"
                      />
                    </div>
                    <div className="sm:col-span-4">
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
                        className="w-full h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-1.5">
                      <input
                        type="number"
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
                        placeholder="$"
                        className="w-16 h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                      />
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
                        placeholder="min"
                        className="w-16 h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
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
                            : "bg-zinc-300 dark:bg-white/10 text-zinc-500"
                        }`}
                      >
                        {cat.active ? "Activa" : "Inactiva"}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {tab === "paquetes" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">
                  Configura paquetes de revisión, neumáticos y tren delantero.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newPkg: TecnicentroPackage = {
                      id: `pkg_tc_${Date.now()}`,
                      code: `PKG-TC-${draft.packages.length + 1}`,
                      name: "Nuevo Paquete Tecnicentro",
                      categoryId: "tc_cat_alineacion",
                      shortDescription: "Descripción del paquete.",
                      fullDescription: "Descripción detallada.",
                      imageUrl: FALLBACK_TEC_IMG,
                      basePrice: 20,
                      promoPrice: null,
                      priceByVehicleType: {},
                      quoteRequired: false,
                      estimatedMinutes: 45,
                      applicableVehicleTypes: draft.vehicleTypes.map((v) => v.id),
                      includedServicesList: ["Servicio incluido 1"],
                      includedServiceCodes: [],
                      includedAddonIds: [],
                      conditionsText: "",
                      availability: "Disponible",
                      badgeText: "Combo",
                      active: true,
                      order: draft.packages.length + 1,
                    };
                    setDraft((prev) => ({
                      ...prev,
                      packages: [...prev.packages, newPkg],
                    }));
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold cursor-pointer"
                >
                  + Crear Paquete
                </button>
              </div>

              {draft.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          packages: prev.packages.map((p) =>
                            p.id === pkg.id ? { ...p, name: val } : p
                          ),
                        }));
                      }}
                      className="sm:col-span-5 h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={pkg.shortDescription}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          packages: prev.packages.map((p) =>
                            p.id === pkg.id ? { ...p, shortDescription: val } : p
                          ),
                        }));
                      }}
                      className="sm:col-span-4 h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={pkg.basePrice ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          packages: prev.packages.map((p) =>
                            p.id === pkg.id
                              ? { ...p, basePrice: val === "" ? null : Number(val) }
                              : p
                          ),
                        }));
                      }}
                      className="sm:col-span-2 h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          packages: prev.packages.map((p) =>
                            p.id === pkg.id ? { ...p, active: !p.active } : p
                          ),
                        }));
                      }}
                      className={`sm:col-span-1 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        pkg.active
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : "bg-zinc-300 text-zinc-600"
                      }`}
                    >
                      {pkg.active ? "Activo" : "Off"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "adicionales" && (
            <div className="space-y-3">
              {draft.addons.map((addon) => (
                <div
                  key={addon.id}
                  className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
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
                    className="sm:col-span-4 h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-bold"
                  />
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
                    className="sm:col-span-5 h-8 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                  />
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
                    className="sm:col-span-2 h-8 px-2 rounded-lg border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 font-mono text-xs"
                  />
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
                    className={`sm:col-span-1 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      addon.active ? "bg-emerald-500/20 text-emerald-700" : "bg-zinc-300"
                    }`}
                  >
                    {addon.active ? "Sí" : "No"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "filtros" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold block mb-1">
                  Tipos de Alineación (uno por línea)
                </label>
                <textarea
                  rows={3}
                  value={draft.filterOptions.alignmentTypes.join("\n")}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      filterOptions: {
                        ...prev.filterOptions,
                        alignmentTypes: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">
                  Marcas de Neumáticos (separadas por coma)
                </label>
                <textarea
                  rows={3}
                  value={draft.filterOptions.tireBrands.join(", ")}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      filterOptions: {
                        ...prev.filterOptions,
                        tireBrands: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">
                  Componentes de Suspensión (uno por línea)
                </label>
                <textarea
                  rows={3}
                  value={draft.filterOptions.suspensionComponents.join("\n")}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      filterOptions: {
                        ...prev.filterOptions,
                        suspensionComponents: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">
                  Sistemas de Diagnóstico Electrónico (uno por línea)
                </label>
                <textarea
                  rows={3}
                  value={draft.filterOptions.diagnosticSystems.join("\n")}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      filterOptions: {
                        ...prev.filterOptions,
                        diagnosticSystems: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    }))
                  }
                  className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-zinc-50 dark:bg-black/40 border-t border-zinc-200 dark:border-white/10 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs sm:text-sm font-black shadow-md cursor-pointer"
          >
            {saving ? "Guardando..." : "💾 Guardar Configuración"}
          </button>
        </div>
      </div>
    </div>
  );
}
