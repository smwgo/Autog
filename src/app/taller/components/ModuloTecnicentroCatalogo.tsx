"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type {
  TecnicentroConfigData,
  TecnicentroCategory,
  TecnicentroPackage,
  TecnicentroAddon,
  TecnicentroVehicleType,
} from "@/app/api/taller/tecnicentro/route";
import {
  TecnicentroEnrichedService,
  TecnicentroEnrichedTire,
  ModalDetalleTecnicentro,
  ModalServicioTecnicentroForm,
  ModalNeumaticoProductoForm,
  ModalConfiguracionTecnicentro,
} from "./TecnicentroAdminModals";

export interface ModuloTecnicentroCatalogoProps {
  empleadoLogueado: { id: string; nombre: string };
  ordenActiva?: any;
  itemsOrden: any[];
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
  onActualizarItemsOrden: (nuevosItems: any[]) => Promise<void>;
  onIrAAvisoYFirma: () => void;
  triggerAbrirConfig?: number;
}

const FALLBACK_TEC_IMG =
  "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80";

const HORARIOS_BAHIA = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
];

function getPriceDisplayForItem(
  item: {
    pricingMode?: string;
    quoteRequired?: boolean;
    basePrice?: number | null;
    promoPrice?: number | null;
    priceByVehicleType?: Record<string, number>;
  },
  vehicleTypeId: string
): { price: number | null; quoteRequired: boolean } {
  if (item.pricingMode === "QUOTE_REQUIRED" || item.quoteRequired) {
    return { price: null, quoteRequired: true };
  }
  const vtVal = item.priceByVehicleType?.[vehicleTypeId];
  if (typeof vtVal === "number" && vtVal > 0) {
    return { price: vtVal, quoteRequired: false };
  }
  if (item.promoPrice && item.promoPrice > 0) {
    return { price: Number(item.promoPrice), quoteRequired: false };
  }
  if (item.basePrice && item.basePrice > 0) {
    return { price: Number(item.basePrice), quoteRequired: false };
  }
  return { price: null, quoteRequired: true };
}

// Caché en el cliente (módulo y localStorage) para que cambiar de tab y volver sea instantáneo
let _tecnicentroClientCache: {
  config: any;
  services: any[];
  tires: any[];
  vehicles: any[];
  promotions: any[];
  appointments: any[];
  timestamp: number;
} | null = null;

const getInitialTecnicentroCache = () => {
  if (_tecnicentroClientCache) return _tecnicentroClientCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("taller_tecnicentro_cache_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.config) {
          _tecnicentroClientCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return null;
};

export default function ModuloTecnicentroCatalogo({
  empleadoLogueado,
  ordenActiva,
  itemsOrden,
  mostrarToast,
  onActualizarItemsOrden,
  onIrAAvisoYFirma,
  triggerAbrirConfig,
}: ModuloTecnicentroCatalogoProps) {
  const initialCache = getInitialTecnicentroCache();
  const [loading, setLoading] = useState(!initialCache);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [config, setConfig] = useState<TecnicentroConfigData | null>(initialCache ? initialCache.config : null);
  const [services, setServices] = useState<TecnicentroEnrichedService[]>(initialCache ? initialCache.services : []);
  const [tires, setTires] = useState<TecnicentroEnrichedTire[]>(initialCache ? initialCache.tires : []);
  const [vehicles, setVehicles] = useState<any[]>(initialCache ? initialCache.vehicles : []);
  const [promotions, setPromotions] = useState<any[]>(initialCache ? initialCache.promotions : []);
  const [appointments, setAppointments] = useState<any[]>(initialCache ? initialCache.appointments : []);

  // Panel «Selecciona tu vehículo» (Sección 4)
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<string>("vt_sedan");
  const [vehBrand, setVehBrand] = useState<string>("");
  const [vehModel, setVehModel] = useState<string>("");
  const [vehYear, setVehYear] = useState<string>("");
  const [vehVersion, setVehVersion] = useState<string>("");
  const [vehEngine, setVehEngine] = useState<string>("");
  const [vehTireSize, setVehTireSize] = useState<string>("");
  const [onlyCompatibleVerified, setOnlyCompatibleVerified] = useState<boolean>(false);

  // Categoría y subcategoría seleccionadas
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("TODOS");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filtros dinámicos específicos por categoría (Sección 5)
  const [filterAvailability, setFilterAvailability] = useState<string>("");
  const [filterAlignmentType, setFilterAlignmentType] = useState<string>("");
  const [filterWheelCount, setFilterWheelCount] = useState<string>("");
  const [filterBalanceType, setFilterBalanceType] = useState<string>("");
  const [filterTireBrand, setFilterTireBrand] = useState<string>("");
  const [filterTireWidth, setFilterTireWidth] = useState<string>("");
  const [filterTireProfile, setFilterTireProfile] = useState<string>("");
  const [filterTireRim, setFilterTireRim] = useState<string>("");
  const [filterTireIndex, setFilterTireIndex] = useState<string>("");
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");
  const [filterSuspensionType, setFilterSuspensionType] = useState<string>("");
  const [filterSuspensionComp, setFilterSuspensionComp] = useState<string>("");
  const [filterBrakeComp, setFilterBrakeComp] = useState<string>("");
  const [filterBrakeServiceType, setFilterBrakeServiceType] = useState<string>("");
  const [filterDiagType, setFilterDiagType] = useState<string>("");
  const [filterDiagSystem, setFilterDiagSystem] = useState<string>("");
  const [filterSteeringComp, setFilterSteeringComp] = useState<string>("");
  const [filterSteeringClass, setFilterSteeringClass] = useState<string>("");

  // Selecciones del cliente
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({});
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [selectedTires, setSelectedTires] = useState<Record<string, number>>({});
  const [promoCodeInput, setPromoCodeInput] = useState<string>("");

  // Cálculo validado en el servidor
  const [serverCalculation, setServerCalculation] = useState<any | null>(null);
  const [calculatingServer, setCalculatingServer] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);

  // Reserva de Bahía (ClientAppointment)
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [bookingDate, setBookingDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [bookingTimeSlot, setBookingTimeSlot] = useState<string>("09:00 AM");
  const [bookingBay, setBookingBay] = useState<string>("Bahía Alineación 3D #1");
  const [savingBooking, setSavingBooking] = useState(false);
  const [lastBooking, setLastBooking] = useState<any | null>(null);

  // Modales administrativos
  const [detailModal, setDetailModal] = useState<{
    item: TecnicentroEnrichedService | TecnicentroPackage | TecnicentroEnrichedTire;
    kind: "SERVICE" | "PACKAGE" | "TIRE";
  } | null>(null);
  const [serviceFormModal, setServiceFormModal] = useState<{
    open: boolean;
    service?: Partial<TecnicentroEnrichedService> | null;
  }>({ open: false, service: null });
  const [tireFormModal, setTireFormModal] = useState<{
    open: boolean;
    tire?: Partial<TecnicentroEnrichedTire> | null;
  }>({ open: false, tire: null });
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Escuchar trigger de cabecera exterior
  useEffect(() => {
    if (triggerAbrirConfig && triggerAbrirConfig > 0) {
      setConfigModalOpen(true);
    }
  }, [triggerAbrirConfig]);

  const fetchTecnicentroData = useCallback(async () => {
    if (_tecnicentroClientCache && Date.now() - _tecnicentroClientCache.timestamp < 300000) {
      return;
    }
    try {
      if (!config) setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/taller/tecnicentro", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al cargar el módulo Tecnicentro");
      }
      const cacheObj = {
        config: data.config,
        services: data.services || [],
        tires: data.tires || [],
        vehicles: data.vehicles || [],
        promotions: data.promotions || [],
        appointments: data.appointments || [],
        timestamp: Date.now(),
      };
      _tecnicentroClientCache = cacheObj;
      try {
        localStorage.setItem("taller_tecnicentro_cache_v2", JSON.stringify(cacheObj));
      } catch {}
      setConfig(data.config);
      setServices(data.services || []);
      setTires(data.tires || []);
      setVehicles(data.vehicles || []);
      setPromotions(data.promotions || []);
      setAppointments(data.appointments || []);
      if (data.config?.bays?.[0]) {
        setBookingBay(data.config.bays[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error al conectar con el servidor de Tecnicentro");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    void fetchTecnicentroData();
  }, [fetchTecnicentroData]);

  // Pre-poblar «Selecciona tu vehículo» si hay ordenActiva
  useEffect(() => {
    if (!ordenActiva?.vehicle) return;
    const vStr = String(ordenActiva.vehicle);
    const parts = vStr.split(" ");
    if (parts[0] && !vehBrand) setVehBrand(parts[0]);
    if (parts[1] && !vehModel) setVehModel(parts.slice(1).join(" "));
    const vLow = vStr.toLowerCase();
    if (vLow.includes("hilux") || vLow.includes("d-max") || vLow.includes("pickup")) {
      setSelectedVehicleTypeId("vt_camioneta");
    } else if (vLow.includes("sportage") || vLow.includes("tucson") || vLow.includes("rav4") || vLow.includes("suv")) {
      setSelectedVehicleTypeId("vt_suv");
    } else if (vLow.includes("moto")) {
      setSelectedVehicleTypeId("vt_motocicleta");
    }
  }, [ordenActiva?.vehicle]);

  // Limpiar filtros específicos cuando se cambia de categoría
  const clearCategorySpecificFilters = () => {
    setFilterAvailability("");
    setFilterAlignmentType("");
    setFilterWheelCount("");
    setFilterBalanceType("");
    setFilterTireBrand("");
    setFilterTireWidth("");
    setFilterTireProfile("");
    setFilterTireRim("");
    setFilterTireIndex("");
    setFilterMaxPrice("");
    setFilterSuspensionType("");
    setFilterSuspensionComp("");
    setFilterBrakeComp("");
    setFilterBrakeServiceType("");
    setFilterDiagType("");
    setFilterDiagSystem("");
    setFilterSteeringComp("");
    setFilterSteeringClass("");
  };

  // Validar y calcular en el servidor cuando cambian las selecciones
  useEffect(() => {
    if (!config) return;
    const srvArr = Object.entries(selectedServices).map(([id, quantity]) => ({ id, quantity }));
    const addArr = Object.entries(selectedAddons).map(([id, quantity]) => ({ id, quantity }));
    const tireArr = Object.entries(selectedTires).map(([id, quantity]) => ({ id, quantity }));

    if (
      selectedPackages.length === 0 &&
      srvArr.length === 0 &&
      addArr.length === 0 &&
      tireArr.length === 0
    ) {
      setServerCalculation(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setCalculatingServer(true);
        const res = await fetch("/api/taller/tecnicentro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CALCULAR_Y_VALIDAR_SELECCION",
            vehicleTypeId: selectedVehicleTypeId,
            selectedPackages,
            selectedServices: srvArr,
            selectedAddons: addArr,
            selectedTires: tireArr,
            promoCode: promoCodeInput,
          }),
        });
        const data = await res.json();
        if (!cancelled && data.success) {
          setServerCalculation(data.calculation);
        }
      } catch {
      } finally {
        if (!cancelled) setCalculatingServer(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    config,
    selectedVehicleTypeId,
    selectedPackages,
    selectedServices,
    selectedAddons,
    selectedTires,
    promoCodeInput,
  ]);

  const activeCategories = useMemo(
    () => (config?.categories || []).filter((c) => c.active).sort((a, b) => a.order - b.order),
    [config]
  );

  const activeVehicleTypes = useMemo(
    () => (config?.vehicleTypes || []).filter((v) => v.active).sort((a, b) => a.order - b.order),
    [config]
  );

  const currentVehicleType: TecnicentroVehicleType | undefined = useMemo(
    () =>
      activeVehicleTypes.find((v) => v.id === selectedVehicleTypeId) || activeVehicleTypes[0],
    [activeVehicleTypes, selectedVehicleTypeId]
  );

  const currentCategory: TecnicentroCategory | undefined = useMemo(
    () => activeCategories.find((c) => c.id === selectedCategoryId),
    [activeCategories, selectedCategoryId]
  );

  const activeSubcategories = useMemo(() => {
    if (!config || selectedCategoryId === "TODOS") return [];
    return config.subcategories
      .filter((s) => s.active && s.categoryId === selectedCategoryId)
      .sort((a, b) => a.order - b.order);
  }, [config, selectedCategoryId]);

  // Códigos de servicios y adicionales ya incluidos en paquetes seleccionados
  const includedInPackagesInfo = useMemo(() => {
    const srvCodes: Record<string, string> = {};
    const addonIds: Record<string, string> = {};
    if (!config) return { srvCodes, addonIds };
    selectedPackages.forEach((pId) => {
      const pkg = config.packages.find((p) => p.id === pId);
      if (pkg) {
        (pkg.includedServiceCodes || []).forEach((c) => {
          srvCodes[c] = pkg.name;
        });
        (pkg.includedAddonIds || []).forEach((a) => {
          addonIds[a] = pkg.name;
        });
      }
    });
    return { srvCodes, addonIds };
  }, [config, selectedPackages]);

  // Filtrado de Servicios Individuales según Categoría, Subcategoría, Vehículo y Filtros Específicos
  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services
      .filter((s) => {
        if (!s.active) return false;
        if (
          s.applicableVehicleTypes?.length > 0 &&
          !s.applicableVehicleTypes.includes(selectedVehicleTypeId)
        ) {
          return false;
        }
        if (selectedCategoryId !== "TODOS" && s.categoryId !== selectedCategoryId) {
          return false;
        }
        if (
          selectedSubcategoryId !== "TODOS" &&
          s.subcategoryId &&
          s.subcategoryId !== selectedSubcategoryId
        ) {
          return false;
        }
        if (filterAvailability && s.availability !== filterAvailability) return false;
        if (filterAlignmentType && s.alignmentType !== filterAlignmentType) return false;
        if (filterWheelCount && s.wheelCount !== filterWheelCount) return false;
        if (filterBalanceType && s.balanceServiceType !== filterBalanceType) return false;
        if (filterSuspensionType && s.suspensionInspectionType !== filterSuspensionType)
          return false;
        if (filterSuspensionComp && s.suspensionComponent !== filterSuspensionComp) return false;
        if (filterBrakeComp && s.brakeComponent !== filterBrakeComp) return false;
        if (filterBrakeServiceType && s.brakeServiceType !== filterBrakeServiceType) return false;
        if (filterDiagType && s.diagnosticType !== filterDiagType) return false;
        if (filterDiagSystem && s.diagnosticSystem !== filterDiagSystem) return false;
        if (filterSteeringComp && s.steeringComponent !== filterSteeringComp) return false;
        if (filterSteeringClass && s.steeringInspectionClass !== filterSteeringClass) return false;
        if (filterMaxPrice && Number(filterMaxPrice) > 0) {
          const pInfo = getPriceDisplayForItem(s, selectedVehicleTypeId);
          if (pInfo.price && pInfo.price > Number(filterMaxPrice)) return false;
        }
        if (q) {
          const hay = `${s.name} ${s.code} ${s.shortDescription} ${s.fullDescription} ${(s.includesList || []).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [
    services,
    selectedVehicleTypeId,
    selectedCategoryId,
    selectedSubcategoryId,
    filterAvailability,
    filterAlignmentType,
    filterWheelCount,
    filterBalanceType,
    filterSuspensionType,
    filterSuspensionComp,
    filterBrakeComp,
    filterBrakeServiceType,
    filterDiagType,
    filterDiagSystem,
    filterSteeringComp,
    filterSteeringClass,
    filterMaxPrice,
    searchQuery,
  ]);

  // Filtrado de Neumáticos por Marca, Medida, Ancho, Perfil, Aro, Índice, Compatibilidad y Precio
  const filteredTires = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tires.filter((t) => {
      if (!t.active) return false;
      if (filterTireBrand && t.brand.toLowerCase() !== filterTireBrand.toLowerCase()) return false;
      if (filterTireWidth && t.width !== filterTireWidth) return false;
      if (filterTireProfile && t.profile !== filterTireProfile) return false;
      if (filterTireRim && t.rimDiameter.toUpperCase() !== filterTireRim.toUpperCase())
        return false;
      if (filterTireIndex) {
        const idxCombined = `${t.loadIndex}${t.speedRating}`.toUpperCase();
        if (!idxCombined.includes(filterTireIndex.toUpperCase())) return false;
      }
      if (vehTireSize && vehTireSize.trim() !== "") {
        const normVehSize = vehTireSize.replace(/\s+/g, "").toUpperCase();
        const normTireSize = t.tireSize.replace(/\s+/g, "").toUpperCase();
        if (!normTireSize.includes(normVehSize)) return false;
      }
      if (onlyCompatibleVerified && (vehBrand || vehModel)) {
        const hasMatch = (t.compatibilities || []).some((c) => {
          const bMatch = !vehBrand || c.brand.toLowerCase().includes(vehBrand.toLowerCase());
          const mMatch = !vehModel || c.model.toLowerCase().includes(vehModel.toLowerCase());
          return bMatch && mMatch;
        });
        if (!hasMatch) return false;
      }
      if (filterMaxPrice && Number(filterMaxPrice) > 0 && t.price > Number(filterMaxPrice)) {
        return false;
      }
      if (filterAvailability === "Disponible" && t.stock <= 0) return false;
      if (q) {
        const hay = `${t.name} ${t.brand} ${t.code} ${t.tireSize} ${t.modelRef} ${t.specifications}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    tires,
    filterTireBrand,
    filterTireWidth,
    filterTireProfile,
    filterTireRim,
    filterTireIndex,
    vehTireSize,
    onlyCompatibleVerified,
    vehBrand,
    vehModel,
    filterMaxPrice,
    filterAvailability,
    searchQuery,
  ]);

  // Chips de filtros activos para poder retirarlos individualmente
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ label: string; onRemove: () => void }> = [];
    if (filterAvailability)
      chips.push({ label: `Disponibilidad: ${filterAvailability}`, onRemove: () => setFilterAvailability("") });
    if (filterAlignmentType)
      chips.push({ label: `Alineación: ${filterAlignmentType}`, onRemove: () => setFilterAlignmentType("") });
    if (filterWheelCount)
      chips.push({ label: `Ruedas: ${filterWheelCount}`, onRemove: () => setFilterWheelCount("") });
    if (filterBalanceType)
      chips.push({ label: `Balanceo: ${filterBalanceType}`, onRemove: () => setFilterBalanceType("") });
    if (filterTireBrand)
      chips.push({ label: `Marca: ${filterTireBrand}`, onRemove: () => setFilterTireBrand("") });
    if (filterTireWidth)
      chips.push({ label: `Ancho: ${filterTireWidth}`, onRemove: () => setFilterTireWidth("") });
    if (filterTireProfile)
      chips.push({ label: `Perfil: ${filterTireProfile}`, onRemove: () => setFilterTireProfile("") });
    if (filterTireRim)
      chips.push({ label: `Aro: ${filterTireRim}`, onRemove: () => setFilterTireRim("") });
    if (filterTireIndex)
      chips.push({ label: `Índice: ${filterTireIndex}`, onRemove: () => setFilterTireIndex("") });
    if (vehTireSize)
      chips.push({ label: `Medida vehículo: ${vehTireSize}`, onRemove: () => setVehTireSize("") });
    if (filterSuspensionComp)
      chips.push({ label: `Suspensión: ${filterSuspensionComp}`, onRemove: () => setFilterSuspensionComp("") });
    if (filterSuspensionType)
      chips.push({ label: `Inspección: ${filterSuspensionType}`, onRemove: () => setFilterSuspensionType("") });
    if (filterBrakeComp)
      chips.push({ label: `Frenos: ${filterBrakeComp}`, onRemove: () => setFilterBrakeComp("") });
    if (filterBrakeServiceType)
      chips.push({ label: `Servicio freno: ${filterBrakeServiceType}`, onRemove: () => setFilterBrakeServiceType("") });
    if (filterDiagType)
      chips.push({ label: `Diagnóstico: ${filterDiagType}`, onRemove: () => setFilterDiagType("") });
    if (filterDiagSystem)
      chips.push({ label: `Sistema: ${filterDiagSystem}`, onRemove: () => setFilterDiagSystem("") });
    if (filterSteeringComp)
      chips.push({ label: `Dirección: ${filterSteeringComp}`, onRemove: () => setFilterSteeringComp("") });
    if (filterSteeringClass)
      chips.push({ label: `Clase insp.: ${filterSteeringClass}`, onRemove: () => setFilterSteeringClass("") });
    if (filterMaxPrice)
      chips.push({ label: `Máx $${filterMaxPrice}`, onRemove: () => setFilterMaxPrice("") });
    return chips;
  }, [
    filterAvailability,
    filterAlignmentType,
    filterWheelCount,
    filterBalanceType,
    filterTireBrand,
    filterTireWidth,
    filterTireProfile,
    filterTireRim,
    filterTireIndex,
    vehTireSize,
    filterSuspensionComp,
    filterSuspensionType,
    filterBrakeComp,
    filterBrakeServiceType,
    filterDiagType,
    filterDiagSystem,
    filterSteeringComp,
    filterSteeringClass,
    filterMaxPrice,
  ]);

  // Toggle Servicio
  const handleToggleService = (srv: TecnicentroEnrichedService) => {
    if (srv.availability === "No disponible") {
      mostrarToast("Este servicio no está disponible actualmente", "err");
      return;
    }
    if (includedInPackagesInfo.srvCodes[srv.code]) {
      mostrarToast(
        `"${srv.name}" ya está incluido dentro de ${includedInPackagesInfo.srvCodes[srv.code]}`,
        "ok"
      );
      return;
    }
    setSelectedServices((prev) => {
      const next = { ...prev };
      if (next[srv.id]) {
        delete next[srv.id];
      } else {
        next[srv.id] = srv.defaultUnitsCount || 1;
      }
      return next;
    });
  };

  // Toggle Paquete
  const handleTogglePackage = (pkg: TecnicentroPackage) => {
    if (pkg.availability === "No disponible") {
      mostrarToast("Este paquete no está disponible", "err");
      return;
    }
    setSelectedPackages((prev) =>
      prev.includes(pkg.id) ? prev.filter((id) => id !== pkg.id) : [...prev, pkg.id]
    );
  };

  // Toggle Adicional
  const handleToggleAddon = (addon: TecnicentroAddon) => {
    if (includedInPackagesInfo.addonIds[addon.id]) {
      mostrarToast(
        `"${addon.name}" ya está incluido sin costo en ${includedInPackagesInfo.addonIds[addon.id]}`,
        "ok"
      );
      return;
    }
    const hasMain =
      selectedPackages.length > 0 ||
      Object.keys(selectedServices).length > 0 ||
      Object.keys(selectedTires).length > 0;
    if (!addon.canBeStandalone && !hasMain && !selectedAddons[addon.id]) {
      mostrarToast(
        `"${addon.name}" se contrata asociado a un servicio o neumático principal.`,
        "err"
      );
      return;
    }
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (next[addon.id]) delete next[addon.id];
      else next[addon.id] = 1;
      return next;
    });
  };

  // Toggle Neumático
  const handleToggleTire = (tire: TecnicentroEnrichedTire, qty = 4) => {
    if (tire.stock <= 0) {
      mostrarToast("Este neumático se encuentra sin stock disponible", "err");
      return;
    }
    setSelectedTires((prev) => {
      const next = { ...prev };
      if (next[tire.id]) {
        delete next[tire.id];
      } else {
        next[tire.id] = Math.min(tire.stock, qty);
      }
      return next;
    });
  };

  // Guardar servicio en Neon
  const handleSaveServiceAdmin = async (srvPayload: any) => {
    const res = await fetch("/api/taller/tecnicentro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SAVE_SERVICE", service: srvPayload }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "Error al guardar servicio", "err");
      throw new Error(data.error || "Error");
    }
    setServices(data.services || []);
    mostrarToast("Servicio guardado en Neon", "ok");
  };

  // Guardar neumático en Neon
  const handleSaveTireAdmin = async (tirePayload: any) => {
    const res = await fetch("/api/taller/tecnicentro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SAVE_TIRE_PRODUCT", tire: tirePayload }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "Error al guardar neumático", "err");
      throw new Error(data.error || "Error");
    }
    setTires(data.tires || []);
    mostrarToast("Neumático guardado en el catálogo de Neon", "ok");
  };

  // Guardar configuración general
  const handleSaveConfigAdmin = async (updated: TecnicentroConfigData) => {
    const res = await fetch("/api/taller/tecnicentro", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: updated }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "Error al guardar configuración", "err");
      throw new Error(data.error || "Error");
    }
    setConfig(data.config);
    setServices(data.services || []);
    setTires(data.tires || []);
  };

  // Confirmar selección e integrar con Orden Activa / Carrito actual
  const handleConfirmToOrder = async (advanceToSignature: boolean) => {
    if (confirmingOrder) return;
    const srvArr = Object.entries(selectedServices).map(([id, quantity]) => ({ id, quantity }));
    const addArr = Object.entries(selectedAddons).map(([id, quantity]) => ({ id, quantity }));
    const tireArr = Object.entries(selectedTires).map(([id, quantity]) => ({ id, quantity }));

    if (
      selectedPackages.length === 0 &&
      srvArr.length === 0 &&
      addArr.length === 0 &&
      tireArr.length === 0
    ) {
      mostrarToast("Selecciona al menos un servicio, paquete o neumático", "err");
      return;
    }

    try {
      setConfirmingOrder(true);
      const res = await fetch("/api/taller/tecnicentro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CALCULAR_Y_VALIDAR_SELECCION",
          vehicleTypeId: selectedVehicleTypeId,
          selectedPackages,
          selectedServices: srvArr,
          selectedAddons: addArr,
          selectedTires: tireArr,
          promoCode: promoCodeInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.calculation) {
        mostrarToast(data.error || "Error al validar precios/stock en el servidor", "err");
        return;
      }

      const calc = data.calculation;
      setServerCalculation(calc);

      const otherAreaItems = (itemsOrden || []).filter((it) => {
        const code = String(it.code || "");
        const cat = String(it.category || "");
        return (
          cat !== "Tecnicentro" &&
          cat !== "Llantera" &&
          cat !== "Neumáticos" &&
          !code.startsWith("TC-") &&
          !code.startsWith("PKG-TC-") &&
          !code.startsWith("ADD-TC-")
        );
      });

      const tecItems = (calc.lines || [])
        .filter((l: any) => !l.alreadyIncludedInPackage)
        .map((l: any) => ({
          id: l.id,
          code: l.code,
          name: l.name,
          category: l.type === "PART" ? "Llantera" : "Tecnicentro",
          subCategory: l.subCategory,
          price: Number(l.unitPrice),
          qty: Number(l.quantity || 1),
          type: l.type,
          quoteRequired: l.quoteRequired,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        }));

      await onActualizarItemsOrden([...otherAreaItems, ...tecItems]);
      mostrarToast(
        `✓ ${tecItems.length} ítem(s) de Tecnicentro agregados a la orden ($${Number(
          calc.total
        ).toFixed(2)})`,
        "ok"
      );

      if (advanceToSignature) {
        onIrAAvisoYFirma();
      }
    } finally {
      setConfirmingOrder(false);
    }
  };

  // Agendar reserva real en Bahía de Tecnicentro
  const handleBookBay = async () => {
    if (savingBooking || !serverCalculation?.lines?.length) return;
    try {
      setSavingBooking(true);
      const summary = serverCalculation.lines
        .map((l: any) => l.name)
        .join(" + ")
        .slice(0, 180);
      const vehDesc =
        `${vehBrand} ${vehModel} ${vehYear}`.trim() ||
        ordenActiva?.vehicle ||
        currentVehicleType?.name ||
        "Vehículo";

      const res = await fetch("/api/taller/tecnicentro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREAR_RESERVA_TECNICENTRO",
          vehicle: vehDesc,
          plate: ordenActiva?.plate || "S/P",
          clientName: ordenActiva?.client || "Cliente Tecnicentro",
          clientPhone: ordenActiva?.clientPhone || "",
          serviceSummary: summary,
          date: bookingDate,
          timeSlot: bookingTimeSlot,
          bay: bookingBay,
          idempotencyKey: `${ordenActiva?.plate || "TC"}-${bookingDate}-${bookingTimeSlot}-${bookingBay}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        mostrarToast(data.error || "No se pudo agendar la bahía", "err");
        return;
      }
      setLastBooking(data.appointment);
      setAppointments((prev) => [data.appointment, ...prev]);
      mostrarToast(
        `📅 Reserva #${data.appointment.appointmentNumber} confirmada en ${bookingBay}`,
        "ok"
      );
    } finally {
      setSavingBooking(false);
    }
  };

  if (loading && !config) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 text-center space-y-2 animate-pulse">
        <div className="text-3xl">🛞</div>
        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          Cargando módulo Tecnicentro, alineación, balanceo, neumáticos y diagnósticos desde Neon...
        </p>
      </div>
    );
  }

  if (errorMsg || !config) {
    return (
      <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-center space-y-3">
        <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
          ⚠️ {errorMsg || "Error al cargar Tecnicentro"}
        </p>
        <button
          type="button"
          onClick={() => void fetchTecnicentroData()}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const showTiresCatalog =
    selectedCategoryId === "TODOS" ||
    selectedCategoryId === "tc_cat_venta_neum" ||
    currentCategory?.filterGroup === "neumaticos";

  const totalSelectedCount =
    selectedPackages.length +
    Object.keys(selectedServices).length +
    Object.keys(selectedAddons).length +
    Object.keys(selectedTires).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* =====================================================================
          CABECERA Y BARRA DE ADMINISTRACIÓN MANUAL DE TECNICENTRO
          ===================================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛞</span>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
              Módulo Tecnicentro: Alineación, Balanceo, Neumáticos, Tren Delantero & Diagnóstico
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Administra servicios, neumáticos, categorías, filtros técnicos y cotizaciones conectados a Neon y Cloudflare R2.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Buscar servicio, medida 205/55 R16..."
              className="w-full h-9 pl-3 pr-7 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 text-xs text-zinc-900 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setServiceFormModal({ open: true, service: null })}
            title="Registrar nuevo servicio"
            className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black cursor-pointer whitespace-nowrap transition-all"
          >
            + Servicio
          </button>

          <button
            type="button"
            onClick={() => setTireFormModal({ open: true, tire: null })}
            title="Registrar nuevo neumático"
            className="h-9 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-black text-xs font-black cursor-pointer whitespace-nowrap transition-all"
          >
            + Neumático
          </button>
        </div>
      </div>

      {/* =====================================================================
          SECCIÓN 4: PANEL COMPACTO «SELECCIONA TU VEHÍCULO»
          ===================================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🚗</span>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Selecciona tu vehículo
            </h3>
            {(vehBrand || vehModel || vehTireSize) && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                Activo: {vehBrand} {vehModel} {vehYear} {vehTireSize ? `• ${vehTireSize}` : ""}
              </span>
            )}
          </div>

          {/* Selector rápido desde vehículos reales registrados en Neon */}
          {vehicles.length > 0 && (
            <select
              onChange={(e) => {
                const v = vehicles.find((x) => x.id === e.target.value);
                if (v) {
                  setVehBrand(v.brand || "");
                  setVehModel(v.model || "");
                  setVehYear(v.year ? String(v.year) : "");
                  setVehEngine(v.fuelType || "");
                }
              }}
              defaultValue=""
              className="h-8 px-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-200"
            >
              <option value="">📋 Cargar desde vehículos registrados ({vehicles.length})...</option>
              {vehicles.slice(0, 40).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} — {v.brand} {v.model} ({v.year || "S/A"})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Botones de Tipo de Vehículo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {activeVehicleTypes.map((vt) => {
            const sel = vt.id === selectedVehicleTypeId;
            return (
              <button
                key={vt.id}
                type="button"
                onClick={() => setSelectedVehicleTypeId(vt.id)}
                className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${
                  sel
                    ? "bg-amber-500 text-black border-amber-600 font-black shadow-xs"
                    : "bg-zinc-50 hover:bg-zinc-100 dark:bg-black/30 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span>{vt.icon}</span>
                <span className="truncate">{vt.name}</span>
              </button>
            );
          })}
        </div>

        {/* Campos Marca, Modelo, Año, Versión, Motor y Medida de Neumático */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          <input
            type="text"
            value={vehBrand}
            onChange={(e) => setVehBrand(e.target.value)}
            placeholder="Marca (ej. Toyota)"
            className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 text-xs"
          />
          <input
            type="text"
            value={vehModel}
            onChange={(e) => setVehModel(e.target.value)}
            placeholder="Modelo (ej. Corolla / Hilux)"
            className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 text-xs"
          />
          <input
            type="text"
            value={vehYear}
            onChange={(e) => setVehYear(e.target.value)}
            placeholder="Año (ej. 2021)"
            className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 text-xs font-mono"
          />
          <input
            type="text"
            value={vehVersion}
            onChange={(e) => setVehVersion(e.target.value)}
            placeholder="Versión (ej. SE / 4x4)"
            className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 text-xs"
          />
          <input
            type="text"
            value={vehEngine}
            onChange={(e) => setVehEngine(e.target.value)}
            placeholder="Motor (ej. 1.8L / 2.8 TD)"
            className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 text-xs"
          />
          <input
            type="text"
            value={vehTireSize}
            onChange={(e) => setVehTireSize(e.target.value)}
            placeholder="Medida llanta (ej. 205/55 R16)"
            className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 text-xs font-mono"
          />
        </div>
      </div>

      {/* =====================================================================
          SECCIÓN 2: LAS 15 TARJETAS PRINCIPALES DE TECNICENTRO
          ===================================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Categorías Principales de Servicios de Tecnicentro ({activeCategories.length})
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Selecciona una tarjeta para filtrar sus subcategorías, filtros técnicos y servicios específicos
            </p>
          </div>

          {selectedCategoryId !== "TODOS" && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId("TODOS");
                setSelectedSubcategoryId("TODOS");
                clearCategorySpecificFilters();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer self-start sm:self-auto"
            >
              ✕ Mostrar todas las categorías (15)
            </button>
          )}
        </div>

        {/* Cuadrícula adaptable de las 15 tarjetas principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {activeCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const firstCatService = services.find(
              (s) => s.categoryId === cat.id && s.active
            );

            return (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedCategoryId(isSelected ? "TODOS" : cat.id);
                  setSelectedSubcategoryId("TODOS");
                  clearCategorySpecificFilters();
                }}
                className={`group rounded-2xl border overflow-hidden flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-50/90 dark:bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40 shadow-lg"
                    : "bg-white hover:bg-zinc-50 dark:bg-black/30 border-zinc-200 dark:border-white/10 shadow-xs hover:shadow-md"
                }`}
              >
                <div>
                  <div className="relative h-28 w-full bg-zinc-900 overflow-hidden">
                    <img
                      src={cat.imageUrl || FALLBACK_TEC_IMG}
                      alt={cat.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_TEC_IMG;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          cat.availability === "Disponible"
                            ? "bg-emerald-500/90 text-white"
                            : cat.availability === "No disponible"
                            ? "bg-rose-500/90 text-white"
                            : "bg-amber-500/90 text-black"
                        }`}
                      >
                        {cat.availability}
                      </span>

                      {cat.estimatedMinutes && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-black/65 text-white">
                          ⏱️ {cat.estimatedMinutes}m
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center gap-1.5">
                      <span className="text-base leading-none">{cat.icon}</span>
                      <h4 className="text-xs font-black text-white leading-tight line-clamp-2">
                        {cat.name}
                      </h4>
                    </div>
                  </div>

                  <div className="p-3 space-y-1.5">
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-snug">
                      {cat.shortDescription}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                      <span>Vehículos: Todos</span>
                      {cat.startingPrice && cat.startingPrice > 0 ? (
                        <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                          Desde ${Number(cat.startingPrice).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-500">
                          Por cotizar
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-3 pb-3 pt-1.5 border-t border-zinc-100 dark:border-white/5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategoryId(cat.id);
                      setSelectedSubcategoryId("TODOS");
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 text-[11px] font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer"
                  >
                    Ver servicio
                  </button>
                  {firstCatService && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleService(firstCatService);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black cursor-pointer ${
                        selectedServices[firstCatService.id]
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-500 hover:bg-amber-600 text-black"
                      }`}
                    >
                      {selectedServices[firstCatService.id] ? "✓" : "Seleccionar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fila de Subcategorías de la Categoría Seleccionada (Sección 3) */}
        {activeSubcategories.length > 0 && (
          <div className="pt-3 border-t border-zinc-100 dark:border-white/5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedSubcategoryId("TODOS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                selectedSubcategoryId === "TODOS"
                  ? "bg-amber-500 text-black"
                  : "bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              Todas
            </button>
            {activeSubcategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubcategoryId(sub.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  selectedSubcategoryId === sub.id
                    ? "bg-amber-500 text-black"
                    : "bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span>{sub.icon}</span>
                <span>{sub.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          SECCIÓN 5: FILTROS ESPECÍFICOS POR CATEGORÍA SELECCIONADA
          ===================================================================== */}
      {selectedCategoryId !== "TODOS" && currentCategory && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/50 dark:bg-amber-500/[0.04] border border-amber-200/80 dark:border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <span>🎛️</span> Filtros Específicos para {currentCategory.name}
            </span>
            {activeFilterChips.length > 0 && (
              <button
                type="button"
                onClick={clearCategorySpecificFilters}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Limpiar filtros ({activeFilterChips.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Filtro de Alineación */}
            {currentCategory.filterGroup === "alineacion" && (
              <select
                value={filterAlignmentType}
                onChange={(e) => setFilterAlignmentType(e.target.value)}
                className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
              >
                <option value="">Todos los tipos de alineación</option>
                {config.filterOptions.alignmentTypes.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {/* Filtro de Balanceo */}
            {currentCategory.filterGroup === "balanceo" && (
              <>
                <select
                  value={filterWheelCount}
                  onChange={(e) => setFilterWheelCount(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Cantidad de ruedas (Todas)</option>
                  {config.filterOptions.balanceWheelCounts.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  value={filterBalanceType}
                  onChange={(e) => setFilterBalanceType(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Tipo de balanceo (Todos)</option>
                  {config.filterOptions.balanceServiceTypes.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Filtro de Neumáticos */}
            {currentCategory.filterGroup === "neumaticos" && (
              <>
                <select
                  value={filterTireBrand}
                  onChange={(e) => setFilterTireBrand(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Marca de neumático (Todas)</option>
                  {config.filterOptions.tireBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <select
                  value={filterTireWidth}
                  onChange={(e) => setFilterTireWidth(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Ancho mm (Todos)</option>
                  {config.filterOptions.tireWidths.map((w) => (
                    <option key={w} value={w}>
                      {w} mm
                    </option>
                  ))}
                </select>
                <select
                  value={filterTireProfile}
                  onChange={(e) => setFilterTireProfile(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Perfil / Serie (Todos)</option>
                  {config.filterOptions.tireProfiles.map((p) => (
                    <option key={p} value={p}>
                      Serie {p}
                    </option>
                  ))}
                </select>
                <select
                  value={filterTireRim}
                  onChange={(e) => setFilterTireRim(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Diámetro de Aro (Todos)</option>
                  {config.filterOptions.tireRimDiameters.map((r) => (
                    <option key={r} value={r}>
                      Aro {r}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Filtro de Suspensión */}
            {currentCategory.filterGroup === "suspension" && (
              <>
                <select
                  value={filterSuspensionComp}
                  onChange={(e) => setFilterSuspensionComp(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Componente de suspensión (Todos)</option>
                  {config.filterOptions.suspensionComponents.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={filterSuspensionType}
                  onChange={(e) => setFilterSuspensionType(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Tipo de inspección (Todos)</option>
                  {config.filterOptions.suspensionInspectionTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Filtro de Frenos */}
            {currentCategory.filterGroup === "frenos" && (
              <>
                <select
                  value={filterBrakeComp}
                  onChange={(e) => setFilterBrakeComp(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Componente de frenos (Todos)</option>
                  {config.filterOptions.brakeComponents.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={filterBrakeServiceType}
                  onChange={(e) => setFilterBrakeServiceType(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Tipo de servicio (Todos)</option>
                  {config.filterOptions.brakeServiceTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Filtro de Diagnóstico / Escaneo */}
            {currentCategory.filterGroup === "diagnostico" && (
              <>
                <select
                  value={filterDiagType}
                  onChange={(e) => setFilterDiagType(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Tipo de diagnóstico (Todos)</option>
                  {config.filterOptions.diagnosticTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  value={filterDiagSystem}
                  onChange={(e) => setFilterDiagSystem(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Sistema electrónico (Todos)</option>
                  {config.filterOptions.diagnosticSystems.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Filtro de Dirección y Tren Delantero / Posterior */}
            {currentCategory.filterGroup === "direccion" && (
              <>
                <select
                  value={filterSteeringComp}
                  onChange={(e) => setFilterSteeringComp(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Componente dirección / tren (Todos)</option>
                  {config.filterOptions.steeringComponents.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={filterSteeringClass}
                  onChange={(e) => setFilterSteeringClass(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
                >
                  <option value="">Clase de inspección (Todas)</option>
                  {config.filterOptions.steeringInspectionClasses.map((cl) => (
                    <option key={cl} value={cl}>
                      {cl}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Disponibilidad y Precio máximo */}
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-800 text-xs"
            >
              <option value="">Disponibilidad (Todas)</option>
              <option value="Disponible">Disponible ahora</option>
              <option value="Sujeto a cupo">Sujeto a cupo</option>
            </select>

            <input
              type="number"
              value={filterMaxPrice}
              onChange={(e) => setFilterMaxPrice(e.target.value)}
              placeholder="Precio máximo ($)"
              className="h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs font-mono"
            />
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeFilterChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={chip.onRemove}
                  className="px-2.5 py-1 rounded-full bg-amber-500 text-black text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>{chip.label}</span>
                  <span>✕</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SECCIÓN 8: PAQUETES CONFIGURABLES DE TECNICENTRO
          ===================================================================== */}
      {config.packages.filter((p) => p.active).length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <span>⭐</span> Paquetes Preventivos y Combos de Tecnicentro ({currentVehicleType?.name})
            </h3>
            <button
              type="button"
              onClick={() => setConfigModalOpen(true)}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              ✏️ Configurar paquetes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {config.packages
              .filter((p) => p.active)
              .map((pkg) => {
                const isSel = selectedPackages.includes(pkg.id);
                const priceInfo = getPriceDisplayForItem(pkg, selectedVehicleTypeId);
                return (
                  <div
                    key={pkg.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                      isSel
                        ? "bg-amber-50 dark:bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40 shadow-md"
                        : "bg-zinc-50/70 dark:bg-black/30 border-zinc-200 dark:border-white/10"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase">
                          {pkg.badgeText || "Paquete"}
                        </span>
                        <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                          {priceInfo.price ? `$${priceInfo.price.toFixed(2)}` : "Por cotizar"}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">
                        {pkg.name}
                      </h4>
                      <ul className="space-y-1">
                        {(pkg.includedServicesList || []).map((inc, i) => (
                          <li
                            key={i}
                            className="text-[11px] text-zinc-600 dark:text-zinc-300 flex items-start gap-1.5"
                          >
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{inc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-zinc-200/60 dark:border-white/5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailModal({ item: pkg, kind: "PACKAGE" })}
                        className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-white/15 text-[11px] font-bold cursor-pointer"
                      >
                        Detalles
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePackage(pkg)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                          isSel
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 hover:bg-amber-600 text-black"
                        }`}
                      >
                        {isSel ? "✓ Seleccionado" : "+ Seleccionar"}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =====================================================================
          CATÁLOGO DE SERVICIOS DE TECNICENTRO FILTRADOS
          ===================================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              🔧 Servicios Técnicos Disponibles ({filteredServices.length})
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Las inspecciones diagnósticas y la mano de obra se distinguen claramente del reemplazo de repuestos
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setServiceFormModal({
                open: true,
                service:
                  selectedCategoryId !== "TODOS" ? { categoryId: selectedCategoryId } : null,
              })
            }
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer"
          >
            + Registrar servicio
          </button>
        </div>

        {filteredServices.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-dashed border-zinc-300 dark:border-white/10 text-center space-y-2">
            <p className="text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-400">
              No se encontraron servicios que coincidan con los filtros seleccionados.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId("TODOS");
                setSelectedSubcategoryId("TODOS");
                clearCategorySpecificFilters();
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold cursor-pointer"
            >
              Mostrar todos los servicios
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((srv) => {
              const selectedQty = selectedServices[srv.id] || 0;
              const isSel = selectedQty > 0;
              const inPkgName = includedInPackagesInfo.srvCodes[srv.code];
              const priceInfo = getPriceDisplayForItem(srv, selectedVehicleTypeId);
              const allowsMultiUnits =
                srv.pricingMode === "PER_WHEEL" ||
                srv.pricingMode === "PER_AXLE" ||
                srv.pricingMode === "PER_COMPONENT";

              return (
                <div
                  key={srv.id}
                  className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all ${
                    inPkgName
                      ? "bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-400"
                      : isSel
                      ? "bg-amber-50/90 dark:bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40 shadow-lg"
                      : "bg-white dark:bg-black/30 border-zinc-200 dark:border-white/10 shadow-xs hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="relative h-36 w-full bg-zinc-900 overflow-hidden">
                      <img
                        src={srv.imageUrl || FALLBACK_TEC_IMG}
                        alt={srv.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_TEC_IMG;
                        }}
                        className="w-full h-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white">
                          {srv.availability}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/65 text-white">
                            ⏱️ {srv.estimatedMinutes} min
                          </span>
                          <button
                            type="button"
                            onClick={() => setServiceFormModal({ open: true, service: srv })}
                            className="w-6 h-6 rounded-full bg-white/90 text-zinc-900 text-xs flex items-center justify-center cursor-pointer"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>

                      <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono text-zinc-300 block">
                            {srv.code}
                          </span>
                          <h4 className="text-xs sm:text-sm font-black text-white leading-snug line-clamp-2">
                            {srv.name}
                          </h4>
                        </div>
                        <div className="text-right shrink-0">
                          {priceInfo.quoteRequired || !priceInfo.price ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black">
                              Por cotizar
                            </span>
                          ) : (
                            <div>
                              <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                                ${priceInfo.price.toFixed(2)}
                              </span>
                              {allowsMultiUnits && (
                                <span className="text-[9px] text-zinc-300 block">
                                  {srv.pricingMode === "PER_WHEEL"
                                    ? "c/rueda"
                                    : srv.pricingMode === "PER_AXLE"
                                    ? "c/eje"
                                    : "c/comp."}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-2">
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                        {srv.shortDescription}
                      </p>
                      {srv.conditionsText && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-1 rounded-lg">
                          📌 {srv.conditionsText}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-3.5 pb-3.5 pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailModal({ item: srv, kind: "SERVICE" })}
                      className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-bold cursor-pointer"
                    >
                      Ver servicio
                    </button>

                    {inPkgName ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                        ✓ Incluido en Paquete
                      </span>
                    ) : isSel && allowsMultiUnits ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedServices((prev) => {
                              const next = { ...prev };
                              if (next[srv.id] <= 1) delete next[srv.id];
                              else next[srv.id] -= 1;
                              return next;
                            })
                          }
                          className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-white/10 text-xs font-black cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-black px-1">
                          {selectedQty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedServices((prev) => ({
                              ...prev,
                              [srv.id]: (prev[srv.id] || 1) + 1,
                            }))
                          }
                          className="w-7 h-7 rounded-lg bg-amber-500 text-black text-xs font-black cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleService(srv)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black cursor-pointer ${
                          isSel
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 hover:bg-amber-600 text-black"
                        }`}
                      >
                        {isSel ? "✓ Seleccionado" : "Seleccionar"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================================
          SECCIÓN 10: CATÁLOGO DE VENTA DE NEUMÁTICOS Y ESPECIFICACIONES REALES
          ===================================================================== */}
      {showTiresCatalog && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <span>🛞</span> Catálogo de Neumáticos por Medida, Marca e Índice Técnico (
                {filteredTires.length})
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                El precio corresponde al neumático físico; puedes agregar el servicio de montaje y balanceo sin duplicar cargos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyCompatibleVerified}
                  onChange={(e) => setOnlyCompatibleVerified(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Solo compatibilidad verificada con mi vehículo</span>
              </label>
              <button
                type="button"
                onClick={() => setTireFormModal({ open: true, tire: null })}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-black text-xs font-black cursor-pointer"
              >
                + Registrar Neumático
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredTires.map((tire) => {
              const qtySel = selectedTires[tire.id] || 0;
              const isSel = qtySel > 0;
              return (
                <div
                  key={tire.id}
                  className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all ${
                    isSel
                      ? "bg-sky-50/90 dark:bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/40 shadow-lg"
                      : "bg-zinc-50/60 dark:bg-black/30 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  <div>
                    <div className="relative h-36 w-full bg-zinc-900 overflow-hidden">
                      <img
                        src={tire.imageUrl || FALLBACK_TEC_IMG}
                        alt={tire.name}
                        className="w-full h-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black font-mono">
                          {tire.tireSize} ({tire.loadIndex}
                          {tire.speedRating})
                        </span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tire.stock > 0
                                ? "bg-emerald-500 text-white"
                                : "bg-rose-500 text-white"
                            }`}
                          >
                            Stock: {tire.stock}
                          </span>
                          <button
                            type="button"
                            onClick={() => setTireFormModal({ open: true, tire })}
                            className="w-6 h-6 rounded-full bg-white/90 text-zinc-900 text-xs flex items-center justify-center cursor-pointer"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-amber-300 block">
                            {tire.brand} • {tire.modelRef}
                          </span>
                          <h4 className="text-xs font-black text-white line-clamp-1">
                            {tire.name}
                          </h4>
                        </div>
                        <span className="text-base font-black text-white font-mono">
                          ${tire.price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 space-y-1.5">
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2">
                        {tire.specifications}
                      </p>
                      <span className="text-[10px] text-zinc-500 block">
                        {tire.includesInstallation
                          ? "✓ Incluye montaje básico"
                          : "ℹ️ Montaje y balanceo se cotizan en servicios"}
                      </span>
                    </div>
                  </div>

                  <div className="px-3 pb-3 pt-2 border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailModal({ item: tire, kind: "TIRE" })}
                      className="px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-white/15 text-[11px] font-bold cursor-pointer"
                    >
                      Detalles
                    </button>

                    {isSel ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTires((prev) => {
                              const next = { ...prev };
                              if (next[tire.id] <= 1) delete next[tire.id];
                              else next[tire.id] -= 1;
                              return next;
                            })
                          }
                          className="w-7 h-7 rounded-lg bg-zinc-200 dark:bg-white/10 text-xs font-black cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-black px-1">{qtySel}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTires((prev) => ({
                              ...prev,
                              [tire.id]: Math.min(tire.stock, (prev[tire.id] || 1) + 1),
                            }))
                          }
                          className="w-7 h-7 rounded-lg bg-sky-500 text-black text-xs font-black cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={tire.stock <= 0}
                        onClick={() => handleToggleTire(tire, 4)}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-black text-xs font-black cursor-pointer disabled:opacity-50"
                      >
                        + Agregar Neumático
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECCIÓN 9: SERVICIOS ADICIONALES E INSUMOS COMPLEMENTARIOS
          ===================================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-3">
        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
          ➕ Complementos, Válvulas, Pesas e Inspecciones Adicionales
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {config.addons
            .filter((a) => a.active)
            .map((addon) => {
              const inPkgName = includedInPackagesInfo.addonIds[addon.id];
              const isSel = Boolean(selectedAddons[addon.id]);
              return (
                <div
                  key={addon.id}
                  onClick={() => handleToggleAddon(addon)}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    inPkgName
                      ? "bg-emerald-50/80 dark:bg-emerald-500/15 border-emerald-400"
                      : isSel
                      ? "bg-amber-50 dark:bg-amber-500/20 border-amber-500 ring-1 ring-amber-500/30"
                      : "bg-zinc-50/70 hover:bg-zinc-100 dark:bg-black/30 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">{addon.name}</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {addon.description}
                    </span>
                  </div>
                  {inPkgName ? (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                      ✓ Incluido ($0)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-xs font-black shrink-0">
                      {isSel ? "✓ " : "+"}${Number(addon.price || 0).toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* =====================================================================
          SECCIÓN 7 Y 11: RESUMEN DESGLOSADO VALIDADO EN SERVIDOR Y ATENCIÓN / RESERVA
          ===================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-900 text-white border border-white/10 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">
              Resumen de Atención y Desglose de Tecnicentro (Validado en Servidor)
            </h3>
            <p className="text-xs text-zinc-400">
              Distingue entre Mano de Obra / Servicios, Paquetes, Adicionales y Neumáticos / Repuestos
            </p>
          </div>
          {totalSelectedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedPackages([]);
                setSelectedServices({});
                setSelectedAddons({});
                setSelectedTires({});
                setServerCalculation(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-zinc-300 cursor-pointer"
            >
              🗑️ Limpiar selección
            </button>
          )}
        </div>

        {totalSelectedCount === 0 ? (
          <div className="py-5 text-center text-xs sm:text-sm text-zinc-400">
            Selecciona una tarjeta de alineación, balanceo, neumáticos, frenos o diagnóstico arriba para calcular el resumen.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-2">
              {(serverCalculation?.lines || []).map((line: any, i: number) => (
                <div
                  key={`${line.code}-${i}`}
                  className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          line.type === "PART"
                            ? "bg-sky-500/20 text-sky-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {line.type === "PART" ? "NEUMÁTICO / REPUESTO" : "MANO DE OBRA / SERVICIO"}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {line.name}
                      </span>
                    </div>
                    {line.notes && (
                      <span className="text-[11px] text-zinc-400 block mt-0.5">
                        {line.notes}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {line.alreadyIncludedInPackage ? (
                      <span className="text-xs font-bold text-emerald-400">Incluido ($0)</span>
                    ) : line.quoteRequired ? (
                      <span className="text-xs font-bold text-amber-300">Por cotizar</span>
                    ) : (
                      <span className="font-mono text-sm font-black text-amber-400">
                        {line.quantity > 1 ? `${line.quantity} x $${line.unitPrice.toFixed(2)} = ` : ""}
                        ${Number(line.lineTotal).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-5 p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
              <div className="flex justify-between text-xs text-zinc-300">
                <span>🔧 Mano de obra y servicios:</span>
                <span className="font-mono">
                  ${Number(serverCalculation?.breakdown?.laborTotal || 0).toFixed(2)}
                </span>
              </div>
              {serverCalculation?.breakdown?.packagesTotal > 0 && (
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>⭐ Paquetes Tecnicentro:</span>
                  <span className="font-mono">
                    ${Number(serverCalculation.breakdown.packagesTotal).toFixed(2)}
                  </span>
                </div>
              )}
              {serverCalculation?.breakdown?.addonsTotal > 0 && (
                <div className="flex justify-between text-xs text-zinc-300">
                  <span>➕ Servicios adicionales:</span>
                  <span className="font-mono">
                    ${Number(serverCalculation.breakdown.addonsTotal).toFixed(2)}
                  </span>
                </div>
              )}
              {serverCalculation?.breakdown?.partsAndTiresTotal > 0 && (
                <div className="flex justify-between text-xs text-sky-300">
                  <span>🛞 Neumáticos y repuestos:</span>
                  <span className="font-mono">
                    ${Number(serverCalculation.breakdown.partsAndTiresTotal).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs text-zinc-400">
                <span>⏱️ Duración total estimada:</span>
                <span className="font-mono font-bold text-white">
                  {serverCalculation?.totalMinutes || 0} min
                </span>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-sm font-black uppercase text-amber-400">
                  Total Validado:
                </span>
                <span className="text-2xl font-black font-mono text-amber-400">
                  {calculatingServer
                    ? "..."
                    : `$${Number(serverCalculation?.total || 0).toFixed(2)}`}
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={confirmingOrder || calculatingServer}
                  onClick={() => void handleConfirmToOrder(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs sm:text-sm font-black cursor-pointer"
                >
                  ✓ Agregar al Carrito / Orden Activa
                </button>
                <button
                  type="button"
                  disabled={confirmingOrder || calculatingServer}
                  onClick={() => void handleConfirmToOrder(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs sm:text-sm font-black cursor-pointer"
                >
                  📲 Continuar a Aviso / Firma / POS →
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookingPanel((p) => !p)}
                  className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer"
                >
                  📅 {showBookingPanel ? "Ocultar Reserva" : "Agendar Reserva en Bahía"}
                </button>
              </div>

              {showBookingPanel && (
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2.5 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="h-8 px-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                    />
                    <select
                      value={bookingBay}
                      onChange={(e) => setBookingBay(e.target.value)}
                      className="h-8 px-2 rounded-lg bg-zinc-900 border border-white/15 text-xs text-white"
                    >
                      {config.bays.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {HORARIOS_BAHIA.map((slot) => {
                      const busy = appointments.some(
                        (a) =>
                          a.date === bookingDate &&
                          a.timeSlot === slot &&
                          a.bay === bookingBay
                      );
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={busy}
                          onClick={() => setBookingTimeSlot(slot)}
                          className={`py-1 rounded text-[10px] font-mono font-bold cursor-pointer ${
                            busy
                              ? "bg-rose-500/20 text-rose-300 line-through"
                              : bookingTimeSlot === slot
                              ? "bg-amber-500 text-black"
                              : "bg-black/50 text-zinc-300"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={savingBooking}
                    onClick={() => void handleBookBay()}
                    className="w-full py-2 rounded-xl bg-sky-500 text-black text-xs font-black cursor-pointer"
                  >
                    {savingBooking ? "Agendando..." : "✓ Confirmar Reserva en Bahía"}
                  </button>
                  {lastBooking && (
                    <p className="text-[11px] text-emerald-300">
                      ✓ Reserva #{lastBooking.appointmentNumber} registrada ({lastBooking.date}{" "}
                      {lastBooking.timeSlot}).
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {detailModal && (
        <ModalDetalleTecnicentro
          item={detailModal.item}
          kind={detailModal.kind}
          config={config}
          selectedVehicleTypeId={selectedVehicleTypeId}
          isSelected={
            detailModal.kind === "PACKAGE"
              ? selectedPackages.includes(detailModal.item.id)
              : detailModal.kind === "TIRE"
              ? Boolean(selectedTires[detailModal.item.id])
              : Boolean(selectedServices[detailModal.item.id])
          }
          onToggleSelect={() => {
            if (detailModal.kind === "PACKAGE") {
              handleTogglePackage(detailModal.item as TecnicentroPackage);
            } else if (detailModal.kind === "TIRE") {
              handleToggleTire(detailModal.item as TecnicentroEnrichedTire, 4);
            } else {
              handleToggleService(detailModal.item as TecnicentroEnrichedService);
            }
          }}
          onEdit={() => {
            const k = detailModal.kind;
            const it = detailModal.item;
            setDetailModal(null);
            if (k === "SERVICE") setServiceFormModal({ open: true, service: it as any });
            else if (k === "TIRE") setTireFormModal({ open: true, tire: it as any });
            else setConfigModalOpen(true);
          }}
          onClose={() => setDetailModal(null)}
        />
      )}

      {serviceFormModal.open && (
        <ModalServicioTecnicentroForm
          initialService={serviceFormModal.service}
          config={config}
          onSave={handleSaveServiceAdmin}
          onClose={() => setServiceFormModal({ open: false, service: null })}
          mostrarToast={mostrarToast}
        />
      )}

      {tireFormModal.open && (
        <ModalNeumaticoProductoForm
          initialTire={tireFormModal.tire}
          config={config}
          onSave={handleSaveTireAdmin}
          onClose={() => setTireFormModal({ open: false, tire: null })}
          mostrarToast={mostrarToast}
        />
      )}

      {configModalOpen && (
        <ModalConfiguracionTecnicentro
          config={config}
          onSaveConfig={handleSaveConfigAdmin}
          onClose={() => setConfigModalOpen(false)}
          mostrarToast={mostrarToast}
        />
      )}
    </div>
  );
}
