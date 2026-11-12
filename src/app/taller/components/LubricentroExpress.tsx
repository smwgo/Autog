"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import ModalPresupuestoPdf from "@/components/taller/ModalPresupuestoPdf";
import ModuloLubricentroCatalogo from "./ModuloLubricentroCatalogo";
import ModuloCarWashCatalogo from "./ModuloCarWashCatalogo";
import ModuloTecnicentroCatalogo from "./ModuloTecnicentroCatalogo";

export interface LubricentroExpressProps {
  empleadoLogueado: { id: string; nombre: string };
  mecanicos?: string[];
  clientesCatalogo?: any[];
  productosCatalogo?: any[];
  serviciosCatalogo?: any[];
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
  onOrdenCreada?: (orden: any) => void;
  onCambiarATaller?: () => void;
  onCambiarModulo?: (modulo: "taller" | "lubricentro" | "carwash" | "tecnicentro") => void;
  ordenActiva?: any;
  ordenesHistorialVehiculo?: any[];
  historialVehiculo?: any[];
  modoEspecialidad?: "lubricentro" | "carwash" | "tecnicentro";
  triggerAbrirConfig?: number;
  vistaAppCarwash?: boolean;
  navegacionActiva?: boolean;
}

export interface ServicioExpressItem {
  id: string;
  name: string;
  category: "Lubricantes" | "Filtros" | "Llantera" | "Baterías" | "Lavado";
  price: number;
  type: "SERVICE" | "PART";
  empleado_id: string;
  empleado_nombre: string;
  detalles?: string;
}

const ESTADOS_LUBRICENTRO = [
  { id: "st-1", name: "01 Pendiente", color: "amber", progress: 15 },
  { id: "st-2", name: "02 En Lubricación", color: "blue", progress: 45 },
  { id: "st-3", name: "03 En Lavado", color: "rose", progress: 75 },
  { id: "st-4", name: "04 Listo para Entrega", color: "emerald", progress: 95 },
  { id: "st-5", name: "05 Entregada", color: "purple", progress: 100 },
];

export interface CategoriaConfig {
  id: string;
  label: string;
  icon: string;
}

export interface SubcategoriaConfig {
  id: string;
  label: string;
  icon: string;
}

export interface ItemPresetConfig {
  code: string;
  name: string;
  desc: string;
  icon: string;
  price: number;
  type: "SERVICE" | "PART";
}

// ============================================================================
// 1. CATEGORÍAS INDEPENDIENTES POR CADA ESPECIALIDAD (LUBRICENTRO, CAR WASH, TECNICENTRO)
// ============================================================================
export const CATEGORIAS_POR_ESPECIALIDAD: Record<
  "lubricentro" | "carwash" | "tecnicentro",
  CategoriaConfig[]
> = {
  lubricentro: [
    { id: "lub_aceite", label: "Aceite", icon: "🛢️" },
    { id: "lub_transmision", label: "Transmisión", icon: "⚙️" },
    { id: "lub_filtros", label: "Filtros", icon: "🌪️" },
    { id: "lub_fluidos", label: "Fluidos", icon: "🌡️" },
    { id: "lub_baterias", label: "Baterías", icon: "🔋" },
  ],
  carwash: [
    { id: "cw_lavados", label: "Lavados", icon: "🚿" },
    { id: "cw_interior", label: "Interior", icon: "🧽" },
    { id: "cw_pulido", label: "Pulido", icon: "✨" },
    { id: "cw_chasis", label: "Chasis", icon: "🧴" },
    { id: "cw_combos", label: "Combos", icon: "💎" },
  ],
  tecnicentro: [
    { id: "tc_llantas", label: "Llantas", icon: "🛞" },
    { id: "tc_alineacion", label: "Alineación", icon: "⚖️" },
    { id: "tc_frenos", label: "Frenos", icon: "🛑" },
    { id: "tc_suspension", label: "Suspensión", icon: "🔩" },
    { id: "tc_baterias", label: "Baterías", icon: "⚡" },
  ],
};

// ============================================================================
// 2. SUBCATEGORÍAS POR CADA CATEGORÍA DE LAS 3 ESPECIALIDADES (UNA SOLA PALABRA)
// ============================================================================
export const SUBCATEGORIAS_POR_ESPECIALIDAD: Record<string, SubcategoriaConfig[]> = {
  // --- LUBRICENTRO ---
  lub_aceite: [
    { id: "lub_aceite_motor", label: "Aceite", icon: "🛢️" },
    { id: "lub_aditivos", label: "Aditivos", icon: "🧪" },
    { id: "lub_flush", label: "Flush", icon: "🧼" },
    { id: "lub_grasa", label: "Grasa", icon: "🧴" },
  ],
  lub_transmision: [
    { id: "lub_trans_manual", label: "Manual", icon: "⚙️" },
    { id: "lub_trans_automatica", label: "ATF", icon: "🔄" },
    { id: "lub_trans_cvt", label: "CVT", icon: "⚡" },
    { id: "lub_trans_diferencial", label: "Diferencial", icon: "🔩" },
  ],
  lub_filtros: [
    { id: "lub_fil_aceite", label: "Aceite", icon: "🛢️" },
    { id: "lub_fil_aire", label: "Aire", icon: "🌪️" },
    { id: "lub_fil_cabina", label: "Cabina", icon: "❄️" },
    { id: "lub_fil_combustible", label: "Combustible", icon: "⛽" },
  ],
  lub_fluidos: [
    { id: "lub_flu_frenos", label: "Frenos", icon: "🛑" },
    { id: "lub_flu_coolant", label: "Coolant", icon: "🌡️" },
    { id: "lub_flu_hidraulico", label: "Hidráulico", icon: "🛞" },
    { id: "lub_flu_inyectores", label: "Inyectores", icon: "🧪" },
  ],
  lub_baterias: [
    { id: "lub_bat_diagnostico", label: "Diagnóstico", icon: "⚡" },
    { id: "lub_bat_nuevas", label: "Baterías", icon: "🔋" },
    { id: "lub_bat_plumas", label: "Plumas", icon: "🌧️" },
    { id: "lub_bat_lavado", label: "Lavado", icon: "🚿" },
  ],

  // --- CAR WASH ---
  cw_lavados: [
    { id: "cw_lav_express", label: "Express", icon: "🚿" },
    { id: "cw_lav_completo", label: "Completo", icon: "🌊" },
    { id: "cw_lav_motor", label: "Motor", icon: "⚙️" },
    { id: "cw_lav_especial", label: "Camionetas", icon: "🚙" },
  ],
  cw_interior: [
    { id: "cw_int_aspirado", label: "Aspirado", icon: "🧹" },
    { id: "cw_int_tapiceria", label: "Tapicería", icon: "🛋️" },
    { id: "cw_int_cuero", label: "Cuero", icon: "🧴" },
    { id: "cw_int_ozono", label: "Ozono", icon: "🌬️" },
  ],
  cw_pulido: [
    { id: "cw_pul_encerado", label: "Encerado", icon: "✨" },
    { id: "cw_pul_correccion", label: "Pulido", icon: "🌟" },
    { id: "cw_pul_faros", label: "Faros", icon: "💡" },
    { id: "cw_pul_cristales", label: "Vidrios", icon: "🪟" },
  ],
  cw_chasis: [
    { id: "cw_cha_grafito", label: "Grafito", icon: "🧴" },
    { id: "cw_cha_engrase", label: "Engrase", icon: "🔩" },
    { id: "cw_cha_motor", label: "Motor", icon: "⚙️" },
    { id: "cw_cha_llantas", label: "Llantas", icon: "🛞" },
  ],
  cw_combos: [
    { id: "cw_com_basico", label: "Básicos", icon: "🏷️" },
    { id: "cw_com_ejecutivo", label: "Ejecutivos", icon: "👔" },
    { id: "cw_com_spa", label: "Spa", icon: "👑" },
    { id: "cw_com_detail", label: "Detailing", icon: "💎" },
  ],

  // --- TECNICENTRO ---
  tc_llantas: [
    { id: "tc_lla_inspeccion", label: "Inspección", icon: "🚗" },
    { id: "tc_lla_parches", label: "Parchado", icon: "🩹" },
    { id: "tc_lla_nuevas", label: "Neumáticos", icon: "🛞" },
    { id: "tc_lla_valvulas", label: "Válvulas", icon: "🔘" },
  ],
  tc_alineacion: [
    { id: "tc_ali_computarizada", label: "Alineación", icon: "📐" },
    { id: "tc_ali_balanceo", label: "Balanceo", icon: "⚖️" },
    { id: "tc_ali_nitrogeno", label: "Nitrógeno", icon: "🔄" },
    { id: "tc_ali_combos", label: "Combos", icon: "⭐" },
  ],
  tc_frenos: [
    { id: "tc_fre_pastillas", label: "Pastillas", icon: "🟫" },
    { id: "tc_fre_discos", label: "Discos", icon: "💿" },
    { id: "tc_fre_liquido", label: "Líquido", icon: "💧" },
    { id: "tc_fre_calipers", label: "Calipers", icon: "🔧" },
  ],
  tc_suspension: [
    { id: "tc_sus_amortiguadores", label: "Amortiguadores", icon: "🔽" },
    { id: "tc_sus_terminales", label: "Terminales", icon: "↔️" },
    { id: "tc_sus_trapecios", label: "Trapecios", icon: "🔩" },
    { id: "tc_sus_direccion", label: "Dirección", icon: "🛞" },
  ],
  tc_baterias: [
    { id: "tc_bat_test", label: "Diagnóstico", icon: "⚡" },
    { id: "tc_bat_nuevas", label: "Baterías", icon: "🔋" },
    { id: "tc_bat_bornes", label: "Bornes", icon: "🔌" },
    { id: "tc_bat_inspeccion", label: "Inspección", icon: "🔍" },
  ],
};

// ============================================================================
// 3. CATÁLOGO COMPLETO DE ITEMS PRESET POR CADA SUBCATEGORÍA
// ============================================================================
export const ITEMS_POR_SUBCATEGORIA: Record<string, ItemPresetConfig[]> = {};

const CATALOGO_BASE_LUBRICENTRO = [
  { code: "LUB-001", name: "Aceite Motor 0W-20 Sintético (Galón)", price: 42, type: "PART" as const, category: "Lubricantes" },
  { code: "LUB-002", name: "Aceite Motor 5W-30 Sintético (Galón)", price: 38, type: "PART" as const, category: "Lubricantes" },
  { code: "LUB-003", name: "Aceite Motor 10W-30 Semi-Sintético (Galón)", price: 28, type: "PART" as const, category: "Lubricantes" },
  { code: "LUB-004", name: "Aceite Motor 10W-40 Semi-Sintético (Galón)", price: 28, type: "PART" as const, category: "Lubricantes" },
  { code: "LUB-005", name: "Aceite Motor 15W-40 Diésel / Gasolina", price: 26, type: "PART" as const, category: "Lubricantes" },
  { code: "LUB-006", name: "Aceite Motor 20W-50 Mineral (Galón)", price: 22, type: "PART" as const, category: "Lubricantes" },
  { code: "LUB-007", name: "Aceite Caja Manual 80W-90", price: 14, type: "PART" as const, category: "Lubricantes" },
  { code: "LUB-008", name: "Aceite Transmisión Automática (ATF)", price: 16, type: "PART" as const, category: "Lubricantes" },
  { code: "LUB-009", name: "Refrigerante / Coolant concentrado", price: 12, type: "PART" as const, category: "Lubricantes" },
  { code: "LUB-010", name: "Líquido de Frenos DOT 4", price: 8, type: "PART" as const, category: "Lubricantes" },
  { code: "FIL-001", name: "Filtro de Aceite", price: 8, type: "PART" as const, category: "Filtros" },
  { code: "FIL-002", name: "Filtro de Aire Motor", price: 12, type: "PART" as const, category: "Filtros" },
  { code: "FIL-003", name: "Filtro de Cabina (A/C)", price: 14, type: "PART" as const, category: "Filtros" },
  { code: "FIL-004", name: "Filtro de Combustible / Diésel", price: 15, type: "PART" as const, category: "Filtros" },
  { code: "LLA-001", name: "Parche de Llanta", price: 5, type: "SERVICE" as const, category: "Llantera" },
  { code: "LLA-002", name: "Vulcanizado de Llanta", price: 8, type: "SERVICE" as const, category: "Llantera" },
  { code: "LLA-003", name: "Balanceo por Rueda", price: 5, type: "SERVICE" as const, category: "Llantera" },
  { code: "LLA-004", name: "Rotación de 4 Llantas", price: 10, type: "SERVICE" as const, category: "Llantera" },
  { code: "LLA-005", name: "Alineación Computarizada", price: 20, type: "SERVICE" as const, category: "Llantera" },
  { code: "BAT-001", name: "Cambio de Batería", price: 10, type: "SERVICE" as const, category: "Baterías" },
  { code: "BAT-002", name: "Diagnóstico Batería y Alternador", price: 8, type: "SERVICE" as const, category: "Baterías" },
  { code: "BAT-003", name: "Plumas Limpiaparabrisas (Par)", price: 14, type: "PART" as const, category: "Baterías" },
  { code: "LAV-001", name: "Lavado Express Exterior", price: 6, type: "SERVICE" as const, category: "Lavado" },
  { code: "LAV-002", name: "Lavado Completo (Chasis + Motor)", price: 15, type: "SERVICE" as const, category: "Lavado" },
  { code: "LAV-003", name: "Aspirado y Limpieza Interior", price: 8, type: "SERVICE" as const, category: "Lavado" },
  { code: "LAV-004", name: "Engrase de Chasis y Pulverizado", price: 10, type: "SERVICE" as const, category: "Lavado" },
];

export default function LubricentroExpress({
  empleadoLogueado,
  mecanicos = [],
  productosCatalogo = [],
  serviciosCatalogo = [],
  mostrarToast,
  onOrdenCreada,
  onCambiarATaller,
  onCambiarModulo,
  ordenActiva,
  ordenesHistorialVehiculo = [],
  historialVehiculo = [],
  modoEspecialidad = "lubricentro",
  triggerAbrirConfig,
  vistaAppCarwash = false,
  navegacionActiva = false,
}: LubricentroExpressProps) {
  // =========================================================================
  // CONTROL DE ETAPAS (2: Servicios Express, 4: Firma)
  // =========================================================================
  const [etapaActiva, setEtapaActiva] = useState<number>(2);

  // Asegurar que al cambiar de especialidad comience siempre en el catálogo (etapa 2)
  useEffect(() => {
    setEtapaActiva(2);
  }, [modoEspecialidad]);

  // =========================================================================
  // ETAPA 1: INGRESO LUBRICENTRO (NIVEL ACEITE, KM, PRÓXIMO CAMBIO, CHECKLIST, FOTOS R2)
  // =========================================================================
  const [nivelCombustible, setNivelCombustible] = useState<string>("1/2");
  const [nivelAceiteIngreso, setNivelAceiteIngreso] = useState<string>("Normal");
  const [kmActual, setKmActual] = useState<string>("");
  const [intervaloAceite, setIntervaloAceite] = useState<number>(5000);
  const [checklistIngreso, setChecklistIngreso] = useState<string[]>([
    "Gata",
    "Llave",
    "Repuesto",
    "Matrícula",
  ]);
  const [itemManualIngreso, setItemManualIngreso] = useState<string>("");
  const [fotosRecepcion, setFotosRecepcion] = useState<string[]>([]);
  const [subiendoFotoRecepcion, setSubiendoFotoRecepcion] = useState<boolean>(false);
  const fileInputRecepcionRef = useRef<HTMLInputElement | null>(null);

  // =========================================================================
  // ETAPA 2: CATEGORÍAS Y SUBCATEGORÍAS POR ESPECIALIDAD
  // =========================================================================
  const categoriasActivas = useMemo(() => {
    return (
      CATEGORIAS_POR_ESPECIALIDAD[modoEspecialidad] ||
      CATEGORIAS_POR_ESPECIALIDAD.lubricentro
    );
  }, [modoEspecialidad]);

  const [estacionActiva, setEstacionActiva] = useState<string>(
    CATEGORIAS_POR_ESPECIALIDAD[modoEspecialidad]?.[0]?.id || "lub_aceite"
  );

  useEffect(() => {
    const cats = CATEGORIAS_POR_ESPECIALIDAD[modoEspecialidad];
    if (cats && cats.length > 0) {
      setEstacionActiva(cats[0].id);
    }
  }, [modoEspecialidad]);

  const [subCategoriaPorEstacion, setSubCategoriaPorEstacion] = useState<Record<string, string>>({
    // Lubricentro
    lub_aceite: "lub_aceite_motor",
    lub_transmision: "lub_trans_manual",
    lub_filtros: "lub_fil_aceite",
    lub_fluidos: "lub_flu_frenos",
    lub_baterias: "lub_bat_diagnostico",
    // Car Wash
    cw_lavados: "cw_lav_express",
    cw_interior: "cw_int_aspirado",
    cw_pulido: "cw_pul_encerado",
    cw_chasis: "cw_cha_grafito",
    cw_combos: "cw_com_basico",
    // Tecnicentro
    tc_llantas: "tc_lla_inspeccion",
    tc_alineacion: "tc_ali_computarizada",
    tc_frenos: "tc_fre_pastillas",
    tc_suspension: "tc_sus_amortiguadores",
    tc_baterias: "tc_bat_test",
  });

  const subCategoriasActivas = SUBCATEGORIAS_POR_ESPECIALIDAD[estacionActiva] || [];
  const subCategoriaActiva =
    subCategoriaPorEstacion[estacionActiva] || subCategoriasActivas[0]?.id;

  const [viscosidad, setViscosidad] = useState<string>("10W-30");
  const [tipoBase, setTipoBase] = useState<string>("Semi-Sintético");
  const [galonesAceite, setGalonesAceite] = useState<number>(1);
  const [ruedaSeleccionada, setRuedaSeleccionada] = useState<"DI" | "DD" | "TI" | "TD" | "REP">("DI");
  const [fotoBateriaR2, setFotoBateriaR2] = useState<string | null>(null);
  const [subiendoFotoBateria, setSubiendoFotoBateria] = useState<boolean>(false);
  const inputFotoBateriaRef = useRef<HTMLInputElement | null>(null);

  // =========================================================================
  // ETAPA 3: PRESUPUESTO / TIENDA / PROPUESTA
  // =========================================================================
  const [filtroTipoTienda, setFiltroTipoTienda] = useState<"ALL" | "SERVICE" | "PART">("ALL");
  const [busquedaTienda, setBusquedaTienda] = useState<string>("");
  const [dropdownTiendaAbierto, setDropdownTiendaAbierto] = useState<boolean>(false);
  const [modalPresupuestoPdfAbierto, setModalPresupuestoPdfAbierto] = useState<boolean>(false);
  const [mostrarModalStickerQr, setMostrarModalStickerQr] = useState<boolean>(false);

  // =========================================================================
  // ETAPA 4: AVISO Y FIRMA + PASAR A POS
  // =========================================================================
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>("02 En Lubricación");
  const [modoFirma, setModoFirma] = useState<"ACEPTACION" | "ENTREGA">("ACEPTACION");
  const [guardandoFirma, setGuardandoFirma] = useState<boolean>(false);
  const [firmaRemotaEnviada, setFirmaRemotaEnviada] = useState<boolean>(false);
  const [guardandoPasarPos, setGuardandoPasarPos] = useState<boolean>(false);
  const [modalConfirmPos, setModalConfirmPos] = useState<any | null>(null);
  const [modalYaPasadaPos, setModalYaPasadaPos] = useState<boolean>(false);
  const [modalPropuestaEnviada, setModalPropuestaEnviada] = useState<boolean>(false);

  const canvasFirmaRef = useRef<HTMLCanvasElement | null>(null);
  const dibujandoFirmaRef = useRef<boolean>(false);
  const tieneTrazosFirmaRef = useRef<boolean>(false);
  const [firmaDataUrl, setFirmaDataUrl] = useState<string | null>(null);

  // Sincronizar con ordenActiva al cambiar de vehículo
  useEffect(() => {
    if (!ordenActiva) return;
    if (ordenActiva.mileage) {
      setKmActual(String(ordenActiva.mileage));
    }
    if (ordenActiva.fuelLevel) {
      setNivelCombustible(ordenActiva.fuelLevel);
    }
    if (Array.isArray(ordenActiva.receptionInventory) && ordenActiva.receptionInventory.length > 0) {
      setChecklistIngreso(ordenActiva.receptionInventory);
    }
    if (Array.isArray(ordenActiva.receptionPhotos)) {
      setFotosRecepcion(ordenActiva.receptionPhotos);
    }
    if (ordenActiva.status) {
      setEstadoSeleccionado(ordenActiva.status);
    }
  }, [ordenActiva?.id]);

  // Polling ligero en Etapa 4 para reflejar firma remota del Panel Cliente en tiempo real
  useEffect(() => {
    if (etapaActiva !== 4 || !ordenActiva?.id) return;
    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch("/api/taller/operacion");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.autosEnPista)) {
          const fresh = data.autosEnPista.find((o: any) => o.id === ordenActiva.id);
          if (
            fresh &&
            (fresh.quoteSignatureUrl !== ordenActiva.quoteSignatureUrl ||
              fresh.deliverySignatureUrl !== ordenActiva.deliverySignatureUrl ||
              fresh.deliveryStatus !== ordenActiva.deliveryStatus ||
              fresh.quoteStatus !== ordenActiva.quoteStatus)
          ) {
            onOrdenCreada?.(fresh);
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(pollTimer);
  }, [
    etapaActiva,
    ordenActiva?.id,
    ordenActiva?.quoteSignatureUrl,
    ordenActiva?.deliverySignatureUrl,
    ordenActiva?.deliveryStatus,
    ordenActiva?.quoteStatus,
  ]);

  const kmProximoCambio = useMemo(() => {
    const numActual = parseInt(String(kmActual).replace(/[^0-9]/g, ""), 10);
    if (isNaN(numActual) || numActual <= 0) {
      return ordenActiva?.nextOilChangeKm || null;
    }
    return numActual + intervaloAceite;
  }, [kmActual, intervaloAceite, ordenActiva?.nextOilChangeKm]);

  // Sincronización con Neon DB
  const sincronizarOrdenLubricentro = async (partial: {
    items?: any[];
    mileage?: number | null;
    nextOilChangeKm?: number | null;
    inspectionChecklist?: Record<string, any>;
    receptionPhotos?: string[];
    evidencePhotos?: string[];
    receptionInventory?: string[];
    status?: string;
    fuelLevel?: string;
    notes?: string;
  }) => {
    if (!ordenActiva?.id) return null;
    try {
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACTUALIZAR_ORDEN",
          orderId: ordenActiva.id,
          items: partial.items ?? ordenActiva.items ?? [],
          mileage:
            partial.mileage !== undefined
              ? partial.mileage
              : kmActual
              ? parseInt(kmActual.replace(/[^0-9]/g, ""), 10)
              : ordenActiva.mileage,
          nextOilChangeKm:
            partial.nextOilChangeKm !== undefined ? partial.nextOilChangeKm : kmProximoCambio,
          ...(partial.inspectionChecklist !== undefined
            ? { inspectionChecklist: partial.inspectionChecklist }
            : {}),
          receptionPhotos: partial.receptionPhotos ?? fotosRecepcion,
          evidencePhotos: partial.evidencePhotos ?? ordenActiva.evidencePhotos ?? [],
          receptionInventory: partial.receptionInventory ?? checklistIngreso,
          status: partial.status ?? ordenActiva.status,
          fuelLevel: partial.fuelLevel ?? nivelAceiteIngreso,
          notes: partial.notes !== undefined ? partial.notes : ordenActiva.notes,
          startTimer: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        onOrdenCreada?.(data.activeOrder);
        return data.activeOrder;
      }
    } catch (err) {
      console.error("Error sincronizando orden lubricentro:", err);
    }
    return null;
  };

  // Subir archivo a Cloudflare R2
  const subirArchivoACloudflareR2 = async (file: File, folder: string): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/storage/upload", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (data.success && data.url) return data.url;
    throw new Error(data.error || "No se pudo subir la imagen");
  };

  const handleSubirFotoRecepcion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (fotosRecepcion.length >= 5) {
      if (fileInputRecepcionRef.current) fileInputRecepcionRef.current.value = "";
      return;
    }
    const seleccionados = Array.from(files);
    if (fileInputRecepcionRef.current) fileInputRecepcionRef.current.value = "";

    void (async () => {
      try {
        setSubiendoFotoRecepcion(true);
        const nuevos: string[] = [];
        const limite = Math.min(seleccionados.length, 5 - fotosRecepcion.length);
        for (let i = 0; i < limite; i++) {
          const url = await subirArchivoACloudflareR2(seleccionados[i], "lubricentro_recepcion");
          if (url) nuevos.push(url);
        }
        const actualizadas = [...fotosRecepcion, ...nuevos].slice(0, 5);
        setFotosRecepcion(actualizadas);
        await sincronizarOrdenLubricentro({ receptionPhotos: actualizadas });
      } catch (err: any) {
        mostrarToast(err.message || "Error al subir foto", "err");
      } finally {
        setSubiendoFotoRecepcion(false);
      }
    })();
  };

  const handleEliminarFotoRecepcion = async (index: number) => {
    const actualizadas = fotosRecepcion.filter((_, idx) => idx !== index);
    setFotosRecepcion(actualizadas);
    await sincronizarOrdenLubricentro({ receptionPhotos: actualizadas });
  };

  const handleToggleChecklistIngreso = (item: string) => {
    const nuevaLista = checklistIngreso.includes(item)
      ? checklistIngreso.filter((i) => i !== item)
      : [...checklistIngreso, item];
    setChecklistIngreso(nuevaLista);
    if (ordenActiva) {
      void sincronizarOrdenLubricentro({ receptionInventory: nuevaLista });
    }
  };

  const handleAgregarChecklistManual = () => {
    const val = itemManualIngreso.trim();
    if (!val) return;
    if (!checklistIngreso.includes(val)) {
      const nuevaLista = [...checklistIngreso, val];
      setChecklistIngreso(nuevaLista);
      if (ordenActiva) {
        void sincronizarOrdenLubricentro({ receptionInventory: nuevaLista });
      }
    }
    setItemManualIngreso("");
  };

  // =========================================================================
  // MANEJO DE ÍTEMS DE LUBRICENTRO EN LA ORDEN ACTIVA
  // =========================================================================
  const [ordenLocalBorrador, setOrdenLocalBorrador] = useState<any | null>(null);
  const ordenEfectiva = ordenActiva || ordenLocalBorrador;
  const itemsOrden: any[] = Array.isArray(ordenEfectiva?.items) ? ordenEfectiva.items : [];

  const handleActualizarItemsOrdenGenerales = async (nuevosItems: any[]) => {
    let ord = ordenActiva || ordenLocalBorrador;
    if (!ord) {
      if (mostrarToast) mostrarToast("Selecciona o abre una orden de trabajo real primero", "err");
      return;
    }
    const ordActualizada = { ...ord, items: nuevosItems };
    if (!ordenActiva) setOrdenLocalBorrador(ordActualizada);
    onOrdenCreada?.(ordActualizada);
    await sincronizarOrdenLubricentro({ items: nuevosItems });
  };

  const tieneServicioEnOrden = (codeOrKey: string, name?: string) => {
    return itemsOrden.some(
      (i) =>
        i.code === codeOrKey ||
        i.id === codeOrKey ||
        (name && i.name?.toLowerCase() === name.toLowerCase())
    );
  };

  const handleToggleItemLubricentro = async (itemConfig: {
    code: string;
    name: string;
    category: string;
    subCategory?: string;
    price: number;
    type: "SERVICE" | "PART";
    qty?: number;
  }) => {
    let ord = ordenActiva || ordenLocalBorrador;
    if (!ord) {
      if (mostrarToast) mostrarToast("Selecciona o abre una orden de trabajo real primero", "err");
      return;
    }

    const existe = itemsOrden.find(
      (i) =>
        i.code === itemConfig.code ||
        i.name?.toLowerCase() === itemConfig.name.toLowerCase()
    );

    let nuevosItems: any[];
    if (existe) {
      nuevosItems = itemsOrden.filter((i) => i.id !== existe.id);
    } else {
      const nuevo = {
        id: `lub-${itemConfig.code}-${Date.now()}`,
        type: itemConfig.type,
        category: `Lubricentro - ${itemConfig.category}`,
        subCategory: itemConfig.subCategory,
        code: itemConfig.code,
        name: itemConfig.name,
        price: itemConfig.price,
        qty: itemConfig.qty || 1,
        status: "Listo" as const,
        completed: true,
        empleado_id: empleadoLogueado.id,
        empleado_nombre: empleadoLogueado.nombre,
      };
      nuevosItems = [...itemsOrden, nuevo];
    }

    const ordActualizada = { ...ord, items: nuevosItems };
    if (!ordenActiva) setOrdenLocalBorrador(ordActualizada);
    onOrdenCreada?.(ordActualizada);
    await sincronizarOrdenLubricentro({ items: nuevosItems });
  };

  const handleSubirFotoBateriaR2 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSubiendoFotoBateria(true);
      const url = await subirArchivoACloudflareR2(file, "baterias-express");
      if (url) {
        setFotoBateriaR2(url);
        const nuevasEvidencias = [...(ordenActiva?.evidencePhotos || []), url];
        await sincronizarOrdenLubricentro({ evidencePhotos: nuevasEvidencias });
        if (!tieneServicioEnOrden("BAT-CAMBIO", "Cambio de Batería")) {
          await handleToggleItemLubricentro({
            code: "BAT-CAMBIO",
            name: "Cambio de Batería",
            category: "Baterías",
            price: 10,
            type: "SERVICE",
          });
        }
      }
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir foto", "err");
    } finally {
      setSubiendoFotoBateria(false);
    }
  };

  // Catálogo combinado para Buscador de Tienda en Etapa 3
  const catalogoTiendaCombinado = useMemo(() => {
    const map = new Map<string, any>();
    CATALOGO_BASE_LUBRICENTRO.forEach((item) => map.set(item.name.toLowerCase(), item));
    serviciosCatalogo.forEach((s: any) => {
      if (s?.name) {
        map.set(s.name.toLowerCase(), {
          code: s.code || "SRV",
          name: s.name,
          price: Number(s.price) || 12,
          type: "SERVICE" as const,
          category: s.category || "Lubricentro",
        });
      }
    });
    productosCatalogo.forEach((p: any) => {
      if (p?.name) {
        map.set(p.name.toLowerCase(), {
          id: p.id,
          code: p.code || "INS",
          name: p.name,
          price: Number(p.price) || 15,
          type: "PART" as const,
          category: p.category || "Lubricantes",
          brand: p.brand,
          stock: p.stock,
        });
      }
    });
    return Array.from(map.values());
  }, [productosCatalogo, serviciosCatalogo]);

  const handleAgregarDesdeTienda = async (item: any) => {
    if (!ordenActiva) return;
    const nuevo = {
      id: `tienda-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type: item.type || "PART",
      category: item.category || "Tienda",
      code: item.code || "LUB",
      name: item.name,
      price: Number(item.price) || 10,
      qty: 1,
      status: "Listo" as const,
      completed: true,
      productId: item.id || undefined,
      empleado_id: empleadoLogueado.id,
      empleado_nombre: empleadoLogueado.nombre,
    };
    const nuevosItems = [...itemsOrden, nuevo];
    onOrdenCreada?.({ ...ordenActiva, items: nuevosItems });
    await sincronizarOrdenLubricentro({ items: nuevosItems });
  };

  const handleEliminarItemOrden = async (itemId: string) => {
    if (!ordenActiva) return;
    const nuevosItems = itemsOrden.filter((i) => i.id !== itemId);
    onOrdenCreada?.({ ...ordenActiva, items: nuevosItems });
    await sincronizarOrdenLubricentro({ items: nuevosItems });
  };

  const handleCiclarEstadoItem = async (itemId: string) => {
    if (!ordenActiva) return;
    const ciclo: Record<string, "Pendiente" | "En Proceso" | "Listo"> = {
      Pendiente: "En Proceso",
      "En Proceso": "Listo",
      Listo: "Pendiente",
    };
    const nuevosItems = itemsOrden.map((it) =>
      it.id === itemId ? { ...it, status: ciclo[it.status] || "Listo" } : it
    );
    onOrdenCreada?.({ ...ordenActiva, items: nuevosItems });
    await sincronizarOrdenLubricentro({ items: nuevosItems });
  };

  const handleCambiarPrecioItem = async (itemId: string, nuevoPrecio: number) => {
    if (!ordenActiva) return;
    const nuevosItems = itemsOrden.map((it) =>
      it.id === itemId ? { ...it, price: Math.max(0, nuevoPrecio) } : it
    );
    onOrdenCreada?.({ ...ordenActiva, items: nuevosItems });
    await sincronizarOrdenLubricentro({ items: nuevosItems });
  };

  // Totales del Presupuesto
  const calculosPresupuesto = useMemo(() => {
    const subtotal = itemsOrden.reduce(
      (acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1),
      0
    );
    const taxRateNum = Number(ordenActiva?.quoteTaxRate ?? 15);
    const taxAmount = Number(((subtotal * taxRateNum) / 100).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));
    return { subtotal, taxRateNum, taxAmount, total };
  }, [itemsOrden, ordenActiva?.quoteTaxRate]);

  // =========================================================================
  // MANEJADORES DE ETAPA 4: ESTADO, WHATSAPP, FIRMA Y PASAR A POS
  // =========================================================================
  const handleSeleccionarEstado = async (st: { id: string; name: string; color: string; progress: number }) => {
    setEstadoSeleccionado(st.name);
    if (!ordenActiva) return;
    try {
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GUARDAR_ETAPA_6_ESTADO_AVISO",
          orderId: ordenActiva.id,
          status: st.name,
          statusColor: st.color,
          progress: st.progress,
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        onOrdenCreada?.(data.activeOrder);
      }
    } catch {}
  };

  const handleEnviarWhatsAppLubricentro = () => {
    if (!ordenActiva) return;
    const tel = (ordenActiva.clientPhone || "").replace(/[^0-9]/g, "");
    const proxKmTexto = kmProximoCambio ? `${kmProximoCambio.toLocaleString()} KM` : "según plan";
    const msg = `Hola *${ordenActiva.client || "Cliente"}*, te saludamos de *Lubricentro AutoG*.\n\n🚗 *Vehículo:* ${ordenActiva.vehicle} (${ordenActiva.plate})\n📌 *Estado Orden #${ordenActiva.orderNumber}:* ${estadoSeleccionado}\n🛢️ *Próximo cambio de aceite:* ${proxKmTexto}\n💵 *Total:* $${calculosPresupuesto.total.toFixed(2)}`;
    const url = tel
      ? `https://wa.me/${tel.startsWith("593") ? tel : `593${tel.replace(/^0/, "")}`}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Funciones del Canvas de Firma
  const obtenerCoordsCanvas = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasFirmaRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0] || e.changedTouches[0];
      return {
        x: (t.clientX - rect.left) * scaleX,
        y: (t.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const iniciarTrazoFirma = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasFirmaRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    dibujandoFirmaRef.current = true;
    tieneTrazosFirmaRef.current = true;
    const pos = obtenerCoordsCanvas(e);
    const esDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    ctx.strokeStyle = esDark ? "#38bdf8" : "#0284c7";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const moverTrazoFirma = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!dibujandoFirmaRef.current) return;
    const canvas = canvasFirmaRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = obtenerCoordsCanvas(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const terminarTrazoFirma = () => {
    if (dibujandoFirmaRef.current && canvasFirmaRef.current && tieneTrazosFirmaRef.current) {
      setFirmaDataUrl(canvasFirmaRef.current.toDataURL("image/png"));
    }
    dibujandoFirmaRef.current = false;
  };

  const limpiarCanvasFirma = () => {
    const canvas = canvasFirmaRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    tieneTrazosFirmaRef.current = false;
    setFirmaDataUrl(null);
  };

  const handleGuardarFirmaActiva = async () => {
    if (!ordenActiva) return;
    let firmaActual = firmaDataUrl;
    if (!firmaActual && canvasFirmaRef.current && tieneTrazosFirmaRef.current) {
      firmaActual = canvasFirmaRef.current.toDataURL("image/png");
      setFirmaDataUrl(firmaActual);
    }
    if (!firmaActual) return;

    try {
      setGuardandoFirma(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          modoFirma === "ACEPTACION"
            ? {
                action: "FIRMAR_PRESUPUESTO",
                orderId: ordenActiva.id,
                quoteSignatureUrl: firmaActual,
                quoteSignedBy: ordenActiva.client || "Cliente",
              }
            : {
                action: "GUARDAR_ETAPA_7_ENTREGA_FIRMA",
                orderId: ordenActiva.id,
                deliverySignatureUrl: firmaActual,
                deliverySignedBy: ordenActiva.client || "Cliente",
                deliveryStatus: "Firmado y Entregado",
                nextOilChangeKm: kmProximoCambio,
              }
        ),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        onOrdenCreada?.(data.activeOrder);
      }
    } finally {
      setGuardandoFirma(false);
    }
  };

  const handleSolicitarFirmaRemotaPanelCliente = async () => {
    if (!ordenActiva) return;
    try {
      setGuardandoFirma(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SOLICITAR_FIRMA_REMOTA_PANEL_CLIENTE",
          orderId: ordenActiva.id,
          tipoFirma: modoFirma,
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        onOrdenCreada?.(data.activeOrder);
        setFirmaRemotaEnviada(true);
        setTimeout(() => setFirmaRemotaEnviada(false), 4000);
      }
    } finally {
      setGuardandoFirma(false);
    }
  };

  const handlePasarAPosLubricentro = async (forzarReenvio = false) => {
    if (!ordenActiva) return;

    const yaEnviada =
      Boolean(ordenActiva.posRequestId) ||
      ordenActiva.status === "EN_CAJA" ||
      (ordenActiva.status || "").toLowerCase().includes("caja");

    if (yaEnviada && !forzarReenvio) {
      setModalYaPasadaPos(true);
      return;
    }

    try {
      setGuardandoPasarPos(true);
      await sincronizarOrdenLubricentro({
        nextOilChangeKm: kmProximoCambio,
      });

      const resPos = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ENVIAR_A_POS",
          orderId: ordenActiva.id,
          forceResend: forzarReenvio,
        }),
      });
      const dataPos = await resPos.json().catch(() => null);
      if (dataPos?.success && dataPos.activeOrder) {
        onOrdenCreada?.(dataPos.activeOrder);
      }
      setModalConfirmPos(dataPos?.activeOrder || ordenActiva);
    } finally {
      setGuardandoPasarPos(false);
    }
  };

  // Conteo dinámico por categoría para badges principales
  const conteoPorCategoria = useMemo(() => {
    const counts: Record<string, number> = {};
    itemsOrden.forEach((item: any) => {
      const code = item.code || "";
      const subId = item.subCategory || "";
      Object.entries(SUBCATEGORIAS_POR_ESPECIALIDAD).forEach(([catId, subList]) => {
        if (subList.some((s) => s.id === subId)) {
          counts[catId] = (counts[catId] || 0) + (item.qty || 1);
        } else {
          subList.forEach((s) => {
            const presets = ITEMS_POR_SUBCATEGORIA[s.id] || [];
            if (presets.some((p) => p.code === code)) {
              counts[catId] = (counts[catId] || 0) + (item.qty || 1);
            }
          });
        }
      });
    });
    return counts;
  }, [itemsOrden]);

  // Conteo dinámico por subcategoría para badges secundarios idéntico a Taller
  const conteoPorSubcategoria = useMemo(() => {
    const counts: Record<string, number> = {};
    itemsOrden.forEach((item: any) => {
      const code = item.code || "";
      const subId = item.subCategory;
      if (subId) {
        counts[subId] = (counts[subId] || 0) + (item.qty || 1);
      } else {
        Object.entries(ITEMS_POR_SUBCATEGORIA).forEach(([sId, presets]) => {
          if (presets.some((p) => p.code === code)) {
            counts[sId] = (counts[sId] || 0) + (item.qty || 1);
          }
        });
      }
    });
    return counts;
  }, [itemsOrden]);

  return (
    <div className="space-y-5 animate-fade-in text-zinc-900 dark:text-white">
      {/* ===================================================================
          ETAPA 2: MÓDULOS DE ESPECIALIDAD (PRE-MONTADOS PARA CAMBIO INSTANTÁNEO 0ms)
          =================================================================== */}
      {etapaActiva === 2 && (
        <>
          <div className={modoEspecialidad === "lubricentro" ? "block w-full" : "hidden"}>
            <ModuloLubricentroCatalogo
              empleadoLogueado={empleadoLogueado}
              ordenActiva={ordenEfectiva}
              ordenesAnteriores={ordenesHistorialVehiculo}
              historialAnterior={historialVehiculo}
              itemsOrden={itemsOrden}
              mostrarToast={mostrarToast}
              triggerAbrirConfig={triggerAbrirConfig}
              onActualizarItemsOrden={handleActualizarItemsOrdenGenerales}
              productosCatalogo={productosCatalogo}
              serviciosCatalogo={serviciosCatalogo}
              onGuardarDatosLubricentro={async (niveles, nextOilChangeKm, items) => {
                const inspectionChecklist = {
                  ...(ordenEfectiva?.inspectionChecklist || {}),
                  lubricentroLevels: niveles,
                };
                if (!ordenActiva?.id) {
                  if (ordenEfectiva) {
                    const updatedOrder = {
                      ...ordenEfectiva,
                      items,
                      inspectionChecklist,
                      nextOilChangeKm,
                    };
                    setOrdenLocalBorrador(updatedOrder);
                    onOrdenCreada?.(updatedOrder);
                  }
                  return;
                }

                const updatedOrder = await sincronizarOrdenLubricentro({
                  items,
                  nextOilChangeKm,
                  inspectionChecklist,
                });
                if (!updatedOrder) {
                  throw new Error("No se pudo guardar la revisión del Lubricentro.");
                }
              }}
              onIrAAnterior={onCambiarATaller}
              onIrASiguiente={() => {
                if (onCambiarModulo) onCambiarModulo("carwash");
                else setEtapaActiva(4);
              }}
              onIrAAvisoYFirma={() => setEtapaActiva(4)}
              navegacionActiva={navegacionActiva && modoEspecialidad === "lubricentro"}
            />
          </div>

          <div className={modoEspecialidad === "carwash" ? "block w-full" : "hidden"}>
            <ModuloCarWashCatalogo
              empleadoLogueado={empleadoLogueado}
              ordenActiva={ordenEfectiva}
              itemsOrden={itemsOrden}
              mostrarToast={mostrarToast}
              triggerAbrirConfig={triggerAbrirConfig}
              vistaApp={vistaAppCarwash}
              onActualizarItemsOrden={handleActualizarItemsOrdenGenerales}
              onIrAAnterior={() => {
                if (onCambiarModulo) onCambiarModulo("lubricentro");
              }}
              onIrASiguiente={() => {
                if (onCambiarModulo) onCambiarModulo("tecnicentro");
                else setEtapaActiva(4);
              }}
              onIrAAvisoYFirma={() => setEtapaActiva(4)}
              navegacionActiva={navegacionActiva && modoEspecialidad === "carwash"}
            />
          </div>

          <div className={modoEspecialidad === "tecnicentro" ? "block w-full" : "hidden"}>
            <ModuloTecnicentroCatalogo
              empleadoLogueado={empleadoLogueado}
              ordenActiva={ordenEfectiva}
              itemsOrden={itemsOrden}
              mostrarToast={mostrarToast}
              triggerAbrirConfig={triggerAbrirConfig}
              onActualizarItemsOrden={handleActualizarItemsOrdenGenerales}
              onIrAAnterior={() => {
                if (onCambiarModulo) onCambiarModulo("carwash");
              }}
              onIrAAvisoYFirma={() => setEtapaActiva(4)}
              navegacionActiva={navegacionActiva && modoEspecialidad === "tecnicentro"}
            />
          </div>
        </>
      )}

      {/* Modal Presupuesto PDF */}
      <ModalPresupuestoPdf
        abierto={modalPresupuestoPdfAbierto}
        onCerrar={() => setModalPresupuestoPdfAbierto(false)}
        tallerNombre="Auto / G"
        orden={
          ordenEfectiva
            ? {
                ...ordenEfectiva,
                workshopName: "Auto / G",
                items: itemsOrden && itemsOrden.length > 0 ? itemsOrden : ordenEfectiva.items || [],
                quoteSignatureUrl: firmaDataUrl || ordenEfectiva.quoteSignatureUrl,
              }
            : ordenActiva
        }
      />

      {/* ===================================================================
          ETAPA 4: AVISO Y FIRMA + PASAR A POS (IDÉNTICO A TALLER)
          =================================================================== */}
      {etapaActiva === 4 && (
        <div className="w-full space-y-4 animate-fade-in">
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08] space-y-4 shadow-xl">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/[0.08] pb-3">
              <h4 className="text-xs sm:text-sm font-normal text-zinc-900 dark:text-white">
                Firma
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalPresupuestoPdfAbierto(true)}
                  className="h-8 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Ver e Imprimir PDF de la Solicitud de Orden (Propuesta)"
                >
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-6 4h4" />
                  </svg>
                  <span>PDF Solicitud</span>
                </button>

                {(ordenActiva?.quoteStatus === "Aprobado" ||
                  ordenActiva?.status === "Aprobado" ||
                  ordenActiva?.quoteStatus === "ACEPTADO") && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    ✓ Aprobado
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Columna Izquierda: Estado y Aviso */}
              <div className="lg:col-span-5 space-y-3">
                <div className="p-3.5 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/5 space-y-2 shadow-xs">
                  <span className="text-xs font-normal text-zinc-700 dark:text-zinc-300 block">Estado:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ESTADOS_LUBRICENTRO.map((st, idx) => {
                      const sel =
                        estadoSeleccionado.toLowerCase() === st.name.toLowerCase() ||
                        estadoSeleccionado
                          .toLowerCase()
                          .includes(st.name.toLowerCase().replace(/^\d+\s*/, ""));

                      const coloresActivoPorIndice = [
                        "bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-500/25 dark:text-amber-200 dark:border-amber-400/60 ring-1 ring-amber-400/40 font-normal shadow-sm",
                        "bg-blue-100 text-blue-800 border-blue-400 dark:bg-blue-500/25 dark:text-blue-200 dark:border-blue-400/60 ring-1 ring-blue-400/40 font-normal shadow-sm",
                        "bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-500/25 dark:text-rose-200 dark:border-rose-400/60 ring-1 ring-rose-400/40 font-normal shadow-sm",
                        "bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400/60 ring-1 ring-emerald-400/40 font-normal shadow-sm",
                        "bg-purple-100 text-purple-800 border-purple-400 dark:bg-purple-500/25 dark:text-purple-200 dark:border-purple-400/60 ring-1 ring-purple-400/40 font-normal shadow-sm",
                      ];
                      const estiloActivo = coloresActivoPorIndice[idx % coloresActivoPorIndice.length];
                      const estiloPlomo =
                        "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.03] dark:hover:bg-white/[0.07] text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 border border-zinc-200 dark:border-white/10 font-normal";

                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleSeleccionarEstado(st)}
                          className={`px-2 py-1.5 rounded-lg text-xs border transition-all cursor-pointer text-center active:scale-95 ${
                            sel ? estiloActivo : estiloPlomo
                          }`}
                        >
                          {st.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Aviso WhatsApp */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/5 space-y-2 shadow-xs">
                  <span className="text-xs font-normal text-zinc-700 dark:text-zinc-300 block">Aviso:</span>
                  <button
                    type="button"
                    onClick={handleEnviarWhatsAppLubricentro}
                    className="w-full h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-normal transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <span>💬</span>
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Columna Derecha: Doble Firma (Presupuesto / Entrega) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="p-3.5 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-white/5 pb-2.5">
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setModoFirma("ACEPTACION");
                          limpiarCanvasFirma();
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-normal transition-all cursor-pointer ${
                          modoFirma === "ACEPTACION"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                        }`}
                      >
                        Presupuesto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModoFirma("ENTREGA");
                          limpiarCanvasFirma();
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-normal transition-all cursor-pointer ${
                          modoFirma === "ENTREGA"
                            ? "bg-teal-600 text-white shadow-sm"
                            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                        }`}
                      >
                        Entrega
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={limpiarCanvasFirma}
                      className="text-[11px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>

                  {(() => {
                    const firmaGuardadaUrl =
                      modoFirma === "ACEPTACION"
                        ? ordenActiva?.quoteSignatureUrl
                        : ordenActiva?.deliverySignatureUrl;
                    const firmaSolicitadaPanel =
                      modoFirma === "ACEPTACION"
                        ? ordenActiva?.quoteStatus === "Pendiente Firma en Panel Cliente"
                        : ordenActiva?.deliveryStatus === "Pendiente Firma en Panel Cliente";

                    return (
                      <>
                        <div className="h-40 rounded-xl bg-zinc-50 dark:bg-[#0a0a0c] border border-dashed border-zinc-300 dark:border-white/10 relative overflow-hidden flex items-center justify-center">
                          {firmaGuardadaUrl && !tieneTrazosFirmaRef.current ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-white/95 relative">
                              <img
                                src={firmaGuardadaUrl}
                                alt="Firma del Cliente"
                                className="max-h-28 max-w-full object-contain"
                              />
                              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 text-[10px] font-bold">
                                ✓ Firmado por Cliente
                              </span>
                            </div>
                          ) : (
                            <>
                              <canvas
                                ref={canvasFirmaRef}
                                width={480}
                                height={160}
                                onMouseDown={iniciarTrazoFirma}
                                onMouseMove={moverTrazoFirma}
                                onMouseUp={terminarTrazoFirma}
                                onMouseLeave={terminarTrazoFirma}
                                onTouchStart={iniciarTrazoFirma}
                                onTouchMove={moverTrazoFirma}
                                onTouchEnd={terminarTrazoFirma}
                                className="w-full h-full cursor-crosshair touch-none select-none"
                              />
                              {!tieneTrazosFirmaRef.current && (
                                <div className="absolute pointer-events-none text-zinc-400 dark:text-zinc-500 text-xs font-mono text-center px-3">
                                  {firmaSolicitadaPanel
                                    ? "📲 Esperando firma del cliente en su Panel Cliente..."
                                    : modoFirma === "ACEPTACION"
                                    ? "[Firma presupuesto]"
                                    : "[Firma entrega]"}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleGuardarFirmaActiva}
                            disabled={guardandoFirma}
                            className="h-9 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 dark:bg-white/10 dark:hover:bg-white/15 dark:border-transparent dark:text-white text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <span>💾 {guardandoFirma ? "Guardando..." : "Guardar"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSolicitarFirmaRemotaPanelCliente}
                            disabled={guardandoFirma}
                            className={`h-9 px-3 rounded-xl border text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 ${
                              firmaRemotaEnviada || firmaSolicitadaPanel
                                ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500/40 dark:text-blue-300"
                                : "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:text-zinc-300"
                            }`}
                          >
                            <span>
                              {firmaRemotaEnviada || firmaSolicitadaPanel
                                ? "✓ En Panel Cliente"
                                : "📲 Firma remota"}
                            </span>
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Pie: Pasar a Propuesta */}
            <div className="pt-3 border-t border-zinc-200 dark:border-white/[0.08] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEtapaActiva(2)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 dark:bg-white/5 dark:hover:bg-white/10 dark:border-transparent dark:text-zinc-300 text-xs font-normal cursor-pointer"
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={guardandoFirma}
                onClick={async () => {
                  let ord = ordenActiva || ordenLocalBorrador;
                  if (!ord) {
                    mostrarToast("No hay orden activa para pasar a propuesta", "err");
                    return;
                  }
                  setGuardandoFirma(true);
                  try {
                    let firmaDataUrl: string | undefined;
                    if (tieneTrazosFirmaRef.current && canvasFirmaRef.current) {
                      firmaDataUrl = canvasFirmaRef.current.toDataURL("image/png");
                    }
                    const res = await fetch("/api/taller/operacion", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "PASAR_A_PROPUESTA",
                        orderId: ord.id,
                        orderNumber: ord.orderNumber,
                        plate: ord.plate,
                        vehicle: ord.vehicle,
                        client: ord.client || ord.clientName || "Cliente Mostrador",
                        clientPhone: ord.clientPhone || "",
                        items: ord.items || [],
                        services: ord.services || [],
                        notes: ord.notes || "",
                        totalCost: ord.totalCost,
                        quoteStatus: "Pendiente",
                        quoteSignatureUrl: modoFirma === "ACEPTACION" ? firmaDataUrl : undefined,
                        deliverySignatureUrl: modoFirma === "ENTREGA" ? firmaDataUrl : undefined,
                        signedBy: ord.client || "Cliente",
                        nextOilChangeKm: kmProximoCambio ? Number(kmProximoCambio) : undefined,
                      }),
                    });
                    const data = await res.json();
                    if (data.success && data.activeOrder) {
                      onOrdenCreada?.(data.activeOrder);
                      setModalPropuestaEnviada(true);
                    } else {
                      mostrarToast(data.error || "No se pudo procesar la propuesta", "err");
                    }
                  } catch (err) {
                    console.error("Error al pasar a propuesta:", err);
                    mostrarToast("Error al conectar con la base de datos", "err");
                  } finally {
                    setGuardandoFirma(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-700 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 dark:border-sky-500/35 dark:text-sky-300 text-xs font-normal backdrop-blur-sm transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="Presupuesto"
              >
                <span>📋</span>
                <span>Presupuesto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL FLOTANTE CONFIRMACIÓN DE ENVÍO DE PROPUESTA (SE QUEDA AQUÍ MISMO)
          =================================================================== */}
      {modalPropuestaEnviada && (
        <div
          onClick={() => setModalPropuestaEnviada(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-emerald-500/30 rounded-2xl max-w-xs w-full p-5 space-y-3 text-center shadow-2xl animate-scale-up"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-xl font-bold shadow-lg shadow-emerald-500/10">
              ✓
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Su propuesta fue enviada
              </h3>
              <p className="text-xs text-zinc-400">
                Placa <strong className="text-zinc-200 font-mono">{ordenActiva?.plate || "registrada"}</strong>
              </p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setModalPropuestaEnviada(false)}
                className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-600/30"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL FLOTANTE CONFIRMACIÓN DE ENVÍO A POS (SE MANTIENE EN EL PANEL)
          =================================================================== */}
      {modalConfirmPos && (
        <div
          onClick={() => setModalConfirmPos(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-white/10 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-white">
              Se ha enviado la orden con éxito
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Placa <strong className="text-zinc-200 font-mono">{ordenActiva?.plate}</strong> • Orden{" "}
              <strong className="text-emerald-400 font-mono">
                #{String(ordenActiva?.orderNumber || "").replace(/^(?:OT|LUB)-\d{4}-/i, "")}
              </strong>{" "}
              transferida a POS.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setModalConfirmPos(null)}
                className="w-full h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-semibold cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Advertencia: Orden ya pasada a POS */}
      {modalYaPasadaPos && ordenActiva && (
        <div
          onClick={() => setModalYaPasadaPos(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111113] border border-amber-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center text-xl shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Esta orden ya se pasó a POS
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Placa <strong className="text-zinc-200 font-mono">{ordenActiva.plate}</strong> • Orden{" "}
                  <strong className="text-amber-400 font-mono">
                    #{String(ordenActiva.orderNumber || "").replace(/^(?:OT|LUB)-\d{4}-/i, "")}
                  </strong>
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Si agregaste más lubricantes o servicios y deseas enviarla otra vez, se reenviará a POS para su cobro.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setModalYaPasadaPos(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setModalYaPasadaPos(false);
                  await handlePasarAPosLubricentro(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer"
              >
                🚀 Reenviar a POS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: STICKER TÉRMICO CON QR PARA PARABRISAS (PRÓXIMO CAMBIO)
          =================================================================== */}
      {mostrarModalStickerQr && (
        <div
          onClick={() => setMostrarModalStickerQr(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#111113] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                <h3 className="text-sm font-bold text-white">Sticker QR Próximo Cambio</h3>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalStickerQr(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white text-black font-sans space-y-3 border border-slate-300">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                    LUBRICENTRO
                  </span>
                  <strong className="text-sm font-black">AutoG Service</strong>
                </div>
                <span className="font-mono text-xs font-bold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                  {ordenActiva?.plate || "PLACA"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">KM ACTUAL</span>
                  <strong className="font-mono text-xs text-slate-800">
                    {kmActual ? `${Number(kmActual).toLocaleString()} KM` : "N/D"}
                  </strong>
                </div>
                <div className="border-l border-slate-200 pl-2.5">
                  <span className="text-[10px] font-black uppercase text-amber-700 block">PRÓXIMO CAMBIO</span>
                  <strong className="font-mono text-sm font-black text-slate-900">
                    {kmProximoCambio ? `${kmProximoCambio.toLocaleString()} KM` : "N/D"}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Lubricante:</span>
                <strong className="text-slate-900">
                  {viscosidad} {tipoBase}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer"
              >
                🖨️ Imprimir Sticker
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
