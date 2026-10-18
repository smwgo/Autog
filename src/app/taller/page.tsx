"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";

// ============================================================================
// INTERFACES Y TIPOS OPERATIVOS
// ============================================================================
export interface OrderItem {
  id: string;
  type: "SERVICE" | "PART";
  category: string;
  code: string;
  name: string;
  price: number;
  qty: number;
  status: "Pendiente" | "En Proceso" | "Listo";
  productId?: string;
  imageUrl?: string | null;
}

export interface UnifiedOrder {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  vehicleId?: string | null;
  vehicle: string;
  plate: string;
  client: string;
  clientPhone: string;
  clientIdDoc?: string;
  mechanic: string;
  status: string;
  progress: number;
  mileage: number | null;
  nextOilChangeKm: number | null;
  items: OrderItem[];
  receptionPhotos: string[];
  evidencePhotos: string[];
  notes: string;
  dateIn: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMinutes: number;
  totalCost: number;
  posRequestId?: string | null;
  stockDeducted?: boolean;
}

export interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  status: string;
  imageUrl: string | null;
}

export interface ServicePreset {
  code: string;
  name: string;
  price: number;
  isFilterCheck?: boolean;
}

// ============================================================================
// CATÁLOGO RÁPIDO DE LAS 6 TARJETAS (CON DISEÑO VISUAL Y GRADIENTES EXACTOS)
// ============================================================================
const SERVICE_CARDS = [
  {
    id: "lubricacion",
    title: "Lubricación y Filtros",
    color: "bg-blue-500",
    gradient: "from-blue-500 to-indigo-600",
    glowColor: "rgba(59, 130, 246, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
    presets: [
      { code: "LUB-001", name: "Cambio de aceite de motor", price: 15.0 },
      { code: "LUB-002", name: "Cambio de aceite de caja", price: 20.0 },
      { code: "LUB-003", name: "Cambio de aceite de corona / diferencial", price: 18.0 },
      { code: "LUB-004", name: "Engrasado general de chasis", price: 12.0 },
      { code: "LUB-005", name: "Cambio / Relleno de refrigerante", price: 15.0 },
      { code: "FIL-001", name: "Check: Filtro de aceite", price: 8.0, isFilterCheck: true },
      { code: "FIL-002", name: "Check: Filtro de aire", price: 10.0, isFilterCheck: true },
      { code: "FIL-003", name: "Check: Filtro de cabina (A/C)", price: 12.0, isFilterCheck: true },
      { code: "FIL-004", name: "Check: Filtro de combustible", price: 14.0, isFilterCheck: true },
    ] as ServicePreset[],
  },
  {
    id: "alineacion",
    title: "Alineación y Balanceo",
    color: "bg-amber-500",
    gradient: "from-amber-500 to-orange-600",
    glowColor: "rgba(245, 158, 11, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      </svg>
    ),
    presets: [
      { code: "ALI-001", name: "Alineación computarizada (2 ruedas)", price: 20.0 },
      { code: "ALI-002", name: "Alineación computarizada 3D (4 ruedas)", price: 30.0 },
      { code: "BAL-001", name: "Balanceo por llanta", price: 5.0 },
      { code: "BAL-004", name: "Balanceo completo (4 ruedas)", price: 18.0 },
      { code: "ROT-001", name: "Rotación de llantas", price: 10.0 },
      { code: "CAM-001", name: "Corrección de camber / convergencia", price: 25.0 },
    ] as ServicePreset[],
  },
  {
    id: "llantera",
    title: "Llantera e Inflado",
    color: "bg-emerald-500",
    gradient: "from-emerald-400 to-teal-600",
    glowColor: "rgba(16, 185, 129, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
      </svg>
    ),
    presets: [
      { code: "LLA-001", name: "Inflado de llantas (Aire)", price: 3.0 },
      { code: "LLA-002", name: "Inflado de llantas (Nitrógeno)", price: 12.0 },
      { code: "LLA-003", name: "Calibración electrónica de presión", price: 5.0 },
      { code: "LLA-004", name: "Parchado al frío / Vulcanizado", price: 8.0 },
      { code: "LLA-005", name: "Enllantaje / Desenllantaje", price: 10.0 },
      { code: "LLA-006", name: "Cambio de válvulas", price: 6.0 },
    ] as ServicePreset[],
  },
  {
    id: "lavado",
    title: "Lavado de Carro",
    color: "bg-purple-500",
    gradient: "from-purple-500 to-indigo-600",
    glowColor: "rgba(168, 85, 247, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" />
        <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" />
      </svg>
    ),
    presets: [
      { code: "LAV-001", name: "Lavado express exterior", price: 8.0 },
      { code: "LAV-002", name: "Lavado completo (interior + exterior)", price: 15.0 },
      { code: "LAV-003", name: "Lavado de motor y chasis", price: 22.0 },
      { code: "LAV-004", name: "Aspirado profundo", price: 10.0 },
      { code: "LAV-005", name: "Pulverizado / Grafito en chasis", price: 14.0 },
      { code: "LAV-006", name: "Limpieza profunda de tapicería", price: 35.0 },
    ] as ServicePreset[],
  },
  {
    id: "mecanica",
    title: "Mecánica Rápida",
    color: "bg-sky-500",
    gradient: "from-sky-400 to-blue-600",
    glowColor: "rgba(14, 165, 233, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    presets: [
      { code: "MEC-001", name: "Cambio de pastillas / zapatas de freno", price: 25.0 },
      { code: "MEC-002", name: "Purga / Cambio de líquido de frenos", price: 15.0 },
      { code: "MEC-003", name: "Diagnóstico / Cambio de batería", price: 10.0 },
      { code: "MEC-004", name: "Cambio y calibración de bujías", price: 18.0 },
      { code: "MEC-005", name: "Amortiguadores / Suspensión", price: 40.0 },
      { code: "MEC-006", name: "Escáner automotriz OBD2", price: 20.0 },
    ] as ServicePreset[],
  },
  {
    id: "repuestos",
    title: "Repuestos e Insumos",
    color: "bg-pink-500",
    gradient: "from-pink-500 to-rose-600",
    glowColor: "rgba(236, 72, 153, 0.14)",
    icon: (
      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    presets: [] as ServicePreset[],
  },
];

function formatElapsedTime(startedAt: string | null, completedAt: string | null, nowTick: number): string {
  if (!startedAt) return "00:00:00";
  const startMs = new Date(startedAt).getTime();
  const endMs = completedAt ? new Date(completedAt).getTime() : nowTick;
  const totalSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function TallerPanel() {
  const router = useRouter();

  // ==========================================================================
  // ESTADOS PRINCIPALES DE OPERACIÓN
  // ==========================================================================
  const [autosEnPista, setAutosEnPista] = useState<UnifiedOrder[]>([]);
  const [productosInventario, setProductosInventario] = useState<InventoryProduct[]>([]);
  const [mecanicos, setMecanicos] = useState<string[]>([
    "Carlos Rodríguez",
    "Luis Martínez",
    "Ana Torres",
    "Miguel Ángel",
  ]);
  const [cargandoInicial, setCargandoInicial] = useState(true);

  // Bloque 1: Buscador por Placa/Cédula y Vehículo Encontrado / Registro Express
  const [searchQuery, setSearchQuery] = useState("");
  const [buscandoVehiculo, setBuscandoVehiculo] = useState(false);
  const [vehiculoEncontrado, setVehiculoEncontrado] = useState<any | null>(null);
  const [clienteEncontrado, setClienteEncontrado] = useState<any | null>(null);
  const [historialVehiculo, setHistorialVehiculo] = useState<any[]>([]);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [mostrarRegistroExpress, setMostrarRegistroExpress] = useState(false);

  // Inputs de recepción rápida cuando el vehículo ya existe
  const [kmActualInput, setKmActualInput] = useState("");
  const [fotosRecepcion, setFotosRecepcion] = useState<string[]>([]);
  const [subiendoFotoRecepcion, setSubiendoFotoRecepcion] = useState(false);

  // Formulario Registro Express (2 columnas)
  const [regCedula, setRegCedula] = useState("");
  const [regNombres, setRegNombres] = useState("");
  const [regTelefono, setRegTelefono] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPlaca, setRegPlaca] = useState("");
  const [regTipoVehiculo, setRegTipoVehiculo] = useState<"Auto" | "SUV" | "Camioneta" | "Moto">("Auto");
  const [regMarca, setRegMarca] = useState("");
  const [regModelo, setRegModelo] = useState("");
  const [regAnio, setRegAnio] = useState(String(new Date().getFullYear()));
  const [regColor, setRegColor] = useState("");
  const [regKilometraje, setRegKilometraje] = useState("");
  const [guardandoExpress, setGuardandoExpress] = useState(false);

  // Bloque 2: Tarjeta de Servicio Directo Activa (Multiselección)
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [busquedaRepuesto, setBusquedaRepuesto] = useState("");
  const [filtroCatRepuesto, setFiltroCatRepuesto] = useState("TODOS");

  // Bloque 3: Orden Unificada Activa (#OT) + Cronómetro + Evidencia R2 + Envío a POS
  const [ordenActiva, setOrdenActiva] = useState<UnifiedOrder | null>(null);
  const [sincronizandoOrden, setSincronizandoOrden] = useState(false);
  const [iniciandoCronometro, setIniciandoCronometro] = useState(false);
  const [enviandoAPos, setEnviandoAPos] = useState(false);
  const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [toastMensaje, setToastMensaje] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);
  const [modalConfirmPos, setModalConfirmPos] = useState<any | null>(null);

  const fileInputRecepcionRef = useRef<HTMLInputElement | null>(null);
  const fileInputEvidenciaRef = useRef<HTMLInputElement | null>(null);

  const mostrarToast = useCallback((texto: string, tipo: "ok" | "err" = "ok") => {
    setToastMensaje({ tipo, texto });
    setTimeout(() => {
      setToastMensaje((prev) => (prev?.texto === texto ? null : prev));
    }, 4000);
  }, []);

  // ==========================================================================
  // CRONÓMETRO EN VIVO (TICK CADA SEGUNDO)
  // ==========================================================================
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ==========================================================================
  // CARGA INICIAL DE AUTOS EN PISTA, INVENTARIO Y MECÁNICOS DESDE NEON
  // ==========================================================================
  const cargarOperacionInicial = useCallback(async (selectFirstIfNone = true) => {
    try {
      setCargandoInicial(true);
      const res = await fetch("/api/taller/operacion");
      const data = await res.json();
      if (data.success) {
        const pista: UnifiedOrder[] = data.autosEnPista || [];
        setAutosEnPista(pista);
        setProductosInventario(data.productos || []);
        if (Array.isArray(data.mecanicos) && data.mecanicos.length > 0) {
          setMecanicos(data.mecanicos);
        }
        if (selectFirstIfNone && pista.length > 0) {
          setOrdenActiva((prev) => {
            if (!prev) return pista[0];
            const updated = pista.find((o) => o.id === prev.id || o.orderNumber === prev.orderNumber);
            return updated || prev;
          });
        }
      }
    } catch (err) {
      console.error("Error cargando operación de taller:", err);
    } finally {
      setCargandoInicial(false);
    }
  }, []);

  useEffect(() => {
    cargarOperacionInicial(true);
  }, [cargarOperacionInicial]);

  // ==========================================================================
  // BLOQUE 1: BÚSQUEDA POR PLACA O CÉDULA/RUC Y REGISTRO EXPRESS
  // ==========================================================================
  const handleBuscarPlacaOCedula = async (e?: React.FormEvent, forcedQuery?: string) => {
    if (e) e.preventDefault();
    const q = (forcedQuery !== undefined ? forcedQuery : searchQuery).trim();
    if (!q) return;

    try {
      setBuscandoVehiculo(true);
      const res = await fetch(`/api/taller/operacion?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (data.success && data.found) {
        setMostrarRegistroExpress(false);
        setVehiculoEncontrado(data.vehicle);
        setClienteEncontrado(data.customer);
        setHistorialVehiculo(data.history || []);
        setKmActualInput(data.vehicle?.mileage ? String(data.vehicle.mileage) : "");
        setFotosRecepcion(Array.isArray(data.vehicle?.photos) ? data.vehicle.photos.slice(0, 4) : []);

        if (data.activeOrder) {
          setOrdenActiva(data.activeOrder);
          setAutosEnPista((prev) => {
            const exists = prev.some((o) => o.id === data.activeOrder.id);
            return exists
              ? prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
              : [data.activeOrder, ...prev];
          });
          mostrarToast(`Orden activa ${data.activeOrder.orderNumber} cargada para ${data.vehicle?.plate || q}`);
        } else if (data.vehicle) {
          // Abrir o recuperar orden automáticamente para este vehículo
          await handleAbrirOrdenParaVehiculoExistente(
            data.vehicle,
            data.vehicle.mileage,
            data.vehicle.photos || []
          );
        }
      } else {
        // No existe: desplegar formulario Registro Express en la misma pantalla
        setVehiculoEncontrado(null);
        setClienteEncontrado(null);
        setHistorialVehiculo([]);
        setRegPlaca(data.suggestedPlate || q.toUpperCase());
        setRegCedula(data.suggestedIdentification || "");
        setMostrarRegistroExpress(true);
        mostrarToast("Vehículo/Cliente no registrado. Completa el Registro Express en un paso.");
      }
    } catch (err) {
      mostrarToast("Error al consultar en Neon PostgreSQL", "err");
    } finally {
      setBuscandoVehiculo(false);
    }
  };

  const handleAbrirOrdenParaVehiculoExistente = async (
    vehiculoTarget?: any,
    customKm?: string | number,
    customPhotos?: string[]
  ) => {
    const v = vehiculoTarget || vehiculoEncontrado;
    if (!v) return;

    try {
      setSincronizandoOrden(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ABRIR_ORDEN_VEHICULO",
          vehicleId: v.id,
          plate: v.plate,
          mileage: customKm !== undefined ? customKm : kmActualInput,
          receptionPhotos: customPhotos !== undefined ? customPhotos : fotosRecepcion,
          mechanic: ordenActiva?.mechanic || mecanicos[0] || "Carlos Rodríguez",
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) => {
          const exists = prev.some((o) => o.id === data.activeOrder.id);
          return exists
            ? prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
            : [data.activeOrder, ...prev];
        });
        mostrarToast(`Orden ${data.activeOrder.orderNumber} lista para ${v.plate}`);
      }
    } catch (err) {
      mostrarToast("No se pudo abrir la orden para el vehículo", "err");
    } finally {
      setSincronizandoOrden(false);
    }
  };

  const handleGuardarRegistroExpress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regPlaca.trim() || !regNombres.trim() || !regMarca.trim() || !regModelo.trim()) {
      mostrarToast("Placa, Nombres, Marca y Modelo son obligatorios", "err");
      return;
    }

    try {
      setGuardandoExpress(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REGISTRO_EXPRESS",
          identificacion: regCedula,
          nombres: regNombres,
          telefono: regTelefono,
          email: regEmail,
          placa: regPlaca,
          tipoVehiculo: regTipoVehiculo,
          marca: regMarca,
          modelo: regModelo,
          anio: regAnio,
          color: regColor,
          kilometraje: regKilometraje,
          receptionPhotos: fotosRecepcion,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMostrarRegistroExpress(false);
        setVehiculoEncontrado(data.vehicle);
        setClienteEncontrado(data.customer);
        setKmActualInput(String(data.vehicle?.mileage || regKilometraje || ""));
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) => [data.activeOrder, ...prev]);
        mostrarToast(data.message || "Vehículo registrado y Orden abierta en pista");
      } else {
        mostrarToast(data.error || "Error al registrar vehículo", "err");
      }
    } catch (err) {
      mostrarToast("Error de conexión al guardar Registro Express", "err");
    } finally {
      setGuardandoExpress(false);
    }
  };

  // ==========================================================================
  // SUBIDA DE FOTOS A CLOUDFLARE R2 (RECEPCIÓN Y EVIDENCIA DE ORDEN)
  // ==========================================================================
  const subirArchivoACloudflareR2 = async (file: File, folder: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/storage/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success && data.url) {
      return data.url;
    }
    throw new Error(data.error || "Error al subir imagen a Cloudflare R2");
  };

  const handleSubirFotoRecepcion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (fotosRecepcion.length >= 4) {
      mostrarToast("Máximo 4 fotos de recepción permitidas", "err");
      return;
    }

    try {
      setSubiendoFotoRecepcion(true);
      const nuevosUrls: string[] = [];
      const limite = Math.min(files.length, 4 - fotosRecepcion.length);

      for (let i = 0; i < limite; i++) {
        const url = await subirArchivoACloudflareR2(files[i], "taller_recepcion");
        if (url) nuevosUrls.push(url);
      }

      const actualizadas = [...fotosRecepcion, ...nuevosUrls].slice(0, 4);
      setFotosRecepcion(actualizadas);

      if (ordenActiva) {
        await sincronizarOrdenEnNeon({
          receptionPhotos: actualizadas,
          mileage: kmActualInput ? parseInt(kmActualInput, 10) : ordenActiva.mileage,
        });
      }
      mostrarToast("Foto(s) de recepción almacenadas en Cloudflare R2");
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir foto a R2", "err");
    } finally {
      setSubiendoFotoRecepcion(false);
      if (fileInputRecepcionRef.current) fileInputRecepcionRef.current.value = "";
    }
  };

  const handleSubirFotoEvidencia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !ordenActiva) return;

    try {
      setSubiendoEvidencia(true);
      const nuevosUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await subirArchivoACloudflareR2(files[i], "taller_evidencia");
        if (url) nuevosUrls.push(url);
      }

      const nuevasEvidencias = [...(ordenActiva.evidencePhotos || []), ...nuevosUrls];
      await sincronizarOrdenEnNeon({ evidencePhotos: nuevasEvidencias });
      mostrarToast("Evidencia fotográfica vinculada en Cloudflare R2");
    } catch (err: any) {
      mostrarToast(err.message || "Error al subir evidencia a R2", "err");
    } finally {
      setSubiendoEvidencia(false);
      if (fileInputEvidenciaRef.current) fileInputEvidenciaRef.current.value = "";
    }
  };

  // ==========================================================================
  // BLOQUE 2 Y 3: SINCRONIZACIÓN EN TIEMPO REAL DE LA ORDEN UNIFICADA (#OT)
  // ==========================================================================
  const sincronizarOrdenEnNeon = async (partial: {
    items?: OrderItem[];
    mechanic?: string;
    mileage?: number | null;
    nextOilChangeKm?: number | null;
    notes?: string;
    receptionPhotos?: string[];
    evidencePhotos?: string[];
    status?: string;
  }) => {
    if (!ordenActiva) return;

    try {
      setSincronizandoOrden(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ACTUALIZAR_ORDEN",
          orderId: ordenActiva.id,
          items: partial.items ?? ordenActiva.items,
          mechanic: partial.mechanic ?? ordenActiva.mechanic,
          mileage: partial.mileage !== undefined ? partial.mileage : ordenActiva.mileage,
          nextOilChangeKm:
            partial.nextOilChangeKm !== undefined
              ? partial.nextOilChangeKm
              : ordenActiva.nextOilChangeKm,
          notes: partial.notes !== undefined ? partial.notes : ordenActiva.notes,
          receptionPhotos: partial.receptionPhotos ?? ordenActiva.receptionPhotos,
          evidencePhotos: partial.evidencePhotos ?? ordenActiva.evidencePhotos,
          status: partial.status ?? ordenActiva.status,
        }),
      });

      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) => {
          const exists = prev.some((o) => o.id === data.activeOrder.id);
          return exists
            ? prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
            : [data.activeOrder, ...prev];
        });
      }
    } catch (err) {
      console.error("Error al sincronizar orden:", err);
    } finally {
      setSincronizandoOrden(false);
    }
  };

  // Agregar o quitar un servicio rápido de las 5 tarjetas
  const handleToggleServicioPreset = async (cardTitle: string, preset: ServicePreset) => {
    if (!ordenActiva) {
      mostrarToast("Primero selecciona un auto en pista o busca una placa arriba", "err");
      return;
    }

    const existe = ordenActiva.items.find(
      (i) => i.code === preset.code || i.name.toLowerCase() === preset.name.toLowerCase()
    );

    let nuevosItems: OrderItem[];
    if (existe) {
      nuevosItems = ordenActiva.items.filter((i) => i.id !== existe.id);
    } else {
      const nuevo: OrderItem = {
        id: `srv-${preset.code}-${Date.now()}`,
        type: "SERVICE",
        category: cardTitle,
        code: preset.code,
        name: preset.name,
        price: preset.price,
        qty: 1,
        status: "Pendiente",
      };
      nuevosItems = [...ordenActiva.items, nuevo];
    }

    await sincronizarOrdenEnNeon({ items: nuevosItems });
  };

  // Agregar repuesto/insumo desde el inventario de Oficina (Tarjeta 6)
  const handleAgregarRepuestoAOrden = async (prod: InventoryProduct) => {
    if (!ordenActiva) {
      mostrarToast("Selecciona primero un vehículo o auto en pista", "err");
      return;
    }

    if (prod.stock <= 0) {
      mostrarToast(`El repuesto "${prod.name}" está sin stock disponible`, "err");
      return;
    }

    const existente = ordenActiva.items.find((i) => i.productId === prod.id || i.code === prod.code);
    let nuevosItems: OrderItem[];

    if (existente) {
      if (existente.qty + 1 > prod.stock) {
        mostrarToast(`Stock máximo disponible alcanzado (${prod.stock} uds)`, "err");
        return;
      }
      nuevosItems = ordenActiva.items.map((i) =>
        i.id === existente.id ? { ...i, qty: i.qty + 1 } : i
      );
    } else {
      const nuevo: OrderItem = {
        id: `part-${prod.id}-${Date.now()}`,
        type: "PART",
        category: "Repuestos e Insumos",
        code: prod.code,
        name: prod.name,
        price: Number(prod.price) || 0,
        qty: 1,
        status: "Pendiente",
        productId: prod.id,
        imageUrl: prod.imageUrl,
      };
      nuevosItems = [...ordenActiva.items, nuevo];
    }

    await sincronizarOrdenEnNeon({ items: nuevosItems });
    mostrarToast(`${prod.name} agregado a la orden ${ordenActiva.orderNumber}`);
  };

  // Cambiar estado de un ítem con 1 clic: Pendiente -> En Proceso -> Listo
  const handleCiclarEstadoItem = async (itemId: string) => {
    if (!ordenActiva) return;
    const ciclo: Record<"Pendiente" | "En Proceso" | "Listo", "Pendiente" | "En Proceso" | "Listo"> = {
      Pendiente: "En Proceso",
      "En Proceso": "Listo",
      Listo: "Pendiente",
    };

    const nuevosItems = ordenActiva.items.map((it) =>
      it.id === itemId ? { ...it, status: ciclo[it.status] || "En Proceso" } : it
    );

    await sincronizarOrdenEnNeon({ items: nuevosItems });
  };

  const handleCambiarCantidadItem = async (itemId: string, delta: number) => {
    if (!ordenActiva) return;
    const nuevosItems = ordenActiva.items
      .map((it) => (it.id === itemId ? { ...it, qty: Math.max(0, (it.qty || 1) + delta) } : it))
      .filter((it) => it.qty > 0);

    await sincronizarOrdenEnNeon({ items: nuevosItems });
  };

  const handleEliminarItemOrden = async (itemId: string) => {
    if (!ordenActiva) return;
    const nuevosItems = ordenActiva.items.filter((it) => it.id !== itemId);
    await sincronizarOrdenEnNeon({ items: nuevosItems });
  };

  // Iniciar Orden y Cronómetro en Vivo
  const handleIniciarOrden = async () => {
    if (!ordenActiva) return;
    try {
      setIniciandoCronometro(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "INICIAR_ORDEN",
          orderId: ordenActiva.id,
          mechanic: ordenActiva.mechanic,
        }),
      });
      const data = await res.json();
      if (data.success && data.activeOrder) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        mostrarToast(`Cronómetro iniciado para ${data.activeOrder.orderNumber}`);
      }
    } catch (err) {
      mostrarToast("Error al iniciar cronómetro", "err");
    } finally {
      setIniciandoCronometro(false);
    }
  };

  // Enviar Orden Unificada a POS / Caja (Conecta con POS, Oficina, Gerencia y Clientes)
  const handleEnviarAPosCaja = async () => {
    if (!ordenActiva) return;
    if (ordenActiva.items.length === 0) {
      mostrarToast("Agrega al menos un servicio o repuesto a la orden antes de enviar a POS", "err");
      return;
    }

    try {
      setEnviandoAPos(true);
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ENVIAR_A_POS",
          orderId: ordenActiva.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOrdenActiva(data.activeOrder);
        setAutosEnPista((prev) =>
          prev.map((o) => (o.id === data.activeOrder.id ? data.activeOrder : o))
        );
        // Refrescar inventario de Oficina tras descuento de stock
        cargarOperacionInicial(false);

        if (data.posRequest && typeof window !== "undefined") {
          sessionStorage.setItem("pos_despacho_solicitud", JSON.stringify(data.posRequest));
        }

        setModalConfirmPos(data.posRequest || data.activeOrder);
        mostrarToast(`Orden ${ordenActiva.orderNumber} enviada a POS / Caja con éxito`);
      } else {
        mostrarToast(data.error || "No se pudo enviar la orden a POS", "err");
      }
    } catch (err) {
      mostrarToast("Error de red al transferir a POS", "err");
    } finally {
      setEnviandoAPos(false);
    }
  };

  // Filtrado de repuestos para la Tarjeta 6
  const categoriasRepuestos = useMemo(() => {
    const set = new Set<string>();
    productosInventario.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["TODOS", ...Array.from(set)];
  }, [productosInventario]);

  const repuestosFiltrados = useMemo(() => {
    return productosInventario.filter((p) => {
      const matchCat = filtroCatRepuesto === "TODOS" || p.category === filtroCatRepuesto;
      const term = busquedaRepuesto.trim().toLowerCase();
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.brand && p.brand.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  }, [productosInventario, filtroCatRepuesto, busquedaRepuesto]);

  const tarjetaSeleccionadaObj = useMemo(
    () => SERVICE_CARDS.find((c) => c.id === activeCardId) || null,
    [activeCardId]
  );

  // Conteo de ítems seleccionados por cada categoría de tarjeta
  const conteoPorTarjeta = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!ordenActiva) return counts;
    SERVICE_CARDS.forEach((card) => {
      if (card.id === "repuestos") {
        counts[card.id] = ordenActiva.items
          .filter((i) => i.type === "PART")
          .reduce((acc, i) => acc + (i.qty || 1), 0);
      } else {
        counts[card.id] = ordenActiva.items.filter(
          (i) =>
            i.category === card.title ||
            card.presets.some((p) => p.code === i.code || p.name === i.name)
        ).length;
      }
    });
    return counts;
  }, [ordenActiva]);

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white font-sans pb-28 md:pb-12 selection:bg-blue-500/30">
      <Header />

      {/* NOTIFICACIÓN FLOTANTE RÁPIDA */}
      {toastMensaje && (
        <div className="fixed top-20 right-4 z-50 max-w-md animate-fade-in">
          <div
            className={`px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 text-sm font-medium ${
              toastMensaje.tipo === "ok"
                ? "bg-[#111113]/95 border-emerald-500/30 text-emerald-300"
                : "bg-[#111113]/95 border-rose-500/30 text-rose-300"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current shrink-0" />
            <span>{toastMensaje.texto}</span>
          </div>
        </div>
      )}

      <main className="flex-grow p-4 sm:p-6 md:p-8 max-w-[1440px] mx-auto w-full space-y-6">
        {/* ===================================================================
            CABECERA: FLECHA DE REGRESO Y TÍTULO TALLER (ESTILO EXACTO)
            =================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              href="/"
              aria-label="Volver"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#111113] hover:bg-[#161618] border border-white/10 text-zinc-200 transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
                Taller
              </h1>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Centro de Operación en Tiempo Real • Conectado con POS, Oficina, Gerencia y Clientes
              </p>
            </div>
          </div>

          {/* Indicador de Autos en Pista y Accesos Secundarios */}
          <div className="flex items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-2xl bg-[#111113] border border-white/5 flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{autosEnPista.length} Autos en Pista</span>
            </div>
            <Link
              href="/taller/ordenes"
              className="px-3.5 py-2 rounded-2xl bg-[#111113] hover:bg-[#161618] border border-white/5 text-xs font-semibold text-zinc-300 hover:text-white transition-all"
            >
              Tablero OT
            </Link>
          </div>
        </div>

        {/* ===================================================================
            BLOQUE 1 (SUPERIOR): BUSCADOR POR PLACA/CÉDULA Y REGISTRO EXPRESS
            =================================================================== */}
        <section className="bg-[#111113] rounded-2xl border border-white/5 p-4 sm:p-5 shadow-xl relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)" }}
          />

          <form onSubmit={handleBuscarPlacaOCedula} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar vehículo por Placa (ej: ABC-123) o Cédula/RUC del cliente..."
                className="w-full pl-11 pr-10 h-12 rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-blue-500/60 text-white text-sm font-medium placeholder:text-zinc-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setVehiculoEncontrado(null);
                    setClienteEncontrado(null);
                    setMostrarRegistroExpress(false);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                disabled={buscandoVehiculo}
                className="h-12 px-5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-sm font-semibold transition-all active:scale-95 cursor-pointer flex-1 sm:flex-initial"
              >
                {buscandoVehiculo ? "Buscando..." : "Buscar / Recepcionar"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMostrarRegistroExpress((prev) => !prev);
                  if (!regPlaca && searchQuery) setRegPlaca(searchQuery.toUpperCase());
                }}
                className="h-12 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 text-sm font-semibold transition-all active:scale-95 cursor-pointer shrink-0"
              >
                + Registro Express
              </button>
            </div>
          </form>

          {/* SI EL VEHÍCULO YA EXISTE: BARRA COMPACTA DE RECEPCIÓN E INSPECCIÓN R2 */}
          {vehiculoEncontrado && !mostrarRegistroExpress && (
            <div className="mt-4 pt-4 border-t border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
              {/* Datos del Vehículo y Cliente */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 font-mono text-sm font-bold text-blue-300 tracking-wider">
                  {vehiculoEncontrado.plate}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-semibold text-white">
                      {vehiculoEncontrado.brand} {vehiculoEncontrado.model}
                    </span>
                    {vehiculoEncontrado.year && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-zinc-300">
                        {vehiculoEncontrado.year}
                      </span>
                    )}
                    {vehiculoEncontrado.color && (
                      <span className="text-xs text-zinc-400">• {vehiculoEncontrado.color}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-0.5">
                    <span>
                      Cliente: <strong className="text-zinc-200">{clienteEncontrado?.name || "Cliente General"}</strong>
                    </span>
                    {clienteEncontrado?.identification && (
                      <span>ID/RUC: {clienteEncontrado.identification}</span>
                    )}
                    {clienteEncontrado?.phone && (
                      <a
                        href={`https://wa.me/${clienteEncontrado.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline font-medium flex items-center gap-1"
                      >
                        <span>WhatsApp: {clienteEncontrado.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Controles Rápidos: Kilometraje Actual + Fotos Recepción R2 (1 a 4) + Ver Historial */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl px-3 h-10">
                  <span className="text-[11px] text-zinc-400 mr-2">Km actual:</span>
                  <input
                    type="number"
                    value={kmActualInput}
                    onChange={(e) => setKmActualInput(e.target.value)}
                    onBlur={() => {
                      if (ordenActiva && kmActualInput) {
                        const km = parseInt(kmActualInput, 10);
                        if (!isNaN(km)) {
                          sincronizarOrdenEnNeon({
                            mileage: km,
                            nextOilChangeKm: km + 5000,
                          });
                        }
                      }
                    }}
                    placeholder="Ej: 52000"
                    className="w-24 bg-transparent text-white text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* Subir 1 a 4 fotos de recepción a Cloudflare R2 */}
                <input
                  ref={fileInputRecepcionRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleSubirFotoRecepcion}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRecepcionRef.current?.click()}
                  disabled={subiendoFotoRecepcion || fotosRecepcion.length >= 4}
                  className="h-10 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>📷</span>
                  <span>
                    {subiendoFotoRecepcion
                      ? "Subiendo R2..."
                      : `Fotos R2 (${fotosRecepcion.length}/4)`}
                  </span>
                </button>

                {fotosRecepcion.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {fotosRecepcion.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-9 h-9 rounded-lg overflow-hidden border border-white/15 bg-black shrink-0 block"
                        title={`Foto recepción ${idx + 1}`}
                      >
                        <img src={url} alt={`Recepción ${idx + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMostrarModalHistorial(true)}
                  className="h-10 px-3.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Ver Historial ({historialVehiculo.length})
                </button>
              </div>
            </div>
          )}

          {/* SI NO EXISTE: FORMULARIO "REGISTRO EXPRESS" DE UN SOLO PASO CON 2 COLUMNAS */}
          {mostrarRegistroExpress && (
            <form
              onSubmit={handleGuardarRegistroExpress}
              className="mt-4 pt-4 border-t border-white/10 space-y-4 relative z-10 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white">
                    Registro Express (Cliente + Vehículo + Apertura de Orden)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Se sincroniza al instante en Neon DB para Clientes, Oficina, Gerencia y POS
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarRegistroExpress(false)}
                  className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 cursor-pointer"
                >
                  Cerrar ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna 1: Datos Personales */}
                <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-3">
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                    1. Datos Personales del Cliente
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={regCedula}
                      onChange={(e) => setRegCedula(e.target.value)}
                      placeholder="Cédula / RUC *"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                    />
                    <input
                      type="text"
                      required
                      value={regNombres}
                      onChange={(e) => setRegNombres(e.target.value)}
                      placeholder="Nombres Completos *"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                    />
                    <input
                      type="text"
                      value={regTelefono}
                      onChange={(e) => setRegTelefono(e.target.value)}
                      placeholder="Teléfono / WhatsApp"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                    />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Email (Opcional)"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-blue-500/60"
                    />
                  </div>
                </div>

                {/* Columna 2: Datos del Vehículo */}
                <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/5 space-y-3">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    2. Datos del Vehículo
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      required
                      value={regPlaca}
                      onChange={(e) => setRegPlaca(e.target.value.toUpperCase())}
                      placeholder="Placa (ABC-123) *"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white font-mono text-xs font-bold uppercase focus:outline-none focus:border-emerald-500/60"
                    />
                    <select
                      value={regTipoVehiculo}
                      onChange={(e) => setRegTipoVehiculo(e.target.value as any)}
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    >
                      <option value="Auto">Auto</option>
                      <option value="SUV">SUV</option>
                      <option value="Camioneta">Camioneta</option>
                      <option value="Moto">Moto</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={regMarca}
                      onChange={(e) => setRegMarca(e.target.value)}
                      placeholder="Marca (Toyota) *"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                    <input
                      type="text"
                      required
                      value={regModelo}
                      onChange={(e) => setRegModelo(e.target.value)}
                      placeholder="Modelo (Hilux) *"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                    <input
                      type="number"
                      value={regAnio}
                      onChange={(e) => setRegAnio(e.target.value)}
                      placeholder="Año"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                    <input
                      type="text"
                      value={regColor}
                      onChange={(e) => setRegColor(e.target.value)}
                      placeholder="Color"
                      className="h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                    <input
                      type="number"
                      value={regKilometraje}
                      onChange={(e) => setRegKilometraje(e.target.value)}
                      placeholder="Kilometraje actual"
                      className="col-span-2 sm:col-span-3 h-10 px-3 rounded-xl bg-[#111113] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMostrarRegistroExpress(false)}
                  className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoExpress}
                  className="h-10 px-5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                >
                  {guardandoExpress ? "Registrando en Neon..." : "Guardar y Abrir Orden de Trabajo"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ===================================================================
            CUERPO CENTRAL: BLOQUE 2 (6 TARJETAS) + BLOQUE 3 (ORDEN UNIFICADA)
            =================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* -----------------------------------------------------------------
              BLOQUE 2 (CENTRAL - 7 COLUMNAS EN DESKTOP):
              LAS 6 TARJETAS DE SERVICIO DIRECTO CON DISEÑO VISUAL IDÉNTICO
              ----------------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
              {SERVICE_CARDS.map((card) => {
                const isSelected = activeCardId === card.id;
                const countInOrder = conteoPorTarjeta[card.id] || 0;

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setActiveCardId((prev) => (prev === card.id ? null : card.id))}
                    className={`group text-left bg-[#111113] hover:bg-[#161618] rounded-2xl p-5 sm:p-6 min-h-[96px] sm:min-h-[104px] border transition-all duration-300 ease-out hover:-translate-y-1 shadow-lg active:scale-[0.98] overflow-hidden relative flex flex-col justify-center cursor-pointer w-full ${
                      isSelected
                        ? "border-blue-500/60 ring-1 ring-blue-500/30"
                        : "border-white/5 hover:border-white/15"
                    }`}
                  >
                    {/* Resplandor radial suave en la esquina derecha de cada tarjeta */}
                    <div
                      className="absolute top-0 right-0 w-36 h-36 rounded-bl-full -mr-8 -mt-8 transition-all duration-500 ease-out group-hover:scale-125 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at top right, ${card.glowColor}, transparent 70%)`,
                      }}
                    />

                    <div className="flex items-center justify-between gap-3 min-w-0 relative z-10 w-full">
                      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                        {/* Ícono cuadrado redondeado con degradado vibrante exacto */}
                        <div
                          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${card.gradient} shadow-md flex items-center justify-center flex-shrink-0 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3`}
                        >
                          {card.icon}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                            {card.title}
                          </h3>
                          {countInOrder > 0 && (
                            <span className="inline-block mt-0.5 text-[11px] font-medium text-emerald-400">
                              {countInOrder} {countInOrder === 1 ? "ítem en orden" : "ítems en orden"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botón circular/redondeado gris oscuro con el ícono chevron > a la derecha */}
                      <div
                        className={`w-8 h-8 rounded-full bg-zinc-800/80 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-all duration-200 shrink-0 ${
                          isSelected ? "rotate-90 text-white bg-zinc-700" : "group-hover:translate-x-0.5"
                        }`}
                      >
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* PANEL DESPLEGABLE DE LA TARJETA ACTIVA (MULTISELECCIÓN EN LA MISMA ORDEN) */}
            {tarjetaSeleccionadaObj && (
              <div className="bg-[#111113] rounded-2xl border border-white/10 p-5 shadow-2xl space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${tarjetaSeleccionadaObj.gradient} flex items-center justify-center shrink-0`}
                    >
                      {tarjetaSeleccionadaObj.icon}
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white">
                        {tarjetaSeleccionadaObj.title}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {ordenActiva
                          ? `Tocando los ítems se agregan o quitan de la orden ${ordenActiva.orderNumber} (${ordenActiva.plate})`
                          : "Selecciona o registra un vehículo arriba para agregar ítems a su orden"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveCardId(null)}
                    className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* SI ES UNA DE LAS 5 TARJETAS DE SERVICIOS DIRECTOS */}
                {tarjetaSeleccionadaObj.id !== "repuestos" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {tarjetaSeleccionadaObj.presets.map((preset) => {
                      const seleccionado = ordenActiva?.items.some(
                        (i) => i.code === preset.code || i.name.toLowerCase() === preset.name.toLowerCase()
                      );

                      return (
                        <button
                          key={preset.code}
                          type="button"
                          onClick={() =>
                            handleToggleServicioPreset(tarjetaSeleccionadaObj.title, preset)
                          }
                          className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${
                            seleccionado
                              ? "bg-emerald-500/15 border-emerald-500/40 text-white"
                              : "bg-[#161618] hover:bg-zinc-800/80 border-white/5 text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs border shrink-0 ${
                                seleccionado
                                  ? "bg-emerald-500 border-emerald-400 text-black font-bold"
                                  : "border-zinc-600 bg-black/40 text-transparent"
                              }`}
                            >
                              ✓
                            </div>
                            <span className="text-xs sm:text-sm font-medium truncate">
                              {preset.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-400 shrink-0">
                            ${preset.price.toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* SI ES LA TARJETA 6: REPUESTOS E INSUMOS (CONECTADO A INVENTARIO OFICINA + R2) */
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
                          🔍
                        </span>
                        <input
                          type="text"
                          value={busquedaRepuesto}
                          onChange={(e) => setBusquedaRepuesto(e.target.value)}
                          placeholder="Buscar aceite por viscosidad (10W30, 5W30), filtro por código, llanta, foco..."
                          className="w-full pl-9 pr-8 h-10 rounded-xl bg-[#0a0a0a] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500/50"
                        />
                        {busquedaRepuesto && (
                          <button
                            type="button"
                            onClick={() => setBusquedaRepuesto("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <select
                        value={filtroCatRepuesto}
                        onChange={(e) => setFiltroCatRepuesto(e.target.value)}
                        className="h-10 px-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-zinc-200 text-xs focus:outline-none"
                      >
                        {categoriasRepuestos.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat === "TODOS" ? "Todas las categorías" : cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                      {repuestosFiltrados.length === 0 ? (
                        <p className="text-xs text-zinc-500 col-span-2 py-6 text-center">
                          No se encontraron repuestos con ese criterio en el inventario de Oficina.
                        </p>
                      ) : (
                        repuestosFiltrados.map((prod) => {
                          const enOrden = ordenActiva?.items.find((i) => i.productId === prod.id);
                          return (
                            <div
                              key={prod.id}
                              onClick={() => handleAgregarRepuestoAOrden(prod)}
                              className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${
                                enOrden
                                  ? "bg-pink-500/15 border-pink-500/40"
                                  : "bg-[#161618] hover:bg-zinc-800/80 border-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {prod.imageUrl ? (
                                  <img
                                    src={prod.imageUrl}
                                    alt={prod.name}
                                    className="w-10 h-10 rounded-lg object-cover bg-black border border-white/10 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center text-base shrink-0">
                                    🛢️
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">
                                    {prod.name}
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                    <span className="font-mono">{prod.code}</span>
                                    <span>•</span>
                                    <span
                                      className={
                                        prod.stock > prod.minStock
                                          ? "text-emerald-400"
                                          : prod.stock > 0
                                          ? "text-amber-400"
                                          : "text-rose-400"
                                      }
                                    >
                                      Stock: {prod.stock}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-xs font-bold text-emerald-400">
                                  ${Number(prod.price).toFixed(2)}
                                </p>
                                {enOrden && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold">
                                    {enOrden.qty} en OT
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* -----------------------------------------------------------------
              BLOQUE 3 (LATERAL DERECHO - 5 COLUMNAS EN DESKTOP):
              PANEL DE "ORDEN UNIFICADA (#OT)" EN CURSO
              ----------------------------------------------------------------- */}
          <div className="lg:col-span-5 bg-[#111113] rounded-2xl border border-white/5 p-5 shadow-2xl space-y-4 lg:sticky lg:top-6">
            {!ordenActiva ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-xl">
                  🔧
                </div>
                <h3 className="text-base font-semibold text-white">
                  Sin Orden Unificada Seleccionada
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Busca un vehículo por Placa o Cédula arriba, o selecciona uno de los{" "}
                  <strong>Autos en Pista</strong> abajo para gestionar su orden.
                </p>
              </div>
            ) : (
              <>
                {/* Encabezado de la Orden Unificada */}
                <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        #{ordenActiva.orderNumber}
                      </span>
                      <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/5 text-white border border-white/10">
                        {ordenActiva.plate}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          ordenActiva.status === "LISTO_PARA_COBRO"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        {ordenActiva.status}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-white mt-2">
                      {ordenActiva.vehicle}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Cliente: <span className="text-zinc-200">{ordenActiva.client}</span>
                      {ordenActiva.mileage ? ` • ${ordenActiva.mileage.toLocaleString()} km` : ""}
                    </p>
                  </div>

                  {/* Cronómetro en Vivo */}
                  <div className="text-right shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-[#0a0a0a] border border-white/10 font-mono text-sm font-bold text-emerald-400">
                      ⏱ {formatElapsedTime(ordenActiva.startedAt, ordenActiva.completedAt, nowTick)}
                    </div>
                    {!ordenActiva.startedAt ? (
                      <button
                        type="button"
                        onClick={handleIniciarOrden}
                        disabled={iniciandoCronometro}
                        className="mt-1.5 w-full px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                      >
                        {iniciandoCronometro ? "Iniciando..." : "▶ Iniciar Orden"}
                      </button>
                    ) : (
                      <span className="text-[10px] text-zinc-400 block mt-1">
                        Progreso: {ordenActiva.progress}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Selector de Técnico y Próximo Cambio de Aceite */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-2.5">
                    <label className="block text-[10px] text-zinc-400 uppercase">
                      Técnico Asignado
                    </label>
                    <select
                      value={ordenActiva.mechanic}
                      onChange={(e) => sincronizarOrdenEnNeon({ mechanic: e.target.value })}
                      className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none mt-0.5"
                    >
                      {mecanicos.map((m) => (
                        <option key={m} value={m} className="bg-[#111113] text-white">
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-2.5">
                    <label className="block text-[10px] text-zinc-400 uppercase">
                      Próx. Cambio Aceite (Km)
                    </label>
                    <input
                      type="number"
                      value={ordenActiva.nextOilChangeKm || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setOrdenActiva({
                          ...ordenActiva,
                          nextOilChangeKm: isNaN(val) ? null : val,
                        });
                      }}
                      onBlur={() =>
                        sincronizarOrdenEnNeon({ nextOilChangeKm: ordenActiva.nextOilChangeKm })
                      }
                      placeholder="Ej: 57000"
                      className="w-full bg-transparent text-xs font-semibold text-emerald-400 focus:outline-none mt-0.5"
                    />
                  </div>
                </div>

                {/* Barra de Progreso en Tiempo Real */}
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, ordenActiva.progress || 10))}%` }}
                  />
                </div>

                {/* Lista de Servicios y Repuestos de la Orden Unificada */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {ordenActiva.items.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
                      <p className="text-xs text-zinc-400">
                        Toca cualquiera de las <strong>6 tarjetas</strong> a la izquierda para sumar servicios o repuestos a esta orden.
                      </p>
                    </div>
                  ) : (
                    ordenActiva.items.map((item) => {
                      const statusStyle =
                        item.status === "Listo"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : item.status === "En Proceso"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-zinc-800 text-zinc-300 border-white/10";

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-[#161618] border border-white/5 flex items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-mono">
                                {item.type === "PART" ? "REP" : "SRV"}
                              </span>
                              <p className="text-xs font-semibold text-white truncate">
                                {item.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-emerald-400">
                                ${((Number(item.price) || 0) * (item.qty || 1)).toFixed(2)}
                              </span>
                              <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-lg px-1.5 py-0.5 border border-white/5">
                                <button
                                  type="button"
                                  onClick={() => handleCambiarCantidadItem(item.id, -1)}
                                  className="text-xs text-zinc-400 hover:text-white px-1 cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="text-[11px] font-semibold text-white px-1">
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCambiarCantidadItem(item.id, 1)}
                                  className="text-xs text-zinc-400 hover:text-white px-1 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Estado con un clic: Pendiente -> En Proceso -> Listo */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCiclarEstadoItem(item.id)}
                              title="Clic para cambiar estado: Pendiente → En Proceso → Listo"
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer active:scale-95 ${statusStyle}`}
                            >
                              {item.status}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEliminarItemOrden(item.id)}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 flex items-center justify-center text-xs cursor-pointer"
                              title="Quitar ítem"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Evidencia Fotográfica (Cloudflare R2) vinculada a la orden */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">
                      Evidencia Fotográfica R2 ({ordenActiva.evidencePhotos?.length || 0})
                    </span>
                    <input
                      ref={fileInputEvidenciaRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleSubirFotoEvidencia}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputEvidenciaRef.current?.click()}
                      disabled={subiendoEvidencia}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-all cursor-pointer"
                    >
                      {subiendoEvidencia ? "Subiendo a R2..." : "📎 Adjuntar Foto R2"}
                    </button>
                  </div>

                  {ordenActiva.evidencePhotos && ordenActiva.evidencePhotos.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {ordenActiva.evidencePhotos.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-12 h-12 rounded-xl overflow-hidden border border-white/15 bg-black shrink-0 block"
                        >
                          <img src={url} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total Acumulado y Botón [ Enviar a POS / Caja ] */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-zinc-400">
                      Total Orden ({ordenActiva.items.reduce((a, b) => a + (b.qty || 1), 0)} ítems)
                    </span>
                    <span className="text-2xl font-bold text-emerald-400">
                      ${Number(ordenActiva.totalCost || 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnviarAPosCaja}
                    disabled={enviandoAPos || ordenActiva.items.length === 0}
                    className="w-full h-12 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                  >
                    <span>
                      {enviandoAPos
                        ? "Sincronizando POS, Stock y Tiempos..."
                        : "Enviar a POS / Caja"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===================================================================
            FILA INFERIOR: "AUTOS EN PISTA" (TARJETAS HORIZONTALES COMPACTAS)
            =================================================================== */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Autos en Pista (Toca un vehículo para gestionar o sumar servicios)</span>
            </h2>
            {sincronizandoOrden && (
              <span className="text-xs text-blue-400 animate-pulse">
                Sincronizando con Neon DB...
              </span>
            )}
          </div>

          {cargandoInicial ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-24 rounded-2xl bg-[#111113] border border-white/5 animate-pulse p-4"
                />
              ))}
            </div>
          ) : autosEnPista.length === 0 ? (
            <div className="bg-[#111113] rounded-2xl border border-white/5 p-6 text-center text-xs text-zinc-400">
              No hay vehículos en pista en este momento. Busca una placa arriba para iniciar.
            </div>
          ) : (
            <div className="flex gap-3.5 overflow-x-auto pb-2">
              {autosEnPista.map((auto) => {
                const activo = ordenActiva?.id === auto.id;
                return (
                  <button
                    key={auto.id}
                    type="button"
                    onClick={() => {
                      setOrdenActiva(auto);
                      setKmActualInput(auto.mileage ? String(auto.mileage) : "");
                      setFotosRecepcion(auto.receptionPhotos || []);
                    }}
                    className={`min-w-[260px] sm:min-w-[290px] text-left p-4 rounded-2xl transition-all cursor-pointer shrink-0 border ${
                      activo
                        ? "bg-[#161618] border-blue-500/60 ring-1 ring-blue-500/30"
                        : "bg-[#111113] hover:bg-[#161618] border-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 font-mono text-xs font-bold text-blue-300">
                        {auto.plate}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          auto.status === "LISTO_PARA_COBRO"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {auto.status}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-white truncate mt-2">
                      {auto.vehicle}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {auto.client} • {auto.orderNumber}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">
                        {auto.items.length} {auto.items.length === 1 ? "servicio" : "servicios"}
                      </span>
                      <span className="font-bold text-emerald-400">
                        ${Number(auto.totalCost || 0).toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* =====================================================================
          MODAL: HISTORIAL DE ÓRDENES PREVIAS DEL VEHÍCULO
          ===================================================================== */}
      {mostrarModalHistorial && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-white/10 rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  Historial de Mantenimiento • {vehiculoEncontrado?.plate}
                </h3>
                <p className="text-xs text-zinc-400">
                  {vehiculoEncontrado?.brand} {vehiculoEncontrado?.model} ({clienteEncontrado?.name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarModalHistorial(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {historialVehiculo.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-10">
                  No se registran órdenes previas para este vehículo.
                </p>
              ) : (
                historialVehiculo.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 rounded-xl bg-[#161618] border border-white/5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-blue-400">
                        {h.orderNumber || h.serviceCode}
                      </span>
                      <span className="text-xs text-zinc-400">{h.date}</span>
                    </div>
                    <p className="text-xs text-white font-medium">
                      {Array.isArray(h.services) && h.services.length > 0
                        ? h.services.join(", ")
                        : h.notes || "Mantenimiento general"}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/5">
                      <span>
                        Técnico: {h.mechanic} • Km: {h.mileage}
                      </span>
                      <span className="text-emerald-400 font-bold">
                        ${Number(h.cost || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL CONFIRMACIÓN DE ENVÍO A POS / CAJA
          ===================================================================== */}
      {modalConfirmPos && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111113] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-semibold text-white">
              Orden Lista para Cobro en POS
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Los servicios y repuestos fueron transferidos a <strong>POS / Caja</strong>, el stock fue actualizado en <strong>Oficina</strong>, los tiempos en <strong>Gerencia</strong> y el expediente en <strong>Clientes</strong>.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmPos(null)}
                className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-semibold cursor-pointer"
              >
                Seguir en Taller
              </button>
              <button
                type="button"
                onClick={() => router.push("/pos/venta")}
                className="flex-1 h-11 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold cursor-pointer"
              >
                Ir a POS / Cobrar →
              </button>
            </div>
          </div>
        </div>
      )}

      <TallerMobileNav />
    </div>
  );
}
