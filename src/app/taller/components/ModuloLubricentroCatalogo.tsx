"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import type {
  LubricentroConfigData,
  LubPresentationVariant,
  LubVehicleCompatibility,
} from "@/app/api/taller/lubricentro/route";
import {
  ModalDetalleProductoLubricentro,
  ModalProductoLubricentroForm,
  ModalConfiguracionManualLubricentro,
} from "./LubricentroAdminModals";
import {
  DEFAULT_LUBRICENTRO_CONFIG_CLIENT,
  DEFAULT_LUBRICENTRO_PRODUCTS_CLIENT,
} from "./lubricentroDefaults";

export interface ModuloLubricentroCatalogoProps {
  empleadoLogueado: { id: string; nombre: string };
  ordenActiva?: any;
  itemsOrden: any[];
  onActualizarItemsOrden: (nuevosItems: any[]) => Promise<void>;
  onIrAAvisoYFirma: () => void;
  mostrarToast?: (msg: string, tipo?: "ok" | "err") => void;
  triggerAbrirConfig?: number;
}

interface CartItemLubricentro {
  key: string;
  productId: string;
  code: string;
  name: string;
  brand: string;
  presentation: string;
  unitOfMeasure: string;
  presentationId?: string;
  price: number;
  qty: number;
  maxStock: number;
  imageUrl?: string | null;
  lubCategoryId: string;
  lubSubcategoryId: string;
}

// Caché en el cliente (módulo y localStorage) para que la carga sea instantánea (0ms)
let _lubricentroClientCache: {
  config: any;
  products: any[];
  vehicles: any[];
  timestamp: number;
} | null = null;

const LUBRICENTRO_CACHE_KEY = "taller_lubricentro_cache_v4";

const DEPRECATED_CROSS_SUBCATEGORY_IDS = new Set([
  "lub_valvulina",
  "lub_hidraulico_aceite",
  "lub_frenos_aceite",
  "lub_refrigerante_aceite",
  "lub_limpieza_combustible",
]);

const SUBCATEGORY_LABEL_OVERRIDES: Record<string, string> = {
  lub_aceite_motor: "Motor",
  lub_fil_aceite: "De Aceite",
  lub_fil_aire: "De Aire",
  lub_fil_cabina: "Cabina A/C",
  lub_fil_transmision: "De Caja",
};

const LEGACY_PRODUCT_REMAP: Record<string, { catId: string; subId: string }> = {
  lub_valvulina: { catId: "lub_transmision", subId: "lub_trans_manual" },
  lub_hidraulico_aceite: { catId: "lub_fluidos", subId: "lub_flu_hidraulico" },
  lub_frenos_aceite: { catId: "lub_fluidos", subId: "lub_flu_frenos" },
  lub_refrigerante_aceite: { catId: "lub_fluidos", subId: "lub_flu_coolant" },
  lub_limpieza_combustible: { catId: "lub_aceite", subId: "lub_aditivos" },
};

function normalizarConfigCliente(rawConfig: any): LubricentroConfigData {
  if (!rawConfig) return DEFAULT_LUBRICENTRO_CONFIG_CLIENT;
  const defaultSubs = DEFAULT_LUBRICENTRO_CONFIG_CLIENT.subcategories || [];
  const rawSubs = Array.isArray(rawConfig.subcategories) ? rawConfig.subcategories : [];
  const existingIds = new Set(rawSubs.map((s: any) => s.id));
  const mergedSubs = [
    ...rawSubs,
    ...defaultSubs.filter((s: any) => !existingIds.has(s.id)),
  ]
    .filter((s: any) => !DEPRECATED_CROSS_SUBCATEGORY_IDS.has(s.id))
    .map((s: any) => ({
      ...s,
      label: SUBCATEGORY_LABEL_OVERRIDES[s.id] || s.label,
    }));

  return {
    ...DEFAULT_LUBRICENTRO_CONFIG_CLIENT,
    ...rawConfig,
    subcategories: mergedSubs,
  };
}

function normalizarProductosCliente(rawProducts: any[]): any[] {
  const baseList =
    Array.isArray(rawProducts) && rawProducts.length > 0
      ? rawProducts
      : DEFAULT_LUBRICENTRO_PRODUCTS_CLIENT;
  const existingIds = new Set(baseList.map((p: any) => p.id));
  const merged = [
    ...baseList,
    ...DEFAULT_LUBRICENTRO_PRODUCTS_CLIENT.filter((p: any) => !existingIds.has(p.id)),
  ];
  return merged.map((p: any) => {
    const remap = p.lubSubcategoryId ? LEGACY_PRODUCT_REMAP[p.lubSubcategoryId] : undefined;
    if (remap) {
      return {
        ...p,
        lubCategoryId: remap.catId,
        lubSubcategoryId: remap.subId,
      };
    }
    return p;
  });
}

const getInitialLubricentroCache = () => {
  if (_lubricentroClientCache) return _lubricentroClientCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LUBRICENTRO_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.config) {
          _lubricentroClientCache = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return null;
};

export default function ModuloLubricentroCatalogo({
  empleadoLogueado,
  ordenActiva,
  itemsOrden,
  onActualizarItemsOrden,
  onIrAAvisoYFirma,
  mostrarToast,
  triggerAbrirConfig,
}: ModuloLubricentroCatalogoProps) {
  // Inicializar desde caché si está disponible o desde configuración base instantánea (0ms)
  const [config, setConfig] = useState<LubricentroConfigData>(() => {
    const cached = getInitialLubricentroCache();
    return normalizarConfigCliente(cached?.config);
  });
  const [productos, setProductos] = useState<any[]>(() => {
    const cached = getInitialLubricentroCache();
    return normalizarProductosCliente(cached?.products || []);
  });
  const [vehiculosRegistrados, setVehiculosRegistrados] = useState<any[]>(() => {
    const cached = getInitialLubricentroCache();
    return cached?.vehicles || [];
  });
  const [cargando, setCargando] = useState<boolean>(false);
  const [bannerAviso, setBannerAviso] = useState<{
    texto: string;
    tipo: "ok" | "err";
  } | null>(null);

  // Selección de Categoría (Fila 1: "ALL" o id de categoría) y Subcategoría (Fila 2: "ALL" o id de subcategoría)
  const [categoriaActivaId, setCategoriaActivaId] = useState<string>("lub_aceite");
  const [subcategoriaPorCat, setSubcategoriaPorCat] = useState<Record<string, string>>({
    lub_aceite: "lub_aceite_motor",
    lub_transmision: "ALL",
    lub_filtros: "ALL",
    lub_fluidos: "ALL",
    lub_baterias: "ALL",
  });

  // ---------------------------------------------------------------------------
  // 3. FILTROS DE ACEITES (Aceites -> Motor)
  // ---------------------------------------------------------------------------
  const [filtroBase, setFiltroBase] = useState<string>(""); // "" = Todas, o "Sintético", "Semisintético", "Mineral"
  const [cantidadRequeridaLabel, setCantidadRequeridaLabel] = useState<string>("1 galón");
  const [cantidadRequeridaNum, setCantidadRequeridaNum] = useState<number>(1);
  const [cantidadPersonalizadaActiva, setCantidadPersonalizadaActiva] = useState<boolean>(false);
  const [cantidadPersonalizadaValor, setCantidadPersonalizadaValor] = useState<string>("");
  const [cantidadPersonalizadaUnidad, setCantidadPersonalizadaUnidad] = useState<string>("Litros");

  const [filtroPresentacion, setFiltroPresentacion] = useState<string>("");
  const [filtroViscosidad, setFiltroViscosidad] = useState<string>("");
  const [filtroEspecificacion, setFiltroEspecificacion] = useState<string>("");
  const [filtroMarca, setFiltroMarca] = useState<string>("");

  // ---------------------------------------------------------------------------
  // 4. FILTROS ESPECÍFICOS PARA LAS DEMÁS CATEGORÍAS
  // ---------------------------------------------------------------------------
  const [filtroTipoFluidoTrans, setFiltroTipoFluidoTrans] = useState<string>("");
  const [filtroTipoFiltro, setFiltroTipoFiltro] = useState<string>("");
  const [filtroRefFiltro, setFiltroRefFiltro] = useState<string>("");
  const [filtroAplicacionFiltro, setFiltroAplicacionFiltro] = useState<string>("");
  const [filtroClaseFluido, setFiltroClaseFluido] = useState<string>("");
  const [filtroVoltajeBat, setFiltroVoltajeBat] = useState<string>("");
  const [filtroCapacidadBat, setFiltroCapacidadBat] = useState<string>("");
  const [filtroTecnologiaBat, setFiltroTecnologiaBat] = useState<string>("");
  const [filtroGrupoBat, setFiltroGrupoBat] = useState<string>("");
  const [filtroPolaridadBat, setFiltroPolaridadBat] = useState<string>("");
  const [filtroTipoAditivo, setFiltroTipoAditivo] = useState<string>("");
  const [filtroAplicacionAditivo, setFiltroAplicacionAditivo] = useState<string>("");
  const [filtroTipoGrasa, setFiltroTipoGrasa] = useState<string>("");
  const [filtroAplicacionGrasa, setFiltroAplicacionGrasa] = useState<string>("");

  // ---------------------------------------------------------------------------
  // 6. BUSCADOR GENERAL, PRECIO, DISPONIBILIDAD Y COMPATIBILIDAD VEHICULAR
  // ---------------------------------------------------------------------------
  const [busquedaTexto, setBusquedaTexto] = useState<string>("");
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<
    "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "INACTIVE"
  >("ALL");
  const [precioMin, setPrecioMin] = useState<string>("");
  const [precioMax, setPrecioMax] = useState<string>("");
  const [verTodoElCatalogo, setVerTodoElCatalogo] = useState<boolean>(false);
  const [filtroCategoriaGeneral, setFiltroCategoriaGeneral] = useState<string>("");
  const [menuFiltroAbierto, setMenuFiltroAbierto] = useState<boolean>(false);
  const menuFiltroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (menuFiltroRef.current && !menuFiltroRef.current.contains(e.target as Node)) {
        setMenuFiltroAbierto(false);
      }
    };
    if (menuFiltroAbierto) {
      document.addEventListener("mousedown", handleClickAfuera);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickAfuera);
    };
  }, [menuFiltroAbierto]);

  // Buscador de compatibilidad por vehículo
  const [mostrarBuscadorVehiculo, setMostrarBuscadorVehiculo] = useState<boolean>(false);
  const [vehBrand, setVehBrand] = useState<string>("");
  const [vehModel, setVehModel] = useState<string>("");
  const [vehYear, setVehYear] = useState<string>("");
  const [vehEngine, setVehEngine] = useState<string>("");
  const [soloCompatiblesVerificados, setSoloCompatiblesVerificados] = useState<boolean>(false);

  // Estado local en tarjetas de producto (cantidad y presentación seleccionada por producto)
  const [cantPorProducto, setCantPorProducto] = useState<Record<string, number>>({});
  const [presPorProducto, setPresPorProducto] = useState<Record<string, string>>({});
  const [agregandoId, setAgregandoId] = useState<string | null>(null);

  // Carrito integrado de Lubricentro (cuando se vende directo o sincronizado con Orden Activa)
  const [carritoDirecto, setCarritoDirecto] = useState<CartItemLubricentro[]>([]);
  const [drawerCarritoAbierto, setDrawerCarritoAbierto] = useState<boolean>(false);
  const [enviandoPedidoPos, setEnviandoPedidoPos] = useState<boolean>(false);
  const [clienteVentaDirecta, setClienteVentaDirecta] = useState<string>("");

  // Selección múltiple de productos en la tienda
  const [productosSeleccionadosIds, setProductosSeleccionadosIds] = useState<string[]>([]);
  const [agregandoVarios, setAgregandoVarios] = useState<boolean>(false);

  // Modales administrativos
  const [productoDetalleModal, setProductoDetalleModal] = useState<any | null>(null);
  const [modalProductoFormAbierto, setModalProductoFormAbierto] = useState<boolean>(false);
  const [productoAEditar, setProductoAEditar] = useState<any | null>(null);
  const [modalConfigAbierto, setModalConfigAbierto] = useState<boolean>(false);
  const [tabConfigInicial, setTabConfigInicial] = useState<
    "categorias" | "subcategorias" | "aceites" | "marcas" | "otras_categorias"
  >("categorias");

  // Escuchar trigger de cabecera exterior
  useEffect(() => {
    if (triggerAbrirConfig && triggerAbrirConfig > 0) {
      setTabConfigInicial("categorias");
      setModalConfigAbierto(true);
    }
  }, [triggerAbrirConfig]);

  const notificar = (texto: string, tipo: "ok" | "err" = "ok") => {
    setBannerAviso({ texto, tipo });
    mostrarToast?.(texto, tipo);
    setTimeout(() => {
      setBannerAviso((prev) => (prev?.texto === texto ? null : prev));
    }, 3500);
  };

  // Cargar configuración real y productos de Neon en segundo plano sin congelar la pantalla
  const cargarDatosLubricentro = async () => {
    if (_lubricentroClientCache && Date.now() - _lubricentroClientCache.timestamp < 300000) {
      return;
    }
    try {
      setCargando(true);
      const res = await fetch("/api/taller/lubricentro?includeInactive=true", {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const cleanConfig = normalizarConfigCliente(data.config);
        const cleanProducts = normalizarProductosCliente(
          Array.isArray(data.products) ? data.products : []
        );
        const cacheObj = {
          config: cleanConfig,
          products: cleanProducts,
          vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
          timestamp: Date.now(),
        };
        _lubricentroClientCache = cacheObj;
        try {
          localStorage.setItem(LUBRICENTRO_CACHE_KEY, JSON.stringify(cacheObj));
        } catch {}
        setConfig(cleanConfig);
        setProductos(cleanProducts);
        setVehiculosRegistrados(cacheObj.vehicles);
      }
    } catch (err) {
      console.error("Error cargando Lubricentro desde Neon:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarDatosLubricentro();
  }, []);

  // Categorías y subcategorías activas ordenadas
  const categoriasActivas = useMemo(() => {
    if (!config) return [];
    return [...config.categories].filter((c) => c.active).sort((a, b) => a.order - b.order);
  }, [config]);

  const categoriaSeleccionadaObj = useMemo(() => {
    if (categoriaActivaId === "ALL") return null;
    return categoriasActivas.find((c) => c.id === categoriaActivaId) || categoriasActivas[0] || null;
  }, [categoriasActivas, categoriaActivaId]);

  const subcategoriasActivas = useMemo(() => {
    if (!config || !categoriaSeleccionadaObj) return [];
    return [...config.subcategories]
      .filter((s) => s.categoryId === categoriaSeleccionadaObj.id && s.active)
      .sort((a, b) => a.order - b.order);
  }, [config, categoriaSeleccionadaObj]);

  const subcategoriaActivaId = useMemo(() => {
    if (!categoriaSeleccionadaObj) return "ALL";
    const guardada = subcategoriaPorCat[categoriaSeleccionadaObj.id];
    if (guardada === "ALL") return "ALL";
    if (guardada && subcategoriasActivas.some((s) => s.id === guardada)) {
      return guardada;
    }
    return "ALL";
  }, [categoriaSeleccionadaObj, subcategoriaPorCat, subcategoriasActivas]);

  const subcategoriaSeleccionadaObj = useMemo(() => {
    if (subcategoriaActivaId === "ALL") return null;
    return subcategoriasActivas.find((s) => s.id === subcategoriaActivaId) || null;
  }, [subcategoriasActivas, subcategoriaActivaId]);

  const schemaType = categoriaSeleccionadaObj?.schemaType || "aceites";
  const subSchemaType = subcategoriaSeleccionadaObj?.subSchemaType || "aceite_motor";

  // Limpiar filtros incompatibles al cambiar de categoría o subcategoría
  const handleCambiarCategoria = (catId: string) => {
    setCategoriaActivaId(catId);
    setVerTodoElCatalogo(catId === "ALL");
    setFiltroViscosidad("");
    setFiltroBase("");
    setFiltroEspecificacion("");
    setFiltroPresentacion("");
    setFiltroTipoFluidoTrans("");
    setFiltroTipoFiltro("");
    setFiltroRefFiltro("");
    setFiltroAplicacionFiltro("");
    setFiltroClaseFluido("");
    setFiltroVoltajeBat("");
    setFiltroCapacidadBat("");
    setFiltroTecnologiaBat("");
    setFiltroGrupoBat("");
    setFiltroPolaridadBat("");
    setFiltroTipoAditivo("");
    setFiltroAplicacionAditivo("");
    setFiltroTipoGrasa("");
    setFiltroAplicacionGrasa("");
  };

  const handleCambiarSubcategoria = (subId: string) => {
    if (!categoriaSeleccionadaObj) return;
    setSubcategoriaPorCat((prev) => ({
      ...prev,
      [categoriaSeleccionadaObj.id]: subId,
    }));
    setFiltroViscosidad("");
    setFiltroEspecificacion("");
  };

  // Marcas dinámicas combinadas (configuración + catálogo real)
  const marcasDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    if (config?.brands) {
      config.brands
        .filter((b) => b.active)
        .sort((a, b) => a.order - b.order)
        .forEach((b) => map.set(b.name.toLowerCase(), b.name));
    }
    productos.forEach((p) => {
      if (p.brand && p.brand.trim()) {
        map.set(p.brand.trim().toLowerCase(), p.brand.trim());
      }
    });
    return Array.from(map.values());
  }, [config, productos]);

  // Verificar compatibilidad de un producto con el filtro de vehículo activo
  const evaluarCompatibilidadVehiculo = (prod: any): {
    tieneFiltroVehiculo: boolean;
    compatibleVerificado: boolean;
    detalleMatch?: LubVehicleCompatibility;
  } => {
    const hayFiltroVeh =
      Boolean(vehBrand.trim()) ||
      Boolean(vehModel.trim()) ||
      Boolean(vehYear.trim()) ||
      Boolean(vehEngine.trim());

    const listaComp: LubVehicleCompatibility[] = Array.isArray(prod.compatibilities)
      ? prod.compatibilities
      : [];

    if (!hayFiltroVeh) {
      return {
        tieneFiltroVehiculo: false,
        compatibleVerificado: listaComp.length > 0,
        detalleMatch: listaComp[0],
      };
    }

    const match = listaComp.find((c) => {
      if (!c.verified) return false;
      const bOk =
        !vehBrand.trim() ||
        c.brand.toLowerCase().includes(vehBrand.trim().toLowerCase());
      const mOk =
        !vehModel.trim() ||
        c.model.toLowerCase().includes(vehModel.trim().toLowerCase());
      const eOk =
        !vehEngine.trim() ||
        (c.engine || "").toLowerCase().includes(vehEngine.trim().toLowerCase());
      let yOk = true;
      const yNum = parseInt(vehYear, 10);
      if (!isNaN(yNum)) {
        if (c.yearFrom && yNum < c.yearFrom) yOk = false;
        if (c.yearTo && yNum > c.yearTo) yOk = false;
      }
      return bOk && mOk && eOk && yOk;
    });

    return {
      tieneFiltroVehiculo: true,
      compatibleVerificado: Boolean(match),
      detalleMatch: match,
    };
  };

  // Filtrado dinámico de productos reales
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      // Estado activo/inactivo
      if (filtroDisponibilidad === "INACTIVE") {
        if (p.active !== false && p.status !== "Inactivo") return false;
      } else {
        if (p.active === false || p.status === "Inactivo") return false;
      }

      // Categoría y Subcategoría (salvo que "Ver todo el catálogo" o "ALL" esté activo)
      if (verTodoElCatalogo || categoriaActivaId === "ALL") {
        if (filtroCategoriaGeneral && p.lubCategoryId !== filtroCategoriaGeneral) {
          return false;
        }
      } else {
        if (categoriaSeleccionadaObj && p.lubCategoryId !== categoriaSeleccionadaObj.id) {
          return false;
        }
        if (
          subcategoriaActivaId &&
          subcategoriaActivaId !== "ALL" &&
          p.lubSubcategoryId &&
          p.lubSubcategoryId !== subcategoriaActivaId
        ) {
          return false;
        }
      }

      // Disponibilidad
      const st = Number(p.stock ?? 0);
      const minSt = Number(p.minStock ?? 5);
      if (filtroDisponibilidad === "IN_STOCK" && st <= 0) return false;
      if (filtroDisponibilidad === "LOW_STOCK" && (st <= 0 || st > minSt)) return false;
      if (filtroDisponibilidad === "OUT_OF_STOCK" && st > 0) return false;

      // Rango de precios
      const pr = Number(p.price ?? 0);
      if (precioMin.trim() !== "" && !isNaN(Number(precioMin)) && pr < Number(precioMin)) {
        return false;
      }
      if (precioMax.trim() !== "" && !isNaN(Number(precioMax)) && pr > Number(precioMax)) {
        return false;
      }

      // Marca
      if (
        filtroMarca &&
        (p.brand || "").toLowerCase() !== filtroMarca.toLowerCase()
      ) {
        return false;
      }

      // Presentación comercial
      if (filtroPresentacion) {
        const matchPresPrincipal =
          (p.presentation || "").toLowerCase() === filtroPresentacion.toLowerCase();
        const matchPresVariante =
          Array.isArray(p.presentationsAvailable) &&
          p.presentationsAvailable.some(
            (pv: LubPresentationVariant) =>
              pv.label.toLowerCase() === filtroPresentacion.toLowerCase()
          );
        if (!matchPresPrincipal && !matchPresVariante) return false;
      }

      // Especificación técnica
      if (filtroEspecificacion) {
        const specs: string[] = Array.isArray(p.specifications) ? p.specifications : [];
        const tieneSpec = specs.some(
          (s) => s.toLowerCase() === filtroEspecificacion.toLowerCase()
        );
        if (!tieneSpec) return false;
      }

      // Filtros específicos según categoría activa
      if (
        schemaType === "aceites" &&
        (subcategoriaActivaId === "ALL" || subSchemaType === "aceite_motor")
      ) {
        if (filtroBase) {
          const normBase = (s: string) =>
            s
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "");
          if (normBase(p.lubricantBase || "") !== normBase(filtroBase)) {
            return false;
          }
        }
        if (
          filtroViscosidad &&
          (p.viscosity || "").toUpperCase() !== filtroViscosidad.toUpperCase()
        ) {
          return false;
        }
      } else if (schemaType === "aceites" && (subSchemaType === "aditivos" || subSchemaType === "flush")) {
        if (
          filtroTipoAditivo &&
          (p.additiveProductType || "").toLowerCase() !== filtroTipoAditivo.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroAplicacionAditivo &&
          (p.additiveApplication || "").toLowerCase() !== filtroAplicacionAditivo.toLowerCase()
        ) {
          return false;
        }
      } else if (schemaType === "aceites" && subSchemaType === "grasas") {
        if (
          filtroTipoGrasa &&
          (p.greaseType || "").toLowerCase() !== filtroTipoGrasa.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroAplicacionGrasa &&
          (p.greaseApplication || "").toLowerCase() !== filtroAplicacionGrasa.toLowerCase()
        ) {
          return false;
        }
      } else if (schemaType === "transmision") {
        if (
          filtroTipoFluidoTrans &&
          (p.fluidType || "").toLowerCase() !== filtroTipoFluidoTrans.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroViscosidad &&
          (p.viscosity || "").toUpperCase() !== filtroViscosidad.toUpperCase()
        ) {
          return false;
        }
      } else if (schemaType === "filtros") {
        if (
          filtroTipoFiltro &&
          (p.filterType || "").toLowerCase() !== filtroTipoFiltro.toLowerCase()
        ) {
          return false;
        }
        if (filtroRefFiltro.trim()) {
          const qRef = filtroRefFiltro.trim().toLowerCase();
          const enSku = (p.code || "").toLowerCase().includes(qRef);
          const enOem = (p.manufacturerCode || "").toLowerCase().includes(qRef);
          if (!enSku && !enOem) return false;
        }
        if (filtroAplicacionFiltro.trim()) {
          const qApp = filtroAplicacionFiltro.trim().toLowerCase();
          const enApp = (p.filterApplication || "").toLowerCase().includes(qApp);
          const enDesc = (p.description || "").toLowerCase().includes(qApp);
          const enComp =
            Array.isArray(p.compatibilities) &&
            p.compatibilities.some((c: LubVehicleCompatibility) =>
              `${c.brand} ${c.model} ${c.engine || ""}`.toLowerCase().includes(qApp)
            );
          if (!enApp && !enDesc && !enComp) return false;
        }
      } else if (schemaType === "fluidos") {
        if (
          filtroClaseFluido &&
          (p.fluidClass || "").toLowerCase() !== filtroClaseFluido.toLowerCase()
        ) {
          return false;
        }
      } else if (schemaType === "baterias") {
        if (
          filtroVoltajeBat &&
          (p.voltage || "").toLowerCase() !== filtroVoltajeBat.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroCapacidadBat &&
          (p.capacityAh || "").toLowerCase() !== filtroCapacidadBat.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroTecnologiaBat &&
          (p.technology || "").toLowerCase() !== filtroTecnologiaBat.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroGrupoBat &&
          (p.dimensionsGroup || "").toLowerCase() !== filtroGrupoBat.toLowerCase()
        ) {
          return false;
        }
        if (
          filtroPolaridadBat &&
          (p.polarity || "").toLowerCase() !== filtroPolaridadBat.toLowerCase()
        ) {
          return false;
        }
      }

      // Compatibilidad vehicular
      if (soloCompatiblesVerificados) {
        const evalComp = evaluarCompatibilidadVehiculo(p);
        if (!evalComp.compatibleVerificado) return false;
      }

      // Barra de búsqueda general (multi-término e insensible a tildes)
      if (busquedaTexto.trim()) {
        const norm = (str: string) =>
          (str || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const terms = norm(busquedaTexto.trim()).split(/\s+/).filter(Boolean);
        const textoCompleto = norm(
          [
            p.name,
            p.brand,
            p.code,
            p.manufacturerCode,
            p.viscosity,
            p.lubricantBase,
            p.presentation,
            p.unitOfMeasure,
            p.description,
            p.filterType,
            p.filterApplication,
            p.fluidType,
            p.fluidClass,
            p.capacityAh,
            p.technology,
            ...(Array.isArray(p.specifications) ? p.specifications : []),
          ]
            .filter(Boolean)
            .join(" ")
        );
        if (!terms.every((t) => textoCompleto.includes(t))) return false;
      }

      return true;
    });
  }, [
    productos,
    filtroDisponibilidad,
    verTodoElCatalogo,
    categoriaActivaId,
    categoriaSeleccionadaObj,
    subcategoriaActivaId,
    precioMin,
    precioMax,
    filtroMarca,
    filtroPresentacion,
    filtroEspecificacion,
    schemaType,
    subSchemaType,
    filtroBase,
    filtroViscosidad,
    filtroTipoAditivo,
    filtroAplicacionAditivo,
    filtroTipoGrasa,
    filtroAplicacionGrasa,
    filtroTipoFluidoTrans,
    filtroTipoFiltro,
    filtroRefFiltro,
    filtroAplicacionFiltro,
    filtroClaseFluido,
    filtroVoltajeBat,
    filtroCapacidadBat,
    filtroTecnologiaBat,
    filtroGrupoBat,
    filtroPolaridadBat,
    soloCompatiblesVerificados,
    vehBrand,
    vehModel,
    vehYear,
    vehEngine,
    busquedaTexto,
    filtroCategoriaGeneral,
  ]);

  // Chips de filtros activos para poder eliminarlos individualmente o limpiar todo
  const chipsFiltrosActivos = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (busquedaTexto.trim()) {
      chips.push({
        key: "q",
        label: `Búsqueda: "${busquedaTexto}"`,
        onClear: () => setBusquedaTexto(""),
      });
    }
    if (filtroBase) {
      chips.push({
        key: "base",
        label: `Base: ${filtroBase}`,
        onClear: () => setFiltroBase(""),
      });
    }
    if (filtroViscosidad) {
      chips.push({
        key: "visc",
        label: `Viscosidad: ${filtroViscosidad}`,
        onClear: () => setFiltroViscosidad(""),
      });
    }
    if (filtroPresentacion) {
      chips.push({
        key: "pres",
        label: `Presentación: ${filtroPresentacion}`,
        onClear: () => setFiltroPresentacion(""),
      });
    }
    if (filtroEspecificacion) {
      chips.push({
        key: "spec",
        label: `Norma: ${filtroEspecificacion}`,
        onClear: () => setFiltroEspecificacion(""),
      });
    }
    if (filtroMarca) {
      chips.push({
        key: "brand",
        label: `Marca: ${filtroMarca}`,
        onClear: () => setFiltroMarca(""),
      });
    }
    if (filtroTipoFluidoTrans) {
      chips.push({
        key: "fluidType",
        label: `Fluido: ${filtroTipoFluidoTrans}`,
        onClear: () => setFiltroTipoFluidoTrans(""),
      });
    }
    if (filtroTipoFiltro) {
      chips.push({
        key: "filterType",
        label: `Tipo Filtro: ${filtroTipoFiltro}`,
        onClear: () => setFiltroTipoFiltro(""),
      });
    }
    if (filtroRefFiltro) {
      chips.push({
        key: "filterRef",
        label: `Ref/Código: ${filtroRefFiltro}`,
        onClear: () => setFiltroRefFiltro(""),
      });
    }
    if (filtroAplicacionFiltro) {
      chips.push({
        key: "filterApp",
        label: `Aplicación: ${filtroAplicacionFiltro}`,
        onClear: () => setFiltroAplicacionFiltro(""),
      });
    }
    if (filtroClaseFluido) {
      chips.push({
        key: "fluidClass",
        label: `Clase: ${filtroClaseFluido}`,
        onClear: () => setFiltroClaseFluido(""),
      });
    }
    if (filtroVoltajeBat) {
      chips.push({
        key: "volt",
        label: `Voltaje: ${filtroVoltajeBat}`,
        onClear: () => setFiltroVoltajeBat(""),
      });
    }
    if (filtroCapacidadBat) {
      chips.push({
        key: "cap",
        label: `Capacidad: ${filtroCapacidadBat}`,
        onClear: () => setFiltroCapacidadBat(""),
      });
    }
    if (filtroTecnologiaBat) {
      chips.push({
        key: "tech",
        label: `Tecnología: ${filtroTecnologiaBat}`,
        onClear: () => setFiltroTecnologiaBat(""),
      });
    }
    if (filtroGrupoBat) {
      chips.push({
        key: "grp",
        label: `Grupo: ${filtroGrupoBat}`,
        onClear: () => setFiltroGrupoBat(""),
      });
    }
    if (filtroPolaridadBat) {
      chips.push({
        key: "pol",
        label: `Polaridad: ${filtroPolaridadBat}`,
        onClear: () => setFiltroPolaridadBat(""),
      });
    }
    if (filtroTipoAditivo) {
      chips.push({
        key: "addType",
        label: `Tipo: ${filtroTipoAditivo}`,
        onClear: () => setFiltroTipoAditivo(""),
      });
    }
    if (filtroAplicacionAditivo) {
      chips.push({
        key: "addApp",
        label: `Aplicación: ${filtroAplicacionAditivo}`,
        onClear: () => setFiltroAplicacionAditivo(""),
      });
    }
    if (filtroTipoGrasa) {
      chips.push({
        key: "grType",
        label: `Grasa: ${filtroTipoGrasa}`,
        onClear: () => setFiltroTipoGrasa(""),
      });
    }
    if (filtroAplicacionGrasa) {
      chips.push({
        key: "grApp",
        label: `Aplicación: ${filtroAplicacionGrasa}`,
        onClear: () => setFiltroAplicacionGrasa(""),
      });
    }
    if (precioMin || precioMax) {
      chips.push({
        key: "price",
        label: `Precio: $${precioMin || "0"} - $${precioMax || "∞"}`,
        onClear: () => {
          setPrecioMin("");
          setPrecioMax("");
        },
      });
    }
    if (filtroDisponibilidad !== "ALL") {
      chips.push({
        key: "disp",
        label: `Disponibilidad: ${filtroDisponibilidad}`,
        onClear: () => setFiltroDisponibilidad("ALL"),
      });
    }
    if (soloCompatiblesVerificados) {
      chips.push({
        key: "vehComp",
        label: `Compatibilidad Verificada (${vehBrand || "Auto"} ${vehModel || ""})`,
        onClear: () => setSoloCompatiblesVerificados(false),
      });
    }
    return chips;
  }, [
    busquedaTexto,
    filtroBase,
    filtroViscosidad,
    filtroPresentacion,
    filtroEspecificacion,
    filtroMarca,
    filtroTipoFluidoTrans,
    filtroTipoFiltro,
    filtroRefFiltro,
    filtroAplicacionFiltro,
    filtroClaseFluido,
    filtroVoltajeBat,
    filtroCapacidadBat,
    filtroTecnologiaBat,
    filtroGrupoBat,
    filtroPolaridadBat,
    filtroTipoAditivo,
    filtroAplicacionAditivo,
    filtroTipoGrasa,
    filtroAplicacionGrasa,
    precioMin,
    precioMax,
    filtroDisponibilidad,
    soloCompatiblesVerificados,
    vehBrand,
    vehModel,
  ]);

  const limpiarTodosLosFiltros = () => {
    chipsFiltrosActivos.forEach((c) => c.onClear());
    setVerTodoElCatalogo(false);
  };

  // Validar en el servidor (Neon) precio y stock antes de agregar al carrito / orden
  const handleValidarYAgregarAlCarrito = async (
    prod: any,
    cantidadSolicitada: number,
    presentationId?: string
  ) => {
    setAgregandoId(prod.id);
    try {
      const res = await fetch("/api/taller/lubricentro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VALIDAR_Y_AGREGAR_CARRITO",
          productId: prod.id,
          quantity: cantidadSolicitada,
          presentationId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        notificar(data.error || "No hay stock suficiente para este producto.", "err");
        return;
      }

      const validado = data.validatedItem;
      const detalleReq =
        schemaType === "aceites" && subSchemaType === "aceite_motor"
          ? ` • Req. cliente: ${
              cantidadPersonalizadaActiva && cantidadPersonalizadaValor
                ? `${cantidadPersonalizadaValor} ${cantidadPersonalizadaUnidad}`
                : cantidadRequeridaLabel
            }`
          : "";

      const nombreEnOrden = `${validado.name} [${validado.presentation}]${detalleReq}`;

      // 1. Si hay una orden activa en el taller/lubricentro, se integra directamente a los ítems de la orden
      if (ordenActiva?.id) {
        const idxExistente = itemsOrden.findIndex(
          (it) =>
            it.productId === validado.productId &&
            it.presentation === validado.presentation
        );

        let nuevosItems: any[];
        if (idxExistente >= 0) {
          const nuevaCant = (Number(itemsOrden[idxExistente].qty) || 1) + validado.qty;
          if (nuevaCant > validado.availableStock) {
            notificar(
              `Stock máximo disponible (${validado.availableStock}) alcanzado para ${validado.name}.`,
              "err"
            );
            return;
          }
          nuevosItems = itemsOrden.map((it, idx) =>
            idx === idxExistente
              ? { ...it, qty: nuevaCant, price: validado.price }
              : it
          );
        } else {
          const nuevoItem = {
            id: `lub-${validado.code}-${Date.now()}`,
            productId: validado.productId,
            type: "PART" as const,
            category: `Lubricentro - ${categoriaSeleccionadaObj?.label || "Catálogo"}`,
            subCategory: validado.lubSubcategoryId || subcategoriaActivaId,
            code: validado.code,
            name: nombreEnOrden,
            presentation: validado.presentation,
            unitOfMeasure: validado.unitOfMeasure,
            price: validado.price,
            qty: validado.qty,
            status: "Listo" as const,
            completed: true,
            empleado_id: empleadoLogueado.id,
            empleado_nombre: empleadoLogueado.nombre,
          };
          nuevosItems = [...itemsOrden, nuevoItem];
        }

        await onActualizarItemsOrden(nuevosItems);
        notificar(
          `✓ Agregado a Orden #${ordenActiva.orderNumber || ordenActiva.plate}: ${validado.qty}x ${validado.name} (${validado.presentation})`,
          "ok"
        );
      }

      // 2. También actualizamos el carrito de Lubricentro
      setCarritoDirecto((prev) => {
        const key = `${validado.productId}_${validado.presentation}`;
        const idx = prev.findIndex((x) => x.key === key);
        if (idx >= 0) {
          const nextQty = Math.min(validado.availableStock, prev[idx].qty + validado.qty);
          return prev.map((x, i) =>
            i === idx ? { ...x, qty: nextQty, price: validado.price } : x
          );
        }
        return [
          ...prev,
          {
            key,
            productId: validado.productId,
            code: validado.code,
            name: validado.name,
            brand: validado.brand || "",
            presentation: validado.presentation,
            unitOfMeasure: validado.unitOfMeasure || "Unidad",
            presentationId,
            price: validado.price,
            qty: validado.qty,
            maxStock: validado.availableStock,
            imageUrl: validado.imageUrl,
            lubCategoryId: validado.lubCategoryId,
            lubSubcategoryId: validado.lubSubcategoryId,
          },
        ];
      });

      if (!ordenActiva?.id) {
        notificar(
          `✓ Agregado al Carrito: ${validado.qty}x ${validado.name} ($${Number(validado.price).toFixed(2)})`,
          "ok"
        );
      }
    } catch (err: any) {
      notificar(err?.message || "Error al validar producto", "err");
    } finally {
      setAgregandoId(null);
    }
  };


  // Agregar producto directo con botón amarillo [Agregar] del catálogo
  const handleAgregarProductoDirecto = async (prod: any) => {
    setAgregandoId(prod.id);
    try {
      const precio = Number(prod.price || 0);
      const presentacion = prod.presentation || prod.unitOfMeasure || "1 Litro";
      const nuevoItem = {
        id: `it_${prod.id}_${Date.now()}`,
        key: `key_${prod.id}_${Date.now()}`,
        type: (prod.type || "PART") as "PART" | "SERVICE",
        category: `Lubricentro - ${categoriaSeleccionadaObj?.label || "Catálogo"}`,
        subCategory: subcategoriaActivaId,
        code: prod.code,
        productId: prod.id,
        name: prod.name,
        brand: prod.brand,
        presentation: presentacion,
        unitOfMeasure: prod.unitOfMeasure || "Unidad",
        price: precio,
        qty: 1,
        status: "Listo" as const,
        completed: true,
        empleado_id: empleadoLogueado.id,
        empleado_nombre: empleadoLogueado.nombre,
      };

      if (ordenActiva) {
        const nuevos = [...itemsOrden, nuevoItem];
        await onActualizarItemsOrden(nuevos);
        notificar(`✓ Agregado a la orden: ${prod.name}`, "ok");
      } else {
        setCarritoDirecto((prev) => {
          const existe = prev.findIndex((c) => c.productId === prod.id && c.presentation === presentacion);
          if (existe >= 0) {
            const copia = [...prev];
            copia[existe] = { ...copia[existe], qty: copia[existe].qty + 1 };
            return copia;
          }
          return [
            ...prev,
            {
              key: nuevoItem.key,
              productId: prod.id,
              code: prod.code,
              name: prod.name,
              brand: prod.brand,
              presentation: presentacion,
              unitOfMeasure: prod.unitOfMeasure || "Unidad",
              price: precio,
              qty: 1,
              maxStock: prod.stock || 999,
              imageUrl: prod.imageUrl,
              lubCategoryId: prod.lubCategoryId || categoriaActivaId,
              lubSubcategoryId: prod.lubSubcategoryId || subcategoriaActivaId,
            },
          ];
        });
        notificar(`✓ Agregado al carrito: ${prod.name}`, "ok");
      }
    } finally {
      setAgregandoId(null);
    }
  };

  // Agregar múltiples productos seleccionados simultáneamente a la orden o al carrito
  const handleAgregarVariosSeleccionados = async () => {
    if (productosSeleccionadosIds.length === 0) return;
    const prodsToAdd = productos.filter((p) => productosSeleccionadosIds.includes(p.id));
    if (prodsToAdd.length === 0) return;

    setAgregandoVarios(true);
    try {
      if (ordenActiva) {
        const timestamp = Date.now();
        const nuevosItems = prodsToAdd.map((prod, idx) => {
          const precio = Number(prod.price || 0);
          const presentacion = prod.presentation || prod.unitOfMeasure || "1 Litro";
          return {
            id: `it_${prod.id}_${timestamp}_${idx}`,
            key: `key_${prod.id}_${timestamp}_${idx}`,
            type: (prod.type || "PART") as "PART" | "SERVICE",
            category: `Lubricentro - ${categoriaSeleccionadaObj?.label || "Catálogo"}`,
            subCategory: subcategoriaActivaId,
            code: prod.code,
            productId: prod.id,
            name: prod.name,
            brand: prod.brand,
            presentation: presentacion,
            unitOfMeasure: prod.unitOfMeasure || "Unidad",
            price: precio,
            qty: 1,
            status: "Listo" as const,
            completed: true,
            empleado_id: empleadoLogueado.id,
            empleado_nombre: empleadoLogueado.nombre,
          };
        });

        await onActualizarItemsOrden([...itemsOrden, ...nuevosItems]);
        notificar(`✓ Se agregaron ${nuevosItems.length} productos a la orden`, "ok");
      } else {
        setCarritoDirecto((prev) => {
          const copia = [...prev];
          const timestamp = Date.now();
          prodsToAdd.forEach((prod, idx) => {
            const presentacion = prod.presentation || prod.unitOfMeasure || "1 Litro";
            const precio = Number(prod.price || 0);
            const existe = copia.findIndex((c) => c.productId === prod.id && c.presentation === presentacion);
            if (existe >= 0) {
              copia[existe] = { ...copia[existe], qty: copia[existe].qty + 1 };
            } else {
              copia.push({
                key: `key_${prod.id}_${timestamp}_${idx}`,
                productId: prod.id,
                code: prod.code,
                name: prod.name,
                brand: prod.brand,
                presentation: presentacion,
                unitOfMeasure: prod.unitOfMeasure || "Unidad",
                price: precio,
                qty: 1,
                maxStock: prod.stock || 999,
                imageUrl: prod.imageUrl,
                lubCategoryId: prod.lubCategoryId || categoriaActivaId,
                lubSubcategoryId: prod.lubSubcategoryId || subcategoriaActivaId,
              });
            }
          });
          return copia;
        });
        notificar(`✓ Se agregaron ${prodsToAdd.length} productos al pedido`, "ok");
      }
      setProductosSeleccionadosIds([]);
    } catch (err: any) {
      notificar(err?.message || "Error al agregar productos", "err");
    } finally {
      setAgregandoVarios(false);
    }
  };

  // Enviar carrito directo a POS (/api/solicitudes) validando cada ítem en el servidor
  const handleEnviarCarritoDirectoAPos = async () => {
    if (carritoDirecto.length === 0) return;
    setEnviandoPedidoPos(true);
    try {
      // Re-validar precio y stock en el servidor antes de procesar la compra
      for (const item of carritoDirecto) {
        const vRes = await fetch("/api/taller/lubricentro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "VALIDAR_Y_AGREGAR_CARRITO",
            productId: item.productId,
            quantity: item.qty,
            presentationId: item.presentationId,
          }),
        });
        const vData = await vRes.json();
        if (!vRes.ok || !vData.success) {
          throw new Error(
            vData.error || `Stock insuficiente para ${item.name}`
          );
        }
      }

      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TIENDA",
          customerName:
            clienteVentaDirecta.trim() ||
            ordenActiva?.client ||
            "Cliente Lubricentro",
          customerPhone: ordenActiva?.clientPhone || "0999999999",
          vehicleInfo: ordenActiva
            ? `${ordenActiva.vehicle} (${ordenActiva.plate})`
            : "Venta Directa Lubricentro",
          notes: "Pedido validado desde Módulo Lubricentro",
          items: carritoDirecto.map((c) => ({
            productId: c.productId,
            code: c.code,
            name: `${c.name} (${c.presentation})`,
            quantity: c.qty,
            price: c.price,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo enviar el pedido al POS");
      }

      notificar(
        `✓ Pedido #${data.solicitud?.requestNumber || ""} enviado a Caja POS correctamente.`,
        "ok"
      );
      setCarritoDirecto([]);
      setDrawerCarritoAbierto(false);
    } catch (err: any) {
      notificar(err?.message || "Error al procesar envío a POS", "err");
    } finally {
      setEnviandoPedidoPos(false);
    }
  };

  // Conteo de productos por categoría y subcategoría
  const conteoProductosPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    productos.forEach((p) => {
      if (p.active !== false && p.status !== "Inactivo") {
        map[p.lubCategoryId] = (map[p.lubCategoryId] || 0) + 1;
      }
    });
    return map;
  }, [productos]);

  const conteoProductosPorSubcategoria = useMemo(() => {
    const map: Record<string, number> = {};
    productos.forEach((p) => {
      if (p.active !== false && p.status !== "Inactivo" && p.lubSubcategoryId) {
        map[p.lubSubcategoryId] = (map[p.lubSubcategoryId] || 0) + 1;
      }
    });
    return map;
  }, [productos]);

  // Obtener la presentación y precio seleccionado actualmente en tarjeta para un producto
  const obtenerPresentacionYPrecio = (prod: any) => {
    const variantes: LubPresentationVariant[] = Array.isArray(prod.presentationsAvailable)
      ? prod.presentationsAvailable
      : [];
    const presElegidaId = presPorProducto[prod.id];
    const varianteActiva = presElegidaId
      ? variantes.find((v) => v.id === presElegidaId || v.label === presElegidaId)
      : variantes[0];

    const presentation =
      varianteActiva?.label || prod.presentation || prod.unitOfMeasure || "1 Unidad";
    const price = Number(varianteActiva?.price ?? prod.price ?? 0);
    const unitOfMeasure = varianteActiva?.unitOfMeasure || prod.unitOfMeasure || "Unidad";

    return { presentation, price, unitOfMeasure, variantes };
  };

  // Cantidad actual de un producto (y su presentación activa) en la Orden o Carrito
  const obtenerCantidadEnPedido = (prod: any, presentation: string): number => {
    if (ordenActiva) {
      const matches = itemsOrden.filter(
        (it) =>
          (it.productId === prod.id || (it.code && prod.code && it.code === prod.code)) &&
          (!it.presentation || it.presentation === presentation)
      );
      return matches.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
    }
    const found = carritoDirecto.find(
      (c) => c.productId === prod.id && c.presentation === presentation
    );
    return found ? found.qty : 0;
  };

  // Ajustar (+1 / -1) la cantidad de un producto de forma inmediata y automática
  const handleAjustarCantidadProducto = async (
    prod: any,
    delta: number,
    presentationOverride?: string,
    priceOverride?: number
  ) => {
    const { presentation, price, unitOfMeasure } = obtenerPresentacionYPrecio(prod);
    const finalPres = presentationOverride || presentation;
    const finalPrice = priceOverride ?? price;

    setAgregandoId(prod.id);
    try {
      if (ordenActiva) {
        const idx = itemsOrden.findIndex(
          (it) =>
            (it.productId === prod.id || (it.code && prod.code && it.code === prod.code)) &&
            (!it.presentation || it.presentation === finalPres)
        );

        if (idx >= 0) {
          const actualQty = Number(itemsOrden[idx].qty) || 1;
          const nextQty = actualQty + delta;
          if (nextQty <= 0) {
            const filtrados = itemsOrden.filter((_, i) => i !== idx);
            await onActualizarItemsOrden(filtrados);
          } else {
            const actualizados = itemsOrden.map((it, i) =>
              i === idx ? { ...it, qty: nextQty, price: finalPrice, presentation: finalPres } : it
            );
            await onActualizarItemsOrden(actualizados);
          }
        } else if (delta > 0) {
          const catLabel =
            categoriasActivas.find((c) => c.id === prod.lubCategoryId)?.label ||
            categoriaSeleccionadaObj?.label ||
            "Catálogo";
          const nuevoItem = {
            id: `it_${prod.id}_${Date.now()}`,
            key: `key_${prod.id}_${Date.now()}`,
            type: (prod.type || "PART") as "PART" | "SERVICE",
            category: `Lubricentro - ${catLabel}`,
            subCategory: prod.lubSubcategoryId || subcategoriaActivaId,
            code: prod.code,
            productId: prod.id,
            name: `${prod.name} (${finalPres})`,
            brand: prod.brand,
            presentation: finalPres,
            unitOfMeasure,
            price: finalPrice,
            qty: delta,
            status: "Listo" as const,
            completed: true,
            empleado_id: empleadoLogueado.id,
            empleado_nombre: empleadoLogueado.nombre,
          };
          await onActualizarItemsOrden([...itemsOrden, nuevoItem]);
        }
      } else {
        setCarritoDirecto((prev) => {
          const idx = prev.findIndex(
            (c) => c.productId === prod.id && c.presentation === finalPres
          );
          if (idx >= 0) {
            const nextQty = prev[idx].qty + delta;
            if (nextQty <= 0) {
              return prev.filter((_, i) => i !== idx);
            }
            return prev.map((c, i) =>
              i === idx ? { ...c, qty: nextQty, price: finalPrice } : c
            );
          }
          if (delta <= 0) return prev;
          return [
            ...prev,
            {
              key: `${prod.id}_${finalPres}`,
              productId: prod.id,
              code: prod.code,
              name: prod.name,
              brand: prod.brand || "",
              presentation: finalPres,
              unitOfMeasure,
              price: finalPrice,
              qty: delta,
              maxStock: prod.stock || 999,
              imageUrl: prod.imageUrl,
              lubCategoryId: prod.lubCategoryId || categoriaActivaId,
              lubSubcategoryId: prod.lubSubcategoryId || subcategoriaActivaId,
            },
          ];
        });
      }
    } finally {
      setAgregandoId(null);
    }
  };

  // Conteo de ítems en el pedido/orden por categoría para mostrar badge automático
  const conteoEnPedidoPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    if (ordenActiva) {
      itemsOrden.forEach((it) => {
        const prod = productos.find(
          (p) => p.id === it.productId || (p.code && it.code && p.code === it.code)
        );
        if (prod?.lubCategoryId) {
          map[prod.lubCategoryId] = (map[prod.lubCategoryId] || 0) + (Number(it.qty) || 1);
        }
      });
    } else {
      carritoDirecto.forEach((c) => {
        if (c.lubCategoryId) {
          map[c.lubCategoryId] = (map[c.lubCategoryId] || 0) + c.qty;
        }
      });
    }
    return map;
  }, [ordenActiva, itemsOrden, carritoDirecto, productos]);

  const totalUnidadesCarrito = useMemo(() => {
    if (ordenActiva) {
      return itemsOrden.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
    }
    return carritoDirecto.reduce((acc, it) => acc + it.qty, 0);
  }, [ordenActiva, itemsOrden, carritoDirecto]);

  const totalMontoCarrito = useMemo(() => {
    if (ordenActiva) {
      return itemsOrden.reduce(
        (acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
        0
      );
    }
    return carritoDirecto.reduce((acc, it) => acc + it.price * it.qty, 0);
  }, [ordenActiva, itemsOrden, carritoDirecto]);

  // Viscosidades disponibles para filtro rápido de 1 toque
  const viscosidadesRapidas = useMemo(() => {
    if (schemaType === "aceites") {
      return (config?.oilConfig?.viscosities || config?.viscosities || []).filter((v) => v.active);
    }
    if (schemaType === "transmision") {
      return (config?.transmissionConfig?.viscosities || []).filter((v) => v.active);
    }
    return [];
  }, [config, schemaType]);

  const basesRapidas = useMemo(() => {
    if (schemaType === "aceites" && (subcategoriaActivaId === "ALL" || subSchemaType === "aceite_motor")) {
      return (config?.oilConfig?.bases || config?.bases || []).filter((b) => b.active);
    }
    return [];
  }, [config, schemaType, subcategoriaActivaId, subSchemaType]);

  if (!config) return null;

  return (
    <div className="w-full space-y-2.5 sm:space-y-3 animate-fade-in pb-4">
      {/* Banner de confirmación / error */}
      {bannerAviso && (
        <div
          className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 shadow-xs ${
            bannerAviso.tipo === "ok"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200"
              : "bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
          }`}
        >
          <span>{bannerAviso.texto}</span>
          <button
            type="button"
            onClick={() => setBannerAviso(null)}
            className="text-xs font-black px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* =====================================================================
          NIVEL 1: CATEGORÍAS PRINCIPALES (Deslizable en móvil, sin repetición)
          ===================================================================== */}
      <div className="flex overflow-x-auto sm:grid sm:grid-cols-6 gap-1.5 sm:gap-2 pb-1 sm:pb-0 no-scrollbar">
        <button
          type="button"
          onClick={() => handleCambiarCategoria("ALL")}
          className={`shrink-0 sm:shrink h-9 sm:h-10 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 ${
            categoriaActivaId === "ALL"
              ? "bg-blue-600 border-blue-500 text-white shadow-xs"
              : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
          }`}
        >
          <span className="text-sm leading-none shrink-0">✨</span>
          <span className="truncate">Todo</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              categoriaActivaId === "ALL"
                ? "bg-white/20 text-white"
                : "bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {productos.filter((p) => p.active !== false).length}
          </span>
        </button>

        {categoriasActivas.map((cat) => {
          const sel = categoriaActivaId === cat.id;
          const enPedido = conteoEnPedidoPorCategoria[cat.id] || 0;
          const totalCat = conteoProductosPorCategoria[cat.id] || 0;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCambiarCategoria(cat.id)}
              className={`shrink-0 sm:shrink h-9 sm:h-10 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 ${
                sel
                  ? "bg-blue-50/95 dark:bg-blue-500/20 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/40"
                  : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span className="text-base leading-none shrink-0">{cat.icon}</span>
              <span className="truncate">{cat.label}</span>
              {enPedido > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white shrink-0">
                  {enPedido}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold shrink-0">
                  {totalCat}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          NIVEL 2: SUBCATEGORÍAS DE LA CATEGORÍA ACTIVA (1 fila deslizable en móvil)
          ===================================================================== */}
      {categoriaActivaId !== "ALL" && subcategoriasActivas.length > 0 && (
        <div className="flex overflow-x-auto sm:flex-wrap items-center gap-1.5 w-full pb-1 sm:pb-0 no-scrollbar">
          <button
            type="button"
            onClick={() => handleCambiarSubcategoria("ALL")}
            className={`shrink-0 h-8 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
              subcategoriaActivaId === "ALL"
                ? "bg-blue-600 border-blue-500 text-white font-bold shadow-xs"
                : "bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <span>Todos</span>
            <span
              className={`text-[10px] px-1.5 rounded-full ${
                subcategoriaActivaId === "ALL"
                  ? "bg-white/20 text-white"
                  : "bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {conteoProductosPorCategoria[categoriaActivaId] || 0}
            </span>
          </button>

          {subcategoriasActivas.map((sub) => {
            const activa = subcategoriaActivaId === sub.id;
            const countSub = conteoProductosPorSubcategoria[sub.id] || 0;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => handleCambiarSubcategoria(sub.id)}
                className={`shrink-0 h-8 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  activa
                    ? "bg-blue-600 border-blue-500 text-white font-bold shadow-xs"
                    : "bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span className="text-sm leading-none shrink-0">{sub.icon}</span>
                <span className="truncate">{sub.label}</span>
                {countSub > 0 && (
                  <span
                    className={`text-[10px] px-1.5 rounded-full ${
                      activa
                        ? "bg-white/20 text-white"
                        : "bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400"
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
          TIENDA UNIFICADA Y AUTOMÁTICA (Muestra productos al instante sin escribir)
          ===================================================================== */}
      <div className="p-3 sm:p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3 shadow-2xs">
        {/* Barra superior: Buscador + Contador + Acciones rápidas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              placeholder={`Buscar en ${
                categoriaActivaId === "ALL"
                  ? "todo el lubricentro"
                  : subcategoriaSeleccionadaObj
                  ? `${categoriaSeleccionadaObj?.label} › ${subcategoriaSeleccionadaObj.label}`
                  : categoriaSeleccionadaObj?.label || "la tienda"
              } (ej. 10W-30, Mobil, W610, DOT 4)...`}
              className="w-full h-9 pl-8 pr-8 rounded-lg bg-zinc-50/80 dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
            />
            {busquedaTexto && (
              <button
                type="button"
                onClick={() => setBusquedaTexto("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              {productosFiltrados.length}{" "}
              {productosFiltrados.length === 1 ? "producto" : "productos"}
            </span>

            <div className="flex items-center gap-1.5">
              {totalUnidadesCarrito > 0 && (
                <button
                  type="button"
                  onClick={() => setDrawerCarritoAbierto(true)}
                  className="h-8 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <span>🛒</span>
                  <span>{totalUnidadesCarrito}</span>
                  <span className="font-mono">${totalMontoCarrito.toFixed(2)}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setProductoAEditar(null);
                  setModalProductoFormAbierto(true);
                }}
                className="h-8 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                title="Crear nuevo producto en catálogo"
              >
                <span>+</span>
                <span className="hidden xs:inline">Producto</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chips de filtro rápido de 1 toque: Viscosidad y Base (solo cuando aplica, deslizable en móvil) */}
        {categoriaActivaId !== "ALL" &&
          (viscosidadesRapidas.length > 0 || basesRapidas.length > 0) &&
          (schemaType === "transmision" ||
            subcategoriaActivaId === "ALL" ||
            subSchemaType === "aceite_motor") && (
            <div className="flex overflow-x-auto items-center gap-1.5 pt-0.5 pb-1 no-scrollbar border-t border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 shrink-0 mr-0.5">
                Viscosidad:
              </span>
              <button
                type="button"
                onClick={() => setFiltroViscosidad("")}
                className={`shrink-0 h-7 px-2 rounded-md border text-[11px] font-bold cursor-pointer transition-all ${
                  !filtroViscosidad
                    ? "bg-blue-50 dark:bg-blue-500/20 border-blue-400 text-blue-700 dark:text-blue-300"
                    : "bg-zinc-50 dark:bg-white/[0.03] border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Todas
              </button>
              {viscosidadesRapidas.map((v) => {
                const val = v.value || v.label;
                const act = filtroViscosidad.toUpperCase() === val.toUpperCase();
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setFiltroViscosidad(act ? "" : val)}
                    className={`shrink-0 h-7 px-2 rounded-md border text-[11px] font-mono font-bold cursor-pointer transition-all active:scale-95 ${
                      act
                        ? "bg-blue-600 border-blue-500 text-white shadow-2xs"
                        : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {v.label}
                  </button>
                );
              })}

              {basesRapidas.length > 0 && (
                <>
                  <span className="text-zinc-300 dark:text-white/15 mx-1 shrink-0">|</span>
                  {basesRapidas.map((b) => {
                    const val = b.value || b.label;
                    const act = filtroBase.toLowerCase() === val.toLowerCase();
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setFiltroBase(act ? "" : val)}
                        className={`shrink-0 h-7 px-2 rounded-md border text-[11px] font-semibold cursor-pointer transition-all active:scale-95 ${
                          act
                            ? "bg-amber-500 border-amber-500 text-white font-bold shadow-2xs"
                            : "bg-zinc-50 hover:bg-zinc-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}

        {/* Chips de filtros activos con botón de limpieza rápida */}
        {chipsFiltrosActivos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {chipsFiltrosActivos.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-[11px] font-semibold text-blue-700 dark:text-blue-300"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onClear}
                  className="hover:text-rose-500 font-bold pl-0.5 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={limpiarTodosLosFiltros}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline px-1.5 cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Grid de productos automático, intuitivo y táctil para móvil y escritorio */}
        {productosFiltrados.length === 0 ? (
          <div className="p-6 rounded-xl bg-zinc-50/70 dark:bg-white/[0.01] border border-dashed border-zinc-200 dark:border-white/10 text-center space-y-2 text-zinc-400">
            <span className="text-2xl block">🔍</span>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              No hay productos con este filtro en la vista actual.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {chipsFiltrosActivos.length > 0 && (
                <button
                  type="button"
                  onClick={limpiarTodosLosFiltros}
                  className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Quitar filtros
                </button>
              )}
              {categoriaActivaId !== "ALL" && (
                <button
                  type="button"
                  onClick={() => handleCambiarCategoria("ALL")}
                  className="h-8 px-3 rounded-lg bg-zinc-200/80 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-bold cursor-pointer"
                >
                  Ver todo el catálogo
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {productosFiltrados.map((prod) => {
              const { presentation, price, variantes } = obtenerPresentacionYPrecio(prod);
              const qtyEnPedido = obtenerCantidadEnPedido(prod, presentation);
              const estaEnPedido = qtyEnPedido > 0;

              return (
                <div
                  key={prod.id}
                  className={`p-2.5 sm:p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all shadow-2xs ${
                    estaEnPedido
                      ? "bg-emerald-50/40 dark:bg-emerald-500/[0.08] border-emerald-400 dark:border-emerald-500/50 ring-1 ring-emerald-400/30"
                      : "bg-white dark:bg-white/[0.02] hover:border-blue-400/60 dark:hover:border-blue-500/40 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  {/* Fila superior de tarjeta (compacta en móvil: imagen + info clave) */}
                  <div className="flex items-start gap-2.5">
                    <div
                      onClick={() => setProductoDetalleModal(prod)}
                      className="w-14 h-16 sm:w-16 sm:h-18 rounded-lg bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/5 flex items-center justify-center p-1.5 shrink-0 overflow-hidden cursor-pointer"
                      title="Ver ficha técnica"
                    >
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl">
                          {categoriasActivas.find((c) => c.id === prod.lubCategoryId)?.icon || "🛢️"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 truncate">
                          {prod.brand || "Lubricentro"}
                        </span>
                        {estaEnPedido && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500 text-white shrink-0">
                            ✓ {qtyEnPedido} en pedido
                          </span>
                        )}
                      </div>

                      <h4
                        onClick={() => setProductoDetalleModal(prod)}
                        className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {prod.name}
                      </h4>

                      {/* Badges rápidos de viscosidad / base / referencia */}
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        {prod.viscosity && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-white/10 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">
                            {prod.viscosity}
                          </span>
                        )}
                        {prod.lubricantBase && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-500/15 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            {prod.lubricantBase}
                          </span>
                        )}
                        {prod.fluidClass && (
                          <span className="px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-500/15 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                            {prod.fluidClass}
                          </span>
                        )}
                        {prod.capacityAh && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-500/15 text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                            {prod.capacityAh}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Selector de presentación en 1 toque (si tiene variantes) o etiqueta directa */}
                  {variantes.length > 1 ? (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {variantes.map((v) => {
                        const selVar = presentation === v.label;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              setPresPorProducto((prev) => ({ ...prev, [prod.id]: v.id }))
                            }
                            className={`flex-1 min-w-[70px] h-6 px-2 rounded-md border text-[10px] font-bold cursor-pointer transition-all ${
                              selVar
                                ? "bg-blue-600 border-blue-500 text-white"
                                : "bg-zinc-50 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300"
                            }`}
                          >
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {/* Pie de tarjeta: Precio + Presentación + Botón / Stepper automático (- qty +) */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 block leading-none">
                        ${price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block mt-0.5">
                        {presentation}
                      </span>
                    </div>

                    {estaEnPedido ? (
                      <div className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-400/50 rounded-lg p-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={agregandoId === prod.id}
                          onClick={() =>
                            void handleAjustarCantidadProducto(prod, -1, presentation, price)
                          }
                          className="w-7 h-7 rounded-md bg-white dark:bg-black/40 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-zinc-800 dark:text-white font-black text-xs flex items-center justify-center cursor-pointer active:scale-90 transition-all"
                          title="Restar 1"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-extrabold text-emerald-800 dark:text-emerald-200">
                          {qtyEnPedido}
                        </span>
                        <button
                          type="button"
                          disabled={agregandoId === prod.id}
                          onClick={() =>
                            void handleAjustarCantidadProducto(prod, 1, presentation, price)
                          }
                          className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center cursor-pointer active:scale-90 transition-all"
                          title="Sumar 1"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={agregandoId === prod.id}
                        onClick={() =>
                          void handleAjustarCantidadProducto(prod, 1, presentation, price)
                        }
                        className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-50"
                      >
                        <span>+</span>
                        <span>{agregandoId === prod.id ? "..." : "Agregar"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra inferior fija/flotante en móvil cuando hay productos seleccionados o botón directo */}
      <div className="sticky bottom-2 z-30 flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border border-zinc-200 dark:border-white/15 shadow-lg">
        <div
          onClick={() => setDrawerCarritoAbierto(true)}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-sm shrink-0">
            🛒
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-zinc-900 dark:text-white block truncate">
              {totalUnidadesCarrito > 0
                ? `${totalUnidadesCarrito} ${
                    totalUnidadesCarrito === 1 ? "producto seleccionado" : "productos seleccionados"
                  }`
                : "Ningún producto seleccionado"}
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
              Total: ${totalMontoCarrito.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {totalUnidadesCarrito > 0 && (
            <button
              type="button"
              onClick={() => setDrawerCarritoAbierto(true)}
              className="h-9 px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs font-bold cursor-pointer active:scale-95 transition-all"
            >
              Ver detalle
            </button>
          )}
          <button
            type="button"
            onClick={onIrAAvisoYFirma}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            Siguiente (Aviso y Firma) →
          </button>
        </div>
      </div>

      {/* =====================================================================
          DRAWER / MODAL DE CARRITO DE LUBRICENTRO Y ORDEN ACTIVA
          ===================================================================== */}
      {drawerCarritoAbierto && (
        <div
          onClick={() => setDrawerCarritoAbierto(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-white dark:bg-[#111113] text-zinc-900 dark:text-zinc-100 border-l border-zinc-200 dark:border-white/10 p-5 flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-bold">🛒 Carrito de Lubricentro</h3>
                  <p className="text-xs text-zinc-500">
                    {ordenActiva?.id
                      ? `Sincronizado con Orden Activa #${ordenActiva.orderNumber || ordenActiva.plate}`
                      : "Venta directa hacia Caja POS"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerCarritoAbierto(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/5 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Si hay orden activa, muestra los ítems de la orden */}
              {ordenActiva?.id ? (
                <div className="space-y-2.5">
                  {itemsOrden.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-6 text-center">
                      No hay productos en la orden activa todavía.
                    </p>
                  ) : (
                    itemsOrden.map((it) => (
                      <div
                        key={it.id}
                        className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">
                            {it.name}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {it.qty || 1} x ${Number(it.price || 0).toFixed(2)} ={" "}
                            <strong className="text-zinc-900 dark:text-white">
                              ${((Number(it.qty) || 1) * Number(it.price || 0)).toFixed(2)}
                            </strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onActualizarItemsOrden(
                              itemsOrden.filter((x) => x.id !== it.id)
                            )
                          }
                          className="text-rose-600 text-xs font-bold px-2 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {carritoDirecto.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic py-6 text-center">
                      El carrito está vacío. Selecciona productos del catálogo.
                    </p>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={clienteVentaDirecta}
                        onChange={(e) => setClienteVentaDirecta(e.target.value)}
                        placeholder="Nombre del cliente (opcional)..."
                        className="w-full h-9 px-3 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 text-xs"
                      />
                      {carritoDirecto.map((c) => (
                        <div
                          key={c.key}
                          className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate">
                              {c.name} ({c.presentation})
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500">
                              {c.qty} x ${c.price.toFixed(2)} ={" "}
                              <strong className="text-zinc-900 dark:text-white">
                                ${(c.qty * c.price).toFixed(2)}
                              </strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setCarritoDirecto((prev) =>
                                prev.filter((x) => x.key !== c.key)
                              )
                            }
                            className="text-rose-600 text-xs font-bold px-2 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-white/10 space-y-3">
              {ordenActiva?.id ? (
                <>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>Subtotal Orden:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      $
                      {itemsOrden
                        .reduce(
                          (acc, it) =>
                            acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerCarritoAbierto(false);
                      onIrAAvisoYFirma();
                    }}
                    className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Ir a Aviso, Firma y Enviar a POS →
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>Total Carrito:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      ${totalMontoCarrito.toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={carritoDirecto.length === 0 || enviandoPedidoPos}
                    onClick={handleEnviarCarritoDirectoAPos}
                    className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-300 text-white text-xs font-bold cursor-pointer"
                  >
                    {enviandoPedidoPos
                      ? "Validando stock y enviando a POS..."
                      : "💳 Enviar Pedido a Caja POS"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODALES DE DETALLE, CREACIÓN/EDICIÓN DE PRODUCTO Y CONFIGURACIÓN MANUAL
          ===================================================================== */}
      {productoDetalleModal && (
        <ModalDetalleProductoLubricentro
          producto={productoDetalleModal}
          config={config}
          onClose={() => setProductoDetalleModal(null)}
          onEditar={(prod) => {
            setProductoAEditar(prod);
            setModalProductoFormAbierto(true);
          }}
          onAgregarAlCarrito={(prod, qty, presId) => {
            void handleValidarYAgregarAlCarrito(prod, qty, presId);
          }}
        />
      )}

      {modalProductoFormAbierto && (
        <ModalProductoLubricentroForm
          productoEditar={productoAEditar}
          config={config}
          defaultCategoryId={categoriaSeleccionadaObj?.id || "lub_aceite"}
          defaultSubcategoryId={subcategoriaActivaId || "lub_aceite_motor"}
          onClose={() => {
            setModalProductoFormAbierto(false);
            setProductoAEditar(null);
          }}
          onGuardado={(_prod, msg) => {
            notificar(msg, "ok");
            void cargarDatosLubricentro();
          }}
          onConfigActualizada={(nuevaConfig) => setConfig(nuevaConfig)}
        />
      )}

      {modalConfigAbierto && (
        <ModalConfiguracionManualLubricentro
          config={config}
          tabInicial={tabConfigInicial}
          onClose={() => setModalConfigAbierto(false)}
          onConfigGuardada={(nuevaConfig, msg) => {
            setConfig(nuevaConfig);
            notificar(msg, "ok");
            void cargarDatosLubricentro();
          }}
        />
      )}
    </div>
  );
}
