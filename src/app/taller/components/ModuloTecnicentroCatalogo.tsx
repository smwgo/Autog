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

// Las 6 categorías más importantes de Tecnicentro (1 sola palabra cada una)
const PRINCIPAL_TECNICENTRO_CAT_IDS = [
  "tc_cat_alineacion",
  "tc_cat_balanceo",
  "tc_cat_venta_neum",
  "tc_cat_suspension",
  "tc_cat_frenos",
  "tc_cat_diagnostico",
];

const TECNICENTRO_CAT_SINGLE: Record<string, string> = {
  "Todas": "Todo",
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

// Subcategorías más importantes por categoría principal (1 sola palabra cada una)
const IMPORTANT_SUBCATEGORIES_BY_MAIN_CAT: Record<
  string,
  Array<{ id: string; name: string; icon: string }>
> = {
  tc_cat_alineacion: [
    { id: "tc_sub_ali_delantero", name: "Delantera", icon: "⬆️" },
    { id: "tc_sub_ali_4ruedas", name: "Completa", icon: "🚗" },
    { id: "tc_sub_ali_geometria", name: "Geometría", icon: "🎯" },
  ],
  tc_cat_balanceo: [
    { id: "tc_sub_bal_4ruedas", name: "Completo", icon: "🛞" },
    { id: "tc_sub_bal_indiv", name: "Individual", icon: "1️⃣" },
    { id: "tc_sub_bal_vibracion", name: "Vibración", icon: "〰️" },
  ],
  tc_cat_venta_neum: [
    { id: "tc_sub_neu_venta", name: "Llantas", icon: "🛞" },
    { id: "tc_sub_neu_montaje", name: "Montaje", icon: "🔧" },
    { id: "tc_sub_neu_pinchazo", name: "Parche", icon: "🩹" },
    { id: "tc_sub_neu_rotacion", name: "Rotación", icon: "🔄" },
    { id: "tc_sub_neu_presion", name: "Presión", icon: "🌡️" },
  ],
  tc_cat_suspension: [
    { id: "tc_sub_sus_amort", name: "Amortiguadores", icon: "🔽" },
    { id: "tc_sub_dir_inspeccion", name: "Dirección", icon: "🎯" },
    { id: "tc_sub_tdel_insp", name: "Delantero", icon: "🔍" },
    { id: "tc_sub_sus_bujes", name: "Bujes", icon: "⭕" },
    { id: "tc_sub_sus_rotulas", name: "Rótulas", icon: "🔩" },
  ],
  tc_cat_frenos: [
    { id: "tc_sub_fre_pastillas", name: "Pastillas", icon: "🟫" },
    { id: "tc_sub_fre_discos", name: "Discos", icon: "💿" },
    { id: "tc_sub_fre_hidraulico", name: "Líquido", icon: "💧" },
    { id: "tc_sub_fre_inspeccion", name: "Inspección", icon: "🛑" },
  ],
  tc_cat_diagnostico: [
    { id: "tc_sub_diag_escaneo", name: "Escáner", icon: "💻" },
    { id: "tc_sub_diag_sensores", name: "Sensores", icon: "📡" },
    { id: "tc_sub_diag_informe", name: "Informe", icon: "📄" },
  ],
};

function matchesMainCategoryTec(itemCatId?: string, selectedMainCatId?: string): boolean {
  if (!selectedMainCatId || selectedMainCatId === "TODOS") return true;
  if (!itemCatId) return false;
  if (itemCatId === selectedMainCatId) return true;
  if (selectedMainCatId === "tc_cat_venta_neum") {
    return [
      "tc_cat_venta_neum",
      "tc_cat_montaje",
      "tc_cat_reparacion_neum",
      "tc_cat_rotacion",
      "tc_cat_presion_neum",
    ].includes(itemCatId);
  }
  if (selectedMainCatId === "tc_cat_suspension") {
    return [
      "tc_cat_suspension",
      "tc_cat_direccion",
      "tc_cat_tren_delantero",
      "tc_cat_tren_posterior",
    ].includes(itemCatId);
  }
  if (selectedMainCatId === "tc_cat_diagnostico") {
    return ["tc_cat_diagnostico", "tc_cat_escaneo", "tc_cat_otros"].includes(itemCatId);
  }
  return false;
}

function matchesSubcategoryTec(
  srv: { categoryId?: string; subcategoryId?: string },
  selectedSubId?: string
): boolean {
  if (!selectedSubId || selectedSubId === "TODOS") return true;
  if (srv.subcategoryId === selectedSubId) return true;
  if (
    selectedSubId === "tc_sub_ali_4ruedas" &&
    (srv.subcategoryId === "tc_sub_ali_ruedas" || srv.subcategoryId === "tc_sub_ali_otros")
  )
    return true;
  if (
    selectedSubId === "tc_sub_bal_4ruedas" &&
    (srv.subcategoryId === "tc_sub_bal_ruedas" || srv.subcategoryId === "tc_sub_bal_otros")
  )
    return true;
  if (selectedSubId === "tc_sub_neu_montaje" && srv.categoryId === "tc_cat_montaje") return true;
  if (selectedSubId === "tc_sub_neu_pinchazo" && srv.categoryId === "tc_cat_reparacion_neum")
    return true;
  if (selectedSubId === "tc_sub_neu_rotacion" && srv.categoryId === "tc_cat_rotacion") return true;
  if (selectedSubId === "tc_sub_neu_presion" && srv.categoryId === "tc_cat_presion_neum")
    return true;
  if (selectedSubId === "tc_sub_neu_venta" && srv.categoryId === "tc_cat_venta_neum") return true;
  if (selectedSubId === "tc_sub_dir_inspeccion" && srv.categoryId === "tc_cat_direccion")
    return true;
  if (
    selectedSubId === "tc_sub_tdel_insp" &&
    (srv.categoryId === "tc_cat_tren_delantero" ||
      srv.categoryId === "tc_cat_tren_posterior" ||
      srv.subcategoryId === "tc_sub_sus_inspeccion")
  )
    return true;
  if (selectedSubId === "tc_sub_fre_inspeccion" && srv.subcategoryId === "tc_sub_fre_tambores")
    return true;
  if (
    selectedSubId === "tc_sub_diag_escaneo" &&
    (srv.categoryId === "tc_cat_escaneo" ||
      srv.subcategoryId === "tc_sub_diag_codigos" ||
      srv.subcategoryId === "tc_sub_diag_sistemas")
  )
    return true;
  return false;
}

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

export default function ModuloTecnicentroCatalogo({
  empleadoLogueado,
  ordenActiva,
  itemsOrden,
  mostrarToast,
  onActualizarItemsOrden,
  onIrAAvisoYFirma,
  triggerAbrirConfig,
}: ModuloTecnicentroCatalogoProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [config, setConfig] = useState<TecnicentroConfigData | null>(null);
  const [services, setServices] = useState<TecnicentroEnrichedService[]>([]);
  const [tires, setTires] = useState<TecnicentroEnrichedTire[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

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
    try {
      if (!config) setLoading(true);
      setErrorMsg(null);
      const res = await fetch("/api/taller/tecnicentro", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al cargar el módulo Tecnicentro");
      }
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
    const handleCatalogoActualizado = () => {
      void fetchTecnicentroData();
    };
    window.addEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    return () => {
      window.removeEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    };
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

  const activeCategories = useMemo(() => {
    const list = (config?.categories || []).filter((c) => c.active);
    const principales = list.filter((c) => PRINCIPAL_TECNICENTRO_CAT_IDS.includes(c.id));
    const result = principales.length > 0 ? principales : list.slice(0, 6);
    return result.sort((a, b) => {
      const idxA = PRINCIPAL_TECNICENTRO_CAT_IDS.indexOf(a.id);
      const idxB = PRINCIPAL_TECNICENTRO_CAT_IDS.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.order - b.order;
    });
  }, [config]);

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
    const curated = IMPORTANT_SUBCATEGORIES_BY_MAIN_CAT[selectedCategoryId];
    if (curated) return curated;
    return config.subcategories
      .filter((s) => s.active && s.categoryId === selectedCategoryId)
      .sort((a, b) => a.order - b.order)
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        name: toSingleWord(s.name, TECNICENTRO_CAT_SINGLE),
        icon: s.icon || "🔧",
      }));
  }, [config, selectedCategoryId]);

  // Adaptar panel Manual automáticamente al seleccionar categoría (horizontal / vertical), subcategoría o tipo de vehículo
  useEffect(() => {
    let nombre = "";
    let precio = 0;
    let minutos = 45;

    if (selectedSubcategoryId && selectedSubcategoryId !== "TODOS") {
      const sub = config?.subcategories?.find((s) => s.id === selectedSubcategoryId);
      const srv =
        services.find((s) => matchesSubcategoryTec(s, selectedSubcategoryId) && s.active) ||
        services.find((s) => matchesSubcategoryTec(s, selectedSubcategoryId));
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
        services.find((s) => matchesMainCategoryTec(s.categoryId, selectedCategoryId) && s.active) ||
        services.find((s) => matchesMainCategoryTec(s.categoryId, selectedCategoryId));
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
        if (!matchesMainCategoryTec(s.categoryId, selectedCategoryId)) {
          return false;
        }
        if (!matchesSubcategoryTec(s, selectedSubcategoryId)) {
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

  const handleAjustarCantidadItem = async (item: any, delta: number) => {
    try {
      const code = item.code || `TC-${item.id}`;
      const vehLabel = currentVehicleType
        ? toSingleWord(currentVehicleType.name, TECNICENTRO_VEH_SINGLE)
        : "Auto";
      const listaActual = [...(itemsOrden || [])];
      const idxExistente = listaActual.findIndex(
        (it) =>
          it.id === item.id ||
          it.serviceId === item.id ||
          it.productId === item.id ||
          it.id === `tec_${item.id}` ||
          it.id?.startsWith?.(`tec_${item.id}_`) ||
          (it.code && it.code === code)
      );

      if (idxExistente >= 0) {
        const actual = listaActual[idxExistente];
        const nuevaCant = (Number(actual.qty) || 1) + delta;
        if (nuevaCant <= 0) {
          listaActual.splice(idxExistente, 1);
          await onActualizarItemsOrden(listaActual);
        } else {
          const priceUnit = Number(item.price || actual.price || 0);
          const actualizados = listaActual.map((it, idx) =>
            idx === idxExistente
              ? {
                  ...it,
                  qty: nuevaCant,
                  price: priceUnit,
                  total: Number((priceUnit * nuevaCant).toFixed(2)),
                }
              : it
          );
          await onActualizarItemsOrden(actualizados);
        }
      } else if (delta > 0) {
        const priceUnit = Number(item.price || 0);
        const nuevoItem = {
          id: `tec_${item.id}_${Date.now()}`,
          key: `key_${item.id}_${Date.now()}`,
          serviceId: item.id,
          type: item.kind === "TIRE" ? ("PART" as const) : ("SERVICE" as const),
          category: item.kind === "TIRE" ? "Neumáticos" : "Tecnicentro",
          subCategory:
            item.kind === "PACKAGE"
              ? "Paquete"
              : item.kind === "ADDON"
              ? "Extra"
              : item.kind === "TIRE"
              ? "Neumático"
              : "Servicio",
          code,
          name: item.kind === "TIRE" ? item.name : `${item.name} (${vehLabel})`,
          brand: item.brand || "Tecnicentro",
          presentation:
            item.presentation ||
            (item.durationMinutes ? `${item.durationMinutes} min` : "Servicio"),
          unitOfMeasure: item.kind === "TIRE" ? "Unidad" : "Servicio",
          price: priceUnit,
          total: Number((priceUnit * delta).toFixed(2)),
          qty: delta,
          subtotal: Number((priceUnit * delta).toFixed(2)),
          quoteRequired: Boolean(item.quoteRequired),
          status: "Listo" as const,
          completed: true,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        };
        await onActualizarItemsOrden([...listaActual, nuevoItem]);
      }
    } catch {
      mostrarToast("Error al actualizar ítem de Tecnicentro", "err");
    }
  };

  const filteredPackages = useMemo(() => {
    if (!config) return [];
    const q = searchQuery.trim().toLowerCase();
    return (config.packages || [])
      .filter((pkg) => {
        if (!pkg.active) return false;
        if (!matchesVehicleType(pkg.applicableVehicleTypes, selectedVehicleTypeId)) {
          return false;
        }
        if (!matchesMainCategoryTec(pkg.categoryId, selectedCategoryId)) {
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
          (add as any).applicableVehicleTypes?.length > 0 &&
          !(add as any).applicableVehicleTypes.includes(selectedVehicleTypeId)
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

  // Catálogo unificado y automático (se muestra al instante sin necesidad de escribir en el buscador)
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
      kind: "PACKAGE" | "SERVICE" | "TIRE" | "ADDON";
      name: string;
      code: string;
      brand: string;
      presentation?: string;
      description?: string;
      durationMinutes?: number;
      price: number;
      quoteRequired?: boolean;
      rawService?: TecnicentroEnrichedService;
      rawTire?: TecnicentroEnrichedTire;
      rawPackage?: TecnicentroPackage;
      rawAddon?: TecnicentroAddon;
      imageUrl?: string;
    }> = [];

    // 1. Paquetes
    if (!filtroCategoriaGeneral || filtroCategoriaGeneral === "PACKAGE") {
      filteredPackages.forEach((pkg) => {
        if (selectedSubcategoryId !== "TODOS") return;
        const full = `${pkg.name} ${pkg.code} ${pkg.shortDescription || ""} ${(pkg.includedServicesList || pkg.includedServiceCodes || []).join(" ")}`;
        if (!matchText(full)) return;
        const pInfo = getPriceDisplayForItem(pkg, selectedVehicleTypeId);
        list.push({
          id: pkg.id,
          kind: "PACKAGE",
          name: pkg.name,
          code: pkg.code,
          brand: "Paquete",
          presentation: `${pkg.estimatedMinutes || 60} min · Paquete`,
          description: pkg.shortDescription,
          durationMinutes: pkg.estimatedMinutes || 60,
          price: pInfo.price ?? 0,
          quoteRequired: pInfo.quoteRequired,
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
        const pInfo = getPriceDisplayForItem(srv, selectedVehicleTypeId);
        const catObj = config?.categories?.find((c) => c.id === srv.categoryId);
        list.push({
          id: srv.id,
          kind: "SERVICE",
          name: srv.name,
          code: srv.code,
          brand: catObj?.name ? toSingleWord(catObj.name, TECNICENTRO_CAT_SINGLE) : "Servicio",
          presentation: `${srv.estimatedMinutes || 45} min`,
          description: srv.shortDescription || srv.fullDescription,
          durationMinutes: srv.estimatedMinutes || 45,
          price: pInfo.price ?? 0,
          quoteRequired: pInfo.quoteRequired,
          rawService: srv,
          imageUrl: srv.imageUrl,
        });
      });
    }

    // 3. Neumáticos (cuando aplica la categoría o el filtro de tipo es Neumáticos)
    const showTiresInSub =
      selectedSubcategoryId === "TODOS" || selectedSubcategoryId === "tc_sub_neu_venta";
    if (
      showTiresInSub &&
      (filtroCategoriaGeneral === "TIRE" ||
        (!filtroCategoriaGeneral &&
          (selectedCategoryId === "TODOS" || selectedCategoryId === "tc_cat_venta_neum")))
    ) {
      filteredTires.forEach((tire) => {
        const full = `${tire.brand} ${tire.modelRef} ${tire.tireSize} ${tire.code} ${tire.rimDiameter}`;
        if (!matchText(full)) return;
        list.push({
          id: tire.id,
          kind: "TIRE",
          name: `${tire.brand} ${tire.modelRef} - ${tire.tireSize}`,
          code: tire.code,
          brand: tire.brand || "Neumático",
          presentation: `${tire.tireSize} · Aro ${tire.rimDiameter} · Stock: ${tire.stock}`,
          description: `${tire.brand} · ${tire.tireSize} · Aro ${tire.rimDiameter} · Stock: ${tire.stock}`,
          durationMinutes: 30,
          price: Number(tire.price) || 0,
          quoteRequired: false,
          rawTire: tire,
          imageUrl: tire.imageUrl,
        });
      });
    }

    // 4. Extras / Adicionales
    if (
      (!filtroCategoriaGeneral && selectedCategoryId === "TODOS") ||
      filtroCategoriaGeneral === "ADDON"
    ) {
      activeAddons.forEach((add) => {
        const full = `${add.name} ${add.code} ${add.description || ""}`;
        if (!matchText(full)) return;
        const pInfo = getPriceDisplayForItem(add, selectedVehicleTypeId);
        list.push({
          id: add.id,
          kind: "ADDON",
          name: add.name,
          code: add.code,
          brand: "Extra",
          presentation: `${add.estimatedMinutes || 15} min · Extra`,
          description: add.description,
          durationMinutes: add.estimatedMinutes || 15,
          price: pInfo.price ?? 0,
          quoteRequired: pInfo.quoteRequired,
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
    filteredTires,
    activeAddons,
    selectedVehicleTypeId,
    selectedCategoryId,
    selectedSubcategoryId,
    config,
  ]);

  // Conteos por las 6 categorías principales y sus subcategorías de 1 palabra
  const conteoPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    PRINCIPAL_TECNICENTRO_CAT_IDS.forEach((mainId) => {
      let c = 0;
      (config?.packages || []).forEach((p) => {
        if (p.active && matchesMainCategoryTec(p.categoryId, mainId)) c++;
      });
      services.forEach((s) => {
        if (s.active && matchesMainCategoryTec(s.categoryId, mainId)) c++;
      });
      if (mainId === "tc_cat_venta_neum") {
        c += tires.filter((t) => t.active).length;
      }
      map[mainId] = c;
    });
    return map;
  }, [config?.packages, services, tires]);

  const conteoPorSubcategoria = useMemo(() => {
    const map: Record<string, number> = {};
    Object.values(IMPORTANT_SUBCATEGORIES_BY_MAIN_CAT)
      .flat()
      .forEach((sub) => {
        let c = services.filter((s) => s.active && matchesSubcategoryTec(s, sub.id)).length;
        if (sub.id === "tc_sub_neu_venta") {
          c += tires.filter((t) => t.active).length;
        }
        map[sub.id] = c;
      });
    return map;
  }, [services, tires]);

  // Ítems de Tecnicentro/Neumáticos actualmente en la orden
  const itemsTecnicentroEnOrden = useMemo(() => {
    return (itemsOrden || []).filter((it) => {
      const code = String(it.code || "");
      const cat = String(it.category || "");
      return (
        cat === "Tecnicentro" ||
        cat === "Llantera" ||
        cat === "Neumáticos" ||
        code.startsWith("TC-") ||
        code.startsWith("PKG-TC-") ||
        code.startsWith("ADD-TC-") ||
        code.startsWith("NEUM-")
      );
    });
  }, [itemsOrden]);

  const totalUnidadesTecnicentro = useMemo(() => {
    return itemsTecnicentroEnOrden.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
  }, [itemsTecnicentroEnOrden]);

  const totalMontoTecnicentro = useMemo(() => {
    return itemsTecnicentroEnOrden.reduce(
      (acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
  }, [itemsTecnicentroEnOrden]);

  const totalCatalogoCount = useMemo(() => {
    return (
      (config?.packages || []).filter((p) => p.active).length +
      services.filter((s) => s.active).length +
      tires.filter((t) => t.active).length +
      (config?.addons || []).filter((a) => a.active).length
    );
  }, [config?.packages, services, tires, config?.addons]);

  const arosDisponibles = useMemo(() => {
    const set = new Set<string>();
    tires.forEach((t) => {
      if (t.active && t.rimDiameter) set.add(t.rimDiameter.toUpperCase());
    });
    return Array.from(set).sort();
  }, [tires]);

  if (loading && !config) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 text-center space-y-2 animate-pulse">
        <div className="text-3xl">🛞</div>
        <p className="text-sm font-normal text-zinc-700 dark:text-zinc-300">
          Cargando módulo Tecnicentro, alineación, balanceo, neumáticos y diagnósticos desde Neon...
        </p>
      </div>
    );
  }

  if (errorMsg || !config) {
    return (
      <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-center space-y-3">
        <p className="text-sm font-normal text-rose-700 dark:text-rose-300">
          ⚠️ {errorMsg || "Error al cargar Tecnicentro"}
        </p>
        <button
          type="button"
          onClick={() => void fetchTecnicentroData()}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-normal cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const vehLabelCorto = currentVehicleType
    ? toSingleWord(currentVehicleType.name, TECNICENTRO_VEH_SINGLE)
    : "Auto";

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 animate-fade-in pb-4">
      {/* =====================================================================
          NIVEL 1: 6 CATEGORÍAS PRINCIPALES (Cubriendo todo el ancho igual que Lubricentro)
          ===================================================================== */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full">
        <button
          type="button"
          onClick={() => {
            setSelectedCategoryId("TODOS");
            setSelectedSubcategoryId("TODOS");
            clearCategorySpecificFilters();
          }}
          className={`flex-1 min-w-[100px] sm:min-w-[120px] h-9 sm:h-10 px-3 sm:px-4 rounded-xl border text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap ${
            selectedCategoryId === "TODOS"
              ? "bg-blue-600 text-white border-blue-500 shadow-xs"
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
          const count = conteoPorCategoria[cat.id] || 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategoryId(cat.id);
                setSelectedSubcategoryId("TODOS");
                clearCategorySpecificFilters();
              }}
              className={`flex-1 min-w-[100px] sm:min-w-[120px] h-9 sm:h-10 px-3 sm:px-4 rounded-xl border text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap ${
                activa
                  ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                  : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              <span className="text-base leading-none shrink-0">{cat.icon || "🛞"}</span>
              <span className="whitespace-nowrap">{toSingleWord(cat.name, TECNICENTRO_CAT_SINGLE)}</span>
              {count > 0 && (
                <span
                  className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md font-normal shrink-0 ${
                    activa
                      ? "bg-blue-500/25 text-blue-700 dark:text-blue-100 border border-blue-400/30"
                      : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
                  }`}
                >
                  {count}
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
            className={`flex-1 min-w-[95px] sm:min-w-[110px] h-8 sm:h-8.5 px-3 rounded-lg border text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs ${
              selectedSubcategoryId === "TODOS"
                ? "bg-blue-600 border-blue-500 text-white shadow-xs"
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
            const count = conteoPorSubcategoria[sub.id] || 0;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubcategoryId(sub.id)}
                className={`flex-1 min-w-[95px] sm:min-w-[110px] h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-lg border text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs ${
                  activa
                    ? "bg-blue-600 border-blue-500 text-white shadow-xs"
                    : "bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                }`}
              >
                <span className="text-sm leading-none shrink-0">{sub.icon || "🔧"}</span>
                <span className="whitespace-nowrap">{sub.name}</span>
                {count > 0 && (
                  <span
                    className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md shrink-0 ${
                      activa
                        ? "bg-blue-500/25 text-blue-700 dark:text-blue-100 border border-blue-400/30"
                        : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          PANEL UNIFICADO: BUSCADOR + TIPO DESPLEGABLE + VEHÍCULO + CATÁLOGO AUTOMÁTICO
          ===================================================================== */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3 shadow-2xs">
        {/* FILA A: Buscador + Desplegable de Tipo (Paquetes / Servicios / Neumáticos / Extras) + Config */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar servicio, paquete o neumático..."
                className="w-full h-9 pl-8 pr-7 rounded-xl bg-zinc-50/80 dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400"
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

            {/* Desplegable de Tipo al lado del buscador */}
            <div ref={menuFiltroCatalogoRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuFiltroCatalogoAbierto((prev) => !prev)}
                className={`h-9 px-2.5 sm:px-3 rounded-xl border text-[11px] font-normal flex items-center gap-1.5 cursor-pointer transition-all select-none active:scale-95 ${
                  menuFiltroCatalogoAbierto || filtroCategoriaGeneral
                    ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                    : "bg-zinc-50/80 dark:bg-black/40 hover:bg-zinc-100 dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span className="truncate max-w-[92px] sm:max-w-[130px]">
                  {filtroCategoriaGeneral === "PACKAGE"
                    ? "Paquetes"
                    : filtroCategoriaGeneral === "SERVICE"
                    ? "Servicios"
                    : filtroCategoriaGeneral === "TIRE"
                    ? "Neumáticos"
                    : filtroCategoriaGeneral === "ADDON"
                    ? "Extras"
                    : "Tipo"}
                </span>
                <span
                  className={`text-[9px] transition-transform duration-200 ${
                    menuFiltroCatalogoAbierto ? "rotate-180" : ""
                  } ${
                    menuFiltroCatalogoAbierto || filtroCategoriaGeneral
                      ? "text-white/90"
                      : "text-zinc-400"
                  }`}
                >
                  ▾
                </span>
              </button>

              {menuFiltroCatalogoAbierto && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 shadow-xl dark:shadow-2xl backdrop-blur-md p-1.5 space-y-0.5 z-40 animate-fade-in">
                  {[
                    { id: "", label: "Todos los tipos", icon: "✨" },
                    { id: "PACKAGE", label: "Paquetes", icon: "📦" },
                    { id: "SERVICE", label: "Servicios", icon: "🔧" },
                    { id: "TIRE", label: "Neumáticos", icon: "🛞" },
                    { id: "ADDON", label: "Extras", icon: "➕" },
                  ].map((opt) => {
                    const activa = filtroCategoriaGeneral === opt.id;
                    return (
                      <button
                        key={opt.id || "ALL"}
                        type="button"
                        onClick={() => {
                          setFiltroCategoriaGeneral(opt.id);
                          setMenuFiltroCatalogoAbierto(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-normal flex items-center justify-between transition-colors cursor-pointer ${
                          activa
                            ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-normal"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                        </span>
                        {activa && <span className="text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FILA C (Opcional): Chips rápidos de Aro cuando se está viendo Neumáticos */}
        {(selectedCategoryId === "tc_cat_venta_neum" || filtroCategoriaGeneral === "TIRE") &&
          arosDisponibles.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="text-[10px] font-normal uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0 mr-0.5">
                Aro:
              </span>
              {arosDisponibles.map((aro) => {
                const activo = filterTireRim.toUpperCase() === aro;
                return (
                  <button
                    key={aro}
                    type="button"
                    onClick={() => setFilterTireRim(activo ? "" : aro)}
                    className={`shrink-0 h-7 px-2.5 rounded-lg border text-[11px] font-mono font-normal cursor-pointer transition-all active:scale-95 ${
                      activo
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                        : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {aro}
                  </button>
                );
              })}
            </div>
          )}

        {/* Barra de estado y limpiar filtros */}
        {(selectedCategoryId !== "TODOS" ||
          selectedSubcategoryId !== "TODOS" ||
          filtroCategoriaGeneral ||
          filterTireRim ||
          searchQuery.trim()) && (
          <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>
              Mostrando{" "}
              <span className="text-zinc-800 dark:text-zinc-200">
                {itemsFiltradosAutomaticos.length}
              </span>{" "}
              {itemsFiltradosAutomaticos.length === 1 ? "opción" : "opciones"} para{" "}
              <span className="text-blue-600 dark:text-blue-400">{vehLabelCorto}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId("TODOS");
                setSelectedSubcategoryId("TODOS");
                setFiltroCategoriaGeneral("");
                clearCategorySpecificFilters();
                setSearchQuery("");
              }}
              className="text-[11px] font-normal text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Limpiar filtros ✕
            </button>
          </div>
        )}

        {/* GRID AUTOMÁTICO DE SERVICIOS, PAQUETES, NEUMÁTICOS Y EXTRAS */}
        {itemsFiltradosAutomaticos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[600px] overflow-y-auto pr-0.5">
            {itemsFiltradosAutomaticos.map((item) => {
              const code = item.code || `TC-${item.id}`;
              const enOrden = (itemsOrden || []).find(
                (it) =>
                  it.id === item.id ||
                  it.serviceId === item.id ||
                  it.productId === item.id ||
                  it.id === `tec_${item.id}` ||
                  it.id?.startsWith?.(`tec_${item.id}_`) ||
                  (it.code && it.code === code)
              );
              const cantEnOrden = enOrden ? Number(enOrden.qty) || 1 : 0;

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest("button") || target.closest("[data-prevent-card-click]")) {
                      return;
                    }
                    void handleAjustarCantidadItem(item, 1);
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all cursor-pointer select-none ${
                    cantEnOrden > 0
                      ? "bg-blue-50/60 dark:bg-blue-500/10 border-blue-400 dark:border-blue-500/60 ring-1 ring-blue-400/30"
                      : "bg-white dark:bg-white/[0.02] hover:border-blue-400/50 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  {/* Parte superior: Imagen/Icono + Info */}
                  <div className="flex items-start gap-2.5">
                    <div
                      data-prevent-card-click
                      onClick={() => {
                        if (item.kind === "PACKAGE" && item.rawPackage) {
                          setDetailModal({ item: item.rawPackage, kind: "PACKAGE" });
                        } else if (item.kind === "TIRE" && item.rawTire) {
                          setDetailModal({ item: item.rawTire, kind: "TIRE" });
                        } else if (item.kind === "SERVICE" && item.rawService) {
                          setDetailModal({ item: item.rawService, kind: "SERVICE" });
                        }
                      }}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/5 flex items-center justify-center p-1 shrink-0 overflow-hidden cursor-pointer"
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-xl">
                          {item.kind === "TIRE"
                            ? "🛞"
                            : item.kind === "PACKAGE"
                            ? "📦"
                            : item.kind === "ADDON"
                            ? "✨"
                            : "🔧"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span
                          className={`text-[9px] font-normal uppercase tracking-wider px-1.5 py-0.2 rounded ${
                            item.kind === "PACKAGE"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              : item.kind === "TIRE"
                              ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                              : item.kind === "ADDON"
                              ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                              : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {item.brand}
                        </span>
                        {item.durationMinutes && item.kind !== "TIRE" && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 text-[9px] font-mono font-normal">
                            ⏱ {item.durationMinutes}m
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-normal text-zinc-900 dark:text-white line-clamp-2 leading-snug mt-0.5">
                        {item.name}
                      </h4>
                      {item.description && (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Parte inferior: Precio según vehículo + Botón Agregar / Stepper */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-white/5">
                    <div className="flex items-baseline gap-1.5">
                      {item.quoteRequired ? (
                        <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
                          A cotizar
                        </span>
                      ) : (
                        <span className="text-sm font-mono font-normal text-emerald-600 dark:text-emerald-400">
                          ${item.price.toFixed(2)}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 font-medium">
                        /{item.kind === "TIRE" ? "u." : vehLabelCorto}
                      </span>
                    </div>

                    {cantEnOrden > 0 ? (
                      <div className="flex items-center gap-1 bg-blue-600 text-white rounded-xl p-0.5 shadow-xs">
                        <button
                          type="button"
                          onClick={() => void handleAjustarCantidadItem(item, -1)}
                          className="w-7 h-7 rounded-lg hover:bg-black/20 flex items-center justify-center text-sm font-normal cursor-pointer active:scale-90"
                        >
                          −
                        </button>
                        <span className="min-w-[22px] text-center text-xs font-mono font-normal">
                          {cantEnOrden}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleAjustarCantidadItem(item, 1)}
                          className="w-7 h-7 rounded-lg hover:bg-black/20 flex items-center justify-center text-sm font-normal cursor-pointer active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleAjustarCantidadItem(item, 1)}
                        className="h-8 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal flex items-center gap-1 cursor-pointer transition-all shadow-xs active:scale-95"
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

      {/* BARRA INFERIOR FLOTANTE DE RESUMEN RÁPIDO (Móvil y Desktop) */}
      <div className="sticky bottom-2 z-30 flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border border-zinc-200 dark:border-white/15 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-sm shrink-0">
            🛞
          </div>
          <div className="min-w-0 leading-snug">
            <span className="text-sm sm:text-base font-normal text-zinc-900 dark:text-white block truncate">
              {totalUnidadesTecnicentro} {totalUnidadesTecnicentro === 1 ? "servicio" : "servicios"}
            </span>
            <span className="text-sm sm:text-base font-normal text-emerald-600 dark:text-emerald-400 block">
              Total: ${totalMontoTecnicentro.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onIrAAvisoYFirma}
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
                <div>
                  <label className="text-[11px] font-normal text-zinc-700 dark:text-zinc-300 block mb-1">
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
                <label className="text-[11px] font-normal text-zinc-700 dark:text-zinc-300 block mb-1">
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
                            ? "bg-blue-600 text-white font-normal shadow-xs"
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
                className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-normal transition-all cursor-pointer disabled:opacity-50"
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
