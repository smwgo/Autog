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
  onIrASiguiente?: () => void;
  nombreSiguiente?: string;
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

export default function ModuloCarWashCatalogo({
  empleadoLogueado,
  ordenActiva,
  itemsOrden,
  mostrarToast,
  onActualizarItemsOrden,
  onIrAAvisoYFirma,
  onIrASiguiente,
  nombreSiguiente,
  triggerAbrirConfig,
}: ModuloCarWashCatalogoProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [config, setConfig] = useState<CarWashConfigData | null>(null);
  const [services, setServices] = useState<CarWashEnrichedService[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

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

  // Cargar datos reales desde Neon PostgreSQL
  const fetchCarWashData = useCallback(async () => {
    try {
      if (!config) setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/taller/carwash", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo cargar el módulo Car Wash");
      }
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
    const handleCatalogoActualizado = () => {
      void fetchCarWashData();
    };
    window.addEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    return () => {
      window.removeEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    };
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
            c.id !== "cw_cat_premium" &&
            !c.slug?.includes("premium") &&
            !c.name?.toLowerCase().includes("premium") &&
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

  // Ajustar (+1 / -1) la cantidad de un servicio/paquete/extra de Car Wash directamente en la orden
  const obtenerCantidadEnPedido = (item: { id: string; code: string }) => {
    const matches = (itemsOrden || []).filter(
      (it) =>
        it.id === item.id ||
        it.serviceId === item.id ||
        (it.code && item.code && it.code === item.code)
    );
    return matches.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
  };

  const handleAjustarCantidadItem = async (
    item: {
      id: string;
      kind: "PACKAGE" | "SERVICE" | "ADDON";
      name: string;
      code: string;
      price: number;
      durationMinutes?: number;
      categoryId?: string;
    },
    delta: number
  ) => {
    try {
      const code = item.code || `CW-${item.id}`;
      const vehLabel = currentVehicleType
        ? toSingleWord(currentVehicleType.name, CARWASH_VEH_SINGLE)
        : "Auto";
      const listaActual = [...(itemsOrden || [])];
      const idx = listaActual.findIndex(
        (it) =>
          it.id === item.id ||
          it.serviceId === item.id ||
          (it.code && item.code && it.code === item.code)
      );

      if (idx >= 0) {
        const actualQty = Number(listaActual[idx].qty) || 1;
        const nextQty = actualQty + delta;
        if (nextQty <= 0) {
          const filtrados = listaActual.filter((_, i) => i !== idx);
          await onActualizarItemsOrden(filtrados);
        } else {
          const priceUnit = Number(item.price || listaActual[idx].price || 0);
          const actualizados = listaActual.map((it, i) =>
            i === idx
              ? {
                  ...it,
                  qty: nextQty,
                  price: priceUnit,
                  total: Number((priceUnit * nextQty).toFixed(2)),
                }
              : it
          );
          await onActualizarItemsOrden(actualizados);
        }
      } else if (delta > 0) {
        const priceUnit = Number(item.price || 0);
        const nuevoItem = {
          id: `cw_${item.id}_${Date.now()}`,
          key: `key_${item.id}_${Date.now()}`,
          serviceId: item.id,
          type: "SERVICE" as const,
          category: "Lavado",
          cwCategoryId: item.categoryId || selectedCategoryId,
          subCategory:
            item.kind === "PACKAGE"
              ? "Paquete"
              : item.kind === "ADDON"
              ? "Extra"
              : "Servicio",
          code,
          name: `${item.name} (${vehLabel})`,
          brand: "Car Wash",
          presentation: item.durationMinutes ? `${item.durationMinutes} min` : "Servicio",
          unitOfMeasure: "Servicio",
          price: priceUnit,
          total: Number((priceUnit * delta).toFixed(2)),
          qty: delta,
          estimatedMinutes: item.durationMinutes || 30,
          vehicleType: currentVehicleType?.name || vehLabel,
          status: "Listo" as const,
          completed: true,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        };
        await onActualizarItemsOrden([...listaActual, nuevoItem]);
      }
    } catch {
      mostrarToast("Error al actualizar servicio de Car Wash", "err");
    }
  };

  // Lista unificada y automática de servicios, paquetes y extras (se muestra al instante sin escribir)
  const itemsFiltradosAutomaticos = useMemo(() => {
    const q = searchQuery
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    const terms = q.split(/\s+/).filter(Boolean);
    const matchText = (text: string) => {
      if (terms.length === 0) return true;
      const norm = (text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return terms.every((t) => norm.includes(t));
    };

    const list: Array<{
      id: string;
      kind: "PACKAGE" | "SERVICE" | "ADDON";
      name: string;
      code: string;
      brand: string;
      description?: string;
      durationMinutes?: number;
      price: number;
      originalPrice?: number | null;
      isPromo?: boolean;
      categoryId?: string;
      subcategoryId?: string;
      rawPackage?: CarWashPackage;
      rawService?: CarWashEnrichedService;
      rawAddon?: CarWashAddon;
      imageUrl?: string;
    }> = [];

    // 1. Paquetes (si filtro de tipo lo permite)
    if (!filtroCategoriaGeneral || filtroCategoriaGeneral === "PACKAGE") {
      filteredPackages.forEach((pkg) => {
        if (selectedSubcategoryId !== "TODOS") return;
        const full = `${pkg.name} ${pkg.code} ${pkg.shortDescription || ""} ${(pkg.includedProcedures || []).join(" ")}`;
        if (!matchText(full)) return;
        const pInfo = computePriceForVehicle(pkg, selectedVehicleTypeId);
        list.push({
          id: pkg.id,
          kind: "PACKAGE",
          name: pkg.name,
          code: pkg.code,
          brand: "Paquete",
          description: pkg.shortDescription,
          durationMinutes: pkg.estimatedMinutes,
          price: pInfo.unitPrice ?? 0,
          originalPrice: pInfo.originalPrice,
          isPromo: pInfo.isPromo,
          categoryId: pkg.categoryId,
          rawPackage: pkg,
          imageUrl: pkg.imageUrl,
        });
      });
    }

    // 2. Servicios individuales
    if (!filtroCategoriaGeneral || filtroCategoriaGeneral === "SERVICE") {
      filteredServices.forEach((srv) => {
        const full = `${srv.name} ${srv.code} ${srv.shortDescription || ""} ${srv.fullDescription || ""} ${(srv.includesList || []).join(" ")}`;
        if (!matchText(full)) return;
        const pInfo = computePriceForVehicle(srv, selectedVehicleTypeId);
        const catObj = config?.categories?.find((c) => c.id === srv.categoryId);
        list.push({
          id: srv.id,
          kind: "SERVICE",
          name: srv.name,
          code: srv.code,
          brand: catObj?.name ? toSingleWord(catObj.name, CARWASH_CAT_SINGLE) : "Servicio",
          description: srv.shortDescription || srv.fullDescription,
          durationMinutes: srv.estimatedMinutes || 30,
          price: pInfo.unitPrice ?? 0,
          originalPrice: pInfo.originalPrice,
          isPromo: pInfo.isPromo,
          categoryId: srv.categoryId,
          subcategoryId: srv.subcategoryId,
          rawService: srv,
          imageUrl: srv.imageUrl,
        });
      });
    }

    // 3. Adicionales / Extras (cuando está en Todas o filtró por Extras)
    if (
      (!filtroCategoriaGeneral && selectedCategoryId === "TODOS") ||
      filtroCategoriaGeneral === "ADDON"
    ) {
      activeAddons.forEach((add) => {
        const full = `${add.name} ${add.code} ${add.description || ""}`;
        if (!matchText(full)) return;
        const pInfo = computePriceForVehicle(add, selectedVehicleTypeId);
        list.push({
          id: add.id,
          kind: "ADDON",
          name: add.name,
          code: add.code,
          brand: "Extra",
          description: add.description,
          durationMinutes: add.estimatedMinutes || 15,
          price: pInfo.unitPrice ?? 0,
          originalPrice: pInfo.originalPrice,
          isPromo: pInfo.isPromo,
          categoryId: "cw_cat_adicionales",
          rawAddon: add,
          imageUrl: add.imageUrl,
        });
      });
    }

    return list;
  }, [
    searchQuery,
    filtroCategoriaGeneral,
    filteredPackages,
    filteredServices,
    activeAddons,
    selectedVehicleTypeId,
    selectedCategoryId,
    selectedSubcategoryId,
    config,
  ]);

  // Conteos por categoría y subcategoría para los pills superiores
  const conteoPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    (config?.packages || []).forEach((p) => {
      if (p.active && p.categoryId) {
        map[p.categoryId] = (map[p.categoryId] || 0) + 1;
      }
    });
    services.forEach((s) => {
      if (s.active && !s.archived && s.categoryId) {
        map[s.categoryId] = (map[s.categoryId] || 0) + 1;
      }
    });
    return map;
  }, [config?.packages, services]);

  const conteoPorSubcategoria = useMemo(() => {
    const map: Record<string, number> = {};
    services.forEach((s) => {
      if (s.active && !s.archived && s.subcategoryId) {
        map[s.subcategoryId] = (map[s.subcategoryId] || 0) + 1;
      }
    });
    return map;
  }, [services]);

  // Ítems de Car Wash actualmente en la orden
  const itemsCarWashEnOrden = useMemo(() => {
    return (itemsOrden || []).filter((it) => {
      const code = String(it.code || "");
      const cat = String(it.category || "");
      return (
        cat === "Lavado" ||
        cat === "Car Wash" ||
        code.startsWith("CW-") ||
        code.startsWith("PKG-CW-") ||
        code.startsWith("ADD-CW-")
      );
    });
  }, [itemsOrden]);

  const totalUnidadesCarWash = useMemo(() => {
    return itemsCarWashEnOrden.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  }, [itemsCarWashEnOrden]);

  const totalMontoCarWash = useMemo(() => {
    return itemsCarWashEnOrden.reduce(
      (acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
  }, [itemsCarWashEnOrden]);

  const totalCatalogoCount = useMemo(() => {
    return (
      (config?.packages || []).filter((p) => p.active).length +
      services.filter((s) => s.active && !s.archived).length +
      (config?.addons || []).filter((a) => a.active).length
    );
  }, [config?.packages, services, config?.addons]);

  if (loading && !config) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 text-center space-y-3 animate-pulse">
        <div className="text-3xl">🚿</div>
        <p className="text-sm font-normal text-zinc-700 dark:text-zinc-300">
          Cargando catálogo de Car Wash, paquetes y tarifas desde Neon...
        </p>
      </div>
    );
  }

  if (errorMsg || !config) {
    return (
      <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-center space-y-3">
        <p className="text-sm font-normal text-rose-700 dark:text-rose-300">
          ⚠️ {errorMsg || "Error al cargar el módulo Car Wash"}
        </p>
        <button
          type="button"
          onClick={() => void fetchCarWashData()}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-normal cursor-pointer"
        >
          Reintentar carga
        </button>
      </div>
    );
  }

  const vehLabelCorto = currentVehicleType
    ? toSingleWord(currentVehicleType.name, CARWASH_VEH_SINGLE)
    : "Auto";

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 animate-fade-in pb-4">
      {/* =====================================================================
          NIVEL 1: CATEGORÍAS PRINCIPALES (Cubriendo todo el ancho igual que Lubricentro)
          ===================================================================== */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full">
        <button
          type="button"
          onClick={() => {
            setSelectedCategoryId("TODOS");
            setSelectedSubcategoryId("TODOS");
          }}
          className={`flex-1 min-w-[100px] sm:min-w-[120px] h-9 sm:h-10 px-3 sm:px-4 rounded-xl border text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap ${
            selectedCategoryId === "TODOS"
              ? "bg-blue-600 border-blue-500 text-white shadow-xs"
              : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
          }`}
        >
          <span className="text-sm leading-none shrink-0">✨</span>
          <span className="whitespace-nowrap">Todo</span>
          <span
            className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md font-normal shrink-0 ${
              selectedCategoryId === "TODOS"
                ? "bg-blue-500/25 text-blue-700 dark:text-blue-100 border border-blue-400/30"
                : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
            }`}
          >
            {totalCatalogoCount}
          </span>
        </button>

        {activeCategories.map((cat) => {
          const activa = selectedCategoryId === cat.id;
          const totalCat = conteoPorCategoria[cat.id] || 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategoryId(cat.id);
                setSelectedSubcategoryId("TODOS");
              }}
              className={`flex-1 min-w-[100px] sm:min-w-[120px] h-9 sm:h-10 px-3 sm:px-4 rounded-xl border text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap ${
                activa
                  ? "bg-blue-600 border-blue-500 text-white shadow-xs"
                  : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              <span className="text-base leading-none shrink-0">{cat.icon || "🚿"}</span>
              <span className="whitespace-nowrap">{toSingleWord(cat.name, CARWASH_CAT_SINGLE)}</span>
              {totalCat > 0 && (
                <span
                  className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md font-normal shrink-0 ${
                    activa
                      ? "bg-blue-500/25 text-blue-700 dark:text-blue-100 border border-blue-400/30"
                      : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
                  }`}
                >
                  {totalCat}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          NIVEL 2: SUBCATEGORÍAS DE LA CATEGORÍA ACTIVA (Cubriendo todo el ancho con flex-1)
          ===================================================================== */}
      {selectedCategoryId !== "TODOS" && activeSubcategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={() => setSelectedSubcategoryId("TODOS")}
            className={`flex-1 min-w-[95px] sm:min-w-[110px] h-8 sm:h-8.5 px-3 rounded-lg border text-xs font-normal flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
              selectedSubcategoryId === "TODOS"
                ? "bg-blue-600 border-blue-500 text-white font-normal shadow-xs"
                : "bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
            }`}
          >
            <span>Todos</span>
            <span
              className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md shrink-0 ${
                selectedSubcategoryId === "TODOS"
                  ? "bg-blue-500/25 text-blue-700 dark:text-blue-100 border border-blue-400/30"
                  : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
              }`}
            >
              {conteoPorCategoria[selectedCategoryId] || 0}
            </span>
          </button>

          {activeSubcategories.map((sub) => {
            const activa = selectedSubcategoryId === sub.id;
            const countSub = conteoPorSubcategoria[sub.id] || 0;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubcategoryId(sub.id)}
                className={`flex-1 min-w-[95px] sm:min-w-[110px] h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-lg border text-xs font-normal flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  activa
                    ? "bg-blue-600 border-blue-500 text-white font-normal shadow-xs"
                    : "bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                }`}
              >
                <span className="text-sm leading-none shrink-0">{sub.icon || "🚿"}</span>
                <span className="whitespace-nowrap">{toSingleWord(sub.name, CARWASH_SUB_SINGLE)}</span>
                {countSub > 0 && (
                  <span
                    className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md shrink-0 ${
                      activa
                        ? "bg-blue-500/25 text-blue-700 dark:text-blue-100 border border-blue-400/30"
                        : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
                    }`}
                  >
                    {countSub}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          TIENDA UNIFICADA Y AUTOMÁTICA DE CAR WASH (Igual que Lubricentro)
          ===================================================================== */}
      <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3 shadow-2xs">
        {/* Barra superior: Buscador + Desplegable de Tipo (Paquetes / Servicios / Extras) + Carrito */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar servicio o paquete..."
              className="w-full h-9 pl-8 pr-8 rounded-lg bg-zinc-50/80 dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
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

          {/* Desplegable al lado del buscador (Tipo: Todos / Paquetes / Servicios / Extras) */}
          <div ref={menuFiltroRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuFiltroAbierto((prev) => !prev)}
              className={`h-9 px-3 rounded-lg border text-xs font-normal flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs select-none active:scale-95 ${
                filtroCategoriaGeneral
                  ? "bg-amber-500 border-amber-500 text-white font-normal shadow-xs"
                  : menuFiltroAbierto
                  ? "bg-blue-50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
                  : "bg-zinc-50/80 dark:bg-black/40 hover:bg-zinc-100 dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              <span className="truncate">
                {filtroCategoriaGeneral === "PACKAGE"
                  ? "Paquetes"
                  : filtroCategoriaGeneral === "SERVICE"
                  ? "Servicios"
                  : filtroCategoriaGeneral === "ADDON"
                  ? "Extras"
                  : "Tipo"}
              </span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  menuFiltroAbierto ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuFiltroAbierto && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 shadow-xl dark:shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 z-40 animate-fade-in">
                {[
                  { id: "", label: "Todos los tipos", icon: "✨" },
                  { id: "PACKAGE", label: "Paquetes", icon: "📦" },
                  { id: "SERVICE", label: "Servicios", icon: "🚿" },
                  { id: "ADDON", label: "Extras", icon: "➕" },
                ].map((opt) => {
                  const act = filtroCategoriaGeneral === opt.id;
                  return (
                    <button
                      key={opt.id || "all"}
                      type="button"
                      onClick={() => {
                        setFiltroCategoriaGeneral(opt.id);
                        setMenuFiltroAbierto(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-normal flex items-center justify-between transition-colors cursor-pointer ${
                        act
                          ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-normal"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </span>
                      {act && <span className="text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {totalUnidadesCarWash > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="h-9 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-normal flex items-center gap-1.5">
                <span>🚿</span>
                <span>{totalUnidadesCarWash}</span>
                <span className="font-mono">${totalMontoCarWash.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>


        {/* Grid automático de servicios, paquetes y extras (idéntico a Lubricentro) */}
        {itemsFiltradosAutomaticos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {itemsFiltradosAutomaticos.map((item) => {
              const qtyEnPedido = obtenerCantidadEnPedido(item);
              const estaEnPedido = qtyEnPedido > 0;

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all shadow-2xs ${
                    estaEnPedido
                      ? "bg-emerald-50/40 dark:bg-emerald-500/[0.08] border-emerald-400 dark:border-emerald-500/50 ring-1 ring-emerald-400/30"
                      : "bg-white dark:bg-white/[0.02] hover:border-blue-400/60 dark:hover:border-blue-500/40 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  {/* Fila superior: icono/imagen + info */}
                  <div className="flex items-start gap-2.5">
                    <div
                      onClick={() => {
                        if (item.rawPackage) {
                          setDetailModalItem({ item: item.rawPackage, kind: "PACKAGE" });
                        } else if (item.rawService) {
                          setDetailModalItem({ item: item.rawService, kind: "SERVICE" });
                        }
                      }}
                      className="w-14 h-16 sm:w-16 sm:h-18 rounded-lg bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/5 flex items-center justify-center p-1.5 shrink-0 overflow-hidden cursor-pointer"
                      title="Ver detalle del servicio"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <span className="text-2xl">
                          {item.kind === "PACKAGE"
                            ? "📦"
                            : item.kind === "ADDON"
                            ? "✨"
                            : "🚿"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-normal uppercase tracking-wider truncate ${
                            item.kind === "PACKAGE"
                              ? "text-amber-600 dark:text-amber-400"
                              : item.kind === "ADDON"
                              ? "text-purple-600 dark:text-purple-400"
                              : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {item.brand}
                        </span>
                        {estaEnPedido && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-normal bg-emerald-500 text-white shrink-0">
                            ✓ {qtyEnPedido} en pedido
                          </span>
                        )}
                      </div>

                      <h4
                        onClick={() => {
                          if (item.rawPackage) {
                            setDetailModalItem({ item: item.rawPackage, kind: "PACKAGE" });
                          } else if (item.rawService) {
                            setDetailModalItem({ item: item.rawService, kind: "SERVICE" });
                          }
                        }}
                        className="text-xs font-normal text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {item.name}
                      </h4>

                      {/* Badges rápidos de duración y tipo de vehículo */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {item.durationMinutes && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-white/10 text-[10px] font-mono font-normal text-zinc-700 dark:text-zinc-300">
                            ⏱ {item.durationMinutes} min
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-500/15 text-[10px] font-normal text-sky-700 dark:text-sky-300">
                          {currentVehicleType?.icon || "🚗"} {vehLabelCorto}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pie de tarjeta: Precio + Botón / Stepper automático (- qty +) */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-mono font-normal text-emerald-600 dark:text-emerald-400 leading-none">
                          ${item.price.toFixed(2)}
                        </span>
                        {item.isPromo && item.originalPrice && (
                          <span className="text-[10px] font-mono line-through text-zinc-400">
                            ${Number(item.originalPrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block mt-0.5">
                        Tarifa {vehLabelCorto}
                      </span>
                    </div>

                    {estaEnPedido ? (
                      <div className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-400/50 rounded-lg p-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleAjustarCantidadItem(item, -1)}
                          className="w-7 h-7 rounded-md bg-white dark:bg-black/40 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-zinc-800 dark:text-white font-normal text-xs flex items-center justify-center cursor-pointer active:scale-90 transition-all"
                          title="Restar 1"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-normal text-emerald-800 dark:text-emerald-200">
                          {qtyEnPedido}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleAjustarCantidadItem(item, 1)}
                          className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-normal text-xs flex items-center justify-center cursor-pointer active:scale-90 transition-all"
                          title="Sumar 1"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleAjustarCantidadItem(item, 1)}
                        className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal flex items-center gap-1 shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <span>+</span>
                        <span>Agregar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra inferior fija/flotante en móvil igual que Lubricentro */}
      <div className="sticky bottom-2 z-30 flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border border-zinc-200 dark:border-white/15 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-sm shrink-0">
            🚿
          </div>
          <div className="min-w-0 leading-snug">
            <span className="text-sm sm:text-base font-normal text-zinc-900 dark:text-white block truncate">
              {totalUnidadesCarWash} {totalUnidadesCarWash === 1 ? "servicio" : "servicios"}
            </span>
            <span className="text-sm sm:text-base font-normal text-emerald-600 dark:text-emerald-400 block">
              Total: ${totalMontoCarWash.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onIrASiguiente && (
            <button
              type="button"
              onClick={onIrAAvisoYFirma}
              className="h-9 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-normal cursor-pointer active:scale-95 transition-all"
            >
              ✍️ Firmar
            </button>
          )}
          <button
            type="button"
            onClick={onIrASiguiente || onIrAAvisoYFirma}
            className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-normal cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* MODAL RESERVA DE BAHÍA */}
      {showBookingPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <h3 className="text-sm font-normal text-zinc-900 dark:text-white">
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
                  <label className="text-[11px] font-normal text-zinc-700 dark:text-zinc-300 block mb-1">
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
                  <label className="text-[11px] font-normal text-zinc-700 dark:text-zinc-300 block mb-1">
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
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-normal flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-normal"
                                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                            }`}
                          >
                            <span>{h}</span>
                            {isSelected && (
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-normal">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-normal text-zinc-700 dark:text-zinc-300 block mb-1">
                  Bahía de Lavado
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(config.bays || ["Bahía Lavado 1", "Bahía Lavado 2"]).map((bay) => (
                    <button
                      key={bay}
                      type="button"
                      onClick={() => setBookingBay(bay)}
                      className={`p-2 rounded-lg border text-xs font-normal text-center cursor-pointer transition-all ${
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
                <label className="text-[11px] font-normal text-zinc-700 dark:text-zinc-300 block mb-1">
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
                  ✓ Reserva <span>#{lastBookingConfirmed.appointmentNumber}</span> confirmada para el {lastBookingConfirmed.date} ({lastBookingConfirmed.timeSlot}).
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowBookingPanel(false)}
                className="h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 text-xs font-normal cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={savingBooking}
                onClick={async () => {
                  await handleConfirmBayReservation();
                }}
                className="h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal cursor-pointer disabled:opacity-50"
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
