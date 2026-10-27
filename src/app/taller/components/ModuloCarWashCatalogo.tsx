"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  const vtVal = item.priceByVehicleType?.[vehicleTypeId];
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
    () => (config?.categories || []).filter((c) => c.active).sort((a, b) => a.order - b.order),
    [config]
  );

  const activeVehicleTypes = useMemo(
    () => (config?.vehicleTypes || []).filter((v) => v.active).sort((a, b) => a.order - b.order),
    [config]
  );

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
        if (
          pkg.applicableVehicleTypes?.length > 0 &&
          !pkg.applicableVehicleTypes.includes(selectedVehicleTypeId)
        ) {
          return false;
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
        if (
          srv.applicableVehicleTypes?.length > 0 &&
          !srv.applicableVehicleTypes.includes(selectedVehicleTypeId)
        ) {
          return false;
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* =====================================================================
          BARRA SUPERIOR: BUSCADOR + ACCIONES ADMINISTRATIVAS + PASOS (1 AL 5)
          ===================================================================== */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚿</span>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                Car Wash, Detailing & Servicios Automotrices
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                100% Configurable
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Selecciona el tamaño del vehículo, elige categoría, paquete o servicio y personaliza tus complementos.
            </p>
          </div>

          {/* Botones de Administración Manual */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Buscar lavado, detailing, código..."
                className="w-full h-9 pl-3 pr-8 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/40 text-xs text-zinc-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setServiceFormModal({ open: true, service: null })}
              title="Registrar nuevo servicio"
              className="h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap transition-all"
            >
              <span>➕</span>
              <span>Servicio</span>
            </button>
          </div>
        </div>

        {/* Barra de los 5 Pasos del Proceso de Selección del Cliente */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-zinc-100 dark:border-white/5">
          {[
            {
              step: 1 as const,
              title: "Paso 1. Vehículo",
              sub: currentVehicleType ? `${currentVehicleType.icon} ${currentVehicleType.name}` : "Elegir tamaño",
            },
            {
              step: 2 as const,
              title: "Paso 2. Lavado / Paquete",
              sub: `${selectedPackageIds.length + selectedServiceIds.length} elegido(s)`,
            },
            {
              step: 3 as const,
              title: "Paso 3. Complementos",
              sub: `${selectedAddonIds.length} adicional(es)`,
            },
            {
              step: 4 as const,
              title: "Paso 4. Resumen",
              sub: serverCalculation
                ? `$${Number(serverCalculation.total).toFixed(2)} • ${serverCalculation.totalMinutes} min`
                : "Ver desglose",
            },
            {
              step: 5 as const,
              title: "Paso 5. Continuar",
              sub: "Orden / POS / Reserva",
            },
          ].map((s) => {
            const active = activeStep === s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  setActiveStep(s.step);
                  const el = document.getElementById(`cw-step-${s.step}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
                className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  active
                    ? "bg-amber-50 dark:bg-amber-500/20 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs"
                    : "bg-zinc-50/70 hover:bg-zinc-100 dark:bg-black/30 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span className="text-[11px] font-black uppercase tracking-wider block truncate">
                  {s.title}
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block truncate mt-0.5">
                  {s.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          PASO 1: SELECCIONAR TIPO DE VEHÍCULO (SECCIÓN 3 DEL PROMPT)
          ===================================================================== */}
      <div
        id="cw-step-1"
        className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">
              1
            </span>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Selecciona el Tipo o Tamaño del Vehículo
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Las tarifas se ajustan automáticamente según el vehículo seleccionado
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {activeVehicleTypes.map((vt) => {
            const isSel = vt.id === selectedVehicleTypeId;
            return (
              <button
                key={vt.id}
                type="button"
                onClick={() => {
                  setSelectedVehicleTypeId(vt.id);
                  setActiveStep(2);
                }}
                title={vt.description}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer active:scale-95 ${
                  isSel
                    ? "bg-amber-500 text-black border-amber-600 font-black shadow-md ring-2 ring-amber-500/30"
                    : "bg-zinc-50 hover:bg-zinc-100 dark:bg-black/30 dark:hover:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span className="text-xl sm:text-2xl leading-none">{vt.icon}</span>
                <span className="text-[11px] leading-tight line-clamp-2 font-bold">{vt.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SECCIÓN 1: LAS 12 TARJETAS PRINCIPALES DE CATEGORÍAS DE SERVICIOS
          ===================================================================== */}
      <div
        id="cw-step-2"
        className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">
              2
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Categorías Principales de Lavado & Estética Automotriz
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Haz clic en cualquier tarjeta para filtrar sus servicios o ver todas las opciones
              </p>
            </div>
          </div>

          {selectedCategoryId !== "TODOS" && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId("TODOS");
                setSelectedSubcategoryId("TODOS");
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer self-start sm:self-auto"
            >
              ✕ Mostrar todas las categorías ({activeCategories.length})
            </button>
          )}
        </div>

        {/* Grid adaptable de las 12 tarjetas visuales de categorías */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {activeCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => {
                  if (cat.id === "cw_cat_adicionales") {
                    setSelectedCategoryId(cat.id);
                    setActiveStep(3);
                    const el = document.getElementById("cw-step-3");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  } else {
                    setSelectedCategoryId(isSelected ? "TODOS" : cat.id);
                    setSelectedSubcategoryId("TODOS");
                  }
                }}
                className={`group rounded-2xl border overflow-hidden flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-amber-50/90 dark:bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40 shadow-lg"
                    : "bg-white hover:bg-zinc-50/80 dark:bg-black/30 dark:hover:bg-white/[0.04] border-zinc-200 dark:border-white/10 shadow-xs hover:shadow-md"
                }`}
              >
                {/* Imagen representativa + badges */}
                <div className="relative h-32 w-full bg-zinc-900 overflow-hidden">
                  <img
                    src={cat.imageUrl || FALLBACK_CARWASH_IMG}
                    alt={cat.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_CARWASH_IMG;
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/65 text-white backdrop-blur-xs">
                        ⏱️ ~{cat.estimatedMinutes} min
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-lg leading-none">{cat.icon}</span>
                      <h4 className="text-xs sm:text-sm font-black text-white truncate">
                        {cat.name}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Descripción corta + precio inicial + botón Ver servicios */}
                <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {cat.shortDescription}
                  </p>

                  <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 block">
                        Precio inicial
                      </span>
                      {cat.startingPrice && cat.startingPrice > 0 ? (
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">
                          Desde ${Number(cat.startingPrice).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-zinc-400">
                          Por configurar
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-amber-500 text-black shadow-xs"
                          : "bg-zinc-100 group-hover:bg-amber-500 group-hover:text-black dark:bg-white/10 text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      {isSelected ? "✓ Viendo" : "Ver servicios"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subcategorías de la categoría seleccionada */}
        {activeSubcategories.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Subcategorías:
            </span>
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
          SECCIÓN 4: PAQUETES COMERCIALES DE LAVADO CONFIGURABLES
          ===================================================================== */}
      {filteredPackages.length > 0 && selectedCategoryId !== "cw_cat_adicionales" && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <span>💎</span> Paquetes Comerciales de Lavado y Detailing (
                {currentVehicleType?.name})
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Combos configurables con múltiples procedimientos incluidos y ahorro automático en complementos
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfigModalOpen(true)}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              ✏️ Configurar paquetes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPackages.map((pkg) => {
              const isSelected = selectedPackageIds.includes(pkg.id);
              const priceInfo = computePriceForVehicle(pkg, selectedVehicleTypeId);
              return (
                <div
                  key={pkg.id}
                  className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all ${
                    isSelected
                      ? "bg-amber-50/90 dark:bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40 shadow-lg"
                      : "bg-zinc-50/60 dark:bg-black/30 border-zinc-200 dark:border-white/10 shadow-xs hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="relative h-36 w-full bg-zinc-900 overflow-hidden">
                      <img
                        src={pkg.imageUrl || FALLBACK_CARWASH_IMG}
                        alt={pkg.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = FALLBACK_CARWASH_IMG;
                        }}
                        className="w-full h-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                        {pkg.badgeText ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black">
                            {pkg.badgeText}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/65 text-white">
                          ⏱️ {pkg.estimatedMinutes} min
                        </span>
                      </div>

                      <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-zinc-300 block">
                            {pkg.code}
                          </span>
                          <h4 className="text-sm sm:text-base font-black text-white">
                            {pkg.name}
                          </h4>
                        </div>
                        <div className="text-right">
                          {priceInfo.unitPrice ? (
                            <span className="text-lg font-black text-amber-400 font-mono">
                              ${priceInfo.unitPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-300 font-bold">
                              Sin precio
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5">
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">
                        {pkg.shortDescription}
                      </p>
                      <ul className="space-y-1">
                        {(pkg.includedProcedures || []).slice(0, 4).map((proc, idx) => (
                          <li
                            key={idx}
                            className="text-[11px] text-zinc-700 dark:text-zinc-300 flex items-start gap-1.5"
                          >
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{proc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-2 border-t border-zinc-200/70 dark:border-white/5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailModalItem({ item: pkg, kind: "PACKAGE" })}
                      className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer"
                    >
                      Ver detalles
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePackage(pkg)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
                        isSelected
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          : "bg-amber-500 hover:bg-amber-600 text-black shadow-xs"
                      }`}
                    >
                      {isSelected ? "✓ Paquete Seleccionado" : "+ Seleccionar Paquete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          CATÁLOGO DE SERVICIOS INDIVIDUALES DE LA CATEGORÍA SELECCIONADA
          ===================================================================== */}
      {selectedCategoryId !== "cw_cat_adicionales" && (
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                🧼 Servicios de Lavado y Estética Disponibles ({filteredServices.length})
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Tarifas calculadas para: <strong>{currentVehicleType?.name}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setServiceFormModal({
                  open: true,
                  service:
                    selectedCategoryId !== "TODOS"
                      ? { categoryId: selectedCategoryId }
                      : null,
                })
              }
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold cursor-pointer"
            >
              + Agregar servicio aquí
            </button>
          </div>

          {filteredServices.length === 0 ? (
            <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-black/20 border border-dashed border-zinc-300 dark:border-white/10 text-center space-y-2">
              <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                No se encontraron servicios registrados para este filtro o tipo de vehículo.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId("TODOS");
                  setSelectedSubcategoryId("TODOS");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold cursor-pointer"
              >
                Ver todos los servicios
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((srv) => {
                const isSelected = selectedServiceIds.includes(srv.id);
                const priceInfo = computePriceForVehicle(srv, selectedVehicleTypeId);
                return (
                  <div
                    key={srv.id}
                    className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all ${
                      isSelected
                        ? "bg-amber-50/90 dark:bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/40 shadow-lg"
                        : "bg-white dark:bg-black/30 border-zinc-200 dark:border-white/10 shadow-xs hover:shadow-md"
                    }`}
                  >
                    <div>
                      <div className="relative h-40 w-full bg-zinc-900 overflow-hidden">
                        <img
                          src={srv.imageUrl || FALLBACK_CARWASH_IMG}
                          alt={srv.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = FALLBACK_CARWASH_IMG;
                          }}
                          className="w-full h-full object-cover opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              srv.availability === "Disponible"
                                ? "bg-emerald-500/90 text-white"
                                : srv.availability === "No disponible"
                                ? "bg-rose-500/90 text-white"
                                : "bg-amber-500/90 text-black"
                            }`}
                          >
                            {srv.availability}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/65 text-white">
                              ⏱️ {srv.estimatedMinutes} min
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setServiceFormModal({ open: true, service: srv });
                              }}
                              title="Editar servicio"
                              className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-zinc-900 text-xs flex items-center justify-center shadow-xs cursor-pointer"
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
                            <h4 className="text-sm font-black text-white leading-snug line-clamp-2">
                              {srv.name}
                            </h4>
                          </div>
                          <div className="text-right shrink-0">
                            {priceInfo.unitPrice ? (
                              <div>
                                {priceInfo.isPromo && priceInfo.originalPrice && (
                                  <span className="text-[10px] line-through text-zinc-400 block">
                                    ${priceInfo.originalPrice.toFixed(2)}
                                  </span>
                                )}
                                <span className="text-lg font-black text-amber-400 font-mono">
                                  ${priceInfo.unitPrice.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-300">
                                Pendiente precio
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-2.5">
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                          {srv.shortDescription || srv.fullDescription}
                        </p>

                        {srv.includesList?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {srv.includesList.slice(0, 3).map((inc, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 text-[10px] text-zinc-700 dark:text-zinc-300 font-medium"
                              >
                                ✓ {inc}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailModalItem({ item: srv, kind: "SERVICE" })}
                        className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/15 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 cursor-pointer"
                      >
                        Ver detalles
                      </button>

                      <button
                        type="button"
                        disabled={srv.availability === "No disponible" || !priceInfo.unitPrice}
                        onClick={() => handleToggleService(srv)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black cursor-pointer transition-all ${
                          isSelected
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            : "bg-amber-500 hover:bg-amber-600 text-black shadow-xs"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isSelected ? "✓ Seleccionado" : "+ Seleccionar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          PASO 3: SERVICIOS ADICIONALES / COMPLEMENTOS OPCIONALES (SECCIÓN 5)
          ===================================================================== */}
      <div
        id="cw-step-3"
        className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">
              3
            </span>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Servicios Adicionales y Complementos Opcionales
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Los complementos que ya forman parte de tu paquete se marcan como incluidos ($0.00) para evitar cobro doble.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setConfigModalOpen(true)}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer self-start sm:self-auto"
          >
            ✏️ Administrar adicionales
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {activeAddons.map((addon) => {
            const includedPkgName = addonsIncludedInSelectedPackages[addon.id];
            const isSelected = selectedAddonIds.includes(addon.id);
            const priceInfo = computePriceForVehicle(addon, selectedVehicleTypeId);
            return (
              <div
                key={addon.id}
                onClick={() => handleToggleAddon(addon)}
                className={`p-3 rounded-2xl border flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                  includedPkgName
                    ? "bg-emerald-50/80 dark:bg-emerald-500/15 border-emerald-400 dark:border-emerald-500/40"
                    : isSelected
                    ? "bg-amber-50 dark:bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/30 shadow-md"
                    : "bg-zinc-50/70 hover:bg-zinc-100 dark:bg-black/30 border-zinc-200 dark:border-white/10"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <img
                    src={addon.imageUrl || FALLBACK_CARWASH_IMG}
                    alt={addon.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_CARWASH_IMG;
                    }}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white block leading-snug">
                      {addon.name}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                      {addon.description}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-zinc-500">
                    ⏱️ +{addon.estimatedMinutes} min{" "}
                    {!addon.canBeStandalone && "• Requiere lavado"}
                  </span>

                  {includedPkgName ? (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">
                      ✓ Incluido ($0)
                    </span>
                  ) : (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono ${
                        isSelected
                          ? "bg-amber-500 text-black"
                          : "bg-white dark:bg-white/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {isSelected ? "✓ " : "+"}$
                      {priceInfo.unitPrice ? priceInfo.unitPrice.toFixed(2) : "0.00"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          PASOS 4 Y 5: RESUMEN DESGLOSADO (VALIDADO EN SERVIDOR) + CONTINUAR / RESERVA
          ===================================================================== */}
      <div
        id="cw-step-4"
        className="p-5 sm:p-6 rounded-3xl bg-zinc-900 text-white border border-white/10 shadow-xl space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">
              4
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">
                Resumen de Selección, Tiempo Estimado y Tarifas Validadas
              </h3>
              <p className="text-xs text-zinc-400">
                Vehículo seleccionado:{" "}
                <strong className="text-amber-400">
                  {currentVehicleType?.icon} {currentVehicleType?.name}
                </strong>
                {ordenActiva?.plate ? ` • Placa: ${ordenActiva.plate}` : ""}
              </p>
            </div>
          </div>

          {totalSelectionsCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedPackageIds([]);
                setSelectedServiceIds([]);
                setSelectedAddonIds([]);
                setServerCalculation(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-zinc-300 cursor-pointer self-start sm:self-auto"
            >
              🗑️ Limpiar selección
            </button>
          )}
        </div>

        {totalSelectionsCount === 0 ? (
          <div className="py-6 text-center text-zinc-400 text-xs sm:text-sm">
            Aún no has seleccionado ningún paquete o servicio de Car Wash. Elige una tarjeta arriba para ver el desglose automático.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Lista de ítems seleccionados */}
            <div className="lg:col-span-7 space-y-2">
              {(serverCalculation?.lines || []).map((line: any) => (
                <div
                  key={`${line.kind}-${line.id}`}
                  className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300">
                        {line.kind === "PACKAGE"
                          ? "PAQUETE"
                          : line.kind === "SERVICE"
                          ? "SERVICIO"
                          : "ADICIONAL"}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-white truncate">
                        {line.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Código: {line.code} • Tiempo estimado: {line.estimatedMinutes} min
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {line.alreadyIncludedInPackage ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                        Incluido ($0.00)
                      </span>
                    ) : (
                      <span className="font-mono text-sm font-black text-amber-400">
                        ${Number(line.unitPrice).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Promociones activas disponibles */}
              {promotions.length > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-400">Promociones activas:</span>
                  {promotions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPromoCodeInput(p.code)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold cursor-pointer"
                    >
                      🏷️ {p.code} ({p.title})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Totales y Paso 5: Acciones de Continuación */}
            <div
              id="cw-step-5"
              className="lg:col-span-5 p-4 rounded-2xl bg-black/50 border border-white/10 space-y-3"
            >
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span>⏱️ Duración total estimada:</span>
                <strong className="font-mono text-sm text-white">
                  {serverCalculation?.totalMinutes || 0} min
                </strong>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span>Subtotal servicios:</span>
                <span className="font-mono">
                  ${Number(serverCalculation?.subtotal || 0).toFixed(2)}
                </span>
              </div>

              {serverCalculation?.promoDiscount > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-400">
                  <span>Descuento promoción ({serverCalculation?.appliedPromotion?.code}):</span>
                  <span className="font-mono">
                    -${Number(serverCalculation.promoDiscount).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>
                  Impuestos ({serverCalculation?.taxRate || config.taxRatePercent}%{" "}
                  {config.pricesIncludeTax ? "incluido" : "adicional"}):
                </span>
                <span className="font-mono">
                  ${Number(serverCalculation?.taxAmount || 0).toFixed(2)}
                </span>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-sm font-black uppercase tracking-wider text-amber-400">
                  Total Validado:
                </span>
                <span className="text-2xl font-black font-mono text-amber-400">
                  {calculatingServer
                    ? "..."
                    : `$${Number(serverCalculation?.total || 0).toFixed(2)}`}
                </span>
              </div>

              {/* Botones del Paso 5 */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={confirmingOrder || calculatingServer}
                  onClick={() => void handleConfirmSelectionToOrder(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs sm:text-sm font-black shadow-md cursor-pointer transition-all"
                >
                  {confirmingOrder
                    ? "Validando y guardando..."
                    : "✓ Aplicar a la Orden Activa"}
                </button>

                <button
                  type="button"
                  disabled={confirmingOrder || calculatingServer}
                  onClick={() => void handleConfirmSelectionToOrder(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs sm:text-sm font-black shadow-md cursor-pointer transition-all"
                >
                  📲 Aplicar y Continuar a Aviso / Firma / POS →
                </button>

                <button
                  type="button"
                  onClick={() => setShowBookingPanel((prev) => !prev)}
                  className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  📅 {showBookingPanel ? "Ocultar Reserva de Bahía" : "Agendar Reserva de Fecha y Hora en Bahía"}
                </button>
              </div>

              {/* Panel integrado de Reserva Real reutilizando ClientAppointment */}
              {showBookingPanel && (
                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-3 mt-2 animate-fade-in">
                  <span className="text-xs font-bold text-amber-300 block">
                    📅 Reservar Bahía de Lavado (Disponibilidad Real)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Fecha</label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full h-8 px-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Bahía</label>
                      <select
                        value={bookingBay}
                        onChange={(e) => setBookingBay(e.target.value)}
                        className="w-full h-8 px-2 rounded-lg bg-zinc-900 border border-white/15 text-xs text-white"
                      >
                        {(config.bays || ["Bahía Lavado 1"]).map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">
                      Horario (verifica ocupación real)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {HORARIOS_DISPONIBLES.map((slot) => {
                        const occupied = appointments.some(
                          (a) =>
                            a.date === bookingDate &&
                            a.timeSlot === slot &&
                            a.bay === bookingBay &&
                            a.status !== "Cancelada"
                        );
                        const sel = bookingTimeSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={occupied}
                            onClick={() => setBookingTimeSlot(slot)}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-mono font-bold cursor-pointer ${
                              occupied
                                ? "bg-rose-500/20 border border-rose-500/30 text-rose-300 line-through cursor-not-allowed"
                                : sel
                                ? "bg-amber-500 text-black"
                                : "bg-black/50 border border-white/10 text-zinc-300 hover:bg-white/10"
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
                    onClick={() => void handleConfirmBayReservation()}
                    className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-black text-xs font-black cursor-pointer"
                  >
                    {savingBooking ? "Registrando reserva..." : "✓ Confirmar Reserva en Bahía"}
                  </button>

                  {lastBookingConfirmed && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-[11px] text-emerald-200">
                      ✓ Reserva <strong>#{lastBookingConfirmed.appointmentNumber}</strong> registrada para el{" "}
                      {lastBookingConfirmed.date} a las {lastBookingConfirmed.timeSlot} ({lastBookingConfirmed.bay}).
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          MODALES DE DETALLE, FORMULARIO DE SERVICIO Y CONFIGURACIÓN MANUAL
          ===================================================================== */}
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
