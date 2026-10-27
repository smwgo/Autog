"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type {
  CarWashConfigData,
  CarWashCategory,
  CarWashPackage,
  CarWashAddon,
  CarWashVehicleType,
} from "@/app/api/taller/carwash/route";
import {
  CarWashEnrichedService,
  ModalDetalleServicioCarWash,
  ModalServicioCarWashForm,
  ModalConfiguracionCarWash,
} from "./CarWashAdminModals";

export interface ModuloCarWashCatalogoProps {
  empleadoLogueado: { id: string; nombre: string };
  ordenActiva?: any;
  itemsOrden: any[];
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
  onActualizarItemsOrden: (nuevosItems: any[]) => Promise<void>;
  onIrAAvisoYFirma: () => void;
  triggerAbrirConfig?: number;
}

const FALLBACK_CARWASH_IMG =
  "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=900&q=80";

const HORARIOS_DISPONIBLES = [
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

const CARWASH_CAT_SINGLE: Record<string, string> = {
  "Todas": "Todas",
  "Lavado exterior": "Exterior",
  "Lavado interior": "Interior",
  "Lavado completo": "Completo",
  "Lavado premium": "Premium",
  "Limpieza de tapicería": "Tapicería",
  "Limpieza de tapiceria": "Tapicería",
  "Limpieza de motor": "Motor",
  "Lavado de motor": "Motor",
  "Detailing automotriz": "Detailing",
  "Encerado y pulido": "Encerado",
  "Lavado de motos": "Motos",
  "Lavado de camionetas y vehículos grandes": "Camionetas",
  "Desinfección y eliminación de olores": "Desinfección",
  "Servicios adicionales": "Extras",
};

// Categorías principales de un car wash / lavadora de vehículos (1 palabra cada una)
const PRINCIPAL_CATEGORY_IDS = [
  "cw_cat_exterior",
  "cw_cat_interior",
  "cw_cat_completo",
  "cw_cat_premium",
  "cw_cat_tapiceria",
  "cw_cat_motor",
];

// Tipos de vehículo en una sola palabra
const CARWASH_VEH_SINGLE: Record<string, string> = {
  "Motocicleta": "Moto",
  "Moto": "Moto",
  "Automóvil pequeño": "Auto",
  "Sedán": "Auto",
  "Sedan": "Auto",
  "Hatchback": "Auto",
  "Auto": "Auto",
  "SUV": "SUV",
  "SUV / Crossover": "SUV",
  "Camioneta": "Camioneta",
  "Camioneta grande": "Camioneta",
  "Camión liviano": "Pesado",
  "Furgoneta": "Pesado",
  "Vehículo de mayor tamaño": "Pesado",
  "Pesado": "Pesado",
};

// Tipos de vehículo principales de una lavadora de vehículos (1 palabra cada una)
const PRINCIPAL_VEHICLE_IDS = [
  "vt_moto",
  "vt_sedan",
  "vt_suv",
  "vt_camioneta",
  "vt_mayor_tamano",
];

const CARWASH_SUB_SINGLE: Record<string, string> = {
  "Todos los tipos": "Todos",
  "Todos los servicios": "Todos",
  "Premium Ejecutivo": "Ejecutivo",
  "Full Spa": "Spa",
  "Exterior Express": "Express",
  "Espuma Activa": "Espuma",
  "Aspirado y Cabina": "Aspirado",
  "Interior Detallado": "Detallado",
  "Completo Estándar": "Estándar",
  "Completo + Chasis": "Chasis",
  "Tapicería de Tela": "Tela",
  "Asientos de Cuero": "Cuero",
  "Detailing Interior": "Interior",
  "Detailing Exterior": "Exterior",
  "Motor Dieléctrico": "Dieléctrico",
  "Motos Urbanas / Scooter": "Urbana",
  "Alta Cilindrada / Touring": "Touring",
  "SUV y 3 Filas": "Familiar",
  "Pickups 4x4 y Furgonetas": "Pickups",
  "Cabina con Ozono": "Ozono",
  "Ductos A/C y Antibacterial": "Antibacterial",
  "Complementos Rápidos": "Rápidos",
};

function toSingleWord(text: string, mapDict?: Record<string, string>): string {
  if (!text) return "";
  if (mapDict && mapDict[text]) return mapDict[text];
  const cleaned = text
    .replace(/^Lavado\s+(de\s+)?/i, "")
    .replace(/^Limpieza\s+de\s+/i, "")
    .replace(/^Servicio\s+(de\s+)?/i, "")
    .replace(/^Servicios\s+(de\s+)?/i, "")
    .replace(/^Automóvil\s+/i, "")
    .replace(/^Todos\s+los\s+(tipos|servicios)/i, "Todos")
    .trim();
  const first = cleaned.split(/[\s/+,&]+/)[0];
  return first || text;
}

function computePriceForVehicle(
  item: {
    basePrice?: number | null;
    price?: number | null;
    promoPrice?: number | null;
    priceByVehicleType?: Record<string, number>;
    priceConfigured?: boolean;
  },
  vehicleTypeId: string
): { unitPrice: number | null; originalPrice: number | null; isPromo: boolean } {
  if (item.priceConfigured === false) {
    return { unitPrice: null, originalPrice: null, isPromo: false };
  }
  let vtVal = item.priceByVehicleType?.[vehicleTypeId];
  if (vtVal === undefined || vtVal === null || vtVal <= 0) {
    if (vehicleTypeId === "vt_sedan" || vehicleTypeId === "vt_auto_pequeno" || vehicleTypeId === "vt_hatchback") {
      vtVal = item.priceByVehicleType?.["vt_sedan"] ?? item.priceByVehicleType?.["vt_auto_pequeno"] ?? item.priceByVehicleType?.["vt_hatchback"];
    } else if (vehicleTypeId === "vt_camioneta" || vehicleTypeId === "vt_camioneta_grande") {
      vtVal = item.priceByVehicleType?.["vt_camioneta"] ?? item.priceByVehicleType?.["vt_camioneta_grande"];
    } else if (vehicleTypeId === "vt_mayor_tamano" || vehicleTypeId === "vt_furgoneta") {
      vtVal = item.priceByVehicleType?.["vt_mayor_tamano"] ?? item.priceByVehicleType?.["vt_furgoneta"];
    }
  }
  const baseVal =
    item.basePrice !== undefined && item.basePrice !== null
      ? Number(item.basePrice)
      : item.price !== undefined && item.price !== null
      ? Number(item.price)
      : null;

  if (typeof vtVal === "number" && vtVal > 0) {
    if (
      item.promoPrice &&
      item.promoPrice > 0 &&
      baseVal &&
      item.promoPrice < baseVal &&
      vtVal === baseVal
    ) {
      return { unitPrice: Number(item.promoPrice), originalPrice: vtVal, isPromo: true };
    }
    return { unitPrice: vtVal, originalPrice: vtVal, isPromo: false };
  }

  if (!baseVal || baseVal <= 0) {
    return { unitPrice: null, originalPrice: null, isPromo: false };
  }

  if (item.promoPrice && item.promoPrice > 0 && item.promoPrice < baseVal) {
    return { unitPrice: Number(item.promoPrice), originalPrice: baseVal, isPromo: true };
  }

  return { unitPrice: baseVal, originalPrice: baseVal, isPromo: false };
}

// Caché en el cliente (módulo y localStorage) para que cambiar de tab y volver sea instantáneo
let _carWashClientCache: {
  config: any;
  services: any[];
  promotions: any[];
  appointments: any[];
  timestamp: number;
} | null = null;

const getInitialCarWashCache = () => {
  if (_carWashClientCache) return _carWashClientCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("taller_carwash_cache_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.config) {
          _carWashClientCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return null;
};

export default function ModuloCarWashCatalogo({
  empleadoLogueado,
  ordenActiva,
  itemsOrden,
  mostrarToast,
  onActualizarItemsOrden,
  onIrAAvisoYFirma,
  triggerAbrirConfig,
}: ModuloCarWashCatalogoProps) {
  const initialCache = getInitialCarWashCache();
  const [loading, setLoading] = useState(!initialCache);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [config, setConfig] = useState<CarWashConfigData | null>(initialCache ? initialCache.config : null);
  const [services, setServices] = useState<CarWashEnrichedService[]>(initialCache ? initialCache.services : []);
  const [promotions, setPromotions] = useState<any[]>(initialCache ? initialCache.promotions : []);
  const [appointments, setAppointments] = useState<any[]>(initialCache ? initialCache.appointments : []);

  // Paso interactivo del flujo de selección (1 a 5)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Filtros y selección del cliente
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState<string>("vt_sedan");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("TODOS");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("TODOS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [manualServicioTexto, setManualServicioTexto] = useState<string>("");
  const [manualServicioPrecio, setManualServicioPrecio] = useState<string>("");
  const [manualUnidad, setManualUnidad] = useState<string>("Servicio");
  const [manualCantidad, setManualCantidad] = useState<number>(1);
  const [dropdownUnidadAbierto, setDropdownUnidadAbierto] = useState<boolean>(false);
  const menuUnidadRef = useRef<HTMLDivElement>(null);

  // Vista de Catálogo General
  const [verTodoElCatalogo, setVerTodoElCatalogo] = useState<boolean>(false);
  const [filtroCategoriaGeneral, setFiltroCategoriaGeneral] = useState<string>("");
  const [menuFiltroAbierto, setMenuFiltroAbierto] = useState<boolean>(false);
  const menuFiltroRef = useRef<HTMLDivElement>(null);

  // Selección múltiple en la tienda
  const [itemsSeleccionadosTiendaIds, setItemsSeleccionadosTiendaIds] = useState<string[]>([]);
  const [agregandoVarios, setAgregandoVarios] = useState<boolean>(false);

  // Dropdown para horario de reserva
  const [dropdownHorarioAbierto, setDropdownHorarioAbierto] = useState<boolean>(false);
  const menuHorarioRef = useRef<HTMLDivElement>(null);

  // Cerrar menús desplegables al hacer clic afuera
  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (menuFiltroRef.current && !menuFiltroRef.current.contains(e.target as Node)) {
        setMenuFiltroAbierto(false);
      }
      if (menuUnidadRef.current && !menuUnidadRef.current.contains(e.target as Node)) {
        setDropdownUnidadAbierto(false);
      }
      if (menuHorarioRef.current && !menuHorarioRef.current.contains(e.target as Node)) {
        setDropdownHorarioAbierto(false);
      }
    };
    if (menuFiltroAbierto || dropdownUnidadAbierto || dropdownHorarioAbierto) {
      document.addEventListener("mousedown", handleClickAfuera);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickAfuera);
    };
  }, [menuFiltroAbierto, dropdownUnidadAbierto, dropdownHorarioAbierto]);

  // Selecciones activas de Car Wash
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [promoCodeInput, setPromoCodeInput] = useState<string>("");

  // Cálculo validado desde el servidor
  const [serverCalculation, setServerCalculation] = useState<any | null>(null);
  const [calculatingServer, setCalculatingServer] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);

  // Estado de Reserva de Bahía (ClientAppointment)
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [bookingDate, setBookingDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [bookingTimeSlot, setBookingTimeSlot] = useState<string>("09:00 AM");
  const [bookingBay, setBookingBay] = useState<string>("Bahía Lavado 1");
  const [bookingNotes, setBookingNotes] = useState<string>("");
  const [savingBooking, setSavingBooking] = useState(false);
  const [lastBookingConfirmed, setLastBookingConfirmed] = useState<any | null>(null);

  // Modales administrativos y de detalle
  const [detailModalItem, setDetailModalItem] = useState<{
    item: CarWashEnrichedService | CarWashPackage;
    kind: "SERVICE" | "PACKAGE";
  } | null>(null);
  const [serviceFormModal, setServiceFormModal] = useState<{
    open: boolean;
    service?: Partial<CarWashEnrichedService> | null;
  }>({ open: false, service: null });
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Escuchar trigger de cabecera exterior
  useEffect(() => {
    if (triggerAbrirConfig && triggerAbrirConfig > 0) {
      setConfigModalOpen(true);
    }
  }, [triggerAbrirConfig]);

  // Cargar datos reales desde Neon (con caché de cliente para tabs y persistencia)
  const fetchCarWashData = useCallback(async () => {
    if (_carWashClientCache && Date.now() - _carWashClientCache.timestamp < 300000) {
      return;
    }
    try {
      if (!config) setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/taller/carwash", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo cargar el módulo Car Wash");
      }
      const cacheObj = {
        config: data.config,
        services: data.services || [],
        promotions: data.promotions || [],
        appointments: data.appointments || [],
        timestamp: Date.now(),
      };
      _carWashClientCache = cacheObj;
      try {
        localStorage.setItem("taller_carwash_cache_v2", JSON.stringify(cacheObj));
      } catch {}
      setConfig(data.config);
      setServices(data.services || []);
      setPromotions(data.promotions || []);
      setAppointments(data.appointments || []);
      if (data.config?.bays?.[0]) {
        setBookingBay(data.config.bays[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error de conexión al cargar Car Wash");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    void fetchCarWashData();
  }, [fetchCarWashData]);

  // Detectar tipo de vehículo sugerido si hay una ordenActiva con descripción de vehículo
  useEffect(() => {
    if (!ordenActiva?.vehicle || !config?.vehicleTypes?.length) return;
    const vText = String(ordenActiva.vehicle).toLowerCase();
    if (vText.includes("moto") || vText.includes("yamaha") || vText.includes("honda cb")) {
      setSelectedVehicleTypeId("vt_moto");
    } else if (vText.includes("hilux") || vText.includes("d-max") || vText.includes("amarok") || vText.includes("pickup")) {
      setSelectedVehicleTypeId("vt_camioneta");
    } else if (vText.includes("tahoe") || vText.includes("prado") || vText.includes("fortuner") || vText.includes("explorer")) {
      setSelectedVehicleTypeId("vt_camioneta_grande");
    } else if (vText.includes("sportage") || vText.includes("tucson") || vText.includes("rav4") || vText.includes("cr-v") || vText.includes("suv")) {
      setSelectedVehicleTypeId("vt_suv");
    } else if (vText.includes("spark") || vText.includes("picanto") || vText.includes("march")) {
      setSelectedVehicleTypeId("vt_auto_pequeno");
    }
  }, [ordenActiva?.vehicle, config?.vehicleTypes?.length]);

  // Sincronizar selecciones previas desde itemsOrden si ya estaban en la orden activa
  useEffect(() => {
    if (!config || !services.length || !itemsOrden?.length) return;
    const pkgIds: string[] = [];
    const srvIds: string[] = [];
    const addIds: string[] = [];

    itemsOrden.forEach((it) => {
      const code = String(it.code || "");
      const foundPkg = config.packages.find((p) => p.code === code);
      if (foundPkg) pkgIds.push(foundPkg.id);
      const foundSrv = services.find((s) => s.code === code);
      if (foundSrv) srvIds.push(foundSrv.id);
      const foundAdd = config.addons.find((a) => a.code === code);
      if (foundAdd) addIds.push(foundAdd.id);
    });

    if (pkgIds.length > 0 || srvIds.length > 0 || addIds.length > 0) {
      setSelectedPackageIds((prev) => (prev.length === 0 ? pkgIds : prev));
      setSelectedServiceIds((prev) => (prev.length === 0 ? srvIds : prev));
      setSelectedAddonIds((prev) => (prev.length === 0 ? addIds : prev));
    }
  }, [config, services, itemsOrden]);

  // Validar y calcular en el servidor cada vez que cambian las selecciones o el tipo de vehículo
  useEffect(() => {
    if (!config) return;
    const totalCount =
      selectedPackageIds.length + selectedServiceIds.length + selectedAddonIds.length;
    if (totalCount === 0) {
      setServerCalculation(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setCalculatingServer(true);
        const res = await fetch("/api/taller/carwash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CALCULAR_Y_VALIDAR_SELECCION",
            vehicleTypeId: selectedVehicleTypeId,
            selectedPackageIds,
            selectedServiceIds,
            selectedAddonIds,
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
    selectedPackageIds,
    selectedServiceIds,
    selectedAddonIds,
    promoCodeInput,
  ]);

  const activeCategories = useMemo(
    () =>
      (config?.categories || [])
        .filter(
          (c) =>
            c.active &&
            (PRINCIPAL_CATEGORY_IDS.includes(c.id) ||
              PRINCIPAL_CATEGORY_IDS.some((pid) => c.slug?.includes(pid.replace("cw_cat_", ""))))
        )
        .sort((a, b) => {
          const idxA = PRINCIPAL_CATEGORY_IDS.indexOf(a.id);
          const idxB = PRINCIPAL_CATEGORY_IDS.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          return a.order - b.order;
        }),
    [config]
  );

  const activeVehicleTypes = useMemo(() => {
    const list = (config?.vehicleTypes || []).filter((v) => v.active);
    const principales = list.filter(
      (v) =>
        v.id === "vt_moto" ||
        v.id === "vt_sedan" ||
        v.id === "vt_suv" ||
        v.id === "vt_camioneta" ||
        v.id === "vt_mayor_tamano" ||
        (v.id === "vt_furgoneta" && !list.some((x) => x.id === "vt_mayor_tamano"))
    );
    const result = principales.length > 0 ? principales : list;
    const orderMap = ["vt_moto", "vt_sedan", "vt_suv", "vt_camioneta", "vt_mayor_tamano", "vt_furgoneta"];
    return result.sort((a, b) => {
      const idxA = orderMap.indexOf(a.id);
      const idxB = orderMap.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.order - b.order;
    });
  }, [config]);

  const currentVehicleType: CarWashVehicleType | undefined = useMemo(
    () =>
      activeVehicleTypes.find((v) => v.id === selectedVehicleTypeId) || activeVehicleTypes[0],
    [activeVehicleTypes, selectedVehicleTypeId]
  );

  const activeSubcategories = useMemo(() => {
    if (!config || selectedCategoryId === "TODOS") return [];
    return config.subcategories
      .filter((s) => s.active && s.categoryId === selectedCategoryId)
      .sort((a, b) => a.order - b.order);
  }, [config, selectedCategoryId]);

  // Adaptar panel Manual automáticamente al seleccionar categoría, subcategoría o tipo de vehículo
  useEffect(() => {
    let nombre = "";
    let precio = 0;

    if (selectedSubcategoryId && selectedSubcategoryId !== "TODOS") {
      const sub = config?.subcategories?.find((s) => s.id === selectedSubcategoryId);
      if (sub) {
        nombre = sub.name;
        const srv = services.find((s) => s.subcategoryId === sub.id);
        if (srv) {
          const pr = computePriceForVehicle(srv, selectedVehicleTypeId).unitPrice;
          if (pr) precio = pr;
        }
      }
    } else if (selectedCategoryId && selectedCategoryId !== "TODOS") {
      const cat = config?.categories?.find((c) => c.id === selectedCategoryId);
      if (cat) {
        nombre = cat.name;
        const srv = services.find((s) => s.categoryId === cat.id);
        if (srv) {
          const pr = computePriceForVehicle(srv, selectedVehicleTypeId).unitPrice;
          if (pr) precio = pr;
        }
      }
    } else {
      nombre = "Lavado Completo";
      const srv = services[0];
      if (srv) {
        const pr = computePriceForVehicle(srv, selectedVehicleTypeId).unitPrice;
        if (pr) precio = pr;
      }
    }

    if (nombre) {
      setManualServicioTexto(nombre);
      setManualServicioPrecio(precio > 0 ? precio.toFixed(2) : "");
      setManualUnidad("Servicio");
      setManualCantidad(1);
    }
  }, [selectedCategoryId, selectedSubcategoryId, selectedVehicleTypeId, config, services]);

  // Conjunto de IDs de adicionales que ya están incluidos sin costo en los paquetes seleccionados
  const addonsIncludedInSelectedPackages = useMemo(() => {
    const map: Record<string, string> = {};
    if (!config) return map;
    selectedPackageIds.forEach((pkgId) => {
      const pkg = config.packages.find((p) => p.id === pkgId);
      if (pkg) {
        (pkg.includedAddonIds || []).forEach((addId) => {
          map[addId] = pkg.name;
        });
      }
    });
    return map;
  }, [config, selectedPackageIds]);

  // Paquetes filtrados según vehículo, categoría y búsqueda
  const filteredPackages = useMemo(() => {
    if (!config) return [];
    const q = searchQuery.trim().toLowerCase();
    return config.packages
      .filter((pkg) => {
        if (!pkg.active) return false;
        if (pkg.applicableVehicleTypes?.length > 0) {
          const appList = pkg.applicableVehicleTypes;
          const match =
            appList.includes(selectedVehicleTypeId) ||
            (selectedVehicleTypeId === "vt_sedan" && (appList.includes("vt_auto_pequeno") || appList.includes("vt_hatchback"))) ||
            (selectedVehicleTypeId === "vt_camioneta" && appList.includes("vt_camioneta_grande")) ||
            (selectedVehicleTypeId === "vt_mayor_tamano" && appList.includes("vt_furgoneta"));
          if (!match) return false;
        }
        if (selectedCategoryId !== "TODOS" && pkg.categoryId !== selectedCategoryId) {
          // Si seleccionó "cw_cat_completo", "cw_cat_premium", "cw_cat_detailing" o "cw_cat_exterior", muestra los de esa categoría
          return false;
        }
        if (q) {
          const hay = `${pkg.name} ${pkg.code} ${pkg.shortDescription} ${(pkg.includedProcedures || []).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [config, selectedVehicleTypeId, selectedCategoryId, searchQuery]);

  // Servicios individuales filtrados según vehículo, categoría, subcategoría y búsqueda
  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services
      .filter((srv) => {
        if (!srv.active || srv.archived) return false;
        if (srv.applicableVehicleTypes?.length > 0) {
          const appList = srv.applicableVehicleTypes;
          const match =
            appList.includes(selectedVehicleTypeId) ||
            (selectedVehicleTypeId === "vt_sedan" && (appList.includes("vt_auto_pequeno") || appList.includes("vt_hatchback"))) ||
            (selectedVehicleTypeId === "vt_camioneta" && appList.includes("vt_camioneta_grande")) ||
            (selectedVehicleTypeId === "vt_mayor_tamano" && appList.includes("vt_furgoneta"));
          if (!match) return false;
        }
        if (selectedCategoryId !== "TODOS" && srv.categoryId !== selectedCategoryId) {
          return false;
        }
        if (
          selectedSubcategoryId !== "TODOS" &&
          srv.subcategoryId &&
          srv.subcategoryId !== selectedSubcategoryId
        ) {
          return false;
        }
        if (q) {
          const hay = `${srv.name} ${srv.code} ${srv.shortDescription} ${srv.fullDescription} ${(srv.includesList || []).join(" ")}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [services, selectedVehicleTypeId, selectedCategoryId, selectedSubcategoryId, searchQuery]);

  // Adicionales filtrados
  const activeAddons = useMemo(() => {
    if (!config) return [];
    const q = searchQuery.trim().toLowerCase();
    return config.addons
      .filter((a) => {
        if (!a.active) return false;
        if (
          a.applicableVehicleTypes?.length > 0 &&
          !a.applicableVehicleTypes.includes(selectedVehicleTypeId)
        ) {
          return false;
        }
        if (q && selectedCategoryId === "cw_cat_adicionales") {
          const hay = `${a.name} ${a.code} ${a.description}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  }, [config, selectedVehicleTypeId, searchQuery, selectedCategoryId]);

  // Toggle Paquete
  const handleTogglePackage = (pkg: CarWashPackage) => {
    if (pkg.availability === "No disponible") {
      mostrarToast("Este paquete no se encuentra disponible actualmente", "err");
      return;
    }
    const priceInfo = computePriceForVehicle(pkg, selectedVehicleTypeId);
    if (!priceInfo.unitPrice) {
      mostrarToast("Falta configurar el precio de este paquete antes de seleccionarlo", "err");
      return;
    }
    setSelectedPackageIds((prev) =>
      prev.includes(pkg.id) ? prev.filter((id) => id !== pkg.id) : [...prev, pkg.id]
    );
  };

  // Toggle Servicio Individual
  const handleToggleService = (srv: CarWashEnrichedService) => {
    if (srv.availability === "No disponible") {
      mostrarToast("Este servicio no está disponible actualmente", "err");
      return;
    }
    const priceInfo = computePriceForVehicle(srv, selectedVehicleTypeId);
    if (!priceInfo.unitPrice) {
      mostrarToast("Falta configurar el precio de este servicio antes de seleccionarlo", "err");
      return;
    }
    setSelectedServiceIds((prev) =>
      prev.includes(srv.id) ? prev.filter((id) => id !== srv.id) : [...prev, srv.id]
    );
  };

  // Toggle Adicional
  const handleToggleAddon = (addon: CarWashAddon) => {
    if (addonsIncludedInSelectedPackages[addon.id]) {
      mostrarToast(
        `"${addon.name}" ya está incluido gratis dentro de ${addonsIncludedInSelectedPackages[addon.id]}`,
        "ok"
      );
      return;
    }
    const hasMain = selectedPackageIds.length > 0 || selectedServiceIds.length > 0;
    if (!addon.canBeStandalone && !hasMain && !selectedAddonIds.includes(addon.id)) {
      mostrarToast(
        `"${addon.name}" requiere seleccionar primero un lavado o paquete principal.`,
        "err"
      );
      return;
    }
    setSelectedAddonIds((prev) =>
      prev.includes(addon.id) ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
    );
  };

  // Guardar servicio creado/editado desde el modal
  const handleSaveServiceAdmin = async (servicePayload: any) => {
    const res = await fetch("/api/taller/carwash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SAVE_SERVICE",
        service: servicePayload,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "Error al guardar servicio", "err");
      throw new Error(data.error || "Error");
    }
    setConfig(data.config);
    setServices(data.services || []);
    mostrarToast("Servicio guardado correctamente en Neon", "ok");
  };

  // Eliminar o archivar servicio desde el modal
  const handleDeleteServiceAdmin = async (id: string) => {
    const res = await fetch(`/api/taller/carwash?id=${encodeURIComponent(id)}&type=service`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "No se pudo eliminar el servicio", "err");
      return;
    }
    setServices(data.services || []);
    setServiceFormModal({ open: false, service: null });
    mostrarToast(data.message || "Servicio actualizado", "ok");
  };

  // Guardar toda la configuración manual (Categorías, Vehículos, Paquetes, Adicionales, Reglas)
  const handleSaveConfigAdmin = async (updatedConfig: CarWashConfigData) => {
    const res = await fetch("/api/taller/carwash", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: updatedConfig }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      mostrarToast(data.error || "Error al guardar configuración", "err");
      throw new Error(data.error || "Error");
    }
    setConfig(data.config);
    setServices(data.services || []);
  };

  // Confirmar e integrar los servicios seleccionados con la Orden Activa / Carrito actual
  const handleConfirmSelectionToOrder = async (advanceToSignature: boolean) => {
    if (confirmingOrder) return;
    if (
      selectedPackageIds.length === 0 &&
      selectedServiceIds.length === 0 &&
      selectedAddonIds.length === 0
    ) {
      mostrarToast("Selecciona al menos un servicio, paquete o complemento", "err");
      return;
    }

    try {
      setConfirmingOrder(true);
      const res = await fetch("/api/taller/carwash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CALCULAR_Y_VALIDAR_SELECCION",
          vehicleTypeId: selectedVehicleTypeId,
          selectedPackageIds,
          selectedServiceIds,
          selectedAddonIds,
          promoCode: promoCodeInput,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.calculation) {
        mostrarToast(data.error || "Error al validar precios en el servidor", "err");
        return;
      }

      const calc = data.calculation;
      setServerCalculation(calc);

      // Conservar ítems de otras áreas (ej. Lubricentro o Tecnicentro) y reemplazar los de Car Wash
      const nonCarWashItems = (itemsOrden || []).filter((it) => {
        const code = String(it.code || "");
        const cat = String(it.category || "");
        return (
          cat !== "Lavado" &&
          cat !== "Car Wash" &&
          !code.startsWith("CW-") &&
          !code.startsWith("PKG-CW-") &&
          !code.startsWith("ADD-CW-")
        );
      });

      const carWashOrderItems = (calc.lines || [])
        .filter((line: any) => !line.alreadyIncludedInPackage)
        .map((line: any) => ({
          id: line.id,
          code: line.code,
          name: line.name,
          category: "Lavado",
          subCategory: line.subCategory,
          price: Number(line.unitPrice),
          qty: 1,
          type: "SERVICE",
          estimatedMinutes: line.estimatedMinutes,
          vehicleType: calc.vehicleType?.name || "",
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        }));

      const merged = [...nonCarWashItems, ...carWashOrderItems];
      await onActualizarItemsOrden(merged);
      mostrarToast(
        `✓ ${carWashOrderItems.length} servicio(s) de Car Wash aplicados a la orden ($${Number(
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

  // Confirmar una Reserva en Bahía de Lavado (ClientAppointment real en Neon)
  const handleConfirmBayReservation = async () => {
    if (savingBooking) return;
    if (!serverCalculation || !serverCalculation.lines?.length) {
      mostrarToast("Selecciona primero al menos un servicio o paquete para reservar", "err");
      return;
    }

    try {
      setSavingBooking(true);
      const summaryNames = serverCalculation.lines
        .map((l: any) => l.name)
        .join(" + ")
        .slice(0, 180);

      const idempKey = `${ordenActiva?.plate || "CW"}-${bookingDate}-${bookingTimeSlot}-${bookingBay}`;

      const res = await fetch("/api/taller/carwash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREAR_RESERVA_CARWASH",
          vehicle:
            ordenActiva?.vehicle ||
            `${currentVehicleType?.name || "Vehículo"} (${ordenActiva?.plate || "Recepción"})`,
          plate: ordenActiva?.plate || "S/P",
          clientName: ordenActiva?.client || "Cliente Car Wash",
          clientPhone: ordenActiva?.clientPhone || "",
          serviceSummary: summaryNames,
          date: bookingDate,
          timeSlot: bookingTimeSlot,
          bay: bookingBay,
          notes: bookingNotes,
          idempotencyKey: idempKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        mostrarToast(data.error || "No se pudo registrar la reserva", "err");
        return;
      }

      setLastBookingConfirmed(data.appointment);
      setAppointments((prev) => [
        data.appointment,
        ...prev.filter((a) => a.id !== data.appointment.id),
      ]);
      mostrarToast(
        `📅 Reserva #${data.appointment.appointmentNumber} confirmada en ${bookingBay} (${bookingDate} ${bookingTimeSlot})`,
        "ok"
      );
    } finally {
      setSavingBooking(false);
    }
  };

  // Guardar en pedido desde Car Wash (selección o manual)
  const handleGuardarServicioManualEnOrden = async () => {
    if (confirmingOrder) return;
    setConfirmingOrder(true);
    try {
      const texto = manualServicioTexto.trim();
      const precioNum = Math.max(0, parseFloat(manualServicioPrecio) || 0);
      const cantidad = Math.max(1, manualCantidad || 1);
      const totalManual = Number((precioNum * cantidad).toFixed(2));

      const itemsParaGuardar: any[] = [];

      // 1. Agregar servicios seleccionados del catálogo si hay
      if (serverCalculation?.lines?.length > 0) {
        serverCalculation.lines
          .filter((line: any) => !line.alreadyIncludedInPackage)
          .forEach((line: any) => {
            itemsParaGuardar.push({
              id: line.id,
              code: line.code,
              name: line.name,
              category: "Lavado",
              subCategory: line.subCategory || "Car Wash",
              price: Number(line.unitPrice),
              total: Number(line.unitPrice),
              qty: 1,
              type: "SERVICE",
              estimatedMinutes: line.estimatedMinutes,
              vehicleType: currentVehicleType?.name || "",
              status: "Listo",
              completed: true,
              empleado_id: empleadoLogueado.id,
              empleado_nombre: empleadoLogueado.nombre,
            });
          });
      }

      // 2. Agregar servicio manual si se escribió
      if (texto) {
        const code = `CW-MAN-${Math.floor(100 + Math.random() * 900)}`;
        const cantTexto = `${cantidad} ${manualUnidad}`;
        itemsParaGuardar.push({
          id: `sol_cw_${Date.now()}`,
          key: `cw_${Date.now()}`,
          code,
          name: `${texto} (${cantTexto} - ${currentVehicleType?.name || "General"})`,
          category: "Lavado",
          subCategory: "Manual",
          price: precioNum,
          total: totalManual,
          qty: cantidad,
          unitOfMeasure: manualUnidad,
          type: "SERVICE",
          vehicleType: currentVehicleType?.name || "",
          status: "Listo",
          completed: true,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        });
      }

      if (itemsParaGuardar.length === 0) {
        mostrarToast("Selecciona un servicio o escribe uno manualmente", "err");
        return;
      }

      // Conservar ítems de otras áreas (ej. Lubricentro)
      const nonCarWashItems = (itemsOrden || []).filter((it) => {
        const code = String(it.code || "");
        const cat = String(it.category || "");
        return (
          cat !== "Lavado" &&
          cat !== "Car Wash" &&
          !code.startsWith("CW-") &&
          !code.startsWith("PKG-CW-") &&
          !code.startsWith("ADD-CW-")
        );
      });

      const merged = [...nonCarWashItems, ...itemsParaGuardar];
      await onActualizarItemsOrden(merged);

      const totalVal = itemsParaGuardar.reduce((acc, curr) => acc + (Number(curr.total || curr.price) || 0), 0);
      mostrarToast(
        `✓ ${itemsParaGuardar.length} servicio(s) de Car Wash guardados en la orden ($${totalVal.toFixed(2)})`,
        "ok"
      );

      // Limpiar campos
      setManualServicioTexto("");
      setManualServicioPrecio("");
      setSelectedPackageIds([]);
      setSelectedServiceIds([]);
      setSelectedAddonIds([]);
      setServerCalculation(null);
    } finally {
      setConfirmingOrder(false);
    }
  };

  // Agregar múltiples servicios seleccionados a la orden
  const handleAgregarVariosSeleccionados = async () => {
    if (agregandoVarios || itemsSeleccionadosTiendaIds.length === 0) return;
    try {
      setAgregandoVarios(true);
      const seleccionados = itemsTienda.filter((it) =>
        itemsSeleccionadosTiendaIds.includes(it.id)
      );
      if (seleccionados.length === 0) return;

      const nuevosItems: any[] = seleccionados.map((item) => {
        const code = item.code || `CW-${Math.floor(100 + Math.random() * 900)}`;
        return {
          id: `cw_${item.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          key: `key_${item.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type: "SERVICE",
          category: "Lavado",
          subCategory: item.kind === "PACKAGE" ? "Paquete" : item.kind === "ADDON" ? "Extra" : "Servicio",
          code,
          name: `${item.name} (${currentVehicleType?.name || "General"})`,
          brand: "Car Wash",
          presentation: "Servicio",
          unitOfMeasure: "Servicio",
          price: Number(item.price || 0),
          total: Number(item.price || 0),
          qty: 1,
          status: "Listo",
          completed: true,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        };
      });

      const actualizados = [...(itemsOrden || []), ...nuevosItems];
      await onActualizarItemsOrden(actualizados);
      mostrarToast(`✓ ${nuevosItems.length} servicios de Car Wash agregados`, "ok");
      setItemsSeleccionadosTiendaIds([]);
    } catch {
      mostrarToast("Error al agregar servicios", "err");
    } finally {
      setAgregandoVarios(false);
    }
  };

  // Agregar un producto/servicio directamente al pedido
  const handleAgregarDirectoItem = async (item: any) => {
    try {
      const code = item.code || `CW-${Math.floor(100 + Math.random() * 900)}`;
      const nuevoItem = {
        id: `cw_${item.id}_${Date.now()}`,
        key: `key_${item.id}_${Date.now()}`,
        type: "SERVICE",
        category: "Lavado",
        subCategory: item.kind === "PACKAGE" ? "Paquete" : item.kind === "ADDON" ? "Extra" : "Servicio",
        code,
        name: `${item.name} (${currentVehicleType?.name || "General"})`,
        brand: "Car Wash",
        presentation: "Servicio",
        unitOfMeasure: "Servicio",
        price: Number(item.price || 0),
        total: Number(item.price || 0),
        qty: 1,
        status: "Listo",
        completed: true,
        empleado_id: empleadoLogueado.id,
        empleado_nombre: empleadoLogueado.nombre,
      };

      const actualizados = [...(itemsOrden || []), nuevoItem];
      await onActualizarItemsOrden(actualizados);
      mostrarToast(`✓ Agregado: ${item.name}`, "ok");
    } catch {
      mostrarToast("Error al agregar servicio", "err");
    }
  };

  if (loading && !config) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 text-center space-y-3 animate-pulse">
        <div className="text-3xl">🚿</div>
        <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          Cargando catálogo de Car Wash, paquetes y tarifas desde Neon...
        </p>
      </div>
    );
  }

  if (errorMsg || !config) {
    return (
      <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-center space-y-3">
        <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
          ⚠️ {errorMsg || "Error al cargar el módulo Car Wash"}
        </p>
        <button
          type="button"
          onClick={() => void fetchCarWashData()}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
        >
          Reintentar carga
        </button>
      </div>
    );
  }

  const totalSelectionsCount =
    selectedPackageIds.length + selectedServiceIds.length + selectedAddonIds.length;

  const itemsTienda = useMemo(() => {
    const q = searchQuery
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    // "no debe salir hasta que busque"
    if (!q) {
      return [];
    }

    const terms = q.split(/\s+/).filter(Boolean);

    const matchText = (text: string) => {
      const norm = (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return terms.every((t) => norm.includes(t));
    };

    const list: Array<{
      id: string;
      kind: "PACKAGE" | "SERVICE" | "ADDON";
      name: string;
      code: string;
      description?: string;
      durationMinutes?: number;
      price: number;
      rawPackage?: CarWashPackage;
      rawService?: CarWashEnrichedService;
      rawAddon?: CarWashAddon;
      imageUrl?: string;
      isSelected: boolean;
    }> = [];

    filteredPackages.forEach((pkg) => {
      const full = `${pkg.name} ${pkg.code} ${pkg.shortDescription || ""} ${(pkg.includedProcedures || []).join(" ")}`;
      if (!matchText(full)) return;
      const pr = computePriceForVehicle(pkg, selectedVehicleTypeId).unitPrice ?? 0;
      list.push({
        id: pkg.id,
        kind: "PACKAGE",
        name: pkg.name,
        code: pkg.code,
        description: pkg.shortDescription,
        durationMinutes: pkg.estimatedMinutes,
        price: pr,
        rawPackage: pkg,
        imageUrl: pkg.imageUrl,
        isSelected: itemsSeleccionadosTiendaIds.includes(pkg.id) || selectedPackageIds.includes(pkg.id),
      });
    });

    filteredServices.forEach((srv) => {
      const full = `${srv.name} ${srv.code} ${srv.shortDescription || ""} ${srv.fullDescription || ""} ${(srv.includesList || []).join(" ")}`;
      if (!matchText(full)) return;
      const pr = computePriceForVehicle(srv, selectedVehicleTypeId).unitPrice ?? 0;
      list.push({
        id: srv.id,
        kind: "SERVICE",
        name: srv.name,
        code: srv.code,
        description: srv.shortDescription || srv.fullDescription,
        durationMinutes: srv.estimatedMinutes || 30,
        price: pr,
        rawService: srv,
        imageUrl: srv.imageUrl,
        isSelected: itemsSeleccionadosTiendaIds.includes(srv.id) || selectedServiceIds.includes(srv.id),
      });
    });

    activeAddons.forEach((add) => {
      const full = `${add.name} ${add.code} ${add.description || ""}`;
      if (!matchText(full)) return;
      const pr = computePriceForVehicle(add, selectedVehicleTypeId).unitPrice ?? 0;
      list.push({
        id: add.id,
        kind: "ADDON",
        name: add.name,
        code: add.code,
        description: add.description,
        durationMinutes: add.estimatedMinutes || 15,
        price: pr,
        rawAddon: add,
        imageUrl: add.imageUrl,
        isSelected: itemsSeleccionadosTiendaIds.includes(add.id) || selectedAddonIds.includes(add.id),
      });
    });

    return list;
  }, [
    searchQuery,
    filteredPackages,
    filteredServices,
    activeAddons,
    selectedVehicleTypeId,
    itemsSeleccionadosTiendaIds,
    selectedPackageIds,
    selectedServiceIds,
    selectedAddonIds,
  ]);

  // Todos los ítems para el Catálogo General (sin precio en la vista de tarjetas)
  const todosLosItemsCatalogo = useMemo(() => {
    if (!config) return [];
    const q = searchQuery
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    const terms = q.split(/\s+/).filter(Boolean);
    const matchText = (text: string) => {
      if (!terms.length) return true;
      const norm = (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return terms.every((t) => norm.includes(t));
    };

    const list: Array<{
      id: string;
      kind: "PACKAGE" | "SERVICE" | "ADDON";
      name: string;
      code: string;
      brand?: string;
      presentation?: string;
      description?: string;
      durationMinutes?: number;
      price: number;
      imageUrl?: string;
      categoryId?: string;
    }> = [];

    (config.packages || []).forEach((pkg) => {
      if (!pkg.active) return;
      if (filtroCategoriaGeneral && pkg.categoryId !== filtroCategoriaGeneral) return;
      const full = `${pkg.name} ${pkg.code} ${pkg.shortDescription || ""}`;
      if (!matchText(full)) return;
      const pr = computePriceForVehicle(pkg, selectedVehicleTypeId).unitPrice ?? 0;
      list.push({
        id: pkg.id,
        kind: "PACKAGE",
        name: pkg.name,
        code: pkg.code,
        brand: "Paquete",
        description: pkg.shortDescription,
        durationMinutes: pkg.estimatedMinutes,
        price: pr,
        imageUrl: pkg.imageUrl,
        categoryId: pkg.categoryId,
        presentation: `${pkg.estimatedMinutes || 45} min · Paquete`,
      });
    });

    services.forEach((srv) => {
      if (!srv.active || srv.archived) return;
      if (filtroCategoriaGeneral && srv.categoryId !== filtroCategoriaGeneral) return;
      const full = `${srv.name} ${srv.code} ${srv.shortDescription || ""} ${srv.fullDescription || ""}`;
      if (!matchText(full)) return;
      const pr = computePriceForVehicle(srv, selectedVehicleTypeId).unitPrice ?? 0;
      const catObj = config.categories?.find((c) => c.id === srv.categoryId);
      list.push({
        id: srv.id,
        kind: "SERVICE",
        name: srv.name,
        code: srv.code,
        brand: catObj?.name ? toSingleWord(catObj.name, CARWASH_CAT_SINGLE) : "Car Wash",
        description: srv.shortDescription || srv.fullDescription,
        durationMinutes: srv.estimatedMinutes || 30,
        price: pr,
        imageUrl: srv.imageUrl,
        categoryId: srv.categoryId,
        presentation: `${srv.estimatedMinutes || 30} min · Servicio`,
      });
    });

    (config.addons || []).forEach((add) => {
      if (!add.active) return;
      if (filtroCategoriaGeneral && filtroCategoriaGeneral !== "cw_cat_adicionales") return;
      const full = `${add.name} ${add.code} ${add.description || ""}`;
      if (!matchText(full)) return;
      const pr = computePriceForVehicle(add, selectedVehicleTypeId).unitPrice ?? 0;
      list.push({
        id: add.id,
        kind: "ADDON",
        name: add.name,
        code: add.code,
        brand: "Extra",
        description: add.description,
        durationMinutes: add.estimatedMinutes || 15,
        price: pr,
        imageUrl: add.imageUrl,
        categoryId: "cw_cat_adicionales",
        presentation: `${add.estimatedMinutes || 15} min · Adicional`,
      });
    });

    return list;
  }, [config, services, searchQuery, filtroCategoriaGeneral, selectedVehicleTypeId]);

  const totalCalculado = useMemo(() => {
    let sum = 0;
    if (serverCalculation?.total != null) {
      sum = Number(serverCalculation.total);
    } else {
      (config?.packages || [])
        .filter((p) => selectedPackageIds.includes(p.id))
        .forEach((p) => {
          sum += computePriceForVehicle(p, selectedVehicleTypeId).unitPrice ?? 0;
        });
      services
        .filter((s) => selectedServiceIds.includes(s.id))
        .forEach((s) => {
          sum += computePriceForVehicle(s, selectedVehicleTypeId).unitPrice ?? 0;
        });
      (config?.addons || [])
        .filter((a) => selectedAddonIds.includes(a.id))
        .forEach((a) => {
          sum += computePriceForVehicle(a, selectedVehicleTypeId).unitPrice ?? 0;
        });
    }
    const valManual = (parseFloat(manualServicioPrecio) || 0) * (manualCantidad || 1);
    return sum + valManual;
  }, [
    serverCalculation,
    config,
    services,
    selectedPackageIds,
    selectedServiceIds,
    selectedAddonIds,
    manualServicioPrecio,
    manualCantidad,
  ]);

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* =====================================================================
          FILA 1: CATEGORÍAS PRINCIPALES (Color, Porte y Diseño Taller y Lubricentro)
          ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 w-full">
        <button
          type="button"
          onClick={() => {
            setSelectedCategoryId("TODOS");
            setSelectedSubcategoryId("TODOS");
          }}
          className={`h-10 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs active:scale-95 ${
            selectedCategoryId === "TODOS"
              ? "bg-blue-50/90 dark:bg-blue-500/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/40 font-bold"
              : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
          }`}
        >
          <span className="text-base leading-none shrink-0">🚿</span>
          <span className="truncate">Todas</span>
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
              className={`h-10 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs active:scale-95 ${
                activa
                  ? "bg-blue-50/90 dark:bg-blue-500/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/40 font-bold"
                  : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span className="text-base leading-none shrink-0">{cat.icon || "🚿"}</span>
              <span className="truncate">{toSingleWord(cat.name, CARWASH_CAT_SINGLE)}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          FILA 2: SELECTOR DE TIPO DE VEHÍCULO (Color, Porte y Diseño Taller y Lubricentro)
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
              <span className="truncate">{toSingleWord(vt.name, CARWASH_VEH_SINGLE)}</span>
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
                {activeCategories.find((c) => c.id === selectedCategoryId)?.icon || "🚿"}
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
                      <span className="text-xs font-semibold truncate">Todos</span>
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
                            {sub.icon || "🚿"}
                          </div>
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected
                                ? "text-blue-700 dark:text-blue-300 font-bold"
                                : "text-zinc-700 dark:text-zinc-200"
                            }`}
                          >
                            {toSingleWord(sub.name, CARWASH_SUB_SINGLE)}
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
                          {cat.icon || "🚿"}
                        </div>
                        <span
                          className={`text-xs font-semibold truncate ${
                            isSelected
                              ? "text-blue-700 dark:text-blue-300 font-bold"
                              : "text-zinc-700 dark:text-zinc-200"
                          }`}
                        >
                          {toSingleWord(cat.name, CARWASH_CAT_SINGLE)}
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

          {/* 2. PANEL CENTRAL: Tienda de Car Wash */}
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
                  onClick={() => {
                    setSearchQuery("");
                    setItemsSeleccionadosTiendaIds([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Barra de Selección Múltiple y Acciones */}
            {searchQuery.trim() && itemsTienda.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-0.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (itemsSeleccionadosTiendaIds.length === itemsTienda.length) {
                      setItemsSeleccionadosTiendaIds([]);
                    } else {
                      setItemsSeleccionadosTiendaIds(itemsTienda.map((it) => it.id));
                    }
                  }}
                  className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={
                      itemsTienda.length > 0 &&
                      itemsSeleccionadosTiendaIds.length === itemsTienda.length
                    }
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                  />
                  <span>
                    {itemsSeleccionadosTiendaIds.length === itemsTienda.length
                      ? "Deseleccionar"
                      : "Seleccionar todos"}
                  </span>
                </button>

                {itemsSeleccionadosTiendaIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAgregarVariosSeleccionados}
                    disabled={agregandoVarios}
                    className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>+</span>
                    <span>
                      {agregandoVarios
                        ? "Agregando..."
                        : `Agregar (${itemsSeleccionadosTiendaIds.length})`}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Lista de Servicios / Paquetes / Adicionales (solo visible cuando se busca) */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-0.5">
              {!searchQuery.trim() ? null : itemsTienda.length === 0 ? (
                <div className="p-6 rounded-xl bg-zinc-50/70 dark:bg-white/[0.01] border border-dashed border-zinc-200 dark:border-white/10 text-center space-y-1.5 text-zinc-400">
                  <span className="text-xl block">🔍</span>
                  <p className="text-xs font-semibold">No se encontraron servicios ni paquetes para esta búsqueda.</p>
                </div>
              ) : (
                itemsTienda.map((item) => {
                  const isChecked = itemsSeleccionadosTiendaIds.includes(item.id);
                  return (
                    <div
                      key={`${item.kind}-${item.id}`}
                      onClick={() => {
                        setItemsSeleccionadosTiendaIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        );
                        setManualServicioTexto(item.name);
                        setManualServicioPrecio(item.price.toFixed(2));
                      }}
                      className={`p-2.5 sm:p-3 rounded-lg border flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-2xs ${
                        isChecked || item.isSelected
                          ? "bg-blue-50/80 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/50 ring-1 ring-blue-400/30"
                          : "bg-white dark:bg-white/[0.02] hover:bg-zinc-50/70 dark:hover:bg-white/[0.05] border-zinc-200 dark:border-white/10 hover:border-blue-400/50"
                      }`}
                    >
                      {/* Checkbox de selección múltiple */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemsSeleccionadosTiendaIds((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((id) => id !== item.id)
                              : [...prev, item.id]
                          );
                        }}
                        className="pr-1 flex items-center"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                        />
                      </div>

                      <div className="w-11 h-13 sm:w-12 sm:h-14 rounded-md bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/5 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl">
                            {item.kind === "PACKAGE" ? "📦" : item.kind === "ADDON" ? "✨" : "🚿"}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-[11px] sm:text-xs font-normal text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                            {item.name}
                          </h4>
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
                          <span className="text-xs sm:text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            $ {item.price.toFixed(2)}
                          </span>
                          {currentVehicleType && (
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
                          void handleAgregarDirectoItem(item);
                        }}
                        className="h-8 px-3 rounded-lg border text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs bg-blue-100/80 hover:bg-blue-200/80 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"
                      >
                        <span>+</span>
                        <span>Agregar</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. PANEL DERECHO: MANUAL */}
          <div className="md:col-span-12 lg:col-span-4 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3 shadow-2xs">
            <h3 className="text-xs sm:text-sm font-normal text-zinc-900 dark:text-white pb-2 border-b border-zinc-100 dark:border-white/5">
              Manual
            </h3>

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

            {/* Unidad de medida (Desplegable moderno y minimalista en modo oscuro) */}
            <div ref={menuUnidadRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownUnidadAbierto((prev) => !prev)}
                className={`w-full h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer shadow-2xs select-none active:scale-98 ${
                  dropdownUnidadAbierto
                    ? "bg-blue-50/50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/50 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/30"
                    : "bg-white dark:bg-black/40 hover:bg-zinc-50 dark:hover:bg-white/[0.05] border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200"
                }`}
              >
                <span>{manualUnidad || "Servicio"}</span>
                <span
                  className={`text-[9px] text-zinc-400 transition-transform duration-200 ${
                    dropdownUnidadAbierto ? "rotate-180 text-blue-500 dark:text-blue-400" : ""
                  }`}
                >
                  ▾
                </span>
              </button>

              {dropdownUnidadAbierto && (
                <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 shadow-xl dark:shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 z-40 animate-fade-in">
                  {["Servicio", "Vehículo", "Lavado", "Hora"].map((u) => {
                    const isSelected = manualUnidad === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setManualUnidad(u);
                          setDropdownUnidadAbierto(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                        }`}
                      >
                        <span>{u}</span>
                        {isSelected && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cantidad con botones stepper */}
            <div className="p-2.5 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-300/60 dark:border-blue-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                Cantidad
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-black/40 rounded-lg border border-zinc-200 dark:border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setManualCantidad((prev) => Math.max(1, prev - 1))}
                  className="w-6 h-6 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  −
                </button>
                <input
                  type="number"
                  step={1}
                  min={1}
                  value={manualCantidad}
                  onChange={(e) => setManualCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-10 text-center font-mono font-bold text-xs bg-transparent text-zinc-900 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setManualCantidad((prev) => prev + 1)}
                  className="w-6 h-6 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  +
                </button>
              </div>
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
                  ⏱ {serverCalculation?.estimatedMinutes || 30} min
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
                  setManualCantidad(1);
                  setManualUnidad("Servicio");
                  setSelectedPackageIds([]);
                  setSelectedServiceIds([]);
                  setSelectedAddonIds([]);
                  setServerCalculation(null);
                }}
                className="h-8 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  confirmingOrder ||
                  (totalSelectionsCount === 0 &&
                    (!manualServicioTexto.trim() || !(parseFloat(manualServicioPrecio) > 0)))
                }
                onClick={() => void handleGuardarServicioManualEnOrden()}
                className="h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs disabled:opacity-50"
              >
                {confirmingOrder ? "Guardando..." : "Guardar en pedido"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA COMPLETA: TODA LA TIENDA Y CATÁLOGO GENERAL DE CAR WASH */
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

            <div ref={menuFiltroRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuFiltroAbierto((prev) => !prev)}
                className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shadow-2xs select-none active:scale-95 ${
                  menuFiltroAbierto || filtroCategoriaGeneral
                    ? "bg-blue-50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/20"
                    : "bg-white dark:bg-black/40 hover:bg-zinc-50 dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200"
                }`}
              >
                <span>
                  {activeCategories.find((c) => c.id === filtroCategoriaGeneral)?.name
                    ? toSingleWord(activeCategories.find((c) => c.id === filtroCategoriaGeneral)!.name, CARWASH_CAT_SINGLE)
                    : "Todos"}
                </span>
                <span
                  className={`text-[9px] text-zinc-400 transition-transform duration-200 ${
                    menuFiltroAbierto ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>

              {menuFiltroAbierto && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 shadow-xl dark:shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 z-40 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroCategoriaGeneral("");
                      setMenuFiltroAbierto(false);
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
                          setMenuFiltroAbierto(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          activa
                            ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm shrink-0">{cat.icon || "🚿"}</span>
                          <span className="truncate">{toSingleWord(cat.name, CARWASH_CAT_SINGLE)}</span>
                        </div>
                        {activa && <span className="text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Grid de servicios y paquetes sin precio con diseño estándar */}
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
                        {item.kind === "PACKAGE" ? "📦" : item.kind === "ADDON" ? "✨" : "🚿"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block truncate">
                    {item.brand || (item.kind === "PACKAGE" ? "Paquete" : item.kind === "ADDON" ? "Extra" : "Servicio")}
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
                  Reservar Bahía de Lavado
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
                <div ref={menuHorarioRef} className="relative">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Horario
                  </label>
                  <button
                    type="button"
                    onClick={() => setDropdownHorarioAbierto((prev) => !prev)}
                    className="w-full h-8 px-2.5 rounded-lg bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white flex items-center justify-between cursor-pointer shadow-2xs"
                  >
                    <span>{bookingTimeSlot}</span>
                    <span className={`text-[9px] text-zinc-400 transition-transform duration-200 ${dropdownHorarioAbierto ? "rotate-180 text-blue-500" : ""}`}>
                      ▾
                    </span>
                  </button>
                  {dropdownHorarioAbierto && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 shadow-xl dark:shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 z-50 animate-fade-in">
                      {HORARIOS_DISPONIBLES.map((h) => {
                        const isSelected = bookingTimeSlot === h;
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => {
                              setBookingTimeSlot(h);
                              setDropdownHorarioAbierto(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                            }`}
                          >
                            <span>{h}</span>
                            {isSelected && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Bahía de Lavado
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(config.bays || ["Bahía Lavado 1", "Bahía Lavado 2"]).map((bay) => (
                    <button
                      key={bay}
                      type="button"
                      onClick={() => setBookingBay(bay)}
                      className={`p-2 rounded-lg border text-xs font-semibold text-center cursor-pointer transition-all ${
                        bookingBay === bay
                          ? "bg-blue-600 text-white border-blue-500 shadow-2xs"
                          : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {bay}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Notas u Observaciones
                </label>
                <input
                  type="text"
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Ej: Cliente espera en sala..."
                  className="w-full h-8 px-2.5 rounded-lg bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                />
              </div>

              {lastBookingConfirmed && (
                <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-800 dark:text-emerald-300">
                  ✓ Reserva <strong>#{lastBookingConfirmed.appointmentNumber}</strong> confirmada para el {lastBookingConfirmed.date} ({lastBookingConfirmed.timeSlot}).
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowBookingPanel(false)}
                className="h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={savingBooking}
                onClick={async () => {
                  await handleConfirmBayReservation();
                }}
                className="h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {savingBooking ? "Guardando..." : "Confirmar Reserva"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES ADMINISTRATIVOS */}
      {detailModalItem && (
        <ModalDetalleServicioCarWash
          item={detailModalItem.item}
          kind={detailModalItem.kind}
          config={config}
          selectedVehicleTypeId={selectedVehicleTypeId}
          isSelected={
            detailModalItem.kind === "PACKAGE"
              ? selectedPackageIds.includes(detailModalItem.item.id)
              : selectedServiceIds.includes(detailModalItem.item.id)
          }
          selectedAddonIds={selectedAddonIds}
          onToggleSelect={() => {
            if (detailModalItem.kind === "PACKAGE") {
              handleTogglePackage(detailModalItem.item as CarWashPackage);
            } else {
              handleToggleService(detailModalItem.item as CarWashEnrichedService);
            }
          }}
          onToggleAddon={(addonId) => {
            const found = config.addons.find((a) => a.id === addonId);
            if (found) handleToggleAddon(found);
          }}
          onEditItem={() => {
            if (detailModalItem.kind === "SERVICE") {
              const srv = detailModalItem.item as CarWashEnrichedService;
              setDetailModalItem(null);
              setServiceFormModal({ open: true, service: srv });
            } else {
              setDetailModalItem(null);
              setConfigModalOpen(true);
            }
          }}
          onClose={() => setDetailModalItem(null)}
        />
      )}

      {serviceFormModal.open && (
        <ModalServicioCarWashForm
          initialService={serviceFormModal.service}
          config={config}
          onSave={handleSaveServiceAdmin}
          onDelete={handleDeleteServiceAdmin}
          onClose={() => setServiceFormModal({ open: false, service: null })}
          mostrarToast={mostrarToast}
        />
      )}

      {configModalOpen && (
        <ModalConfiguracionCarWash
          config={config}
          onSaveConfig={handleSaveConfigAdmin}
          onClose={() => setConfigModalOpen(false)}
          mostrarToast={mostrarToast}
        />
      )}
    </div>
  );
}
