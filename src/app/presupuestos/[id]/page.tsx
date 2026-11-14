"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import CatalogoProductosServiciosTaller from "@/components/taller/CatalogoProductosServiciosTaller";

// ============================================================================
// INTERFACES & CONSTANTES
// ============================================================================

export type EspecialidadTipo = "TALLER" | "LUBRICENTRO" | "CARWASH" | "TECNICENTRO";

export const OPCIONES_TIEMPO_RAPIDO = [
  { id: "Inmediato", label: "Inmediato" },
  { id: "15m", label: "15m" },
  { id: "30m", label: "30m" },
  { id: "45m", label: "45m" },
  { id: "1h", label: "1h" },
  { id: "2h", label: "2h" },
  { id: "Hoy", label: "Hoy" },
  { id: "Mañana", label: "Mañana" },
  { id: "24h", label: "24h" },
  { id: "48h", label: "48h" },
];

export const OPCIONES_ENVIO_RAPIDO = [
  { id: "Motorizado", label: "Motorizado", icon: "🛵" },
  { id: "Transporte", label: "Transporte", icon: "🚚" },
  { id: "Encomienda", label: "Encomienda", icon: "📦" },
  { id: "Courier", label: "Courier", icon: "✈️" },
  { id: "Retiro", label: "Retiro", icon: "🏪" },
];

export const SERVICIOS_RAPIDOS_POR_ESPECIALIDAD: Record<
  EspecialidadTipo,
  Array<{ nombre: string; precio: number }>
> = {
  TALLER: [
    { nombre: "Cambio de aceite", precio: 10 },
    { nombre: "Cambio de amortiguadores delanteros", precio: 25 },
    { nombre: "Cambio de amortiguadores posteriores", precio: 20 },
    { nombre: "Cambio de ruliman delantero", precio: 20 },
    { nombre: "Cambio de ruliman posterior", precio: 20 },
    { nombre: "Cambio de aceite de caja", precio: 10 },
    { nombre: "Cambio de aceite corona", precio: 10 },
    { nombre: "Lavado completo", precio: 12 },
    { nombre: "Lavado completo mas grafito", precio: 15 },
    { nombre: "Lavado exterior", precio: 6 },
    { nombre: "Aspirador interior", precio: 5 },
    { nombre: "Limpieza tapicería más lavado", precio: 45 },
    { nombre: "Lavado chasis", precio: 10 },
    { nombre: "Alineación", precio: 15 },
    { nombre: "Balanceo", precio: 12 },
    { nombre: "Rotación", precio: 8 },
    { nombre: "Corrección caída", precio: 20 },
    { nombre: "Corrección camber", precio: 20 },
    { nombre: "Corrección caster", precio: 20 },
  ],
  LUBRICENTRO: [
    { nombre: "Cambio de aceite", precio: 10 },
    { nombre: "Cambio de aceite de caja", precio: 10 },
    { nombre: "Cambio de aceite corona", precio: 10 },
    { nombre: "Lavado completo", precio: 12 },
    { nombre: "Lavado completo mas grafito", precio: 15 },
  ],
  CARWASH: [
    { nombre: "Lavado completo", precio: 12 },
    { nombre: "Lavado completo mas grafito", precio: 15 },
    { nombre: "Lavado exterior", precio: 6 },
    { nombre: "Aspirador interior", precio: 5 },
    { nombre: "Limpieza tapicería más lavado", precio: 45 },
    { nombre: "Lavado chasis", precio: 10 },
  ],
  TECNICENTRO: [
    { nombre: "Alineación", precio: 15 },
    { nombre: "Balanceo", precio: 12 },
    { nombre: "Rotación", precio: 8 },
    { nombre: "Corrección caída", precio: 20 },
    { nombre: "Corrección camber", precio: 20 },
    { nombre: "Corrección caster", precio: 20 },
  ],
};

interface ItemPropuesta {
  id: string;
  findingId?: string | null;
  productId?: string | null;
  code?: string;
  name: string;
  category?: string;
  presentation?: string;
  qty: number;
  costPrice: number;
  price: number;
  subtotalVenta: number;
  subtotalCosto: number;
  margin: number;
  marginPercent: number;
  supplierId?: string | null;
  supplierName?: string;
  supplierPhone?: string;
  purchaseStatus?: string;
  notes?: string;
  danio?: string;
  descripcion?: string;
  inStock?: boolean; // true = sí hay en bodega taller, false = pedir a proveedor externo
  isManual?: boolean;
  origin?: EspecialidadTipo;
  imageUrl?: string | null;
  fotos?: string[];
  audios?: any[];
  supplierAvailability?: "PENDIENTE" | "SI_HAY" | "NO_HAY" | null;
  supplierPrice?: number | null;
  deliveryTime?: string | null;
  shippingMethod?: string | null;
  supplierNotes?: string | null;
  supplierRespondedAt?: string | null;
}

interface ServicioPropuesta {
  id: string;
  findingId?: string | null;
  code?: string;
  name: string;
  category?: string;
  qty?: number;
  costPrice?: number;
  price: number;
  estimatedMinutes?: number;
  mechanic?: string;
  origin?: EspecialidadTipo;
  notes?: string;
  danio?: string;
  descripcion?: string;
  isManual?: boolean;
  inStock?: boolean;
  imageUrl?: string | null;
  fotos?: string[];
  audios?: any[];
  supplierId?: string | null;
  supplierName?: string;
  supplierPhone?: string;
  purchaseStatus?: string;
  supplierAvailability?: "PENDIENTE" | "SI_HAY" | "NO_HAY" | null;
  supplierPrice?: number | null;
  deliveryTime?: string | null;
  shippingMethod?: string | null;
  supplierNotes?: string | null;
  supplierRespondedAt?: string | null;
}

interface EvidenciaItem {
  id: string;
  type: "image" | "video" | "audio";
  url: string;
  mimeType: string;
  durationSeconds?: number | null;
  transcriptionText?: string | null;
  uploadedBy?: string | null;
  createdAt?: string | null;
}

interface OrdenDetalleCompleta {
  id: string;
  orderNumber: string;
  vehicle: string;
  plate: string;
  client: string;
  clientPhone?: string;
  clientIdDoc?: string;
  mechanic: string;
  status: string;
  progress: number;
  mileage?: number | string | null;
  fuelLevel?: string | null;
  notes?: string;
  dateIn?: string;
  createdAt?: any;
  quoteNumber: string;
  quoteStatus: string;
  quoteApprovedAt?: string | null;
  quoteTaxRate?: number;
  quoteDiscount?: number;
  items: ItemPropuesta[];
  services: ServicioPropuesta[];
  evidencias: EvidenciaItem[];
  photos?: string[];
  evidencePhotos?: string[];
  receptionPhotos?: string[];
  clientPhoto?: string | null;
  vehiclePhoto?: string | null;
  customerId?: string | null;
  vehicleId?: string | null;
  customerType?: string | null;
  previousVisitsCount?: number;
  isFirstVisit?: boolean;
  inspectionFindings?: any[];
  receptionInventory?: any[];
}

function deducirEspecialidad(nombre: string, categoria: string = ""): EspecialidadTipo {
  const texto = `${nombre} ${categoria}`.toLowerCase();
  if (texto.includes("aceite") || texto.includes("lubric") || texto.includes("valvulina") || texto.includes("filtro de aceite")) {
    return "LUBRICENTRO";
  }
  if (texto.includes("lavado") || texto.includes("carwash") || texto.includes("car wash") || texto.includes("detailing") || texto.includes("cera") || texto.includes("shampoo")) {
    return "CARWASH";
  }
  if (texto.includes("llanta") || texto.includes("neumat") || texto.includes("alineac") || texto.includes("balanceo") || texto.includes("bater")) {
    return "TECNICENTRO";
  }
  return "TALLER";
}

function renderBadgeEspecialidad(origen?: EspecialidadTipo) {
  switch (origen) {
    case "LUBRICENTRO":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300">
          <span>🛢️</span>
          <span>Lubricentro</span>
        </span>
      );
    case "CARWASH":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal bg-cyan-500/15 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
          <span>🚿</span>
          <span>Car Wash</span>
        </span>
      );
    case "TECNICENTRO":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
          <span>⚙️</span>
          <span>Tecnicentro</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-normal bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300">
          <span>🔧</span>
          <span>Taller</span>
        </span>
      );
  }
}

function formatoPrimeraMayuscula(texto?: string): string {
  if (!texto) return "";
  const str = String(texto).trim();
  if (!str) return "";
  const res = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  return res.replace(/\(([a-záéíóúñ])/gi, (m) => m.toUpperCase());
}

function clasificarItem(it: any): {
  modulo: "Taller" | "Lubricentro" | "Car Wash" | "Tecnicentro";
  moduloIcon: string;
  subcategoria: string;
} {
  const cat = String(it.category || "").toLowerCase();
  const sub = String(it.subCategory || it.subcategory || "").toLowerCase();
  const name = String(it.name || "").toLowerCase();
  const id = String(it.id || "").toLowerCase();

  // 1. Tecnicentro
  if (
    cat.includes("tecnicentro") ||
    sub.includes("tecnicentro") ||
    id.startsWith("tc_") ||
    name.match(/llanta|alineaci[ón]|balanceo|camber|enllanta|vulcaniz|parche|aro |rin |pit[ón]|v[áa]lvula|pastilla|disco.*freno|zapata|rectific|suspensi[ón]|amortiguador|terminal.*direcci[ón]|r[ót]ula|buje|bater[íi]a|borne/i)
  ) {
    let subCat = "Servicios";
    if (name.match(/llanta|aro |rin /i) || cat.includes("llanta")) subCat = "Llantas";
    else if (name.match(/alineaci[ón]|balanceo|camber|rotaci[ón]/i) || cat.includes("alineacion")) subCat = "Alineación y Balanceo";
    else if (name.match(/enllanta|parche|vulcaniz|nitr[óo]geno|v[áa]lvula/i) || cat.includes("enllantaje")) subCat = "Enllantaje";
    else if (name.match(/freno|pastilla|disco|zapata/i) || cat.includes("frenos")) subCat = "Frenos";
    else if (name.match(/suspensi|amortiguador|terminal|r[ót]ula|buje|mesa/i) || cat.includes("suspension")) subCat = "Suspensión y Dirección";
    else if (name.match(/bater[íi]a|borne/i) || cat.includes("bateria")) subCat = "Baterías";
    else if (it.subCategory) subCat = String(it.subCategory);
    else if (it.category && !cat.includes("tecnicentro")) subCat = String(it.category);

    return { modulo: "Tecnicentro", moduloIcon: "⚡", subcategoria: subCat };
  }

  // 2. Car Wash
  if (
    cat.includes("car wash") ||
    cat.includes("carwash") ||
    cat.includes("lavado") ||
    sub.includes("car wash") ||
    sub.includes("carwash") ||
    id.startsWith("cw_") ||
    name.match(/lavado|aspirado|tapicer[íi]a|grafitado|chasis|cera|encerado|pulido|detailing|ozono|desengrase|shampoo|ambientador/i)
  ) {
    let subCat = "Lavado";
    if (name.match(/chasis|grafitado|desengrase/i) || cat.includes("chasis")) subCat = "Chasis y Motor";
    else if (name.match(/aspirado|tapicer[íi]a|cuero|techo|ozono|interior/i) || cat.includes("interior")) subCat = "Interior y Tapicería";
    else if (name.match(/cera|encerado|pulido|faro|gotaseca|detailing/i) || cat.includes("detailing")) subCat = "Detailing y Pulido";
    else if (name.match(/aroma|silicona|shampoo|toalla|insumo|producto/i) || cat.includes("extra")) subCat = "Insumos y Extras";
    else if (it.subCategory && it.subCategory !== "Car Wash") subCat = String(it.subCategory);
    else if (it.category && !cat.includes("car")) subCat = String(it.category);

    return { modulo: "Car Wash", moduloIcon: "🧼", subcategoria: subCat };
  }

  // 3. Lubricentro
  if (
    cat.includes("lubricentro") ||
    id.startsWith("lub_") ||
    name.match(/aceite|filtro|valvulina|refrigerante|l[íi]quido.*freno|flush|aditivo|10w|20w|5w|0w|sint[ée]tico|mineral/i)
  ) {
    let subCat = "Mantenimiento";
    if (name.match(/aceite|lubricante|10w|20w|5w|0w|motor/i) || cat.includes("aceite")) subCat = "Aceites";
    else if (name.match(/filtro/i) || cat.includes("filtro")) subCat = "Filtros";
    else if (name.match(/refrigerante|freno|hidr[áa]ulico|fluido/i) || cat.includes("fluido")) subCat = "Fluidos y Refrigerantes";
    else if (name.match(/transmisi[ón]|atf|cvt|caja|diferencial/i) || cat.includes("transmision")) subCat = "Transmisión";
    else if (name.match(/aditivo|flush|limpiador/i)) subCat = "Aditivos";
    else if (it.category && it.category.includes("-")) subCat = it.category.split("-")[1].trim();
    else if (it.subCategory) subCat = String(it.subCategory);

    return { modulo: "Lubricentro", moduloIcon: "🛢️", subcategoria: subCat };
  }

  // 4. Taller
  let subCat = "Mecánica General";
  if (cat.includes("repuesto") || it.type === "PART") subCat = "Repuestos y Partes";
  else if (it.subCategory) subCat = String(it.subCategory);
  else if (it.category && !cat.includes("taller")) subCat = String(it.category);

  return { modulo: "Taller", moduloIcon: "🔧", subcategoria: subCat };
}

export default function PaginaDetallePropuesta() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [orden, setOrden] = useState<OrdenDetalleCompleta | null>(null);
  const [proveedores, setProveedores] = useState<any[]>([]);

  // Estado editable de repuestos, servicios y notas
  const [repuestos, setRepuestos] = useState<ItemPropuesta[]>([]);
  const [servicios, setServicios] = useState<ServicioPropuesta[]>([]);
  const [notasFactura, setNotasFactura] = useState("");
  const [porcentajeIva, setPorcentajeIva] = useState(15);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);

  // Notificaciones y modales
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [autorizando, setAutorizando] = useState(false);
  const [modalWhatsApp, setModalWhatsApp] = useState(false);
  const [modalNuevoRepuesto, setModalNuevoRepuesto] = useState(false);
  const [modalNuevoServicio, setModalNuevoServicio] = useState(false);

  // Modal de Envío a Proveedores (Individual y Masivo)
  const [modalProveedor, setModalProveedor] = useState<{
    abierto: boolean;
    modo: "MASIVO" | "INDIVIDUAL";
    item?: any;
    pin?: any;
  }>({ abierto: false, modo: "MASIVO" });
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<any | null>(null);
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [telefonoManualProveedor, setTelefonoManualProveedor] = useState("");
  const [hallazgoActivoParaAsignar, setHallazgoActivoParaAsignar] = useState<any | null>(null);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const [esAprobadoLocal, setEsAprobadoLocal] = useState<boolean | null>(null);
  const [esPagadoLocal, setEsPagadoLocal] = useState<boolean | null>(null);
  const [esPausadoLocal, setEsPausadoLocal] = useState<boolean | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoFotoCliente, setSubiendoFotoCliente] = useState(false);
  const [subiendoFotoVehiculoPrincipal, setSubiendoFotoVehiculoPrincipal] = useState(false);
  const [fotoVehiculoError, setFotoVehiculoError] = useState(false);
  const [fotoClienteError, setFotoClienteError] = useState(false);

  // Modales flotantes minimalistas de fotos y audios por evidencia
  const [flotanteFotos, setFlotanteFotos] = useState<{
    pin: any;
    fotos: string[];
    fotoActivaIdx: number;
  } | null>(null);

    // Estado dinámico por línea: DETALLES -> MANUAL -> PROVEEDOR (o regresar)
  const [modosLineas, setModosLineas] = useState<Record<string, "DETALLES" | "MANUAL" | "PROVEEDOR">>({});

  const avanzarModoLinea = (itemId: string) => {
    setModosLineas((prev) => {
      const actual = prev[itemId] || "DETALLES";
      const siguiente =
        actual === "DETALLES"
          ? "MANUAL"
          : actual === "MANUAL"
          ? "PROVEEDOR"
          : "DETALLES";
      return { ...prev, [itemId]: siguiente };
    });
  };

  const retrocederModoLinea = (itemId: string) => {
    setModosLineas((prev) => {
      const actual = prev[itemId] || "DETALLES";
      const anterior =
        actual === "PROVEEDOR"
          ? "MANUAL"
          : actual === "MANUAL"
          ? "DETALLES"
          : "PROVEEDOR";
      return { ...prev, [itemId]: anterior };
    });
  };

  const [flotanteAudios, setFlotanteAudios] = useState<{
    pin: any;
    audios: any[];
  } | null>(null);

  // Modales de Detalles y Manual Técnico por evidencia
  const [flotanteDetalles, setFlotanteDetalles] = useState<{
    pin: any;
    sec: any;
  } | null>(null);

  const [flotanteManual, setFlotanteManual] = useState<{
    pin: any;
    sec: any;
  } | null>(null);

  const handleAbrirFlotanteFotos = (pin: any) => {
    const list: string[] = [];
    if (Array.isArray(pin.fotos) && pin.fotos.length > 0) {
      list.push(...pin.fotos);
    }
    if (Array.isArray(pin.photoUrls) && pin.photoUrls.length > 0) {
      list.push(...pin.photoUrls);
    } else if (pin.photoUrl) {
      list.push(pin.photoUrl);
    }
    if (pin.imageUrl) {
      list.push(pin.imageUrl);
    }
    if (list.length === 0 && orden?.evidencias) {
      const imgEvs = orden.evidencias.filter((e) => e.type === "image").map((e) => e.url);
      list.push(...imgEvs);
    }
    if (list.length === 0 && Array.isArray(orden?.receptionPhotos)) {
      list.push(...orden.receptionPhotos);
    }
    if (list.length === 0 && Array.isArray(orden?.evidencePhotos)) {
      list.push(...orden.evidencePhotos);
    }
    if (list.length === 0 && Array.isArray(fotosVehiculo) && fotosVehiculo.length > 0) {
      list.push(...fotosVehiculo);
    }
    const fotosUnicas = Array.from(new Set(list.filter(Boolean)));
    setFlotanteFotos({
      pin,
      fotos: fotosUnicas,
      fotoActivaIdx: 0,
    });
  };

  const handleAbrirFlotanteAudios = (pin: any) => {
    const list: any[] = [];
    if (Array.isArray(pin.audios) && pin.audios.length > 0) {
      pin.audios.forEach((aud: any, idx: number) => {
        if (typeof aud === "string") {
          list.push({ id: `item-aud-${idx}`, url: aud, transcriptionText: pin.transcriptionText || null });
        } else if (aud && aud.url) {
          list.push(aud);
        }
      });
    }
    if (pin.audioUrl) {
      list.push({
        id: `pin-aud-${pin.id}`,
        url: pin.audioUrl,
        transcriptionText: pin.transcriptionText || null,
        durationSeconds: pin.durationSeconds || null,
      });
    }
    if (Array.isArray(pin.voiceNotes) && pin.voiceNotes.length > 0) {
      list.push(...pin.voiceNotes);
    }
    if (orden?.evidencias) {
      const audEvs = orden.evidencias.filter((e) => e.type === "audio");
      for (const ae of audEvs) {
        if (!list.some((it) => it.url === ae.url || it.id === ae.id)) {
          list.push(ae);
        }
      }
    }
    setFlotanteAudios({
      pin,
      audios: list,
    });
  };

  // Navegación por tarjetas deslizables e indicadores de verificación inteligente
  const [tarjetaActiva, setTarjetaActiva] = useState<number>(0);
  const [verificadosIds, setVerificadosIds] = useState<Record<string, boolean>>({});
  const [areasVerificadas, setAreasVerificadas] = useState<Record<string, boolean>>({});
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Barra de ingreso rápido moderno (igual que en Taller) + Catálogo + Accesos Rápidos + Tiempo/Envío
  const [descripcionRapida, setDescripcionRapida] = useState("");
  const [tipoRapido, setTipoRapido] = useState<"SERVICE" | "PART">("PART");
  const [enStockRapido, setEnStockRapido] = useState<boolean>(false);
  const [tiempoRapido, setTiempoRapido] = useState<string>("");
  const [fotosBorradorRapido, setFotosBorradorRapido] = useState<string[]>([]);
  const [audiosBorradorRapido, setAudiosBorradorRapido] = useState<string[]>([]);
  const [subiendoMediaRapido, setSubiendoMediaRapido] = useState(false);
  const [modalCatalogoTallerAbierto, setModalCatalogoTallerAbierto] = useState<{
    abierto: boolean;
    origen: EspecialidadTipo;
    pin?: any;
  }>({ abierto: false, origen: "TALLER" });
  const [modalAccesosRapidosAbierto, setModalAccesosRapidosAbierto] = useState<{
    abierto: boolean;
    origen: EspecialidadTipo;
  }>({ abierto: false, origen: "TALLER" });
  const [busquedaAccesoRapido, setBusquedaAccesoRapido] = useState("");
  const [itemTiempoEnvioModal, setItemTiempoEnvioModal] = useState<{
    id: string;
    isService: boolean;
  } | null>(null);

  const toggleVerificadoItem = (itemId: string) => {
    setVerificadosIds((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const toggleAreaVerificada = (areaKey: string) => {
    setAreasVerificadas((prev) => ({ ...prev, [areaKey]: !prev[areaKey] }));
  };

  // Formulario rápido para nuevo repuesto
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevoCategoria, setNuevoCategoria] = useState("");
  const [nuevoProductId, setNuevoProductId] = useState<string | null>(null);
  const [nuevoCosto, setNuevoCosto] = useState("0");
  const [nuevoPvp, setNuevoPvp] = useState("0");
  const [nuevaCantidad, setNuevaCantidad] = useState("1");
  const [nuevoOrigen, setNuevoOrigen] = useState<EspecialidadTipo>("TALLER");
  const [nuevoProveedor, setNuevoProveedor] = useState("Proveedor General");
  const [nuevoEnStock, setNuevoEnStock] = useState(false);

  // Formulario rápido para nuevo servicio
  const [nuevoServicioNombre, setNuevoServicioNombre] = useState("");
  const [nuevoServicioCodigo, setNuevoServicioCodigo] = useState("");
  const [nuevoServicioPrecio, setNuevoServicioPrecio] = useState("0");
  const [nuevoServicioOrigen, setNuevoServicioOrigen] = useState<EspecialidadTipo>("TALLER");

  // Búsqueda en vivo en Neon PostgreSQL (Catálogos reales)
  const [busquedaProductoNeon, setBusquedaProductoNeon] = useState("");
  const [productosEncontradosNeon, setProductosEncontradosNeon] = useState<any[]>([]);
  const [buscandoProductoNeon, setBuscandoProductoNeon] = useState(false);

  const [busquedaServicioNeon, setBusquedaServicioNeon] = useState("");
  const [serviciosEncontradosNeon, setServiciosEncontradosNeon] = useState<any[]>([]);
  const [buscandoServicioNeon, setBuscandoServicioNeon] = useState(false);

  // Estado de sincronización en tiempo real con Neon PostgreSQL
  const [estadoSync, setEstadoSync] = useState<"guardado" | "guardando" | "error">("guardado");
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Modal para crear nuevo hallazgo / evidencia
  const [modalNuevoHallazgo, setModalNuevoHallazgo] = useState<{
    abierto: boolean;
    seccionId?: string;
    seccionNombre?: string;
    vistaDefault?: string;
  }>({ abierto: false });
  const [nuevoHallazgoTipo, setNuevoHallazgoTipo] = useState("");
  const [nuevoHallazgoDescripcion, setNuevoHallazgoDescripcion] = useState("");
  const [nuevoHallazgoVista, setNuevoHallazgoVista] = useState("frontal");
  const [nuevoHallazgoSolicitaRepuesto, setNuevoHallazgoSolicitaRepuesto] = useState(true);
  const [nuevoHallazgoSolicitaServicio, setNuevoHallazgoSolicitaServicio] = useState(false);

  // Buscar productos reales en Neon al tipear en el modal de repuestos
  useEffect(() => {
    if (!modalNuevoRepuesto) {
      setBusquedaProductoNeon("");
      setProductosEncontradosNeon([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscandoProductoNeon(true);
      try {
        const q = busquedaProductoNeon.trim();
        const res = await fetch(`/api/presupuestos/productos-rapidos?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.productos)) {
          setProductosEncontradosNeon(data.productos);
        }
      } catch (err) {
        console.error("Error buscando productos en Neon:", err);
      } finally {
        setBuscandoProductoNeon(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [busquedaProductoNeon, modalNuevoRepuesto]);

  // Buscar servicios reales en Neon al tipear en el modal de servicios
  useEffect(() => {
    if (!modalNuevoServicio) {
      setBusquedaServicioNeon("");
      setServiciosEncontradosNeon([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscandoServicioNeon(true);
      try {
        const q = busquedaServicioNeon.trim();
        const res = await fetch(`/api/presupuestos/servicios-rapidos?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.servicios)) {
          setServiciosEncontradosNeon(data.servicios);
        }
      } catch (err) {
        console.error("Error buscando servicios en Neon:", err);
      } finally {
        setBuscandoServicioNeon(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [busquedaServicioNeon, modalNuevoServicio]);

  const mostrarToast = (msg: string, tipo: "ok" | "err" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const copiarAlPortapapeles = async (texto: string, mensajeExito = "Enlace copiado al portapapeles.") => {
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
        mostrarToast(mensajeExito);
        return;
      }
    } catch {
      // Fallback a textarea si la Clipboard API está bloqueada por permisos
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = texto;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const copiado = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (copiado) {
        mostrarToast(mensajeExito);
        return;
      }
    } catch { }

    mostrarToast("No se pudo copiar automáticamente.", "err");
  };

  // Cargar datos de la orden desde Neon PostgreSQL
  useEffect(() => {
    async function cargarDetalle() {
      if (!id) return;
      try {
        setCargando(true);
        setError("");
        const res = await fetch(`/api/presupuestos/detalle?id=${encodeURIComponent(id)}`);
        if (!res.ok) {
          let errText = `Error (${res.status})`;
          try {
            const isJson = res.headers.get("content-type")?.includes("application/json");
            if (isJson) {
              const errJson = await res.json();
              errText = errJson.error || errText;
            }
          } catch { }
          setError(errText);
          return;
        }
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          setError("Respuesta inválida del servidor.");
          return;
        }
        if (data.success && data.order) {
          const ord = data.order;
          setFotoVehiculoError(false);
          setFotoClienteError(false);
          setOrden(ord);
          if (Array.isArray(data.proveedores) && data.proveedores.length > 0) {
            setProveedores(data.proveedores);
          } else {
            fetch("/api/presupuestos/proveedores")
              .then((r) => r.json())
              .then((d) => {
                if (d.success && Array.isArray(d.proveedores)) setProveedores(d.proveedores);
              })
              .catch(() => {});
          }
          setNotasFactura(ord.notes || "");
          setPorcentajeIva(Number(ord.quoteTaxRate ?? 15));
          setPorcentajeDescuento(Number(ord.quoteDiscount ?? 0));

          // Inicializar servicios preservando campos manuales y de proveedor
          const srvInit: ServicioPropuesta[] = (ord.services || []).map((sv: any) => ({
            ...sv,
            origin: sv.origin || deducirEspecialidad(sv.name, sv.category),
            inStock: sv.inStock !== undefined ? Boolean(sv.inStock) : !Boolean(sv.isManual && sv.purchaseStatus === "POR_PEDIR"),
            purchaseStatus: sv.purchaseStatus || (sv.inStock === false ? "POR_PEDIR" : "STOCK_LOCAL"),
            isManual: Boolean(sv.isManual),
            fotos: Array.isArray(sv.fotos) ? sv.fotos : [],
            audios: Array.isArray(sv.audios) ? sv.audios : [],
            supplierAvailability: sv.supplierAvailability || null,
            supplierPrice: sv.supplierPrice !== undefined ? Number(sv.supplierPrice) : null,
            deliveryTime: sv.deliveryTime || null,
            shippingMethod: sv.shippingMethod || null,
            supplierNotes: sv.supplierNotes || null,
            supplierRespondedAt: sv.supplierRespondedAt || null,
          }));

          // Inicializar repuestos con origen deducido y flag de inStock
          const itemsInit: ItemPropuesta[] = (ord.items || []).map((it: any) => ({
            ...it,
            origin: it.origin || deducirEspecialidad(it.name, it.category),
            inStock: it.inStock !== undefined ? Boolean(it.inStock) : !Boolean(it.isManual),
            purchaseStatus: it.purchaseStatus || (it.inStock === false || it.isManual ? "POR_PEDIR" : "STOCK_LOCAL"),
            isManual: Boolean(it.isManual),
            fotos: Array.isArray(it.fotos) ? it.fotos : [],
            audios: Array.isArray(it.audios) ? it.audios : [],
            supplierAvailability: it.supplierAvailability || null,
            supplierPrice: it.supplierPrice !== undefined ? Number(it.supplierPrice) : null,
            deliveryTime: it.deliveryTime || null,
            shippingMethod: it.shippingMethod || null,
            supplierNotes: it.supplierNotes || null,
            supplierRespondedAt: it.supplierRespondedAt || null,
          }));

          // Consolidar ítems vinculados directamente en las evidencias/hallazgos si no estaban en ord.items
          let findingsRaw: any[] = [];
          if (Array.isArray(ord.inspectionFindings) && ord.inspectionFindings.length > 0) {
            findingsRaw = ord.inspectionFindings;
          } else if (typeof (ord as any).inspectionFindingsJson === "string") {
            try {
              const p = JSON.parse((ord as any).inspectionFindingsJson);
              if (Array.isArray(p)) findingsRaw = p;
            } catch { }
          }

          findingsRaw.forEach((h: any, hIdx: number) => {
            const numEv = h.numeroEvidencia || h.pinNumber || (hIdx + 1);
            if (Array.isArray(h.linkedItems)) {
              h.linkedItems.forEach((li: any) => {
                const esServicio = li.type === "SERVICE" || li.category?.toLowerCase().includes("servicio") || li.category?.toLowerCase().includes("mano de obra");
                if (esServicio) {
                  const srvExistente = srvInit.find((s) => s.id === li.id || (s.name && li.name && s.name.toLowerCase() === li.name.toLowerCase()));
                  if (srvExistente) {
                    if (!srvExistente.findingId) srvExistente.findingId = h.id;
                    if (!srvExistente.supplierAvailability && li.supplierAvailability) srvExistente.supplierAvailability = li.supplierAvailability;
                    if (!srvExistente.deliveryTime && li.deliveryTime) srvExistente.deliveryTime = li.deliveryTime;
                    if (!srvExistente.shippingMethod && li.shippingMethod) srvExistente.shippingMethod = li.shippingMethod;
                  } else {
                    srvInit.push({
                      id: li.id || `srv_find_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      findingId: h.id,
                      name: li.name,
                      category: "Mano de Obra",
                      price: Number(li.price || 0),
                      costPrice: Number(li.costPrice || 0),
                      origin: "TALLER",
                      inStock: li.inStock !== undefined ? Boolean(li.inStock) : !Boolean(li.isManual),
                      isManual: Boolean(li.isManual),
                      fotos: Array.isArray(li.fotos) ? li.fotos : [],
                      audios: Array.isArray(li.audios) ? li.audios : [],
                      supplierAvailability: li.supplierAvailability || null,
                      supplierPrice: li.supplierPrice !== undefined ? Number(li.supplierPrice) : null,
                      deliveryTime: li.deliveryTime || null,
                      shippingMethod: li.shippingMethod || null,
                      notes: `[Evidencia #${numEv}] ${h.tipo || ""}`.trim(),
                    });
                  }
                } else {
                  const repExistente = itemsInit.find((it) => it.id === li.id || (it.name && li.name && it.name.toLowerCase() === li.name.toLowerCase()));
                  if (repExistente) {
                    if (!repExistente.findingId) repExistente.findingId = h.id;
                    if (!repExistente.supplierAvailability && li.supplierAvailability) repExistente.supplierAvailability = li.supplierAvailability;
                    if (!repExistente.deliveryTime && li.deliveryTime) repExistente.deliveryTime = li.deliveryTime;
                    if (!repExistente.shippingMethod && li.shippingMethod) repExistente.shippingMethod = li.shippingMethod;
                  } else {
                    const enBodegaLi = li.inStock !== undefined ? Boolean(li.inStock) : !Boolean(li.isManual);
                    itemsInit.push({
                      id: li.id || `rep_find_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      findingId: h.id,
                      name: li.name,
                      code: li.code,
                      qty: Number(li.qty || 1),
                      costPrice: Number(li.costPrice || 0),
                      price: Number(li.price || 0),
                      subtotalVenta: Number(li.price || 0) * Number(li.qty || 1),
                      subtotalCosto: Number(li.costPrice || 0) * Number(li.qty || 1),
                      margin: (Number(li.price || 0) - Number(li.costPrice || 0)) * Number(li.qty || 1),
                      marginPercent: Number(li.price || 0) > 0 ? Math.round(((Number(li.price || 0) - Number(li.costPrice || 0)) / Number(li.price || 0)) * 100) : 100,
                      supplierName: enBodegaLi ? "Bodega Taller" : "Proveedor General",
                      purchaseStatus: enBodegaLi ? "STOCK_LOCAL" : "POR_PEDIR",
                      inStock: enBodegaLi,
                      isManual: Boolean(li.isManual),
                      fotos: Array.isArray(li.fotos) ? li.fotos : [],
                      audios: Array.isArray(li.audios) ? li.audios : [],
                      supplierAvailability: li.supplierAvailability || null,
                      supplierPrice: li.supplierPrice !== undefined ? Number(li.supplierPrice) : null,
                      deliveryTime: li.deliveryTime || null,
                      shippingMethod: li.shippingMethod || null,
                      origin: "TALLER",
                      notes: `[Evidencia #${numEv}] ${h.tipo || ""}`.trim(),
                    });
                  }
                }
              });
            }

            // También enlazar ítems que en notas tengan [Evidencia #X]
            itemsInit.forEach((it) => {
              if (!it.findingId && it.notes && (it.notes.includes(`[Evidencia #${numEv}]`) || it.notes.includes(`Pin #${numEv}`))) {
                it.findingId = h.id;
              }
            });
            srvInit.forEach((sv) => {
              if (!sv.findingId && sv.notes && (sv.notes.includes(`[Evidencia #${numEv}]`) || sv.notes.includes(`Pin #${numEv}`))) {
                sv.findingId = h.id;
              }
            });
          });

          setRepuestos(itemsInit);
          setServicios(srvInit);
        } else {
          setError(data.error || "No se encontró el presupuesto solicitado.");
        }
      } catch {
        setError("Error de conexión al cargar el presupuesto.");
      } finally {
        setCargando(false);
      }
    }
    cargarDetalle();
  }, [id]);

  // Sincronización automática en tiempo real de respuestas del proveedor (Sí hay / No hay, Costo, Tiempo, Envío)
  useEffect(() => {
    if (!id || !orden) return;
    const syncRespuestasProveedor = async () => {
      if (guardando || estadoSync === "guardando") return;
      try {
        const res = await fetch(`/api/presupuestos/detalle?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.success || !data?.order) return;
        const ordServer = data.order;

        setRepuestos((prev) =>
          prev.map((it) => {
            const match = (ordServer.items || []).find(
              (srvIt: any) => srvIt.id === it.id || (srvIt.name && it.name && srvIt.name.toLowerCase() === it.name.toLowerCase())
            );
            if (!match) return it;
            if (
              match.supplierAvailability !== it.supplierAvailability ||
              match.deliveryTime !== it.deliveryTime ||
              match.shippingMethod !== it.shippingMethod ||
              (match.supplierPrice && Number(match.supplierPrice) !== Number(it.costPrice))
            ) {
              const newCost = match.supplierPrice ? Number(match.supplierPrice) : Number(match.costPrice ?? it.costPrice);
              const newPrice = Number(match.price ?? it.price);
              const qty = Number(it.qty || 1);
              return {
                ...it,
                costPrice: newCost,
                price: newPrice,
                subtotalCosto: Number((newCost * qty).toFixed(2)),
                subtotalVenta: Number((newPrice * qty).toFixed(2)),
                margin: Number(((newPrice - newCost) * qty).toFixed(2)),
                supplierAvailability: match.supplierAvailability ?? it.supplierAvailability,
                supplierPrice: match.supplierPrice ?? it.supplierPrice,
                deliveryTime: match.deliveryTime ?? it.deliveryTime,
                shippingMethod: match.shippingMethod ?? it.shippingMethod,
                supplierRespondedAt: match.supplierRespondedAt ?? it.supplierRespondedAt,
              };
            }
            return it;
          })
        );

        setServicios((prev) =>
          prev.map((sv) => {
            const match = (ordServer.services || []).find(
              (srvIt: any) => srvIt.id === sv.id || (srvIt.name && sv.name && srvIt.name.toLowerCase() === sv.name.toLowerCase())
            );
            if (!match) return sv;
            if (
              match.supplierAvailability !== sv.supplierAvailability ||
              match.deliveryTime !== sv.deliveryTime ||
              match.shippingMethod !== sv.shippingMethod ||
              (match.supplierPrice && Number(match.supplierPrice) !== Number(sv.costPrice || 0))
            ) {
              return {
                ...sv,
                costPrice: match.supplierPrice ? Number(match.supplierPrice) : Number(match.costPrice ?? sv.costPrice ?? 0),
                price: Number(match.price ?? sv.price),
                supplierAvailability: match.supplierAvailability ?? sv.supplierAvailability,
                supplierPrice: match.supplierPrice ?? sv.supplierPrice,
                deliveryTime: match.deliveryTime ?? sv.deliveryTime,
                shippingMethod: match.shippingMethod ?? sv.shippingMethod,
                supplierRespondedAt: match.supplierRespondedAt ?? sv.supplierRespondedAt,
              };
            }
            return sv;
          })
        );
      } catch {
        // Silencioso en background
      }
    };

    const interval = setInterval(syncRespuestasProveedor, 8000);
    const onFocus = () => syncRespuestasProveedor();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [id, orden?.id, guardando, estadoSync]);

  // Sincronizar propuesta con Neon PostgreSQL en tiempo real
  const sincronizarConNeon = async (
    nuevosRepuestos?: ItemPropuesta[],
    nuevosServicios?: ServicioPropuesta[],
    nuevosFindings?: any[],
    nuevasNotas?: string,
    nuevoIva?: number,
    nuevoDescuento?: number
  ) => {
    if (!orden) return false;
    const itemsParaGuardar = nuevosRepuestos ?? repuestos;
    const serviciosParaGuardar = nuevosServicios ?? servicios;
    const findingsParaGuardar = nuevosFindings ?? (orden.inspectionFindings || hallazgos);
    const notasParaGuardar = nuevasNotas ?? notasFactura;
    const ivaParaGuardar = nuevoIva ?? porcentajeIva;
    const descParaGuardar = nuevoDescuento ?? porcentajeDescuento;

    setEstadoSync("guardando");
    setGuardando(true);
    try {
      const res = await fetch("/api/presupuestos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orden.id,
          items: itemsParaGuardar,
          services: serviciosParaGuardar,
          notes: notasParaGuardar,
          quoteStatus: orden.quoteStatus || "Cotizando",
          quoteTaxRate: ivaParaGuardar,
          quoteDiscount: descParaGuardar,
          inspectionFindings: findingsParaGuardar,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Error al sincronizar");

      setEstadoSync("guardado");
      setUltimaSync(new Date());
      setOrden((prev: any) =>
        prev
          ? {
              ...prev,
              items: itemsParaGuardar,
              services: serviciosParaGuardar,
              inspectionFindings: findingsParaGuardar,
              notes: notasParaGuardar,
              totalCost: data.total,
            }
          : prev
      );
      return true;
    } catch (err: any) {
      console.error("Error al sincronizar con Neon:", err);
      setEstadoSync("error");
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const dispararGuardadoDebounced = (
    nuevosRep: ItemPropuesta[],
    nuevosSrv: ServicioPropuesta[],
    nuevosFind?: any[],
    nuevasNotas?: string
  ) => {
    setEstadoSync("guardando");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      sincronizarConNeon(nuevosRep, nuevosSrv, nuevosFind, nuevasNotas);
    }, 600);
  };

  // Modificar cantidad (CRUD Update)
  const handleUpdateQty = (itemId: string, delta: number) => {
    const nuevosRepuestos = repuestos.map((it) => {
      if (it.id === itemId) {
        const newQty = Math.max(1, (it.qty || 1) + delta);
        const subtotalVenta = Number((it.price * newQty).toFixed(2));
        const subtotalCosto = Number((it.costPrice * newQty).toFixed(2));
        const margin = Number(((it.price - it.costPrice) * newQty).toFixed(2));
        return { ...it, qty: newQty, subtotalVenta, subtotalCosto, margin };
      }
      return it;
    });
    setRepuestos(nuevosRepuestos);

    const findingsActualizados = (orden?.inspectionFindings || hallazgos).map((h: any) => {
      if (Array.isArray(h.linkedItems)) {
        return {
          ...h,
          linkedItems: h.linkedItems.map((li: any) => {
            if (li.id === itemId) {
              const newQty = Math.max(1, (li.qty || 1) + delta);
              return { ...li, qty: newQty };
            }
            return li;
          }),
        };
      }
      return h;
    });
    setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));

    dispararGuardadoDebounced(nuevosRepuestos, servicios, findingsActualizados);
  };

  // Modificar precios en línea (CRUD Update)
  const handleUpdatePrice = (itemId: string, field: "costPrice" | "price", valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const nuevosRepuestos = repuestos.map((it) => {
      if (it.id === itemId) {
        const costPrice = field === "costPrice" ? val : it.costPrice;
        const price = field === "price" ? val : it.price;
        const subtotalVenta = Number((price * it.qty).toFixed(2));
        const subtotalCosto = Number((costPrice * it.qty).toFixed(2));
        const margin = Number(((price - costPrice) * it.qty).toFixed(2));
        const marginPercent = price > 0 ? Math.round(((price - costPrice) / price) * 100) : 0;
        return { ...it, costPrice, price, subtotalVenta, subtotalCosto, margin, marginPercent };
      }
      return it;
    });
    setRepuestos(nuevosRepuestos);

    const findingsActualizados = (orden?.inspectionFindings || hallazgos).map((h: any) => {
      if (Array.isArray(h.linkedItems)) {
        return {
          ...h,
          linkedItems: h.linkedItems.map((li: any) => {
            if (li.id === itemId) {
              const costPrice = field === "costPrice" ? val : (li.costPrice || 0);
              const price = field === "price" ? val : (li.price || 0);
              return { ...li, costPrice, price };
            }
            return li;
          }),
        };
      }
      return h;
    });
    setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));

    dispararGuardadoDebounced(nuevosRepuestos, servicios, findingsActualizados);
  };

  // Modificar Casillero: Sí hay en Bodega (Taller) vs Pedir a Proveedor Externo (CRUD Update)
  const handleToggleStock = async (itemId: string) => {
    const esSrv = servicios.some((s) => s.id === itemId);
    if (esSrv) {
      const nuevosServicios = servicios.map((sv) => {
        if (sv.id === itemId) {
          const nextStock = sv.inStock === false ? true : false;
          return {
            ...sv,
            inStock: nextStock,
            purchaseStatus: nextStock ? "STOCK_LOCAL" : "POR_PEDIR",
            supplierName: nextStock ? "Bodega Taller" : (sv.supplierName === "Bodega Taller" ? "Proveedor General" : (sv.supplierName || "Proveedor General")),
          };
        }
        return sv;
      });
      setServicios(nuevosServicios);
      await sincronizarConNeon(repuestos, nuevosServicios);
      return;
    }

    const nuevosRepuestos = repuestos.map((it) => {
      if (it.id === itemId) {
        const nextStock = !it.inStock;
        return {
          ...it,
          inStock: nextStock,
          purchaseStatus: nextStock ? "STOCK_LOCAL" : "POR_PEDIR",
          supplierName: nextStock ? "Bodega Taller" : (it.supplierName === "Bodega Taller" ? "Proveedor General" : it.supplierName),
        };
      }
      return it;
    });
    setRepuestos(nuevosRepuestos);
    await sincronizarConNeon(nuevosRepuestos, servicios);
  };

  // Modificar proveedor asignado (CRUD Update)
  const handleUpdateSupplier = async (itemId: string, supplierName: string) => {
    const esSrv = servicios.some((s) => s.id === itemId);
    if (esSrv) {
      const nuevosServicios = servicios.map((sv) => (sv.id === itemId ? { ...sv, supplierName } : sv));
      setServicios(nuevosServicios);
      await sincronizarConNeon(repuestos, nuevosServicios);
      return;
    }
    const nuevosRepuestos = repuestos.map((it) => (it.id === itemId ? { ...it, supplierName } : it));
    setRepuestos(nuevosRepuestos);
    await sincronizarConNeon(nuevosRepuestos, servicios);
  };

  // Actualizar campos rápidos de ítem o servicio (Tiempo, Envío, Disponibilidad Proveedor, Costo)
  const handleUpdateItemFields = (itemId: string, isService: boolean, changes: Record<string, any>) => {
    if (isService) {
      const nuevosServicios = servicios.map((sv) => (sv.id === itemId ? { ...sv, ...changes } : sv));
      setServicios(nuevosServicios);
      const findingsActualizados = (orden?.inspectionFindings || hallazgos).map((h: any) => {
        if (Array.isArray(h.linkedItems)) {
          return {
            ...h,
            linkedItems: h.linkedItems.map((li: any) => (li.id === itemId ? { ...li, ...changes } : li)),
          };
        }
        return h;
      });
      setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));
      dispararGuardadoDebounced(repuestos, nuevosServicios, findingsActualizados);
    } else {
      const nuevosRepuestos = repuestos.map((it) => (it.id === itemId ? { ...it, ...changes } : it));
      setRepuestos(nuevosRepuestos);
      const findingsActualizados = (orden?.inspectionFindings || hallazgos).map((h: any) => {
        if (Array.isArray(h.linkedItems)) {
          return {
            ...h,
            linkedItems: h.linkedItems.map((li: any) => (li.id === itemId ? { ...li, ...changes } : li)),
          };
        }
        return h;
      });
      setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));
      dispararGuardadoDebounced(nuevosRepuestos, servicios, findingsActualizados);
    }
  };

  // Subir foto o audio para nuevo ítem manual desde la barra rápida de Propuesta
  const handleSubirMediaBorrador = async (e: React.ChangeEvent<HTMLInputElement>, tipo: "foto" | "audio") => {
    const file = e.target.files?.[0];
    if (!file || !orden) return;
    setSubiendoMediaRapido(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orderId", orden.id);
      formData.append("orderNumber", orden.orderNumber);
      formData.append("plate", orden.plate);
      formData.append("folder", "taller_evidencia");
      formData.append("tipo", tipo === "foto" ? "image" : "audio");
      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (data?.success && data?.url) {
        if (tipo === "foto") setFotosBorradorRapido((p) => [...p, data.url]);
        else setAudiosBorradorRapido((p) => [...p, data.url]);
        mostrarToast(tipo === "foto" ? "📷 Foto adjuntada" : "🎙️ Audio adjuntado");
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const url = String(reader.result || "");
          if (!url) return;
          if (tipo === "foto") setFotosBorradorRapido((p) => [...p, url]);
          else setAudiosBorradorRapido((p) => [...p, url]);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || "");
        if (!url) return;
        if (tipo === "foto") setFotosBorradorRapido((p) => [...p, url]);
        else setAudiosBorradorRapido((p) => [...p, url]);
      };
      reader.readAsDataURL(file);
    } finally {
      setSubiendoMediaRapido(false);
      e.target.value = "";
    }
  };

  // Añadir servicio o producto rápido desde la barra superior (con foto, audio, tiempo y estado Bodega/Pedir)
  const handleAgregarRapidoEnPropuesta = async (origen: EspecialidadTipo) => {
    const nombre = descripcionRapida.trim();
    if (!nombre) {
      mostrarToast("Escribe el nombre del servicio o producto", "err");
      return;
    }

    if (tipoRapido === "SERVICE") {
      const nuevoSrv: ServicioPropuesta = {
        id: `reg-srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        code: `SRV-${Date.now().toString().slice(-4)}`,
        name: nombre,
        category: "Mano de Obra",
        price: 0,
        costPrice: 0,
        mechanic: orden?.mechanic || "Taller",
        origin: origen,
        inStock: enStockRapido,
        purchaseStatus: enStockRapido ? "STOCK_LOCAL" : "POR_PEDIR",
        supplierName: enStockRapido ? "Bodega Taller" : "Proveedor General",
        isManual: true,
        fotos: [...fotosBorradorRapido],
        audios: [...audiosBorradorRapido],
        deliveryTime: tiempoRapido || null,
      };
      const nuevosServicios = [...servicios, nuevoSrv];
      setServicios(nuevosServicios);
      setDescripcionRapida("");
      setFotosBorradorRapido([]);
      setAudiosBorradorRapido([]);
      setTiempoRapido("");
      await sincronizarConNeon(repuestos, nuevosServicios);
      mostrarToast("✓ Servicio añadido a la propuesta");
    } else {
      const nuevoItem: ItemPropuesta = {
        id: `reg-part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        code: `REP-${Date.now().toString().slice(-4)}`,
        name: nombre,
        category: origen === "LUBRICENTRO" ? "Lubricentro" : origen === "CARWASH" ? "Car Wash" : origen === "TECNICENTRO" ? "Tecnicentro" : "Repuestos",
        qty: 1,
        costPrice: 0,
        price: 0,
        subtotalVenta: 0,
        subtotalCosto: 0,
        margin: 0,
        marginPercent: 0,
        supplierName: enStockRapido ? "Bodega Taller" : "Proveedor General",
        purchaseStatus: enStockRapido ? "STOCK_LOCAL" : "POR_PEDIR",
        inStock: enStockRapido,
        origin: origen,
        isManual: true,
        fotos: [...fotosBorradorRapido],
        audios: [...audiosBorradorRapido],
        deliveryTime: tiempoRapido || null,
      };
      const nuevosRepuestos = [...repuestos, nuevoItem];
      setRepuestos(nuevosRepuestos);
      setDescripcionRapida("");
      setFotosBorradorRapido([]);
      setAudiosBorradorRapido([]);
      setTiempoRapido("");
      await sincronizarConNeon(nuevosRepuestos, servicios);
      mostrarToast("✓ Producto añadido a la propuesta");
    }
  };

  // Añadir múltiples productos/servicios desde el Catálogo interactivo (CatalogoProductosServiciosTaller)
  const handleAgregarDesdeCatalogoTaller = async (itemsSeleccionados: any[]) => {
    if (!Array.isArray(itemsSeleccionados) || itemsSeleccionados.length === 0) return;
    const orig = modalCatalogoTallerAbierto.origen || "TALLER";
    const pinTarget = modalCatalogoTallerAbierto.pin || null;
    const numEv = pinTarget ? (pinTarget.numeroEvidencia || pinTarget.pinNumber || 1) : null;

    let nuevosRep = [...repuestos];
    let nuevosSrv = [...servicios];
    let findingsActualizados = [...(orden?.inspectionFindings || hallazgos)];

    for (const sel of itemsSeleccionados) {
      const esSrv = sel.type === "SERVICE";
      const qty = Math.max(1, Number(sel.qty || 1));
      const pvp = Number(sel.price || 0);
      const cost = Number(sel.costPrice || 0);
      const enBodega = sel.inStock !== undefined ? Boolean(sel.inStock) : true;

      if (esSrv) {
        const srvNuevo: ServicioPropuesta = {
          id: sel.id || `cat-srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          findingId: pinTarget?.id || null,
          code: sel.code || `SRV-${Date.now().toString().slice(-4)}`,
          name: sel.name,
          category: sel.category || "Mano de Obra",
          price: pvp * qty,
          costPrice: cost,
          mechanic: orden?.mechanic || "Taller",
          origin: orig,
          inStock: true,
          purchaseStatus: "STOCK_LOCAL",
          notes: pinTarget ? `[Evidencia #${numEv}] ${pinTarget.tipo || ""}`.trim() : undefined,
        };
        nuevosSrv.push(srvNuevo);
      } else {
        const repNuevo: ItemPropuesta = {
          id: sel.id || `cat-part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: sel.productId || null,
          findingId: pinTarget?.id || null,
          code: sel.code || `REP-${Date.now().toString().slice(-4)}`,
          name: sel.name,
          category: sel.category || "Repuestos",
          qty,
          costPrice: cost,
          price: pvp,
          subtotalVenta: Number((pvp * qty).toFixed(2)),
          subtotalCosto: Number((cost * qty).toFixed(2)),
          margin: Number(((pvp - cost) * qty).toFixed(2)),
          marginPercent: pvp > 0 ? Math.round(((pvp - cost) / pvp) * 100) : 0,
          supplierName: enBodega ? "Bodega Taller" : "Proveedor General",
          purchaseStatus: enBodega ? "STOCK_LOCAL" : "POR_PEDIR",
          inStock: enBodega,
          origin: orig,
          imageUrl: sel.imageUrl || null,
          fotos: sel.imageUrl ? [sel.imageUrl] : [],
          notes: pinTarget ? `[Evidencia #${numEv}] ${pinTarget.tipo || ""}`.trim() : undefined,
        };
        nuevosRep.push(repNuevo);
      }
    }

    setRepuestos(nuevosRep);
    setServicios(nuevosSrv);
    setModalCatalogoTallerAbierto({ abierto: false, origen: "TALLER" });
    await sincronizarConNeon(nuevosRep, nuevosSrv, findingsActualizados);
    mostrarToast(`✓ ${itemsSeleccionados.length} ítem(s) agregados desde el catálogo`);
  };

  // Añadir servicio desde Accesos Rápidos
  const handleAgregarAccesoRapido = async (nombre: string, precio: number, origen: EspecialidadTipo) => {
    const nuevoSrv: ServicioPropuesta = {
      id: `rap-srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: `SRV-${Date.now().toString().slice(-4)}`,
      name: nombre,
      category: "Mano de Obra",
      price: Number(precio || 0),
      mechanic: orden?.mechanic || "Taller",
      origin: origen,
      inStock: true,
      purchaseStatus: "STOCK_LOCAL",
    };
    const nuevosServicios = [...servicios, nuevoSrv];
    setServicios(nuevosServicios);
    await sincronizarConNeon(repuestos, nuevosServicios);
    mostrarToast(`✓ ${nombre} añadido`);
  };

  // Eliminar repuesto de la propuesta y de Neon (CRUD Delete)
  const handleDeleteItem = async (itemId: string) => {
    const repuestosFiltrados = repuestos.filter((it) => it.id !== itemId);
    setRepuestos(repuestosFiltrados);

    // Limpiar de linkedItems en todos los hallazgos
    const findingsActualizados = (orden?.inspectionFindings || hallazgos).map((h: any) => {
      if (Array.isArray(h.linkedItems)) {
        return {
          ...h,
          linkedItems: h.linkedItems.filter((li: any) => li.id !== itemId && li.name !== itemId),
        };
      }
      return h;
    });

    setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));
    await sincronizarConNeon(repuestosFiltrados, servicios, findingsActualizados);
    mostrarToast("✓ Ítem eliminado y sincronizado en Neon PostgreSQL.");
  };

  // Eliminar servicio de la propuesta y de Neon (CRUD Delete)
  const handleDeleteService = async (srvId: string) => {
    const serviciosFiltrados = servicios.filter((sv) => sv.id !== srvId);
    setServicios(serviciosFiltrados);

    // Limpiar de linkedItems en todos los hallazgos
    const findingsActualizados = (orden?.inspectionFindings || hallazgos).map((h: any) => {
      if (Array.isArray(h.linkedItems)) {
        return {
          ...h,
          linkedItems: h.linkedItems.filter((li: any) => li.id !== srvId && li.name !== srvId),
        };
      }
      return h;
    });

    setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));
    await sincronizarConNeon(repuestos, serviciosFiltrados, findingsActualizados);
    mostrarToast("✓ Servicio eliminado y sincronizado en Neon PostgreSQL.");
  };

  // Modificar precio de servicio en línea (CRUD Update)
  const handleUpdateServicePrice = (srvId: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const nuevosServicios = servicios.map((sv) => (sv.id === srvId ? { ...sv, price: val } : sv));
    setServicios(nuevosServicios);

    const findingsActualizados = (orden?.inspectionFindings || hallazgos).map((h: any) => {
      if (Array.isArray(h.linkedItems)) {
        return {
          ...h,
          linkedItems: h.linkedItems.map((li: any) => {
            if (li.id === srvId) return { ...li, price: val };
            return li;
          }),
        };
      }
      return h;
    });
    setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));

    dispararGuardadoDebounced(repuestos, nuevosServicios, findingsActualizados);
  };

  // Eliminar un hallazgo completo y sus ítems vinculados de Neon (CRUD Delete Hallazgo)
  const handleEliminarHallazgo = async (pinId: string) => {
    if (!confirm("¿Estás seguro de eliminar este hallazgo y sus productos vinculados de la propuesta?")) return;

    const listBase = orden?.inspectionFindings && orden.inspectionFindings.length > 0
      ? orden.inspectionFindings
      : hallazgos;

    const findingsActualizados = listBase.filter((h: any) => h.id !== pinId && h.originalId !== pinId);
    setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));

    const repuestosFiltrados = repuestos.filter((r) => r.findingId !== pinId);
    const serviciosFiltrados = servicios.filter((s) => s.findingId !== pinId);
    setRepuestos(repuestosFiltrados);
    setServicios(serviciosFiltrados);

    setFlotanteDetalles(null);
    setFlotanteManual(null);

    await sincronizarConNeon(repuestosFiltrados, serviciosFiltrados, findingsActualizados);
    mostrarToast("✓ Hallazgo y sus ítems eliminados de Neon PostgreSQL.");
  };

  // Guardar edición de un hallazgo en Neon (CRUD Update Hallazgo)
  const handleActualizarDatosHallazgo = async (pinId: string, tipo: string, descripcion: string, vista?: string) => {
    const listBase = orden?.inspectionFindings && orden.inspectionFindings.length > 0
      ? orden.inspectionFindings
      : hallazgos;

    const findingsActualizados = listBase.map((h: any) => {
      if (h.id === pinId || h.originalId === pinId) {
        return {
          ...h,
          tipo: tipo.trim(),
          descripcion: descripcion.trim(),
          ...(vista ? { vista, vistaLabel: vista.charAt(0).toUpperCase() + vista.slice(1).replace(/_/g, " ") } : {}),
        };
      }
      return h;
    });

    setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));
    setFlotanteDetalles((prev) => prev ? { ...prev, pin: { ...prev.pin, tipo, descripcion, ...(vista ? { vista } : {}) } } : null);

    await sincronizarConNeon(repuestos, servicios, findingsActualizados);
    mostrarToast("✓ Detalles del hallazgo actualizados en Neon.");
  };

  // Crear nuevo hallazgo en Neon (CRUD Create Hallazgo)
  const handleCrearNuevoHallazgo = async () => {
    if (!nuevoHallazgoTipo.trim() && !nuevoHallazgoDescripcion.trim()) {
      mostrarToast("Ingresa al menos el tipo de daño o una descripción.", "err");
      return;
    }

    const listBase = orden?.inspectionFindings && orden.inspectionFindings.length > 0
      ? orden.inspectionFindings
      : hallazgos;

    const nuevoNumero = listBase.length + 1;
    const nuevoPinId = `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const vistaNorm = (nuevoHallazgoVista || "frontal").toLowerCase().replace(/\s+/g, "_");
    const vistaLabel = vistaNorm.charAt(0).toUpperCase() + vistaNorm.slice(1).replace(/_/g, " ");

    const nuevoFinding = {
      id: nuevoPinId,
      pinNumber: nuevoNumero,
      numeroEvidencia: nuevoNumero,
      vista: vistaNorm,
      vistaLabel,
      tipo: nuevoHallazgoTipo.trim() || "Hallazgo",
      descripcion: nuevoHallazgoDescripcion.trim(),
      solicitaRepuesto: nuevoHallazgoSolicitaRepuesto,
      solicitaServicio: nuevoHallazgoSolicitaServicio,
      linkedItems: [],
      photoUrls: fotosVehiculo.length > 0 ? [fotosVehiculo[0]] : [],
    };

    const findingsActualizados = [...listBase, nuevoFinding];
    setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));

    setModalNuevoHallazgo({ abierto: false });
    setNuevoHallazgoTipo("");
    setNuevoHallazgoDescripcion("");

    await sincronizarConNeon(repuestos, servicios, findingsActualizados);
    mostrarToast("✓ Nuevo hallazgo registrado y guardado en Neon PostgreSQL.");
  };

  // Totales financieros calculados en tiempo real estilo liquidación de Factura
  const calculos = useMemo(() => {
    const subtotalRepuestos = repuestos.reduce((acc, it) => acc + (it.price * it.qty), 0);
    const subtotalServicios = servicios.reduce((acc, sv) => acc + sv.price, 0);
    const subtotalBruto = Number((subtotalRepuestos + subtotalServicios).toFixed(2));

    const descuento = Number((subtotalBruto * (porcentajeDescuento / 100)).toFixed(2));
    const subtotalNeto = Math.max(0, Number((subtotalBruto - descuento).toFixed(2)));

    const iva = Number((subtotalNeto * (porcentajeIva / 100)).toFixed(2));
    const totalFacturaCliente = Number((subtotalNeto + iva).toFixed(2));

    // Ítems y servicios que no están en stock o fueron ingresados manualmente para pedir a proveedor
    const repuestosPorComprar = repuestos
      .filter((r) => !r.inStock || (r.isManual && r.purchaseStatus === "POR_PEDIR"))
      .map((r) => ({ ...r, isService: false }));
    const serviciosPorComprar = servicios
      .filter((s) => s.inStock === false || (s.isManual && s.purchaseStatus === "POR_PEDIR"))
      .map((s) => ({
        ...s,
        qty: 1,
        costPrice: Number(s.costPrice || 0),
        subtotalVenta: Number(s.price || 0),
        subtotalCosto: Number(s.costPrice || 0),
        margin: Number((s.price || 0) - Number(s.costPrice || 0)),
        marginPercent: s.price > 0 ? Math.round(((s.price - Number(s.costPrice || 0)) / s.price) * 100) : 100,
        supplierName: s.supplierName || "Proveedor General",
        purchaseStatus: s.purchaseStatus || "POR_PEDIR",
        inStock: false,
        isService: true,
      }));

    const itemsPorComprar = [...repuestosPorComprar, ...serviciosPorComprar];
    const itemsEnBodega = repuestos.filter((r) => r.inStock);

    const totalCostoComprasExternas = Number(
      itemsPorComprar.reduce((acc, it) => acc + (Number(it.costPrice || 0) * Number(it.qty || 1)), 0).toFixed(2)
    );

    // Margen para el taller = PVP Neto - Costos de Compras Externas
    const margenNetoTaller = Number((subtotalNeto - totalCostoComprasExternas).toFixed(2));
    const margenPorcentaje = subtotalNeto > 0 ? Math.round((margenNetoTaller / subtotalNeto) * 100) : 0;

    return {
      subtotalRepuestos,
      subtotalServicios,
      subtotalBruto,
      descuento,
      subtotalNeto,
      iva,
      totalFacturaCliente,
      totalCostoComprasExternas,
      margenNetoTaller,
      margenPorcentaje,
      itemsPorComprar,
      itemsEnBodega,
    };
  }, [repuestos, servicios, porcentajeDescuento, porcentajeIva]);

  // Lista deduplicada de fotos de inspección y evidencias
  const fotosVehiculo = useMemo(() => {
    if (!orden) return [];
    const list: string[] = [];
    if (orden.photos && Array.isArray(orden.photos)) {
      list.push(...orden.photos);
    }
    if (orden.evidencePhotos && Array.isArray(orden.evidencePhotos)) {
      list.push(...orden.evidencePhotos);
    }
    if (orden.receptionPhotos && Array.isArray(orden.receptionPhotos)) {
      list.push(...orden.receptionPhotos);
    }
    if (typeof (orden as any).receptionPhotosJson === "string") {
      try {
        const parsed = JSON.parse((orden as any).receptionPhotosJson);
        if (Array.isArray(parsed)) list.push(...parsed);
      } catch { }
    }
    if (typeof (orden as any).evidencePhotosJson === "string") {
      try {
        const parsed = JSON.parse((orden as any).evidencePhotosJson);
        if (Array.isArray(parsed)) list.push(...parsed);
      } catch { }
    }
    if (typeof (orden as any).photosJson === "string") {
      try {
        const parsed = JSON.parse((orden as any).photosJson);
        if (Array.isArray(parsed)) list.push(...parsed);
      } catch { }
    }
    if (orden.evidencias && Array.isArray(orden.evidencias)) {
      for (const ev of orden.evidencias) {
        if (ev.url && (ev.type === "image" || !ev.type || !ev.url.includes(".mp3"))) {
          list.push(ev.url);
        }
      }
    }
    return Array.from(
      new Set(
        list
          .filter((x): x is string => typeof x === "string" && Boolean(x.trim()) && !x.startsWith("blob:"))
          .map((f) => {
            const trimmed = f.trim();
            if (trimmed.startsWith("http") || trimmed.startsWith("/") || trimmed.startsWith("data:")) {
              return trimmed;
            }
            return `/api/storage/download?key=${encodeURIComponent(trimmed)}`;
          })
      )
    );
  }, [orden]);

  // Hallazgos de inspección estructurados (Diagnóstico)
  const hallazgos = useMemo(() => {
    if (!orden) return [];
    let list: any[] = [];
    if (Array.isArray(orden.inspectionFindings) && orden.inspectionFindings.length > 0) {
      list = [...orden.inspectionFindings];
    } else if (typeof (orden as any).inspectionFindingsJson === "string") {
      try {
        const parsed = JSON.parse((orden as any).inspectionFindingsJson);
        if (Array.isArray(parsed) && parsed.length > 0) list = [...parsed];
      } catch { }
    }

    // Fallback: parsear desde orden.notes si tiene el formato "Inspección 5 Vistas (X hallazgos): #1 [Vista] Tipo: Desc"
    if (list.length === 0 && orden.notes && orden.notes.includes("Inspección 5 Vistas")) {
      const regex = /#(\d+)\s+\[([^\]]+)\]\s+([^:]+):\s*([^#\n]+)/g;
      let match;
      while ((match = regex.exec(orden.notes)) !== null) {
        const pinNum = parseInt(match[1], 10);
        const vistaRaw = match[2].trim();
        const vistaNorm = vistaRaw.toLowerCase().replace(/\s+/g, "_");
        const tipo = match[3].trim();
        const desc = match[4].trim();
        list.push({
          id: `hallazgo_${pinNum}`,
          pinNumber: pinNum,
          vista: vistaNorm,
          vistaLabel: vistaRaw,
          tipo,
          descripcion: desc,
          photoUrls: fotosVehiculo.length > 0 ? [fotosVehiculo[0]] : [],
        });
      }
    }

    return list.map((h: any, i: number) => {
      const vista = String(h.vista || h.view || "frontal").toLowerCase();
      const vistaLabel = h.vistaLabel || h.viewLabel || (vista.charAt(0).toUpperCase() + vista.slice(1).replace(/_/g, " "));
      const numeroEvidencia = i + 1;
      const pinNumber = numeroEvidencia;
      const tipo = h.tipo || h.type || "Hallazgo";
      const descripcion = h.descripcion || h.description || h.desc || "";
      const photoUrls = Array.isArray(h.photoUrls) && h.photoUrls.length > 0
        ? h.photoUrls
        : (h.photoUrl ? [h.photoUrl] : (fotosVehiculo.length > 0 ? [fotosVehiculo[0]] : []));
      return {
        ...h,
        id: h.id || `find_${i}`,
        numeroEvidencia,
        pinNumber,
        vista,
        vistaLabel,
        tipo,
        descripcion,
        photoUrls,
      };
    });
  }, [orden, fotosVehiculo]);

  // Secciones de diagnóstico agrupadas por vista
  const secciones = useMemo(() => {
    return [
      {
        id: "carroceria",
        nombre: "Carrocería",
        icon: "🚗",
        items: hallazgos.filter((h: any) =>
          ["frontal", "trasera", "lateral_izq", "lateral_der", "superior"].includes(h.vista)
        ),
      },
      {
        id: "motor",
        nombre: "Motor",
        icon: "⚙️",
        items: hallazgos.filter((h: any) => h.vista === "motor"),
      },
      {
        id: "frenos",
        nombre: "Frenos",
        icon: "🛑",
        items: hallazgos.filter((h: any) => h.vista === "frenos"),
      },
      {
        id: "suspension",
        nombre: "Suspensión",
        icon: "🔧",
        items: hallazgos.filter((h: any) => h.vista === "suspension"),
      },
      {
        id: "electrico",
        nombre: "Eléctrico",
        icon: "⚡",
        items: hallazgos.filter((h: any) => h.vista === "electrico"),
      },
      {
        id: "aire",
        nombre: "Aire Acondicionado",
        icon: "❄️",
        items: hallazgos.filter((h: any) => h.vista === "aire"),
      },
      {
        id: "otros",
        nombre: "Otros Hallazgos",
        icon: "🔍",
        items: hallazgos.filter(
          (h: any) => !["frontal", "trasera", "lateral_izq", "lateral_der", "superior", "motor", "frenos", "suspension", "electrico", "aire"].includes(h.vista)
        ),
      },
    ].filter((s) => s.items.length > 0);
  }, [hallazgos]);

  // Trabajos unificados de repuestos y servicios
  const itemsPropuestaParaTrabajos = useMemo(() => {
    const listaRepuestos = repuestos.map((r) => ({
      id: r.id,
      name: r.name,
      qty: r.qty,
      price: r.price,
      type: "PART",
      category: r.origin || "TALLER",
    }));
    const listaServicios = servicios.map((s) => ({
      id: s.id,
      name: s.name,
      qty: 1,
      price: s.price,
      type: "SERVICE",
      category: s.category || s.origin || "TALLER",
    }));
    return [...listaRepuestos, ...listaServicios];
  }, [repuestos, servicios]);

  // Helper para identificar a qué evidencia pertenece un ítem o servicio
  const obtenerEvidenciaDeItem = useCallback(
    (item: any): number | null => {
      if (item.findingId) {
        const f = hallazgos.find((h: any) => h.id === item.findingId || h.originalId === item.findingId);
        if (f) return f.numeroEvidencia || f.pinNumber || 1;
      }
      if (item.notes) {
        const m = item.notes.match(/\[Evidencia #(\d+)\]/i) || item.notes.match(/Pin #(\d+)/i);
        if (m) return parseInt(m[1], 10);
      }
      if (item.category) {
        const m = item.category.match(/Pin #(\d+)/i) || item.category.match(/Evidencia #(\d+)/i);
        if (m) return parseInt(m[1], 10);
      }
      for (const h of hallazgos) {
        if (Array.isArray(h.linkedItems)) {
          const tiene = h.linkedItems.some(
            (li: any) =>
              li.id === item.id ||
              (li.code && item.code && li.code === item.code) ||
              (li.name && item.name && li.name.toLowerCase() === item.name.toLowerCase())
          );
          if (tiene) return h.numeroEvidencia || h.pinNumber || 1;
        }
      }
      return null;
    },
    [hallazgos]
  );

  // Casillero para marcar o desmarcar solicitud de repuesto/servicio en la evidencia
  const handleToggleSolicitaPropuesta = async (
    pinId: string,
    campo: "solicitaRepuesto" | "solicitaServicio",
    valor: boolean
  ) => {
    const listBase =
      orden?.inspectionFindings && orden.inspectionFindings.length > 0
        ? orden.inspectionFindings
        : hallazgos;

    const nuevosFindings = listBase.map((h: any) => {
      if (h.id === pinId || h.originalId === pinId) {
        return { ...h, [campo]: valor };
      }
      return h;
    });

    setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: nuevosFindings } : prev));
    await sincronizarConNeon(repuestos, servicios, nuevosFindings);
    mostrarToast(
      valor
        ? `✓ Marcado: se solicita ${campo === "solicitaRepuesto" ? "repuesto / producto" : "servicio"} para esta evidencia.`
        : `✓ Solicitud desmarcada.`
    );
  };

  // Obtener todos los productos y servicios asignados a una evidencia específica
  const obtenerItemsDePin = useCallback(
    (pin: any) => {
      const numEvidencia = pin.numeroEvidencia || pin.pinNumber || 1;
      const pinNum = pin.pinNumber || numEvidencia;

      const prods = repuestos
        .filter((r) => {
          if (r.findingId && (r.findingId === pin.id || r.findingId === pin.originalId)) return true;
          if (r.notes && (r.notes.includes(`[Evidencia #${numEvidencia}]`) || r.notes.includes(`[Evidencia #${pinNum}]`) || r.notes.includes(`Pin #${numEvidencia}`) || r.notes.includes(`Pin #${pinNum}`))) return true;
          if (r.category && (r.category.includes(`Pin #${numEvidencia}`) || r.category.includes(`Pin #${pinNum}`) || r.category.includes(`Evidencia #${numEvidencia}`))) return true;
          if (Array.isArray(pin.linkedItems) && pin.linkedItems.some((li: any) => li.id === r.id || (li.code && r.code && li.code === r.code) || (li.name && r.name && li.name.toLowerCase() === r.name.toLowerCase()))) return true;
          return false;
        })
        .map((r) => ({
          ...r,
          isService: false,
          subtotal: r.subtotalVenta || Number((Number(r.price || 0) * Number(r.qty || 1)).toFixed(2)),
        }));

      const srvs = servicios
        .filter((s) => {
          if (s.findingId && (s.findingId === pin.id || s.findingId === pin.originalId)) return true;
          if (s.notes && (s.notes.includes(`[Evidencia #${numEvidencia}]`) || s.notes.includes(`[Evidencia #${pinNum}]`) || s.notes.includes(`Pin #${numEvidencia}`) || s.notes.includes(`Pin #${pinNum}`))) return true;
          if (s.category && (s.category.includes(`Pin #${numEvidencia}`) || s.category.includes(`Pin #${pinNum}`) || s.category.includes(`Evidencia #${numEvidencia}`))) return true;
          if (Array.isArray(pin.linkedItems) && pin.linkedItems.some((li: any) => li.id === s.id || (li.code && s.code && li.code === s.code) || (li.name && s.name && li.name.toLowerCase() === s.name.toLowerCase()))) return true;
          return false;
        })
        .map((s) => ({
          ...s,
          qty: 1,
          isService: true,
          subtotal: Number(s.price || 0),
        }));

      const todos = [...prods, ...srvs];
      const vistos = new Set<string>();
      return todos.filter((it) => {
        const key = it.id ? String(it.id) : `${it.name}-${it.isService}`;
        if (vistos.has(key)) return false;
        vistos.add(key);
        return true;
      });
    },
    [repuestos, servicios]
  );

  // Ítems y servicios de Taller ingresados manualmente o generales que no pertenecen a un pin específico
  const adicionalesTaller = useMemo(() => {
    const idsEnPines = new Set<string>();
    hallazgos.forEach((pin: any) => {
      obtenerItemsDePin(pin).forEach((it: any) => {
        if (it.id) idsEnPines.add(String(it.id));
      });
    });

    const prodsTaller = repuestos
      .filter((r) => !idsEnPines.has(String(r.id)))
      .map((r) => ({
        ...r,
        isService: false,
        subtotal: r.subtotalVenta || Number((Number(r.price || 0) * Number(r.qty || 1)).toFixed(2)),
      }));

    const srvsTaller = servicios
      .filter((s) => !idsEnPines.has(String(s.id)))
      .map((s) => ({
        ...s,
        qty: 1,
        isService: true,
        subtotal: Number(s.price || 0),
      }));

    return [...prodsTaller, ...srvsTaller];
  }, [repuestos, servicios, hallazgos, obtenerItemsDePin]);

  // Manejo de envíos a proveedores (individual y masivo)
  const abrirModalProveedor = (modo: "MASIVO" | "INDIVIDUAL", item?: any, pin?: any) => {
    setModalProveedor({ abierto: true, modo, item, pin });
    setBusquedaProveedor("");
    setTelefonoManualProveedor("");
    if (proveedores.length > 0) {
      setProveedorSeleccionado(proveedores[0]);
    }
  };

  const proveedoresFiltrados = useMemo(() => {
    if (!busquedaProveedor.trim()) return proveedores;
    const q = busquedaProveedor.toLowerCase();
    return proveedores.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.contact && p.contact.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.categories && p.categories.toLowerCase().includes(q))
    );
  }, [proveedores, busquedaProveedor]);

  const generarMensajeWhatsAppProveedor = () => {
    if (!orden) return "";
    const vehicleInfo = `${orden.vehicle || "Vehículo"} (Placa: ${orden.plate || "N/A"})`;
    const orderLink =
      typeof window !== "undefined"
        ? `${window.location.origin}/pedidos-proveedor/${orden.id}`
        : "";

    if (modalProveedor.modo === "INDIVIDUAL") {
      const itName =
        modalProveedor.item?.name ||
        modalProveedor.pin?.descripcion ||
        modalProveedor.pin?.tipo ||
        "Repuesto";
      const itId = modalProveedor.item?.id || "";
      const pinId = modalProveedor.pin?.id || modalProveedor.item?.findingId || "";
      const evNum =
        modalProveedor.pin?.numeroEvidencia || modalProveedor.pin?.pinNumber || null;
      const desc = modalProveedor.pin?.descripcion
        ? `\n• Detalle: "${modalProveedor.pin.descripcion}"`
        : modalProveedor.item?.descripcion
        ? `\n• Detalle: "${modalProveedor.item.descripcion}"`
        : "";
      const queryParams = new URLSearchParams();
      if (itId) queryParams.set("itemId", String(itId));
      if (itName) queryParams.set("item", String(itName));
      if (pinId) queryParams.set("pinId", String(pinId));
      const fullLink = `${orderLink}?${queryParams.toString()}`;

      return `Hola, solicito cotización para el vehículo ${vehicleInfo}:\n• Ítem: ${itName}${evNum ? ` (Evidencia #${evNum})` : ""}${desc}\n\nMarca disponibilidad (Sí hay / No hay), valor, tiempo y envío aquí (incluye foto y audio):\n${fullLink}`;
    } else {
      // Masivo: todos los productos y servicios por pedir o de la orden
      const lista = calculos.itemsPorComprar.length > 0 ? calculos.itemsPorComprar : repuestos;
      const itemsList = lista
        .map((r: any) => `• ${r.qty || 1}x ${r.name}`)
        .join("\n");

      return `Hola, te comparto el pedido para el vehículo ${vehicleInfo}:\n${itemsList || "• Repuestos requeridos en inspección"}\n\nRevisa fotos, audios y responde disponibilidad, precios, tiempos y envío aquí:\n${orderLink}`;
    }
  };

  const enviarWhatsAppProveedor = () => {
    const rawPhone =
      telefonoManualProveedor || proveedorSeleccionado?.phone || "";
    const phoneClean = rawPhone.replace(/[^0-9]/g, "");
    const mensaje = encodeURIComponent(generarMensajeWhatsAppProveedor());
    const url = phoneClean
      ? `https://wa.me/${phoneClean}?text=${mensaje}`
      : `https://wa.me/?text=${mensaje}`;
    window.open(url, "_blank");
  };

  // Agrupación de trabajos por módulo y subcategoría
  const gruposModulos = useMemo(() => {
    const ordenModulos: Array<{ id: "Taller" | "Lubricentro" | "Car Wash" | "Tecnicentro"; icon: string }> = [
      { id: "Taller", icon: "🔧" },
      { id: "Lubricentro", icon: "🛢️" },
      { id: "Car Wash", icon: "🧼" },
      { id: "Tecnicentro", icon: "⚡" },
    ];

    const mapa: Record<string, Record<string, any[]>> = {};

    itemsPropuestaParaTrabajos.forEach((it) => {
      const { modulo, subcategoria } = clasificarItem(it);
      if (!mapa[modulo]) mapa[modulo] = {};
      if (!mapa[modulo][subcategoria]) mapa[modulo][subcategoria] = [];
      mapa[modulo][subcategoria].push(it);
    });

    return ordenModulos
      .filter((m) => mapa[m.id] && Object.keys(mapa[m.id]).length > 0)
      .map((m) => {
        const subcategorias = Object.entries(mapa[m.id]).map(([subcat, listaItems]) => ({
          nombre: subcat,
          items: listaItems,
        }));
        const totalItemsModulo = subcategorias.reduce((sum, s) => sum + s.items.length, 0);
        return {
          id: m.id,
          nombre: m.id,
          icon: m.icon,
          totalItems: totalItemsModulo,
          subcategorias,
        };
      });
  }, [itemsPropuestaParaTrabajos]);

  // Subir fotos directamente desde la propuesta a Cloudflare R2
  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !orden) return;
    setSubiendoFoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("orderId", orden.id);
        formData.append("orderNumber", orden.orderNumber);
        formData.append("plate", orden.plate);
        formData.append("folder", "taller_evidencia");
        formData.append("tipo", "image");
        formData.append("uploadedBy", orden.mechanic || "Taller");

        const res = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });
        let data: any = null;
        try {
          data = await res.json();
        } catch { }
        if (data && data.success && data.url) {
          const nuevaUrl = data.url;
          setOrden((prev) => {
            if (!prev) return prev;
            const nuevasEvs = [
              ...(prev.evidencias || []),
              {
                id: data.evidenceId || `ev_${Date.now()}_${i}`,
                type: "image" as const,
                url: nuevaUrl,
                mimeType: file.type || "image/jpeg",
                createdAt: new Date().toISOString(),
              },
            ];
            const nuevasFotos = [...(prev.photos || []), nuevaUrl];
            return { ...prev, evidencias: nuevasEvs, photos: nuevasFotos };
          });
          mostrarToast("Foto agregada con éxito.");
        }
      }
    } catch (err: any) {
      mostrarToast("Error al subir foto: " + (err.message || ""), "err");
    } finally {
      setSubiendoFoto(false);
      e.target.value = "";
    }
  };

  // Subir foto de perfil de la Persona / Cliente
  const handleSubirFotoCliente = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orden) return;
    setSubiendoFotoCliente(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "clientes");
      formData.append("tipo", "image");
      formData.append("orderId", orden.id);
      formData.append("clientIdDoc", orden.clientIdDoc || "");

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data && data.success && data.url) {
        const photoUrl = data.url;
        await fetch("/api/presupuestos/actualizar-foto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "client",
            photoUrl,
            clientIdDoc: orden.clientIdDoc,
            customerId: orden.customerId,
            clientName: orden.client,
            orderId: orden.id,
          }),
        });
        setOrden((prev) => (prev ? { ...prev, clientPhoto: photoUrl } : prev));
        setFotoClienteError(false);
        mostrarToast("Foto de perfil del cliente actualizada con éxito.");
      } else {
        mostrarToast("No se pudo subir la foto del cliente.", "err");
      }
    } catch (err: any) {
      mostrarToast("Error al subir foto de cliente: " + (err.message || ""), "err");
    } finally {
      setSubiendoFotoCliente(false);
      e.target.value = "";
    }
  };

  // Subir foto de perfil del Vehículo (foto principal)
  const handleSubirFotoVehiculoPrincipal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orden) return;
    setSubiendoFotoVehiculoPrincipal(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "vehiculos");
      formData.append("tipo", "image");
      formData.append("orderId", orden.id);
      formData.append("orderNumber", orden.orderNumber);
      formData.append("plate", orden.plate);

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data && data.success && data.url) {
        const photoUrl = data.url;
        await fetch("/api/presupuestos/actualizar-foto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "vehicle",
            photoUrl,
            plate: orden.plate,
            vehicleId: orden.vehicleId,
            orderId: orden.id,
          }),
        });
        setOrden((prev) => {
          if (!prev) return prev;
          const prevPhotos = prev.photos || [];
          return {
            ...prev,
            vehiclePhoto: photoUrl,
            photos: prevPhotos.includes(photoUrl) ? prevPhotos : [photoUrl, ...prevPhotos],
          };
        });
        setFotoVehiculoError(false);
        mostrarToast("Foto de perfil del vehículo actualizada con éxito.");
      } else {
        mostrarToast("No se pudo subir la foto del vehículo.", "err");
      }
    } catch (err: any) {
      mostrarToast("Error al subir foto del vehículo: " + (err.message || ""), "err");
    } finally {
      setSubiendoFotoVehiculoPrincipal(false);
      e.target.value = "";
    }
  };

  // Guardar Cambios en Neon PostgreSQL (Manual)
  const handleGuardarBorrador = async () => {
    if (!orden) return;
    const ok = await sincronizarConNeon();
    if (ok) {
      mostrarToast("✓ Propuesta sincronizada y guardada en Neon PostgreSQL.");
    } else {
      mostrarToast("Error al guardar en Neon.", "err");
    }
  };

  // Autorizar Cobro y Enviar al POS de Venta
  const handleAutorizarYEnviarAPos = async () => {
    if (!orden) return;
    if (repuestos.length === 0 && servicios.length === 0) {
      mostrarToast("Agrega al menos un ítem o servicio a la factura antes de autorizar.", "err");
      return;
    }
    try {
      setAutorizando(true);
      const res = await fetch("/api/presupuestos/autorizar-cobro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orden.id,
          items: repuestos,
          services: servicios,
          notes: notasFactura,
        }),
      });
      if (!res.ok) {
        let errText = `Error al transferir a POS (${res.status})`;
        try {
          const isJson = res.headers.get("content-type")?.includes("application/json");
          if (isJson) {
            const errJson = await res.json();
            errText = errJson.error || errText;
          }
        } catch { }
        mostrarToast(errText, "err");
        return;
      }
      let data: any = null;
      try {
        data = await res.json();
      } catch { }
      if (data?.success) {
        mostrarToast("¡Presupuesto autorizado y enviado a Caja POS con éxito!");
        setOrden((prev) => (prev ? { ...prev, quoteStatus: "Aprobado", status: "EN_CAJA" } : null));
      } else {
        mostrarToast(data.error || "No se pudo autorizar el cobro.", "err");
      }
    } catch {
      mostrarToast("Error de red al transferir a POS.", "err");
    } finally {
      setAutorizando(false);
    }
  };

  // Agregar nuevo repuesto (CRUD Create)
  const handleAgregarRepuesto = async () => {
    if (!nuevoNombre.trim()) return;
    const qty = parseInt(nuevaCantidad, 10) || 1;
    const cost = parseFloat(nuevoCosto) || 0;
    const pvp = parseFloat(nuevoPvp) || 0;
    const subtotalVenta = Number((pvp * qty).toFixed(2));
    const subtotalCosto = Number((cost * qty).toFixed(2));
    const margin = Number(((pvp - cost) * qty).toFixed(2));
    const marginPercent = pvp > 0 ? Math.round(((pvp - cost) / pvp) * 100) : 0;
    const pinActivo = hallazgoActivoParaAsignar;

    const nuevoItem: ItemPropuesta = {
      id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productId: nuevoProductId || null,
      findingId: pinActivo?.id || null,
      code: nuevoCodigo.trim() || `REP-${Date.now().toString().slice(-4)}`,
      name: nuevoNombre.trim(),
      category: nuevoCategoria || "Repuestos",
      qty,
      costPrice: cost,
      price: pvp,
      subtotalVenta,
      subtotalCosto,
      margin,
      marginPercent,
      supplierName: nuevoEnStock ? "Bodega Taller" : (nuevoProveedor || "Proveedor General"),
      purchaseStatus: nuevoEnStock ? "STOCK_LOCAL" : "POR_PEDIR",
      inStock: nuevoEnStock,
      origin: nuevoOrigen,
      notes: pinActivo
        ? `[Evidencia #${pinActivo.numeroEvidencia || pinActivo.pinNumber || 1}] ${pinActivo.tipo || ""}`.trim()
        : undefined,
    };

    const nuevosRepuestos = [...repuestos, nuevoItem];
    setRepuestos(nuevosRepuestos);

    let findingsActualizados = orden?.inspectionFindings || hallazgos;
    if (pinActivo) {
      findingsActualizados = findingsActualizados.map((h: any) => {
        if (h.id === pinActivo.id || h.originalId === pinActivo.id) {
          const linked = Array.isArray(h.linkedItems) ? [...h.linkedItems] : [];
          linked.push({
            id: nuevoItem.id,
            name: nuevoItem.name,
            code: nuevoItem.code,
            price: nuevoItem.price,
            costPrice: nuevoItem.costPrice,
            qty: nuevoItem.qty,
            type: "PART",
            productId: nuevoItem.productId,
            category: nuevoItem.category,
          });
          return { ...h, linkedItems: linked };
        }
        return h;
      });
      setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));
    }

    setNuevoNombre("");
    setNuevoCodigo("");
    setNuevoCategoria("");
    setNuevoProductId(null);
    setNuevoCosto("0");
    setNuevoPvp("0");
    setNuevaCantidad("1");
    setHallazgoActivoParaAsignar(null);
    setModalNuevoRepuesto(false);
    setBusquedaProductoNeon("");

    await sincronizarConNeon(nuevosRepuestos, servicios, findingsActualizados);
    mostrarToast("✓ Producto registrado y guardado en Neon PostgreSQL.");
  };

  // Agregar nuevo servicio (CRUD Create)
  const handleAgregarServicio = async () => {
    if (!nuevoServicioNombre.trim()) return;
    const precio = parseFloat(nuevoServicioPrecio) || 0;
    const pinActivo = hallazgoActivoParaAsignar;

    const nuevoSrv: ServicioPropuesta = {
      id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      findingId: pinActivo?.id || null,
      code: nuevoServicioCodigo.trim() || `SRV-${Date.now().toString().slice(-4)}`,
      name: nuevoServicioNombre.trim(),
      category: "Mano de Obra",
      price: precio,
      mechanic: orden?.mechanic || "Taller",
      origin: nuevoServicioOrigen,
      notes: pinActivo
        ? `[Evidencia #${pinActivo.numeroEvidencia || pinActivo.pinNumber || 1}] ${pinActivo.tipo || ""}`.trim()
        : undefined,
    };

    const nuevosServicios = [...servicios, nuevoSrv];
    setServicios(nuevosServicios);

    let findingsActualizados = orden?.inspectionFindings || hallazgos;
    if (pinActivo) {
      findingsActualizados = findingsActualizados.map((h: any) => {
        if (h.id === pinActivo.id || h.originalId === pinActivo.id) {
          const linked = Array.isArray(h.linkedItems) ? [...h.linkedItems] : [];
          linked.push({
            id: nuevoSrv.id,
            name: nuevoSrv.name,
            code: nuevoSrv.code,
            price: nuevoSrv.price,
            qty: 1,
            type: "SERVICE",
            category: "Mano de Obra",
          });
          return { ...h, linkedItems: linked };
        }
        return h;
      });
      setOrden((prev: any) => (prev ? { ...prev, inspectionFindings: findingsActualizados } : prev));
    }

    setNuevoServicioNombre("");
    setNuevoServicioCodigo("");
    setNuevoServicioPrecio("0");
    setHallazgoActivoParaAsignar(null);
    setModalNuevoServicio(false);
    setBusquedaServicioNeon("");

    await sincronizarConNeon(repuestos, nuevosServicios, findingsActualizados);
    mostrarToast("✓ Servicio registrado y guardado en Neon PostgreSQL.");
  };

  const handleImprimir = () => {
    window.print();
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-400">Cargando factura proforma del vehículo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#111113] border border-rose-500/30 rounded-3xl p-6 text-center space-y-4 shadow-xl">
            <div className="text-3xl">⚠️</div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{error || "Factura / Presupuesto no disponible"}</h2>
            <Link
              href="/presupuestos"
              className="inline-flex h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold items-center justify-center transition-all cursor-pointer"
            >
              ← Volver a Presupuestos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const esPagado = esPagadoLocal !== null ? esPagadoLocal : (orden.quoteStatus === "Pagado" || orden.status === "Pagado");
  const esPausado = esPausadoLocal !== null ? esPausadoLocal : (orden.status === "Pausada");
  const esAprobado = esAprobadoLocal !== null ? esAprobadoLocal : (orden.quoteStatus === "Aprobado" || orden.status === "EN_CAJA");

  const limpiarNumeroOrden = (val?: string | number | null) => {
    if (!val) return "";
    return String(val)
      .replace(/\b(COT|COTIZACION|COTIZACIÓN|OT|ORD)\b[-\s#]*/gi, "")
      .replace(/#+/g, "")
      .replace(/^[-_\s]+|[-_\s]+$/g, "")
      .trim();
  };

  const handleToggleEstado = async () => {
    if (cambiandoEstado) return;
    const nuevoEstado = esAprobado && !esPausado ? "Pendiente" : "Aprobado";
    try {
      setCambiandoEstado(true);
      const res = await fetch("/api/presupuestos/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orden.id, quoteStatus: nuevoEstado }),
      });
      if (res.ok) {
        setEsAprobadoLocal(nuevoEstado === "Aprobado");
        if (nuevoEstado === "Aprobado") setEsPausadoLocal(false);
        mostrarToast(
          nuevoEstado === "Aprobado"
            ? "Propuesta aprobada · Ya figura Trabajando en Taller"
            : "Estado: En Espera"
        );
      } else {
        mostrarToast("No se pudo cambiar el estado", "err");
      }
    } catch {
      mostrarToast("Error de conexión al cambiar estado", "err");
    } finally {
      setCambiandoEstado(false);
    }
  };

  const handleTogglePausa = async () => {
    if (cambiandoEstado) return;
    const nuevoEstado = esPausado ? "Aprobado" : "Pausada";
    try {
      setCambiandoEstado(true);
      const res = await fetch("/api/presupuestos/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orden.id, quoteStatus: nuevoEstado }),
      });
      if (res.ok) {
        const pausando = nuevoEstado === "Pausada";
        setEsPausadoLocal(pausando);
        if (!pausando) setEsAprobadoLocal(true);
        mostrarToast(
          pausando
            ? "Orden en Pausa · Ya figura Pausada en Taller"
            : "Orden reanudada · Ya figura Trabajando en Taller"
        );
      } else {
        mostrarToast("No se pudo cambiar a Pausa", "err");
      }
    } catch {
      mostrarToast("Error de conexión al cambiar estado", "err");
    } finally {
      setCambiandoEstado(false);
    }
  };

  const handleTogglePagado = async () => {
    if (cambiandoEstado) return;
    const nuevoEstado = esPagado ? "Aprobado" : "Pagado";
    try {
      setCambiandoEstado(true);
      const res = await fetch("/api/presupuestos/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orden.id, quoteStatus: nuevoEstado }),
      });
      if (res.ok) {
        setEsPagadoLocal(nuevoEstado === "Pagado");
        if (nuevoEstado === "Pagado") {
          try {
            const activaId = localStorage.getItem("taller_orden_activa_id");
            if (activaId === orden.id || activaId === orden.orderNumber) {
              localStorage.removeItem("taller_orden_activa_id");
            }
          } catch {}
        }
        mostrarToast(nuevoEstado === "Pagado" ? "Trabajo marcado como Pagado (retirado de Pista de Taller)" : "Estado: Aprobado");
      } else {
        mostrarToast("No se pudo cambiar el estado de pago", "err");
      }
    } catch {
      mostrarToast("Error de conexión al cambiar estado", "err");
    } finally {
      setCambiandoEstado(false);
    }
  };

  // Barra moderna minimalista deslizable para añadir servicios y productos adicionales con foto, audio y tiempo
  const renderBarraAgregarAdicional = (origen: EspecialidadTipo) => (
    <div className="print:hidden p-3 sm:p-3.5 rounded-2xl bg-zinc-50/90 dark:bg-[#131318] border border-zinc-200 dark:border-white/10 space-y-2.5 shadow-2xs">
      <div className="flex flex-wrap items-center gap-2">
        {/* Selector Servicio / Producto (1 palabra + icono) */}
        <div className="inline-flex rounded-xl bg-zinc-200/70 dark:bg-black/60 p-0.5 border border-zinc-300/60 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setTipoRapido("PART")}
            className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
              tipoRapido === "PART"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span>📦</span>
            <span>Producto</span>
          </button>
          <button
            type="button"
            onClick={() => setTipoRapido("SERVICE")}
            className={`h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
              tipoRapido === "SERVICE"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span>🔧</span>
            <span>Servicio</span>
          </button>
        </div>

        {/* Toggle Bodega vs Pedir (1 palabra + icono) */}
        <button
          type="button"
          onClick={() => setEnStockRapido((p) => !p)}
          className={`h-9 px-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
            enStockRapido
              ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300"
          }`}
          title={enStockRapido ? "En Bodega" : "Para pedir a Proveedor"}
        >
          <span>{enStockRapido ? "🏢" : "🚚"}</span>
          <span>{enStockRapido ? "Bodega" : "Pedir"}</span>
        </button>

        {/* Input Descripción */}
        <input
          type="text"
          value={descripcionRapida}
          onChange={(e) => setDescripcionRapida(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAgregarRapidoEnPropuesta(origen);
            }
          }}
          placeholder={tipoRapido === "SERVICE" ? "Añadir servicio manual o adicional..." : "Añadir producto / repuesto manual (sin stock)..."}
          className="flex-1 min-w-[180px] h-9 px-3 rounded-xl bg-white dark:bg-black/70 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-blue-500"
        />

        {/* Iconos de Cámara, Galería y Audio para ingreso manual */}
        <div className="flex items-center gap-1 shrink-0">
          <label
            className="w-9 h-9 rounded-xl bg-white dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/15 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 cursor-pointer transition-all active:scale-95 relative"
            title="Tomar Foto"
          >
            <span>📷</span>
            {fotosBorradorRapido.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
                {fotosBorradorRapido.length}
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={subiendoMediaRapido}
              onChange={(e) => handleSubirMediaBorrador(e, "foto")}
              className="hidden"
            />
          </label>

          <label
            className="w-9 h-9 rounded-xl bg-white dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 cursor-pointer transition-all active:scale-95"
            title="Subir Imagen"
          >
            <span>🖼️</span>
            <input
              type="file"
              accept="image/*"
              disabled={subiendoMediaRapido}
              onChange={(e) => handleSubirMediaBorrador(e, "foto")}
              className="hidden"
            />
          </label>

          <label
            className="w-9 h-9 rounded-xl bg-white dark:bg-white/5 hover:bg-amber-50 dark:hover:bg-amber-500/15 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-amber-600 dark:text-amber-400 cursor-pointer transition-all active:scale-95 relative"
            title="Adjuntar Audio"
          >
            <span>🎙️</span>
            {audiosBorradorRapido.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                {audiosBorradorRapido.length}
              </span>
            )}
            <input
              type="file"
              accept="audio/*"
              disabled={subiendoMediaRapido}
              onChange={(e) => handleSubirMediaBorrador(e, "audio")}
              className="hidden"
            />
          </label>
        </div>

        {/* Botón + Añadir (1 palabra + icono) */}
        <button
          type="button"
          onClick={() => handleAgregarRapidoEnPropuesta(origen)}
          className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs shrink-0"
          title="Añadir a la propuesta"
        >
          <span>+</span>
          <span>Añadir</span>
        </button>

        {/* Botón Catálogo Taller (1 palabra + icono) */}
        <button
          type="button"
          onClick={() => setModalCatalogoTallerAbierto({ abierto: true, origen })}
          className="h-9 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
          title="Abrir Catálogo con Carrito"
        >
          <span>🛒</span>
          <span>Catálogo</span>
        </button>

        {/* Botón Rápidos (1 palabra + icono) */}
        <button
          type="button"
          onClick={() => {
            setBusquedaAccesoRapido("");
            setModalAccesosRapidosAbierto({ abierto: true, origen });
          }}
          className="h-9 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
          title="Servicios Rápidos"
        >
          <span>⚡</span>
          <span>Rápidos</span>
        </button>
      </div>

      {/* Chips deslizables de Tiempo (1 palabra) + Previsualización de adjuntos */}
      <div className="flex items-center justify-between gap-2 pt-0.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1 pr-1">
            <span>⏱️</span>
            <span>Tiempo:</span>
          </span>
          {OPCIONES_TIEMPO_RAPIDO.map((op) => {
            const activo = tiempoRapido === op.id;
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => setTiempoRapido(activo ? "" : op.id)}
                className={`h-6 px-2 rounded-lg text-[11px] font-medium transition-all cursor-pointer shrink-0 border ${
                  activo
                    ? "bg-blue-600 text-white border-blue-500 shadow-2xs"
                    : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                {op.label}
              </button>
            );
          })}
        </div>

        {(fotosBorradorRapido.length > 0 || audiosBorradorRapido.length > 0) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {fotosBorradorRapido.map((f, i) => (
              <img key={i} src={f} alt="Adjunto" className="w-6 h-6 rounded object-cover border border-blue-500/40" />
            ))}
            {audiosBorradorRapido.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                🎙️ {audiosBorradorRapido.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setFotosBorradorRapido([]);
                setAudiosBorradorRapido([]);
              }}
              className="text-[10px] text-rose-500 hover:underline cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Fila deslizable moderna y minimalista (con títulos de 1 sola palabra + iconos, Tiempo, Envío, Sí hay / No hay y WhatsApp)
  const renderFilaItemPropuesta = (
    item: any,
    itemIdx: number,
    pin?: any,
    sec?: any,
    etiquetaOrigen?: string
  ) => {
    const esServicio = Boolean(item.isService);
    const numEvidencia = pin ? (pin.numeroEvidencia || pin.pinNumber || 1) : null;
    const textoDanio = pin
      ? item.danio || (pin.tipo ? formatoPrimeraMayuscula(pin.tipo) : `${formatoPrimeraMayuscula(sec?.nombre || "Taller")} (#${numEvidencia})`)
      : item.danio || (item.isManual ? "Manual" : etiquetaOrigen || "Adicional");
    const textoDescripcion =
      (pin?.descripcion && pin.descripcion.trim()) ||
      (item.descripcion && item.descripcion.trim()) ||
      (item.notes && !item.notes.startsWith("[Evidencia") ? item.notes.trim() : "") ||
      "";
    const modoLinea = modosLineas[item.id] || "DETALLES";
    const dispProv = item.supplierAvailability; // "SI_HAY" | "NO_HAY" | null
    const metodoEnvioObj = OPCIONES_ENVIO_RAPIDO.find((e) => e.id === item.shippingMethod);

    return (
      <tr key={item.id ? `${item.id}-${itemIdx}` : `row-item-${itemIdx}`} className="hover:bg-white/80 dark:hover:bg-white/[0.02] transition-colors">
        <td className="py-2 px-2.5 text-center">
          <input
            type="checkbox"
            checked={!!verificadosIds[item.id]}
            onChange={() => toggleVerificadoItem(item.id)}
            className="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer"
          />
        </td>

        {/* 1. ORIGEN / DAÑO */}
        <td className="py-2 px-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-semibold text-xs ${pin ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"}`}>
              {textoDanio}
            </span>
            {item.isManual && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium">
                Manual
              </span>
            )}
          </div>
        </td>

        {/* 2. ÍTEM + ICONOS FOTO / AUDIO + BADGES PROVEEDOR */}
        <td className="py-2 px-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-zinc-900 dark:text-white font-medium text-xs">
                  {item.name}
                </span>
                {/* Respuesta automática del proveedor */}
                {dispProv === "SI_HAY" && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    ✓ Sí hay
                  </span>
                )}
                {dispProv === "NO_HAY" && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/35 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                    ✕ No hay
                  </span>
                )}
                {metodoEnvioObj && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/25 text-cyan-700 dark:text-cyan-300 text-[10px] font-medium">
                    <span>{metodoEnvioObj.icon}</span>
                    <span>{metodoEnvioObj.label}</span>
                  </span>
                )}
              </div>
              {textoDescripcion ? (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5 truncate" title={textoDescripcion}>
                  {textoDescripcion}
                </span>
              ) : null}
            </div>

            {/* Iconos minimalistas de Foto, Audio y Envío rápido a Proveedor */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleAbrirFlotanteFotos(pin || item)}
                className="w-7 h-7 rounded-xl bg-blue-50/90 dark:bg-blue-500/15 border border-blue-200/80 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all cursor-pointer active:scale-95"
                title="Fotos"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="4" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleAbrirFlotanteAudios(pin || item)}
                className="w-7 h-7 rounded-xl bg-amber-50/90 dark:bg-amber-500/15 border border-amber-200/80 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-all cursor-pointer active:scale-95"
                title="Audio"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </button>
              {(!item.inStock || item.isManual) && (
                <button
                  type="button"
                  onClick={() => abrirModalProveedor("INDIVIDUAL", item, pin)}
                  className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-all cursor-pointer active:scale-95"
                  title="Enviar a Proveedor por WhatsApp"
                >
                  <span>📤</span>
                </button>
              )}
            </div>
          </div>
        </td>

        {/* 3. TIEMPO (1 palabra + icono, clic para deslizar/elegir Tiempo y Envío) */}
        <td className="py-2 px-2 text-center">
          <button
            type="button"
            onClick={() => setItemTiempoEnvioModal({ id: item.id, isService: esServicio })}
            className={`h-6 px-2 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
              item.deliveryTime
                ? "bg-blue-500/15 border-blue-500/35 text-blue-700 dark:text-blue-300 font-semibold"
                : "bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300"
            }`}
            title="Tiempo de llegada y método de envío"
          >
            <span>⏱️</span>
            <span>{item.deliveryTime || "Tiempo"}</span>
          </button>
        </td>

        {/* COLUMNAS DESLIZABLES SEGÚN EL MODO (DETALLES / MANUAL / PROVEEDOR) */}
        {modoLinea === "DETALLES" && (
          <>
            {/* TIPO + BODEGA/PEDIR */}
            <td className="py-2 px-2 text-center">
              <div className="inline-flex items-center gap-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    esServicio
                      ? "bg-purple-500/10 border-purple-500/25 text-purple-600 dark:text-purple-400"
                      : "bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  <span>{esServicio ? "🔧" : "📦"}</span>
                  <span>{esServicio ? "Servicio" : "Producto"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleStock(item.id)}
                  className={`h-5 px-1.5 rounded-md text-[10px] font-semibold border cursor-pointer transition-all ${
                    item.inStock !== false
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
                  }`}
                  title="Alternar Bodega vs Pedir a Proveedor"
                >
                  {item.inStock !== false ? "🏢" : "🚚"}
                </button>
              </div>
            </td>

            {/* CANTIDAD */}
            <td className="py-2 px-2 text-center">
              {esServicio ? (
                <span className="font-mono text-zinc-700 dark:text-zinc-300">1</span>
              ) : (
                <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-white dark:bg-black">
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item.id, -1)}
                    className="w-5 h-6 text-zinc-500 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-mono text-zinc-900 dark:text-white text-xs">
                    {item.qty || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateQty(item.id, 1)}
                    className="w-5 h-6 text-zinc-500 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}
            </td>

            {/* SUBTOTAL / PVP */}
            <td className="py-2 px-2.5 text-right font-mono font-medium text-zinc-900 dark:text-white">
              ${Number(item.subtotal ?? item.subtotalVenta ?? (item.price * (item.qty || 1))).toFixed(2)}
            </td>
          </>
        )}

        {modoLinea === "MANUAL" && (
          <>
            {/* COSTO */}
            <td className="py-2 px-2 text-center">
              <div className="inline-flex flex-col items-center">
                <span className="text-[9px] text-zinc-400 uppercase font-semibold leading-none mb-1">Costo</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.costPrice || 0}
                  onChange={(e) =>
                    esServicio
                      ? handleUpdateItemFields(item.id, true, { costPrice: parseFloat(e.target.value) || 0 })
                      : handleUpdatePrice(item.id, "costPrice", e.target.value)
                  }
                  className="w-16 h-6 px-1 text-right rounded bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 font-mono text-zinc-700 dark:text-zinc-300 text-xs"
                  placeholder="0.00"
                />
              </div>
            </td>
            {/* PVP */}
            <td className="py-2 px-2 text-center">
              <div className="inline-flex flex-col items-center">
                <span className="text-[9px] text-zinc-400 uppercase font-semibold leading-none mb-1">PVP</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.price || 0}
                  onChange={(e) => (esServicio ? handleUpdateServicePrice(item.id, e.target.value) : handleUpdatePrice(item.id, "price", e.target.value))}
                  className="w-16 h-6 px-1 text-right rounded bg-purple-50/50 dark:bg-black border border-purple-500/30 font-mono text-purple-700 dark:text-purple-300 font-bold text-xs"
                  placeholder="0.00"
                />
              </div>
            </td>
            {/* MARGEN */}
            <td className="py-2 px-2.5 text-right">
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-zinc-400 uppercase font-semibold leading-none mb-0.5">Margen</span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {item.price > 0 ? `${Math.round(((item.price - (item.costPrice || 0)) / item.price) * 100)}%` : "0%"}
                </span>
              </div>
            </td>
          </>
        )}

        {modoLinea === "PROVEEDOR" && (
          <>
            {/* STOCK: BODEGA / PEDIR + SI HAY / NO HAY */}
            <td className="py-2 px-2 text-center">
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleStock(item.id)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer border transition-all ${
                    item.inStock !== false
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  <span>{item.inStock !== false ? "🏢 Bodega" : "🚚 Pedir"}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateItemFields(item.id, esServicio, {
                      supplierAvailability: dispProv === "SI_HAY" ? "NO_HAY" : "SI_HAY",
                    })
                  }
                  className={`h-5 px-1.5 rounded-full text-[10px] font-bold cursor-pointer border transition-all ${
                    dispProv === "SI_HAY"
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : dispProv === "NO_HAY"
                      ? "bg-rose-600 text-white border-rose-500"
                      : "bg-zinc-100 dark:bg-white/10 text-zinc-500 border-zinc-300 dark:border-white/10"
                  }`}
                  title="Estado confirmado por el proveedor: Sí hay / No hay"
                >
                  {dispProv === "SI_HAY" ? "✓ Sí" : dispProv === "NO_HAY" ? "✕ No" : "?"}
                </button>
              </div>
            </td>
            {/* ENVÍO */}
            <td className="py-2 px-2 text-center">
              <button
                type="button"
                onClick={() => setItemTiempoEnvioModal({ id: item.id, isService: esServicio })}
                className="h-6 px-2 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 cursor-pointer"
                title="Elegir método de envío"
              >
                <span>{metodoEnvioObj?.icon || "🛵"}</span>
                <span>{metodoEnvioObj?.label || "Envío"}</span>
              </button>
            </td>
            {/* WHATSAPP INDIVIDUAL */}
            <td className="py-2 px-2.5 text-right">
              <button
                type="button"
                onClick={() => abrirModalProveedor("INDIVIDUAL", item, pin)}
                className="h-6 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition-all active:scale-95 inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Enviar a Proveedor por WhatsApp"
              >
                <span>📤</span>
                <span>Enviar</span>
              </button>
            </td>
          </>
        )}

        {/* ACCIONES DESLIZABLES: DETALLES <-> MANUAL <-> PROVEEDOR + ELIMINAR */}
        <td className="py-2 px-2 text-center">
          <div className="flex items-center justify-center gap-1">
            {modoLinea !== "DETALLES" && (
              <button
                type="button"
                onClick={() => retrocederModoLinea(item.id)}
                className="w-6 h-6 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-600 dark:text-zinc-300 flex items-center justify-center text-xs font-bold transition-all cursor-pointer active:scale-95"
                title="Anterior"
              >
                ←
              </button>
            )}

            <button
              type="button"
              onClick={() => avanzarModoLinea(item.id)}
              className={`h-6 px-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-0.5 transition-all cursor-pointer active:scale-95 ${
                modoLinea === "DETALLES"
                  ? "bg-purple-50 hover:bg-purple-100 dark:bg-purple-500/10 border-purple-300/80 dark:border-purple-500/30 text-purple-700 dark:text-purple-300"
                  : modoLinea === "MANUAL"
                  ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 border-amber-300/80 dark:border-amber-500/30 text-amber-700 dark:text-amber-300"
                  : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300/80 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <span>
                {modoLinea === "DETALLES" ? "Manual" : modoLinea === "MANUAL" ? "Proveedor" : "Detalles"}
              </span>
              <span>→</span>
            </button>

            <button
              type="button"
              onClick={() => (esServicio ? handleDeleteService(item.id) : handleDeleteItem(item.id))}
              className="w-6 h-6 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 flex items-center justify-center cursor-pointer transition-colors text-xs"
              title="Eliminar"
            >
              ✕
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-12 text-zinc-900 dark:text-white selection:bg-blue-500/30">
      {/* Toast Notificaciones */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2 animate-bounce print:hidden ${toast.tipo === "ok"
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            : "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
            }`}
        >
          <span>{toast.tipo === "ok" ? "✓" : "✕"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* CABECERA ESTÁNDAR Y BARRA DE ACCIONES SUPERIORES (SIN FONDO BLANCO) */}
      <div className="print:hidden">
        <Header />

        {/* Barra de Título Propuesta y Acciones */}
        <section className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/presupuestos"
                title="Volver a Propuestas"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-xs active:scale-95 group shrink-0"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                    Propuesta
                  </h1>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                    {orden.quoteNumber || `COT-${orden.orderNumber}`}
                  </span>
                </div>

              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Botón minimalista 1 palabra + icono: Proveedor */}
              <button
                type="button"
                onClick={() => abrirModalProveedor("MASIVO")}
                className="h-10 px-3.5 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/25 border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-medium transition-all active:scale-95 flex items-center gap-2 cursor-pointer shadow-2xs shrink-0"
                title="Enviar pedido al Proveedor por WhatsApp"
              >
                <span>🚚</span>
                <span>Proveedor</span>
                {calculos.itemsPorComprar.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    {calculos.itemsPorComprar.length}
                  </span>
                )}
              </button>

              {/* 1. Vista Link Proveedor */}
              <button
                type="button"
                onClick={() => {
                  const targetId = orden.id || params?.id;
                  if (typeof window !== "undefined" && targetId) {
                    window.open(`/pedidos-proveedor/${encodeURIComponent(String(targetId))}`, "_blank");
                  }
                }}
                className="w-10 h-10 rounded-2xl bg-amber-50/90 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-100/80 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs shrink-0 transition-all"
                title="Vista Link Proveedor"
                aria-label="Vista Link Proveedor"
              >
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>

              {/* 2. Proveedores */}
              <button
                type="button"
                onClick={() => setModalWhatsApp(true)}
                className="w-10 h-10 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 active:scale-95 flex items-center justify-center cursor-pointer shadow-2xs shrink-0 transition-all"
                title="Proveedores y Envíos WhatsApp"
                aria-label="Proveedores"
              >
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.175V14.25m0 0H2.25m12 0v4.5m0-4.5H16.5" />
                </svg>
              </button>

              {/* 3. Botón Imprimir */}
              <button
                type="button"
                onClick={handleImprimir}
                className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-200 active:scale-95 text-base shadow-2xs transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Imprimir Proforma"
                aria-label="Imprimir Proforma"
              >
                <svg className="w-4 h-4 text-zinc-700 dark:text-zinc-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>

              {/* 4. Botón Vista Móvil / Cliente */}
              <button
                type="button"
                onClick={() => {
                  const targetToken = (orden as any)?.quoteToken || orden.id || (params as any)?.id;
                  if (typeof window !== "undefined" && targetToken) {
                    window.open(`/taller/presupuesto/${encodeURIComponent(String(targetToken))}`, "_blank");
                  }
                }}
                className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 hover:bg-teal-100/70 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
                title="Abrir Vista Móvil para el Cliente"
                aria-label="Abrir Vista Móvil para el Cliente"
              >
                <svg className="w-4 h-4 text-teal-700 dark:text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* DOCUMENTO PRINCIPAL POR TARJETAS DESLIZABLES INTELIGENTES */}
      <main className="w-full max-w-[1920px] mx-auto p-3 sm:p-6 md:p-8 lg:px-8 mt-2 sm:mt-4 print:m-0 print:p-0 print:max-w-none space-y-4">
        {/* BARRA DE TARJETAS DESLIZABLES (STEPPER INTELIGENTE) */}
        {(() => {
          const totalItemsPago = repuestos.length + servicios.length;

          const tarjetasMeta = [
            {
              idx: 0,
              titulo: "Vehículo",
              iconBg: "bg-blue-500/10 text-blue-500",
              icon: (
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ),
              count: undefined,
            },
            {
              idx: 1,
              titulo: "Taller",
              iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
              icon: (
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.455.087.935-.012 1.39" />
                </svg>
              ),
              count: totalItemsPago,
            },
            {
              idx: 2,
              titulo: "Pago",
              iconBg: "bg-emerald-500/10 text-emerald-500",
              icon: (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              ),
              count: totalItemsPago,
            },
          ];

          return (
            <div className="print:hidden bg-white dark:bg-[#0f0f13] border border-zinc-200 dark:border-white/10 rounded-2xl p-2 sm:p-2.5 shadow-2xs">
              <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {tarjetasMeta.map((t) => {
                  const activa = tarjetaActiva === t.idx;
                  return (
                    <button
                      key={t.idx}
                      type="button"
                      onClick={() => setTarjetaActiva(t.idx)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl border text-center transition-all cursor-pointer shrink-0 ${
                        activa
                          ? "bg-indigo-50/60 dark:bg-indigo-950/25 border-indigo-400 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs"
                          : "bg-white dark:bg-[#16161b] border-zinc-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${t.iconBg}`}>
                        {t.icon}
                      </span>
                      <span className="text-xs sm:text-sm whitespace-nowrap">
                        {t.titulo}
                      </span>
                      {t.count !== undefined && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-white/10">
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div
          onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            if (touchStartX === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartX;
            const diff = touchStartX - endX;
            if (Math.abs(diff) > 60) {
              if (diff > 0 && tarjetaActiva < 2) setTarjetaActiva((p) => Math.min(2, p + 1));
              if (diff < 0 && tarjetaActiva > 0) setTarjetaActiva((p) => Math.max(0, p - 1));
            }
            setTouchStartX(null);
          }}
          className="bg-white dark:bg-[#0f0f13] border border-zinc-200 dark:border-white/10 rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl space-y-6 print:border-none print:shadow-none print:p-4 print:rounded-none transition-all"
        >
          {/* ===================================================================
              TARJETA 1 (idx 0): CABECERA + DATOS DEL CLIENTE Y VEHÍCULO
              =================================================================== */}
          <div className={tarjetaActiva === 0 ? "space-y-6" : "hidden print:block print:space-y-6"}>
          {/* CABECERA DE LA FACTURA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-white/10">
            <div>
              <div className="flex items-center gap-3">
                {/* Logotipo Oficial Auto / G */}
                <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-2xl font-black tracking-tight leading-none">
                    <span className="text-blue-600 dark:text-blue-500">Auto</span>
                    <span className="text-zinc-400 dark:text-zinc-500 font-light px-0.5">/</span>
                    <span className="text-zinc-900 dark:text-white">G</span>
                  </div>
                  <p className="text-xs sm:text-sm font-normal text-zinc-500 dark:text-zinc-400 mt-1">
                    Centro Automotriz
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-normal mt-0.5">
                    Ingresado por: {orden?.mechanic ? orden.mechanic.replace(/\s*\([^)]*\)/g, "").trim() : "Carlos Rodríguez"}
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:text-right w-full sm:w-auto p-4 rounded-2xl bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 space-y-1 shrink-0">
              <h3 className="text-sm font-normal text-zinc-900 dark:text-white">
                Orden #{limpiarNumeroOrden(orden.orderNumber || orden.quoteNumber)}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Fecha: {orden.dateIn ? new Date(orden.dateIn).toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" }) : new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* FICHA TÉCNICA REDISEÑADA: DATOS DEL CLIENTE Y VEHÍCULO CON FOTOS DE PERFIL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* 1. TARJETA PERFIL DEL CLIENTE */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                {/* Cabecera Tarjeta Cliente */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-sm">
                      👤
                    </span>
                    <span className="text-sm font-normal text-zinc-700 dark:text-zinc-300">
                      Cliente
                    </span>
                  </div>
                </div>

                {/* Perfil del Cliente: Foto Avatar + Datos Principales */}
                <div className="pt-3.5 flex items-center gap-3.5 sm:gap-4">
                  {/* Foto de Perfil / Avatar */}
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-white/15 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 shadow-sm flex items-center justify-center">
                      {!fotoClienteError && orden.clientPhoto && !orden.clientPhoto.startsWith("blob:") ? (
                        <img
                          src={
                            orden.clientPhoto.startsWith("http") || orden.clientPhoto.startsWith("/") || orden.clientPhoto.startsWith("data:")
                              ? orden.clientPhoto
                              : `/api/storage/download?key=${encodeURIComponent(orden.clientPhoto)}`
                          }
                          alt={orden.client}
                          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                          onClick={() => setFotoZoom(orden.clientPhoto!)}
                          onError={() => setFotoClienteError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 text-white font-black text-lg sm:text-xl tracking-wider select-none">
                          {(() => {
                            const p = (orden.client || "Cliente").trim().split(/\s+/).filter(Boolean);
                            return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
                          })()}
                        </div>
                      )}

                      {/* Overlay para Cambiar / Ver Foto */}
                      <label
                        className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-normal cursor-pointer rounded-2xl print:hidden gap-0.5"
                        title="Cambiar foto de perfil del cliente"
                      >
                        <span>📷</span>
                        <span>{subiendoFotoCliente ? "Subiendo..." : "Cambiar"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={subiendoFotoCliente}
                          onChange={handleSubirFotoCliente}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Nombre y detalles de identificación rápida */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="text-base sm:text-lg font-normal text-zinc-900 dark:text-white truncate"
                        title={orden.client}
                      >
                        {orden.client}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
                      {(() => {
                        const esEmpresa =
                          orden.customerType === "Empresa" ||
                          (orden.clientIdDoc && orden.clientIdDoc.length === 13) ||
                          /\b(S\.?A\.?|CIA\.?|LTDA\.?|CORP\.?|INC\.?|EMPRESA)\b/i.test(orden.client || "");
                        const tipoClienteEtiqueta = esEmpresa ? "Empresa" : "Persona";
                        const tipoClienteIcono = esEmpresa ? "🏢" : "👤";

                        return (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-xs ${
                              esEmpresa
                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
                            }`}
                          >
                            <span>{tipoClienteIcono}</span>
                            <span>{tipoClienteEtiqueta}</span>
                          </span>
                        );
                      })()}
                    </div>

                    <div className="pt-0.5 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-xs font-normal text-blue-600 dark:text-blue-400 truncate">
                        {orden.status || "En Taller"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid con campos estructurados del cliente */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-3.5">
                  <div className="p-2.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      Cédula / RUC
                    </span>
                    <span className="text-xs sm:text-sm font-normal text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                      {orden.clientIdDoc || "CLI-151951"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      WhatsApp
                    </span>
                    <span className="text-xs sm:text-sm font-normal text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                      {orden.clientPhone || "S/N"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TARJETA PERFIL DEL VEHÍCULO */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                {/* Cabecera Tarjeta Vehículo */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-sm">
                      🚗
                    </span>
                    <span className="text-sm font-normal text-zinc-700 dark:text-zinc-300">
                      Vehículo
                    </span>
                  </div>

                  {/* Placa estilo matriculación ecuatoriana */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-normal px-2.5 py-0.5 rounded-md bg-amber-400 text-black border border-amber-500">
                      {orden.plate}
                    </span>
                  </div>
                </div>

                {/* Perfil del Vehículo: Foto Principal Hero + Datos del Modelo */}
                <div className="pt-3.5 flex items-center gap-3.5 sm:gap-4">
                  {/* Foto de Perfil del Vehículo */}
                  {(() => {
                    let fotoVehiculoPerfil: string | null = null;
                    if (!fotoVehiculoError) {
                      const vPhoto =
                        orden.vehiclePhoto && typeof orden.vehiclePhoto === "string" && !orden.vehiclePhoto.startsWith("blob:")
                          ? orden.vehiclePhoto.trim()
                          : null;
                      if (vPhoto) {
                        fotoVehiculoPerfil =
                          vPhoto.startsWith("http") || vPhoto.startsWith("/") || vPhoto.startsWith("data:")
                            ? vPhoto
                            : `/api/storage/download?key=${encodeURIComponent(vPhoto)}`;
                      } else if (fotosVehiculo.length > 0) {
                        fotoVehiculoPerfil = fotosVehiculo[0];
                      }
                    }

                    return (
                      <div className="relative group shrink-0">
                        <div className="w-20 h-16 sm:w-24 sm:h-20 rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-white/15 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 shadow-sm flex items-center justify-center">
                          {fotoVehiculoPerfil ? (
                            <img
                              src={fotoVehiculoPerfil}
                              alt={orden.vehicle}
                              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                              onClick={() => setFotoZoom(fotoVehiculoPerfil)}
                              onError={() => setFotoVehiculoError(true)}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 p-1 text-center">
                              <span className="text-xl sm:text-2xl">🏎️</span>
                              <span className="text-[9px] font-bold mt-0.5 uppercase tracking-tight">Sin Foto</span>
                            </div>
                          )}

                          {/* Overlay para Cambiar / Ver Foto del Auto */}
                          <label
                            className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-normal cursor-pointer rounded-2xl print:hidden gap-0.5"
                            title="Cambiar foto de perfil del vehículo"
                          >
                            <span>📷</span>
                            <span>{subiendoFotoVehiculoPrincipal ? "Subiendo..." : "Cambiar"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={subiendoFotoVehiculoPrincipal}
                              onChange={handleSubirFotoVehiculoPrincipal}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Marca / Modelo y Mecánico a cargo */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3
                      className="text-base sm:text-lg font-normal text-zinc-900 dark:text-white truncate"
                      title={orden.vehicle}
                    >
                      {orden.vehicle}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="text-zinc-400">👨‍🔧</span>
                      <span className="font-normal text-zinc-800 dark:text-zinc-200 truncate">
                        {(orden.mechanic || "Carlos Rodríguez").replace(/\s*\([^)]*\)/g, "").trim() || "Carlos Rodríguez"}
                      </span>
                    </div>

                    <div className="pt-0.5 flex items-center gap-2 text-xs">
                      {orden.previousVisitsCount && orden.previousVisitsCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium text-xs">
                          <span>🔄</span>
                          <span>Ha venido antes ({orden.previousVisitsCount} {orden.previousVisitsCount === 1 ? "visita previa" : "visitas previas"})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-medium text-xs">
                          <span>⭐</span>
                          <span>Primera vez aquí</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid con campos estructurados del vehículo */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-3.5">
                  <div className="p-2.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      Kilometraje Actual
                    </span>
                    <span className="text-xs sm:text-sm font-normal text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {orden.mileage ? `${Number(orden.mileage).toLocaleString()} km` : "5000 km"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      Combustible / Estado
                    </span>
                    <span className="text-xs sm:text-sm font-normal text-zinc-800 dark:text-zinc-200 mt-0.5">
                      Tanque: <span className="font-normal text-amber-600 dark:text-amber-400">{orden.fuelLevel || "E"}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pie de navegación Tarjeta 1 */}
          <div className="print:hidden flex items-center justify-end pt-4 border-t border-zinc-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setTarjetaActiva(1)}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Siguiente</span>
              <span>→</span>
            </button>
          </div>
          </div>

          {/* ===================================================================
              TARJETA 2 (idx 1): TALLER (BARRA RÁPIDA + EVIDENCIAS + ADICIONALES MANUALES)
              =================================================================== */}
          <div className={tarjetaActiva === 1 ? "space-y-5" : "hidden print:block print:space-y-5"}>
            {/* Barra superior rápida para añadir servicios/productos manuales, catálogo o rápidos en Taller */}
            {renderBarraAgregarAdicional("TALLER")}

            {/* SECCIÓN DE SERVICIOS Y PRODUCTOS MANUALES / GENERALES DE TALLER (SIN PIN ESPECÍFICO) */}
            {adicionalesTaller.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#121216] shadow-xs">
                <div className="bg-zinc-100/90 dark:bg-white/[0.04] px-4 py-2.5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛠️</span>
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      Adicionales
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 font-medium">
                      {adicionalesTaller.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 print:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setHallazgoActivoParaAsignar(null);
                        setNuevoOrigen("TALLER");
                        setModalNuevoRepuesto(true);
                      }}
                      className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <span>📦</span>
                      <span>Producto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHallazgoActivoParaAsignar(null);
                        setNuevoServicioOrigen("TALLER");
                        setModalNuevoServicio(true);
                      }}
                      className="h-7 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <span>🔧</span>
                      <span>Servicio</span>
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-auto text-xs font-normal">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400">
                        <th className="py-2 px-2.5 w-8 text-center font-normal">✓</th>
                        <th className="py-2 px-2.5 min-w-[100px] font-normal">Origen</th>
                        <th className="py-2 px-2.5 min-w-[200px] font-normal">Ítem</th>
                        <th className="py-2 px-2 w-24 text-center font-normal">Tiempo</th>
                        <th className="py-2 px-2 w-28 text-center font-normal">Tipo</th>
                        <th className="py-2 px-2 w-20 text-center font-normal">Cant.</th>
                        <th className="py-2 px-2.5 w-24 text-right font-normal">Subtotal</th>
                        <th className="py-2 px-2 min-w-[125px] text-center font-normal">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                      {adicionalesTaller.map((item: any, idx: number) =>
                        renderFilaItemPropuesta(item, idx, undefined, undefined, "Taller")
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {secciones.length === 0 && adicionalesTaller.length === 0 ? (
              <div className="py-8 text-center text-sm font-normal text-zinc-400 italic bg-zinc-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 space-y-3">
                <p>Sin hallazgos ni ítems reportados en Taller.</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setNuevoOrigen("TALLER");
                      setModalNuevoRepuesto(true);
                    }}
                    className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal cursor-pointer flex items-center gap-1"
                  >
                    <span>📦</span>
                    <span>Producto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNuevoServicioOrigen("TALLER");
                      setModalNuevoServicio(true);
                    }}
                    className="h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-normal cursor-pointer flex items-center gap-1"
                  >
                    <span>🔧</span>
                    <span>Servicio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNuevoHallazgoVista("frontal");
                      setModalNuevoHallazgo({ abierto: true, seccionId: "carroceria", seccionNombre: "Taller", vistaDefault: "frontal" });
                    }}
                    className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-normal cursor-pointer flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>Hallazgo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {secciones.map((sec) => (
                  <div
                    key={sec.id}
                    className="rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#121216] shadow-xs"
                  >
                    {/* ENCABEZADO: EVIDENCIA ARRIBA DE CARROCERÍA / SISTEMA */}
                    <div className="bg-zinc-100/90 dark:bg-white/[0.04] px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-white/10 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {sec.items.map((pin: any) => {
                              const num = pin.numeroEvidencia || pin.pinNumber || 1;
                              return (
                                <span
                                  key={pin.id}
                                  className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded inline-block"
                                >
                                  #{num}
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-base">{sec.icon}</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {formatoPrimeraMayuscula(sec.nombre)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs bg-zinc-200 dark:bg-white/10 px-2 py-0.5 rounded font-normal text-zinc-700 dark:text-zinc-300">
                            {sec.items.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const vistaSugerida = sec.id === "motor" ? "motor" : (sec.id === "frenos" ? "frenos" : (sec.id === "suspension" ? "suspension" : (sec.id === "electrico" ? "electrico" : (sec.id === "aire" ? "aire" : "frontal"))));
                              setNuevoHallazgoVista(vistaSugerida);
                              setModalNuevoHallazgo({
                                abierto: true,
                                seccionId: sec.id,
                                seccionNombre: sec.nombre,
                                vistaDefault: vistaSugerida,
                              });
                            }}
                            className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-2xs"
                            title={`Crear nuevo hallazgo en ${sec.nombre}`}
                          >
                            <span>+</span>
                            <span>Hallazgo</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* LISTA DE EVIDENCIAS DENTRO DE ESTE SISTEMA */}
                    <div className="divide-y divide-zinc-100 dark:divide-white/5">
                      {sec.items.map((pin: any) => {
                        const numEvidencia = pin.numeroEvidencia || pin.pinNumber || 1;
                        const solicitaRepuesto = Boolean(pin.solicitaRepuesto);
                        const solicitaServicio = Boolean(pin.solicitaServicio);
                        const pinItems = obtenerItemsDePin(pin);

                        return (
                          <div key={pin.id} className="p-4 space-y-3">
                            {/* Cabecera de la Evidencia */}
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="space-y-1 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-medium text-xs flex items-center justify-center shrink-0">
                                    #{numEvidencia}
                                  </span>
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                                    {formatoPrimeraMayuscula(pin.tipo)}
                                  </span>
                                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded">
                                    {formatoPrimeraMayuscula(pin.vistaLabel || pin.vista)}
                                  </span>
                                  {solicitaRepuesto && (
                                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <span>📦</span>
                                      <span>Producto</span>
                                    </span>
                                  )}
                                  {solicitaServicio && (
                                    <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <span>🔧</span>
                                      <span>Servicio</span>
                                    </span>
                                  )}
                                </div>
                                {pin.descripcion && (
                                  <p className="text-xs text-zinc-600 dark:text-zinc-300 italic pl-7">
                                    &quot;{formatoPrimeraMayuscula(pin.descripcion)}&quot;
                                  </p>
                                )}
                              </div>

                              {/* ACCIONES MINIMALISTAS (1 PALABRA + ICONO): DETALLES, MANUAL, PROVEEDOR, PRODUCTO, SERVICIO, CATÁLOGO Y ELIMINAR */}
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setFlotanteDetalles({ pin, sec })}
                                  className="h-8 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700/80 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                  title="Detalles"
                                >
                                  <svg className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="hidden sm:inline">Detalles</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setFlotanteManual({ pin, sec })}
                                  className="h-8 px-2.5 rounded-xl bg-purple-50/90 hover:bg-purple-100/90 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                  title="Manual"
                                >
                                  <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                  <span className="hidden sm:inline">Manual</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => abrirModalProveedor("INDIVIDUAL", undefined, pin)}
                                  className="h-8 px-2.5 rounded-xl bg-emerald-50/90 hover:bg-emerald-100/90 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                  title="Proveedor"
                                >
                                  <span>🚚</span>
                                  <span className="hidden sm:inline">Proveedor</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setHallazgoActivoParaAsignar(pin);
                                    setNuevoOrigen("TALLER");
                                    setNuevoEnStock(false);
                                    setModalNuevoRepuesto(true);
                                  }}
                                  className="h-8 px-2.5 rounded-xl bg-blue-50/90 hover:bg-blue-100/90 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                  title="Producto"
                                >
                                  <span>📦</span>
                                  <span className="hidden md:inline">Producto</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setHallazgoActivoParaAsignar(pin);
                                    setNuevoServicioOrigen("TALLER");
                                    setModalNuevoServicio(true);
                                  }}
                                  className="h-8 px-2.5 rounded-xl bg-purple-50/90 hover:bg-purple-100/90 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                  title="Servicio"
                                >
                                  <span>🔧</span>
                                  <span className="hidden md:inline">Servicio</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setModalCatalogoTallerAbierto({ abierto: true, origen: "TALLER", pin })}
                                  className="h-8 px-2 rounded-xl bg-indigo-50/90 hover:bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-2xs"
                                  title="Catálogo"
                                >
                                  <span>🛒</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleEliminarHallazgo(pin.id)}
                                  className="w-8 h-8 rounded-xl bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 text-xs flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
                                  title="Eliminar"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* TABLA DESLIZABLE DE PRODUCTOS Y SERVICIOS DE ESTA EVIDENCIA */}
                            {pinItems.length > 0 ? (
                              <div className="w-full space-y-2">
                                <div className="border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-black/30">
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse table-auto text-xs font-normal">
                                      <thead>
                                        <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-100/70 dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400">
                                          <th className="py-2 px-2.5 w-8 text-center font-normal">✓</th>
                                          <th className="py-2 px-2.5 min-w-[110px] font-normal">Daño</th>
                                          <th className="py-2 px-2.5 min-w-[200px] font-normal">Ítem</th>
                                          <th className="py-2 px-2 w-24 text-center font-normal">Tiempo</th>
                                          <th className="py-2 px-2 w-28 text-center font-normal">Tipo</th>
                                          <th className="py-2 px-2 w-20 text-center font-normal">Cant.</th>
                                          <th className="py-2 px-2.5 w-24 text-right font-normal">Subtotal</th>
                                          <th className="py-2 px-2 min-w-[125px] text-center font-normal">Acción</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                                        {pinItems.map((item: any, itemIdx: number) =>
                                          renderFilaItemPropuesta(item, itemIdx, pin, sec, "Taller")
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* ESTADO SIN PRODUCTOS NI SERVICIOS ASIGNADOS */
                              <div className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-200 dark:border-white/10 space-y-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                                    Sin ítems asignados a #{numEvidencia}.
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirFlotanteFotos(pin)}
                                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50/90 dark:bg-blue-500/15 border border-blue-200/80 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all cursor-pointer shadow-xs active:scale-95"
                                      title="Fotos"
                                    >
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="18" height="18" x="3" y="3" rx="4" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <path d="m21 15-5-5L5 21" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAbrirFlotanteAudios(pin)}
                                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50/90 dark:bg-amber-500/15 border border-amber-200/80 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-all cursor-pointer shadow-xs active:scale-95"
                                      title="Audios"
                                    >
                                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" x2="12" y1="19" y2="22" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                  <label
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer select-none transition-all ${
                                      solicitaRepuesto
                                        ? "bg-amber-500/10 border-amber-500/40 text-amber-800 dark:text-amber-200 font-semibold"
                                        : "bg-white hover:bg-zinc-100 dark:bg-white/[0.03] border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={solicitaRepuesto}
                                      onChange={(e) => handleToggleSolicitaPropuesta(pin.id, "solicitaRepuesto", e.target.checked)}
                                      className="w-3.5 h-3.5 rounded text-amber-600 accent-amber-500 cursor-pointer"
                                    />
                                    <span>📦 Producto</span>
                                  </label>

                                  <label
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer select-none transition-all ${
                                      solicitaServicio
                                        ? "bg-purple-500/10 border-purple-500/40 text-purple-800 dark:text-purple-200 font-semibold"
                                        : "bg-white hover:bg-zinc-100 dark:bg-white/[0.03] border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={solicitaServicio}
                                      onChange={(e) => handleToggleSolicitaPropuesta(pin.id, "solicitaServicio", e.target.checked)}
                                      className="w-3.5 h-3.5 rounded text-purple-600 accent-purple-500 cursor-pointer"
                                    />
                                    <span>🔧 Servicio</span>
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHallazgoActivoParaAsignar(pin);
                                      setNuevoNombre(pin.descripcion ? `Repuesto para ${pin.tipo}: ${pin.descripcion}` : `Repuesto para ${pin.tipo}`);
                                      setNuevoEnStock(false);
                                      setNuevoProveedor("Proveedor General");
                                      setNuevoOrigen("TALLER");
                                      setModalNuevoRepuesto(true);
                                    }}
                                    className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-2xs"
                                  >
                                    <span>+</span>
                                    <span>Producto</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHallazgoActivoParaAsignar(pin);
                                      setNuevoServicioNombre(pin.descripcion ? `Servicio de ${pin.tipo}: ${pin.descripcion}` : `Servicio de ${pin.tipo}`);
                                      setNuevoServicioOrigen("TALLER");
                                      setModalNuevoServicio(true);
                                    }}
                                    className="h-7 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-normal transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-2xs"
                                  >
                                    <span>+</span>
                                    <span>Servicio</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

          {/* Pie de navegación Tarjeta 2 (Taller) */}
          <div className="print:hidden flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setTarjetaActiva(0)}
              className="h-9 px-4 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-normal cursor-pointer flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Anterior</span>
            </button>
            <button
              type="button"
              onClick={() => setTarjetaActiva(2)}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal cursor-pointer flex items-center gap-1.5"
            >
              <span>Siguiente</span>
              <span>→</span>
            </button>
          </div>
          </div>

          {/* ===================================================================
              TARJETA 3 (idx 2): PEDIR A PROVEEDOR CON LINK + LIQUIDACIÓN + PAGAR O PASAR A POS
              =================================================================== */}
          <div className={tarjetaActiva === 2 ? "space-y-6" : "hidden print:block print:space-y-6"}>
            {/* Cabecera Última Tarjeta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center text-base">
                  📦
                </span>
                <div>
                  <h2 className="text-base font-normal text-zinc-900 dark:text-white">
                    Pago
                  </h2>
                </div>
              </div>

              {/* Botones rápidos de 1 palabra + icono */}
              <div className="flex items-center gap-2 print:hidden flex-wrap">
                <button
                  type="button"
                  onClick={() => abrirModalProveedor("MASIVO")}
                  className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Enviar toda la orden al proveedor"
                >
                  <span>💬</span>
                  <span>Todo</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copiarAlPortapapeles(
                      `${window.location.origin}/pedidos-proveedor/${orden.id}`,
                      "Link de toda la orden copiado al portapapeles."
                    )
                  }
                  className="h-9 px-3 rounded-xl bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-200 text-xs font-normal cursor-pointer flex items-center gap-1.5"
                  title="Copiar enlace del pedido"
                >
                  <span>🔗</span>
                  <span>Enlace</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalWhatsApp(true)}
                  className="h-9 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/35 text-purple-600 dark:text-purple-300 text-xs font-normal cursor-pointer flex items-center gap-1.5"
                  title="Consolidado diario"
                >
                  <span>📲</span>
                  <span>Diario</span>
                </button>
              </div>
            </div>

            {/* SECCIÓN PEDIR A PROVEEDOR (INDIVIDUAL O TODA LA ORDEN) CON RESPUESTAS AUTOMÁTICAS */}
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-[#121216] border border-zinc-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span>🚚</span>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Proveedor ({calculos.itemsPorComprar.length})
                  </h3>
                </div>
                <span className="text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
                  Costo: ${calculos.totalCostoComprasExternas.toFixed(2)}
                </span>
              </div>

              {calculos.itemsPorComprar.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-white/10 text-center text-xs text-zinc-400">
                  Todos los ítems están en Bodega.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 dark:divide-white/10 border border-zinc-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#141418] overflow-hidden">
                  {calculos.itemsPorComprar.map((item: any, itemIdx: number) => {
                    const itemLink = `${typeof window !== "undefined" ? window.location.origin : ""}/pedidos-proveedor/${orden.id}?itemId=${encodeURIComponent(item.id)}&item=${encodeURIComponent(item.name)}`;
                    const dispProv = item.supplierAvailability;
                    const envioObj = OPCIONES_ENVIO_RAPIDO.find((e) => e.id === item.shippingMethod);

                    return (
                      <div
                        key={item.id ? `${item.id}-${itemIdx}` : `comprar-item-${itemIdx}`}
                        className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {renderBadgeEspecialidad(item.origin)}
                            <span className="text-zinc-900 dark:text-white font-medium">
                              {item.qty || 1}x {item.name}
                            </span>
                            <span className="text-zinc-400 font-mono">
                              ${Number(item.costPrice || 0).toFixed(2)}
                            </span>

                            {/* Badges de respuesta del proveedor */}
                            {dispProv === "SI_HAY" && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                ✓ Sí hay
                              </span>
                            )}
                            {dispProv === "NO_HAY" && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/35 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                                ✕ No hay
                              </span>
                            )}
                            {item.deliveryTime && (
                              <button
                                type="button"
                                onClick={() => setItemTiempoEnvioModal({ id: item.id, isService: Boolean(item.isService) })}
                                className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/35 text-blue-700 dark:text-blue-300 text-[10px] font-semibold cursor-pointer"
                              >
                                ⏱️ {item.deliveryTime}
                              </button>
                            )}
                            {envioObj && (
                              <button
                                type="button"
                                onClick={() => setItemTiempoEnvioModal({ id: item.id, isService: Boolean(item.isService) })}
                                className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/35 text-cyan-700 dark:text-cyan-300 text-[10px] font-semibold cursor-pointer"
                              >
                                {envioObj.icon} {envioObj.label}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={item.supplierName || "Proveedor General"}
                              onChange={(e) => handleUpdateSupplier(item.id, e.target.value)}
                              className="h-6 px-2 rounded bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 text-[11px] text-zinc-700 dark:text-zinc-300"
                              placeholder="Proveedor"
                            />
                            <button
                              type="button"
                              onClick={() => setItemTiempoEnvioModal({ id: item.id, isService: Boolean(item.isService) })}
                              className="h-6 px-2 rounded bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-[11px] text-zinc-600 dark:text-zinc-300 cursor-pointer flex items-center gap-1"
                            >
                              <span>⏱️</span>
                              <span>{item.deliveryTime || "Tiempo"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStock(item.id)}
                              className="h-6 px-2 rounded bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-600 dark:text-emerald-400 cursor-pointer flex items-center gap-1"
                            >
                              <span>🏢</span>
                              <span>Bodega</span>
                            </button>
                          </div>
                        </div>

                        {/* Acciones individuales (1 palabra + icono) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAbrirFlotanteFotos(item)}
                            className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center cursor-pointer"
                            title="Fotos"
                          >
                            📷
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAbrirFlotanteAudios(item)}
                            className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center cursor-pointer"
                            title="Audio"
                          >
                            🎙️
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirModalProveedor("INDIVIDUAL", item)}
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                            title="Enviar por WhatsApp al Proveedor"
                          >
                            <span>📤</span>
                            <span>Enviar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => copiarAlPortapapeles(itemLink, `Enlace de "${item.name}" copiado.`)}
                            className="h-8 px-2.5 rounded-lg bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 text-xs font-normal cursor-pointer flex items-center gap-1"
                            title="Copiar enlace individual"
                          >
                            <span>🔗</span>
                            <span>Enlace</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          {/* LIQUIDACIÓN DE LA FACTURA & TOTALES */}
          <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-white/10">
            {/* Liquidación Financiera de Propuesta */}
            <div className="w-full md:w-1/2 max-w-lg p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 space-y-3 font-sans">
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-normal">Productos:</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  ${calculos.subtotalRepuestos.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-normal">Servicios:</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  ${calculos.subtotalServicios.toFixed(2)}
                </span>
              </div>

              <div className="h-px bg-zinc-200 dark:bg-white/10" />

              <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300">
                <span className="font-normal">Subtotal:</span>
                <span className="font-semibold text-zinc-900 dark:text-white text-sm">
                  ${calculos.subtotalBruto.toFixed(2)}
                </span>
              </div>

              {/* Descuento editable */}
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="font-normal">Descuento:</span>
                  <div className="inline-flex items-center gap-1 print:hidden">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={porcentajeDescuento}
                      onChange={(e) => setPorcentajeDescuento(parseFloat(e.target.value) || 0)}
                      className="w-12 h-6 px-1 text-center rounded bg-white dark:bg-black border border-zinc-300 dark:border-white/10 text-xs font-normal"
                    />
                    <span className="text-[10px]">%</span>
                  </div>
                </div>
                <span className="text-rose-500 font-medium">
                  -${calculos.descuento.toFixed(2)}
                </span>
              </div>

              {/* IVA editable */}
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="font-normal">IVA ({porcentajeIva}%):</span>
                  <div className="inline-flex items-center gap-1 print:hidden">
                    <select
                      value={porcentajeIva}
                      onChange={(e) => setPorcentajeIva(Number(e.target.value))}
                      className="h-6 px-1 rounded bg-white dark:bg-black border border-zinc-300 dark:border-white/10 text-[11px]"
                    >
                      <option value={15}>15%</option>
                      <option value={12}>12%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>
                </div>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  ${calculos.iva.toFixed(2)}
                </span>
              </div>

              {/* TOTAL PROPUESTA */}
              <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-600/30 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 block">
                    Total
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${calculos.totalFacturaCliente.toFixed(2)}
                </span>
              </div>

              {/* RENTABILIDAD / MARGEN TALLER (Solo visible internamente) */}
              <div className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25 flex items-center justify-between text-xs print:hidden">
                <span className="font-normal text-emerald-800 dark:text-emerald-300">
                  Utilidad:
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  ${calculos.margenNetoTaller.toFixed(2)} ({calculos.margenPorcentaje}%)
                </span>
              </div>
            </div>
          </div>

            {/* BARRA DE CIERRE FINAL EN LA ÚLTIMA TARJETA: TÍTULOS DE 1 PALABRA + ICONO */}
            <div className="print:hidden pt-5 border-t border-zinc-200 dark:border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setTarjetaActiva(1)}
                className="h-10 px-4 rounded-xl bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-normal cursor-pointer self-start md:self-auto flex items-center gap-1.5"
              >
                <span>←</span>
                <span>Anterior</span>
              </button>

              <div className="flex items-center gap-2.5 flex-wrap justify-end">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={handleGuardarBorrador}
                  className="h-10 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 text-xs font-normal transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>💾</span>
                  <span>{guardando ? "..." : "Guardar"}</span>
                </button>

                {!esPagado && (
                  <>
                    <button
                      type="button"
                      disabled={cambiandoEstado}
                      onClick={handleToggleEstado}
                      className={`h-10 px-4 rounded-xl border text-xs font-normal shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                        esAprobado && !esPausado
                          ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white"
                          : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/35 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      <span>{esAprobado && !esPausado ? "● Trabajando" : "✓ Aprobar"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={cambiandoEstado}
                      onClick={handleTogglePausa}
                      className={`h-10 px-4 rounded-xl border text-xs font-normal shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                        esPausado
                          ? "bg-amber-500 hover:bg-amber-400 border-amber-500 text-white"
                          : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      <span>{esPausado ? "⏸ Pausada" : "⏸ Pausa"}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={cambiandoEstado}
                  onClick={handleTogglePagado}
                  className={`h-10 px-4 rounded-xl border text-xs font-normal shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                    esPagado
                      ? "bg-sky-600 hover:bg-sky-500 border-sky-500 text-white"
                      : "bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/35 text-sky-600 dark:text-sky-300"
                  }`}
                >
                  <span>{esPagado ? "✓ Pagado" : "💳 Pagar"}</span>
                </button>

                <button
                  type="button"
                  disabled={autorizando}
                  onClick={handleAutorizarYEnviarAPos}
                  className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-normal shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>🛒</span>
                  <span>{autorizando ? "..." : "POS"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* FIRMAS EN FACTURA (Visible en impresión o PDF) */}
          <div className="hidden print:grid grid-cols-2 gap-12 pt-16 mt-8 border-t border-zinc-300 text-center text-xs">
            <div className="space-y-2">
              <div className="border-b border-black w-48 mx-auto" />
              <p className="font-bold">Firma del Cliente</p>
              <p className="text-[10px] text-zinc-500">Aceptación de Presupuesto y Repuestos</p>
            </div>
            <div className="space-y-2">
              <div className="border-b border-black w-48 mx-auto" />
              <p className="font-bold">AutoG Centro Automotriz</p>
              <p className="text-[10px] text-zinc-500">Mecánico: {(orden.mechanic || "Carlos Rodríguez").replace(/\s*\([^)]*\)/g, "").trim()}</p>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL CATÁLOGO WHATSAPP PARA PROVEEDORES */}
      {modalWhatsApp && (
        <div
          onClick={() => setModalWhatsApp(false)}
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scale-up text-zinc-900 dark:text-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>📲</span>
                  <span>Catálogo Digital para Proveedores</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalWhatsApp(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">1. Pedido de este Vehículo ({orden.plate})</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 font-bold">
                    Individual
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Envía únicamente los {calculos.itemsPorComprar.length} repuestos requeridos para el {orden.vehicle}.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hola, te comparto el pedido de repuestos para el vehículo ${orden.vehicle} (Placa: ${orden.plate}). Puedes revisar fotos grandes y especificaciones aquí: ${window.location.origin}/pedidos-proveedor/${orden.id}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                  >
                    <span>💬 Enviar por WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copiarAlPortapapeles(`${window.location.origin}/pedidos-proveedor/${orden.id}`, "Enlace copiado al portapapeles.")}
                    className="h-9 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Copiar Link
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">2. Consolidado del Día</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-400 font-bold">
                    Del Día
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Agrupa todos los repuestos por comprar de todos los vehículos recibidos hoy en el taller.
                </p>
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Hola, te comparto el consolidado general de repuestos requeridos para el taller hoy. Puedes revisar fotos y lista completa aquí: ${window.location.origin}/pedidos-proveedor/diario`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 active:scale-95"
                  >
                    <span>💬 Enviar Consolidado</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copiarAlPortapapeles(`${window.location.origin}/pedidos-proveedor/diario`, "Enlace del día copiado.")}
                    className="h-9 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-700 dark:text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Copiar Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA ENVIAR PEDIDO O COTIZACIÓN A PROVEEDOR POR WHATSAPP */}
      {modalProveedor.abierto && (
        <div
          onClick={() => setModalProveedor({ abierto: false, modo: "MASIVO" })}
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-scale-up text-zinc-900 dark:text-white max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>{modalProveedor.modo === "INDIVIDUAL" ? "📤" : "🚚"}</span>
                  <span>
                    {modalProveedor.modo === "INDIVIDUAL"
                      ? "Enviar Cotización Individual a Proveedor"
                      : "Mandar Todo el Pedido al Proveedor"}
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {orden.vehicle} · Placa: <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{orden.plate}</span>
                  {modalProveedor.pin && (
                    <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold">
                      Evidencia #{modalProveedor.pin.numeroEvidencia || modalProveedor.pin.pinNumber || 1}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalProveedor({ abierto: false, modo: "MASIVO" })}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content scrollable */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Selector / Buscador de Proveedor */}
              <div className="space-y-2">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  1. Buscar o Seleccionar Proveedor:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={busquedaProveedor}
                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                    placeholder="🔍 Buscar por nombre, teléfono o categoría..."
                    className="w-full h-9 pl-3 pr-8 rounded-xl bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  {busquedaProveedor && (
                    <button
                      type="button"
                      onClick={() => setBusquedaProveedor("")}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Lista rápida de proveedores */}
                <div className="max-h-36 overflow-y-auto border border-zinc-200 dark:border-white/10 rounded-xl divide-y divide-zinc-100 dark:divide-white/5 bg-zinc-50/50 dark:bg-black/20">
                  {proveedoresFiltrados.length === 0 ? (
                    <div className="p-3 text-center text-zinc-400 text-xs italic">
                      No se encontraron proveedores activos con esa búsqueda.
                    </div>
                  ) : (
                    proveedoresFiltrados.map((prov) => {
                      const esSeleccionado = proveedorSeleccionado?.id === prov.id;
                      return (
                        <div
                          key={prov.id}
                          onClick={() => {
                            setProveedorSeleccionado(prov);
                            setTelefonoManualProveedor(prov.phone || "");
                          }}
                          className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                            esSeleccionado
                              ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-900 dark:text-blue-100 font-medium"
                              : "hover:bg-zinc-100 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-semibold block truncate">{prov.name}</span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {prov.contact ? `Contacto: ${prov.contact}` : ""}
                              {prov.categories ? ` · ${prov.categories}` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {prov.phone ? (
                              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                                📞 {prov.phone}
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 italic">Sin teléfono</span>
                            )}
                            {esSeleccionado && <span className="text-blue-500 font-bold">✓</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Ingreso manual de teléfono */}
                <div className="pt-1">
                  <label className="text-[11px] text-zinc-500 dark:text-zinc-400 block mb-1">
                    O ingresar número de WhatsApp directo:
                  </label>
                  <input
                    type="text"
                    value={telefonoManualProveedor}
                    onChange={(e) => setTelefonoManualProveedor(e.target.value)}
                    placeholder="Ej. 0987654321 o 593987654321"
                    className="w-full h-8 px-3 rounded-lg bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Mensaje WhatsApp generado */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  2. Vista previa del mensaje a enviar:
                </label>
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-black/50 border border-zinc-200 dark:border-white/10 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto text-zinc-800 dark:text-zinc-200">
                  {generarMensajeWhatsAppProveedor()}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-zinc-200 dark:border-white/10 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setModalProveedor({ abierto: false, modo: "MASIVO" })}
                className="h-9 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-normal cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={enviarWhatsAppProveedor}
                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>📲</span>
                <span>Enviar WhatsApp a Proveedor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR NUEVO REPUESTO */}
      {modalNuevoRepuesto && (
        <div
          onClick={() => setModalNuevoRepuesto(false)}
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up text-zinc-900 dark:text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {hallazgoActivoParaAsignar ? `+ Elegir / Pedir Producto (Evidencia #${hallazgoActivoParaAsignar.numeroEvidencia})` : "+ Agregar Repuesto"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setHallazgoActivoParaAsignar(null);
                  setModalNuevoRepuesto(false);
                }}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {hallazgoActivoParaAsignar && (
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/25 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] flex items-center justify-center shrink-0">
                    #{hallazgoActivoParaAsignar.numeroEvidencia}
                  </span>
                  <span>Solución para Evidencia #{hallazgoActivoParaAsignar.numeroEvidencia} ({hallazgoActivoParaAsignar.vistaLabel})</span>
                </div>
                {hallazgoActivoParaAsignar.descripcion && (
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 italic">
                    Hallazgo reportado: &quot;{hallazgoActivoParaAsignar.descripcion}&quot;
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {/* Buscador en Catálogo Real de Neon */}
              <div className="relative">
                <label className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold flex items-center justify-between mb-1">
                  <span>🔍 Buscar en Catálogo Neon (PostgreSQL)</span>
                  {buscandoProductoNeon && <span className="text-[10px] text-blue-500 animate-pulse font-normal">Buscando...</span>}
                </label>
                <input
                  type="text"
                  placeholder="Escribe para buscar (ej: Amalie, Aceite, Filtro, Pastillas)..."
                  value={busquedaProductoNeon}
                  onChange={(e) => setBusquedaProductoNeon(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-700/60 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                {productosEncontradosNeon.length > 0 && (
                  <div className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-[#16161a] shadow-xl divide-y divide-zinc-100 dark:divide-white/5 z-30 relative">
                    {productosEncontradosNeon.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setNuevoNombre(p.name);
                          setNuevoCodigo(p.sku || p.id);
                          setNuevoPvp(String(p.salePrice ?? "0"));
                          setNuevoCosto(String(p.costPrice ?? "0"));
                          setNuevoCategoria(p.category || "TALLER");
                          setNuevoProductId(p.id);
                          setNuevoEnStock((p.stockCurrent ?? 0) > 0);
                          setBusquedaProductoNeon("");
                          setProductosEncontradosNeon([]);
                        }}
                        className="w-full p-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-between transition-colors text-xs cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-zinc-900 dark:text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            SKU: {p.sku || "S/C"} · Stock: {p.stockCurrent ?? 0} {p.unit || "und"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            ${Number(p.salePrice ?? 0).toFixed(2)}
                          </p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">
                            Neon DB
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                  Descripción del Repuesto o Producto
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pastillas de Freno Bosch Delanteras"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                  Código / Referencia / SKU
                </label>
                <input
                  type="text"
                  placeholder="Ej: AM-75697-36"
                  value={nuevoCodigo}
                  onChange={(e) => setNuevoCodigo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={nuevaCantidad}
                    onChange={(e) => setNuevaCantidad(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">Costo ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nuevoCosto}
                    onChange={(e) => setNuevoCosto(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">PVP Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nuevoPvp}
                    onChange={(e) => setNuevoPvp(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-emerald-50/50 dark:bg-black border border-emerald-500/40 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">Área / Origen</label>
                  <select
                    value={nuevoOrigen}
                    onChange={(e) => setNuevoOrigen(e.target.value as EspecialidadTipo)}
                    className="w-full h-10 px-2 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="TALLER">🔧 Taller</option>
                    <option value="LUBRICENTRO">🛢️ Lubricentro</option>
                    <option value="CARWASH">🚿 Car Wash</option>
                    <option value="TECNICENTRO">⚙️ Tecnicentro</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">Disponibilidad</label>
                  <button
                    type="button"
                    onClick={() => setNuevoEnStock(!nuevoEnStock)}
                    className={`w-full h-10 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${nuevoEnStock
                      ? "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-400"
                      : "bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-400"
                      }`}
                  >
                    <span>{nuevoEnStock ? "📦 Sí hay en Bodega" : "🚚 Pedir a Proveedor"}</span>
                  </button>
                </div>
              </div>

              {!nuevoEnStock && (
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">Proveedor Externo</label>
                  <input
                    type="text"
                    value={nuevoProveedor}
                    onChange={(e) => setNuevoProveedor(e.target.value)}
                    placeholder="Nombre del proveedor externo"
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAgregarRepuesto}
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer active:scale-95"
                >
                  Agregar Repuesto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR NUEVO SERVICIO / MANO DE OBRA */}
      {modalNuevoServicio && (
        <div
          onClick={() => setModalNuevoServicio(false)}
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up text-zinc-900 dark:text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {hallazgoActivoParaAsignar ? `+ Elegir Servicio (Evidencia #${hallazgoActivoParaAsignar.numeroEvidencia})` : "+ Agregar Servicio"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setHallazgoActivoParaAsignar(null);
                  setModalNuevoServicio(false);
                }}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {hallazgoActivoParaAsignar && (
              <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/25 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] flex items-center justify-center shrink-0">
                    #{hallazgoActivoParaAsignar.numeroEvidencia}
                  </span>
                  <span>Solución para Evidencia #{hallazgoActivoParaAsignar.numeroEvidencia} ({hallazgoActivoParaAsignar.vistaLabel})</span>
                </div>
                {hallazgoActivoParaAsignar.descripcion && (
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 italic">
                    Hallazgo reportado: &quot;{hallazgoActivoParaAsignar.descripcion}&quot;
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {/* Buscador en Catálogo de Servicios Neon */}
              <div className="relative">
                <label className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold flex items-center justify-between mb-1">
                  <span>🔍 Buscar en Catálogo de Servicios Neon</span>
                  {buscandoServicioNeon && <span className="text-[10px] text-purple-500 animate-pulse font-normal">Buscando...</span>}
                </label>
                <input
                  type="text"
                  placeholder="Escribe para buscar (ej: Cambio de aceite, Frenos, Mantenimiento)..."
                  value={busquedaServicioNeon}
                  onChange={(e) => setBusquedaServicioNeon(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-700/60 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
                {serviciosEncontradosNeon.length > 0 && (
                  <div className="mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-[#16161a] shadow-xl divide-y divide-zinc-100 dark:divide-white/5 z-30 relative">
                    {serviciosEncontradosNeon.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setNuevoServicioNombre(s.name);
                          setNuevoServicioCodigo(s.code || s.id);
                          setNuevoServicioPrecio(String(s.standardPrice ?? s.price ?? "0"));
                          setNuevoServicioOrigen((s.category as EspecialidadTipo) || "TALLER");
                          setBusquedaServicioNeon("");
                          setServiciosEncontradosNeon([]);
                        }}
                        className="w-full p-2.5 text-left hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-between transition-colors text-xs cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-zinc-900 dark:text-white truncate">{s.name}</p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            Código: {s.code || "S/C"} · Categoría: {s.category || "General"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-purple-600 dark:text-purple-400 font-mono">
                            ${Number(s.standardPrice ?? s.price ?? 0).toFixed(2)}
                          </p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-medium">
                            Neon DB
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                  Descripción del Servicio Técnico
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio de Pastillas y Rectificación de Discos"
                  value={nuevoServicioNombre}
                  onChange={(e) => setNuevoServicioNombre(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                  Código de Servicio
                </label>
                <input
                  type="text"
                  placeholder="Ej: SRV-7170"
                  value={nuevoServicioCodigo}
                  onChange={(e) => setNuevoServicioCodigo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white font-mono placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">Precio Servicio ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nuevoServicioPrecio}
                    onChange={(e) => setNuevoServicioPrecio(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-purple-50/50 dark:bg-black border border-purple-500/40 text-xs text-purple-700 dark:text-purple-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">Área / Origen</label>
                  <select
                    value={nuevoServicioOrigen}
                    onChange={(e) => setNuevoServicioOrigen(e.target.value as EspecialidadTipo)}
                    className="w-full h-10 px-2 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="TALLER">🔧 Taller</option>
                    <option value="LUBRICENTRO">🛢️ Lubricentro</option>
                    <option value="CARWASH">🚿 Car Wash</option>
                    <option value="TECNICENTRO">⚙️ Tecnicentro</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAgregarServicio}
                  className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer active:scale-95"
                >
                  Agregar Servicio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE MINIMALISTA DE FOTOS POR EVIDENCIA */}
      {flotanteFotos && (
        <div
          onClick={() => setFlotanteFotos(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-4 sm:p-5 space-y-3.5 shadow-2xl animate-scale-up text-zinc-900 dark:text-white"
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="4" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    Fotos de Evidencia #{flotanteFotos.pin.numeroEvidencia || flotanteFotos.pin.pinNumber || 1}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {flotanteFotos.pin.tipo ? formatoPrimeraMayuscula(flotanteFotos.pin.tipo) : (flotanteFotos.pin.descripcion || "Inspección")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {flotanteFotos.fotos.length > 0 && (
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                    {flotanteFotos.fotoActivaIdx + 1} / {flotanteFotos.fotos.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setFlotanteFotos(null)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Imagen principal */}
            {flotanteFotos.fotos.length > 0 ? (
              <div className="space-y-3">
                <div className="relative aspect-video sm:aspect-4/3 w-full rounded-2xl overflow-hidden bg-black/90 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center group">
                  <img
                    src={flotanteFotos.fotos[flotanteFotos.fotoActivaIdx]}
                    alt={`Evidencia ${flotanteFotos.fotoActivaIdx + 1}`}
                    className="w-full h-full object-contain cursor-zoom-in"
                    onClick={() => setFotoZoom(flotanteFotos.fotos[flotanteFotos.fotoActivaIdx])}
                  />

                  {/* Flechas de navegación si hay más de 1 foto */}
                  {flotanteFotos.fotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlotanteFotos((prev) => prev ? {
                            ...prev,
                            fotoActivaIdx: (prev.fotoActivaIdx - 1 + prev.fotos.length) % prev.fotos.length,
                          } : null);
                        }}
                        className="absolute left-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-sm backdrop-blur-xs cursor-pointer opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlotanteFotos((prev) => prev ? {
                            ...prev,
                            fotoActivaIdx: (prev.fotoActivaIdx + 1) % prev.fotos.length,
                          } : null);
                        }}
                        className="absolute right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-sm backdrop-blur-xs cursor-pointer opacity-80 group-hover:opacity-100 transition-opacity"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {/* Tiras de miniaturas */}
                {flotanteFotos.fotos.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {flotanteFotos.fotos.map((f, idx) => (
                      <button
                        key={`thumb-${idx}`}
                        type="button"
                        onClick={() => setFlotanteFotos((prev) => prev ? { ...prev, fotoActivaIdx: idx } : null)}
                        className={`w-14 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                          flotanteFotos.fotoActivaIdx === idx
                            ? "border-blue-500 scale-105 shadow-md shadow-blue-500/20"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={f} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-200 dark:border-white/10 space-y-1">
                <span className="text-2xl">📷</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  No hay fotos adjuntas para esta evidencia aún.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE MINIMALISTA DE AUDIO POR EVIDENCIA */}
      {flotanteAudios && (
        <div
          onClick={() => setFlotanteAudios(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-scale-up text-zinc-900 dark:text-white"
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    Audios de Evidencia #{flotanteAudios.pin.numeroEvidencia || flotanteAudios.pin.pinNumber || 1}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {flotanteAudios.pin.tipo ? formatoPrimeraMayuscula(flotanteAudios.pin.tipo) : (flotanteAudios.pin.descripcion || "Nota de voz")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFlotanteAudios(null)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Lista de audios */}
            {flotanteAudios.audios.length > 0 ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {flotanteAudios.audios.map((aud, aIdx) => (
                  <div
                    key={aud.id || `aud-${aIdx}`}
                    className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Audio #{aIdx + 1}
                      </span>
                      {aud.durationSeconds && (
                        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                          {Math.floor(aud.durationSeconds / 60)}:{(aud.durationSeconds % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                    </div>

                    <audio
                      controls
                      src={aud.url}
                      className="w-full h-9 accent-amber-500 rounded-xl"
                      preload="metadata"
                    />

                    {aud.transcriptionText && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/5 text-xs text-zinc-700 dark:text-zinc-300 italic">
                        <span className="font-semibold not-italic block text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">
                          Transcripción:
                        </span>
                        &quot;{aud.transcriptionText}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-dashed border-zinc-200 dark:border-white/10 space-y-1">
                <span className="text-2xl">🎙️</span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  No se grabaron audios para esta evidencia.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE DE DETALLES POR EVIDENCIA */}
      {flotanteDetalles && (
        <div
          onClick={() => setFlotanteDetalles(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-scale-up text-zinc-900 dark:text-white max-h-[85vh] flex flex-col"
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 text-zinc-700 dark:text-zinc-200 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    Detalles de Evidencia #{flotanteDetalles.pin.numeroEvidencia || flotanteDetalles.pin.pinNumber || 1}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {flotanteDetalles.sec?.nombre || "Taller"} · {formatoPrimeraMayuscula(flotanteDetalles.pin.vistaLabel || flotanteDetalles.pin.vista || "General")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFlotanteDetalles(null)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/10 space-y-3">
                <div>
                  <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mb-1">
                    Tipo de Hallazgo / Daño:
                  </label>
                  <input
                    type="text"
                    value={flotanteDetalles.pin.tipo || ""}
                    onChange={(e) => {
                      const nuevoTipo = e.target.value;
                      setFlotanteDetalles((prev) => prev ? { ...prev, pin: { ...prev.pin, tipo: nuevoTipo } } : null);
                    }}
                    placeholder="Ej: Raspón, Abolladura, Fuga de aceite..."
                    className="w-full h-9 px-3 rounded-xl bg-white dark:bg-black border border-zinc-300 dark:border-white/10 font-semibold text-rose-600 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mb-1">
                      Vista del Vehículo:
                    </label>
                    <select
                      value={flotanteDetalles.pin.vista || "frontal"}
                      onChange={(e) => {
                        const nuevaVista = e.target.value;
                        const vistaLabel = nuevaVista.charAt(0).toUpperCase() + nuevaVista.slice(1).replace(/_/g, " ");
                        setFlotanteDetalles((prev) => prev ? { ...prev, pin: { ...prev.pin, vista: nuevaVista, vistaLabel } } : null);
                      }}
                      className="w-full h-9 px-2 rounded-xl bg-white dark:bg-black border border-zinc-300 dark:border-white/10 text-zinc-800 dark:text-zinc-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="frontal">Frontal</option>
                      <option value="posterior">Posterior</option>
                      <option value="lateral_izq">Lateral Izquierdo</option>
                      <option value="lateral_der">Lateral Derecho</option>
                      <option value="techo">Techo / Superior</option>
                      <option value="interior">Interior / Habitáculo</option>
                      <option value="motor">Compartimiento Motor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium block mb-1">
                      Sistema Automotriz:
                    </label>
                    <div className="h-9 px-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 flex items-center font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {flotanteDetalles.sec?.nombre || "Taller"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Observación / Descripción */}
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 block text-xs">
                  Observaciones Técnicas (Editable):
                </label>
                <textarea
                  rows={3}
                  value={flotanteDetalles.pin.descripcion || ""}
                  onChange={(e) => {
                    const desc = e.target.value;
                    setFlotanteDetalles((prev) => prev ? { ...prev, pin: { ...prev.pin, descripcion: desc } } : null);
                  }}
                  placeholder="Escribe notas técnicas de este hallazgo..."
                  className="w-full p-3 rounded-2xl bg-zinc-50 dark:bg-black/40 border border-zinc-300 dark:border-white/10 text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Solicitudes de Repuesto y Servicio */}
              <div className="space-y-2">
                <label className="font-semibold text-zinc-800 dark:text-zinc-200 block text-xs">
                  Requerimientos del Hallazgo:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      flotanteDetalles.pin.solicitaRepuesto
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold"
                        : "bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(flotanteDetalles.pin.solicitaRepuesto)}
                      onChange={(e) => {
                        handleToggleSolicitaPropuesta(flotanteDetalles.pin.id, "solicitaRepuesto", e.target.checked);
                        setFlotanteDetalles((prev) =>
                          prev ? { ...prev, pin: { ...prev.pin, solicitaRepuesto: e.target.checked } } : null
                        );
                      }}
                      className="w-4 h-4 rounded text-amber-600 accent-amber-500 cursor-pointer"
                    />
                    <span>📦 Requiere Producto</span>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      flotanteDetalles.pin.solicitaServicio
                        ? "bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 font-semibold"
                        : "bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(flotanteDetalles.pin.solicitaServicio)}
                      onChange={(e) => {
                        handleToggleSolicitaPropuesta(flotanteDetalles.pin.id, "solicitaServicio", e.target.checked);
                        setFlotanteDetalles((prev) =>
                          prev ? { ...prev, pin: { ...prev.pin, solicitaServicio: e.target.checked } } : null
                        );
                      }}
                      className="w-4 h-4 rounded text-purple-600 accent-purple-500 cursor-pointer"
                    />
                    <span>🔧 Requiere Servicio</span>
                  </label>
                </div>
              </div>

              {/* Botones de acción rápida */}
              <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-zinc-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    const p = flotanteDetalles.pin;
                    setFlotanteDetalles(null);
                    handleAbrirFlotanteFotos(p);
                  }}
                  className="h-8 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📷 Ver Fotos</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = flotanteDetalles.pin;
                    setFlotanteDetalles(null);
                    handleAbrirFlotanteAudios(p);
                  }}
                  className="h-8 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🎙️ Audios</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = flotanteDetalles.pin;
                    setFlotanteDetalles(null);
                    abrirModalProveedor("INDIVIDUAL", undefined, p);
                  }}
                  className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
                >
                  <span>🚚 Pedir a Proveedor</span>
                </button>
              </div>

              {/* Acciones CRUD Neon del Hallazgo */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => handleEliminarHallazgo(flotanteDetalles.pin.id)}
                  className="h-9 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <span>🗑️ Eliminar Hallazgo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleActualizarDatosHallazgo(flotanteDetalles.pin.id, flotanteDetalles.pin.tipo, flotanteDetalles.pin.descripcion || "", flotanteDetalles.pin.vista)}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer font-bold shadow-md shadow-blue-600/30 ml-auto"
                >
                  <span>💾 Guardar Cambios en Neon</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE DE MANUAL TÉCNICO Y ASIGNACIÓN MANUAL */}
      {flotanteManual && (
        <div
          onClick={() => setFlotanteManual(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-scale-up text-zinc-900 dark:text-white max-h-[85vh] flex flex-col"
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    Manual Técnico y Asignación Manual
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    Evidencia #{flotanteManual.pin.numeroEvidencia || flotanteManual.pin.pinNumber || 1} · {formatoPrimeraMayuscula(flotanteManual.pin.tipo)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFlotanteManual(null)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Tarjeta 1: Ficha técnica y búsqueda de manual */}
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <span>📖</span>
                    <span>Guía de Taller / Ficha Técnica</span>
                  </span>
                  <span className="text-[11px] font-mono text-purple-700 dark:text-purple-300">
                    {orden.plate || "S/P"}
                  </span>
                </div>
                <div className="space-y-1 text-zinc-700 dark:text-zinc-300">
                  <p><strong>Vehículo:</strong> {orden.vehicle || "Vehículo no especificado"}</p>
                  <p><strong>Componente:</strong> {formatoPrimeraMayuscula(flotanteManual.pin.tipo)} ({flotanteManual.sec?.nombre || "Taller"})</p>
                  {flotanteManual.pin.descripcion && (
                    <p className="italic text-zinc-500 dark:text-zinc-400">
                      &quot;{flotanteManual.pin.descripcion}&quot;
                    </p>
                  )}
                </div>

                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(
                    `manual de taller servicio ${orden.vehicle || ""} ${flotanteManual.pin.tipo || ""} procedimiento torque pdf`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-9 rounded-xl bg-white dark:bg-zinc-900 border border-purple-300 dark:border-purple-700/60 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer text-xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>Abrir Manual Técnico / Diagrama en Línea (PDF)</span>
                </a>
              </div>

              {/* Tarjeta 2: Ingreso Manual de Repuesto / Servicio */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 space-y-3">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Ingreso Manual para esta Evidencia:
                </span>
                <p className="text-zinc-500 dark:text-zinc-400">
                  Asigna directamente productos, insumos o mano de obra manual vinculados al #{flotanteManual.pin.numeroEvidencia || 1}:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const p = flotanteManual.pin;
                      setFlotanteManual(null);
                      setHallazgoActivoParaAsignar(p);
                      setNuevoNombre(p.descripcion ? `Repuesto para ${p.tipo}: ${p.descripcion}` : `Repuesto para ${p.tipo}`);
                      setNuevoEnStock(true);
                      setNuevoProveedor("Bodega Taller");
                      setNuevoOrigen("TALLER");
                      setModalNuevoRepuesto(true);
                    }}
                    className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>+ Repuesto Manual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const p = flotanteManual.pin;
                      setFlotanteManual(null);
                      setHallazgoActivoParaAsignar(p);
                      setNuevoServicioNombre(p.descripcion ? `Servicio de ${p.tipo}: ${p.descripcion}` : `Servicio de ${p.tipo}`);
                      setNuevoServicioOrigen("TALLER");
                      setModalNuevoServicio(true);
                    }}
                    className="h-9 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <span>+ Servicio Manual</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ZOOM FOTO EVIDENCIA */}
      {fotoZoom && (
        <div
          onClick={() => setFotoZoom(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setFotoZoom(null)}
              className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 flex items-center justify-center text-lg z-10 cursor-pointer"
            >
              ✕
            </button>
            <img src={fotoZoom} alt="Foto ampliada" className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10" />
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR NUEVO HALLAZGO EN NEON */}
      {modalNuevoHallazgo.abierto && (
        <div
          onClick={() => setModalNuevoHallazgo({ abierto: false })}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up text-zinc-900 dark:text-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm">
                  +
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Registrar Nuevo Hallazgo
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {modalNuevoHallazgo.seccionNombre || "Taller"} · Persistencia directa a Neon
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNuevoHallazgo({ abierto: false })}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                  Tipo de Hallazgo / Daño
                </label>
                <input
                  type="text"
                  placeholder="Ej: Fuga de aceite, Pastillas desgastadas, Golpe guardafangos..."
                  value={nuevoHallazgoTipo}
                  onChange={(e) => setNuevoHallazgoTipo(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                  Vista del Vehículo
                </label>
                <select
                  value={nuevoHallazgoVista}
                  onChange={(e) => setNuevoHallazgoVista(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="frontal">Frontal</option>
                  <option value="posterior">Posterior</option>
                  <option value="lateral_izq">Lateral Izquierdo</option>
                  <option value="lateral_der">Lateral Derecho</option>
                  <option value="techo">Techo / Superior</option>
                  <option value="interior">Interior / Habitáculo</option>
                  <option value="motor">Compartimiento Motor</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block mb-1">
                  Descripción Técnica y Detalle del Hallazgo
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe la condición encontrada, gravedad o diagnóstico preliminar..."
                  value={nuevoHallazgoDescripcion}
                  onChange={(e) => setNuevoHallazgoDescripcion(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-black border border-zinc-300 dark:border-white/10 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    nuevoHallazgoSolicitaRepuesto
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 font-semibold"
                      : "bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={nuevoHallazgoSolicitaRepuesto}
                    onChange={(e) => setNuevoHallazgoSolicitaRepuesto(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 accent-amber-500 cursor-pointer"
                  />
                  <span>📦 Requiere Producto</span>
                </label>

                <label
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    nuevoHallazgoSolicitaServicio
                      ? "bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 font-semibold"
                      : "bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={nuevoHallazgoSolicitaServicio}
                    onChange={(e) => setNuevoHallazgoSolicitaServicio(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 accent-purple-500 cursor-pointer"
                  />
                  <span>🔧 Requiere Servicio</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCrearNuevoHallazgo}
                  className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/30 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>💾 Registrar Hallazgo en Neon PostgreSQL</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: TIEMPO, ENVÍO Y ESTADO PROVEEDOR (MINIMALISTA 1 PALABRA)   */}
      {/* ================================================================= */}
      {itemTiempoEnvioModal && (() => {
        const esServicioModal = itemTiempoEnvioModal.isService;
        const currentItem: any = esServicioModal
          ? servicios.find((s) => s.id === itemTiempoEnvioModal.id)
          : repuestos.find((r) => r.id === itemTiempoEnvioModal.id);
        if (!currentItem) return null;

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
            onClick={() => setItemTiempoEnvioModal(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d1322] p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                    {esServicioModal ? "🔧 Servicio" : "📦 Producto"}
                  </span>
                  <h4 className="text-sm font-black text-white truncate">
                    {currentItem.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setItemTiempoEnvioModal(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* 1. Stock & Disponibilidad Proveedor */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  📦 Stock
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateItemFields(currentItem.id, esServicioModal, {
                        inStock: true,
                        purchaseStatus: "STOCK_LOCAL",
                        supplierName: "Bodega Taller",
                      })
                    }
                    className={`h-9 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      currentItem.inStock
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>🏢</span>
                    <span>Bodega</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateItemFields(currentItem.id, esServicioModal, {
                        inStock: false,
                        purchaseStatus: "POR_PEDIR",
                        supplierName:
                          currentItem.supplierName && currentItem.supplierName !== "Bodega Taller"
                            ? currentItem.supplierName
                            : "Proveedor General",
                      })
                    }
                    className={`h-9 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      !currentItem.inStock
                        ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>🚚</span>
                    <span>Pedir</span>
                  </button>
                </div>

                {/* Respuesta de proveedor: Sí hay / No hay */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateItemFields(currentItem.id, esServicioModal, {
                        supplierAvailability:
                          currentItem.supplierAvailability === "SI_HAY" ? null : "SI_HAY",
                      })
                    }
                    className={`h-8 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      currentItem.supplierAvailability === "SI_HAY"
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-emerald-300"
                    }`}
                  >
                    <span>✓</span>
                    <span>Sí hay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateItemFields(currentItem.id, esServicioModal, {
                        supplierAvailability:
                          currentItem.supplierAvailability === "NO_HAY" ? null : "NO_HAY",
                      })
                    }
                    className={`h-8 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      currentItem.supplierAvailability === "NO_HAY"
                        ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-rose-300"
                    }`}
                  >
                    <span>✕</span>
                    <span>No hay</span>
                  </button>
                </div>
              </div>

              {/* 2. Tiempo (Cuándo llega / ejecución) - Deslizable */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ⏱️ Tiempo
                  </span>
                  {currentItem.deliveryTime && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItemFields(currentItem.id, esServicioModal, {
                          deliveryTime: null,
                        })
                      }
                      className="text-[10px] text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {OPCIONES_TIEMPO_RAPIDO.map((t) => {
                    const active = currentItem.deliveryTime === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          handleUpdateItemFields(currentItem.id, esServicioModal, {
                            deliveryTime: active ? null : t.id,
                          })
                        }
                        className={`h-8 px-3 rounded-xl text-xs font-bold border shrink-0 transition-all cursor-pointer ${
                          active
                            ? "bg-blue-600 text-white border-blue-400 shadow-sm"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Envío (Por dónde lo envía) - Deslizable */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    🚚 Envío
                  </span>
                  {currentItem.shippingMethod && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItemFields(currentItem.id, esServicioModal, {
                          shippingMethod: null,
                        })
                      }
                      className="text-[10px] text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {OPCIONES_ENVIO_RAPIDO.map((env) => {
                    const active = currentItem.shippingMethod === env.id;
                    return (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() =>
                          handleUpdateItemFields(currentItem.id, esServicioModal, {
                            shippingMethod: active ? null : env.id,
                          })
                        }
                        className={`h-8 px-3 rounded-xl text-xs font-bold border shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                          active
                            ? "bg-purple-600 text-white border-purple-400 shadow-sm"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span>{env.icon}</span>
                        <span>{env.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Costo Proveedor y PVP */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    💵 Costo ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentItem.costPrice || 0}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      handleUpdateItemFields(currentItem.id, esServicioModal, {
                        costPrice: val,
                        supplierPrice: val,
                      });
                    }}
                    className="w-full h-9 rounded-xl bg-slate-900 border border-slate-800 px-3 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                    🏷️ PVP ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentItem.price || 0}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      handleUpdateItemFields(currentItem.id, esServicioModal, {
                        price: val,
                      });
                    }}
                    className="w-full h-9 rounded-xl bg-emerald-950/30 border border-emerald-500/40 px-3 text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    const pinAsociado = currentItem.findingId
                      ? hallazgos.find(
                          (h: any) =>
                            h.id === currentItem.findingId ||
                            h.originalId === currentItem.findingId
                        )
                      : undefined;
                    setItemTiempoEnvioModal(null);
                    abrirModalProveedor("INDIVIDUAL", currentItem, pinAsociado);
                  }}
                  className="h-9 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>💬</span>
                  <span>Pedir</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemTiempoEnvioModal(null);
                  }}
                  className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  ✓ Listo
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================= */}
      {/* MODAL: CATÁLOGO INTERACTIVO TALLER (CARRITO CON STOCK Y PRECIO)   */}
      {/* ================================================================= */}
      {modalCatalogoTallerAbierto.abierto && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={() =>
            setModalCatalogoTallerAbierto({ abierto: false, origen: "TALLER" })
          }
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[85dvh] overflow-y-auto rounded-2xl bg-white dark:bg-[#111113] border border-zinc-200 dark:border-white/10 p-4 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  Catálogo · {modalCatalogoTallerAbierto.origen}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setModalCatalogoTallerAbierto({ abierto: false, origen: "TALLER" })
                }
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <CatalogoProductosServiciosTaller
              itemsSeleccionados={itemsPropuestaParaTrabajos}
              onAgregarItem={(item, delta = 1) => {
                if (delta > 0) {
                  void handleAgregarDesdeCatalogoTaller([{ ...item, qty: delta }]);
                }
              }}
              onEliminarItem={(itemId) => {
                const esSrv = servicios.some((s) => s.id === itemId || s.code === itemId);
                if (esSrv) {
                  const target = servicios.find((s) => s.id === itemId || s.code === itemId);
                  if (target) void handleDeleteService(target.id);
                } else {
                  const target = repuestos.find((r) => r.id === itemId || r.code === itemId);
                  if (target) void handleDeleteItem(target.id);
                }
              }}
              siempreAbierto
              mostrarPrecios
              mostrarChipsSeleccionados
            />
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: SERVICIOS RÁPIDOS 1-CLIC POR ESPECIALIDAD                  */}
      {/* ================================================================= */}
      {modalAccesosRapidosAbierto.abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() =>
            setModalAccesosRapidosAbierto({ abierto: false, origen: "TALLER" })
          }
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d1322] p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚡</span>
                <h4 className="text-sm font-black text-white">
                  Rápidos · {modalAccesosRapidosAbierto.origen}
                </h4>
              </div>
              <button
                type="button"
                onClick={() =>
                  setModalAccesosRapidosAbierto({ abierto: false, origen: "TALLER" })
                }
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              value={busquedaAccesoRapido}
              onChange={(e) => setBusquedaAccesoRapido(e.target.value)}
              placeholder="🔍 Filtrar..."
              className="w-full h-9 rounded-xl bg-slate-900 border border-slate-800 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {(
                SERVICIOS_RAPIDOS_POR_ESPECIALIDAD[modalAccesosRapidosAbierto.origen] ||
                SERVICIOS_RAPIDOS_POR_ESPECIALIDAD.TALLER
              )
                .filter((s) =>
                  !busquedaAccesoRapido.trim()
                    ? true
                    : s.nombre.toLowerCase().includes(busquedaAccesoRapido.toLowerCase())
                )
                .map((srv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">
                        {srv.nombre}
                      </p>
                      <span className="text-[10px] font-semibold text-emerald-400">
                        ${srv.precio.toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleAgregarAccesoRapido(
                          srv.nombre,
                          srv.precio,
                          modalAccesosRapidosAbierto.origen
                        )
                      }
                      className="h-7 px-3 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      + Añadir
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
