"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import CatalogoProductosServiciosTaller from "@/components/taller/CatalogoProductosServiciosTaller";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

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
  agregadoEnPropuesta?: boolean;
  inStock?: boolean; // true = sí hay en bodega taller, false = pedir a proveedor externo
  isManual?: boolean;
  enviadoProveedor?: boolean;
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
  agregadoEnPropuesta?: boolean;
  isManual?: boolean;
  enviadoProveedor?: boolean;
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
  const [proveedoresSeleccionadosIds, setProveedoresSeleccionadosIds] = useState<string[]>([]);
  const [itemsSeleccionadosModalProv, setItemsSeleccionadosModalProv] = useState<Record<string, boolean>>({});
  const [mostrarTodosEnModalProv, setMostrarTodosEnModalProv] = useState(false);
  const [mostrarNuevoProvInline, setMostrarNuevoProvInline] = useState(false);
  const [nuevoProvNombre, setNuevoProvNombre] = useState("");
  const [busquedaProveedor, setBusquedaProveedor] = useState("");
  const [telefonoManualProveedor, setTelefonoManualProveedor] = useState("");
  const [hallazgoActivoParaAsignar, setHallazgoActivoParaAsignar] = useState<any | null>(null);
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const [esAprobadoLocal, setEsAprobadoLocal] = useState<boolean | null>(null);
  const [esPagadoLocal, setEsPagadoLocal] = useState<boolean | null>(null);
  const [esPausadoLocal, setEsPausadoLocal] = useState<boolean | null>(null);
  const [ordenActivaEnTaller, setOrdenActivaEnTaller] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && orden?.id) {
      try {
        const activaId = localStorage.getItem("taller_orden_activa_id");
        setOrdenActivaEnTaller(
          Boolean(activaId && (activaId === orden.id || activaId === orden.orderNumber))
        );
      } catch { }
    }
  }, [orden?.id, orden?.orderNumber]);
  const [menuEstadoTallerAbierto, setMenuEstadoTallerAbierto] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoFotoCliente, setSubiendoFotoCliente] = useState(false);
  const [subiendoFotoVehiculoPrincipal, setSubiendoFotoVehiculoPrincipal] = useState(false);
  const [fotoVehiculoError, setFotoVehiculoError] = useState(false);
  const [fotoClienteError, setFotoClienteError] = useState(false);

  // Carrusel de propuestas en el encabezado morado (estilo Taller)
  const [listaPropuestas, setListaPropuestas] = useState<any[]>([]);
  const [clientesCatalogo, setClientesCatalogo] = useState<any[]>([]);
  const ordenesCarouselRef = useRef<HTMLDivElement | null>(null);
  const ordenesCarouselScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignorarScrollProgramaticoRef = useRef<boolean>(true);
  const ultimoToqueAutoRef = useRef<{ id: string; time: number }>({ id: "", time: 0 });
  const clickSimpleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detallesCacheRef = useRef<Record<string, any>>({});
  const catalogoProductosRef = useRef<any[]>([]);
  const catalogoServiciosRef = useRef<any[]>([]);

  const resolverPrecioServicioCatalogo = useCallback((nombre?: string, precioActual?: number, esManual?: boolean): number => {
    const actual = Number(precioActual || 0);
    if (actual > 0 || esManual) return actual;
    const norm = String(nombre || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
    if (!norm) return 0;
    for (const esp of Object.values(SERVICIOS_RAPIDOS_POR_ESPECIALIDAD)) {
      const matchRapido = esp.find((s) => s.nombre.trim().toLowerCase() === norm);
      if (matchRapido && matchRapido.precio > 0) return matchRapido.precio;
    }
    const matchCat = catalogoServiciosRef.current.find(
      (s: any) => String(s?.name || "").trim().toLowerCase() === norm
    );
    if (matchCat && Number(matchCat.price) > 0) return Number(matchCat.price);
    return 0;
  }, []);

  const resolverPrecioProductoCatalogo = useCallback((it?: any, esManual?: boolean): number => {
    const actual = Number(it?.price || 0);
    if (actual > 0 || esManual) return actual;
    const norm = String(it?.name || it?.description || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
    const matchProd = catalogoProductosRef.current.find(
      (p: any) =>
        (it?.productId && p.id === it.productId) ||
        (it?.id && p.id === it.id) ||
        (it?.code && p.code && String(p.code).toLowerCase() === String(it.code).toLowerCase()) ||
        (norm && String(p?.name || "").trim().toLowerCase() === norm)
    );
    if (matchProd && Number(matchProd.price) > 0) return Number(matchProd.price);
    return 0;
  }, []);

  useEffect(() => {
    let cancelado = false;
    async function cargarListaPropuestasYCatalogo() {
      try {
        const [resPres, resTal] = await Promise.all([
          fetch("/api/presupuestos/ordenes").then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch("/api/taller/operacion").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (cancelado) return;
        if (resTal?.success && Array.isArray(resTal.clientes)) {
          setClientesCatalogo(resTal.clientes);
        }
        if (resTal?.success && Array.isArray(resTal.productos)) {
          catalogoProductosRef.current = resTal.productos;
        }
        if (resTal?.success && Array.isArray(resTal.servicios)) {
          catalogoServiciosRef.current = resTal.servicios;
        }
        // Si ya hay ítems cargados sin precio y son de catálogo, completar su precio automáticamente
        setServicios((prev) =>
          prev.map((sv) => {
            if (sv.isManual || Number(sv.price || 0) > 0) return sv;
            const p = resolverPrecioServicioCatalogo(sv.name, sv.price, sv.isManual);
            return p > 0 ? { ...sv, price: p } : sv;
          })
        );
        setRepuestos((prev) =>
          prev.map((it) => {
            if (it.isManual || Number(it.price || 0) > 0) return it;
            const p = resolverPrecioProductoCatalogo(it, it.isManual);
            return p > 0
              ? {
                ...it,
                price: p,
                subtotalVenta: Number((p * (Number(it.qty) || 1)).toFixed(2)),
              }
              : it;
          })
        );
        const esPropuestaPagada = (item: any): boolean => {
          if (!item) return false;
          const st = String(item.status || "").trim().toLowerCase();
          const qs = String(item.quoteStatus || "").trim().toLowerCase();
          const ds = String(item.deliveryStatus || "").trim().toLowerCase();
          if (
            qs === "pagado" ||
            st === "pagado" ||
            st === "facturado" ||
            st === "cobrado" ||
            ds === "pagado" ||
            ds === "facturado" ||
            ds === "cobrado" ||
            ds === "entregado"
          ) {
            return true;
          }
          const payments = Array.isArray(item.payments) ? item.payments : [];
          if (payments.length > 0) {
            const totalPagado = payments.reduce((acc: number, p: any) => acc + Number(p?.amount || 0), 0);
            const totalOrden = Number(item.total || item.totalGeneral || item.quoteTotal || 0);
            if (totalPagado > 0 && (totalOrden <= 0 || totalPagado >= totalOrden - 0.01)) {
              return true;
            }
          }
          return false;
        };

        const combinadas: any[] = [];
        const vistos = new Set<string>();
        const agregar = (item: any) => {
          if (!item?.id || vistos.has(item.id)) return;
          if (esPropuestaPagada(item)) return;
          vistos.add(item.id);
          combinadas.push(item);
        };
        if (resPres?.success && Array.isArray(resPres.ordenes)) {
          resPres.ordenes.forEach(agregar);
        }
        if (resTal?.success && Array.isArray(resTal.autosEnPista)) {
          resTal.autosEnPista.forEach(agregar);
        }
        if (resPres?.success || resTal?.success) {
          setListaPropuestas(combinadas);
          // Pre-cargar silenciosamente en caché el detalle de cada propuesta para deslizar al instante sin pantalla de carga
          combinadas.forEach((prop) => {
            if (!prop?.id || detallesCacheRef.current[prop.id]) return;
            fetch(`/api/presupuestos/detalle?id=${encodeURIComponent(prop.id)}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((d) => {
                if (!cancelado && d?.success && d?.order) {
                  detallesCacheRef.current[prop.id] = d.order;
                }
              })
              .catch(() => { });
          });
        }
      } catch { }
    }
    void cargarListaPropuestasYCatalogo();
    return () => {
      cancelado = true;
    };
  }, [id]);

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
    if (list.length === 0 && orden?.evidencias) {
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
  const [moduloActivoPropuesta, setModuloActivoPropuesta] = useState<EspecialidadTipo>("TALLER");
  const [descripcionRapida, setDescripcionRapida] = useState("");
  const [tipoRapido, setTipoRapido] = useState<"SERVICE" | "PART">("SERVICE");
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

  const aplicarOrdenEnEstado = useCallback((ord: any, proveedoresData?: any[]) => {
    if (!ord) return;
    if (ord.id) {
      detallesCacheRef.current[ord.id] = ord;
    }
    setFotoVehiculoError(false);
    setFotoClienteError(false);
    setEsAprobadoLocal(null);
    setEsPagadoLocal(null);
    setEsPausadoLocal(null);
    setOrden(ord);
    if (Array.isArray(proveedoresData) && proveedoresData.length > 0) {
      setProveedores(proveedoresData);
    }
    setNotasFactura(ord.notes || "");
    setPorcentajeIva(Number(ord.quoteTaxRate ?? 15));
    setPorcentajeDescuento(Number(ord.quoteDiscount ?? 0));

    let rawServicesList: any[] = [];
    if (Array.isArray(ord.services)) {
      rawServicesList = ord.services;
    } else if (typeof ord.servicesJson === "string") {
      try {
        const parsed = JSON.parse(ord.servicesJson);
        if (Array.isArray(parsed)) rawServicesList = parsed;
      } catch { }
    }

    let rawItemsList: any[] = [];
    if (Array.isArray(ord.items)) {
      rawItemsList = ord.items;
    } else if (typeof ord.itemsJson === "string") {
      try {
        const parsed = JSON.parse(ord.itemsJson);
        if (Array.isArray(parsed)) rawItemsList = parsed;
      } catch { }
    }

    // Unificar servicios que vengan dentro de itemsJson (type === "SERVICE") con servicesJson
    const rawPartsOnly = rawItemsList.filter((it: any) => it && it.type !== "SERVICE");
    const partNamesSet = new Set<string>();
    for (const p of rawPartsOnly) {
      const n1 = String(p?.name || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
      const n2 = String(p?.fullName || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
      if (n1) partNamesSet.add(n1);
      if (n2) partNamesSet.add(n2);
    }

    const extraServicesFromItems = rawItemsList.filter((it: any) => it && it.type === "SERVICE");
    const combinedRawServices: any[] = [];
    const seenSrvKeys = new Set<string>();
    const seenSrvNames = new Set<string>();

    // Primero agregar servicios con estructura completa desde itemsJson (extraServicesFromItems)
    for (const sv of extraServicesFromItems) {
      if (!sv) continue;
      const key = sv?.id ? String(sv.id) : "";
      const normName = String(sv?.name || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
      if (key && seenSrvKeys.has(key)) continue;
      if (key) seenSrvKeys.add(key);
      if (normName) seenSrvNames.add(normName);
      combinedRawServices.push(sv);
    }

    // Luego agregar servicios de servicesJson filtrando duplicados o nombres que sean productos
    for (const sv of rawServicesList) {
      if (!sv) continue;
      const isStr = typeof sv === "string";
      const key = !isStr && sv?.id ? String(sv.id) : "";
      const normName = String(isStr ? sv : (sv?.name || "")).trim().toLowerCase().replace(/^\d+x\s+/i, "");
      if (!normName) continue;
      if (key && seenSrvKeys.has(key)) continue;
      if (partNamesSet.has(normName)) continue;
      if (seenSrvNames.has(normName)) continue;
      if (key) seenSrvKeys.add(key);
      seenSrvNames.add(normName);
      combinedRawServices.push(sv);
    }

    // Inicializar servicios preservando campos manuales y de proveedor
    const srvInit: ServicioPropuesta[] = combinedRawServices.map((sv: any, idx: number) => {
      const isStr = typeof sv === "string";
      const svObj = isStr ? { id: `srv_${idx}`, name: sv, price: 0, category: "Taller" } : sv;
      const esManualSrv = Boolean(
        svObj.isManual ||
        String(svObj.id || "").startsWith("reg-") ||
        String(svObj.id || "").startsWith("man-")
      );
      const precioSrvResuelto = resolverPrecioServicioCatalogo(svObj.name, svObj.price, esManualSrv);
      return {
        ...svObj,
        price: precioSrvResuelto,
        qty: Number(svObj.qty || 1),
        agregadoEnPropuesta: Boolean(
          svObj.agregadoEnPropuesta ||
          svObj.addedInQuote ||
          svObj.creadoEnPropuesta ||
          String(svObj.id || "").includes("rap-srv-") ||
          String(svObj.id || "").includes("prop-")
        ),
        category: svObj.category || "Taller",
        origin: svObj.origin || deducirEspecialidad(svObj.name || "", svObj.category || ""),
        inStock: svObj.inStock !== undefined ? Boolean(svObj.inStock) : !Boolean(esManualSrv && svObj.purchaseStatus === "POR_PEDIR"),
        purchaseStatus: svObj.purchaseStatus || (svObj.inStock === false ? "POR_PEDIR" : "STOCK_LOCAL"),
        isManual: esManualSrv,
        enviadoProveedor: Boolean(
          svObj.enviadoProveedor ||
          svObj.purchaseStatus === "PEDIDO_WHATSAPP" ||
          svObj.purchaseStatus === "COTIZADO"
        ),
        fotos: Array.isArray(svObj.fotos) ? svObj.fotos : [],
        audios: Array.isArray(svObj.audios) ? svObj.audios : [],
        supplierAvailability: svObj.supplierAvailability || null,
        supplierPrice: svObj.supplierPrice !== undefined ? Number(svObj.supplierPrice) : null,
        deliveryTime: svObj.deliveryTime || null,
        shippingMethod: svObj.shippingMethod || null,
        supplierNotes: svObj.supplierNotes || null,
        supplierRespondedAt: svObj.supplierRespondedAt || null,
      };
    });

    // Inicializar repuestos con origen deducido y flag de inStock
    const itemsInit: ItemPropuesta[] = rawItemsList
      .filter((it: any) => it && it.type !== "SERVICE")
      .map((it: any) => {
        const esManualPart = Boolean(
          it.isManual ||
          String(it.id || "").startsWith("reg-") ||
          String(it.id || "").startsWith("man-")
        );
        const precioProdResuelto = resolverPrecioProductoCatalogo(it, esManualPart);
        const cantProd = Number(it.qty || 1);
        return {
          ...it,
          price: precioProdResuelto,
          subtotalVenta: Number((precioProdResuelto * cantProd).toFixed(2)),
          agregadoEnPropuesta: Boolean(
            it.agregadoEnPropuesta ||
            it.addedInQuote ||
            it.creadoEnPropuesta ||
            String(it.id || "").includes("prop-")
          ),
          origin: it.origin || deducirEspecialidad(it.name || "", it.category || ""),
          inStock: it.inStock !== undefined ? Boolean(it.inStock) : !esManualPart,
          purchaseStatus: it.purchaseStatus || (it.inStock === false || esManualPart ? "POR_PEDIR" : "STOCK_LOCAL"),
          isManual: esManualPart,
          enviadoProveedor: Boolean(
            it.enviadoProveedor ||
            it.purchaseStatus === "PEDIDO_WHATSAPP" ||
            it.purchaseStatus === "COTIZADO"
          ),
          fotos: Array.isArray(it.fotos) ? it.fotos : [],
          audios: Array.isArray(it.audios) ? it.audios : [],
          supplierAvailability: it.supplierAvailability || null,
          supplierPrice: it.supplierPrice !== undefined ? Number(it.supplierPrice) : null,
          deliveryTime: it.deliveryTime || null,
          shippingMethod: it.shippingMethod || null,
          supplierNotes: it.supplierNotes || null,
          supplierRespondedAt: it.supplierRespondedAt || null,
        };
      });

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
  }, []);

  const cargarDetallePorId = useCallback(
    async (targetId: string, silencioso = false) => {
      if (!targetId) return;
      try {
        if (!silencioso) {
          setCargando(true);
        }
        setError("");
        const res = await fetch(`/api/presupuestos/detalle?id=${encodeURIComponent(targetId)}`);
        let data: any = null;
        if (res.ok) {
          try {
            data = await res.json();
          } catch { }
        }

        // Fallback: si no se encontró por ID directo, buscar en el listado general de propuestas (pagadas o no)
        if (!data?.success || !data?.order) {
          try {
            const resLista = await fetch("/api/presupuestos/ordenes");
            const dataLista = resLista.ok ? await resLista.json() : null;
            if (dataLista?.success && Array.isArray(dataLista.ordenes) && dataLista.ordenes.length > 0) {
              const match =
                dataLista.ordenes.find(
                  (o: any) =>
                    o.id === targetId ||
                    o.orderNumber === targetId ||
                    o.quoteNumber === targetId
                ) || dataLista.ordenes[0];
              if (match) {
                data = {
                  success: true,
                  order: {
                    ...match,
                    items: Array.isArray(match.items) ? match.items : [],
                    services: Array.isArray(match.services) ? match.services : [],
                    evidencias: [],
                    inspectionFindings: [],
                    receptionInventory: [],
                  },
                };
              }
            }
          } catch { }
        }

        if (!data?.success || !data?.order) {
          if (!silencioso) setError("Factura / Presupuesto no disponible");
          return;
        }

        aplicarOrdenEnEstado(data.order, data.proveedores);
        if (!Array.isArray(data.proveedores) || data.proveedores.length === 0) {
          fetch("/api/presupuestos/proveedores")
            .then((r) => r.json())
            .then((d) => {
              if (d.success && Array.isArray(d.proveedores)) setProveedores(d.proveedores);
            })
            .catch(() => { });
        }
      } catch {
        if (!silencioso) setError("Error de conexión al cargar el presupuesto.");
      } finally {
        if (!silencioso) setCargando(false);
      }
    },
    [aplicarOrdenEnEstado]
  );

  // Cargar datos iniciales de la orden
  useEffect(() => {
    void cargarDetallePorId(id, Boolean(orden));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useRealtimeSync({
    channels: ["presupuestos", "taller", "ordenes"],
    onEvent: (ev) => {
      if (
        ev.action === "deleted" &&
        ev.entityId &&
        (ev.entityId === id || ev.entityId === orden?.id || ev.entityId === orden?.orderNumber)
      ) {
        setError("Esta propuesta fue eliminada en otra sesión.");
      }
    },
    onRefresh: () => {
      if (!guardando && estadoSync !== "guardando" && id) {
        void cargarDetallePorId(id, true);
      }
    },
  });

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
    const esSrv = servicios.some((s) => s.id === itemId);
    if (esSrv) {
      const targetSrv = servicios.find((s) => s.id === itemId);
      const nuevaCant = (targetSrv?.qty || 1) + delta;
      if (nuevaCant <= 0) {
        void handleDeleteService(itemId);
        return;
      }
      const nuevosServicios = servicios.map((sv) =>
        sv.id === itemId ? { ...sv, qty: nuevaCant } : sv
      );
      setServicios(nuevosServicios);
      dispararGuardadoDebounced(repuestos, nuevosServicios);
      return;
    }

    const targetRep = repuestos.find((r) => r.id === itemId);
    if (targetRep && (targetRep.qty || 1) + delta <= 0) {
      void handleDeleteItem(itemId);
      return;
    }

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
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !orden) return;
    setSubiendoMediaRapido(true);
    try {
      for (const file of files) {
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
        }
      }
      mostrarToast(tipo === "foto" ? "📷 Foto adjuntada" : "🎙️ Audio adjuntado");
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
        agregadoEnPropuesta: true,
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
        agregadoEnPropuesta: true,
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
          agregadoEnPropuesta: true,
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
          agregadoEnPropuesta: true,
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
      agregadoEnPropuesta: true,
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
    const subtotalServicios = servicios.reduce((acc, sv) => acc + (sv.price * (sv.qty || 1)), 0);
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

  // Lista de proveedores disponibles (de Neon DB o predeterminados si aún no hay en DB)
  const proveedoresDisponibles = useMemo(() => {
    if (proveedores.length > 0) return proveedores;
    return [
      {
        id: "prov_def_1",
        name: "Repuestos Japón Express",
        contact: "Ventas",
        phone: "0987654321",
        categories: "Originales y Alternos",
      },
      {
        id: "prov_def_2",
        name: "Importadora Automotriz",
        contact: "Bodega",
        phone: "0991234567",
        categories: "Motor, Frenos y Suspensión",
      },
      {
        id: "prov_def_3",
        name: "Casa del Repuesto",
        contact: "Mostrador",
        phone: "0981122334",
        categories: "Carrocería y Eléctrico",
      },
    ];
  }, [proveedores]);

  // Todos los ítems (servicios y productos) marcados con el icono de camión para enviar a proveedor
  const itemsMarcadosProveedor = useMemo(() => {
    const srvs = servicios
      .filter(
        (s) =>
          s.enviadoProveedor ||
          s.purchaseStatus === "PEDIDO_WHATSAPP" ||
          s.purchaseStatus === "COTIZADO"
      )
      .map((s) => ({ ...s, isService: true, qty: Number(s.qty || 1) }));
    const prods = repuestos
      .filter(
        (r) =>
          r.enviadoProveedor ||
          r.purchaseStatus === "PEDIDO_WHATSAPP" ||
          r.purchaseStatus === "COTIZADO"
      )
      .map((r) => ({ ...r, isService: false, qty: Number(r.qty || 1) }));
    return [...srvs, ...prods];
  }, [servicios, repuestos]);

  // Al pulsar el icono de camión junto a Manual en la tabla: marca/desmarca que se envió al listado de proveedor y cambia de color
  const handleToggleMarcarProveedor = (item: any, esServicio: boolean) => {
    const yaMarcado = Boolean(
      item.enviadoProveedor ||
      item.purchaseStatus === "PEDIDO_WHATSAPP" ||
      item.purchaseStatus === "COTIZADO"
    );
    const nuevoEstado = !yaMarcado;

    handleUpdateItemFields(item.id, esServicio, {
      enviadoProveedor: nuevoEstado,
      inStock: nuevoEstado ? false : true,
      purchaseStatus: nuevoEstado ? "PEDIDO_WHATSAPP" : "STOCK_LOCAL",
    });

    setItemsSeleccionadosModalProv((prev) => ({
      ...prev,
      [item.id]: nuevoEstado,
    }));

    mostrarToast(
      nuevoEstado
        ? "✓ Enviado a proveedor"
        : "Quitado de proveedor"
    );
  };

  // Manejo de envíos a proveedores (individual y masivo desde el icono flotante superior derecho)
  const abrirModalProveedor = (modo: "MASIVO" | "INDIVIDUAL", item?: any, pin?: any) => {
    setModalProveedor({ abierto: true, modo, item, pin });
    setBusquedaProveedor("");
    setMostrarNuevoProvInline(false);

    // Preseleccionar proveedores si no había ninguno
    if (proveedoresSeleccionadosIds.length === 0 && proveedoresDisponibles.length > 0) {
      setProveedoresSeleccionadosIds([proveedoresDisponibles[0].id]);
      setProveedorSeleccionado(proveedoresDisponibles[0]);
      setTelefonoManualProveedor(proveedoresDisponibles[0].phone || "");
    }

    // Preseleccionar los ítems que se van a pedir
    const seleccionInicial: Record<string, boolean> = {};
    if (modo === "INDIVIDUAL" && item?.id) {
      seleccionInicial[item.id] = true;
    } else {
      itemsMarcadosProveedor.forEach((it) => {
        seleccionInicial[it.id] = true;
      });
      // Si aún no había ninguno marcado con el camión, preseleccionar los manuales o por comprar
      if (Object.keys(seleccionInicial).length === 0) {
        [...servicios, ...repuestos].forEach((it: any) => {
          if (it.isManual || it.inStock === false) {
            seleccionInicial[it.id] = true;
          }
        });
      }
    }
    setItemsSeleccionadosModalProv(seleccionInicial);
  };

  const proveedoresFiltrados = useMemo(() => {
    if (!busquedaProveedor.trim()) return proveedoresDisponibles;
    const q = busquedaProveedor.toLowerCase();
    return proveedoresDisponibles.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.contact && p.contact.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.categories && p.categories.toLowerCase().includes(q))
    );
  }, [proveedoresDisponibles, busquedaProveedor]);

  const proveedoresElegidosObjetos = useMemo(() => {
    return proveedoresDisponibles.filter((p) => proveedoresSeleccionadosIds.includes(p.id));
  }, [proveedoresDisponibles, proveedoresSeleccionadosIds]);

  const toggleSeleccionProveedor = (prov: any) => {
    setProveedoresSeleccionadosIds((prev) => {
      const existe = prev.includes(prov.id);
      const next = existe ? prev.filter((id) => id !== prov.id) : [...prev, prov.id];
      return next;
    });
    setProveedorSeleccionado(prov);
    if (prov.phone) setTelefonoManualProveedor(prov.phone);
  };

  const handleAgregarProveedorInline = () => {
    if (!nuevoProvNombre.trim()) {
      mostrarToast("Ingresa el nombre del proveedor", "err");
      return;
    }
    const nuevo = {
      id: `prov_custom_${Date.now()}`,
      name: nuevoProvNombre.trim(),
      phone: telefonoManualProveedor.trim() || "",
      contact: "Directo",
    };
    setProveedores((prev) => [nuevo, ...(prev.length > 0 ? prev : proveedoresDisponibles)]);
    setProveedoresSeleccionadosIds((prev) => [...prev, nuevo.id]);
    setProveedorSeleccionado(nuevo);
    setNuevoProvNombre("");
    setMostrarNuevoProvInline(false);
    mostrarToast(`✓ Proveedor ${nuevo.name} seleccionado`);
  };

  // Lista de ítems disponibles para mostrar en el flotante de pedidos a proveedor
  const listaItemsEnModalProveedor = useMemo(() => {
    const todos = [
      ...servicios.map((s) => ({ ...s, isService: true, qty: Number(s.qty || 1) })),
      ...repuestos.map((r) => ({ ...r, isService: false, qty: Number(r.qty || 1) })),
    ];
    if (mostrarTodosEnModalProv || itemsMarcadosProveedor.length === 0) {
      return todos;
    }
    return itemsMarcadosProveedor;
  }, [servicios, repuestos, itemsMarcadosProveedor, mostrarTodosEnModalProv]);

  const itemsElegidosParaPedir = useMemo(() => {
    const todos = [
      ...servicios.map((s) => ({ ...s, isService: true, qty: Number(s.qty || 1) })),
      ...repuestos.map((r) => ({ ...r, isService: false, qty: Number(r.qty || 1) })),
    ];
    return todos.filter((it) => itemsSeleccionadosModalProv[it.id]);
  }, [servicios, repuestos, itemsSeleccionadosModalProv]);

  const construirLinkCatalogoProveedor = (provEspecifico?: any) => {
    if (!orden) return "";
    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/pedidos-proveedor/${orden.id}`
        : `/pedidos-proveedor/${orden.id}`;
    const query = new URLSearchParams();

    const idsElegidos = itemsElegidosParaPedir.map((it) => String(it.id));
    if (idsElegidos.length > 0) {
      query.set("items", idsElegidos.join(","));
    } else if (modalProveedor.modo === "INDIVIDUAL" && modalProveedor.item?.id) {
      query.set("itemId", String(modalProveedor.item.id));
    }

    const provPrincipal =
      provEspecifico || proveedoresElegidosObjetos[0] || proveedorSeleccionado;
    if (provPrincipal?.name) {
      query.set("supplier", provPrincipal.name);
    }
    const phonePrincipal =
      provEspecifico?.phone ||
      telefonoManualProveedor.trim() ||
      provPrincipal?.phone ||
      "";
    if (phonePrincipal) {
      query.set("phone", phonePrincipal);
    }

    if (proveedoresElegidosObjetos.length > 1) {
      query.set(
        "suppliers",
        JSON.stringify(
          proveedoresElegidosObjetos.map((p) => ({
            name: p.name,
            phone: p.phone || "",
          }))
        )
      );
    }

    const qs = query.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  };

  const marcarItemsElegidosComoEnviados = async () => {
    const idsSet = new Set(itemsElegidosParaPedir.map((it) => it.id));
    if (idsSet.size === 0) return;

    const nombresProvs =
      proveedoresElegidosObjetos.map((p) => p.name).join(", ") ||
      proveedorSeleccionado?.name ||
      "Proveedor";

    const nuevosSrv = servicios.map((s) =>
      idsSet.has(s.id)
        ? {
          ...s,
          enviadoProveedor: true,
          inStock: false,
          purchaseStatus: "PEDIDO_WHATSAPP",
          supplierName: nombresProvs,
        }
        : s
    );
    const nuevosRep = repuestos.map((r) =>
      idsSet.has(r.id)
        ? {
          ...r,
          enviadoProveedor: true,
          inStock: false,
          purchaseStatus: "PEDIDO_WHATSAPP",
          supplierName: nombresProvs,
        }
        : r
    );
    setServicios(nuevosSrv);
    setRepuestos(nuevosRep);
    await sincronizarConNeon(nuevosRep, nuevosSrv);
  };

  const handleAbrirCatalogoProveedor = async (provEspecifico?: any) => {
    const link = construirLinkCatalogoProveedor(provEspecifico);
    await marcarItemsElegidosComoEnviados();
    if (link && typeof window !== "undefined") {
      window.open(link, "_blank");
    }
  };

  const generarMensajeWhatsAppProveedor = (provEspecifico?: any) => {
    if (!orden) return "";
    const vehicleInfo = `${orden.vehicle || "Vehículo"} (Placa: ${orden.plate || "N/A"})`;
    const fullLink = construirLinkCatalogoProveedor(provEspecifico);
    const lista =
      itemsElegidosParaPedir.length > 0
        ? itemsElegidosParaPedir
        : itemsMarcadosProveedor.length > 0
          ? itemsMarcadosProveedor
          : repuestos;
    const itemsList = lista
      .map((r: any) => `• ${r.qty || 1}x ${r.name}`)
      .join("\n");

    return `Hola, solicito cotización para el vehículo ${vehicleInfo}:\n${itemsList || "• Repuestos solicitados"}\n\nAbre el catálogo del proveedor para ver fotos, audios y marcar disponibilidad, precio y tiempo de envío:\n${fullLink}`;
  };

  const enviarWhatsAppProveedor = async (provEspecifico?: any) => {
    await marcarItemsElegidosComoEnviados();
    const rawPhone =
      provEspecifico?.phone ||
      telefonoManualProveedor ||
      proveedoresElegidosObjetos[0]?.phone ||
      proveedorSeleccionado?.phone ||
      "";
    const phoneClean = rawPhone.replace(/[^0-9]/g, "");
    const mensaje = encodeURIComponent(generarMensajeWhatsAppProveedor(provEspecifico));
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
      agregadoEnPropuesta: true,
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
      agregadoEnPropuesta: true,
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

  // Lista completa de propuestas para el carrusel superior (garantizando que la orden actual esté presente y sin duplicados)
  const listaPropuestasCarrusel = useMemo(() => {
    const baseList = !orden
      ? listaPropuestas
      : listaPropuestas.some((item) => item.id === orden.id)
        ? listaPropuestas.map((item) => (item.id === orden.id ? { ...item, ...orden } : item))
        : [orden, ...listaPropuestas];

    const seenIds = new Set<string>();
    return baseList.filter((item) => {
      if (!item?.id) return false;
      const key = String(item.id);
      if (seenIds.has(key)) return false;
      seenIds.add(key);
      if (orden?.id && key === String(orden.id)) return true;
      const st = String(item.status || "").trim().toLowerCase();
      const qs = String(item.quoteStatus || "").trim().toLowerCase();
      const ds = String(item.deliveryStatus || "").trim().toLowerCase();
      if (
        qs === "pagado" ||
        st === "pagado" ||
        st === "facturado" ||
        st === "cobrado" ||
        ds === "pagado" ||
        ds === "facturado" ||
        ds === "cobrado" ||
        ds === "entregado"
      ) {
        return false;
      }
      return true;
    });
  }, [orden, listaPropuestas]);

  // Posicionar el carrusel en la propuesta actual cuando carga
  useEffect(() => {
    if (!orden?.id || !ordenesCarouselRef.current) return;
    const idx = listaPropuestasCarrusel.findIndex((item) => item.id === orden.id);
    if (idx >= 0) {
      ignorarScrollProgramaticoRef.current = true;
      const container = ordenesCarouselRef.current;
      const step = container.clientWidth + 8;
      container.scrollTo({ left: idx * step, behavior: "auto" });
      const timer = setTimeout(() => {
        ignorarScrollProgramaticoRef.current = false;
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [orden?.id, listaPropuestasCarrusel.length]);

  // Doble clic / doble toque -> Abrir Datos de Ingreso (/taller/nueva-orden?editId=...)
  const handleAbrirDatosIngreso = useCallback(
    (auto: any) => {
      const target = auto?.id === orden?.id ? orden : auto;
      if (!target?.id) return;
      try {
        sessionStorage.setItem(
          "taller_orden_editar_cache",
          JSON.stringify({
            editId: target.id,
            order: target,
            savedAt: Date.now(),
          })
        );
      } catch { }
      router.push(`/taller/nueva-orden?editId=${encodeURIComponent(target.id)}`);
    },
    [orden, router]
  );

  // Ir a otra propuesta al deslizar o hacer clic simple (instantáneo, sin pantalla de carga)
  const handleIrAOtraPropuesta = useCallback(
    (targetAuto: any) => {
      if (!targetAuto?.id || targetAuto.id === orden?.id) return;
      try {
        if (typeof window !== "undefined") {
          window.history.replaceState(
            null,
            "",
            `/presupuestos/${encodeURIComponent(targetAuto.id)}`
          );
        }
      } catch { }

      // Aplicar inmediatamente desde caché o desde los datos del carrusel sin pantalla de carga
      const cached = detallesCacheRef.current[targetAuto.id];
      aplicarOrdenEnEstado(cached || targetAuto);

      // Refrescar silenciosamente en segundo plano
      void cargarDetallePorId(targetAuto.id, true);
    },
    [orden?.id, aplicarOrdenEnEstado, cargarDetallePorId]
  );

  const avanzarSiguientePropuesta = useCallback(
    (autoActual: any) => {
      if (listaPropuestasCarrusel.length < 2) return;
      const idx = listaPropuestasCarrusel.findIndex((item) => item.id === autoActual.id);
      const nextIndex = ((idx >= 0 ? idx : 0) + 1) % listaPropuestasCarrusel.length;
      const siguiente = listaPropuestasCarrusel[nextIndex];
      if (!siguiente) return;
      ignorarScrollProgramaticoRef.current = true;
      const container = ordenesCarouselRef.current;
      if (container) {
        container.scrollTo({
          left: nextIndex * (container.clientWidth + 8),
          behavior: "smooth",
        });
      }
      handleIrAOtraPropuesta(siguiente);
      setTimeout(() => {
        ignorarScrollProgramaticoRef.current = false;
      }, 380);
    },
    [listaPropuestasCarrusel, handleIrAOtraPropuesta]
  );

  const retrocederAnteriorPropuesta = useCallback(
    (autoActual: any) => {
      if (listaPropuestasCarrusel.length < 2) return;
      const idx = listaPropuestasCarrusel.findIndex((item) => item.id === autoActual.id);
      const prevIndex =
        ((idx >= 0 ? idx : 0) - 1 + listaPropuestasCarrusel.length) %
        listaPropuestasCarrusel.length;
      const anterior = listaPropuestasCarrusel[prevIndex];
      if (!anterior) return;
      ignorarScrollProgramaticoRef.current = true;
      const container = ordenesCarouselRef.current;
      if (container) {
        container.scrollTo({
          left: prevIndex * (container.clientWidth + 8),
          behavior: "smooth",
        });
      }
      handleIrAOtraPropuesta(anterior);
      setTimeout(() => {
        ignorarScrollProgramaticoRef.current = false;
      }, 380);
    },
    [listaPropuestasCarrusel, handleIrAOtraPropuesta]
  );

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

  const statusLower = String(orden.status || "").trim().toLowerCase();
  const quoteStatusLower = String(orden.quoteStatus || "").trim().toLowerCase();

  const esPagado =
    esPagadoLocal !== null
      ? esPagadoLocal
      : quoteStatusLower === "pagado" ||
      statusLower === "pagado" ||
      statusLower.includes("pagad") ||
      statusLower.includes("factur");
  const esPausado =
    esPausadoLocal !== null
      ? esPausadoLocal
      : statusLower === "pausada" || statusLower.includes("pausa");
  const esAprobado =
    esAprobadoLocal !== null
      ? esAprobadoLocal
      : quoteStatusLower.includes("aprob") ||
      quoteStatusLower.includes("acept") ||
      statusLower.includes("aprob") ||
      statusLower === "en proceso" ||
      statusLower === "reparando" ||
      statusLower === "trabajando" ||
      statusLower.includes("reparac") ||
      statusLower === "en_caja" ||
      (!esPausado && !esPagado && ordenActivaEnTaller);

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
            : "Estado: En espera en Taller"
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

  const handleCambiarEstadoTaller = async (nuevoEstado: "Aprobado" | "Pausada" | "Pendiente") => {
    if (cambiandoEstado) return;
    try {
      setCambiandoEstado(true);
      const res = await fetch("/api/presupuestos/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orden.id, quoteStatus: nuevoEstado }),
      });
      if (res.ok) {
        const nuevoStatusOrden =
          nuevoEstado === "Aprobado"
            ? "Reparación"
            : nuevoEstado === "Pausada"
            ? "Pausada"
            : "Diagnóstico";
        const nuevoQuoteStatusOrden =
          nuevoEstado === "Pausada" ? orden.quoteStatus || "Pendiente" : nuevoEstado;

        if (nuevoEstado === "Aprobado") {
          setEsAprobadoLocal(true);
          setEsPausadoLocal(false);
          setOrdenActivaEnTaller(true);
          try {
            if (orden?.id) localStorage.setItem("taller_orden_activa_id", orden.id);
          } catch { }
          mostrarToast("Propuesta aprobada · Trabajando en Taller");
        } else if (nuevoEstado === "Pausada") {
          setEsPausadoLocal(true);
          setEsAprobadoLocal(false);
          setOrdenActivaEnTaller(false);
          mostrarToast("Orden en Pausa · Pausada en Taller");
        } else {
          setEsAprobadoLocal(false);
          setEsPausadoLocal(false);
          setOrdenActivaEnTaller(false);
          try {
            const activaId = localStorage.getItem("taller_orden_activa_id");
            if (activaId === orden.id || activaId === orden.orderNumber) {
              localStorage.removeItem("taller_orden_activa_id");
            }
          } catch { }
          mostrarToast("Estado: En espera en Taller");
        }

        setOrden((prev) =>
          prev
            ? {
              ...prev,
              status: nuevoStatusOrden,
              quoteStatus: nuevoQuoteStatusOrden,
            }
            : prev
        );
        if (orden.id && detallesCacheRef.current[orden.id]) {
          detallesCacheRef.current[orden.id] = {
            ...detallesCacheRef.current[orden.id],
            status: nuevoStatusOrden,
            quoteStatus: nuevoQuoteStatusOrden,
          };
        }
        setListaPropuestas((prev) =>
          prev.map((item) =>
            item.id === orden.id
              ? { ...item, status: nuevoStatusOrden, quoteStatus: nuevoQuoteStatusOrden }
              : item
          )
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
          setListaPropuestas((prev) => prev.filter((item) => item.id !== orden.id));
          try {
            const activaId = localStorage.getItem("taller_orden_activa_id");
            if (activaId === orden.id || activaId === orden.orderNumber) {
              localStorage.removeItem("taller_orden_activa_id");
            }
          } catch { }
        } else {
          setListaPropuestas((prev) =>
            prev.some((item) => item.id === orden.id)
              ? prev.map((item) => (item.id === orden.id ? { ...item, quoteStatus: nuevoEstado } : item))
              : [{ ...orden, quoteStatus: nuevoEstado }, ...prev]
          );
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

  // Barra moderna idéntica a Taller para añadir servicios y productos con foto, galería, audio, catálogo y rápidos
  const renderBarraAgregarAdicional = (origen: EspecialidadTipo) => (
    <div className="print:hidden p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs space-y-3">
      {subiendoMediaRapido && (
        <div className="flex items-center justify-end">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 animate-pulse">
            Subiendo archivo...
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Descripción
        </label>
        <div className="flex items-stretch gap-2">
          <input
            type="text"
            value={descripcionRapida}
            onChange={(e) => setDescripcionRapida(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAgregarRapidoEnPropuesta(origen);
              }
            }}
            placeholder="Escribe una descripción..."
            className="flex-1 min-w-0 rounded-xl bg-white dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 focus:border-blue-500/50 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={!descripcionRapida.trim() || subiendoMediaRapido}
            onClick={() => void handleAgregarRapidoEnPropuesta(origen)}
            className="px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-200 dark:disabled:bg-white/10 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white text-xs sm:text-sm font-semibold shrink-0 transition-all cursor-pointer disabled:cursor-not-allowed active:scale-95"
          >
            Añadir
          </button>
        </div>
      </div>

      {/* Botones rápidos: Tomar foto, Subir foto, Audio, Catálogo (Carrito) y Servicios Rápidos (Rayo) */}
      <div className="flex flex-wrap items-center gap-2">
        <label
          title="Tomar foto"
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all relative"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
          </svg>
          {fotosBorradorRapido.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
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
          title="Subir foto"
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all relative"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={subiendoMediaRapido}
            onChange={(e) => handleSubirMediaBorrador(e, "foto")}
            className="hidden"
          />
        </label>

        <label
          title="Grabar o adjuntar nota de audio"
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center cursor-pointer active:scale-95 transition-all relative"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
          </svg>
          {audiosBorradorRapido.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
              {audiosBorradorRapido.length}
            </span>
          )}
          <input
            type="file"
            accept="audio/*"
            capture
            disabled={subiendoMediaRapido}
            onChange={(e) => handleSubirMediaBorrador(e, "audio")}
            className="hidden"
          />
        </label>

        <button
          type="button"
          onClick={() => setModalCatalogoTallerAbierto({ abierto: true, origen })}
          title="Productos y Servicios"
          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-all ${modalCatalogoTallerAbierto.abierto
            ? "bg-emerald-600 text-white border-emerald-600"
            : "bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => {
            setBusquedaAccesoRapido("");
            setModalAccesosRapidosAbierto({ abierto: true, origen });
          }}
          title="Servicio rápido"
          className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 transition-all ${modalAccesosRapidosAbierto.abierto
            ? "bg-purple-600 text-white border-purple-600"
            : "bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400"
            }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
        </button>
      </div>

      {/* Vista previa de fotos y audios adjuntos antes de pulsar Añadir */}
      {(fotosBorradorRapido.length > 0 || audiosBorradorRapido.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 animate-fade-in">
          {fotosBorradorRapido.map((url, idx) => (
            <div key={`dfoto-${idx}`} className="relative group">
              <button
                type="button"
                onClick={() =>
                  setFlotanteFotos({
                    pin: { tipo: "Foto adjunta" },
                    fotos: fotosBorradorRapido,
                    fotoActivaIdx: idx,
                  })
                }
                className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/15 cursor-zoom-in block"
              >
                <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => setFotosBorradorRapido((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow cursor-pointer"
                title="Quitar foto"
              >
                ×
              </button>
            </div>
          ))}
          {audiosBorradorRapido.map((url, idx) => (
            <div
              key={`daudio-${idx}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs"
            >
              <span>🎙️ Audio {idx + 1}</span>
              <button
                type="button"
                onClick={() => setAudiosBorradorRapido((prev) => prev.filter((_, i) => i !== idx))}
                className="text-rose-500 font-bold hover:underline cursor-pointer"
                title="Quitar audio"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
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
            className={`h-6 px-2 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${item.deliveryTime
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
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${esServicio
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
                  className={`h-5 px-1.5 rounded-md text-[10px] font-semibold border cursor-pointer transition-all ${item.inStock !== false
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
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer border transition-all ${item.inStock !== false
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
                  className={`h-5 px-1.5 rounded-full text-[10px] font-bold cursor-pointer border transition-all ${dispProv === "SI_HAY"
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
              className={`h-6 px-1.5 rounded-lg border text-[10px] font-semibold flex items-center gap-0.5 transition-all cursor-pointer active:scale-95 ${modoLinea === "DETALLES"
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

        {/* Encabezado muy suave estilo Taller con acento Morado + Azul Zafiro */}
        <section className="border-b border-zinc-200/70 dark:border-white/10 bg-white/60 dark:bg-transparent">
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col items-stretch gap-2.5 sm:gap-3">
            {/* FILA 1: FLECHA VOLVER (←) + ORDEN DE SERVICIO #00001 + ACCIONES */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Link
                href="/presupuestos"
                aria-label="Volver a Propuestas"
                title="Volver a Propuestas"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-purple-700 dark:hover:bg-purple-950/40 dark:hover:text-purple-400"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                  <path d="M20 12H9" />
                </svg>
              </Link>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="min-w-0">
                    <span className="block text-base sm:text-sm font-bold sm:font-semibold leading-tight text-zinc-900 dark:text-white">
                      Orden de Propuesta
                    </span>
                    <span className="block text-sm sm:text-sm font-mono font-bold dark:font-normal leading-tight text-black dark:text-white mt-0.5">
                      #{limpiarNumeroOrden(orden.orderNumber || orden.quoteNumber)}
                    </span>
                  </span>
                </div>
              </div>

              {/* Etiqueta de estado de la propuesta a la derecha (clic directo para cambiar estado en Taller) */}
              <div className="relative shrink-0 ml-auto">
                {esPagado ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-normal bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400">
                    <span>✓ Pagado</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={cambiandoEstado}
                    onClick={() => {
                      const siguienteEstado: "Aprobado" | "Pausada" | "Pendiente" = esPausado
                        ? "Pendiente"
                        : esAprobado
                          ? "Pausada"
                          : "Aprobado";
                      void handleCambiarEstadoTaller(siguienteEstado);
                    }}
                    title="Clic para cambiar estado en Taller (En espera → Trabajando → Pausa)"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-normal transition-all cursor-pointer active:scale-95 ${esPausado
                      ? "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-600 dark:text-amber-400"
                      : esAprobado
                        ? "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-400 dark:text-emerald-300"
                        : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-600 dark:text-amber-400"
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${esPausado
                        ? "bg-amber-500"
                        : esAprobado
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-amber-500"
                        }`}
                    />
                    <span>{esPausado ? "Pausa" : esAprobado ? "Trabajando" : "En espera"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* FILA 2: CARRUSEL MORADO DE PROPUESTAS (CLIC DESLIZA A OTRA PROPUESTA / DOBLE CLIC ABRE DATOS DE INGRESO) */}
            <div className="w-full min-w-0 flex flex-col items-start gap-2">
              <div
                ref={ordenesCarouselRef}
                className="w-full overflow-x-auto snap-x snap-mandatory flex gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:cursor-grab touch-pan-x overscroll-x-contain"
                onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => {
                  if (event.pointerType !== "mouse" || event.button !== 0) return;
                  const container = event.currentTarget;
                  const startX = event.clientX;
                  const startScroll = container.scrollLeft;
                  let moved = false;
                  container.style.scrollSnapType = "none";
                  const onMove = (moveEvent: PointerEvent) => {
                    const delta = moveEvent.clientX - startX;
                    if (Math.abs(delta) > 5) moved = true;
                    container.scrollLeft = startScroll - delta;
                  };
                  const onUp = () => {
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                    const step = container.clientWidth + 8;
                    const index = Math.round(container.scrollLeft / step);
                    container.scrollTo({ left: index * step, behavior: "smooth" });
                    setTimeout(() => {
                      container.style.scrollSnapType = "";
                    }, 400);
                    if (moved) {
                      const block = (clickEvent: Event) => {
                        clickEvent.stopPropagation();
                        clickEvent.preventDefault();
                      };
                      container.addEventListener("click", block, { capture: true, once: true });
                      setTimeout(() => container.removeEventListener("click", block, true), 0);
                    }
                  };
                  window.addEventListener("pointermove", onMove);
                  window.addEventListener("pointerup", onUp);
                }}
                onWheel={(event: React.WheelEvent<HTMLDivElement>) => {
                  if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                    event.currentTarget.scrollBy({
                      left: event.deltaY,
                      behavior: "smooth",
                    });
                  }
                }}
                onScroll={(event: React.UIEvent<HTMLDivElement>) => {
                  if (ignorarScrollProgramaticoRef.current) return;
                  const container = event.currentTarget;
                  if (ordenesCarouselScrollTimeoutRef.current) {
                    clearTimeout(ordenesCarouselScrollTimeoutRef.current);
                  }
                  ordenesCarouselScrollTimeoutRef.current = setTimeout(() => {
                    if (ignorarScrollProgramaticoRef.current) return;
                    const center = container.getBoundingClientRect().left + container.clientWidth / 2;
                    const cards = Array.from(
                      container.querySelectorAll<HTMLButtonElement>("[data-order-carousel-card]")
                    );
                    const visibleCard = cards.reduce<HTMLButtonElement | null>((closest, card) => {
                      if (!closest) return card;
                      const distance = Math.abs(card.getBoundingClientRect().left + card.offsetWidth / 2 - center);
                      const closestDistance = Math.abs(
                        closest.getBoundingClientRect().left + closest.offsetWidth / 2 - center
                      );
                      return distance < closestDistance ? card : closest;
                    }, null);
                    const orderId = visibleCard?.dataset.orderId;
                    const visibleOrder = listaPropuestasCarrusel.find((auto) => auto.id === orderId);
                    if (visibleOrder && visibleOrder.id !== orden.id) {
                      handleIrAOtraPropuesta(visibleOrder);
                    }
                  }, 150);
                }}
              >
                {listaPropuestasCarrusel.map((auto, index) => {
                  const esActivo = auto.id === orden.id;
                  const vehiculoCatalogo = clientesCatalogo
                    .flatMap((cliente) => (Array.isArray(cliente.vehicles) ? cliente.vehicles : []))
                    .find((vehiculo) => vehiculo.id === auto.vehicleId || vehiculo.plate === auto.plate);
                  const vehiculoStr = String(auto.vehicle || orden.vehicle || "Vehículo");
                  const anioEnNombre = vehiculoStr.match(/\b(?:19|20)\d{2}\b/)?.[0] || "";
                  const anioVehiculo = anioEnNombre || vehiculoCatalogo?.year || "";

                  let fotosCard: string[] = [];
                  if (Array.isArray(vehiculoCatalogo?.photos)) {
                    fotosCard = [...vehiculoCatalogo.photos];
                  } else if (typeof vehiculoCatalogo?.photosJson === "string") {
                    try {
                      const parsed = JSON.parse(vehiculoCatalogo.photosJson);
                      if (Array.isArray(parsed)) {
                        fotosCard = parsed.filter((f): f is string => typeof f === "string");
                      }
                    } catch { }
                  }
                  if (vehiculoCatalogo?.imageUrl && !fotosCard.includes(vehiculoCatalogo.imageUrl)) {
                    fotosCard.unshift(vehiculoCatalogo.imageUrl);
                  }
                  if (auto.vehiclePhoto && !fotosCard.includes(auto.vehiclePhoto)) {
                    fotosCard.unshift(auto.vehiclePhoto);
                  }
                  if (esActivo && fotosVehiculo.length > 0) {
                    fotosVehiculo.forEach((f) => {
                      if (!fotosCard.includes(f)) fotosCard.push(f);
                    });
                  }
                  const todasLasFotos = fotosCard.filter(
                    (f): f is string =>
                      typeof f === "string" && /^(data:image\/|https?:\/\/|\/|blob:)/i.test(f.trim())
                  );
                  const fotoVehiculoCard = todasLasFotos[0];
                  const nombreVehiculo =
                    vehiculoStr.replace(/\b(?:19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim() ||
                    vehiculoStr;

                  const clienteCatalogo = clientesCatalogo.find(
                    (c) =>
                      c.id === auto.customerId ||
                      (Array.isArray(c.vehicles) &&
                        c.vehicles.some((v: any) => v.plate === auto.plate || v.id === auto.vehicleId)) ||
                      (c.name && auto.client && c.name.toLowerCase() === String(auto.client).toLowerCase())
                  );
                  const rawClient = auto.client || auto.customer?.name || clienteCatalogo?.name || "";
                  const nombreClienteDisplay =
                    rawClient &&
                      !String(rawClient).toLowerCase().includes("consumidor final") &&
                      !String(rawClient).toLowerCase().includes("cliente mostrador")
                      ? String(rawClient)
                      : "";

                  return (
                    <button
                      key={`${auto.id}-${index}`}
                      data-order-carousel-card
                      data-order-id={auto.id}
                      type="button"
                      title="Clic para deslizar a otra propuesta · Doble clic para ver Datos de Ingreso"
                      onClick={() => {
                        const ahora = Date.now();
                        const diff = ahora - ultimoToqueAutoRef.current.time;
                        if (ultimoToqueAutoRef.current.id === auto.id && diff < 340) {
                          // Doble clic / doble toque -> abrir Datos de Ingreso
                          if (clickSimpleTimerRef.current) {
                            clearTimeout(clickSimpleTimerRef.current);
                            clickSimpleTimerRef.current = null;
                          }
                          ultimoToqueAutoRef.current = { id: "", time: 0 };
                          handleAbrirDatosIngreso(auto);
                          return;
                        }
                        ultimoToqueAutoRef.current = { id: auto.id, time: ahora };
                        if (clickSimpleTimerRef.current) {
                          clearTimeout(clickSimpleTimerRef.current);
                        }
                        clickSimpleTimerRef.current = setTimeout(() => {
                          clickSimpleTimerRef.current = null;
                          avanzarSiguientePropuesta(auto);
                        }, 280);
                      }}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        if (clickSimpleTimerRef.current) {
                          clearTimeout(clickSimpleTimerRef.current);
                          clickSimpleTimerRef.current = null;
                        }
                        ultimoToqueAutoRef.current = { id: "", time: 0 };
                        handleAbrirDatosIngreso(auto);
                      }}
                      aria-pressed={esActivo}
                      className={`snap-start shrink-0 w-full min-h-[76px] sm:min-h-[68px] px-3.5 py-2.5 sm:px-3 sm:py-2 rounded-2xl sm:rounded-xl border text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${esActivo
                        ? "bg-gradient-to-r from-purple-50/80 via-purple-50/60 to-blue-50/70 dark:from-purple-500/10 dark:via-purple-500/[0.08] dark:to-blue-500/10 border-purple-300/70 dark:border-purple-400/25 shadow-sm"
                        : "bg-white dark:bg-[#111113] border-zinc-200 dark:border-white/10"
                        }`}
                    >
                      <span
                        role={fotoVehiculoCard ? "button" : undefined}
                        tabIndex={fotoVehiculoCard ? 0 : undefined}
                        title={fotoVehiculoCard ? "🔍 Clic para ampliar foto del vehículo en grande" : undefined}
                        onClick={(e) => {
                          if (fotoVehiculoCard) {
                            e.stopPropagation();
                            setFotoZoom(fotoVehiculoCard);
                          }
                        }}
                        className={`relative w-16 h-14 sm:w-14 sm:h-12 rounded-xl sm:rounded-lg shrink-0 bg-purple-100/70 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 flex items-center justify-center overflow-hidden border border-purple-200/70 dark:border-purple-400/25 group/thumb ${fotoVehiculoCard
                          ? "cursor-zoom-in hover:ring-2 hover:ring-purple-400/70 hover:scale-[1.04] transition-all"
                          : ""
                          }`}
                      >
                        <svg
                          className="w-8 h-8 sm:w-7 sm:h-7"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m5 11 1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M3.5 11h17v7h-17zM6.5 18v1.5M17.5 18v1.5" />
                        </svg>
                        {fotoVehiculoCard && (
                          <>
                            <img
                              src={fotoVehiculoCard}
                              alt={`Vehículo ${vehiculoStr}`}
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                              className="absolute inset-0 w-full h-full rounded-xl sm:rounded-lg object-cover transition-transform duration-200 group-hover/thumb:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <svg className="w-5 h-5 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                              </svg>
                            </div>
                          </>
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-base sm:text-sm font-bold sm:font-semibold text-zinc-900 dark:text-white truncate">
                          {nombreVehiculo}
                        </span>
                        <span className="mt-1 flex items-center gap-2.5 text-sm sm:text-xs text-zinc-600 dark:text-zinc-300">
                          <span className="font-mono tracking-wider text-purple-600 dark:text-purple-400 truncate text-base sm:text-sm font-black">
                            {auto.plate}
                          </span>
                          {anioVehiculo && (
                            <span className="shrink-0 border-l-2 border-zinc-300 dark:border-white/25 pl-2.5 font-bold text-sm sm:text-xs text-zinc-700 dark:text-zinc-300">
                              {anioVehiculo}
                            </span>
                          )}
                        </span>
                      </span>

                      <div className="shrink-0 text-right max-w-[140px] sm:max-w-[220px] pl-1">
                        {nombreClienteDisplay && (
                          <span
                            className="block text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate"
                            title={nombreClienteDisplay}
                          >
                            {nombreClienteDisplay}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          role="button"
                          tabIndex={0}
                          title={
                            listaPropuestasCarrusel.length > 1
                              ? `Propuesta anterior (${index + 1} de ${listaPropuestasCarrusel.length})`
                              : "Propuesta anterior"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (listaPropuestasCarrusel.length > 1) {
                              retrocederAnteriorPropuesta(auto);
                            }
                          }}
                          className="p-2 sm:p-2 rounded-xl text-zinc-400 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 hover:bg-purple-50/70 dark:hover:bg-purple-500/15 active:scale-90 transition-all duration-200 cursor-pointer shrink-0 group/flecha-izq flex items-center justify-center select-none"
                        >
                          <svg
                            className="w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform duration-200 group-hover/flecha-izq:-translate-x-0.5 group-hover/flecha-izq:scale-110"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                          </svg>
                        </span>

                        <span
                          role="button"
                          tabIndex={0}
                          title={
                            listaPropuestasCarrusel.length > 1
                              ? `Siguiente propuesta (${index + 1} de ${listaPropuestasCarrusel.length})`
                              : "Siguiente propuesta"
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            if (listaPropuestasCarrusel.length > 1) {
                              avanzarSiguientePropuesta(auto);
                            }
                          }}
                          className="p-2 sm:p-2 rounded-xl text-zinc-400 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 hover:bg-purple-50/70 dark:hover:bg-purple-500/15 active:scale-90 transition-all duration-200 cursor-pointer shrink-0 group/flecha-der flex items-center justify-center select-none"
                        >
                          <svg
                            className="w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform duration-200 group-hover/flecha-der:translate-x-0.5 group-hover/flecha-der:scale-110"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.2}
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* DOCUMENTO PRINCIPAL */}
      <main className="w-full max-w-[1920px] mx-auto p-3 sm:p-6 md:p-8 lg:px-8 mt-2 sm:mt-4 print:m-0 print:p-0 print:max-w-none space-y-4">
        {/* SELECTOR 4 EN 1 DE ESPECIALIDADES (AL MARCAR CAMBIA IGUAL QUE EN TALLER: Taller -> Lubricentro -> Car Wash -> Tecnicentro) */}
        <div className="print:hidden flex flex-wrap items-center justify-between w-full gap-2 py-1">
          <div className="flex items-center justify-between gap-2 w-full min-w-0 py-0.5">
            <div className="flex items-center p-1 rounded-2xl bg-white dark:bg-[#0d0d0e] border border-zinc-200 dark:border-white/10 backdrop-blur-md shadow-sm dark:shadow-xl">
              {(() => {
                const MODULOS_PROP = [
                  {
                    id: "TALLER" as EspecialidadTipo,
                    shortName: "Taller",
                    bgClass: "bg-blue-500/10 dark:bg-blue-500/15",
                    borderClass: "border-blue-500/30 dark:border-blue-400/35",
                    textClass: "text-blue-600 dark:text-blue-300",
                    shadowClass: "shadow-sm shadow-blue-500/10",
                    svg: (className = "w-4 h-4") => (
                      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.455.087.935-.012 1.39" />
                      </svg>
                    ),
                  },
                  {
                    id: "LUBRICENTRO" as EspecialidadTipo,
                    shortName: "Lubricentro",
                    bgClass: "bg-amber-500/10 dark:bg-amber-500/15",
                    borderClass: "border-amber-500/30 dark:border-amber-400/35",
                    textClass: "text-amber-600 dark:text-amber-300",
                    shadowClass: "shadow-sm shadow-amber-500/10",
                    svg: (className = "w-4 h-4") => (
                      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                      </svg>
                    ),
                  },
                  {
                    id: "CARWASH" as EspecialidadTipo,
                    shortName: "Car Wash",
                    bgClass: "bg-teal-500/10 dark:bg-teal-500/15",
                    borderClass: "border-teal-500/40 dark:border-teal-400/45",
                    textClass: "text-teal-700 dark:text-teal-300",
                    shadowClass: "shadow-sm shadow-teal-500/10",
                    svg: (className = "w-4 h-4") => (
                      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                      </svg>
                    ),
                  },
                  {
                    id: "TECNICENTRO" as EspecialidadTipo,
                    shortName: "Tecnicentro",
                    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/15",
                    borderClass: "border-emerald-500/30 dark:border-emerald-400/35",
                    textClass: "text-emerald-600 dark:text-emerald-300",
                    shadowClass: "shadow-sm shadow-emerald-500/10",
                    svg: (className = "w-4 h-4") => (
                      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="12" r="3" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 6v6M3 12h6m6 0h6" />
                      </svg>
                    ),
                  },
                ];
                const idxActual = MODULOS_PROP.findIndex((m) => m.id === moduloActivoPropuesta);
                const modActivo = MODULOS_PROP[idxActual >= 0 ? idxActual : 0];
                const modSiguiente =
                  MODULOS_PROP[((idxActual >= 0 ? idxActual : 0) + 1) % MODULOS_PROP.length];

                return (
                  <button
                    key={modActivo.id}
                    type="button"
                    onClick={() => setModuloActivoPropuesta(modSiguiente.id)}
                    className={`h-9 px-3.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${modActivo.bgClass} border ${modActivo.borderClass} ${modActivo.textClass} ${modActivo.shadowClass} backdrop-blur-sm font-bold`}
                    title={`Cambiar a ${modSiguiente.shortName}`}
                  >
                    {modActivo.svg("w-4 h-4 shrink-0")}
                    <span className="whitespace-nowrap">{modActivo.shortName}</span>
                  </button>
                );
              })()}
            </div>

            {/* LADO DERECHO SUPERIOR: ICONO FLOTANTE CON TODOS LOS PEDIDOS QUE VAN A PROVEEDOR */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => router.push(`/presupuestos/${encodeURIComponent(orden.id)}/pedir`)}
                className={`h-9 px-3.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 border backdrop-blur-sm font-semibold relative ${itemsMarcadosProveedor.length > 0
                  ? "bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-200 border-purple-400/50 dark:border-purple-400/40 shadow-sm shadow-purple-500/15"
                  : "bg-purple-500/10 hover:bg-purple-500/15 border-purple-300/60 dark:border-purple-400/25 text-purple-700 dark:text-purple-300"
                  }`}
                title="Abrir página de pedidos marcados para asignar proveedores"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.9}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.5A1.5 1.5 0 0 1 3.75 6H14v10.5H8.5m-4 0H3.75a1.5 1.5 0 0 1-1.5-1.5V7.5ZM14 9h3.88a1.5 1.5 0 0 1 1.248.668l2.122 3.182c.163.245.25.533.25.828V15a1.5 1.5 0 0 1-1.5 1.5h-.5m-4 0H14" />
                  <circle cx="6.5" cy="17.5" r="1.75" />
                  <circle cx="17.5" cy="17.5" r="1.75" />
                </svg>
                <span className="whitespace-nowrap">Pedir</span>
                <span
                  className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center transition-all ${itemsMarcadosProveedor.length > 0
                    ? "bg-purple-500/25 text-purple-800 dark:bg-purple-400/25 dark:text-purple-100"
                    : "bg-purple-500/15 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300"
                    }`}
                >
                  {itemsMarcadosProveedor.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f0f13] border border-zinc-200 dark:border-white/10 rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl space-y-6 print:border-none print:shadow-none print:p-4 print:rounded-none transition-all">
          {/* ===================================================================
              TALLER (BARRA RÁPIDA + SERVICIOS/PRODUCTOS + LIQUIDACIÓN)
              =================================================================== */}
          <div className="space-y-4">
            {/* Barra superior rápida para añadir servicios/productos manuales, catálogo o rápidos en Taller */}
            {renderBarraAgregarAdicional(moduloActivoPropuesta)}

            {/* RESUMEN UNIFICADO IGUAL QUE EN TALLER (SERVICIOS PRIMERO [MANUALES PRIMERO], LUEGO PRODUCTOS) */}
            {(servicios.length > 0 || repuestos.length > 0) && (() => {
              const serviciosOrdenados = [...servicios].sort((a, b) => {
                const aEsManual = Boolean(
                  a.isManual ||
                  String(a.id || "").startsWith("reg-") ||
                  String(a.id || "").startsWith("man-")
                );
                const bEsManual = Boolean(
                  b.isManual ||
                  String(b.id || "").startsWith("reg-") ||
                  String(b.id || "").startsWith("man-")
                );
                if (aEsManual && !bEsManual) return -1;
                if (!aEsManual && bEsManual) return 1;
                return 0;
              });
              const totalCantServicios = serviciosOrdenados.reduce(
                (acc, it) => acc + (Number(it.qty) || 1),
                0
              );
              const totalCantProductos = repuestos.reduce(
                (acc, it) => acc + (Number(it.qty) || 1),
                0
              );

              const getBadgeModuloClase = (mod?: string) => {
                const m = String(mod || "Taller").toLowerCase();
                if (m.includes("lubri")) {
                  return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30";
                }
                if (m.includes("wash") || m.includes("lavad")) {
                  return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30";
                }
                if (m.includes("tecni")) {
                  return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30";
                }
                return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30";
              };

              const getNombreModulo = (orig?: string, cat?: string) => {
                const o = String(orig || "").toUpperCase();
                if (o === "LUBRICENTRO") return "Lubricentro";
                if (o === "CARWASH") return "Car Wash";
                if (o === "TECNICENTRO") return "Tecnicentro";
                const c = String(cat || "").toLowerCase();
                if (c.includes("lubri")) return "Lubricentro";
                if (c.includes("wash") || c.includes("lavad")) return "Car Wash";
                if (c.includes("tecni")) return "Tecnicentro";
                return "Taller";
              };

              return (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs space-y-3.5 animate-fade-in">
                  {/* SERVICIOS (PRIMERO) */}
                  {serviciosOrdenados.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <span>🔧</span>
                        <span>Servicios ({totalCantServicios}):</span>
                      </span>
                      <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-black/20 shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold">
                              <th className="py-2 px-3 w-24 text-center">Cant.</th>
                              <th className="py-2 px-3">Descripción</th>
                              <th className="py-2 px-2.5 w-28 text-center">Detalle</th>
                              <th className="py-2 px-2.5 w-28 text-center">Pedir</th>
                              <th className="py-2 px-2.5 w-28 text-center">PVP</th>
                              <th className="py-2 px-2 w-10 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                            {serviciosOrdenados.map((it, idx) => {
                              const cant = Number(it.qty) || 1;
                              const origenLabel = getNombreModulo(it.origin, it.category);
                              const esManual = Boolean(
                                it.isManual ||
                                String(it.id || "").startsWith("reg-") ||
                                String(it.id || "").startsWith("man-")
                              );
                              const marcadoProv = Boolean(
                                it.enviadoProveedor ||
                                it.purchaseStatus === "PEDIDO_WHATSAPP" ||
                                it.purchaseStatus === "COTIZADO"
                              );
                              return (
                                <tr
                                  key={it.id || it.code || `srv-${idx}`}
                                  className={`transition-colors ${it.agregadoEnPropuesta
                                    ? "bg-amber-500/[0.07] dark:bg-amber-400/[0.06] border-l-2 border-l-amber-500/60 hover:bg-amber-500/[0.12] dark:hover:bg-amber-400/[0.10]"
                                    : "hover:bg-zinc-50/60 dark:hover:bg-white/[0.02]"
                                    }`}
                                >
                                  <td className="py-2 px-3 text-center">
                                    <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-zinc-50 dark:bg-white/[0.04]">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQty(it.id, -1)}
                                        className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                                      >
                                        −
                                      </button>
                                      <span className="w-6 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                        {cant}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQty(it.id, 1)}
                                        className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span>{formatoPrimeraMayuscula(it.name)}</span>
                                      {esManual && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 shrink-0">
                                          Manual
                                        </span>
                                      )}
                                      {Array.isArray(it.fotos) && it.fotos.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleAbrirFlotanteFotos(it)}
                                          className="h-7 px-2 rounded-lg border bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                          title={`Ver ${it.fotos.length} foto(s)`}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                          </svg>
                                          {it.fotos.length > 1 && <span>{it.fotos.length}</span>}
                                        </button>
                                      )}
                                      {Array.isArray(it.audios) && it.audios.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleAbrirFlotanteAudios(it)}
                                          className="h-7 px-2 rounded-lg border bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                          title={`Escuchar ${it.audios.length} audio(s)`}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                          </svg>
                                          {it.audios.length > 1 && <span>{it.audios.length}</span>}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getBadgeModuloClase(
                                        origenLabel
                                      )}`}
                                    >
                                      {origenLabel}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    {esManual ? (
                                      <div className="inline-flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleMarcarProveedor(it, true)}
                                          className={`h-7 px-2 rounded-lg border inline-flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer active:scale-95 transition-all shrink-0 ${marcadoProv
                                            ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/30"
                                            : "bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                                            }`}
                                          title={
                                            marcadoProv
                                              ? "Enviado a pedidos de proveedor (clic para quitar)"
                                              : "Marcar para pedir a proveedor"
                                          }
                                        >
                                          {!marcadoProv ? (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.175V14.25m0 0H2.25m12 0v4.5m0-4.5H16.5" />
                                            </svg>
                                          ) : (
                                            <span className="text-[10px]">✓ Enviado</span>
                                          )}
                                        </button>
                                        {it.supplierAvailability === "SI_HAY" && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-[10px] font-bold shrink-0">
                                            ✓ Sí hay{it.deliveryTime ? ` · ${it.deliveryTime}` : ""}
                                          </span>
                                        )}
                                        {it.supplierAvailability === "NO_HAY" && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-[10px] font-bold shrink-0">
                                            ✕ No hay
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    {esManual ? (
                                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.04] w-24">
                                        <span className="text-[11px] text-zinc-400 font-semibold">$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          placeholder="0.00"
                                          value={it.price || ""}
                                          onChange={(e) => handleUpdateServicePrice(it.id, e.target.value)}
                                          className="w-full bg-transparent text-right text-xs font-bold font-mono text-zinc-800 dark:text-zinc-100 focus:outline-none"
                                        />
                                      </div>
                                    ) : (
                                      <span className="inline-block font-mono text-xs font-bold text-zinc-800 dark:text-zinc-100">
                                        ${Number(it.price || 0).toFixed(2)}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteService(it.id)}
                                      className="w-6 h-6 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-bold cursor-pointer"
                                      title="Eliminar"
                                    >
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* PRODUCTOS (DESPUÉS DE SERVICIOS) */}
                  {repuestos.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <span>📦</span>
                        <span>Productos ({totalCantProductos}):</span>
                      </span>
                      <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-black/20 shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold">
                              <th className="py-2 px-3 w-24 text-center">Cant.</th>
                              <th className="py-2 px-3">Descripción</th>
                              <th className="py-2 px-2.5 w-28 text-center">Detalle</th>
                              <th className="py-2 px-2.5 w-28 text-center">Pedir</th>
                              <th className="py-2 px-2.5 w-28 text-center">PVP</th>
                              <th className="py-2 px-2 w-10 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                            {repuestos.map((it, idx) => {
                              const cant = Number(it.qty) || 1;
                              const origenLabel = getNombreModulo(it.origin, it.category);
                              const esManual = Boolean(
                                it.isManual ||
                                String(it.id || "").startsWith("reg-") ||
                                String(it.id || "").startsWith("man-")
                              );
                              const marcadoProv = Boolean(
                                it.enviadoProveedor ||
                                it.purchaseStatus === "PEDIDO_WHATSAPP" ||
                                it.purchaseStatus === "COTIZADO"
                              );
                              return (
                                <tr
                                  key={it.id || it.code || `prod-${idx}`}
                                  className={`transition-colors ${it.agregadoEnPropuesta
                                    ? "bg-amber-500/[0.07] dark:bg-amber-400/[0.06] border-l-2 border-l-amber-500/60 hover:bg-amber-500/[0.12] dark:hover:bg-amber-400/[0.10]"
                                    : "hover:bg-zinc-50/60 dark:hover:bg-white/[0.02]"
                                    }`}
                                >
                                  <td className="py-2 px-3 text-center">
                                    <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-zinc-50 dark:bg-white/[0.04]">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQty(it.id, -1)}
                                        className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                                      >
                                        −
                                      </button>
                                      <span className="w-6 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                        {cant}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQty(it.id, 1)}
                                        className="w-5 h-5 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span>{formatoPrimeraMayuscula(it.name)}</span>
                                      {esManual && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 shrink-0">
                                          Manual
                                        </span>
                                      )}
                                      {Array.isArray(it.fotos) && it.fotos.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleAbrirFlotanteFotos(it)}
                                          className="h-7 px-2 rounded-lg border bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                          title={`Ver ${it.fotos.length} foto(s)`}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                          </svg>
                                          {it.fotos.length > 1 && <span>{it.fotos.length}</span>}
                                        </button>
                                      )}
                                      {Array.isArray(it.audios) && it.audios.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleAbrirFlotanteAudios(it)}
                                          className="h-7 px-2 rounded-lg border bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                          title={`Escuchar ${it.audios.length} audio(s)`}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                          </svg>
                                          {it.audios.length > 1 && <span>{it.audios.length}</span>}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getBadgeModuloClase(
                                        origenLabel
                                      )}`}
                                    >
                                      {origenLabel}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    {esManual ? (
                                      <div className="inline-flex items-center justify-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleMarcarProveedor(it, false)}
                                          className={`h-7 px-2 rounded-lg border inline-flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer active:scale-95 transition-all shrink-0 ${marcadoProv
                                            ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-sm shadow-blue-500/30"
                                            : "bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                                            }`}
                                          title={
                                            marcadoProv
                                              ? "Enviado a pedidos de proveedor (clic para quitar)"
                                              : "Marcar para pedir a proveedor"
                                          }
                                        >
                                          {!marcadoProv ? (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.175V14.25m0 0H2.25m12 0v4.5m0-4.5H16.5" />
                                            </svg>
                                          ) : (
                                            <span className="text-[10px]">✓ Enviado</span>
                                          )}
                                        </button>
                                        {it.supplierAvailability === "SI_HAY" && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 text-[10px] font-bold shrink-0">
                                            ✓ Sí hay{it.deliveryTime ? ` · ${it.deliveryTime}` : ""}
                                          </span>
                                        )}
                                        {it.supplierAvailability === "NO_HAY" && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 text-[10px] font-bold shrink-0">
                                            ✕ No hay
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    {esManual ? (
                                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.04] w-24">
                                        <span className="text-[11px] text-zinc-400 font-semibold">$</span>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          placeholder="0.00"
                                          value={it.price || ""}
                                          onChange={(e) => handleUpdatePrice(it.id, "price", e.target.value)}
                                          className="w-full bg-transparent text-right text-xs font-bold font-mono text-zinc-800 dark:text-zinc-100 focus:outline-none"
                                        />
                                      </div>
                                    ) : (
                                      <span className="inline-block font-mono text-xs font-bold text-zinc-800 dark:text-zinc-100">
                                        ${Number(it.price || 0).toFixed(2)}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => void handleDeleteItem(it.id)}
                                      className="w-6 h-6 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-bold cursor-pointer"
                                      title="Eliminar"
                                    >
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* SECCIÓN FINAL: LIQUIDACIÓN + GUARDAR + PAGAR / POS */}
            <div className="pt-4 border-t border-zinc-200 dark:border-white/10 space-y-6">
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

              {/* BARRA DE CIERRE FINAL: TÍTULOS DE 1 PALABRA + ICONO */}
              <div className="print:hidden pt-5 border-t border-zinc-200 dark:border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-end gap-4">
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
                    <button
                      type="button"
                      disabled={cambiandoEstado}
                      onClick={() => {
                        const siguienteEstado =
                          esAprobado && !esPausado
                            ? "Pausada"
                            : esPausado
                              ? "Pendiente"
                              : "Aprobado";
                        void handleCambiarEstadoTaller(siguienteEstado);
                      }}
                      className={`h-10 px-4 rounded-xl border text-xs font-normal shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${esAprobado && !esPausado
                        ? "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white"
                        : esPausado
                          ? "bg-amber-500 hover:bg-amber-400 border-amber-500 text-white"
                          : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-700 dark:text-amber-300"
                        }`}
                      title="Clic para cambiar estado (Trabajando → Pausa → En espera)"
                    >
                      <span className={`w-2 h-2 rounded-full ${esAprobado && !esPausado ? "bg-white" : esPausado ? "bg-white" : "bg-amber-500"}`} />
                      <span>{esAprobado && !esPausado ? "Trabajando" : esPausado ? "Pausa" : "En espera"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={cambiandoEstado}
                    onClick={handleTogglePagado}
                    className={`h-10 px-4 rounded-xl border text-xs font-normal shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${esPagado
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

      {/* MODAL FLOTANTE MODERNO Y MINIMALISTA DE PEDIDOS A PROVEEDOR */}
      {modalProveedor.abierto && (
        <div
          onClick={() => setModalProveedor({ abierto: false, modo: "MASIVO" })}
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0d111a] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-scale-up text-zinc-900 dark:text-white max-h-[90vh] flex flex-col"
          >
            {/* Header minimalista estilo Catálogo */}
            <div className="flex items-start justify-between gap-3 shrink-0 pb-3 border-b border-zinc-200/80 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25 shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.9}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.175V14.25m0 0H2.25m12 0v4.5m0-4.5H16.5" />
                  </svg>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400">
                      PEDIDOS A PROVEEDOR • OFICINA
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-400 text-zinc-950 font-extrabold text-[10px] tracking-wide">
                      PLACA: {orden.plate || "S/P"}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white tracking-tight">
                    {orden.vehicle} — Orden #{String(orden.orderNumber || 1).padStart(5, "0")}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalProveedor({ abierto: false, modo: "MASIVO" })}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Cuerpo scrollable */}
            <div className="space-y-5 overflow-y-auto flex-1 pr-1 text-xs">
              {/* PASO 1: ESCOGER PROVEEDOR O PROVEEDORES */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold inline-flex items-center justify-center text-[11px]">
                      1
                    </span>
                    <span>Escoger Proveedor o Proveedores ({proveedoresSeleccionadosIds.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarNuevoProvInline((v) => !v)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {mostrarNuevoProvInline ? "Cancelar" : "+ Nuevo Proveedor"}
                  </button>
                </div>

                {mostrarNuevoProvInline && (
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={nuevoProvNombre}
                      onChange={(e) => setNuevoProvNombre(e.target.value)}
                      placeholder="Nombre (ej. Repuestos Japón Express)"
                      className="flex-1 min-w-[160px] h-8 px-3 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={telefonoManualProveedor}
                      onChange={(e) => setTelefonoManualProveedor(e.target.value)}
                      placeholder="WhatsApp (ej. 0987654321)"
                      className="w-40 h-8 px-3 rounded-xl bg-white dark:bg-black/40 border border-zinc-200 dark:border-white/10 text-xs font-mono focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAgregarProveedorInline}
                      className="h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={busquedaProveedor}
                      onChange={(e) => setBusquedaProveedor(e.target.value)}
                      placeholder="Buscar proveedor por nombre, contacto o categoría..."
                      className="w-full h-9 pl-3 pr-8 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
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
                  <input
                    type="text"
                    value={telefonoManualProveedor}
                    onChange={(e) => setTelefonoManualProveedor(e.target.value)}
                    placeholder="WhatsApp directo..."
                    className="w-40 h-9 px-3 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                    title="Número de WhatsApp del proveedor"
                  />
                </div>

                {/* Tarjetas minimalistas de proveedores (selección múltiple o individual) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-0.5">
                  {proveedoresFiltrados.map((prov) => {
                    const esElegido = proveedoresSeleccionadosIds.includes(prov.id);
                    return (
                      <div
                        key={prov.id}
                        onClick={() => toggleSeleccionProveedor(prov)}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${esElegido
                          ? "bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/50 text-zinc-900 dark:text-white shadow-xs"
                          : "bg-zinc-50/70 dark:bg-white/[0.03] border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20"
                          }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${esElegido
                                ? "bg-emerald-500 text-zinc-950"
                                : "border border-zinc-300 dark:border-white/20 text-transparent"
                                }`}
                            >
                              ✓
                            </span>
                            <span
                              className={`font-bold truncate ${esElegido ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-800 dark:text-zinc-200"
                                }`}
                            >
                              {prov.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 pl-5.5 truncate">
                            {prov.phone ? `WhatsApp: ${prov.phone}` : prov.categories || "Proveedor"}
                          </p>
                        </div>
                        {esElegido && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleAbrirCatalogoProveedor(prov);
                            }}
                            className="h-7 px-2 rounded-lg bg-blue-600/15 hover:bg-blue-600 text-blue-600 dark:text-blue-300 hover:text-white text-[10px] font-bold transition-colors shrink-0 cursor-pointer"
                            title={`Abrir catálogo para ${prov.name}`}
                          >
                            Ver link ↗
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PASO 2: ESCOGER QUÉ SE VA A PEDIR */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600/15 text-blue-600 dark:text-blue-400 font-bold inline-flex items-center justify-center text-[11px]">
                      2
                    </span>
                    <span>
                      Qué se va a pedir ({itemsElegidosParaPedir.length} seleccionado{itemsElegidosParaPedir.length === 1 ? "" : "s"})
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    {itemsMarcadosProveedor.length > 0 &&
                      itemsMarcadosProveedor.length < servicios.length + repuestos.length && (
                        <button
                          type="button"
                          onClick={() => setMostrarTodosEnModalProv((v) => !v)}
                          className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                        >
                          {mostrarTodosEnModalProv
                            ? `Ver solo marcados (${itemsMarcadosProveedor.length})`
                            : `Ver todos (${servicios.length + repuestos.length})`}
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={() => {
                        const todosMarcados =
                          listaItemsEnModalProveedor.length > 0 &&
                          listaItemsEnModalProveedor.every((it) => itemsSeleccionadosModalProv[it.id]);
                        const nuevoMapa = { ...itemsSeleccionadosModalProv };
                        listaItemsEnModalProveedor.forEach((it) => {
                          nuevoMapa[it.id] = !todosMarcados;
                        });
                        setItemsSeleccionadosModalProv(nuevoMapa);
                      }}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {listaItemsEnModalProveedor.length > 0 &&
                        listaItemsEnModalProveedor.every((it) => itemsSeleccionadosModalProv[it.id])
                        ? "Desmarcar todos"
                        : "Marcar todos"}
                    </button>
                  </div>
                </div>

                {listaItemsEnModalProveedor.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-zinc-200 dark:border-white/10 text-center text-zinc-400 text-xs">
                    No hay ítems en la propuesta aún. Agrega un servicio o producto y márcalo con el icono de camión 🚚.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                    {listaItemsEnModalProveedor.map((it: any, idx: number) => {
                      const seleccionado = Boolean(itemsSeleccionadosModalProv[it.id]);
                      const yaEnviado = Boolean(
                        it.enviadoProveedor ||
                        it.purchaseStatus === "PEDIDO_WHATSAPP" ||
                        it.purchaseStatus === "COTIZADO"
                      );
                      const cantFotos = Array.isArray(it.fotos) ? it.fotos.length : 0;
                      const cantAudios = Array.isArray(it.audios) ? it.audios.length : 0;

                      return (
                        <div
                          key={it.id || idx}
                          onClick={() =>
                            setItemsSeleccionadosModalProv((prev) => ({
                              ...prev,
                              [it.id]: !seleccionado,
                            }))
                          }
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${seleccionado
                            ? "bg-blue-500/[0.08] dark:bg-blue-500/[0.12] border-blue-500/40 text-zinc-900 dark:text-white"
                            : "bg-zinc-50/60 dark:bg-white/[0.02] border-zinc-200/70 dark:border-white/10 opacity-75 hover:opacity-100"
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${seleccionado
                                ? "bg-blue-600 text-white"
                                : "border border-zinc-300 dark:border-white/20 text-transparent"
                                }`}
                            >
                              ✓
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-white/10 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                                  #{idx + 1} • Cant: {it.qty || 1}
                                </span>
                                <span className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                                  {formatoPrimeraMayuscula(it.name)}
                                </span>
                                {yaEnviado && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-600/15 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                                    🚚 Marcado
                                  </span>
                                )}
                              </div>
                              {(it.findingText || cantFotos > 0 || cantAudios > 0) && (
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                                  {it.findingText && (
                                    <span className="truncate max-w-xs">
                                      Detalle: {it.findingText}
                                    </span>
                                  )}
                                  {cantFotos > 0 && (
                                    <span className="text-sky-600 dark:text-sky-400 font-semibold">
                                      📷 {cantFotos} Foto{cantFotos > 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {cantAudios > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                      🎙️ {cantAudios} Audio{cantAudios > 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {it.supplierAvailability === "SI_HAY" && (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                                ✓ Sí (${Number(it.cost || it.price || 0).toFixed(2)})
                              </span>
                            )}
                            {it.supplierAvailability === "NO_HAY" && (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                                ✕ No hay
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer minimalista con apertura directa del Catálogo del Proveedor + WhatsApp */}
            <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  const link = construirLinkCatalogoProveedor();
                  await marcarItemsElegidosComoEnviados();
                  copiarAlPortapapeles(link, "Link del catálogo del proveedor copiado.");
                }}
                className="h-9 px-3.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>🔗</span>
                <span>Copiar Link Catálogo</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void enviarWhatsAppProveedor()}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 active:scale-95 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>📲</span>
                  <span>Enviar por WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleAbrirCatalogoProveedor()}
                  className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 active:scale-95 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>🚚</span>
                  <span>Abrir Catálogo del Proveedor ↗</span>
                </button>
              </div>
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
                        className={`w-14 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${flotanteFotos.fotoActivaIdx === idx
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
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${flotanteDetalles.pin.solicitaRepuesto
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
                    className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${flotanteDetalles.pin.solicitaServicio
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
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${nuevoHallazgoSolicitaRepuesto
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
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${nuevoHallazgoSolicitaServicio
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
                    className={`h-9 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${currentItem.inStock
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
                    className={`h-9 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${!currentItem.inStock
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
                    className={`h-8 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${currentItem.supplierAvailability === "SI_HAY"
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
                    className={`h-8 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${currentItem.supplierAvailability === "NO_HAY"
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
                        className={`h-8 px-3 rounded-xl text-xs font-bold border shrink-0 transition-all cursor-pointer ${active
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
                        className={`h-8 px-3 rounded-xl text-xs font-bold border shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${active
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
