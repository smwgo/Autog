"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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

const TECNICENTRO_CAT_SINGLE: Record<string, string> = {
  "Todas": "Todas",
  "Alineación": "Alineación",
  "Alineación 3D": "Alineación",
  "Balanceo": "Balanceo",
  "Balanceo Dinámico": "Balanceo",
  "Montaje y desmontaje de llantas": "Montaje",
  "Montaje": "Montaje",
  "Reparación de neumáticos": "Reparación",
  "Reparación": "Reparación",
  "Rotación de neumáticos": "Rotación",
  "Rotación": "Rotación",
  "Venta de Neumáticos": "Neumáticos",
  "Venta de neumáticos": "Neumáticos",
  "Neumáticos": "Neumáticos",
  "Suspensión": "Suspensión",
  "Tren Delantero & Suspensión": "Suspensión",
  "Frenos": "Frenos",
  "Frenos & Discos": "Frenos",
  "Dirección": "Dirección",
  "Diagnóstico": "Diagnóstico",
  "Diagnóstico automotriz": "Diagnóstico",
  "Diagnóstico Computarizado": "Diagnóstico",
  "Revisión de tren delantero": "Delantero",
  "Revisión de tren posterior": "Posterior",
  "Revisión de neumáticos y presión": "Presión",
  "Escaneo": "Escaneo",
  "Escaneo electrónico": "Escaneo",
  "Mantenimiento Preventivo": "Mantenimiento",
  "Servicios Rápidos": "Rápidos",
  "Llantera & Enllantaje": "Llantera",
  "Otros servicios de tecnicentro": "Otros",
};

const TECNICENTRO_VEH_SINGLE: Record<string, string> = {
  "Motocicleta": "Moto",
  "Moto": "Moto",
  "Automóvil": "Auto",
  "Automóvil pequeño": "Auto",
  "Sedán": "Auto",
  "Sedan": "Auto",
  "Hatchback": "Auto",
  "Auto": "Auto",
  "Sedán / Hatchback": "Auto",
  "SUV": "SUV",
  "SUV / Crossover": "SUV",
  "Camioneta": "Camioneta",
  "Pickup": "Camioneta",
  "Pickup / Camioneta": "Camioneta",
  "Furgoneta": "Pesado",
  "Van": "Pesado",
  "Van / Utilitario": "Pesado",
  "Camión Liviano": "Pesado",
  "Camión": "Pesado",
  "Utilitario / Mayor tamaño": "Pesado",
  "Utilitario": "Pesado",
  "Pesado": "Pesado",
};

function toSingleWord(text: string, dict: Record<string, string>): string {
  if (!text) return "";
  if (dict[text]) return dict[text];
  const cleaned = text
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[&/\\].*$/, "")
    .trim();
  const first = cleaned.split(/[\s/+,&]+/)[0];
  return first || text;
}

function matchesVehicleType(applicable?: string[], currentVtId?: string): boolean {
  if (!applicable || applicable.length === 0) return true;
  if (!currentVtId) return true;
  if (applicable.includes(currentVtId)) return true;
  if (currentVtId === "vt_sedan") {
    if (applicable.includes("vt_automovil") || applicable.includes("vt_hatchback")) return true;
  }
  if (currentVtId === "vt_pesado") {
    if (applicable.includes("vt_furgoneta")) return true;
  }
  return false;
}

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

  const [verTodoElCatalogo, setVerTodoElCatalogo] = useState<boolean>(false);
  const [filtroCategoriaGeneral, setFiltroCategoriaGeneral] = useState<string>("");
  const [menuFiltroCatalogoAbierto, setMenuFiltroCatalogoAbierto] = useState<boolean>(false);
  const menuFiltroCatalogoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuFiltroCatalogoRef.current && !menuFiltroCatalogoRef.current.contains(e.target as Node)) {
        setMenuFiltroCatalogoAbierto(false);
      }
    };
    if (menuFiltroCatalogoAbierto) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuFiltroCatalogoAbierto]);

  const [manualServicioTexto, setManualServicioTexto] = useState<string>("");
  const [manualServicioPrecio, setManualServicioPrecio] = useState<string>("");
  const [manualTiempoEstimado, setManualTiempoEstimado] = useState<number>(45);
  const [manualCantidad, setManualCantidad] = useState<number>(1);

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

    const activeVehicleTypes = useMemo(() => {
    const list = (config?.vehicleTypes || []).filter((v) => v.active);
    const principales = list.filter(
      (v) =>
        v.id === "vt_motocicleta" ||
        v.id === "vt_sedan" ||
        v.id === "vt_suv" ||
        v.id === "vt_camioneta" ||
        v.id === "vt_pesado" ||
        (v.id === "vt_automovil" && !list.some((x) => x.id === "vt_sedan")) ||
        (v.id === "vt_furgoneta" && !list.some((x) => x.id === "vt_pesado"))
    );
    const result = principales.length > 0 ? principales : list;
    const orderMap = [
      "vt_motocicleta",
      "vt_sedan",
      "vt_automovil",
      "vt_suv",
      "vt_camioneta",
      "vt_pesado",
      "vt_furgoneta",
    ];
    return result.sort((a, b) => {
      const idxA = orderMap.indexOf(a.id);
      const idxB = orderMap.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.order - b.order;
    });
  }, [config]);

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

  // Adaptar panel Manual automáticamente al seleccionar categoría (horizontal / vertical), subcategoría o tipo de vehículo
  useEffect(() => {
    let nombre = "";
    let precio = 0;
    let minutos = 45;

    if (selectedSubcategoryId && selectedSubcategoryId !== "TODOS") {
      const sub = config?.subcategories?.find((s) => s.id === selectedSubcategoryId);
      const srv =
        services.find((s) => s.subcategoryId === selectedSubcategoryId && s.active) ||
        services.find((s) => s.subcategoryId === selectedSubcategoryId);
      if (srv) {
        nombre = srv.name;
        const pInfo = getPriceDisplayForItem(srv, selectedVehicleTypeId);
        if (pInfo.price) precio = pInfo.price;
        if (srv.estimatedMinutes) minutos = srv.estimatedMinutes;
      } else if (sub) {
        nombre = sub.name;
        const catSrv = services.find((s) => s.categoryId === sub.categoryId && s.active);
        if (catSrv) {
          const pInfo = getPriceDisplayForItem(catSrv, selectedVehicleTypeId);
          if (pInfo.price) precio = pInfo.price;
          if (catSrv.estimatedMinutes) minutos = catSrv.estimatedMinutes;
        }
      }
    } else if (selectedCategoryId && selectedCategoryId !== "TODOS") {
      const cat = config?.categories?.find((c) => c.id === selectedCategoryId);
      const srv =
        services.find((s) => s.categoryId === selectedCategoryId && s.active) ||
        services.find((s) => s.categoryId === selectedCategoryId);
      if (srv) {
        nombre = srv.name;
        const pInfo = getPriceDisplayForItem(srv, selectedVehicleTypeId);
        if (pInfo.price) precio = pInfo.price;
        if (srv.estimatedMinutes) minutos = srv.estimatedMinutes;
      } else if (cat) {
        nombre = cat.name;
        if (cat.startingPrice) precio = Number(cat.startingPrice);
        if (cat.estimatedMinutes) minutos = cat.estimatedMinutes;
      } else if (selectedCategoryId === "tc_cat_venta_neum" && tires.length > 0) {
        const t = tires[0];
        nombre = t.name || `${t.brand} ${t.tireSize || ""}`.trim();
        precio = Number(t.price) || 55;
        minutos = 25;
      }
    } else {
      // Caso "TODOS": primer servicio sugerido del catálogo
      const firstSrv = services.find((s) => s.active) || services[0];
      if (firstSrv) {
        nombre = firstSrv.name;
        const pInfo = getPriceDisplayForItem(firstSrv, selectedVehicleTypeId);
        if (pInfo.price) precio = pInfo.price;
        if (firstSrv.estimatedMinutes) minutos = firstSrv.estimatedMinutes;
      } else {
        nombre = "Alineación y Balanceo General";
        precio = 15;
        minutos = 35;
      }
    }

    if (nombre) {
      setManualServicioTexto(nombre);
      setManualServicioPrecio(precio > 0 ? precio.toFixed(2) : "0.00");
      setManualTiempoEstimado(minutos > 0 ? minutos : 45);
      setManualCantidad(1);
    }
  }, [
    selectedCategoryId,
    selectedSubcategoryId,
    selectedVehicleTypeId,
    config,
    services,
    tires,
  ]);

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

  const handleAgregarDirectoItem = async (item: any) => {
    try {
      const code = item.code || `TC-${Math.floor(100 + Math.random() * 900)}`;
      const nuevoItem = {
        id: `tec_${item.id}_${Date.now()}`,
        key: `key_${item.id}_${Date.now()}`,
        type: item.kind === "TIRE" ? "PART" : "SERVICE",
        category: item.kind === "TIRE" ? "Neumáticos" : "Tecnicentro",
        subCategory: item.kind === "PACKAGE" ? "Paquete" : item.kind === "ADDON" ? "Extra" : item.kind === "TIRE" ? "Neumático" : "Servicio",
        code,
        name: `${item.name} (${currentVehicleType?.name || "General"})`,
        brand: item.brand || "Tecnicentro",
        presentation: item.presentation || "Servicio",
        unitOfMeasure: item.kind === "TIRE" ? "Unidad" : "Servicio",
        price: Number(item.price || 0),
        total: Number(item.price || 0),
        qty: item.kind === "TIRE" ? 4 : 1,
        subtotal: Number(item.price || 0) * (item.kind === "TIRE" ? 4 : 1),
        status: "Listo",
        completed: true,
        empleado_id: empleadoLogueado.id,
        empleado_nombre: empleadoLogueado.nombre,
      };

      const actualizados = [...(itemsOrden || []), nuevoItem];
      await onActualizarItemsOrden(actualizados);
      mostrarToast(`✓ Agregado: ${item.name}`, "ok");
    } catch {
      mostrarToast("Error al agregar ítem", "err");
    }
  };

  const handleGuardarServicioManualEnOrden = useCallback(async () => {
    if (confirmingOrder) return;

    const hasCatalogSelection =
      selectedPackages.length > 0 ||
      Object.keys(selectedServices).length > 0 ||
      Object.keys(selectedAddons).length > 0 ||
      Object.keys(selectedTires).length > 0;
    
    // Si hay selecciones del catálogo central (paquetes, servicios, neumáticos, adicionales)
    if (hasCatalogSelection) {
      await handleConfirmToOrder(false);
    }
    
    // Si hay un servicio manual ingresado con precio
    if (manualServicioTexto.trim() && parseFloat(manualServicioPrecio) > 0) {
      const precioNum = Math.max(0, parseFloat(manualServicioPrecio) || 0);
      const nuevoItem = {
        id: "manual-" + Date.now(),
        nombre: manualServicioTexto.trim(),
        descripcion: "Servicio manual personalizado",
        precio: precioNum,
        cantidad: manualCantidad || 1,
        subtotal: Number((precioNum * (manualCantidad || 1)).toFixed(2)),
        tipo: "SERVICIO",
        area: "TECNICENTRO",
        vehicleTypeId: selectedVehicleTypeId,
      };
      await onActualizarItemsOrden([...itemsOrden, nuevoItem]);
      mostrarToast(`✓ "${manualServicioTexto.trim()}" agregado a la orden`, "ok");
    }
  }, [
    confirmingOrder,
    selectedPackages,
    selectedServices,
    selectedAddons,
    selectedTires,
    handleConfirmToOrder,
    manualServicioTexto,
    manualServicioPrecio,
    manualCantidad,
    itemsOrden,
    onActualizarItemsOrden,
    mostrarToast,
    selectedVehicleTypeId,
  ]);

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

  const filteredPackages = useMemo(() => {
    if (!config) return [];
    const q = searchQuery.trim().toLowerCase();
    return (config.packages || [])
      .filter((pkg) => {
        if (!pkg.active) return false;
        if (
          !matchesVehicleType(pkg.applicableVehicleTypes, selectedVehicleTypeId)
        ) {
          return false;
        }
        if (selectedCategoryId !== "TODOS" && pkg.categoryId !== selectedCategoryId) {
          return false;
        }
        if (q) {
          const hay = `${pkg.name} ${pkg.code} ${pkg.shortDescription} ${(pkg.includedServicesList || pkg.includedServiceCodes || []).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [config, selectedVehicleTypeId, selectedCategoryId, searchQuery]);

  const activeAddons = useMemo(() => {
    if (!config) return [];
    const q = searchQuery.trim().toLowerCase();
    return (config.addons || [])
      .filter((add) => {
        if (!add.active) return false;
        if (
          (add as any).applicableVehicleTypes?.length > 0 && !(add as any).applicableVehicleTypes.includes(selectedVehicleTypeId)
        ) {
          return false;
        }
        if (q) {
          const hay = `${add.name} ${add.code} ${add.description}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [config, selectedVehicleTypeId, searchQuery]);

  const itemsTienda = useMemo(() => {
    const q = searchQuery
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    // Solo debe aparecer cuando el usuario busque
    if (!q) {
      return [];
    }

    const list: Array<{
      id: string;
      kind: "SERVICE" | "TIRE" | "PACKAGE" | "ADDON";
      name: string;
      code: string;
      description?: string;
      durationMinutes?: number;
      price: number;
      quoteRequired?: boolean;
      rawService?: TecnicentroEnrichedService;
      rawTire?: TecnicentroEnrichedTire;
      rawPackage?: TecnicentroPackage;
      rawAddon?: TecnicentroAddon;
      imageUrl?: string;
      isSelected: boolean;
      qty: number;
    }> = [];

    filteredServices.forEach((srv) => {
      const pInfo = getPriceDisplayForItem(srv, selectedVehicleTypeId);
      const selQty = selectedServices[srv.id] || 0;
      list.push({
        id: srv.id,
        kind: "SERVICE",
        name: srv.name,
        code: srv.code,
        description: srv.shortDescription || srv.fullDescription,
        durationMinutes: srv.estimatedMinutes || 45,
        price: pInfo.price ?? 0,
        quoteRequired: pInfo.quoteRequired,
        rawService: srv,
        imageUrl: srv.imageUrl,
        isSelected: selQty > 0,
        qty: selQty,
      });
    });

    filteredTires.forEach((tire) => {
      const selQty = selectedTires[tire.id] || 0;
      list.push({
        id: tire.id,
        kind: "TIRE",
        name: `${tire.brand} ${tire.modelRef} - ${tire.tireSize}`,
        code: tire.code,
        description: `${tire.brand} · ${tire.tireSize} · Aro ${tire.rimDiameter} · Stock: ${tire.stock}`,
        durationMinutes: 30,
        price: Number(tire.price) || 0,
        quoteRequired: false,
        rawTire: tire,
        imageUrl: tire.imageUrl,
        isSelected: selQty > 0,
        qty: selQty,
      });
    });

    filteredPackages.forEach((pkg) => {
      const pInfo = getPriceDisplayForItem(pkg, selectedVehicleTypeId);
      const isSel = selectedPackages.includes(pkg.id);
      list.push({
        id: pkg.id,
        kind: "PACKAGE",
        name: pkg.name,
        code: pkg.code,
        description: pkg.shortDescription,
        durationMinutes: pkg.estimatedMinutes || 60,
        price: pInfo.price ?? 0,
        quoteRequired: pInfo.quoteRequired,
        rawPackage: pkg,
        imageUrl: pkg.imageUrl,
        isSelected: isSel,
        qty: isSel ? 1 : 0,
      });
    });

    activeAddons.forEach((add) => {
      const pInfo = getPriceDisplayForItem(add, selectedVehicleTypeId);
      const selQty = selectedAddons[add.id] || 0;
      list.push({
        id: add.id,
        kind: "ADDON",
        name: add.name,
        code: add.code,
        description: add.description,
        durationMinutes: add.estimatedMinutes || 15,
        price: pInfo.price ?? 0,
        quoteRequired: pInfo.quoteRequired,
        rawAddon: add,
        imageUrl: add.imageUrl,
        isSelected: selQty > 0,
        qty: selQty,
      });
    });

    return list;
  }, [
    filteredServices,
    filteredTires,
    filteredPackages,
    activeAddons,
    selectedVehicleTypeId,
    selectedServices,
    selectedTires,
    selectedPackages,
    selectedAddons,
  ]);

  // Todos los ítems para la vista completa "Ver todo el catálogo" de Tecnicentro
  const todosLosItemsCatalogo = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list: Array<{
      id: string;
      kind: "PACKAGE" | "SERVICE" | "TIRE" | "ADDON";
      code: string;
      name: string;
      brand?: string;
      presentation?: string;
      description: string;
      durationMinutes: number;
      price: number;
      quoteRequired: boolean;
      imageUrl?: string;
      rawService?: TecnicentroEnrichedService;
      rawPackage?: TecnicentroPackage;
      rawTire?: TecnicentroEnrichedTire;
      rawAddon?: TecnicentroAddon;
      isSelected: boolean;
    }> = [];

    // Paquetes
    (config?.packages || []).forEach((pkg) => {
      if (filtroCategoriaGeneral && pkg.categoryId !== filtroCategoriaGeneral) return;
      if (q && !`${pkg.name} ${pkg.code} ${pkg.shortDescription || ""}`.toLowerCase().includes(q)) return;
      const pInfo = getPriceDisplayForItem(pkg, selectedVehicleTypeId);
      list.push({
        id: pkg.id,
        kind: "PACKAGE",
        code: pkg.code,
        name: pkg.name,
        brand: "Paquete",
        description: pkg.shortDescription || pkg.fullDescription || "",
        durationMinutes: pkg.estimatedMinutes || 60,
        price: pInfo.price ?? 0,
        quoteRequired: pInfo.quoteRequired,
        imageUrl: pkg.imageUrl,
        rawPackage: pkg,
        isSelected: selectedPackages.includes(pkg.id),
        presentation: `${pkg.estimatedMinutes || 60} min · Paquete`,
      });
    });

    // Servicios
    services.forEach((srv) => {
      if (filtroCategoriaGeneral && srv.categoryId !== filtroCategoriaGeneral) return;
      if (q && !`${srv.name} ${srv.code} ${srv.shortDescription || ""}`.toLowerCase().includes(q)) return;
      const pInfo = getPriceDisplayForItem(srv, selectedVehicleTypeId);
      const catObj = config?.categories?.find((c) => c.id === srv.categoryId);
      list.push({
        id: srv.id,
        kind: "SERVICE",
        code: srv.code,
        name: srv.name,
        brand: catObj?.name ? toSingleWord(catObj.name, TECNICENTRO_CAT_SINGLE) : "Tecnicentro",
        description: srv.shortDescription || srv.fullDescription || "",
        durationMinutes: srv.estimatedMinutes || 45,
        price: pInfo.price ?? 0,
        quoteRequired: pInfo.quoteRequired,
        imageUrl: srv.imageUrl,
        rawService: srv,
        isSelected: Boolean(selectedServices[srv.id]),
        presentation: `${srv.estimatedMinutes || 45} min · Servicio`,
      });
    });

    // Neumáticos
    tires.forEach((tire) => {
      if (filtroCategoriaGeneral && filtroCategoriaGeneral !== "tc_cat_venta_neum") return;
      if (q && !`${tire.brand} ${tire.name || ""} ${tire.tireSize}`.toLowerCase().includes(q)) return;
      list.push({
        id: tire.id,
        kind: "TIRE",
        code: tire.code,
        name: tire.name || `${tire.brand} - ${tire.tireSize}`,
        brand: tire.brand || "Neumático",
        description: `${tire.brand} · ${tire.tireSize} · Aro ${tire.rimDiameter} · Stock: ${tire.stock}`,
        durationMinutes: 30,
        price: Number(tire.price) || 0,
        quoteRequired: false,
        imageUrl: tire.imageUrl,
        rawTire: tire,
        isSelected: Boolean(selectedTires[tire.id]),
        presentation: `${tire.tireSize} · Aro ${tire.rimDiameter || "16"}`,
      });
    });

    // Extras
    (config?.addons || []).forEach((add) => {
      if (filtroCategoriaGeneral) return;
      if (q && !`${add.name} ${add.code} ${add.description || ""}`.toLowerCase().includes(q)) return;
      const pInfo = getPriceDisplayForItem(add, selectedVehicleTypeId);
      list.push({
        id: add.id,
        kind: "ADDON",
        code: add.code,
        name: add.name,
        brand: "Extra",
        description: add.description || "",
        durationMinutes: add.estimatedMinutes || 15,
        price: pInfo.price ?? 0,
        quoteRequired: pInfo.quoteRequired,
        imageUrl: add.imageUrl,
        rawAddon: add,
        isSelected: Boolean(selectedAddons[add.id]),
        presentation: `${add.estimatedMinutes || 15} min · Adicional`,
      });
    });

    return list;
  }, [config, services, tires, filtroCategoriaGeneral, searchQuery, selectedVehicleTypeId, selectedPackages, selectedServices, selectedTires, selectedAddons]);

  const totalCalculado = useMemo(() => {
    let sum = 0;
    if (serverCalculation?.total != null) {
      sum = Number(serverCalculation.total);
    } else {
      selectedPackages.forEach((pId) => {
        const p = config?.packages.find((x) => x.id === pId);
        if (p) sum += getPriceDisplayForItem(p, selectedVehicleTypeId).price ?? 0;
      });
      Object.entries(selectedServices).forEach(([sId, qty]) => {
        const s = services.find((x) => x.id === sId);
        if (s) sum += (getPriceDisplayForItem(s, selectedVehicleTypeId).price ?? 0) * (qty || 1);
      });
      Object.entries(selectedTires).forEach(([tId, qty]) => {
        const t = tires.find((x) => x.id === tId);
        if (t) sum += (Number(t.price) || 0) * (qty || 1);
      });
      Object.entries(selectedAddons).forEach(([aId, qty]) => {
        const a = config?.addons.find((x) => x.id === aId);
        if (a) sum += (getPriceDisplayForItem(a, selectedVehicleTypeId).price ?? 0) * (qty || 1);
      });
    }
    const valManual = (parseFloat(manualServicioPrecio) || 0) * (manualCantidad || 1);
    return sum + valManual;
  }, [
    serverCalculation,
    config,
    services,
    tires,
    selectedPackages,
    selectedServices,
    selectedTires,
    selectedAddons,
    selectedVehicleTypeId,
    manualServicioPrecio,
    manualCantidad,
  ]);

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* =====================================================================
          FILA 1: CATEGORÍAS PRINCIPALES (Color, Porte y Diseño Taller y Lubricentro)
          ===================================================================== */}
      <div className="w-full">
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setSelectedCategoryId("TODOS");
              setSelectedSubcategoryId("TODOS");
            }}
            className={`h-10 px-3.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap shrink-0 shadow-2xs active:scale-95 ${
              selectedCategoryId === "TODOS"
                ? "bg-blue-50/90 dark:bg-blue-500/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/40 font-bold"
                : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <span className="text-base leading-none shrink-0">🛞</span>
            <span>Todas</span>
          </button>
          {activeCategories.map((cat) => {
            const activa = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(cat.id);
                  setSelectedSubcategoryId("TODOS");
                }}
                className={`h-10 px-3.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap shrink-0 shadow-2xs active:scale-95 ${
                  activa
                    ? "bg-blue-50/90 dark:bg-blue-500/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/40 font-bold"
                    : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span className="text-base leading-none shrink-0">{cat.icon || "🛞"}</span>
                <span>{toSingleWord(cat.name, TECNICENTRO_CAT_SINGLE)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          FILA 2: SELECTOR DE TIPO DE VEHÍCULO (5 Tipos Principales, Color y Porte Taller y Lubricentro)
          ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
        {activeVehicleTypes.map((vt) => {
          const activa = selectedVehicleTypeId === vt.id;
          return (
            <button
              key={vt.id}
              type="button"
              onClick={() => setSelectedVehicleTypeId(vt.id)}
              className={`h-10 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs active:scale-95 ${
                activa
                  ? "bg-blue-50/90 dark:bg-blue-500/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/40 font-bold"
                  : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span className="text-base leading-none shrink-0">{vt.icon || "🚗"}</span>
              <span className="truncate">{toSingleWord(vt.name, TECNICENTRO_VEH_SINGLE)}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          FILA 3: CONTENIDO EN TRES COLUMNAS O CATÁLOGO GENERAL
          ===================================================================== */}
      {!verTodoElCatalogo ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
        {/* 1. PANEL IZQUIERDO: Categoría y modalidades */}
        <div className="md:col-span-4 lg:col-span-3 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-2.5 shadow-2xs">
          <div className="flex items-center gap-2 px-0.5 pb-2 border-b border-zinc-100 dark:border-white/5 text-zinc-900 dark:text-white font-normal text-xs sm:text-sm">
            <span className="text-sm text-blue-600 dark:text-blue-400">←</span>
            <span className="text-base">
              {activeCategories.find((c) => c.id === selectedCategoryId)?.icon || "🛞"}
            </span>
            <span className="truncate">Categoría</span>
          </div>

          <div className="space-y-1.5">
            {activeSubcategories.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedSubcategoryId("TODOS")}
                  className={`w-full p-2 rounded-lg border flex items-center justify-between gap-2 text-left transition-all cursor-pointer active:scale-98 ${
                    selectedSubcategoryId === "TODOS"
                      ? "bg-blue-50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/50 text-blue-900 dark:text-blue-200 shadow-2xs ring-1 ring-blue-400/30"
                      : "bg-zinc-50/70 hover:bg-zinc-100/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border-zinc-200/80 dark:border-white/5 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-md border flex items-center justify-center text-sm shrink-0 bg-white dark:bg-black/30 border-zinc-200 dark:border-white/10">
                      ✨
                    </div>
                    <span className="text-xs font-semibold truncate">Todos los servicios</span>
                  </div>
                  <span className="text-xs shrink-0 font-bold">›</span>
                </button>
                {activeSubcategories.map((sub) => {
                  const isSelected = selectedSubcategoryId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubcategoryId(sub.id)}
                      className={`w-full p-2 rounded-lg border flex items-center justify-between gap-2 text-left transition-all cursor-pointer active:scale-98 ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/50 text-blue-900 dark:text-blue-200 shadow-2xs ring-1 ring-blue-400/30"
                          : "bg-zinc-50/70 hover:bg-zinc-100/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border-zinc-200/80 dark:border-white/5 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-md border flex items-center justify-center text-sm shrink-0 ${
                            isSelected
                              ? "bg-blue-100 dark:bg-blue-500/25 border-blue-300 dark:border-blue-400/40 text-blue-700 dark:text-blue-200"
                              : "bg-white dark:bg-black/30 border-zinc-200 dark:border-white/10"
                          }`}
                        >
                          {sub.icon || "🔧"}
                        </div>
                        <span
                          className={`text-xs font-semibold truncate ${
                            isSelected
                              ? "text-blue-700 dark:text-blue-300 font-bold"
                              : "text-zinc-700 dark:text-zinc-200"
                          }`}
                        >
                          {sub.name}
                        </span>
                      </div>
                      <span
                        className={`text-xs shrink-0 font-bold ${
                          isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        ›
                      </span>
                    </button>
                  );
                })}
              </>
            ) : (
              activeCategories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setSelectedSubcategoryId("TODOS");
                    }}
                    className={`w-full p-2 rounded-lg border flex items-center justify-between gap-2 text-left transition-all cursor-pointer active:scale-98 ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/50 text-blue-900 dark:text-blue-200 shadow-2xs ring-1 ring-blue-400/30"
                        : "bg-zinc-50/70 hover:bg-zinc-100/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border-zinc-200/80 dark:border-white/5 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-md border flex items-center justify-center text-sm shrink-0 ${
                          isSelected
                            ? "bg-blue-100 dark:bg-blue-500/25 border-blue-300 dark:border-blue-400/40 text-blue-700 dark:text-blue-200"
                            : "bg-white dark:bg-black/30 border-zinc-200 dark:border-white/10"
                        }`}
                      >
                        {cat.icon || "🛞"}
                      </div>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isSelected
                            ? "text-blue-700 dark:text-blue-300 font-bold"
                            : "text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {cat.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs shrink-0 font-bold ${
                        isSelected ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    >
                      ›
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 2. PANEL CENTRAL: Tienda de Tecnicentro */}
        <div className="md:col-span-8 lg:col-span-5 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3 shadow-2xs">
          {/* Header del panel central */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-blue-600 dark:text-blue-400 shrink-0">🏪</span>
              <h3 className="text-xs sm:text-sm font-normal text-zinc-900 dark:text-white truncate">
                Tienda
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setVerTodoElCatalogo(true)}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>Ver todo</span>
              <span>›</span>
            </button>
          </div>

          {/* Input de Búsqueda */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-9 pl-8 pr-7 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Lista de Servicios / Neumáticos / Paquetes / Adicionales (solo visible cuando se busca) */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-0.5">
            {!searchQuery.trim() ? null : itemsTienda.length === 0 ? (
              <div className="p-6 rounded-xl bg-zinc-50/70 dark:bg-white/[0.01] border border-dashed border-zinc-200 dark:border-white/10 text-center space-y-1.5 text-zinc-400">
                <span className="text-xl block">🔍</span>
                <p className="text-xs font-semibold">No se encontraron servicios ni neumáticos para esta búsqueda.</p>
              </div>
            ) : (
              itemsTienda.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  onClick={() => {
                    setManualServicioTexto(item.name);
                    setManualServicioPrecio(item.price.toFixed(2));
                  }}
                  className={`p-2.5 sm:p-3 rounded-lg border flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-2xs ${
                    item.isSelected
                      ? "bg-blue-50/70 dark:bg-blue-500/10 border-blue-400/60 dark:border-blue-500/50 ring-1 ring-blue-400/20"
                      : "bg-white dark:bg-white/[0.02] hover:bg-zinc-50/70 dark:hover:bg-white/[0.05] border-zinc-200 dark:border-white/10 hover:border-blue-400/50"
                  }`}
                >
                  <div className="w-11 h-13 sm:w-12 sm:h-14 rounded-md bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/5 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xl">
                        {item.kind === "TIRE" ? "🛞" : item.kind === "PACKAGE" ? "📦" : item.kind === "ADDON" ? "✨" : "🔧"}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-[11px] sm:text-xs font-normal text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {item.name}
                      </h4>
                      {item.kind === "TIRE" && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                          Neumático
                        </span>
                      )}
                      {item.kind === "PACKAGE" && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Paquete
                        </span>
                      )}
                      {item.kind === "ADDON" && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                          Extra
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                      {item.durationMinutes ? `⏱ ${item.durationMinutes} min · ` : ""}
                      {item.description || item.code}
                    </p>
                    <div className="pt-0.5 flex items-center gap-2">
                      {item.quoteRequired ? (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          Cotizar en Presupuesto
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          $ {item.price.toFixed(2)}
                        </span>
                      )}
                      {currentVehicleType && item.kind !== "TIRE" && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          ({currentVehicleType.name})
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setManualServicioTexto(item.name);
                      setManualServicioPrecio(item.price.toFixed(2));
                      if (item.kind === "SERVICE" && item.rawService) {
                        handleToggleService(item.rawService);
                      } else if (item.kind === "TIRE" && item.rawTire) {
                        handleToggleTire(item.rawTire);
                      } else if (item.kind === "PACKAGE" && item.rawPackage) {
                        handleTogglePackage(item.rawPackage);
                      } else if (item.kind === "ADDON" && item.rawAddon) {
                        handleToggleAddon(item.rawAddon);
                      }
                    }}
                    className={`h-8 px-3 rounded-lg border text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs ${
                      item.isSelected
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
                        : "bg-blue-100/80 hover:bg-blue-200/80 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30"
                    }`}
                  >
                    <span>{item.isSelected ? "✓" : "+"}</span>
                    <span>{item.isSelected ? "Listo" : "Agregar"}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. PANEL DERECHO: MANUAL */}
        <div className="md:col-span-12 lg:col-span-4 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3 shadow-2xs">
          <h3 className="text-xs sm:text-sm font-normal text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-white/5">
            Manual
          </h3>

          {/* Lista de Seleccionados (si hay) */}
          {(selectedPackages.length > 0 ||
            Object.keys(selectedServices).length > 0 ||
            Object.keys(selectedTires).length > 0 ||
            Object.keys(selectedAddons).length > 0) && (
            <div className="space-y-1.5 pb-2 border-b border-zinc-100 dark:border-white/5">
              <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
                Seleccionados ({totalSelectedCount})
              </label>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {selectedPackages.map((id) => {
                  const p = config?.packages.find((x) => x.id === id);
                  if (!p) return null;
                  const pr = getPriceDisplayForItem(p, selectedVehicleTypeId).price ?? 0;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-zinc-50 dark:bg-white/[0.03] text-xs text-zinc-700 dark:text-zinc-200"
                    >
                      <span className="truncate flex-1">📦 {p.name}</span>
                      <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        ${pr.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTogglePackage(p)}
                        className="w-5 h-5 rounded hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {Object.entries(selectedServices).map(([id, qty]) => {
                  const s = services.find((x) => x.id === id);
                  if (!s) return null;
                  const pr = getPriceDisplayForItem(s, selectedVehicleTypeId).price ?? 0;
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-zinc-50 dark:bg-white/[0.03] text-xs text-zinc-700 dark:text-zinc-200"
                    >
                      <span className="truncate flex-1">🔧 {s.name} {qty > 1 ? `(x${qty})` : ""}</span>
                      <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        ${(pr * (qty || 1)).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleService(s)}
                        className="w-5 h-5 rounded hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {Object.entries(selectedTires).map(([id, qty]) => {
                  const t = tires.find((x) => x.id === id);
                  if (!t) return null;
                  const pr = Number(t.price) || 0;
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-zinc-50 dark:bg-white/[0.03] text-xs text-zinc-700 dark:text-zinc-200"
                    >
                      <span className="truncate flex-1">🛞 {t.brand} {t.tireSize} (x{qty})</span>
                      <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        ${(pr * (qty || 1)).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleTire(t)}
                        className="w-5 h-5 rounded hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {Object.entries(selectedAddons).map(([id, qty]) => {
                  const a = config?.addons.find((x) => x.id === id);
                  if (!a) return null;
                  const pr = getPriceDisplayForItem(a, selectedVehicleTypeId).price ?? 0;
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-1.5 p-1.5 rounded-md bg-zinc-50 dark:bg-white/[0.03] text-xs text-zinc-700 dark:text-zinc-200"
                    >
                      <span className="truncate flex-1">✨ {a.name}</span>
                      <span className="font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        ${(pr * (qty || 1)).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleAddon(a)}
                        className="w-5 h-5 rounded hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tipo de servicio */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
              Tipo de servicio
            </label>
            <input
              type="text"
              value={manualServicioTexto}
              onChange={(e) => setManualServicioTexto(e.target.value)}
              placeholder="Campo editable..."
              className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
            />
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
              Valor
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={manualServicioPrecio}
                onChange={(e) => setManualServicioPrecio(e.target.value)}
                placeholder="0.00"
                className="w-full h-8 pl-6 pr-2.5 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
              />
            </div>
          </div>

          {/* Información estimada */}
          <div className="pt-1 space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center justify-between">
              <span>Vehículo:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {currentVehicleType?.name || "General"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tiempo estimado:</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                ⏱ {serverCalculation?.totalMinutes || manualTiempoEstimado || 45} min
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Total</span>
            <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
              $ {totalCalculado.toFixed(2)}
            </span>
          </div>

          {/* Botones Cancelar y Guardar en pedido */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setManualServicioTexto("");
                setManualServicioPrecio("");
                setSelectedPackages([]);
                setSelectedServices({});
                setSelectedAddons({});
                setSelectedTires({});
                setServerCalculation(null);
              }}
              className="h-9 px-3 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={
                confirmingOrder ||
                (totalSelectedCount === 0 &&
                  (!manualServicioTexto.trim() || !(parseFloat(manualServicioPrecio) > 0)))
              }
              onClick={() => void handleGuardarServicioManualEnOrden()}
              className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm disabled:opacity-50"
            >
              {confirmingOrder ? "Guardando..." : "Guardar en pedido"}
            </button>
          </div>
        </div>
      </div>
      ) : (
        /* VISTA COMPLETA: TODA LA TIENDA Y CATÁLOGO GENERAL DE TECNICENTRO */
        <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-white/5">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>🏪</span>
                <span>Catálogo</span>
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setVerTodoElCatalogo(false)}
              className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer transition-all shrink-0 shadow-xs active:scale-95"
            >
              ← Volver
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full h-9 pl-8 pr-7 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div ref={menuFiltroCatalogoRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuFiltroCatalogoAbierto((prev) => !prev)}
                className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-2xs select-none active:scale-95 ${
                  menuFiltroCatalogoAbierto || filtroCategoriaGeneral
                    ? "bg-blue-50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/20"
                    : "bg-white dark:bg-black/40 hover:bg-zinc-50 dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200"
                }`}
              >
                <span>
                  {activeCategories.find((c) => c.id === filtroCategoriaGeneral)?.name
                    ? toSingleWord(activeCategories.find((c) => c.id === filtroCategoriaGeneral)!.name, TECNICENTRO_CAT_SINGLE)
                    : "Todos"}
                </span>
                <span
                  className={`text-[9px] text-zinc-400 transition-transform duration-200 ${
                    menuFiltroCatalogoAbierto ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>

              {menuFiltroCatalogoAbierto && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 shadow-xl dark:shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 z-40 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroCategoriaGeneral("");
                      setMenuFiltroCatalogoAbierto(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      !filtroCategoriaGeneral
                        ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <span>Todos</span>
                    {!filtroCategoriaGeneral && <span className="text-xs">✓</span>}
                  </button>

                  <div className="my-1 border-t border-zinc-100 dark:border-white/5" />

                  {activeCategories.map((cat) => {
                    const activa = filtroCategoriaGeneral === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setFiltroCategoriaGeneral(cat.id);
                          setMenuFiltroCatalogoAbierto(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          activa
                            ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">{cat.icon || "🛞"}</span>
                          <span className="truncate">{toSingleWord(cat.name, TECNICENTRO_CAT_SINGLE)}</span>
                        </div>
                        {activa && <span className="text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Grid de servicios, paquetes, neumáticos y extras con diseño estándar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {todosLosItemsCatalogo.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className="p-3 rounded-lg bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 hover:border-blue-400/50 dark:hover:border-blue-500/40 flex flex-col justify-between gap-2.5 transition-all shadow-2xs"
              >
                <div>
                  <div className="h-24 rounded-md bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/5 flex items-center justify-center p-2 mb-1.5 overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl">
                        {item.kind === "TIRE" ? "🛞" : item.kind === "PACKAGE" ? "📦" : item.kind === "ADDON" ? "✨" : "🔧"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block truncate">
                    {item.brand || (item.kind === "TIRE" ? "Neumático" : item.kind === "PACKAGE" ? "Paquete" : item.kind === "ADDON" ? "Extra" : "Servicio")}
                  </span>
                  <h4 className="text-xs font-normal text-zinc-800 dark:text-zinc-200 line-clamp-2 mt-0.5 leading-snug">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {item.presentation || (item.durationMinutes ? `⏱ ${item.durationMinutes} min` : "1 Servicio")}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => void handleAgregarDirectoItem(item)}
                    className="w-full h-8 px-3 rounded-lg bg-blue-100/80 hover:bg-blue-200/80 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-bold cursor-pointer transition-all shadow-2xs active:scale-95 flex items-center justify-center gap-1"
                  >
                    + Agregar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL RESERVA DE BAHÍA */}
      {showBookingPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Reservar Bahía en Tecnicentro
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBookingPanel(false)}
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full h-8 px-2.5 rounded-lg bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Bahía
                  </label>
                  <select
                    value={bookingBay}
                    onChange={(e) => setBookingBay(e.target.value)}
                    className="w-full h-8 px-2 rounded-lg bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  >
                    {(config?.bays || ["Bahía Alineación 3D #1"]).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Horario disponible
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1">
                  {HORARIOS_BAHIA.map((slot) => {
                    const busy = appointments.some(
                      (a) => a.date === bookingDate && a.timeSlot === slot && a.bay === bookingBay
                    );
                    const isSelected = bookingTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={busy}
                        onClick={() => setBookingTimeSlot(slot)}
                        className={`h-7 px-1.5 rounded-md text-[11px] font-mono font-medium transition-all ${
                          busy
                            ? "bg-zinc-100 dark:bg-white/5 text-zinc-400 line-through cursor-not-allowed opacity-50"
                            : isSelected
                            ? "bg-blue-600 text-white font-bold shadow-xs"
                            : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-zinc-200/60 dark:border-white/5 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={savingBooking}
                onClick={() => void handleBookBay()}
                className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {savingBooking ? "Agendando..." : "✓ Confirmar Reserva"}
              </button>

              {lastBooking && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300">
                  ✓ Reserva #{lastBooking.appointmentNumber} agendada para el {lastBooking.date} a las {lastBooking.timeSlot} ({lastBooking.bay}).
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
