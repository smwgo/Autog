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

const getInitialLubricentroCache = () => {
  if (_lubricentroClientCache) return _lubricentroClientCache;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("taller_lubricentro_cache_v3");
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

// ============================================================================
// SERVICIOS Y FILTROS POR SUBCATEGORÍA PARA EL PANEL IZQUIERDO DE LUBRICENTRO
// ============================================================================
const SERVICIOS_POR_SUBCATEGORIA: Record<
  string,
  { id: string; label: string; icon: string; filtro: string }[]
> = {
  lub_aceite_motor: [
    { id: "srv_cambio_aceite_motor", label: "Aceite", icon: "🛢️", filtro: "aceite_motor" },
    { id: "srv_filtro_aceite", label: "Filtro", icon: "🛢️", filtro: "filtro_aceite" },
    { id: "srv_filtro_aire", label: "Aire", icon: "🌪️", filtro: "filtro_aire" },
    { id: "srv_filtro_combustible", label: "Combustible", icon: "⛽", filtro: "filtro_combustible" },
    { id: "srv_filtro_cabina", label: "Cabina", icon: "❄️", filtro: "filtro_cabina" },
    { id: "srv_lavado_interno", label: "Lavado", icon: "⚙️", filtro: "flush" },
    { id: "srv_limpieza_lubricacion", label: "Limpieza", icon: "🔧", filtro: "limpieza" },
  ],
  lub_aditivos: [
    { id: "srv_adt_antifriccion", label: "Antifricción", icon: "🛡️", filtro: "limpieza" },
    { id: "srv_adt_inyectores", label: "Inyectores", icon: "🧪", filtro: "inyectores" },
    { id: "srv_adt_humo", label: "Anti-Humo", icon: "💨", filtro: "humo" },
    { id: "srv_adt_octano", label: "Octanaje", icon: "⚡", filtro: "octano" },
  ],
  lub_flush: [
    { id: "srv_fl_engine", label: "Flush", icon: "🧼", filtro: "flush" },
    { id: "srv_fl_enjuague", label: "Enjuague", icon: "⚙️", filtro: "flush" },
    { id: "srv_fl_descarb", label: "Descarbonizado", icon: "🧪", filtro: "flush" },
  ],
  lub_grasa: [
    { id: "srv_gr_chasis", label: "Chasis", icon: "🔩", filtro: "grasa" },
    { id: "srv_gr_litio", label: "Litio", icon: "🧴", filtro: "grasa" },
    { id: "srv_gr_temp", label: "Rodamientos", icon: "🔥", filtro: "grasa" },
    { id: "srv_gr_crucetas", label: "Crucetas", icon: "⚙️", filtro: "grasa" },
  ],
  lub_tratamiento: [
    { id: "srv_trat_ceratec", label: "Cerámico", icon: "🛡️", filtro: "limpieza" },
    { id: "srv_trat_antifriccion", label: "Antifricción", icon: "⚙️", filtro: "limpieza" },
    { id: "srv_trat_compresion", label: "Compresión", icon: "🏎️", filtro: "limpieza" },
    { id: "srv_trat_fuga", label: "Fugas", icon: "💧", filtro: "limpieza" },
  ],
  lub_valvulina: [
    { id: "srv_valv_80w90", label: "80W-90", icon: "⚙️", filtro: "valvulina" },
    { id: "srv_valv_85w140", label: "85W-140", icon: "🔩", filtro: "valvulina" },
    { id: "srv_valv_cambio", label: "Servicio", icon: "🔧", filtro: "valvulina" },
  ],
  lub_hidraulico_aceite: [
    { id: "srv_hid_liquido", label: "Fluido", icon: "🛞", filtro: "hidraulico" },
    { id: "srv_hid_purga", label: "Purga", icon: "🔧", filtro: "hidraulico" },
  ],
  lub_frenos_aceite: [
    { id: "srv_fr_dot4", label: "DOT4", icon: "🛑", filtro: "frenos" },
    { id: "srv_fr_purga", label: "Purga", icon: "🔧", filtro: "frenos" },
  ],
  lub_refrigerante_aceite: [
    { id: "srv_ref_coolant", label: "Coolant", icon: "🌡️", filtro: "coolant" },
    { id: "srv_ref_lavado", label: "Lavado", icon: "🔧", filtro: "coolant" },
  ],
  lub_limpieza_combustible: [
    { id: "srv_iny_liquimoly", label: "Inyectores", icon: "⛽", filtro: "inyectores" },
    { id: "srv_iny_servicio", label: "Servicio", icon: "🔧", filtro: "inyectores" },
  ],
  lub_trans_automatica: [
    { id: "srv_tr_atf", label: "ATF", icon: "🔄", filtro: "atf" },
    { id: "srv_tr_filtro_atf", label: "Filtro", icon: "⚙️", filtro: "filtro_trans" },
    { id: "srv_tr_purga_atf", label: "Purga", icon: "🔧", filtro: "atf" },
  ],
  lub_trans_cvt: [
    { id: "srv_tr_cvt", label: "CVT", icon: "⚡", filtro: "cvt" },
    { id: "srv_tr_purga_cvt", label: "Calibración", icon: "🔧", filtro: "cvt" },
  ],
  lub_trans_manual: [
    { id: "srv_tr_man_80w90", label: "80W-90", icon: "⚙️", filtro: "manual" },
    { id: "srv_tr_man_75w90", label: "75W-90", icon: "⚙️", filtro: "manual" },
    { id: "srv_tr_man_serv", label: "Servicio", icon: "🔧", filtro: "manual" },
  ],
  lub_trans_diferencial: [
    { id: "srv_tr_dif_85w140", label: "85W-140", icon: "🔩", filtro: "diferencial" },
    { id: "srv_tr_dif_serv", label: "Servicio", icon: "🔧", filtro: "diferencial" },
  ],
  lub_fil_aceite: [
    { id: "srv_f_aceite_blind", label: "Blindado", icon: "🛢️", filtro: "filtro_aceite" },
    { id: "srv_f_aceite_elem", label: "Elemento", icon: "🛢️", filtro: "filtro_aceite" },
    { id: "srv_f_aceite_diesel", label: "Diésel", icon: "🚛", filtro: "filtro_aceite" },
  ],
  lub_fil_aire: [
    { id: "srv_f_aire_panel", label: "Panel", icon: "🌪️", filtro: "filtro_aire" },
    { id: "srv_f_aire_cono", label: "Cilíndrico", icon: "🌪️", filtro: "filtro_aire" },
  ],
  lub_fil_cabina: [
    { id: "srv_f_cab_std", label: "Estándar", icon: "❄️", filtro: "filtro_cabina" },
    { id: "srv_f_cab_carbon", label: "Carbón", icon: "🛡️", filtro: "filtro_cabina" },
  ],
  lub_fil_combustible: [
    { id: "srv_f_comb_linea", label: "Línea", icon: "⛽", filtro: "filtro_combustible" },
    { id: "srv_f_comb_trampa", label: "Trampa", icon: "🚛", filtro: "filtro_combustible" },
  ],
  lub_flu_coolant: [
    { id: "srv_fl_cool_gal", label: "Galón", icon: "🌡️", filtro: "coolant" },
    { id: "srv_fl_cool_serv", label: "Servicio", icon: "🔧", filtro: "coolant" },
  ],
  lub_flu_frenos: [
    { id: "srv_fl_dot4", label: "DOT4", icon: "🛑", filtro: "frenos" },
    { id: "srv_fl_purga", label: "Purga", icon: "🔧", filtro: "frenos" },
  ],
  lub_flu_hidraulico: [
    { id: "srv_fl_hid_liq", label: "Fluido", icon: "🛞", filtro: "hidraulico" },
    { id: "srv_fl_hid_serv", label: "Purga", icon: "🔧", filtro: "hidraulico" },
  ],
  lub_flu_limpiaparabrisas: [
    { id: "srv_fl_plumas", label: "Plumas", icon: "🌧️", filtro: "plumas" },
    { id: "srv_fl_shampoo", label: "Shampoo", icon: "💧", filtro: "shampoo" },
  ],
  lub_bat_convencionales: [
    { id: "srv_bat_test", label: "Test", icon: "⚡", filtro: "baterias" },
    { id: "srv_bat_11p", label: "11-Placas", icon: "🔋", filtro: "baterias" },
    { id: "srv_bat_13p", label: "13-Placas", icon: "🔋", filtro: "baterias" },
    { id: "srv_bat_15p", label: "15-Placas", icon: "🔋", filtro: "baterias" },
  ],
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
    if (!cached?.config) return DEFAULT_LUBRICENTRO_CONFIG_CLIENT;
    const defaultSubs = DEFAULT_LUBRICENTRO_CONFIG_CLIENT.subcategories || [];
    const existingIds = new Set((cached.config.subcategories || []).map((s: any) => s.id));
    const mergedSubs = [
      ...(cached.config.subcategories || []),
      ...defaultSubs.filter((s: any) => !existingIds.has(s.id)),
    ];
    return {
      ...cached.config,
      subcategories: mergedSubs,
    };
  });
  const [productos, setProductos] = useState<any[]>(() => {
    const cached = getInitialLubricentroCache();
    if (!cached?.products || cached.products.length === 0) {
      return DEFAULT_LUBRICENTRO_PRODUCTS_CLIENT;
    }
    const defaultProds = DEFAULT_LUBRICENTRO_PRODUCTS_CLIENT;
    const existingIds = new Set(cached.products.map((p: any) => p.id));
    return [
      ...cached.products,
      ...defaultProds.filter((p: any) => !existingIds.has(p.id)),
    ];
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

  // Selección de Categoría (Fila 1) y Subcategoría (Fila 2)
  const [categoriaActivaId, setCategoriaActivaId] = useState<string>("lub_aceite");
  const [subcategoriaPorCat, setSubcategoriaPorCat] = useState<Record<string, string>>({
    lub_aceite: "lub_aceite_motor",
    lub_transmision: "lub_trans_atf",
    lub_filtros: "lub_fil_aceite",
    lub_fluidos: "lub_flu_refrigerante",
    lub_baterias: "lub_bat_convencional",
  });

  // ---------------------------------------------------------------------------
  // 3. CONFIGURACIÓN MANUAL Y FILTROS DE ACEITES (Aceites -> Aceite de motor)
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

  // Estado para solicitud manual escrita en la sección de aceites
  const [solicitudManualTexto, setSolicitudManualTexto] = useState<string>("");
  const [solicitudManualPrecio, setSolicitudManualPrecio] = useState<string>("");
  const [modoManualTexto, setModoManualTexto] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // 4. FILTROS ESPECÍFICOS PARA LAS DEMÁS CATEGORÍAS (Separados estrictamente)
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

  // Dropdown moderno para unidad de medida en el panel manual
  const [dropdownUnidadAbierto, setDropdownUnidadAbierto] = useState<boolean>(false);
  const menuUnidadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (menuFiltroRef.current && !menuFiltroRef.current.contains(e.target as Node)) {
        setMenuFiltroAbierto(false);
      }
      if (menuUnidadRef.current && !menuUnidadRef.current.contains(e.target as Node)) {
        setDropdownUnidadAbierto(false);
      }
    };
    if (menuFiltroAbierto || dropdownUnidadAbierto) {
      document.addEventListener("mousedown", handleClickAfuera);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickAfuera);
    };
  }, [menuFiltroAbierto, dropdownUnidadAbierto]);

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

  // ---------------------------------------------------------------------------
  // NUEVO DISEÑO LUBRICENTRO 3 PARTES (Referencia Imagen 1 y 2)
  // ---------------------------------------------------------------------------
  const [itemServicioSeleccionadoId, setItemServicioSeleccionadoId] = useState<string>("srv_cambio_aceite_motor");
  const [busquedaTienda, setBusquedaTienda] = useState<string>("");

  // Modal / Panel Registrar Aceite Manualmente (A Granel - Envío a Presupuesto)
  const [modalAceiteManualAbierto, setModalAceiteManualAbierto] = useState<boolean>(false);
  const [manualAceiteTexto, setManualAceiteTexto] = useState<string>("Shell Helix Ultra 5W-30");
  const [manualUnidad, setManualUnidad] = useState<string>("Litros");
  const [manualCantidad, setManualCantidad] = useState<number>(4.5);
  const [manualPrecio, setManualPrecio] = useState<string>("");

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
    }, 4500);
  };

  // Cargar configuración real y productos de Neon en segundo plano sin congelar la pantalla
  const cargarDatosLubricentro = async () => {
    // Si la caché en memoria tiene menos de 5 minutos, evitar peticiones redundantes
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
        const cacheObj = {
          config: data.config,
          products: Array.isArray(data.products) ? data.products : [],
          vehicles: Array.isArray(data.vehicles) ? data.vehicles : [],
          timestamp: Date.now(),
        };
        _lubricentroClientCache = cacheObj;
        try {
          localStorage.setItem("taller_lubricentro_cache_v2", JSON.stringify(cacheObj));
        } catch {}
        setConfig(data.config);
        setProductos(cacheObj.products);
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
    return categoriasActivas.find((c) => c.id === categoriaActivaId) || categoriasActivas[0];
  }, [categoriasActivas, categoriaActivaId]);

  const subcategoriasActivas = useMemo(() => {
    if (!config || !categoriaSeleccionadaObj) return [];
    return [...config.subcategories]
      .filter((s) => s.categoryId === categoriaSeleccionadaObj.id && s.active)
      .sort((a, b) => a.order - b.order);
  }, [config, categoriaSeleccionadaObj]);

  const subcategoriaActivaId = useMemo(() => {
    if (!categoriaSeleccionadaObj) return "";
    const guardada = subcategoriaPorCat[categoriaSeleccionadaObj.id];
    if (guardada && subcategoriasActivas.some((s) => s.id === guardada)) {
      return guardada;
    }
    return subcategoriasActivas[0]?.id || "";
  }, [categoriaSeleccionadaObj, subcategoriaPorCat, subcategoriasActivas]);

  const subcategoriaSeleccionadaObj = useMemo(() => {
    return subcategoriasActivas.find((s) => s.id === subcategoriaActivaId) || subcategoriasActivas[0];
  }, [subcategoriasActivas, subcategoriaActivaId]);

  const schemaType = categoriaSeleccionadaObj?.schemaType || "aceites";
  const subSchemaType = subcategoriaSeleccionadaObj?.subSchemaType || "aceite_motor";

  // Sub-servicios e ítems del panel izquierdo según la subcategoría seleccionada
  const subServiciosActuales = useMemo(() => {
    if (SERVICIOS_POR_SUBCATEGORIA[subcategoriaActivaId]) {
      return SERVICIOS_POR_SUBCATEGORIA[subcategoriaActivaId];
    }
    return [
      {
        id: `srv_${subcategoriaActivaId}`,
        label: subcategoriaSeleccionadaObj?.label || "Servicio",
        icon: subcategoriaSeleccionadaObj?.icon || "🛢️",
        filtro: subcategoriaActivaId,
      },
    ];
  }, [subcategoriaActivaId, subcategoriaSeleccionadaObj]);

  const itemServicioSeleccionadoObj = useMemo(() => {
    return (
      subServiciosActuales.find((s) => s.id === itemServicioSeleccionadoId) ||
      subServiciosActuales[0]
    );
  }, [subServiciosActuales, itemServicioSeleccionadoId]);

  useEffect(() => {
    if (subServiciosActuales.length > 0) {
      const existe = subServiciosActuales.some((s) => s.id === itemServicioSeleccionadoId);
      if (!existe) {
        setItemServicioSeleccionadoId(subServiciosActuales[0].id);
      }
    }
  }, [subServiciosActuales, itemServicioSeleccionadoId]);

  // Limpiar filtros incompatibles al cambiar de categoría o subcategoría
  const handleCambiarCategoria = (catId: string) => {
    setCategoriaActivaId(catId);
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

  // Configuración dinámica del panel Manual adaptada al ítem seleccionado en el panel izquierdo (Columna 1) o categoría
  const configManualSegunCategoria = useMemo(() => {
    const filtro = itemServicioSeleccionadoObj?.filtro || "";
    const label = itemServicioSeleccionadoObj?.label || "";

    // 1. Detección específica por el ítem de servicio activo en la Columna 1
    if (filtro === "aceite_motor") {
      return {
        labelCampo: "Tipo de aceite",
        placeholder: "Ej: Shell Helix Ultra 5W-30...",
        unidades: ["Litros", "Galón", "Granel", "Cuarto"],
        defaultUnidad: "Litros",
        defaultCantidad: 4.5,
        stepCantidad: 0.5,
        minCantidad: 0.5,
        defaultTexto: "Shell Helix Ultra 5W-30",
        categoryName: "Lubricentro - Aceite a Granel",
        subCategory: "lub_aceite_motor",
      };
    }

    if (filtro === "filtro_aceite") {
      return {
        labelCampo: "Tipo de filtro de aceite",
        placeholder: "Ej: Filtro de Aceite Blindado W 610/3...",
        unidades: ["Unidad", "Juego"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: "Filtro de Aceite",
        categoryName: "Lubricentro - Filtros",
        subCategory: "lub_fil_aceite",
      };
    }

    if (filtro === "filtro_aire") {
      return {
        labelCampo: "Tipo de filtro de aire",
        placeholder: "Ej: Filtro de Aire Panel C 26 013...",
        unidades: ["Unidad", "Juego"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: "Filtro de Aire",
        categoryName: "Lubricentro - Filtros",
        subCategory: "lub_fil_aire",
      };
    }

    if (filtro === "filtro_combustible") {
      return {
        labelCampo: "Tipo de filtro de combustible",
        placeholder: "Ej: Filtro Combustible en Línea WK 820/1...",
        unidades: ["Unidad", "Juego"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: "Filtro de Combustible",
        categoryName: "Lubricentro - Filtros",
        subCategory: "lub_fil_combustible",
      };
    }

    if (filtro === "filtro_cabina") {
      return {
        labelCampo: "Tipo de filtro de cabina (A/C)",
        placeholder: "Ej: Filtro Cabina Antipolen / Carbón...",
        unidades: ["Unidad", "Juego"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: "Filtro de Cabina",
        categoryName: "Lubricentro - Filtros",
        subCategory: "lub_fil_cabina",
      };
    }

    if (filtro === "filtro_trans") {
      return {
        labelCampo: "Tipo de filtro de transmisión",
        placeholder: "Ej: Filtro Caja Automática ATF...",
        unidades: ["Unidad", "Kit"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: "Filtro de Transmisión",
        categoryName: "Lubricentro - Transmisión",
        subCategory: "lub_trans_automatica",
      };
    }

    if (filtro === "flush") {
      return {
        labelCampo: "Tipo de lavado / Engine Flush",
        placeholder: "Ej: Lavado Interno Flush Plus 300ml...",
        unidades: ["Unidad", "Litros", "Servicio"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto:
          label.toLowerCase().includes("descarb")
            ? "Descarbonizado de Motor"
            : label.toLowerCase().includes("enjuague")
            ? "Enjuague de Motor"
            : "Lavado de Motor Interno",
        categoryName: "Lubricentro - Lavado / Flush",
        subCategory: "lub_flush",
      };
    }

    if (filtro === "limpieza" || filtro === "humo" || filtro === "octano") {
      return {
        labelCampo: `Tipo de ${label ? label.toLowerCase() : "aditivo"}`,
        placeholder: `Ej: Aditivo ${label || "Especial"}...`,
        unidades: ["Unidad", "Bote", "Servicio"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: label ? `Aditivo ${label}` : "Aditivo",
        categoryName: "Lubricentro - Aditivos",
        subCategory: "lub_aditivos",
      };
    }

    if (filtro === "inyectores") {
      return {
        labelCampo: "Tipo de limpieza de inyectores",
        placeholder: "Ej: Limpieza de Inyectores Boya / Aditivo...",
        unidades: ["Unidad", "Bote", "Servicio"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: "Limpieza de Inyectores",
        categoryName: "Lubricentro - Inyectores",
        subCategory: "lub_limpieza_combustible",
      };
    }

    if (
      filtro === "valvulina" ||
      filtro === "atf" ||
      filtro === "cvt" ||
      filtro === "manual" ||
      filtro === "diferencial"
    ) {
      return {
        labelCampo: `Tipo de fluido / ${label || "Valvulina"}`,
        placeholder: `Ej: Fluido ${label || "Transmisión"} Sintético...`,
        unidades: ["Litros", "Galón", "Cuarto"],
        defaultUnidad: "Litros",
        defaultCantidad: 2.0,
        stepCantidad: 0.5,
        minCantidad: 0.5,
        defaultTexto: `Fluido ${label || "Valvulina"}`,
        categoryName: "Lubricentro - Transmisión",
        subCategory: subcategoriaActivaId || "lub_valvulina",
      };
    }

    if (filtro === "frenos") {
      return {
        labelCampo: "Tipo de líquido de frenos",
        placeholder: "Ej: Líquido Frenos Bosch DOT 4...",
        unidades: ["Unidad", "Litros", "Servicio"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto:
          label.toLowerCase().includes("purga")
            ? "Purga Líquido de Frenos"
            : "Líquido de Frenos DOT 4",
        categoryName: "Lubricentro - Frenos",
        subCategory: "lub_frenos_aceite",
      };
    }

    if (filtro === "coolant") {
      return {
        labelCampo: "Tipo de refrigerante / Coolant",
        placeholder: "Ej: Refrigerante Rojo 50/50...",
        unidades: ["Galón", "Litros", "Unidad", "Servicio"],
        defaultUnidad: "Galón",
        defaultCantidad: 1,
        stepCantidad: 0.5,
        minCantidad: 0.5,
        defaultTexto:
          label.toLowerCase().includes("lavado")
            ? "Lavado Sistema Refrigeración"
            : "Refrigerante Coolant 50/50",
        categoryName: "Lubricentro - Fluidos",
        subCategory: "lub_refrigerante_aceite",
      };
    }

    if (filtro === "hidraulico") {
      return {
        labelCampo: "Tipo de fluido hidráulico / Dirección",
        placeholder: "Ej: Fluido Dirección Hidráulica Dexron...",
        unidades: ["Litros", "Unidad", "Cuarto", "Servicio"],
        defaultUnidad: "Litros",
        defaultCantidad: 1.0,
        stepCantidad: 0.5,
        minCantidad: 0.5,
        defaultTexto:
          label.toLowerCase().includes("purga")
            ? "Purga Dirección Hidráulica"
            : "Fluido Dirección Hidráulica",
        categoryName: "Lubricentro - Fluidos",
        subCategory: "lub_hidraulico_aceite",
      };
    }

    if (filtro === "grasa") {
      return {
        labelCampo: `Grasa para ${label.toLowerCase()}`,
        placeholder: `Ej: Grasa ${label} Alta Temperatura...`,
        unidades: ["Unidad", "Libras", "Kilos", "Tubo"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: `Grasa para ${label}`,
        categoryName: "Lubricentro - Grasas",
        subCategory: "lub_grasa",
      };
    }

    if (filtro === "plumas") {
      return {
        labelCampo: "Plumillas limpiaparabrisas",
        placeholder: 'Ej: Par Plumillas Bosch 24"/18"...',
        unidades: ["Par", "Unidad"],
        defaultUnidad: "Par",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: "Plumillas Limpiaparabrisas",
        categoryName: "Lubricentro - Limpiaparabrisas",
        subCategory: "lub_flu_limpiaparabrisas",
      };
    }

    if (filtro === "shampoo") {
      return {
        labelCampo: "Shampoo limpiaparabrisas",
        placeholder: "Ej: Shampoo Concentrado Limpiaparabrisas...",
        unidades: ["Unidad", "Litros"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: "Shampoo Limpiaparabrisas",
        categoryName: "Lubricentro - Limpiaparabrisas",
        subCategory: "lub_flu_limpiaparabrisas",
      };
    }

    if (filtro === "baterias" || categoriaActivaId === "lub_baterias") {
      return {
        labelCampo: "Tipo de batería",
        placeholder: "Ej: Batería Bosch S6 12V 75Ah...",
        unidades: ["Unidad"],
        defaultUnidad: "Unidad",
        defaultCantidad: 1,
        stepCantidad: 1,
        minCantidad: 1,
        defaultTexto: "Batería 12V 75Ah",
        categoryName: "Lubricentro - Baterías",
        subCategory: "lub_bat_agm",
      };
    }

    // 2. Fallbacks basados en categoría
    switch (categoriaActivaId) {
      case "lub_aceite":
        return {
          labelCampo: "Tipo de aceite",
          placeholder: "Ej: Shell Helix Ultra 5W-30...",
          unidades: ["Litros", "Galón", "Granel"],
          defaultUnidad: "Litros",
          defaultCantidad: 4.5,
          stepCantidad: 0.5,
          minCantidad: 0.5,
          defaultTexto: "Shell Helix Ultra 5W-30",
          categoryName: "Lubricentro - Aceite a Granel",
          subCategory: "lub_aceite_motor",
        };
      case "lub_transmision":
        return {
          labelCampo: "Tipo de fluido / Valvulina",
          placeholder: "Ej: Valvulina 75W-90, ATF Full Sintético...",
          unidades: ["Litros", "Galón", "Cuarto"],
          defaultUnidad: "Litros",
          defaultCantidad: 2.0,
          stepCantidad: 0.5,
          minCantidad: 0.5,
          defaultTexto: "Valvulina 75W-90",
          categoryName: "Lubricentro - Transmisión",
          subCategory: "lub_valvulina",
        };
      case "lub_filtros":
        return {
          labelCampo: "Tipo de filtro",
          placeholder: "Ej: Filtro de Aceite Blindado W 610/3...",
          unidades: ["Unidad", "Juego"],
          defaultUnidad: "Unidad",
          defaultCantidad: 1,
          stepCantidad: 1,
          minCantidad: 1,
          defaultTexto: "Filtro de Aceite",
          categoryName: "Lubricentro - Filtros",
          subCategory: "lub_fil_aceite",
        };
      case "lub_fluidos":
        return {
          labelCampo: "Tipo de fluido",
          placeholder: "Ej: Refrigerante 50/50, Líquido Frenos DOT 4...",
          unidades: ["Litros", "Galón", "Unidad"],
          defaultUnidad: "Litros",
          defaultCantidad: 1.0,
          stepCantidad: 0.5,
          minCantidad: 0.5,
          defaultTexto: "Refrigerante 50/50",
          categoryName: "Lubricentro - Fluidos",
          subCategory: "lub_refrigerante_aceite",
        };
      default:
        return {
          labelCampo: `Tipo de ${label || categoriaSeleccionadaObj?.label?.toLowerCase() || "producto"}`,
          placeholder: "Campo editable...",
          unidades: ["Unidad", "Litros", "Galón", "Granel"],
          defaultUnidad: "Unidad",
          defaultCantidad: 1,
          stepCantidad: 1,
          minCantidad: 1,
          defaultTexto: label || categoriaSeleccionadaObj?.label || "Manual",
          categoryName: `Lubricentro - ${label || categoriaSeleccionadaObj?.label || "Manual"}`,
          subCategory: subcategoriaActivaId || "manual",
        };
    }
  }, [itemServicioSeleccionadoObj, categoriaActivaId, categoriaSeleccionadaObj, subcategoriaActivaId]);

  // Sincronizar automáticamente el formulario Manual cuando cambia el ítem de la Columna 1 o la categoría
  useEffect(() => {
    if (configManualSegunCategoria) {
      setManualAceiteTexto(configManualSegunCategoria.defaultTexto);
      setManualUnidad(configManualSegunCategoria.defaultUnidad);
      setManualCantidad(configManualSegunCategoria.defaultCantidad);
      setManualPrecio("");
    }
  }, [itemServicioSeleccionadoId, subcategoriaActivaId, categoriaActivaId, configManualSegunCategoria]);

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

      // Categoría y Subcategoría (salvo que "Ver todo el catálogo" esté activo)
      if (verTodoElCatalogo) {
        if (filtroCategoriaGeneral && p.lubCategoryId !== filtroCategoriaGeneral) {
          return false;
        }
      } else {
        if (categoriaSeleccionadaObj && p.lubCategoryId !== categoriaSeleccionadaObj.id) {
          return false;
        }
        if (
          subcategoriaActivaId &&
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
      if (schemaType === "aceites" && subSchemaType === "aceite_motor") {
        if (filtroBase) {
          const normBase = (s: string) =>
            s.toLowerCase().replace(/[^a-z0-9]/g, "");
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

      // Barra de búsqueda general (nombre, marca, SKU, referencia fabricante, especificación)
      if (busquedaTexto.trim()) {
        const q = busquedaTexto.trim().toLowerCase();
        const textoCompleto = [
          p.name,
          p.brand,
          p.code,
          p.manufacturerCode,
          p.viscosity,
          p.lubricantBase,
          p.presentation,
          p.description,
          p.filterApplication,
          ...(Array.isArray(p.specifications) ? p.specifications : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!textoCompleto.includes(q)) return false;
      }

      return true;
    });
  }, [
    productos,
    filtroDisponibilidad,
    verTodoElCatalogo,
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

  // Agregar requerimiento / solicitud manual en la sección de aceites
  const handleAgregarSolicitudManual = async () => {
    const cantTexto =
      cantidadPersonalizadaActiva && cantidadPersonalizadaValor
        ? `${cantidadPersonalizadaValor} ${cantidadPersonalizadaUnidad}`
        : cantidadRequeridaLabel || "1 galón";

    const textoAuto = [
      filtroViscosidad ? `Aceite ${filtroViscosidad}` : "Aceite de Motor",
      filtroBase || "",
      `(${cantTexto})`,
    ]
      .filter(Boolean)
      .join(" ");

    const texto = solicitudManualTexto.trim() || textoAuto;
    if (!texto) return;

    const precioNum = Math.max(0, parseFloat(solicitudManualPrecio) || 0);
    const code = `LUB-MAN-${Math.floor(100 + Math.random() * 900)}`;

    const nuevoItem = {
      id: `sol_man_${Date.now()}`,
      key: `man_${Date.now()}`,
      type: "PART" as const,
      category: `Lubricentro - ${categoriaSeleccionadaObj?.label || "Aceites"}`,
      subCategory: subcategoriaActivaId,
      code,
      name: texto,
      presentation: cantTexto || "Manual",
      unitOfMeasure:
        cantidadPersonalizadaActiva && cantidadPersonalizadaUnidad
          ? cantidadPersonalizadaUnidad
          : cantidadRequeridaLabel.includes("cuarto")
          ? "Cuarto (Qt)"
          : cantidadRequeridaLabel.includes("litro")
          ? "Litro"
          : "Galón",
      price: precioNum,
      qty: 1,
      status: "Listo" as const,
      completed: true,
      empleado_id: empleadoLogueado.id,
      empleado_nombre: empleadoLogueado.nombre,
    };

    if (ordenActiva) {
      const nuevos = [...itemsOrden, nuevoItem];
      await onActualizarItemsOrden(nuevos);
      notificar(`✓ Requerimiento agregado a la orden: ${texto}`, "ok");
    } else {
      setCarritoDirecto((prev) => [
        ...prev,
        {
          key: nuevoItem.key,
          productId: nuevoItem.id,
          code: nuevoItem.code,
          name: nuevoItem.name,
          brand: "Manual",
          presentation: nuevoItem.presentation,
          unitOfMeasure: nuevoItem.unitOfMeasure,
          price: precioNum,
          qty: 1,
          maxStock: 999,
          lubCategoryId: categoriaActivaId,
          lubSubcategoryId: subcategoriaActivaId,
        },
      ]);
      notificar(`✓ Requerimiento agregado al carrito: ${texto}`, "ok");
    }

    setSolicitudManualTexto("");
    setSolicitudManualPrecio("");
  };

  // Guardar ítem Manualmente en Pedido (según la categoría activa)
  const handleGuardarAceiteManualEnPedido = async () => {
    const nombreItem = manualAceiteTexto.trim() || configManualSegunCategoria.defaultTexto;
    const cantidadTexto = `${manualCantidad} ${manualUnidad}`;
    const precioNum = Math.max(0, parseFloat(manualPrecio) || 0);
    const totalCalculado = Number((precioNum * manualCantidad).toFixed(2));
    const code = `LUB-MAN-${Math.floor(100 + Math.random() * 900)}`;

    const nuevoItem = {
      id: `sol_man_${Date.now()}`,
      key: `man_${Date.now()}`,
      type: "PART" as const,
      category: configManualSegunCategoria.categoryName,
      subCategory: configManualSegunCategoria.subCategory,
      code,
      name: `${nombreItem} (${cantidadTexto})`,
      brand: "Manual",
      presentation: cantidadTexto,
      unitOfMeasure: manualUnidad,
      price: precioNum,
      total: totalCalculado,
      qty: manualCantidad,
      status: "Listo" as const,
      completed: true,
      empleado_id: empleadoLogueado.id,
      empleado_nombre: empleadoLogueado.nombre,
    };

    if (ordenActiva) {
      const nuevos = [...itemsOrden, nuevoItem];
      await onActualizarItemsOrden(nuevos);
      notificar(
        precioNum > 0
          ? `✓ Guardado en pedido: ${nombreItem} (${cantidadTexto}) - $${totalCalculado.toFixed(2)}`
          : `✓ Guardado en pedido: ${nombreItem} (${cantidadTexto})`,
        "ok"
      );
    } else {
      setCarritoDirecto((prev) => [
        ...prev,
        {
          key: nuevoItem.key,
          productId: nuevoItem.id,
          code: nuevoItem.code,
          name: nuevoItem.name,
          brand: nuevoItem.brand,
          presentation: nuevoItem.presentation,
          unitOfMeasure: nuevoItem.unitOfMeasure,
          price: precioNum,
          qty: manualCantidad,
          maxStock: 999,
          lubCategoryId: categoriaActivaId,
          lubSubcategoryId: subcategoriaActivaId,
        },
      ]);
      notificar(`✓ Guardado en pedido: ${nombreItem} (${cantidadTexto})`, "ok");
    }

    setManualPrecio("");
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

  const productosParaMostrar = useMemo(() => {
    const normalize = (str: string) =>
      (str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const q = normalize(busquedaTexto.trim());
    if (!q) {
      return [];
    }

    let list = productos.filter((p) => p.active !== false && p.status !== "Inactivo");

    const terms = q.split(/\s+/).filter(Boolean);
    return list.filter((p) => {
      const fullText = normalize([
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
        p.category,
        p.subCategory,
        ...(Array.isArray(p.specifications) ? p.specifications : []),
      ].filter(Boolean).join(" "));

      return terms.every((term) => fullText.includes(term));
    });
  }, [productos, busquedaTexto]);

  const totalUnidadesCarrito = useMemo(() => {
    return carritoDirecto.reduce((acc, it) => acc + it.qty, 0);
  }, [carritoDirecto]);

  const totalMontoCarrito = useMemo(() => {
    return carritoDirecto.reduce((acc, it) => acc + it.price * it.qty, 0);
  }, [carritoDirecto]);

  // Formato corto y limpio para la Orden Activa (evita '#OT #00012' duplicado y textos largos)
  const formatoOrdenCorta = useMemo(() => {
    if (!ordenActiva) return "";
    const raw = String(ordenActiva.orderNumber || ordenActiva.plate || "").trim();
    if (!raw) return "OT";
    let limpio = raw.replace(/^orden\s*#?\s*/i, "").trim();
    if (/^ot\s*#?\s*/i.test(limpio)) {
      return limpio.replace(/^ot\s*#?\s*/i, "OT #");
    }
    if (limpio.startsWith("#")) {
      return `OT ${limpio}`;
    }
    return `OT #${limpio}`;
  }, [ordenActiva]);

  if (!config) return null;

  return (
    <div className="w-full space-y-4 animate-fade-in">
      {/* Banner de confirmación / error */}
      {bannerAviso && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 shadow-xs ${
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
          PARTE 1: CATEGORÍAS PRINCIPALES (Row 1 - Color, Porte y Diseño Taller)
          ===================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {categoriasActivas.map((cat) => {
          const sel = categoriaSeleccionadaObj?.id === cat.id && !verTodoElCatalogo;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setVerTodoElCatalogo(false);
                handleCambiarCategoria(cat.id);
              }}
              className={`h-10 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs active:scale-95 ${
                sel
                  ? "bg-blue-50/90 dark:bg-blue-500/20 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400/40 font-bold"
                  : "bg-white hover:bg-zinc-50 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span className="text-base leading-none shrink-0">{cat.icon}</span>
              <span className="truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          PARTE 2: SUBCATEGORÍAS (Row 2 - Cobertura completa de la página)
          ===================================================================== */}
      {subcategoriasActivas.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 w-full">
          {subcategoriasActivas.map((sub) => {
            const activa = subcategoriaActivaId === sub.id && !verTodoElCatalogo;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setVerTodoElCatalogo(false);
                  handleCambiarSubcategoria(sub.id);
                }}
                className={`flex-1 min-w-[95px] sm:min-w-[105px] h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs ${
                  activa
                    ? "bg-blue-600 border-blue-500 text-white font-bold shadow-xs"
                    : "bg-white hover:bg-zinc-50 dark:bg-white/5 dark:hover:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span className="text-sm leading-none shrink-0">{sub.icon}</span>
                <span className="truncate">{sub.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          PARTE 3: CONTENIDO EN TRES COLUMNAS (Color, Porte y Diseño Taller)
          ===================================================================== */}
      {!verTodoElCatalogo ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
          {/* 1. PANEL IZQUIERDO: Sub-servicios e ítems de la subcategoría */}
          <div className="md:col-span-4 lg:col-span-3 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-2 px-0.5 pb-2 border-b border-zinc-100 dark:border-white/5 text-zinc-900 dark:text-white font-normal text-xs sm:text-sm">
              <span className="text-sm text-blue-600 dark:text-blue-400">←</span>
              <span className="text-base">{categoriaSeleccionadaObj?.icon || subcategoriaSeleccionadaObj?.icon || "🛢️"}</span>
              <span className="truncate">Categoría</span>
            </div>

            <div className="space-y-1.5">
              {subServiciosActuales.map((item) => {
                const isSelected = itemServicioSeleccionadoId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setItemServicioSeleccionadoId(item.id)}
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
                        {item.icon}
                      </div>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isSelected ? "text-blue-700 dark:text-blue-300 font-bold" : "text-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {item.label}
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
            </div>
          </div>

          {/* 2. PANEL CENTRAL: Catálogo y productos del ítem seleccionado */}
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
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
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
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                placeholder="Buscar en la tienda..."
                className="w-full h-9 pl-8 pr-7 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
              />
              {busquedaTexto && (
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaTexto("");
                    setProductosSeleccionadosIds([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Barra de Selección Múltiple y Acciones */}
            {busquedaTexto.trim() && productosParaMostrar.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-0.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (productosSeleccionadosIds.length === productosParaMostrar.length) {
                      setProductosSeleccionadosIds([]);
                    } else {
                      setProductosSeleccionadosIds(productosParaMostrar.map((p) => p.id));
                    }
                  }}
                  className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={
                      productosParaMostrar.length > 0 &&
                      productosSeleccionadosIds.length === productosParaMostrar.length
                    }
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                  />
                  <span>
                    {productosSeleccionadosIds.length === productosParaMostrar.length
                      ? "Deseleccionar"
                      : "Seleccionar todos"}
                  </span>
                </button>

                {productosSeleccionadosIds.length > 0 && (
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
                        : `Agregar (${productosSeleccionadosIds.length})`}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Lista de Productos (solo visible cuando el usuario busca) */}
            <div className="space-y-2">
              {!busquedaTexto.trim() ? null : productosParaMostrar.length === 0 ? (
                <div className="p-6 rounded-xl bg-zinc-50/70 dark:bg-white/[0.01] border border-dashed border-zinc-200 dark:border-white/10 text-center space-y-1.5 text-zinc-400">
                  <span className="text-xl block">🔍</span>
                  <p className="text-xs font-semibold">No se encontraron productos para esta búsqueda.</p>
                </div>
              ) : (
                productosParaMostrar.map((prod) => {
                  const isChecked = productosSeleccionadosIds.includes(prod.id);
                  const estaEnOrden = Boolean(
                    itemsOrden.some(
                      (i) => i.productId === prod.id || (i.code && prod.code && i.code === prod.code)
                    )
                  );

                  return (
                    <div
                      key={prod.id}
                      onClick={() => {
                        setProductosSeleccionadosIds((prev) =>
                          prev.includes(prod.id)
                            ? prev.filter((id) => id !== prod.id)
                            : [...prev, prod.id]
                        );
                        setManualAceiteTexto(prod.name);
                      }}
                      className={`p-2.5 sm:p-3 rounded-lg border flex items-center justify-between gap-2.5 transition-all cursor-pointer group shadow-2xs ${
                        isChecked
                          ? "bg-blue-50/80 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/50 ring-1 ring-blue-400/30"
                          : "bg-white dark:bg-white/[0.02] hover:bg-zinc-50/70 dark:hover:bg-white/[0.05] border-zinc-200 dark:border-white/10 hover:border-blue-400/50 dark:hover:border-blue-500/40"
                      }`}
                    >
                      {/* Checkbox de selección */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setProductosSeleccionadosIds((prev) =>
                            prev.includes(prod.id)
                              ? prev.filter((id) => id !== prod.id)
                              : [...prev, prod.id]
                          );
                        }}
                        className="shrink-0 p-0.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-white/20 text-blue-600 focus:ring-blue-500 cursor-pointer pointer-events-none"
                        />
                      </div>

                      <div className="w-11 h-13 sm:w-12 sm:h-14 rounded-md bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/5 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-xl">🛢️</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-[11px] sm:text-xs font-normal text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                            {prod.name}
                          </h4>
                          {estaEnOrden && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 shrink-0">
                              ✓ En orden
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {prod.lubricantBase || prod.brand || "Lubricante"} · {prod.presentation || prod.unitOfMeasure || "1 Litro"}
                        </p>
                        <div className="pt-0.5">
                          <span className="text-xs sm:text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            $ {Number(prod.price || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={agregandoId === prod.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setManualAceiteTexto(prod.name);
                          handleAgregarProductoDirecto(prod);
                        }}
                        className="h-8 px-3 rounded-lg bg-blue-100/80 hover:bg-blue-200/80 dark:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-50"
                      >
                        <span>+</span>
                        <span>{agregandoId === prod.id ? "..." : "Agregar"}</span>
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

            {/* Campo principal según la categoría */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                {configManualSegunCategoria.labelCampo}
              </label>
              <input
                type="text"
                value={manualAceiteTexto}
                onChange={(e) => setManualAceiteTexto(e.target.value)}
                placeholder={configManualSegunCategoria.placeholder}
                className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
              />
            </div>

            {/* Unidad de medida adaptada a la categoría (Desplegable moderno y minimalista) */}
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
                <span>{manualUnidad || "Unidad"}</span>
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
                  {configManualSegunCategoria.unidades.map((u) => {
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

            {/* Cantidad con step y min adaptados */}
            <div className="p-2.5 rounded-lg bg-blue-50/40 dark:bg-blue-950/20 border border-blue-300/60 dark:border-blue-500/30 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                Cantidad
              </span>
              <div className="flex items-center gap-1 bg-white dark:bg-black/40 rounded-lg border border-zinc-200 dark:border-white/10 p-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setManualCantidad((prev) =>
                      Math.max(
                        configManualSegunCategoria.minCantidad,
                        Number((prev - configManualSegunCategoria.stepCantidad).toFixed(1))
                      )
                    )
                  }
                  className="w-6 h-6 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  −
                </button>
                <input
                  type="number"
                  step={configManualSegunCategoria.stepCantidad}
                  min={configManualSegunCategoria.minCantidad}
                  value={manualCantidad}
                  onChange={(e) =>
                    setManualCantidad(
                      Math.max(
                        configManualSegunCategoria.minCantidad,
                        parseFloat(e.target.value) || 0
                      )
                    )
                  }
                  className="w-10 text-center font-mono font-bold text-xs bg-transparent text-zinc-900 dark:text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setManualCantidad((prev) =>
                      Number((prev + configManualSegunCategoria.stepCantidad).toFixed(1))
                    )
                  }
                  className="w-6 h-6 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Valor manual */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 block">
                Valor
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualPrecio}
                  onChange={(e) => setManualPrecio(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-8 pl-6 pr-2.5 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono font-bold text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
                />
              </div>
            </div>

            {/* Botones inferiores */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setManualAceiteTexto("");
                  setManualCantidad(configManualSegunCategoria.defaultCantidad);
                  setManualUnidad(configManualSegunCategoria.defaultUnidad);
                  setManualPrecio("");
                }}
                className="h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer transition-all border border-zinc-200 dark:border-white/10 shadow-2xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleGuardarAceiteManualEnPedido}
                className="h-8 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center"
              >
                Guardar en pedido
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA COMPLETA: TODA LA TIENDA Y CATÁLOGO GENERAL (Color, Porte y Diseño Taller) */
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
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                placeholder="Buscar..."
                className="w-full h-9 pl-8 pr-7 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 shadow-2xs"
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
                  {categoriasActivas.find((c) => c.id === filtroCategoriaGeneral)?.label || "Todos"}
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

                  {categoriasActivas.map((cat) => {
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
                          <span className="text-sm shrink-0">{cat.icon}</span>
                          <span className="truncate">{cat.label}</span>
                        </div>
                        {activa && <span className="text-xs">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {productosFiltrados.map((prod) => (
              <div
                key={prod.id}
                className="p-3 rounded-lg bg-white dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 hover:border-blue-400/50 dark:hover:border-blue-500/40 flex flex-col justify-between gap-2.5 transition-all shadow-2xs"
              >
                <div>
                  <div className="h-24 rounded-md bg-zinc-50 dark:bg-black/40 border border-zinc-200/80 dark:border-white/5 flex items-center justify-center p-2 mb-1.5 overflow-hidden">
                    {prod.imageUrl ? (
                      <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl">🛢️</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block truncate">
                    {prod.brand || "Marca"}
                  </span>
                  <h4 className="text-xs font-normal text-zinc-800 dark:text-zinc-200 line-clamp-2 mt-0.5 leading-snug">
                    {prod.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {prod.presentation || prod.unitOfMeasure || "1 Unidad"}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => handleAgregarProductoDirecto(prod)}
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

      {/* Navegación hacia Aviso y Firma / Cobro POS */}
      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={onIrAAvisoYFirma}
          className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shadow-xs active:scale-95 transition-all"
        >
          Siguiente (Aviso y Firma) →
        </button>
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
