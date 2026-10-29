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
} from "./lubricentroDefaults";

export interface ModuloLubricentroCatalogoProps {
  empleadoLogueado: { id: string; nombre: string };
  ordenActiva?: any;
  ordenesAnteriores?: any[];
  historialAnterior?: any[];
  itemsOrden: any[];
  onActualizarItemsOrden: (nuevosItems: any[]) => Promise<void>;
  onIrAAvisoYFirma: () => void;
  onIrASiguiente?: () => void;
  nombreSiguiente?: string;
  mostrarToast?: (msg: string, tipo?: "ok" | "err") => void;
  triggerAbrirConfig?: number;
  onGuardarDatosLubricentro?: (
    niveles: Record<string, EstadoNivelLubricentro>,
    nextOilChangeKm: number | null,
    items: any[]
  ) => Promise<void>;
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

interface ProductoCatalogoLubricentro {
  id: string;
  code?: string;
  name?: string;
  brand?: string;
  type?: string;
  active?: boolean;
  status?: string;
  stock?: number | null;
  price?: number;
  presentation?: string;
  unitOfMeasure?: string;
  imageUrl?: string | null;
  lubCategoryId?: string;
  lubSubcategoryId?: string;
  presentationsAvailable?: LubPresentationVariant[];
  compatibilities?: LubVehicleCompatibility[];
  lubricantBase?: string;
}

interface ItemAnteriorCambioAceite {
  item: {
    type?: string;
    productId?: string;
    presentation?: string;
    presentationId?: string;
    name?: string;
    qty?: number;
    price?: number;
    category?: string;
    brand?: string;
    code?: string;
    unitOfMeasure?: string;
    subCategory?: string;
  };
  product: ProductoCatalogoLubricentro;
}

type EstadoNivelLubricentro = "Verde" | "Amarillo" | "Rojo";
type EstadoComponenteLubricentro = "Pendiente" | "Realizado";

const NIVELES_LUBRICENTRO = [
  { label: "Refrigerante", categoryId: "lub_fluidos", subcategoryId: "lub_flu_coolant" },
  { label: "Frenos", categoryId: "lub_fluidos", subcategoryId: "lub_flu_frenos" },
  { label: "Dirección", categoryId: "lub_fluidos", subcategoryId: "lub_flu_hidraulico" },
  { label: "Aire", categoryId: "lub_filtros", subcategoryId: "lub_fil_aire" },
  { label: "Cabina", categoryId: "lub_filtros", subcategoryId: "lub_fil_cabina" },
  { label: "Corona", categoryId: "lub_transmision", subcategoryId: "lub_trans_diferencial" },
  { label: "Batería", categoryId: "lub_baterias", subcategoryId: null },
] as const;

const COMPONENTES_SERVICIO_LUBRICENTRO = [
  "Aceite motor",
  "Filtro aceite",
  "Filtro aire",
  "Filtro cabina",
  "Filtro combustible",
  "Caja",
  "Corona",
  "Refrigerante",
  "Frenos",
  "Dirección",
  "Batería",
] as const;

const COMBOS_LUBRICENTRO = ["Básico", "Completo", "Caja", "Corona", "Engrase"] as const;

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
  lub_trans_manual: "Caja",
  lub_trans_diferencial: "Corona",
  lub_fil_aceite: "Aceite",
  lub_fil_aire: "Aire",
  lub_fil_cabina: "Cabina",
  lub_fil_transmision: "Caja",
  lub_flu_hidraulico: "Dirección",
  lub_flu_limpiaparabrisas: "Agua",
  lub_bat_convencionales: "Liviano",
  lub_bat_agm: "Pesado",
  lub_bat_motos: "Liviano",
  lub_bat_efb: "Pesado",
};

const SUBCATEGORY_IDS_BY_CATEGORY: Record<string, string[]> = {
  lub_aceite: ["lub_aceite_motor", "lub_aditivos", "lub_flush", "lub_grasa"],
  lub_transmision: ["lub_trans_manual", "lub_trans_diferencial", "lub_trans_automatica"],
  lub_filtros: [
    "lub_fil_aceite",
    "lub_fil_aire",
    "lub_fil_cabina",
    "lub_fil_combustible",
    "lub_fil_transmision",
  ],
  lub_fluidos: [
    "lub_flu_coolant",
    "lub_flu_frenos",
    "lub_flu_hidraulico",
    "lub_flu_limpiaparabrisas",
  ],
  lub_baterias: ["lub_bat_convencionales", "lub_bat_agm"],
};

const SUBCATEGORY_FILTER_IDS: Record<string, string[]> = {
  lub_bat_convencionales: ["lub_bat_convencionales", "lub_bat_motos"],
  lub_bat_agm: ["lub_bat_agm", "lub_bat_efb"],
};

const ENVASES_CERRADOS = ["Galón", "Litro", "Cuarto", "Caneca"] as const;
type EnvaseCerrado = (typeof ENVASES_CERRADOS)[number];

function clasificarEnvase(value: unknown): EnvaseCerrado | null {
  const texto = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/caneca|5\s*(gal|gallon)/.test(texto)) return "Caneca";
  if (/cuarto|\bqt\b/.test(texto)) return "Cuarto";
  if (/galon|\bgal\b|4\s*l(?:itro)?/.test(texto)) return "Galón";
  if (/litro|\b1\s*l\b|1000\s*ml/.test(texto)) return "Litro";
  return null;
}

function productoTieneEnvase(prod: any, envase: EnvaseCerrado): boolean {
  const presentaciones = [
    prod.presentation,
    prod.unitOfMeasure,
    ...(Array.isArray(prod.presentationsAvailable)
      ? prod.presentationsAvailable.flatMap((variant: LubPresentationVariant) => [
          variant.label,
          variant.unitOfMeasure,
        ])
      : []),
  ];
  return presentaciones.some((value) => clasificarEnvase(value) === envase);
}

const LEGACY_PRODUCT_REMAP: Record<string, { catId: string; subId: string }> = {
  lub_valvulina: { catId: "lub_transmision", subId: "lub_trans_manual" },
  lub_hidraulico_aceite: { catId: "lub_fluidos", subId: "lub_flu_hidraulico" },
  lub_frenos_aceite: { catId: "lub_fluidos", subId: "lub_flu_frenos" },
  lub_refrigerante_aceite: { catId: "lub_fluidos", subId: "lub_flu_coolant" },
  lub_limpieza_combustible: { catId: "lub_aceite", subId: "lub_aditivos" },
};

function normalizarConfigCliente(rawConfig: any): LubricentroConfigData {
  if (!rawConfig) rawConfig = DEFAULT_LUBRICENTRO_CONFIG_CLIENT;
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
  const baseList = Array.isArray(rawProducts) ? rawProducts : [];
  return baseList.map((p: any) => {
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

function formatearKilometraje(kilometraje: number): string {
  return String(Math.trunc(kilometraje)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function ModuloLubricentroCatalogo({
  empleadoLogueado,
  ordenActiva,
  ordenesAnteriores = [],
  historialAnterior = [],
  itemsOrden,
  onActualizarItemsOrden,
  onIrAAvisoYFirma,
  onIrASiguiente,
  nombreSiguiente,
  mostrarToast,
  triggerAbrirConfig,
  onGuardarDatosLubricentro,
}: ModuloLubricentroCatalogoProps) {
  // Inicializar y sincronizar desde Neon PostgreSQL
  const [config, setConfig] = useState<LubricentroConfigData>(() =>
    normalizarConfigCliente(null)
  );
  const [productos, setProductos] = useState<any[]>([]);
  const [vehiculosRegistrados, setVehiculosRegistrados] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [bannerAviso, setBannerAviso] = useState<{
    texto: string;
    tipo: "ok" | "err";
  } | null>(null);

  // Selección de Categoría (Fila 1: "ALL" o id de categoría) y Subcategoría (Fila 2: "ALL" o id de subcategoría)
  const [categoriaActivaId, setCategoriaActivaId] = useState<string>("lub_aceite");
  const [mostrarCategorias, setMostrarCategorias] = useState(true);
  const [mostrarSubcategorias, setMostrarSubcategorias] = useState(true);
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
  const [filtroEnvase, setFiltroEnvase] = useState<EnvaseCerrado | "">("");
  const [menuEnvaseAbierto, setMenuEnvaseAbierto] = useState(false);
  const menuEnvaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !menuFiltroRef.current?.contains(target) &&
        !menuEnvaseRef.current?.contains(target)
      ) {
        setMenuFiltroAbierto(false);
        setMenuEnvaseAbierto(false);
      }
    };
    if (menuFiltroAbierto || menuEnvaseAbierto) {
      document.addEventListener("mousedown", handleClickAfuera);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickAfuera);
    };
  }, [menuFiltroAbierto, menuEnvaseAbierto]);

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
  const [drawerTiendaAbierto, setDrawerTiendaAbierto] = useState(false);
  const [pestanaTienda, setPestanaTienda] = useState<"productos" | "servicios">("productos");
  const [enviandoPedidoPos, setEnviandoPedidoPos] = useState<boolean>(false);
  const [clienteVentaDirecta, setClienteVentaDirecta] = useState<string>("");
  const [kilometrajeIngreso, setKilometrajeIngreso] = useState(() =>
    String(ordenActiva?.mileage || "")
  );
  const [fechaReferenciaHistorial, setFechaReferenciaHistorial] = useState<number | null>(null);
  const [mostrarNivelesLubricentro, setMostrarNivelesLubricentro] = useState(false);
  const [mostrarCombosLubricentro, setMostrarCombosLubricentro] = useState(false);
  const [nivelesLubricentro, setNivelesLubricentro] = useState<
    Record<string, EstadoNivelLubricentro>
  >({});
  const [componentesLubricentro, setComponentesLubricentro] = useState<
    Record<string, EstadoComponenteLubricentro>
  >({});
  const [proximoCambioKm, setProximoCambioKm] = useState<number | null>(() =>
    Number(ordenActiva?.nextOilChangeKm) || null
  );
  const [guardandoSeguimiento, setGuardandoSeguimiento] = useState(false);
  const [repitiendoCambioAceite, setRepitiendoCambioAceite] = useState(false);

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

  // Cargar configuración real y productos de Neon PostgreSQL
  const cargarDatosLubricentro = async () => {
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
        setConfig(cleanConfig);
        setProductos(cleanProducts);
        setVehiculosRegistrados(Array.isArray(data.vehicles) ? data.vehicles : []);
      }
    } catch (err) {
      console.error("Error cargando Lubricentro desde Neon:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarDatosLubricentro();
    const handleCatalogoActualizado = () => {
      void cargarDatosLubricentro();
    };
    window.addEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    return () => {
      window.removeEventListener("taller-catalogo-actualizado", handleCatalogoActualizado);
    };
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
    const idsPermitidos = SUBCATEGORY_IDS_BY_CATEGORY[categoriaSeleccionadaObj.id];
    return [...config.subcategories]
      .filter(
        (s) =>
          s.categoryId === categoriaSeleccionadaObj.id &&
          s.active &&
          (!idsPermitidos || idsPermitidos.includes(s.id))
      )
      .sort((a, b) => {
        if (!idsPermitidos) return a.order - b.order;
        return idsPermitidos.indexOf(a.id) - idsPermitidos.indexOf(b.id);
      });
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

  useEffect(() => {
    const savedLevels = ordenActiva?.inspectionChecklist?.lubricentroLevels;
    const validLevels: Record<string, EstadoNivelLubricentro> = {};
    if (savedLevels && typeof savedLevels === "object") {
      NIVELES_LUBRICENTRO.forEach(({ label }) => {
        const status = savedLevels[label];
        if (status === "Verde" || status === "Amarillo" || status === "Rojo") {
          validLevels[label] = status;
        }
      });
    }
    setNivelesLubricentro(validLevels);
    const savedComponents = ordenActiva?.inspectionChecklist?.lubricentroComponents;
    const validComponents: Record<string, EstadoComponenteLubricentro> = {};
    if (savedComponents && typeof savedComponents === "object") {
      COMPONENTES_SERVICIO_LUBRICENTRO.forEach((label) => {
        const status = savedComponents[label];
        if (status === "Pendiente" || status === "Realizado") {
          validComponents[label] = status;
        }
      });
    }
    setComponentesLubricentro(validComponents);
    setKilometrajeIngreso(String(ordenActiva?.mileage || ""));
    setProximoCambioKm(Number(ordenActiva?.nextOilChangeKm) || null);
  }, [ordenActiva?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFechaReferenciaHistorial(Date.now());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const schemaType = categoriaSeleccionadaObj?.schemaType || "aceites";
  const subSchemaType = subcategoriaSeleccionadaObj?.subSchemaType || "aceite_motor";

  // Limpiar filtros incompatibles al cambiar de categoría o subcategoría
  const handleCambiarCategoria = (catId: string) => {
    setCategoriaActivaId(catId);
    setMostrarCategorias(false);
    setMostrarSubcategorias(true);
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
    setMostrarSubcategorias(false);
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
      if (pestanaTienda === "servicios") {
        if (p.type !== "SERVICE" || p.active === false || p.status === "Inactivo") return false;
        const price = Number(p.price || 0);
        if (precioMin.trim() && !Number.isNaN(Number(precioMin)) && price < Number(precioMin)) {
          return false;
        }
        if (precioMax.trim() && !Number.isNaN(Number(precioMax)) && price > Number(precioMax)) {
          return false;
        }
        const terms = busquedaTexto
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        const text = [p.name, p.code, p.description, p.brand]
          .map((value) => String(value || ""))
          .join(" ")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        return terms.every((term) => text.includes(term));
      }

      if (p.type === "SERVICE") return false;

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
          !(SUBCATEGORY_FILTER_IDS[subcategoriaActivaId] || [subcategoriaActivaId]).includes(
            p.lubSubcategoryId
          )
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

      if (filtroEnvase && !productoTieneEnvase(p, filtroEnvase)) return false;

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
    filtroEnvase,
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
    pestanaTienda,
  ]);

  const productosTiendaFiltrados = productosFiltrados;

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
    if (filtroEnvase) {
      chips.push({
        key: "envase",
        label: `Envase: ${filtroEnvase}`,
        onClear: () => setFiltroEnvase(""),
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
    filtroEnvase,
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
        Object.entries(SUBCATEGORY_FILTER_IDS).forEach(([canonicalId, sourceIds]) => {
          if (p.lubSubcategoryId !== canonicalId && sourceIds.includes(p.lubSubcategoryId)) {
            map[canonicalId] = (map[canonicalId] || 0) + 1;
          }
        });
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
    const varianteEnvase = filtroEnvase
      ? variantes.find(
          (variant) =>
            clasificarEnvase(variant.label) === filtroEnvase ||
            clasificarEnvase(variant.unitOfMeasure) === filtroEnvase
        )
      : undefined;
    const varianteGuardada = presElegidaId
      ? variantes.find((v) => v.id === presElegidaId || v.label === presElegidaId)
      : undefined;
    const varianteActiva = varianteEnvase || varianteGuardada || variantes[0];

    const presentation =
      varianteActiva?.label || prod.presentation || prod.unitOfMeasure || "1 Unidad";
    const price = Number(varianteActiva?.price ?? prod.price ?? 0);
    const unitOfMeasure = varianteActiva?.unitOfMeasure || prod.unitOfMeasure || "Unidad";

    return { presentation, price, unitOfMeasure, variantes };
  };

  const obtenerPalabraClaveProducto = (prod: any): string => {
    const viscosidad = String(prod.viscosity || "").trim();
    const claseFluido = String(prod.fluidClass || "").trim();
    const claseDot = claseFluido.match(/\bDOT\s*\d+\b/i)?.[0].replace(/\s+/g, "");
    const proporcionFluido = claseFluido.match(/\b\d+\s*\/\s*\d+\b/)?.[0];
    const categoriaId = String(prod.lubCategoryId || categoriaActivaId);
    const subcategoriaId = String(prod.lubSubcategoryId || "");
    const palabrasClave = [
      viscosidad,
      claseDot || proporcionFluido || claseFluido.split(/\s+/)[0],
      categoriaId === "lub_filtros" || subcategoriaId.startsWith("lub_fil")
        ? "Filtro"
        : String(prod.filterType || "").split(/\s+/)[0],
      String(prod.capacityAh || "").split(/[ /]+/)[0],
      String(prod.voltage || "").split(/\s+/)[0],
      String(prod.additiveProductType || "").split(/\s+/)[0],
      String(prod.greaseType || "").split(/\s+/)[0],
      String(prod.technology || "").split(/\s+/)[0],
      String(prod.name || "").trim().split(/\s+/)[0],
    ];

    return palabrasClave.find((palabra) => palabra.length > 0) || "Producto";
  };

  // Cantidad actual de un producto (y su presentación activa) en la Orden o Carrito
  const obtenerCantidadEnPedido = (prod: any, presentation: string): number => {
    if (ordenActiva) {
      const matches = itemsOrden.filter(
        (it) =>
          (it.productId === prod.id ||
            it.id === prod.id ||
            it.id?.startsWith?.(`it_${prod.id}_`) ||
            (it.code && prod.code && it.code === prod.code)) &&
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
            (it.productId === prod.id ||
              it.id === prod.id ||
              it.id?.startsWith?.(`it_${prod.id}_`) ||
              (it.code && prod.code && it.code === prod.code)) &&
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

  // Ítems de Lubricentro en la orden activa
  const itemsLubricentroEnOrden = useMemo(() => {
    return (itemsOrden || []).filter((it) => {
      const cat = String(it.category || "").toLowerCase();
      const idStr = String(it.id || "");
      const code = String(it.code || "");
      return (
        cat.includes("lubricentro") ||
        idStr.startsWith("lub-") ||
        idStr.startsWith("it_lub") ||
        code.startsWith("LUB-") ||
        productos.some((p) => p.id === it.productId || (p.code && p.code === code))
      );
    });
  }, [itemsOrden, productos]);

  const ultimoCambioAceiteAnterior = useMemo(() => {
    if (!ordenActiva?.id || !ordenActiva?.plate) return null;
    const placaActiva = String(ordenActiva.plate).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const ordenesOrdenadas = [...ordenesAnteriores]
      .filter(
        (order) =>
          order?.id !== ordenActiva.id &&
          String(order?.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === placaActiva
      )
      .sort(
        (a, b) =>
          new Date(b.dateIn || b.createdAt || 0).getTime() -
          new Date(a.dateIn || a.createdAt || 0).getTime()
      );

    const normalizarNombre = (name: unknown) =>
      String(name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/^\s*\d+\s*x\s*/i, "")
        .trim();
    const encontrarProducto = (item: any) => {
      const historicalName = normalizarNombre(item.name);
      return productos.find(
        (product) =>
          product.id === item.productId ||
          (product.code && item.code && product.code === item.code) ||
          (historicalName &&
            [normalizarNombre(product.name), normalizarNombre(item.presentation)].some(
              (name) =>
                name &&
                (historicalName === name ||
                  historicalName.startsWith(`${name} (`) ||
                  historicalName.startsWith(`${name} `))
            ))
      );
    };
    const esProductoAceite = (item: any, product: any) => {
      if (
        product?.lubCategoryId === "lub_aceite" &&
        product?.lubSubcategoryId === "lub_aceite_motor"
      ) {
        return true;
      }
      const itemName = normalizarNombre(item.name);
      const itemCategory = normalizarNombre(item.category);
      return (
        (itemCategory.includes("lubricentro") || itemCategory.includes("aceite")) &&
        (/\baceite\b|\boil\b/.test(itemName) || /\b\d{1,2}w-\d{2}\b/i.test(itemName))
      );
    };
    const esFiltroAceite = (_item: unknown, product: ProductoCatalogoLubricentro) =>
      product?.lubCategoryId === "lub_filtros" &&
      product?.lubSubcategoryId === "lub_fil_aceite";
    const esProductoLubricentro = (item: any, product: any) =>
      Boolean(
        product?.lubCategoryId ||
          String(item.category || "").toLowerCase().includes("lubricentro") ||
          String(item.id || "").startsWith("lub-") ||
          String(item.id || "").startsWith("it_lub") ||
          String(item.code || "").startsWith("LUB-")
      );

    const pedidosAnteriores: Array<{
      order: any;
      products: Array<{ item: any; product: any }>;
    }> = ordenesOrdenadas.map((order) => ({
      order,
      products: (Array.isArray(order.items) ? order.items : [])
        .map((item: any) => ({ item, product: encontrarProducto(item) || item }))
        .filter((entry: { item: any; product: any }) =>
          esProductoLubricentro(entry.item, entry.product)
        ),
    }));

    const historialOrdenado: Array<{
      order: any;
      products: Array<{ item: any; product: any }>;
    }> = [...historialAnterior]
      .filter(
        (entry) =>
          String(entry?.plate || "").toUpperCase().replace(/[^A-Z0-9]/g, "") === placaActiva
      )
      .sort(
        (a, b) =>
          new Date(b.date || b.createdAt || 0).getTime() -
          new Date(a.date || a.createdAt || 0).getTime()
      )
      .map((entry) => ({
        order: entry,
        products: (Array.isArray(entry.services) ? entry.services : [])
          .map((service: any) => {
            const item =
              typeof service === "string" ? { name: service, category: "Lubricentro" } : service;
            return { item, product: encontrarProducto(item) };
          })
          .filter((entry: { item: any; product: any }) =>
            entry.product && esProductoLubricentro(entry.item, entry.product)
          ),
      }));

    const cambiosAnteriores = [...pedidosAnteriores, ...historialOrdenado].sort(
      (a, b) =>
        new Date(b.order.dateIn || b.order.date || b.order.createdAt || 0).getTime() -
        new Date(a.order.dateIn || a.order.date || a.order.createdAt || 0).getTime()
    );

    for (const cambio of cambiosAnteriores) {
      const catalogItems = cambio.products;
      const includesEngineOil = catalogItems.some(({ item, product }) =>
        esProductoAceite(item, product)
      );
      if (!includesEngineOil) continue;

      const productsToRepeat = catalogItems.filter(
        ({ item, product }) =>
          item.type !== "SERVICE" &&
          (esProductoAceite(item, product) || esFiltroAceite(item, product)) &&
          (product?.id || item.productId || item.code)
      );
      if (productsToRepeat.length > 0) {
        return { order: cambio.order, products: productsToRepeat };
      }
    }

    return null;
  }, [ordenActiva?.id, ordenActiva?.plate, ordenesAnteriores, historialAnterior, productos]);

  const intervaloAceiteEnCarrito = useMemo(() => {
    const items = ordenActiva?.id ? itemsLubricentroEnOrden : carritoDirecto;
    for (const item of items) {
      const prod = productos.find(
        (candidate) =>
          candidate.id === item.productId ||
          (candidate.code && item.code && candidate.code === item.code)
      );
      if (
        !prod ||
        prod.lubCategoryId !== "lub_aceite" ||
        prod.lubSubcategoryId !== "lub_aceite_motor"
      ) {
        continue;
      }

      const base = String(prod.lubricantBase || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[\s-]/g, "");
      if (base.includes("semisintetico")) return 5000;
      if (base.includes("sintetico")) return 10000;
      if (base.includes("mineral")) return 5000;
    }
    return null;
  }, [ordenActiva?.id, itemsLubricentroEnOrden, carritoDirecto, productos]);

  useEffect(() => {
    const mileage = parseInt(String(kilometrajeIngreso || "").replace(/[^0-9]/g, ""), 10);
    if (mileage > 0 && intervaloAceiteEnCarrito) {
      setProximoCambioKm(mileage + intervaloAceiteEnCarrito);
    } else {
      setProximoCambioKm(Number(ordenActiva?.nextOilChangeKm) || null);
    }
  }, [
    ordenActiva?.id,
    ordenActiva?.mileage,
    ordenActiva?.nextOilChangeKm,
    kilometrajeIngreso,
    intervaloAceiteEnCarrito,
  ]);

  const totalUnidadesCarrito = useMemo(() => {
    if (ordenActiva) {
      return itemsLubricentroEnOrden.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
    }
    return carritoDirecto.reduce((acc, it) => acc + it.qty, 0);
  }, [ordenActiva, itemsLubricentroEnOrden, carritoDirecto]);

  const handleFiltrarNivelRojo = (categoryId: string, subcategoryId: string | null) => {
    handleCambiarCategoria(categoryId);
    setSubcategoriaPorCat((prev) => ({
      ...prev,
      [categoryId]: subcategoryId || "ALL",
    }));
    setMostrarSubcategorias(false);
  };

  const handleCiclarNivelLubricentro = (label: string) => {
    const niveles: Record<EstadoNivelLubricentro, EstadoNivelLubricentro> = {
      Verde: "Amarillo",
      Amarillo: "Rojo",
      Rojo: "Verde",
    };
    const estadoActual = nivelesLubricentro[label];
    const siguiente = estadoActual ? niveles[estadoActual] : "Verde";
    setNivelesLubricentro((prev) => ({ ...prev, [label]: siguiente }));

    if (siguiente === "Rojo") {
      const nivel = NIVELES_LUBRICENTRO.find((item) => item.label === label);
      if (nivel) handleFiltrarNivelRojo(nivel.categoryId, nivel.subcategoryId);
    }
  };

  const handleSeleccionarComboLubricentro = async (
    combo: (typeof COMBOS_LUBRICENTRO)[number]
  ) => {
    setMostrarCombosLubricentro(false);
    const disponibles: ProductoCatalogoLubricentro[] = productos.filter(
      (product: ProductoCatalogoLubricentro) =>
        product.active !== false && product.status !== "Inactivo"
    );
    const seleccionados: ProductoCatalogoLubricentro[] = [];
    const agregarPrimero = (
      coincide: (product: ProductoCatalogoLubricentro) => boolean
    ) => {
      const candidatos = disponibles.filter(coincide);
      if (candidatos.length === 0) return;
      const compatible = candidatos.find(
        (product) => evaluarCompatibilidadVehiculo(product).compatibleVerificado
      );
      seleccionados.push(compatible || candidatos[0]);
    };
    const esAceiteMotor = (product: ProductoCatalogoLubricentro) =>
      product.lubCategoryId === "lub_aceite" &&
      product.lubSubcategoryId === "lub_aceite_motor";
    const esFiltro = (subcategoryId: string) =>
      (product: ProductoCatalogoLubricentro) =>
        product.lubCategoryId === "lub_filtros" &&
        product.lubSubcategoryId === subcategoryId;
    const esAceiteDeTransmision = (product: ProductoCatalogoLubricentro) =>
      product.lubCategoryId === "lub_transmision" &&
      product.lubSubcategoryId !== "lub_trans_diferencial";
    const normalizar = (value: unknown) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    if (combo === "Básico" || combo === "Completo") {
      agregarPrimero(esAceiteMotor);
      agregarPrimero(esFiltro("lub_fil_aceite"));
      if (combo === "Completo") {
        agregarPrimero(esFiltro("lub_fil_aire"));
        agregarPrimero(esFiltro("lub_fil_cabina"));
      }
    } else if (combo === "Caja") {
      agregarPrimero(esAceiteDeTransmision);
      agregarPrimero(esFiltro("lub_fil_transmision"));
    } else if (combo === "Corona") {
      agregarPrimero(
        (product) =>
          product.lubCategoryId === "lub_transmision" &&
          product.lubSubcategoryId === "lub_trans_diferencial"
      );
    } else {
      agregarPrimero(
        (product) =>
          product.lubCategoryId === "lub_aceite" &&
          product.lubSubcategoryId === "lub_grasa"
      );
    }

    const terminosServicio: Record<(typeof COMBOS_LUBRICENTRO)[number], string[]> = {
      "Básico": ["cambio de aceite", "cambio aceite", "basico"],
      "Completo": ["servicio completo", "mantenimiento completo", "completo"],
      Caja: ["caja", "transmision"],
      Corona: ["corona", "diferencial"],
      Engrase: ["engrase", "engrasado"],
    };
    agregarPrimero(
      (product: ProductoCatalogoLubricentro) =>
        product.type === "SERVICE" &&
        terminosServicio[combo].some((term) =>
          normalizar(product.name).includes(normalizar(term))
        )
    );

    if (seleccionados.length === 0) {
      notificar(`No hay productos disponibles para el combo ${combo}.`, "err");
      return;
    }

    try {
      if (ordenActiva?.id) {
        const nuevosItems = [...itemsOrden];
        seleccionados.forEach((product) => {
          const { presentation, price, unitOfMeasure } = obtenerPresentacionYPrecio(product);
          const index = nuevosItems.findIndex(
            (item) =>
              (item.productId === product.id ||
                (item.code && product.code && item.code === product.code)) &&
              (!item.presentation || item.presentation === presentation)
          );
          if (index >= 0) {
            nuevosItems[index] = {
              ...nuevosItems[index],
              qty: (Number(nuevosItems[index].qty) || 1) + 1,
              price,
            };
            return;
          }
          const categoryLabel =
            categoriasActivas.find((category) => category.id === product.lubCategoryId)?.label ||
            "Catálogo";
          nuevosItems.push({
            id: `it_${product.id}_${Date.now()}_${nuevosItems.length}`,
            productId: product.id,
            type: product.type || "PART",
            category: `Lubricentro - ${categoryLabel}`,
            subCategory: product.lubSubcategoryId || "",
            code: product.code,
            name: `${product.name} (${presentation})`,
            brand: product.brand || "",
            presentation,
            unitOfMeasure,
            price,
            qty: 1,
            status: "Listo",
            completed: true,
            empleado_id: empleadoLogueado.id,
            empleado_nombre: empleadoLogueado.nombre,
          });
        });
        await onActualizarItemsOrden(nuevosItems);
      } else {
        setCarritoDirecto((prev) => {
          const next = [...prev];
          seleccionados.forEach((product) => {
            const { presentation, price, unitOfMeasure } = obtenerPresentacionYPrecio(product);
            const index = next.findIndex(
              (item) => item.productId === product.id && item.presentation === presentation
            );
            if (index >= 0) {
              next[index] = { ...next[index], qty: next[index].qty + 1, price };
              return;
            }
            next.push({
              key: `${product.id}_${presentation}`,
              productId: product.id,
              code: product.code || product.id,
              name: product.name || "Producto",
              brand: product.brand || "",
              presentation,
              unitOfMeasure,
              price,
              qty: 1,
              maxStock: product.stock || 999,
              imageUrl: product.imageUrl,
              lubCategoryId: product.lubCategoryId || "",
              lubSubcategoryId: product.lubSubcategoryId || "",
            });
          });
          return next;
        });
      }
      notificar(`Combo ${combo} agregado al carrito.`, "ok");
    } catch (error) {
      notificar(
        error instanceof Error ? error.message : `No se pudo agregar el combo ${combo}.`,
        "err"
      );
    }
  };

  const guardarSeguimientoLubricentro = async (): Promise<boolean> => {
    if (!ordenActiva?.id) {
      notificar("Selecciona una orden de vehículo para guardar el ingreso.", "err");
      return false;
    }

    const kilometraje = Number.parseInt(kilometrajeIngreso.replace(/[^0-9]/g, ""), 10);
    if (!Number.isFinite(kilometraje) || kilometraje <= 0) {
      notificar("Ingresa un kilometraje actual válido.", "err");
      return false;
    }

    try {
      setGuardandoSeguimiento(true);
      if (onGuardarDatosLubricentro) {
        await onGuardarDatosLubricentro(nivelesLubricentro, proximoCambioKm, itemsOrden);
      }

      const inspectionChecklist = {
        ...(ordenActiva.inspectionChecklist || {}),
        lubricentroLevels: nivelesLubricentro,
        lubricentroComponents: componentesLubricentro,
      };
      const response = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACTUALIZAR_ORDEN",
          orderId: ordenActiva.id,
          items: itemsOrden,
          mileage: kilometraje,
          nextOilChangeKm: proximoCambioKm,
          inspectionChecklist,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "No se pudo guardar el ingreso del vehículo.");
      }

      setKilometrajeIngreso(String(data.activeOrder?.mileage || kilometraje));
      notificar("Kilometraje y revisión del vehículo guardados.", "ok");
      return true;
    } catch (error) {
      notificar(
        error instanceof Error ? error.message : "No se pudo guardar el ingreso del vehículo.",
        "err"
      );
      return false;
    } finally {
      setGuardandoSeguimiento(false);
    }
  };

  const handleSiguienteLubricentro = async () => {
    if (ordenActiva?.id && !(await guardarSeguimientoLubricentro())) return;
    (onIrASiguiente || onIrAAvisoYFirma)();
  };

  const handleRepetirUltimoCambioAceite = async () => {
    setRepitiendoCambioAceite(true);
    try {
      const presentacionesSeleccionadas: Record<string, string> = {};
      const placa = String(ordenActiva?.plate || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
      const vehiculo = vehiculosRegistrados.find(
        (vehicle) =>
          String(vehicle.plate || "")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "") === placa
      );
      const datosVehiculo = {
        brand: String(ordenActiva?.vehicleBrand || ordenActiva?.brand || vehiculo?.brand || vehBrand),
        model: String(ordenActiva?.vehicleModel || ordenActiva?.model || vehiculo?.model || vehModel),
        year: String(ordenActiva?.year || vehiculo?.year || vehYear),
        engine: String(ordenActiva?.engine || vehEngine),
        description: String(ordenActiva?.vehicle || ""),
      };
      const normalizar = (value: unknown) =>
        String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
      const coincideDato = (catalogValue: unknown, vehicleValue: string) =>
        !vehicleValue ||
        normalizar(catalogValue).includes(normalizar(vehicleValue)) ||
        normalizar(vehicleValue).includes(normalizar(catalogValue));
      const esCompatibleConVehiculo = (product: ProductoCatalogoLubricentro) => {
        const tieneDatos = Object.values(datosVehiculo).some(Boolean);
        if (!tieneDatos) return false;
        return (Array.isArray(product.compatibilities) ? product.compatibilities : []).some(
          (compatibility: LubVehicleCompatibility) =>
            compatibility.verified &&
            coincideDato(compatibility.brand, datosVehiculo.brand) &&
            coincideDato(compatibility.model, datosVehiculo.model) &&
            coincideDato(compatibility.engine, datosVehiculo.engine) &&
            (!datosVehiculo.year ||
              ((!compatibility.yearFrom || Number(datosVehiculo.year) >= compatibility.yearFrom) &&
                (!compatibility.yearTo || Number(datosVehiculo.year) <= compatibility.yearTo))) &&
            (!datosVehiculo.description ||
              normalizar(datosVehiculo.description).includes(normalizar(compatibility.brand)) ||
              normalizar(compatibility.brand).includes(normalizar(datosVehiculo.description)))
        );
      };
      const seleccionarPredeterminado = (
        coincide: (product: ProductoCatalogoLubricentro) => boolean
      ) => {
        const candidatos = productos.filter(
          (product: ProductoCatalogoLubricentro) =>
            product.active !== false &&
            product.status !== "Inactivo" &&
            product.type !== "SERVICE" &&
            coincide(product)
        );
        return candidatos.find(esCompatibleConVehiculo) || candidatos[0] || null;
      };
      const aceitePredeterminado = seleccionarPredeterminado(
        (product) =>
          product.lubCategoryId === "lub_aceite" &&
          product.lubSubcategoryId === "lub_aceite_motor"
      );
      const filtroPredeterminado = seleccionarPredeterminado(
        (product) =>
          product.lubCategoryId === "lub_filtros" &&
          product.lubSubcategoryId === "lub_fil_aceite"
      );
      const historial = ultimoCambioAceiteAnterior?.products || [];
      const aceiteAnterior = historial.find(
        ({ product }) =>
          product?.lubCategoryId === "lub_aceite" &&
          product?.lubSubcategoryId === "lub_aceite_motor"
      );
      const filtroAnterior = historial.find(
        ({ product }) =>
          product?.lubCategoryId === "lub_filtros" &&
          product?.lubSubcategoryId === "lub_fil_aceite"
      );
      const productosARepetir: ItemAnteriorCambioAceite[] = [
        aceiteAnterior || (aceitePredeterminado ? { item: {}, product: aceitePredeterminado } : null),
        filtroAnterior || (filtroPredeterminado ? { item: {}, product: filtroPredeterminado } : null),
      ].filter((entry): entry is ItemAnteriorCambioAceite => Boolean(entry));

      if (productosARepetir.length === 0) {
        notificar("No hay aceite ni filtro anterior o predeterminado para este vehículo.", "err");
        return;
      }

      const itemsPreparados = productosARepetir.map(({ item, product }, index) => {
        const productId = product.id || item.productId;
        if (!productId) {
          throw new Error("No se encontró el identificador de un producto para repetir.");
        }
        const presentation = String(
          item.presentation || product.presentation || product.unitOfMeasure || "1 Unidad"
        );
        const variant = Array.isArray(product?.presentationsAvailable)
          ? product.presentationsAvailable.find(
              (candidate: LubPresentationVariant) =>
                candidate.label === presentation || candidate.id === item.presentationId
            )
          : undefined;
        if (variant && productId) presentacionesSeleccionadas[productId] = variant.id;

        const price = Number(variant?.price ?? product.price ?? item.price ?? 0);
        const quantityFromName = String(item.name || "").match(/^\s*(\d+)\s*x\s*/i)?.[1];
        const quantity = Math.max(1, Number(item.qty) || Number(quantityFromName) || 1);
        const categoryLabel =
          categoriasActivas.find((category) => category.id === product.lubCategoryId)?.label ||
          String(item.category || "").replace(/^Lubricentro\s*-\s*/i, "") ||
          "Catálogo";
        return {
          id: `it_repeat_${productId || product.code}_${Date.now()}_${index}`,
          productId,
          type: product.type || item.type || "PART",
          category: `Lubricentro - ${categoryLabel}`,
          subCategory: product.lubSubcategoryId || item.subCategory,
          code: product.code || item.code,
          name: `${product.name || item.name} (${presentation})`,
          brand: product.brand || item.brand,
          presentation,
          unitOfMeasure: variant?.unitOfMeasure || product.unitOfMeasure || item.unitOfMeasure,
          price,
          qty: quantity,
          status: "Listo",
          completed: true,
          empleado_id: empleadoLogueado.id,
          empleado_nombre: empleadoLogueado.nombre,
        };
      });

      if (ordenActiva?.id) {
        const nuevosItems = [...itemsOrden];
        itemsPreparados.forEach((item) => {
          const existingIndex = nuevosItems.findIndex(
            (existing) =>
              ((item.productId && existing.productId === item.productId) ||
                (existing.code && item.code && existing.code === item.code)) &&
              (!existing.presentation || existing.presentation === item.presentation)
          );

          if (existingIndex >= 0) {
            const currentQty = Number(nuevosItems[existingIndex].qty) || 1;
            nuevosItems[existingIndex] = {
              ...nuevosItems[existingIndex],
              qty: currentQty + item.qty,
              price: item.price,
            };
            return;
          }
          nuevosItems.push(item);
        });
        await onActualizarItemsOrden(nuevosItems);
      } else {
        setCarritoDirecto((prev) => {
          const next = [...prev];
          itemsPreparados.forEach((item) => {
            const index = next.findIndex(
              (cartItem) =>
                cartItem.productId === item.productId &&
                cartItem.presentation === item.presentation
            );
            if (index >= 0) {
              next[index] = { ...next[index], qty: next[index].qty + item.qty, price: item.price };
              return;
            }
            next.push({
              key: `${item.productId}_${item.presentation}`,
              productId: item.productId,
              code: item.code || item.productId || "LUB",
              name: item.name || "Producto",
              brand: item.brand || "",
              presentation: item.presentation,
              unitOfMeasure: item.unitOfMeasure || "Unidad",
              price: item.price,
              qty: item.qty,
              maxStock:
                productos.find(
                  (product: ProductoCatalogoLubricentro) => product.id === item.productId
                )?.stock || 999,
              lubCategoryId:
                productos.find(
                  (product: ProductoCatalogoLubricentro) => product.id === item.productId
                )?.lubCategoryId || "",
              lubSubcategoryId: item.subCategory || "",
            });
          });
          return next;
        });
      }
      setPresPorProducto((prev) => ({ ...prev, ...presentacionesSeleccionadas }));
      notificar(
        ultimoCambioAceiteAnterior
          ? "Último aceite y filtro agregados"
          : "Aceite y filtro predeterminados agregados",
        "ok"
      );
    } catch (error) {
      notificar(
        error instanceof Error ? error.message : "No se pudo repetir el último cambio de aceite.",
        "err"
      );
    } finally {
      setRepitiendoCambioAceite(false);
    }
  };

  const totalMontoCarrito = useMemo(() => {
    if (ordenActiva) {
      return itemsLubricentroEnOrden.reduce(
        (acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
        0
      );
    }
    return carritoDirecto.reduce((acc, it) => acc + it.price * it.qty, 0);
  }, [ordenActiva, itemsLubricentroEnOrden, carritoDirecto]);

  const ordenUltimoCambioAceite = ultimoCambioAceiteAnterior?.order;
  const fechaUltimoCambioValor =
    ordenUltimoCambioAceite?.dateIn ||
    ordenUltimoCambioAceite?.date ||
    ordenUltimoCambioAceite?.createdAt;
  const fechaUltimoCambioMs = fechaUltimoCambioValor
    ? new Date(fechaUltimoCambioValor).getTime()
    : Number.NaN;
  const fechaUltimoCambio =
    Number.isFinite(fechaUltimoCambioMs) && fechaUltimoCambioMs > 0
      ? new Date(fechaUltimoCambioMs).toLocaleDateString("es-EC", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
      : null;
  const diasDesdeUltimoCambio =
    fechaReferenciaHistorial !== null && Number.isFinite(fechaUltimoCambioMs)
      ? Math.max(0, Math.floor((fechaReferenciaHistorial - fechaUltimoCambioMs) / 86_400_000))
      : null;
  const tiempoDesdeUltimoCambio =
    diasDesdeUltimoCambio === null
      ? null
      : diasDesdeUltimoCambio === 0
      ? "hoy"
      : diasDesdeUltimoCambio >= 365
      ? `hace ${Math.floor(diasDesdeUltimoCambio / 365)} ${
          Math.floor(diasDesdeUltimoCambio / 365) === 1 ? "año" : "años"
        }`
      : diasDesdeUltimoCambio >= 30
      ? `hace ${Math.floor(diasDesdeUltimoCambio / 30)} ${
          Math.floor(diasDesdeUltimoCambio / 30) === 1 ? "mes" : "meses"
        }`
      : `hace ${diasDesdeUltimoCambio} ${diasDesdeUltimoCambio === 1 ? "día" : "días"}`;
  const kilometrajeUltimoCambio = Number(ordenUltimoCambioAceite?.mileage) || 0;
  const kilometrajeActual = Number.parseInt(kilometrajeIngreso.replace(/[^0-9]/g, ""), 10) || 0;
  const kilometrosDesdeUltimoCambio =
    kilometrajeActual > 0 && kilometrajeUltimoCambio > 0
      ? kilometrajeActual - kilometrajeUltimoCambio
      : null;
  const descripcionVehiculo = [
    ordenActiva?.vehicleBrand || ordenActiva?.brand,
    ordenActiva?.vehicleModel || ordenActiva?.model,
    ordenActiva?.year,
  ]
    .filter(Boolean)
    .join(" ");

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
    <div className="w-full space-y-2.5 pb-24 sm:space-y-3 sm:pb-4 animate-fade-in">
      {/* Banner de confirmación / error */}
      {bannerAviso && (
        <div
          className={`p-2.5 sm:p-3 rounded-xl border text-xs font-normal flex items-center justify-between gap-2 shadow-xs ${
            bannerAviso.tipo === "ok"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200"
              : "bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
          }`}
        >
          <span>{bannerAviso.texto}</span>
          <button
            type="button"
            onClick={() => setBannerAviso(null)}
            className="text-xs font-normal px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-2.5 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
          Acciones rápidas
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRepetirUltimoCambioAceite()}
            disabled={repitiendoCambioAceite}
            aria-label="Repetir último aceite y filtro"
            className="min-h-10 px-3.5 rounded-xl border border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-60"
          >
            ⚡ Repetir
          </button>
          <button
            type="button"
            onClick={() => setMostrarNivelesLubricentro((prev) => !prev)}
            aria-expanded={mostrarNivelesLubricentro}
            className="min-h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            💧 Niveles
          </button>
          <button
            type="button"
            onClick={() => setMostrarCombosLubricentro((prev) => !prev)}
            aria-expanded={mostrarCombosLubricentro}
            className="min-h-10 px-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            ⚡ Combo
          </button>
        </div>

        {mostrarNivelesLubricentro && (
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-2.5 dark:border-white/10">
            {NIVELES_LUBRICENTRO.map(({ label }) => {
              const status = nivelesLubricentro[label];
              const statusClass =
                status === "Verde"
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300"
                  : status === "Amarillo"
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300"
                  : status === "Rojo"
                  ? "bg-rose-500/15 border-rose-500/50 text-rose-700 dark:text-rose-300"
                  : "bg-white dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200";
              const statusLabel =
                status === "Verde"
                  ? "OK"
                  : status === "Amarillo"
                  ? "Bajo"
                  : status === "Rojo"
                  ? "Cambiar"
                  : "Sin revisar";

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleCiclarNivelLubricentro(label)}
                  aria-label={`${label}: ${statusLabel}`}
                  title={`${label}: ${status || "Sin revisar"}${status ? ` (${statusLabel})` : ""}`}
                  className={`min-h-9 px-2.5 rounded-lg border text-xs font-medium cursor-pointer active:scale-95 ${statusClass}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {mostrarCombosLubricentro && (
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-2.5 dark:border-white/10">
            {COMBOS_LUBRICENTRO.map((combo) => (
              <button
                key={combo}
                type="button"
                onClick={() => void handleSeleccionarComboLubricentro(combo)}
                className="min-h-9 px-2.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-200 text-xs font-medium cursor-pointer active:scale-95"
              >
                {combo}
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
              Recepción del vehículo
            </p>
            <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {ordenActiva?.plate || "Sin vehículo seleccionado"}
            </h2>
            {descripcionVehiculo && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{descripcionVehiculo}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setPestanaTienda("productos");
              setDrawerTiendaAbierto(true);
            }}
            className="min-h-11 shrink-0 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-500 active:scale-95"
          >
            + Productos y servicios
          </button>
        </div>

        {ordenActiva?.id ? (
          <>
            <div className="grid gap-3 sm:grid-cols-[minmax(200px,0.8fr)_minmax(0,1.2fr)]">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Kilometraje de ingreso
                </span>
                <span className="relative block">
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={kilometrajeIngreso}
                    onChange={(event) => setKilometrajeIngreso(event.target.value)}
                    placeholder="Ej. 85420"
                    className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 pr-12 text-lg font-bold tabular-nums text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500">
                    km
                  </span>
                </span>
              </label>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-white/10 dark:bg-black/20">
                {fechaUltimoCambio ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                        Último cambio de aceite
                      </p>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        {tiempoDesdeUltimoCambio || "Historial"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {fechaUltimoCambio}
                      {kilometrajeUltimoCambio > 0 &&
                        ` · ${formatearKilometraje(kilometrajeUltimoCambio)} km`}
                    </p>
                    {kilometrosDesdeUltimoCambio !== null && kilometrosDesdeUltimoCambio >= 0 && (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Recorrido desde entonces:{" "}
                        <strong className="font-semibold text-zinc-700 dark:text-zinc-200">
                          {formatearKilometraje(kilometrosDesdeUltimoCambio)} km
                        </strong>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Sin cambio de aceite previo
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-white/10">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Revisión de componentes
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {COMPONENTES_SERVICIO_LUBRICENTRO.map((componente) => (
                  <div
                    key={componente}
                    className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/[0.02]"
                  >
                    <span className="min-w-0 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                      {componente}
                    </span>
                    <div className="flex shrink-0 rounded-lg bg-zinc-100 p-0.5 dark:bg-white/5">
                      {(["Pendiente", "Realizado"] as const).map((estado) => {
                        const activo = componentesLubricentro[componente] === estado;
                        return (
                          <button
                            key={estado}
                            type="button"
                            onClick={() =>
                              setComponentesLubricentro((prev) => ({
                                ...prev,
                                [componente]: estado,
                              }))
                            }
                            aria-pressed={activo}
                            className={`min-h-9 rounded-md px-2.5 text-[10px] font-semibold transition ${
                              activo
                                ? "bg-blue-100 text-blue-800 shadow-xs dark:bg-blue-500/25 dark:text-blue-100"
                                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                            }`}
                          >
                            {estado}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {proximoCambioKm !== null && (
                <span className="mr-auto text-xs text-zinc-500 dark:text-zinc-400">
                  Próximo cambio:{" "}
                  <strong className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatearKilometraje(proximoCambioKm)} km
                  </strong>
                </span>
              )}
              <button
                type="button"
                onClick={() => void guardarSeguimientoLubricentro()}
                disabled={guardandoSeguimiento}
                className="min-h-10 rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.08]"
              >
                {guardandoSeguimiento ? "Guardando..." : "Guardar revisión"}
              </button>
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:border-white/10 dark:bg-black/20 dark:text-zinc-300">
            Para registrar kilometraje e historial, primero selecciona la orden del vehículo.
            También puedes abrir la tienda para una venta directa.
          </p>
        )}
      </section>

      {drawerTiendaAbierto && (
        <div
          role="presentation"
          onClick={() => setDrawerTiendaAbierto(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-5"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tienda de Lubricentro"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-white/10 dark:bg-[#111113] dark:text-zinc-100 sm:max-h-[90dvh] sm:rounded-2xl"
          >
            <div className="shrink-0 border-b border-zinc-200 p-3 dark:border-white/10 sm:px-5 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Tienda de Lubricentro</h2>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {ordenActiva?.plate
                      ? `Agregar a la atención de ${ordenActiva.plate}`
                      : "Selecciona productos o servicios para caja"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerTiendaAbierto(false)}
                  aria-label="Cerrar tienda"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
                >
                  ×
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["productos", "servicios"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setPestanaTienda(tab);
                      setMenuFiltroAbierto(false);
                      setMenuEnvaseAbierto(false);
                    }}
                    aria-pressed={pestanaTienda === tab}
                    className={`min-h-10 rounded-xl border text-sm font-semibold capitalize transition ${
                      pestanaTienda === tab
                        ? "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-400/50 dark:bg-blue-500/20 dark:text-blue-100"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 pb-6 sm:p-5">
      {pestanaTienda === "productos" && (
      <section
        aria-label="Categorías del catálogo"
        className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-base">
              Explorar catálogo
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 sm:text-xs">
              Elige una categoría y luego un tipo de producto
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            {productosFiltrados.length} {productosFiltrados.length === 1 ? "producto" : "productos"}
          </span>
        </div>

        <div className="space-y-2 rounded-xl bg-zinc-50/80 p-2.5 dark:bg-black/20 sm:p-3">
          <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            Categoría
          </p>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {mostrarCategorias ? (
          <>
            <button
              type="button"
              onClick={() => handleCambiarCategoria("ALL")}
              className={`flex-1 min-w-[100px] sm:min-w-[120px] h-9 sm:h-10 px-3 rounded-xl border text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap ${
                categoriaActivaId === "ALL"
                  ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-100 shadow-xs"
                  : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              <span className="text-sm leading-none shrink-0">✨</span>
              <span className="whitespace-nowrap">Todo</span>
              <span
                className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md font-normal shrink-0 ${
                  categoriaActivaId === "ALL"
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30"
                    : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
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
                  className={`flex-1 min-w-[105px] sm:min-w-[125px] h-9 sm:h-10 px-3 rounded-xl border text-xs font-normal flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap ${
                    sel
                      ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-100 shadow-xs"
                      : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  <span className="text-base leading-none shrink-0">{cat.icon}</span>
                  <span className="whitespace-nowrap">{cat.label}</span>
                  {enPedido > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-md text-xs leading-none tabular-nums font-normal bg-emerald-500 text-white shrink-0">
                      {enPedido}
                    </span>
                  ) : (
                    <span
                      className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md font-normal shrink-0 ${
                        sel
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30"
                          : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
                      }`}
                    >
                      {totalCat}
                    </span>
                  )}
                </button>
              );
            })}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarCategorias(true)}
            aria-label="Mostrar categorías"
            className="min-w-[120px] h-9 sm:h-10 px-3 rounded-xl border bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50 text-blue-800 dark:text-blue-100 text-xs font-normal inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs active:scale-95 whitespace-nowrap"
          >
            {categoriaActivaId === "ALL" || !categoriaSeleccionadaObj ? (
              <>
                <span className="text-sm leading-none shrink-0">✨</span>
                <span>Todo</span>
                <span className="text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30">
                  {productos.filter((p) => p.active !== false).length}
                </span>
              </>
            ) : (
              <>
                <span className="text-base leading-none shrink-0">{categoriaSeleccionadaObj.icon}</span>
                <span>{categoriaSeleccionadaObj.label}</span>
                <span
                  className="text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30"
                >
                  {conteoEnPedidoPorCategoria[categoriaSeleccionadaObj.id] ||
                    conteoProductosPorCategoria[categoriaSeleccionadaObj.id] ||
                    0}
                </span>
              </>
            )}
          </button>
        )}
          </div>

          {categoriaActivaId !== "ALL" && subcategoriasActivas.length > 0 && (
            <div className="space-y-2 border-t border-zinc-200/80 pt-2.5 dark:border-white/10">
              <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                Tipo de producto
              </p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {mostrarSubcategorias ? (
            <>
              <button
                type="button"
                onClick={() => handleCambiarSubcategoria("ALL")}
                className={`flex-1 min-w-[95px] sm:min-w-[110px] h-8 sm:h-8.5 px-3 rounded-lg border text-xs font-normal flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  subcategoriaActivaId === "ALL"
                    ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-100 shadow-xs"
                    : "bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                }`}
              >
                <span>Todos</span>
                <span
                  className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md shrink-0 ${
                    subcategoriaActivaId === "ALL"
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30"
                      : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
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
                    className={`flex-1 min-w-[95px] sm:min-w-[110px] h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-lg border text-xs font-normal flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
                      activa
                        ? "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-500/20 dark:border-blue-400/50 dark:text-blue-100 shadow-xs"
                        : "bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                    }`}
                  >
                    <span className="text-sm leading-none shrink-0">{sub.icon}</span>
                    <span className="whitespace-nowrap">
                      {sub.label
                        .replace(/^De\s+/i, "")
                        .replace(/^Líquido\s+(de\s+)?/i, "")
                        .replace(/^Valvulina\s*\/\s*/i, "")
                        .split(/[\s/]+/)[0]}
                    </span>
                    {countSub > 0 && (
                      <span
                        className={`text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md shrink-0 ${
                          activa
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30"
                            : "bg-zinc-100 dark:bg-white/15 text-zinc-700 dark:text-zinc-100"
                        }`}
                      >
                        {countSub}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          ) : (
            <button
              type="button"
              onClick={() => setMostrarSubcategorias(true)}
              aria-label="Mostrar subcategorías"
              className="min-w-[110px] h-8 sm:h-8.5 px-3 rounded-lg border bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50 text-blue-800 dark:text-blue-100 text-xs font-normal inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              {subcategoriaActivaId === "ALL" || !subcategoriaSeleccionadaObj ? (
                <>
                  <span>Todos</span>
                  <span className="text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30">
                    {conteoProductosPorCategoria[categoriaActivaId] || 0}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm leading-none shrink-0">{subcategoriaSeleccionadaObj.icon}</span>
                  <span className="whitespace-nowrap">
                    {subcategoriaSeleccionadaObj.label
                      .replace(/^De\s+/i, "")
                      .replace(/^Líquido\s+(de\s+)?/i, "")
                      .replace(/^Valvulina\s*\/\s*/i, "")
                      .split(/[\s/]+/)[0]}
                  </span>
                  {(conteoProductosPorSubcategoria[subcategoriaSeleccionadaObj.id] || 0) > 0 && (
                    <span className="text-xs leading-none tabular-nums px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-500/30">
                      {conteoProductosPorSubcategoria[subcategoriaSeleccionadaObj.id]}
                    </span>
                  )}
                </>
              )}
            </button>
          )}
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* =====================================================================
          TIENDA UNIFICADA Y AUTOMÁTICA (Muestra productos al instante sin escribir)
          ===================================================================== */}
      <section
        aria-label="Productos del catálogo"
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4"
      >
        {/* Barra superior: Buscador + Desplegable de Base (Sintético / Semisintético / Mineral) + Carrito */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:text-base">
              {pestanaTienda === "productos" ? "Productos" : "Servicios"}
            </h2>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 sm:text-xs">
              Toca una tarjeta para agregarla a la atención
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium tabular-nums text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
            {productosTiendaFiltrados.length} disponibles
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative basis-full sm:basis-auto sm:flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={busquedaTexto}
              onChange={(e) => setBusquedaTexto(e.target.value)}
              placeholder={pestanaTienda === "productos" ? "Buscar producto..." : "Buscar servicio..."}
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

          {pestanaTienda === "productos" && basesRapidas.length > 0 && (
            <div ref={menuFiltroRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMenuFiltroAbierto((prev) => !prev);
                  setMenuEnvaseAbierto(false);
                }}
                className={`h-9 px-3 rounded-lg border text-xs font-normal flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs select-none active:scale-95 ${
                  filtroBase
                    ? "bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50 text-blue-800 dark:text-blue-100 shadow-xs"
                    : menuFiltroAbierto
                    ? "bg-blue-50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
                    : "bg-zinc-50/80 dark:bg-black/40 hover:bg-zinc-100 dark:hover:bg-white/[0.06] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
                }`}
              >
                <span className="truncate max-w-[110px] sm:max-w-none">
                  {filtroBase || "Base"}
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
                  <button
                    type="button"
                    onClick={() => {
                      setFiltroBase("");
                      setMenuFiltroAbierto(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-normal flex items-center justify-between transition-colors cursor-pointer ${
                      !filtroBase
                        ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-normal"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <span>Todas las bases</span>
                    {!filtroBase && <span className="text-xs">✓</span>}
                  </button>

                  <div className="my-1 border-t border-zinc-100 dark:border-white/5" />

                  {basesRapidas.map((b) => {
                    const val = b.value || b.label;
                    const act = filtroBase.toLowerCase() === val.toLowerCase();
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setFiltroBase(act ? "" : val);
                          setMenuFiltroAbierto(false);
                        }}
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-normal flex items-center justify-between transition-colors cursor-pointer ${
                          act
                            ? "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-100 font-normal"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                        }`}
                      >
                        <span>{b.label}</span>
                        {act && <span className="text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {pestanaTienda === "productos" && (
          <div ref={menuEnvaseRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setMenuEnvaseAbierto((prev) => !prev);
                setMenuFiltroAbierto(false);
              }}
              aria-expanded={menuEnvaseAbierto}
              className={`h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-95 ${
                filtroEnvase
                  ? "bg-blue-100 dark:bg-blue-500/20 border-blue-300 dark:border-blue-400/50 text-blue-800 dark:text-blue-100"
                  : "bg-zinc-50/80 dark:bg-black/40 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200"
              }`}
            >
              {filtroEnvase || "Envase"}
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  menuEnvaseAbierto ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {menuEnvaseAbierto && (
              <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 shadow-xl dark:shadow-2xl p-1.5 space-y-0.5 z-40 animate-fade-in">
                {ENVASES_CERRADOS.map((envase) => (
                  <button
                    key={envase}
                    type="button"
                    onClick={() => {
                      setFiltroEnvase((prev) => (prev === envase ? "" : envase));
                      setMenuEnvaseAbierto(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      filtroEnvase === envase
                        ? "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-100"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                    }`}
                  >
                    {envase}
                    {filtroEnvase === envase && <span aria-hidden="true">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
        </div>


        {/* Chips de filtros activos con botón de limpieza rápida */}
        {pestanaTienda === "productos" && chipsFiltrosActivos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {chipsFiltrosActivos.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 text-[11px] font-normal text-blue-700 dark:text-blue-300"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.onClear}
                  className="hover:text-rose-500 font-normal pl-0.5 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={limpiarTodosLosFiltros}
              className="text-[11px] font-normal text-rose-600 dark:text-rose-400 hover:underline px-1.5 cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Grid de productos automático, intuitivo y táctil para móvil y escritorio */}
        {productosTiendaFiltrados.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 xl:grid-cols-5">
            {productosTiendaFiltrados.map((prod) => {
              const { presentation, price } = obtenerPresentacionYPrecio(prod);
              const palabraClave = obtenerPalabraClaveProducto(prod);
              const qtyEnPedido = obtenerCantidadEnPedido(prod, presentation);
              const estaEnPedido = qtyEnPedido > 0;

              return (
                <div
                  key={prod.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest("button")) {
                      void handleAjustarCantidadProducto(prod, 1, presentation, price);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      void handleAjustarCantidadProducto(prod, 1, presentation, price);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Agregar ${palabraClave} al carrito`}
                  aria-pressed={estaEnPedido}
                  className={`relative min-h-48 p-3 sm:p-4 rounded-2xl border flex flex-col items-center justify-between gap-3 transition-all shadow-2xs cursor-pointer select-none active:scale-[0.98] ${
                    estaEnPedido
                      ? "bg-blue-50 dark:bg-blue-500/[0.08] border-blue-300 dark:border-blue-400/60 ring-1 ring-blue-300/40"
                      : "bg-white dark:bg-white/[0.02] hover:border-blue-400/60 dark:hover:border-blue-500/40 border-zinc-200 dark:border-white/10"
                  }`}
                >
                  {estaEnPedido && (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <span className="min-w-7 h-7 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center tabular-nums">
                        {qtyEnPedido}
                      </span>
                      <button
                        type="button"
                        disabled={agregandoId === prod.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleAjustarCantidadProducto(prod, -1, presentation, price);
                        }}
                        className="w-7 h-7 rounded-full bg-white dark:bg-black/40 border border-emerald-400/60 text-zinc-800 dark:text-white font-bold text-sm flex items-center justify-center cursor-pointer active:scale-90 transition-all disabled:opacity-50"
                        aria-label={`Restar ${palabraClave} del carrito`}
                        title="Restar 1"
                      >
                        −
                      </button>
                    </div>
                  )}
                  <div className="mt-1 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 p-2 dark:border-white/5 dark:bg-black/20 sm:h-24 sm:w-24">
                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-3xl" aria-hidden="true">
                        {categoriasActivas.find((c) => c.id === prod.lubCategoryId)?.icon || "🛢️"}
                      </span>
                    )}
                  </div>
                  <div className="flex w-full flex-col items-center gap-1">
                    <span className="max-w-full truncate text-center text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-100 sm:text-xl">
                      {palabraClave.toUpperCase()}
                    </span>
                    <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ${price.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 px-4 py-8 text-center dark:border-white/15 dark:bg-black/20">
            <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-2xs dark:bg-white/10">
              {cargando ? "…" : "🔎"}
            </span>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              {cargando
                ? "Cargando catálogo"
                : `No hay ${pestanaTienda === "productos" ? "productos" : "servicios"} para mostrar`}
            </p>
            <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
              {cargando
                ? "Estamos actualizando los productos disponibles."
                : pestanaTienda === "productos"
                ? "Prueba otra categoría o elimina algunos filtros para ver más opciones."
                : "Prueba otra búsqueda para encontrar un servicio disponible."}
            </p>
          </div>
        )}
      </section>
            </div>
          </div>
        </div>
      )}

      {/* Barra inferior fija/flotante en móvil cuando hay productos seleccionados o botón directo */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-2 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:sticky sm:bottom-2 sm:mx-auto sm:max-w-7xl sm:p-3 sm:rounded-xl bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border border-zinc-200 dark:border-white/15 shadow-lg">
        <div
          onClick={() => setDrawerCarritoAbierto(true)}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-sm shrink-0">
            🛒
          </div>
          <div className="min-w-0 leading-snug">
            <span className="text-sm sm:text-base font-normal text-zinc-900 dark:text-white block truncate">
              {totalUnidadesCarrito} {totalUnidadesCarrito === 1 ? "producto" : "productos"}
            </span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm sm:text-base font-normal text-emerald-600 dark:text-emerald-400">
                Total: ${totalMontoCarrito.toFixed(2)}
              </span>
              {intervaloAceiteEnCarrito !== null && (
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                  +{formatearKilometraje(intervaloAceiteEnCarrito)} km
                </span>
              )}
              {ordenActiva?.id && proximoCambioKm !== null && (
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Próx: {formatearKilometraje(proximoCambioKm)} km
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleSiguienteLubricentro()}
            disabled={guardandoSeguimiento}
            className="h-10 sm:h-9 px-4 sm:px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-normal cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-60"
          >
            Siguiente →
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
                  <h3 className="text-base font-normal">🛒 Carrito de Lubricentro</h3>
                  <p className="text-xs text-zinc-500">
                    {ordenActiva?.id
                      ? `Sincronizado con Orden Activa #${ordenActiva.orderNumber || ordenActiva.plate}`
                      : "Venta directa hacia Caja POS"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerCarritoAbierto(false)}
                  className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/5 text-xs font-normal cursor-pointer"
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
                          <span className="text-xs font-normal block truncate">
                            {it.name}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {it.qty || 1} x ${Number(it.price || 0).toFixed(2)} ={" "}
                            <span className="text-zinc-900 dark:text-white">
                              ${((Number(it.qty) || 1) * Number(it.price || 0)).toFixed(2)}
                            </span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onActualizarItemsOrden(
                              itemsOrden.filter((x) => x.id !== it.id)
                            )
                          }
                          className="text-rose-600 text-xs font-normal px-2 cursor-pointer"
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
                            <span className="text-xs font-normal block truncate">
                              {c.name} ({c.presentation})
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500">
                              {c.qty} x ${c.price.toFixed(2)} ={" "}
                              <span className="text-zinc-900 dark:text-white">
                                ${(c.qty * c.price).toFixed(2)}
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setCarritoDirecto((prev) =>
                                prev.filter((x) => x.key !== c.key)
                              )
                            }
                            className="text-rose-600 text-xs font-normal px-2 cursor-pointer"
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
                  <div className="flex items-center justify-between text-sm font-normal">
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
                    className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal cursor-pointer"
                  >
                    Ir a Aviso, Firma y Enviar a POS →
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm font-normal">
                    <span>Total Carrito:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      ${totalMontoCarrito.toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={carritoDirecto.length === 0 || enviandoPedidoPos}
                    onClick={handleEnviarCarritoDirectoAPos}
                    className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-300 text-white text-xs font-normal cursor-pointer"
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
