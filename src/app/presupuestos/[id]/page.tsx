"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

// ============================================================================
// INTERFACES
// ============================================================================

export type EspecialidadTipo = "TALLER" | "LUBRICENTRO" | "CARWASH" | "TECNICENTRO";

interface ItemPropuesta {
  id: string;
  productId?: string | null;
  code?: string;
  name: string;
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
  inStock?: boolean; // true = sí hay en bodega taller, false = pedir a proveedor externo
  origin?: EspecialidadTipo;
  imageUrl?: string | null;
}

interface ServicioPropuesta {
  id: string;
  code?: string;
  name: string;
  category?: string;
  price: number;
  estimatedMinutes?: number;
  mechanic?: string;
  origin?: EspecialidadTipo;
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
  const [fotoZoom, setFotoZoom] = useState<string | null>(null);
  const [esAprobadoLocal, setEsAprobadoLocal] = useState<boolean | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoFotoCliente, setSubiendoFotoCliente] = useState(false);
  const [subiendoFotoVehiculoPrincipal, setSubiendoFotoVehiculoPrincipal] = useState(false);

  // Formulario rápido para nuevo repuesto
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCosto, setNuevoCosto] = useState("0");
  const [nuevoPvp, setNuevoPvp] = useState("0");
  const [nuevaCantidad, setNuevaCantidad] = useState("1");
  const [nuevoOrigen, setNuevoOrigen] = useState<EspecialidadTipo>("TALLER");
  const [nuevoProveedor, setNuevoProveedor] = useState("Proveedor General");
  const [nuevoEnStock, setNuevoEnStock] = useState(false);

  // Formulario rápido para nuevo servicio
  const [nuevoServicioNombre, setNuevoServicioNombre] = useState("");
  const [nuevoServicioPrecio, setNuevoServicioPrecio] = useState("0");
  const [nuevoServicioOrigen, setNuevoServicioOrigen] = useState<EspecialidadTipo>("TALLER");

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
    } catch {}

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
          } catch {}
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
          setOrden(ord);
          setProveedores(data.proveedores || []);
          setNotasFactura(ord.notes || "");
          setPorcentajeIva(Number(ord.quoteTaxRate ?? 15));
          setPorcentajeDescuento(Number(ord.quoteDiscount ?? 0));

          // Inicializar repuestos con origen deducido y flag de inStock
          const itemsInit = (ord.items || []).map((it: any) => ({
            ...it,
            origin: it.origin || deducirEspecialidad(it.name, it.category),
            inStock: it.inStock !== undefined ? Boolean(it.inStock) : Boolean(it.purchaseStatus === "STOCK_LOCAL"),
          }));
          setRepuestos(itemsInit);

          // Inicializar servicios
          const srvInit = (ord.services || []).map((sv: any) => ({
            ...sv,
            origin: sv.origin || deducirEspecialidad(sv.name, sv.category),
          }));
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

  // Modificar cantidad
  const handleUpdateQty = (itemId: string, delta: number) => {
    setRepuestos((prev) =>
      prev.map((it) => {
        if (it.id === itemId) {
          const newQty = Math.max(1, (it.qty || 1) + delta);
          const subtotalVenta = Number((it.price * newQty).toFixed(2));
          const subtotalCosto = Number((it.costPrice * newQty).toFixed(2));
          const margin = Number(((it.price - it.costPrice) * newQty).toFixed(2));
          return { ...it, qty: newQty, subtotalVenta, subtotalCosto, margin };
        }
        return it;
      })
    );
  };

  // Modificar precios en línea
  const handleUpdatePrice = (itemId: string, field: "costPrice" | "price", valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setRepuestos((prev) =>
      prev.map((it) => {
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
      })
    );
  };

  // Modificar Casillero: Sí hay en Bodega (Taller) vs Pedir a Proveedor Externo
  const handleToggleStock = (itemId: string) => {
    setRepuestos((prev) =>
      prev.map((it) => {
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
      })
    );
  };

  // Modificar proveedor asignado
  const handleUpdateSupplier = (itemId: string, supplierName: string) => {
    setRepuestos((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, supplierName } : it))
    );
  };

  // Eliminar repuesto
  const handleDeleteItem = (itemId: string) => {
    setRepuestos((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Eliminar servicio
  const handleDeleteService = (srvId: string) => {
    setServicios((prev) => prev.filter((sv) => sv.id !== srvId));
  };

  // Modificar precio de servicio en línea
  const handleUpdateServicePrice = (srvId: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setServicios((prev) =>
      prev.map((sv) => (sv.id === srvId ? { ...sv, price: val } : sv))
    );
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

    // Solo se pagan a proveedores los repuestos que NO están en bodega
    const itemsPorComprar = repuestos.filter((r) => !r.inStock);
    const itemsEnBodega = repuestos.filter((r) => r.inStock);

    const totalCostoComprasExternas = Number(
      itemsPorComprar.reduce((acc, it) => acc + (it.costPrice * it.qty), 0).toFixed(2)
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
      } catch {}
    }
    if (typeof (orden as any).evidencePhotosJson === "string") {
      try {
        const parsed = JSON.parse((orden as any).evidencePhotosJson);
        if (Array.isArray(parsed)) list.push(...parsed);
      } catch {}
    }
    if (typeof (orden as any).photosJson === "string") {
      try {
        const parsed = JSON.parse((orden as any).photosJson);
        if (Array.isArray(parsed)) list.push(...parsed);
      } catch {}
    }
    if (orden.evidencias && Array.isArray(orden.evidencias)) {
      for (const ev of orden.evidencias) {
        if (ev.url && (ev.type === "image" || !ev.type || !ev.url.includes(".mp3"))) {
          list.push(ev.url);
        }
      }
    }
    return Array.from(new Set(list.filter(Boolean)));
  }, [orden]);

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
        } catch {}
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

  // Guardar Cambios en Neon PostgreSQL
  const handleGuardarBorrador = async () => {
    if (!orden) return;
    try {
      setGuardando(true);
      const res = await fetch("/api/presupuestos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orden.id,
          items: repuestos,
          services: servicios,
          notes: notasFactura,
          quoteStatus: orden.quoteStatus || "Cotizando",
        }),
      });
      if (!res.ok) {
        let errText = `Error al guardar (${res.status})`;
        try {
          const isJson = res.headers.get("content-type")?.includes("application/json");
          if (isJson) {
            const errJson = await res.json();
            errText = errJson.error || errText;
          }
        } catch {}
        mostrarToast(errText, "err");
        return;
      }
      let data: any = null;
      try {
        data = await res.json();
      } catch {}
      if (data?.success) {
        mostrarToast("Factura / Presupuesto guardado correctamente.");
      } else {
        mostrarToast(data.error || "No se pudo guardar.", "err");
      }
    } catch {
      mostrarToast("Error de conexión al guardar cambios.", "err");
    } finally {
      setGuardando(false);
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
        } catch {}
        mostrarToast(errText, "err");
        return;
      }
      let data: any = null;
      try {
        data = await res.json();
      } catch {}
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

  // Agregar nuevo repuesto
  const handleAgregarRepuesto = () => {
    if (!nuevoNombre.trim()) return;
    const qty = parseInt(nuevaCantidad, 10) || 1;
    const cost = parseFloat(nuevoCosto) || 0;
    const pvp = parseFloat(nuevoPvp) || 0;
    const subtotalVenta = Number((pvp * qty).toFixed(2));
    const subtotalCosto = Number((cost * qty).toFixed(2));
    const margin = Number(((pvp - cost) * qty).toFixed(2));
    const marginPercent = pvp > 0 ? Math.round(((pvp - cost) / pvp) * 100) : 0;

    const nuevoItem: ItemPropuesta = {
      id: `rep_manual_${Date.now()}`,
      name: nuevoNombre.trim(),
      qty,
      costPrice: cost,
      price: pvp,
      subtotalVenta,
      subtotalCosto,
      margin,
      marginPercent,
      supplierName: nuevoEnStock ? "Bodega Taller" : nuevoProveedor,
      purchaseStatus: nuevoEnStock ? "STOCK_LOCAL" : "POR_PEDIR",
      inStock: nuevoEnStock,
      origin: nuevoOrigen,
    };

    setRepuestos((prev) => [...prev, nuevoItem]);
    setNuevoNombre("");
    setNuevoCosto("0");
    setNuevoPvp("0");
    setNuevaCantidad("1");
    setModalNuevoRepuesto(false);
    mostrarToast("Ítem agregado a la factura.");
  };

  // Agregar nuevo servicio
  const handleAgregarServicio = () => {
    if (!nuevoServicioNombre.trim()) return;
    const precio = parseFloat(nuevoServicioPrecio) || 0;
    const nuevoSrv: ServicioPropuesta = {
      id: `srv_manual_${Date.now()}`,
      name: nuevoServicioNombre.trim(),
      category: "Mano de Obra",
      price: precio,
      mechanic: orden?.mechanic || "Taller",
      origin: nuevoServicioOrigen,
    };
    setServicios((prev) => [...prev, nuevoSrv]);
    setNuevoServicioNombre("");
    setNuevoServicioPrecio("0");
    setModalNuevoServicio(false);
    mostrarToast("Mano de obra agregada a la factura.");
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

  const esAprobado = esAprobadoLocal !== null ? esAprobadoLocal : (orden.quoteStatus === "Aprobado" || orden.status === "EN_CAJA");

  const limpiarNumeroOrden = (val?: string | number | null) => {
    if (!val) return "";
    return String(val).replace(/\bOT\b/gi, "").replace(/#+/g, "").trim();
  };

  const handleToggleEstado = async () => {
    if (cambiandoEstado) return;
    const nuevoEstado = esAprobado ? "Pendiente" : "Aprobado";
    try {
      setCambiandoEstado(true);
      const res = await fetch("/api/presupuestos/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orden.id, quoteStatus: nuevoEstado }),
      });
      if (res.ok) {
        setEsAprobadoLocal(nuevoEstado === "Aprobado");
        mostrarToast(`Estado: ${nuevoEstado === "Aprobado" ? "Aprobado" : "En Espera"}`);
      } else {
        mostrarToast("No se pudo cambiar el estado", "err");
      }
    } catch {
      mostrarToast("Error de conexión al cambiar estado", "err");
    } finally {
      setCambiandoEstado(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-12 text-zinc-900 dark:text-white selection:bg-blue-500/30">
      {/* Toast Notificaciones */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2 animate-bounce print:hidden ${
            toast.tipo === "ok"
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                Propuesta
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Botón Imprimir */}
              <button
                type="button"
                onClick={handleImprimir}
                className="h-10 px-3.5 sm:px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-200 active:scale-95 font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Imprimir Proforma"
                aria-label="Imprimir Proforma"
              >
                <span>🖨️</span>
                <span className="hidden sm:inline">Imprimir</span>
              </button>

              {/* Botón WhatsApp Catálogo */}
              <button
                type="button"
                onClick={() => setModalWhatsApp(true)}
                className="h-10 px-3.5 sm:px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-600 dark:text-emerald-300 font-semibold text-xs sm:text-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                title="Catálogo Proveedores WhatsApp"
                aria-label="Catálogo Proveedores WhatsApp"
              >
                <span>📲</span>
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {/* Botón Estado Aprobado / Pendiente */}
              <button
                type="button"
                disabled={cambiandoEstado}
                onClick={handleToggleEstado}
                className={`h-10 px-3.5 sm:px-4 rounded-xl border flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold shadow-xs shrink-0 transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                  esAprobado
                    ? "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                    : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-600 dark:text-amber-400"
                }`}
                title={esAprobado ? "Propuesta Aprobada (clic para poner En Espera)" : "Propuesta En Espera (clic para Aprobar)"}
              >
                <span>{cambiandoEstado ? "..." : (esAprobado ? "✓" : "⏳")}</span>
                <span>{esAprobado ? "Aprobado" : "En Espera"}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* DOCUMENTO PRINCIPAL FORMATO FACTURA / PROFORMA */}
      <main className="max-w-6xl mx-auto p-3 sm:p-6 md:p-8 mt-4 sm:mt-6 print:m-0 print:p-0 print:max-w-none">
        <div className="bg-white dark:bg-[#0f0f13] border border-zinc-200 dark:border-white/10 rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl space-y-8 print:border-none print:shadow-none print:p-4 print:rounded-none">
          
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
                  <p className="text-xs sm:text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-1">
                    Centro Automotriz
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium mt-1">
                    {(() => {
                      const mecanicoLimpio = orden?.mechanic ? orden.mechanic.split("(")[0].trim() : "Carlos Rodríguez";
                      const notes = orden?.notes?.trim();
                      if (!notes) {
                        return `Ingreso a taller | Ingresado por: ${mecanicoLimpio}`;
                      }
                      if (notes.toLowerCase().includes("ingresado por:")) {
                        return notes;
                      }
                      return `${notes} | Ingresado por: ${mecanicoLimpio}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:text-right w-full sm:w-auto p-4 rounded-2xl bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-white/10 space-y-1.5 shrink-0">
              <div className="flex items-center gap-2 sm:justify-end flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25">
                  Propuesta
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    esAprobado
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  }`}
                >
                  {esAprobado ? "✓ Aprobado" : "⏳ En Espera"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-mono font-normal text-zinc-900 dark:text-white pt-1">
                {orden.quoteNumber ? orden.quoteNumber.replace(/\bOT\s*#?/gi, "").replace(/-\s+/, "-").trim() : `COT-${limpiarNumeroOrden(orden.orderNumber)}`}
              </h3>
              <p className="text-sm sm:text-base font-normal text-zinc-600 dark:text-zinc-400 pt-0.5">
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
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Datos del Cliente
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Titular
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400">
                      {orden.customerType || "Personal"}
                    </span>
                  </div>
                </div>

                {/* Perfil del Cliente: Foto Avatar + Datos Principales */}
                <div className="pt-3.5 flex items-center gap-3.5 sm:gap-4">
                  {/* Foto de Perfil / Avatar */}
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-white/15 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 shadow-sm flex items-center justify-center">
                      {orden.clientPhoto ? (
                        <img
                          src={orden.clientPhoto}
                          alt={orden.client}
                          className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                          onClick={() => setFotoZoom(orden.clientPhoto!)}
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
                        className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer rounded-2xl print:hidden gap-0.5"
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

                    {/* Botón flotante para subir/cambiar foto */}
                    <label
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center shadow-md cursor-pointer border-2 border-white dark:border-[#121215] transition-all print:hidden active:scale-90"
                      title="Subir foto del cliente"
                    >
                      <span>+</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={subiendoFotoCliente}
                        onChange={handleSubirFotoCliente}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Nombre y detalles de identificación rápida */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate"
                        title={orden.client}
                      >
                        {orden.client}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/5 font-semibold text-zinc-800 dark:text-zinc-200">
                        {orden.clientIdDoc || "CLI-000000"}
                      </span>

                      {/* Enlace rápido a WhatsApp si tiene teléfono */}
                      {orden.clientPhone && orden.clientPhone !== "S/N" ? (
                        <a
                          href={`https://wa.me/${orden.clientPhone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium transition-colors"
                          title="Contactar al cliente vía WhatsApp"
                        >
                          <span>💬</span>
                          <span className="font-mono">{orden.clientPhone}</span>
                        </a>
                      ) : (
                        <span className="text-zinc-400 font-mono text-[11px]">Tel: S/N</span>
                      )}
                    </div>

                    <div className="pt-0.5 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate">
                        {orden.status || "En Taller"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid con campos estructurados del cliente */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-3.5">
                  <div className="p-2.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Cédula / RUC
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                      {orden.clientIdDoc || "CLI-151951"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Teléfono / WhatsApp
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-medium text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
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
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Datos del Vehículo
                    </span>
                  </div>

                  {/* Placa estilo matriculación ecuatoriana */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-mono font-black px-2.5 py-0.5 rounded-md bg-amber-400 text-black border border-amber-500 tracking-wider shadow-2xs uppercase">
                      {orden.plate}
                    </span>
                  </div>
                </div>

                {/* Perfil del Vehículo: Foto Principal Hero + Datos del Modelo */}
                <div className="pt-3.5 flex items-center gap-3.5 sm:gap-4">
                  {/* Foto de Perfil del Vehículo */}
                  {(() => {
                    const fotoVehiculoPerfil = orden.vehiclePhoto || (fotosVehiculo.length > 0 ? fotosVehiculo[0] : null);
                    return (
                      <div className="relative group shrink-0">
                        <div className="w-20 h-16 sm:w-24 sm:h-20 rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-white/15 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 shadow-sm flex items-center justify-center">
                          {fotoVehiculoPerfil ? (
                            <img
                              src={fotoVehiculoPerfil}
                              alt={orden.vehicle}
                              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                              onClick={() => setFotoZoom(fotoVehiculoPerfil)}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/80 p-1 text-center">
                              <span className="text-xl sm:text-2xl">🏎️</span>
                              <span className="text-[9px] font-bold mt-0.5 uppercase tracking-tight">Sin Foto</span>
                            </div>
                          )}

                          {/* Overlay para Cambiar / Ver Foto del Auto */}
                          <label
                            className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer rounded-2xl print:hidden gap-0.5"
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

                        {/* Botón flotante para subir/cambiar foto */}
                        <label
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black flex items-center justify-center shadow-md cursor-pointer border-2 border-white dark:border-[#121215] transition-all print:hidden active:scale-90"
                          title="Subir foto de perfil del vehículo"
                        >
                          <span>+</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={subiendoFotoVehiculoPrincipal}
                            onChange={handleSubirFotoVehiculoPrincipal}
                            className="hidden"
                          />
                        </label>
                      </div>
                    );
                  })()}

                  {/* Marca / Modelo y Mecánico a cargo */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3
                      className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate"
                      title={orden.vehicle}
                    >
                      {orden.vehicle}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="text-zinc-400">👨‍🔧</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {orden.mechanic || "Carlos Rodríguez (Taller)"}
                      </span>
                    </div>

                    <div className="pt-0.5 flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                        {orden.mileage ? `${Number(orden.mileage).toLocaleString()} km` : "N/D"}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        Tanque: <strong className="font-bold text-zinc-900 dark:text-white">{orden.fuelLevel || "1/2"}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid con campos estructurados del vehículo */}
                <div className="grid grid-cols-2 gap-2 sm:gap-2.5 pt-3.5">
                  <div className="p-2.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Kilometraje Actual
                    </span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {orden.mileage ? `${Number(orden.mileage).toLocaleString()} km` : "5000 km"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-50/80 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/5 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Combustible / Estado
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                      Tanque: <strong className="font-bold text-amber-600 dark:text-amber-400">{orden.fuelLevel || "E"}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOTOS DE INSPECCIÓN Y EVIDENCIAS DEL VEHÍCULO */}
          <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-base">📸</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white tracking-wide">
                  Fotos de Inspección & Evidencias del Vehículo
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {fotosVehiculo.length} {fotosVehiculo.length === 1 ? "foto" : "fotos"}
                </span>
              </div>

              {/* Botón para subir fotos directamente */}
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 print:hidden">
                <span>📷</span>
                <span>{subiendoFoto ? "Subiendo..." : "Subir Foto"}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={subiendoFoto}
                  onChange={handleSubirFoto}
                  className="hidden"
                />
              </label>
            </div>

            {fotosVehiculo.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
                {fotosVehiculo.map((fotoUrl, idx) => (
                  <div
                    key={`foto-${idx}`}
                    onClick={() => setFotoZoom(fotoUrl)}
                    className="group relative aspect-4/3 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-black/40 cursor-pointer shadow-2xs hover:shadow-md hover:border-blue-500/50 transition-all"
                  >
                    <img
                      src={fotoUrl}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                      <span>🔍</span>
                      <span>Ver</span>
                    </div>
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] font-mono text-white/90">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 px-4 rounded-xl border border-dashed border-zinc-300 dark:border-white/10 flex flex-col items-center justify-center text-center text-zinc-400">
                <span className="text-3xl mb-1">📸</span>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  No hay fotos registradas para este vehículo aún.
                </p>
                <label className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer print:hidden">
                  <span>+ Agregar fotos de inspección</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={subiendoFoto}
                    onChange={handleSubirFoto}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* TABLA PRINCIPAL DE FACTURA: TODO LO QUE SE PIDIÓ (REPUESTOS, INSUMOS, SERVICIOS) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>📋</span>
                  <span>Detalle</span>
                </h3>
              </div>

              {/* Botones para agregar líneas directamente a la factura */}
              <div className="flex items-center gap-2 print:hidden flex-wrap">
                <button
                  type="button"
                  onClick={() => setModalNuevoRepuesto(true)}
                  className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>+</span>
                  <span>Repuesto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalNuevoServicio(true)}
                  className="h-9 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>+</span>
                  <span>Servicio</span>
                </button>
              </div>
            </div>

            {/* TABLA ESTILO FACTURA PROFORMA */}
            <div className="border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#121216] shadow-sm">
              <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.04] text-xs font-normal text-zinc-600 dark:text-zinc-400">
                      <th className="py-2.5 px-2 w-8 text-center font-normal">#</th>
                      <th className="py-2.5 px-2 w-24 font-normal">Área</th>
                      <th className="py-2.5 px-2 min-w-[170px] font-normal">Descripción</th>
                      <th className="py-2.5 px-2 w-44 text-center font-normal">
                        Disponibilidad
                      </th>
                      <th className="py-2.5 px-1.5 w-14 text-center font-normal">Cant.</th>
                      <th className="py-2.5 px-2 w-20 text-right font-normal">Costo</th>
                      <th className="py-2.5 px-2 w-20 text-right font-normal">PVP</th>
                      <th className="py-2.5 px-2 w-20 text-right font-normal">Subtotal</th>
                      <th className="py-2.5 px-2 w-20 text-right print:hidden font-normal">Margen</th>
                      <th className="py-2.5 px-1.5 w-8 text-center print:hidden"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-200 dark:divide-white/5 text-xs">
                    {repuestos.length === 0 && servicios.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-zinc-400 text-sm">
                          No hay repuestos ni servicios agregados en esta orden.
                        </td>
                      </tr>
                    ) : null}

                    {/* LÍNEAS DE REPUESTOS E INSUMOS */}
                    {repuestos.map((item, idx) => {
                      const itemNum = idx + 1;
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* 1. Número */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-zinc-400">
                            {itemNum}
                          </td>

                          {/* 2. Área / Especialidad (Taller, Lubricentro, Car Wash, Tecnicentro) */}
                          <td className="py-3 px-3">
                            {renderBadgeEspecialidad(item.origin)}
                          </td>

                          {/* 3. Descripción */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <span className="font-bold text-zinc-900 dark:text-white block">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                                <span>{item.code || `REP-${itemNum}`}</span>
                                {item.notes && <span>• {item.notes}</span>}
                              </div>
                            </div>
                          </td>

                          {/* 4. CASILLERO DE DISPONIBILIDAD (SÍ HAY EN BODEGA VS PEDIR A PROVEEDOR EXTERNO) */}
                          <td className="py-3 px-3">
                            <div className="flex flex-col gap-1.5 items-center justify-center">
                              {/* Casillero / Switch interactivo */}
                              <label
                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                  item.inStock
                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                                    : "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={item.inStock}
                                    onChange={() => handleToggleStock(item.id)}
                                    className="w-4 h-4 rounded-md accent-emerald-600 cursor-pointer"
                                  />
                                  <span>{item.inStock ? "Sí hay en Bodega" : "Pedir a Proveedor"}</span>
                                </div>
                                <span className="text-[11px] font-normal opacity-80">
                                  {item.inStock ? "Bodega" : "Externo"}
                                </span>
                              </label>

                              {/* Si es externo, selector del proveedor asignado */}
                              {!item.inStock && (
                                <select
                                  value={item.supplierName || "Proveedor General"}
                                  onChange={(e) => handleUpdateSupplier(item.id, e.target.value)}
                                  className="w-full h-7 px-2 rounded-lg bg-zinc-50 dark:bg-black border border-amber-500/30 text-[11px] text-zinc-700 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  title="Proveedor asignado"
                                >
                                  <option value="Proveedor General">📦 Proveedor General</option>
                                  <option value="Bosch Store">Bosch Store</option>
                                  <option value="Repuestos Pichincha">Repuestos Pichincha</option>
                                  <option value="Llantera Express">Llantera Express</option>
                                  <option value="Distribuidora de Lubricantes">Distribuidora Lubricantes</option>
                                  {proveedores.map((p) => (
                                    <option key={p.id} value={p.name}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>

                          {/* 5. Cantidad */}
                          <td className="py-3 px-2 text-center">
                            <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-zinc-50 dark:bg-black print:border-none print:bg-transparent">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, -1)}
                                className="w-6 h-7 flex items-center justify-center text-zinc-500 hover:text-black dark:hover:text-white font-bold text-xs print:hidden"
                              >
                                -
                              </button>
                              <span className="w-7 text-center font-mono font-bold text-zinc-900 dark:text-white">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, 1)}
                                className="w-6 h-7 flex items-center justify-center text-zinc-500 hover:text-black dark:hover:text-white font-bold text-xs print:hidden"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* 6. Costo Unitario */}
                          <td className="py-3 px-3 text-right">
                            <div className="print:hidden">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.costPrice}
                                onChange={(e) => handleUpdatePrice(item.id, "costPrice", e.target.value)}
                                className="w-20 h-7 px-1.5 text-right rounded-lg bg-zinc-50 dark:bg-black border border-zinc-200 dark:border-white/10 font-mono font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                              />
                            </div>
                            <span className="hidden print:inline font-mono">
                              ${Number(item.costPrice).toFixed(2)}
                            </span>
                          </td>

                          {/* 7. PVP Unitario */}
                          <td className="py-3 px-3 text-right">
                            <div className="print:hidden">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.price}
                                onChange={(e) => handleUpdatePrice(item.id, "price", e.target.value)}
                                className="w-20 h-7 px-1.5 text-right rounded-lg bg-zinc-50 dark:bg-black border border-emerald-500/30 font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs"
                              />
                            </div>
                            <span className="hidden print:inline font-mono font-bold">
                              ${Number(item.price).toFixed(2)}
                            </span>
                          </td>

                          {/* 8. Subtotal */}
                          <td className="py-3 px-3 text-right font-mono font-black text-zinc-900 dark:text-white">
                            ${item.subtotalVenta.toFixed(2)}
                          </td>

                          {/* 9. Margen */}
                          <td className="py-3 px-3 text-right font-mono text-[11px] font-bold print:hidden">
                            <span className={item.margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}>
                              ${item.margin.toFixed(2)} ({item.marginPercent}%)
                            </span>
                          </td>

                          {/* 10. Eliminar */}
                          <td className="py-3 px-2 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="w-7 h-7 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 inline-flex items-center justify-center transition-colors cursor-pointer text-xs"
                              title="Eliminar repuesto"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* LÍNEAS DE SERVICIOS / MANO DE OBRA */}
                    {servicios.map((sv, idx) => {
                      const itemNum = repuestos.length + idx + 1;
                      return (
                        <tr
                          key={sv.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors group bg-purple-500/[0.02]"
                        >
                          {/* 1. Número */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-zinc-400">
                            {itemNum}
                          </td>

                          {/* 2. Área / Especialidad */}
                          <td className="py-3 px-3">
                            {renderBadgeEspecialidad(sv.origin)}
                          </td>

                          {/* 3. Descripción del Servicio */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <span className="font-bold text-zinc-900 dark:text-white block">
                                {sv.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                                <span>{sv.code || `SRV-${idx + 1}`}</span>
                                <span>• Mano de Obra Técnica</span>
                              </div>
                            </div>
                          </td>

                          {/* 4. Casillero para Mano de Obra */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-700 dark:text-purple-300 font-normal text-xs">
                              <span>👨‍🔧 Servicio</span>
                              <span className="text-[10px] text-zinc-400 font-normal">
                                ({sv.mechanic || orden.mechanic})
                              </span>
                            </div>
                          </td>

                          {/* 5. Cantidad */}
                          <td className="py-3 px-2 text-center font-mono font-bold text-zinc-900 dark:text-white">
                            1
                          </td>

                          {/* 6. Costo Unitario */}
                          <td className="py-3 px-3 text-right font-mono text-zinc-400 text-xs">
                            $0.00
                          </td>

                          {/* 7. PVP Unitario */}
                          <td className="py-3 px-3 text-right">
                            <div className="print:hidden">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={sv.price}
                                onChange={(e) => handleUpdateServicePrice(sv.id, e.target.value)}
                                className="w-20 h-7 px-1.5 text-right rounded-lg bg-zinc-50 dark:bg-black border border-purple-500/30 font-mono font-bold text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                              />
                            </div>
                            <span className="hidden print:inline font-mono font-bold">
                              ${Number(sv.price).toFixed(2)}
                            </span>
                          </td>

                          {/* 8. Subtotal */}
                          <td className="py-3 px-3 text-right font-mono font-black text-zinc-900 dark:text-white">
                            ${Number(sv.price).toFixed(2)}
                          </td>

                          {/* 9. Margen */}
                          <td className="py-3 px-3 text-right font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 print:hidden">
                            ${Number(sv.price).toFixed(2)} (100%)
                          </td>

                          {/* 10. Eliminar */}
                          <td className="py-3 px-2 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleDeleteService(sv.id)}
                              className="w-7 h-7 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 inline-flex items-center justify-center transition-colors cursor-pointer text-xs"
                              title="Eliminar servicio"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* LIQUIDACIÓN DE LA FACTURA & TOTALES */}
          <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-white/10">
            {/* Liquidación Financiera de Propuesta */}
            <div className="w-full md:w-1/2 max-w-lg p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 space-y-3 font-sans">
              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-normal">Subtotal Repuestos e Insumos:</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  ${calculos.subtotalRepuestos.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-normal">Subtotal Mano de Obra y Servicios:</span>
                <span className="font-medium text-zinc-900 dark:text-white">
                  ${calculos.subtotalServicios.toFixed(2)}
                </span>
              </div>

              <div className="h-px bg-zinc-200 dark:bg-white/10" />

              <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300">
                <span className="font-normal">Subtotal Bruto:</span>
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
                    Total Propuesta
                  </span>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    Precio total final para el cliente
                  </span>
                </div>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${calculos.totalFacturaCliente.toFixed(2)}
                </span>
              </div>

              {/* RENTABILIDAD / MARGEN TALLER (Solo visible internamente) */}
              <div className="p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25 flex items-center justify-between text-xs print:hidden">
                <span className="font-normal text-emerald-800 dark:text-emerald-300">
                  Utilidad Neta del Taller:
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  ${calculos.margenNetoTaller.toFixed(2)} ({calculos.margenPorcentaje}%)
                </span>
              </div>
            </div>
          </div>

          {/* AUDIOS Y NOTAS DE VOZ (SI EXISTEN) */}
          {orden.evidencias && orden.evidencias.some((e) => e.type === "audio" || e.url?.includes(".mp3")) && (
            <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-white/10 print:hidden">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>🎙️</span>
                <span>Notas de Voz y Audios de Inspección</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {orden.evidencias
                  .filter((e) => e.type === "audio" || e.url?.includes(".mp3"))
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-2xl bg-zinc-100 dark:bg-[#111113] border border-zinc-200 dark:border-white/10 space-y-2 shadow-xs"
                    >
                      <audio controls src={ev.url} className="w-full h-8" />
                      {ev.transcriptionText && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                          "{ev.transcriptionText}"
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

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
              <p className="text-[10px] text-zinc-500">Mecánico: {orden.mechanic}</p>
            </div>
          </div>
        </div>
      </main>

      {/* BARRA FINAL CON ACCIONES (FLUJO NORMAL AL FINAL DEL DOCUMENTO) */}
      <footer className="print:hidden max-w-6xl mx-auto px-3 sm:px-6 md:px-8 mt-6 mb-12">
        <div className="bg-white dark:bg-[#0f0f13] border border-zinc-200 dark:border-white/10 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Métricas Rápidas */}
          <div className="flex items-center justify-between md:justify-start gap-4 sm:gap-6 text-xs font-mono">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">Compras</span>
              <span className="text-base sm:text-lg font-normal text-zinc-900 dark:text-white">
                ${calculos.totalCostoComprasExternas.toFixed(2)}
              </span>
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-white/10" />

            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">Total</span>
              <span className="text-base sm:text-lg font-normal text-blue-600 dark:text-blue-400">
                ${calculos.totalFacturaCliente.toFixed(2)}
              </span>
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-white/10" />

            <div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">Margen</span>
              <span className="text-base sm:text-lg font-normal text-emerald-600 dark:text-emerald-400">
                ${calculos.margenNetoTaller.toFixed(2)} ({calculos.margenPorcentaje}%)
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
            <button
              type="button"
              disabled={guardando}
              onClick={handleGuardarBorrador}
              className="h-10 px-5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>

            <button
              type="button"
              disabled={autorizando}
              onClick={handleAutorizarYEnviarAPos}
              className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              <span>{autorizando ? "Transfiriendo..." : "Autorizar"}</span>
            </button>
          </div>
        </div>
      </footer>

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
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">+ Agregar Repuesto</h3>
              <button
                type="button"
                onClick={() => setModalNuevoRepuesto(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
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
                    className={`w-full h-10 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      nuevoEnStock
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
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">+ Agregar Servicio</h3>
              <button
                type="button"
                onClick={() => setModalNuevoServicio(false)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
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
    </div>
  );
}
