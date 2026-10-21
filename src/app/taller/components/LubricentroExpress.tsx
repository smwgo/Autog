"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import ModalPresupuestoPdf from "@/components/taller/ModalPresupuestoPdf";

export interface LubricentroExpressProps {
  empleadoLogueado: { id: string; nombre: string };
  mecanicos?: string[];
  clientesCatalogo?: any[];
  productosCatalogo?: any[];
  serviciosCatalogo?: any[];
  mostrarToast: (msg: string, tipo?: "ok" | "err") => void;
  onOrdenCreada?: (orden: any) => void;
  onCambiarATaller?: () => void;
  ordenActiva?: any;
  modoEspecialidad?: "lubricentro" | "carwash" | "tecnicentro";
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
  ordenActiva,
  modoEspecialidad = "lubricentro",
}: LubricentroExpressProps) {
  // =========================================================================
  // STEPPER DE 3 ETAPAS (1. Lubricación, 2. Presupuesto, 3. Firma)
  // =========================================================================
  const [etapaActiva, setEtapaActiva] = useState<number>(2);
  const stepperCarouselRef = useRef<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStepperScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (typeof window !== "undefined" && window.innerWidth >= 640) return;
    const container = e.currentTarget;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const width = container.clientWidth;
      if (width > 0) {
        const pageIndex = Math.round(container.scrollLeft / width);
        const steps = [2, 3, 4];
        const targetStep = steps[pageIndex];
        if (targetStep && targetStep !== etapaActiva) {
          setEtapaActiva(targetStep);
        }
      }
    }, 80);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640 && stepperCarouselRef.current) {
      const container = stepperCarouselRef.current;
      const el = document.getElementById(`lub-stepper-step-${etapaActiva}`);
      if (el) {
        const targetLeft = el.offsetLeft - container.offsetLeft;
        container.scrollTo({ left: targetLeft, behavior: "smooth" });
      }
    }
  }, [etapaActiva]);

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
  // ETAPA 2: ESTACIONES DE LUBRICENTRO (LUBRICANTES, FILTROS, LLANTERA, BATERÍAS, LAVADO)
  // =========================================================================
  const [estacionActiva, setEstacionActiva] = useState<
    "lubricantes" | "filtros" | "llantas" | "baterias" | "lavado"
  >(
    modoEspecialidad === "carwash"
      ? "lavado"
      : modoEspecialidad === "tecnicentro"
      ? "llantas"
      : "lubricantes"
  );

  useEffect(() => {
    if (modoEspecialidad === "carwash") {
      setEstacionActiva("lavado");
    } else if (modoEspecialidad === "tecnicentro") {
      setEstacionActiva("llantas");
    } else {
      setEstacionActiva("lubricantes");
    }
  }, [modoEspecialidad]);
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
  const itemsOrden: any[] = Array.isArray(ordenActiva?.items) ? ordenActiva.items : [];

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
    price: number;
    type: "SERVICE" | "PART";
    qty?: number;
  }) => {
    if (!ordenActiva) {
      mostrarToast("Selecciona o registra primero una orden", "err");
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

    onOrdenCreada?.({ ...ordenActiva, items: nuevosItems });
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
    ctx.strokeStyle = "#38bdf8";
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

  // Conteo por estación para badges
  const conteoPorEstacion = useMemo(() => {
    const countCat = (keyword: string) =>
      itemsOrden.filter((i) => (i.category || "").toLowerCase().includes(keyword)).length;
    return {
      lubricantes: countCat("lubricante"),
      filtros: countCat("filtro"),
      llantas: countCat("llant"),
      baterias: countCat("bater"),
      lavado: countCat("lavad"),
    };
  }, [itemsOrden]);

  return (
    <div className="space-y-5 animate-fade-in text-white">
      {/* ===================================================================
          STEPPER: 3 ETAPAS (1. Lubricación, 2. Presupuesto, 3. Firma)
          =================================================================== */}
      <div className="bg-white/[0.02] backdrop-blur-md border border-white/[0.08] p-1.5 sm:p-2 rounded-2xl space-y-1.5">
        <div
          ref={stepperCarouselRef}
          onScroll={handleStepperScroll}
          className="flex sm:grid sm:grid-cols-3 gap-2 overflow-x-auto sm:overflow-visible snap-x snap-mandatory no-scrollbar scroll-smooth [WebkitOverflowScrolling:touch] touch-pan-x"
        >
          {[
            {
              id: 2,
              label:
                modoEspecialidad === "carwash"
                  ? "1. Car Wash"
                  : modoEspecialidad === "tecnicentro"
                  ? "1. Tecnicentro"
                  : "1. Lubricación",
              icon: (
                <svg className="w-6 h-6 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                </svg>
              ),
            },
            {
              id: 3,
              label: "2. Presupuesto",
              icon: (
                <svg className="w-6 h-6 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              ),
            },
            {
              id: 4,
              label: "3. Firma",
              icon: (
                <svg className="w-6 h-6 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
              ),
            },
          ].map((step) => {
            const active = etapaActiva === step.id;
            return (
              <button
                key={step.id}
                id={`lub-stepper-step-${step.id}`}
                type="button"
                onClick={() => setEtapaActiva(step.id)}
                className={`flex flex-col items-center justify-center p-3.5 sm:p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 w-full min-w-full sm:min-w-0 sm:w-auto snap-center shrink-0 min-h-[74px] sm:min-h-[48px] ${
                  active
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10"
                    : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <div className="p-1.5 sm:p-1 rounded-lg bg-white/5">{step.icon}</div>
                <span className="text-sm sm:text-xs font-semibold tracking-tight mt-1.5 sm:mt-1 truncate max-w-full">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Puntos de paginación solo en móvil */}
        <div className="flex sm:hidden items-center justify-center gap-1.5 pt-1">
          {[2, 3, 4].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setEtapaActiva(id)}
              aria-label={`Ir a paso ${id}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                etapaActiva === id ? "w-5 bg-amber-500" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>



      {/* ===================================================================
          ETAPA 2: LUBRICACIÓN Y SERVICIOS EXPRESS (5 ESTACIONES DE 1 TOQUE)
          =================================================================== */}
      {etapaActiva === 2 && (
        <div className="w-full space-y-4 animate-fade-in">
          {/* Sub-barra de Estaciones de Lubricentro */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "lubricantes", label: "Lubricantes", icon: "🛢️", count: conteoPorEstacion.lubricantes },
              { id: "filtros", label: "Filtros", icon: "⚙️", count: conteoPorEstacion.filtros },
              { id: "llantas", label: "Llantera", icon: "🛞", count: conteoPorEstacion.llantas },
              { id: "baterias", label: "Baterías", icon: "🔋", count: conteoPorEstacion.baterias },
              { id: "lavado", label: "Lavado", icon: "🚿", count: conteoPorEstacion.lavado },
            ].map((est) => {
              const sel = estacionActiva === est.id;
              return (
                <button
                  key={est.id}
                  type="button"
                  onClick={() => setEstacionActiva(est.id as any)}
                  className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    sel
                      ? "bg-amber-500/20 border-amber-500/45 text-amber-300 shadow-sm"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span>{est.icon}</span>
                    <span className="truncate">{est.label}</span>
                  </span>
                  {est.count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/25 text-amber-200 font-mono text-[10px] font-bold">
                      {est.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 1. ESTACIÓN LUBRICANTES Y FLUIDOS */}
          {estacionActiva === "lubricantes" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4">
              {/* Base y Cantidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-xs text-zinc-400">Base del lubricante:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {["Sintético", "Semi-Sintético", "Mineral"].map((base) => {
                      const sel = tipoBase === base;
                      return (
                        <button
                          key={base}
                          type="button"
                          onClick={() => setTipoBase(base)}
                          className={`h-9 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            sel
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                              : "bg-black/30 border-white/10 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {base}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-zinc-400">Cantidad (Galones):</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((cant) => (
                      <button
                        key={cant}
                        type="button"
                        onClick={() => setGalonesAceite(cant)}
                        className={`h-9 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                          galonesAceite === cant
                            ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                            : "bg-black/30 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {cant} Gal
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Viscosidad del Aceite de Motor */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-xs text-zinc-400 block">
                  Viscosidad de Aceite (toca para agregar a la orden):
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { visc: "0W-20", price: 42 },
                    { visc: "5W-30", price: 38 },
                    { visc: "10W-30", price: 28 },
                    { visc: "10W-40", price: 28 },
                    { visc: "15W-40", price: 26 },
                    { visc: "20W-50", price: 22 },
                  ].map(({ visc, price }) => {
                    const code = `ACEITE-${visc}`;
                    const name = `Aceite Motor ${visc} ${tipoBase} (${galonesAceite} Gal)`;
                    const marcado = itemsOrden.some((i) => i.code === code);
                    return (
                      <button
                        key={visc}
                        type="button"
                        onClick={() => {
                          setViscosidad(visc);
                          void handleToggleItemLubricentro({
                            code,
                            name,
                            category: "Lubricantes",
                            price: price * galonesAceite,
                            type: "PART",
                            qty: 1,
                          });
                        }}
                        className={`h-11 rounded-xl border font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          marcado
                            ? "bg-amber-500/25 border-amber-400/60 text-amber-200 ring-1 ring-amber-400/30"
                            : "bg-black/30 border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>{marcado ? "✓" : "+"}</span>
                        <span>{visc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fluidos Adicionales */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-xs text-zinc-400 block">Fluidos adicionales:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { code: "FL-CAJA", name: "Aceite Caja Manual", price: 14 },
                    { code: "FL-ATF", name: "Aceite Transmisión ATF", price: 16 },
                    { code: "FL-DIF", name: "Aceite Diferencial", price: 15 },
                    { code: "FL-COOL", name: "Refrigerante / Coolant", price: 12 },
                    { code: "FL-FREN", name: "Líquido de Frenos", price: 8 },
                    { code: "FL-HID", name: "Fluido Hidráulico", price: 10 },
                  ].map((fl) => {
                    const sel = tieneServicioEnOrden(fl.code, fl.name);
                    return (
                      <button
                        key={fl.code}
                        type="button"
                        onClick={() =>
                          handleToggleItemLubricentro({
                            code: fl.code,
                            name: fl.name,
                            category: "Lubricantes",
                            price: fl.price,
                            type: "PART",
                          })
                        }
                        className={`p-3 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          sel
                            ? "bg-amber-500/15 border-amber-500/45 text-amber-200"
                            : "bg-black/30 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{fl.name}</span>
                        <span>{sel ? "✓" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. ESTACIÓN FILTROS */}
          {estacionActiva === "filtros" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { code: "FIL-ACEITE", name: "Filtro de Aceite", desc: "Cambio con lubricante", icon: "🛢️", price: 8 },
                { code: "FIL-AIRE", name: "Filtro de Aire Motor", desc: "Elemento de admisión", icon: "🌪️", price: 12 },
                { code: "FIL-CABINA", name: "Filtro de Cabina (A/C)", desc: "Antipolen cabina", icon: "❄️", price: 14 },
                { code: "FIL-COMB", name: "Filtro Combustible", desc: "Gasolina / Diésel", icon: "⛽", price: 15 },
              ].map((f) => {
                const sel = tieneServicioEnOrden(f.code, f.name);
                return (
                  <button
                    key={f.code}
                    type="button"
                    onClick={() =>
                      handleToggleItemLubricentro({
                        code: f.code,
                        name: f.name,
                        category: "Filtros",
                        price: f.price,
                        type: "PART",
                      })
                    }
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      sel
                        ? "bg-emerald-500/15 border-emerald-500/45 text-white"
                        : "bg-black/30 border-white/10 text-zinc-300 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{f.icon}</span>
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold ${
                          sel
                            ? "bg-emerald-500/30 border-emerald-400 text-emerald-200"
                            : "border-white/15 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold block">{f.name}</span>
                      <span className="text-[11px] text-zinc-400">{f.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. ESTACIÓN LLANTERA Y PARCHES */}
          {estacionActiva === "llantas" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                <span className="text-[11px] text-zinc-400 uppercase tracking-wider">
                  Selecciona Rueda ({ruedaSeleccionada})
                </span>
                <div className="w-48 flex flex-col gap-4">
                  <div className="flex justify-between">
                    {(["DI", "DD"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRuedaSeleccionada(r)}
                        className={`w-14 h-14 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                          ruedaSeleccionada === r
                            ? "bg-sky-500/25 border-sky-400 text-sky-200"
                            : "bg-white/[0.03] border-white/10 text-zinc-400"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    {(["TI", "TD"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRuedaSeleccionada(r)}
                        className={`w-14 h-14 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                          ruedaSeleccionada === r
                            ? "bg-sky-500/25 border-sky-400 text-sky-200"
                            : "bg-white/[0.03] border-white/10 text-zinc-400"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRuedaSeleccionada("REP")}
                    className={`h-8 rounded-xl border font-mono text-xs font-bold cursor-pointer transition-all ${
                      ruedaSeleccionada === "REP"
                        ? "bg-sky-500/25 border-sky-400 text-sky-200"
                        : "bg-white/[0.03] border-white/10 text-zinc-400"
                    }`}
                  >
                    REP: Repuesto
                  </button>
                </div>
              </div>

              <div className="md:col-span-7 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { code: `PARCHE-${ruedaSeleccionada}`, name: `Parche Llanta (${ruedaSeleccionada})`, price: 5 },
                    { code: `VULC-${ruedaSeleccionada}`, name: `Vulcanizado (${ruedaSeleccionada})`, price: 8 },
                    { code: `MONT-${ruedaSeleccionada}`, name: `Montaje Llanta (${ruedaSeleccionada})`, price: 6 },
                    { code: `BAL-${ruedaSeleccionada}`, name: `Balanceo (${ruedaSeleccionada})`, price: 5 },
                    { code: "ROT-4", name: "Rotación 4 Llantas", price: 10 },
                    { code: "ALIN-COMP", name: "Alineación", price: 20 },
                  ].map((s) => {
                    const sel = tieneServicioEnOrden(s.code, s.name);
                    return (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() =>
                          handleToggleItemLubricentro({
                            code: s.code,
                            name: s.name,
                            category: "Llantera",
                            price: s.price,
                            type: "SERVICE",
                          })
                        }
                        className={`p-3 rounded-xl border text-xs font-medium text-left flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          sel
                            ? "bg-sky-500/20 border-sky-400/50 text-sky-200"
                            : "bg-black/30 border-white/10 text-zinc-400 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{s.name}</span>
                        <span>{sel ? "✓" : "+"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 4. ESTACIÓN BATERÍAS Y CAMBIOS RÁPIDOS */}
          {estacionActiva === "baterias" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔋</span>
                    <div>
                      <span className="text-xs font-semibold text-white block">Cambio de Batería</span>
                      <span className="text-[10px] text-zinc-400">Con foto de serie / garantía</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleItemLubricentro({
                        code: "BAT-CAMBIO",
                        name: "Cambio de Batería",
                        category: "Baterías",
                        price: 10,
                        type: "SERVICE",
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      tieneServicioEnOrden("BAT-CAMBIO", "Cambio de Batería")
                        ? "bg-purple-500/25 border-purple-400/50 text-purple-200"
                        : "bg-white/5 border-white/10 text-zinc-300"
                    }`}
                  >
                    {tieneServicioEnOrden("BAT-CAMBIO", "Cambio de Batería") ? "✓ Marcado" : "+ Marcar"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                  <span className="text-[11px] text-zinc-400">
                    {fotoBateriaR2 ? "✓ Foto de garantía guardada" : "Foto serie / garantía R2"}
                  </span>
                  <input
                    ref={inputFotoBateriaRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSubirFotoBateriaR2}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => inputFotoBateriaRef.current?.click()}
                    disabled={subiendoFotoBateria}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-300 text-xs cursor-pointer"
                  >
                    {subiendoFotoBateria ? "Subiendo..." : "📷 Foto"}
                  </button>
                </div>
              </div>

              {[
                { code: "BAT-DIAG", name: "Diagnóstico Batería & Alternador", icon: "⚡", price: 8, type: "SERVICE" as const },
                { code: "BAT-PLUMAS", name: "Cambio de Plumas Limpiaparabrisas", icon: "🌧️", price: 14, type: "PART" as const },
                { code: "BAT-FOCOS", name: "Cambio de Focos / Bombillos", icon: "💡", price: 6, type: "PART" as const },
              ].map((b) => {
                const sel = tieneServicioEnOrden(b.code, b.name);
                return (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() =>
                      handleToggleItemLubricentro({
                        code: b.code,
                        name: b.name,
                        category: "Baterías",
                        price: b.price,
                        type: b.type,
                      })
                    }
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      sel
                        ? "bg-purple-500/15 border-purple-500/45 text-white"
                        : "bg-black/30 border-white/10 text-zinc-300 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{b.icon}</span>
                      <span className="text-xs font-semibold">{b.name}</span>
                    </div>
                    <span>{sel ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 5. ESTACIÓN LAVADO Y ENGRASE */}
          {estacionActiva === "lavado" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { code: "LAV-EXP", name: "Lavado Express Exterior", desc: "Shampoo y secado rápido", icon: "🚿", price: 6 },
                { code: "LAV-COMP", name: "Lavado Completo (Chasis + Motor)", desc: "Desengrasado integral", icon: "🧽", price: 15 },
                { code: "LAV-ASP", name: "Aspirado & Limpieza Interior", desc: "Asientos, alfombras y tablero", icon: "✨", price: 8 },
                { code: "LAV-ENG", name: "Engrase de Chasis / Pulverizado", desc: "Terminales, crucetas y bajos", icon: "🧴", price: 10 },
              ].map((lav) => {
                const sel = tieneServicioEnOrden(lav.code, lav.name);
                return (
                  <button
                    key={lav.code}
                    type="button"
                    onClick={() =>
                      handleToggleItemLubricentro({
                        code: lav.code,
                        name: lav.name,
                        category: "Lavado",
                        price: lav.price,
                        type: "SERVICE",
                      })
                    }
                    className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      sel
                        ? "bg-teal-500/15 border-teal-500/45 text-white"
                        : "bg-black/30 border-white/10 text-zinc-300 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{lav.icon}</span>
                      <div>
                        <span className="text-xs sm:text-sm font-semibold block">{lav.name}</span>
                        <span className="text-[11px] text-zinc-400">{lav.desc}</span>
                      </div>
                    </div>
                    <span>{sel ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Navegación Etapa 2 */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={() => setEtapaActiva(3)}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          ETAPA 3: PRESUPUESTO (SELECCIÓN LUBRICENTRO + TIENDA + PROPUESTA PDF/STICKER)
          =================================================================== */}
      {etapaActiva === 3 && (
        <div className="w-full space-y-5 animate-fade-in">
          {/* 1. RESUMEN DE SERVICIOS DE LUBRICACIÓN SELECCIONADOS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">🛢️</span>
                <h4 className="text-xs sm:text-sm font-normal text-white uppercase tracking-wider">
                  Lubricación
                </h4>
              </div>
              {kmProximoCambio && (
                <span className="text-xs font-mono text-amber-300">
                  Próximo cambio: <strong>{kmProximoCambio.toLocaleString()} km</strong>
                </span>
              )}
            </div>

            {itemsOrden.length === 0 ? (
              <div className="py-6 text-center space-y-2 bg-black/30 rounded-xl border border-dashed border-white/10 p-4">
                <p className="text-xs text-zinc-400">
                  Sin servicios marcados en Lubricación.
                </p>
                <button
                  type="button"
                  onClick={() => setEtapaActiva(2)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer"
                >
                  ← Ir a Lubricación
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {itemsOrden.map((it) => (
                  <div
                    key={it.id}
                    className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-white block truncate">
                        {it.name}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {(it.category || "Lubricentro").replace(/^Lubricentro\s*[-–]\s*/i, "")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative w-20">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={it.price ?? 0}
                          onChange={(e) =>
                            handleCambiarPrecioItem(it.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-full h-7 pl-5 pr-1.5 rounded-lg bg-black border border-white/10 text-emerald-400 font-mono text-xs text-right focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEliminarItemOrden(it.id)}
                        className="text-zinc-500 hover:text-rose-400 text-xs cursor-pointer px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. TIENDA (IDÉNTICO A TALLER) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3.5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2.5">
              <span className="text-base">🏪</span>
              <h4 className="text-xs sm:text-sm font-normal text-white uppercase tracking-wider">
                Tienda
              </h4>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFiltroTipoTienda("ALL")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filtroTipoTienda === "ALL"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-white/5 text-zinc-400 hover:text-white border border-transparent"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoTienda("SERVICE")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    filtroTipoTienda === "SERVICE"
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                      : "bg-white/5 text-zinc-400 hover:text-white border border-transparent"
                  }`}
                >
                  <span>🛠️</span>
                  <span>Servicios</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoTienda("PART")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    filtroTipoTienda === "PART"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-white/5 text-zinc-400 hover:text-white border border-transparent"
                  }`}
                >
                  <span>📦</span>
                  <span>Aceites / Filtros</span>
                </button>
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-zinc-400 text-sm pointer-events-none">🔍</span>
                  <input
                    type="text"
                    value={busquedaTienda}
                    onChange={(e) => {
                      setBusquedaTienda(e.target.value);
                      setDropdownTiendaAbierto(true);
                    }}
                    onFocus={() => setDropdownTiendaAbierto(true)}
                    placeholder="Buscar aceite, filtro o servicio..."
                    className="w-full h-10 pl-9 pr-8 rounded-xl bg-black/60 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
                  />
                  {busquedaTienda && (
                    <button
                      type="button"
                      onClick={() => {
                        setBusquedaTienda("");
                        setDropdownTiendaAbierto(false);
                      }}
                      className="absolute right-3 text-zinc-400 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {dropdownTiendaAbierto && busquedaTienda.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto rounded-xl bg-[#0c0d12] border border-amber-500/30 shadow-2xl z-50 divide-y divide-white/5">
                    {(() => {
                      const q = busquedaTienda.toLowerCase().trim();
                      const filtrados = catalogoTiendaCombinado.filter((item) => {
                        if (filtroTipoTienda === "SERVICE" && item.type !== "SERVICE") return false;
                        if (filtroTipoTienda === "PART" && item.type !== "PART") return false;
                        return (
                          item.name.toLowerCase().includes(q) ||
                          (item.category && item.category.toLowerCase().includes(q)) ||
                          (item.code && item.code.toLowerCase().includes(q))
                        );
                      });

                      if (filtrados.length === 0) {
                        return (
                          <div className="p-4 text-center text-xs text-zinc-500 italic">
                            Sin coincidencias para &quot;{busquedaTienda}&quot;.
                          </div>
                        );
                      }

                      return filtrados.slice(0, 15).map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            void handleAgregarDesdeTienda(item);
                            setDropdownTiendaAbierto(false);
                          }}
                          className="p-2.5 hover:bg-amber-500/15 cursor-pointer flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-sm">{item.type === "PART" ? "🛢️" : "🛠️"}</span>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-white truncate block">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 block truncate">
                                {item.category}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-xs text-emerald-400">
                              ${Number(item.price).toFixed(2)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                              + Sumar
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. PROPUESTA Y TOTALES (IDÉNTICO A TALLER + BOTÓN STICKER QR) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
              <span className="text-base">💼</span>
              <h4 className="text-xs sm:text-sm font-normal text-white uppercase tracking-wider">
                Propuesta
              </h4>
            </div>

            {itemsOrden.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 italic bg-black/20 rounded-xl border border-dashed border-white/5">
                Sin servicios ni lubricantes añadidos.
              </div>
            ) : (
              <div className="divide-y divide-white/5 bg-black/25 p-3.5 rounded-xl border border-white/5">
                {itemsOrden.map((it) => (
                  <div key={it.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-normal text-white text-sm block truncate">
                        {it.name}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {(it.category || "Lubricentro").replace(/^Lubricentro\s*[-–]\s*/i, "")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-mono text-emerald-400 font-bold text-sm">
                        ${(Number(it.price) || 0).toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCiclarEstadoItem(it.id)}
                        className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300 cursor-pointer"
                      >
                        {it.status || "Listo"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminarItemOrden(it.id)}
                        className="text-zinc-500 hover:text-rose-400 text-xs cursor-pointer p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {itemsOrden.length > 0 && (
              <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalPresupuestoPdfAbierto(true)}
                    className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                  >
                    <span>🖨️</span>
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMostrarModalStickerQr(true)}
                    className="h-9 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🏷️</span>
                    <span>Sticker QR</span>
                  </button>
                </div>

                <div className="w-full sm:w-64 bg-black/50 p-3.5 rounded-xl border border-white/10 space-y-1.5 font-mono">
                  <div className="flex justify-between text-zinc-300 text-xs">
                    <span>Subtotal:</span>
                    <span>${calculosPresupuesto.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300 text-xs">
                    <span>IVA ({calculosPresupuesto.taxRateNum}%):</span>
                    <span>${calculosPresupuesto.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-1.5 flex justify-between text-sm font-normal text-white">
                    <span>TOTAL:</span>
                    <span className="text-emerald-400">${calculosPresupuesto.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setEtapaActiva(2)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-normal text-zinc-300 cursor-pointer"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setEtapaActiva(4)}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-normal cursor-pointer"
            >
              Continuar
            </button>
          </div>

          <ModalPresupuestoPdf
            abierto={modalPresupuestoPdfAbierto}
            onCerrar={() => setModalPresupuestoPdfAbierto(false)}
            orden={ordenActiva}
          />
        </div>
      )}

      {/* ===================================================================
          ETAPA 4: AVISO Y FIRMA + PASAR A POS (IDÉNTICO A TALLER)
          =================================================================== */}
      {etapaActiva === 4 && (
        <div className="w-full space-y-4 animate-fade-in">
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-4 shadow-xl">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📲</span>
                <h4 className="text-xs sm:text-sm font-normal text-white uppercase tracking-wider">
                  Aviso y Firma
                </h4>
              </div>
              {ordenActiva && (
                <span className="font-mono text-xs text-zinc-400">
                  {ordenActiva.plate ? `Placa: ${ordenActiva.plate} • ` : ""}Orden #
                  {String(ordenActiva.orderNumber || ordenActiva.id).replace(/^(?:OT|LUB)-\d{4}-/i, "")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Columna Izquierda: Estado y Aviso */}
              <div className="lg:col-span-5 space-y-3">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-xs font-normal text-zinc-300 block">Estado:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ESTADOS_LUBRICENTRO.map((st, idx) => {
                      const sel =
                        estadoSeleccionado.toLowerCase() === st.name.toLowerCase() ||
                        estadoSeleccionado
                          .toLowerCase()
                          .includes(st.name.toLowerCase().replace(/^\d+\s*/, ""));

                      const coloresActivoPorIndice = [
                        "bg-amber-500/25 text-amber-200 border-amber-400/60 ring-1 ring-amber-400/40 font-semibold shadow-sm",
                        "bg-blue-500/25 text-blue-200 border-blue-400/60 ring-1 ring-blue-400/40 font-semibold shadow-sm",
                        "bg-rose-500/25 text-rose-200 border-rose-400/60 ring-1 ring-rose-400/40 font-semibold shadow-sm",
                        "bg-emerald-500/25 text-emerald-200 border-emerald-400/60 ring-1 ring-emerald-400/40 font-semibold shadow-sm",
                        "bg-purple-500/25 text-purple-200 border-purple-400/60 ring-1 ring-purple-400/40 font-semibold shadow-sm",
                      ];
                      const estiloActivo = coloresActivoPorIndice[idx % coloresActivoPorIndice.length];
                      const estiloPlomo =
                        "bg-white/[0.03] hover:bg-white/[0.07] text-zinc-400 hover:text-zinc-200 border-white/10";

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

                {/* Aviso WhatsApp + Sticker QR */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
                  <span className="text-xs font-normal text-zinc-300 block">Aviso:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleEnviarWhatsAppLubricentro}
                      className="h-9 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>💬</span>
                      <span>WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarModalStickerQr(true)}
                      className="h-9 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>🏷️</span>
                      <span>Sticker QR</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Doble Firma (Presupuesto / Entrega) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setModoFirma("ACEPTACION");
                          limpiarCanvasFirma();
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-normal transition-all cursor-pointer ${
                          modoFirma === "ACEPTACION"
                            ? "bg-blue-600 text-white"
                            : "text-zinc-400 hover:text-white"
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
                            ? "bg-teal-600 text-white"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Entrega
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={limpiarCanvasFirma}
                      className="text-[11px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5 cursor-pointer"
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
                        <div className="h-40 rounded-xl bg-[#0a0a0c] border border-white/10 relative overflow-hidden flex items-center justify-center">
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
                                <div className="absolute pointer-events-none text-zinc-500 text-xs font-mono text-center px-3">
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
                            className="h-9 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <span>💾 {guardandoFirma ? "Guardando..." : "Guardar"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSolicitarFirmaRemotaPanelCliente}
                            disabled={guardandoFirma}
                            className={`h-9 px-3 rounded-xl border text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 ${
                              firmaRemotaEnviada || firmaSolicitadaPanel
                                ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                                : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300"
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

            {/* Pie: Pasar a POS */}
            <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-zinc-400 font-normal">
                <span>Cobro en POS.</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setEtapaActiva(3)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-normal text-zinc-300 cursor-pointer"
                >
                  Anterior
                </button>

                <button
                  type="button"
                  onClick={() => handlePasarAPosLubricentro(false)}
                  disabled={guardandoPasarPos}
                  className="px-4 py-2 rounded-xl text-xs font-normal bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <span>
                    {guardandoPasarPos
                      ? "Procesando..."
                      : ordenActiva &&
                        (ordenActiva.posRequestId ||
                          ordenActiva.status === "EN_CAJA" ||
                          ordenActiva.status?.toLowerCase().includes("caja"))
                      ? "✓ Pasada a POS"
                      : "🚀 Pasar a POS"}
                  </span>
                </button>
              </div>
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
