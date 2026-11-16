"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { MiniAudioPlayer } from "@/components/taller/MiniAudioPlayer";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { abrirWhatsAppCompatible, detectarPlataformaWhatsApp } from "@/lib/whatsapp";

interface Proveedor {
  id: string;
  name: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface PedidoItem {
  id: string;
  name: string;
  qty: number;
  price?: number;
  costPrice?: number;
  code?: string;
  type?: string;
  category?: string;
  isService: boolean;
  isManual?: boolean;
  inStock?: boolean;
  enviadoProveedor?: boolean;
  purchaseStatus?: string;
  supplierId?: string;
  supplierName?: string;
  supplierPhone?: string;
  fotos?: string[];
  audios?: any[];
  [key: string]: any;
}

const PROVEEDORES_RESPALDO: Proveedor[] = [
  { id: "prov_local_1", name: "Importadora AutoRepuestos", contact: "Ventas", phone: "593990000001" },
  { id: "prov_local_2", name: "Distribuidora Central", contact: "Mostrador", phone: "593990000002" },
];

function limpiarNumeroOrden(val?: string | null): string {
  if (!val) return "";
  return String(val)
    .replace(/\b(COT|COTIZACION|COTIZACIÓN|OT|ORD)\b[-\s#]*/gi, "")
    .replace(/#+/g, "")
    .trim();
}

function formatearPrimeraMayusculaPedir(texto?: string | null): string {
  const s = String(texto || "").trim();
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function getBadgeDetallePedir(item: PedidoItem) {
  const cat = String(item.category || "").toLowerCase();
  if (cat.includes("lubri")) {
    return {
      label: "Lubricentro",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    };
  }
  if (cat.includes("wash") || cat.includes("lavad")) {
    return {
      label: "Car Wash",
      cls: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
    };
  }
  if (cat.includes("tecni")) {
    return {
      label: "Tecnicentro",
      cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30",
    };
  }
  return {
    label: item.category ? formatearPrimeraMayusculaPedir(item.category) : "Taller",
    cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  };
}

function ProveedorRowDropdown({
  proveedores,
  valueId,
  valueName,
  placeholder = "Asignar proveedor...",
  alignRight = false,
  onSelect,
}: {
  proveedores: Proveedor[];
  valueId?: string;
  valueName?: string;
  placeholder?: string;
  alignRight?: boolean;
  onSelect: (provId: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const actualizarPosicion = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const rawLeft = alignRight ? rect.right - width : rect.left;
    const left = Math.max(12, Math.min(rawLeft, window.innerWidth - width - 12));
    setPos({
      top: rect.bottom + 4,
      left,
      width,
    });
  }, [alignRight]);

  useEffect(() => {
    if (!abierto) return;
    actualizarPosicion();
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        setAbierto(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    const onScrollOrResize = () => actualizarPosicion();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [abierto, actualizarPosicion]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.toLowerCase().includes(q))
    );
  }, [proveedores, filtro]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setAbierto((v) => !v);
          setFiltro("");
        }}
        className={`h-7 w-full px-2.5 rounded-lg border text-left text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${valueName
          ? "bg-purple-500/10 border-purple-500/30 text-zinc-900 dark:text-white font-medium"
          : "bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-white/20"
          }`}
      >
        <span className="truncate">{valueName || placeholder}</span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform duration-150 ${abierto ? "rotate-180 text-purple-400" : ""
            }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {abierto &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
            className="z-[9999] rounded-lg bg-white/95 dark:bg-[#121218]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-white/10 shadow-xl overflow-hidden animate-fade-in"
          >
            <div className="p-1.5 border-b border-zinc-100 dark:border-white/10">
              <input
                type="text"
                autoFocus
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar proveedor..."
                className="w-full h-8 sm:h-7 px-2 rounded-md bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 text-base sm:text-[11px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-purple-500/70"
              />
            </div>
            <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
              {valueId && (
                <button
                  type="button"
                  onClick={() => {
                    onSelect("");
                    setAbierto(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-md text-left text-[11px] text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                >
                  Quitar proveedor
                </button>
              )}
              {filtrados.length === 0 ? (
                <div className="px-2.5 py-2 text-[11px] text-zinc-400 text-center">
                  Sin coincidencias
                </div>
              ) : (
                filtrados.map((p) => {
                  const sel = p.id === valueId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelect(p.id);
                        setAbierto(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-md text-left text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${sel
                        ? "bg-purple-500/15 text-purple-700 dark:text-purple-200 font-medium"
                        : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate leading-tight">{p.name}</p>
                        {p.phone && (
                          <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {p.phone}
                          </p>
                        )}
                      </div>
                      {sel && (
                        <span className="text-purple-500 text-xs font-bold shrink-0">✓</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default function PedirProveedoresPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = String(params?.id || "");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<any>(null);
  const [repuestos, setRepuestos] = useState<PedidoItem[]>([]);
  const [servicios, setServicios] = useState<PedidoItem[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [seleccionadosIds, setSeleccionadosIds] = useState<Record<string, boolean>>({});
  const [todoProveedorActivo, setTodoProveedorActivo] = useState(false);
  const [flotanteFotos, setFlotanteFotos] = useState<{
    titulo: string;
    fotos: string[];
    fotoActivaIdx: number;
  } | null>(null);
  const [flotanteAudios, setFlotanteAudios] = useState<{
    titulo: string;
    audios: any[];
  } | null>(null);
  const [flotanteProveedorGrupo, setFlotanteProveedorGrupo] = useState<{
    titulo: string;
    targetIds: string[];
  } | null>(null);
  const [busquedaProveedorFlotante, setBusquedaProveedorFlotante] = useState("");

  // Toast estilo Orden de Propuesta
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);
  const mostrarToast = (msg: string, tipo: "ok" | "err" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3200);
  };

  const lastLocalMutationAtRef = useRef<number>(0);

  const cargarDatos = useCallback(async (silencioso = false) => {
    if (!id) return;
    if (silencioso && Date.now() - lastLocalMutationAtRef.current < 2500) {
      return;
    }
    try {
      if (!silencioso) {
        setCargando(true);
        setError(null);
      }
      const [resDet, resProv] = await Promise.all([
        fetch(`/api/presupuestos/detalle?id=${encodeURIComponent(id)}`),
        fetch("/api/presupuestos/proveedores"),
      ]);

      const dataDet = await resDet.json().catch(() => null);
      if (!resDet.ok || !dataDet?.success || !dataDet?.order) {
        setError(dataDet?.error || "No se pudo cargar la orden.");
        return;
      }

      const ord = dataDet.order;
      setOrden(ord);

      const rawItems = Array.isArray(ord.items) ? ord.items : [];
      const rawServicios = Array.isArray(ord.services) ? ord.services : [];

      setRepuestos(
        rawItems.map((it: any) => ({
          ...it,
          isService: false,
          qty: Number(it.qty || 1),
        }))
      );
      setServicios(
        rawServicios.map((sv: any) => ({
          ...sv,
          isService: true,
          qty: Number(sv.qty || 1),
        }))
      );

      const dataProv = await resProv.json().catch(() => null);
      const listaProv: Proveedor[] =
        Array.isArray(dataProv?.proveedores) && dataProv.proveedores.length > 0
          ? dataProv.proveedores
          : Array.isArray(dataDet.proveedores) && dataDet.proveedores.length > 0
            ? dataDet.proveedores
            : [];

      setProveedores(listaProv);
    } catch {
      setError("Error de conexión al cargar los pedidos.");
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const esItemMarcado = (it: PedidoItem) =>
    Boolean(
      it.enviadoProveedor ||
      it.purchaseStatus === "PEDIDO_WHATSAPP" ||
      it.purchaseStatus === "COTIZADO"
    );

  const itemsMarcados = useMemo(() => {
    const srvs = servicios.filter(esItemMarcado);
    const reps = repuestos.filter(esItemMarcado);
    return [...reps, ...srvs];
  }, [servicios, repuestos]);

  const listaVisible = itemsMarcados;

  const guardarCambiosEnServidor = async (
    nuevosRepuestos: PedidoItem[],
    nuevosServicios: PedidoItem[],
    mensajeExito?: string
  ) => {
    if (!orden) return false;
    try {
      lastLocalMutationAtRef.current = Date.now();
      setGuardando(true);
      const res = await fetch("/api/presupuestos/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orden.id,
          items: nuevosRepuestos,
          services: nuevosServicios,
          notes: orden.notes || "",
          quoteStatus: orden.quoteStatus || "Cotizando",
          quoteTaxRate: Number(orden.quoteTaxRate ?? 15),
          quoteDiscount: Number(orden.quoteDiscount ?? 0),
          inspectionFindings: orden.inspectionFindings || [],
        }),
      });
      if (!res.ok) {
        mostrarToast("No se pudo guardar en el servidor", "err");
        return false;
      }
      if (mensajeExito) mostrarToast(mensajeExito, "ok");
      return true;
    } catch {
      mostrarToast("Error de conexión al guardar", "err");
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const buscarProveedor = (provIdOrName?: string): Proveedor | undefined => {
    if (!provIdOrName) return undefined;
    return proveedores.find(
      (p) =>
        p.id === provIdOrName ||
        p.name.trim().toLowerCase() === provIdOrName.trim().toLowerCase()
    );
  };

  // Asignar proveedor a UN solo pedido
  const handleAsignarProveedorItem = async (item: PedidoItem, provId: string) => {
    setTodoProveedorActivo(false);
    const prov = proveedores.find((p) => p.id === provId);
    const actualizar = (arr: PedidoItem[]) =>
      arr.map((it) =>
        it.id === item.id
          ? {
            ...it,
            enviadoProveedor: true,
            inStock: false,
            purchaseStatus:
              it.purchaseStatus === "COTIZADO" ? "COTIZADO" : "PEDIDO_WHATSAPP",
            supplierId: prov?.id || "",
            supplierName: prov?.name || "",
            supplierPhone: prov?.phone || "",
          }
          : it
      );

    const nuevosRep = item.isService ? repuestos : actualizar(repuestos);
    const nuevosSrv = item.isService ? actualizar(servicios) : servicios;
    setRepuestos(nuevosRep);
    setServicios(nuevosSrv);

    await guardarCambiosEnServidor(
      nuevosRep,
      nuevosSrv,
      prov ? `Asignado a ${prov.name}` : "Proveedor limpiado"
    );
  };

  // Aplicar el mismo proveedor a TODOS los ítems marcados
  const handleAplicarProveedorATodos = async (provId: string) => {
    setTodoProveedorActivo(Boolean(provId));
    const prov = proveedores.find((p) => p.id === provId);
    const actualizarTodos = (arr: PedidoItem[]) =>
      arr.map((it) =>
        esItemMarcado(it)
          ? {
            ...it,
            enviadoProveedor: true,
            inStock: false,
            purchaseStatus:
              it.purchaseStatus === "COTIZADO" ? "COTIZADO" : "PEDIDO_WHATSAPP",
            supplierId: prov?.id || "",
            supplierName: prov?.name || "",
            supplierPhone: prov?.phone || "",
          }
          : it
      );

    const nuevosRep = actualizarTodos(repuestos);
    const nuevosSrv = actualizarTodos(servicios);
    setRepuestos(nuevosRep);
    setServicios(nuevosSrv);

    await guardarCambiosEnServidor(
      nuevosRep,
      nuevosSrv,
      prov
        ? `Proveedor ${prov.name} aplicado a todos`
        : "Proveedor quitado de todos los ítems"
    );
  };

  // Aplicar proveedor desde el flotante de búsqueda a los ítems seleccionados o al grupo
  const handleAplicarProveedorGrupo = async (provId: string, targetIds: string[]) => {
    const idSet = new Set(targetIds);
    const prov = proveedores.find((p) => p.id === provId);
    const actualizar = (arr: PedidoItem[]) =>
      arr.map((it) =>
        idSet.has(it.id)
          ? {
            ...it,
            enviadoProveedor: true,
            inStock: false,
            purchaseStatus:
              it.purchaseStatus === "COTIZADO" ? "COTIZADO" : "PEDIDO_WHATSAPP",
            supplierId: prov?.id || "",
            supplierName: prov?.name || "",
            supplierPhone: prov?.phone || "",
          }
          : it
      );

    const nuevosRep = actualizar(repuestos);
    const nuevosSrv = actualizar(servicios);
    setRepuestos(nuevosRep);
    setServicios(nuevosSrv);
    setSeleccionadosIds((prev) => {
      const next = { ...prev };
      targetIds.forEach((tid) => delete next[tid]);
      return next;
    });
    setFlotanteProveedorGrupo(null);
    setTodoProveedorActivo(false);

    await guardarCambiosEnServidor(
      nuevosRep,
      nuevosSrv,
      prov
        ? `Proveedor ${prov.name} asignado (${targetIds.length})`
        : `Proveedor quitado (${targetIds.length})`
    );
  };

  // Marcar o quitar un ítem de la lista de pedidos
  const handleToggleMarcado = async (item: PedidoItem) => {
    const nuevoEstado = !esItemMarcado(item);
    const actualizar = (arr: PedidoItem[]) =>
      arr.map((it) =>
        it.id === item.id
          ? {
            ...it,
            enviadoProveedor: nuevoEstado,
            inStock: nuevoEstado ? false : true,
            purchaseStatus: nuevoEstado ? "PEDIDO_WHATSAPP" : "STOCK_LOCAL",
          }
          : it
      );

    const nuevosRep = item.isService ? repuestos : actualizar(repuestos);
    const nuevosSrv = item.isService ? actualizar(servicios) : servicios;
    setRepuestos(nuevosRep);
    setServicios(nuevosSrv);

    await guardarCambiosEnServidor(
      nuevosRep,
      nuevosSrv,
      nuevoEstado ? "Agregado a la lista de pedidos" : "Quitado de la lista de pedidos"
    );
  };

  // Ajustar cantidad del ítem (+/-) igual que en Propuesta
  const handleUpdateQty = async (item: PedidoItem, delta: number) => {
    const nextQty = Math.max(1, (Number(item.qty) || 1) + delta);
    if (nextQty === (Number(item.qty) || 1)) return;
    const actualizar = (arr: PedidoItem[]) =>
      arr.map((it) => (it.id === item.id ? { ...it, qty: nextQty } : it));

    const nuevosRep = item.isService ? repuestos : actualizar(repuestos);
    const nuevosSrv = item.isService ? actualizar(servicios) : servicios;
    setRepuestos(nuevosRep);
    setServicios(nuevosSrv);

    await guardarCambiosEnServidor(nuevosRep, nuevosSrv);
  };

  const construirRutaCatalogo = (itemsGrupo: PedidoItem[], prov?: Proveedor) => {
    if (!orden) return "";
    const query = new URLSearchParams();
    if (itemsGrupo.length > 0) {
      query.set("items", itemsGrupo.map((i) => String(i.id)).join(","));
    }
    if (prov?.name) query.set("supplier", prov.name);
    if (prov?.phone) query.set("phone", prov.phone);
    if (orden?.supplierSig) query.set("sig", orden.supplierSig);
    query.set("sentAt", String(Date.now()));
    return `/pedidos-proveedor/${orden.id}?${query.toString()}`;
  };

  const shortLinkCacheRef = useRef<Map<string, string>>(new Map());

  const construirLinkCorto = async (itemsGrupo: PedidoItem[], prov?: Proveedor) => {
    if (!orden || typeof window === "undefined") return "";
    const rutaRelativa = construirRutaCatalogo(itemsGrupo, prov);
    if (!rutaRelativa) return "";
    const cached = shortLinkCacheRef.current.get(rutaRelativa);
    if (cached) {
      return `${window.location.origin}${cached}`;
    }
    try {
      const res = await fetch("/api/short-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rutaRelativa }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.shortPath) {
        shortLinkCacheRef.current.set(rutaRelativa, String(data.shortPath));
        return `${window.location.origin}${data.shortPath}`;
      }
    } catch {
      // Fallback a la ruta completa si falla el acortador
    }
    return `${window.location.origin}${rutaRelativa}`;
  };

  const abrirLinkCatalogo = async (itemsGrupo: PedidoItem[], prov?: Proveedor) => {
    if (typeof window === "undefined") return;
    const isIOS = detectarPlataformaWhatsApp() === "ios";
    const win = isIOS ? null : window.open("about:blank", "_blank");
    const link = await construirLinkCorto(itemsGrupo, prov);
    if (!link) {
      if (win && !win.closed) win.close();
      return;
    }
    let copiado = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(link);
        copiado = true;
      }
    } catch { }
    if (!copiado) {
      try {
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        copiado = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch { }
    }
    if (copiado) {
      mostrarToast("✓ Link copiado al portapapeles", "ok");
    }
    if (isIOS) {
      window.location.assign(link);
    } else if (win && !win.closed) {
      win.location.href = link;
    } else {
      window.open(link, "_blank");
    }
  };

  const enviarWhatsAppGrupo = async (itemsGrupo: PedidoItem[], prov?: Proveedor) => {
    if (!orden || itemsGrupo.length === 0 || typeof window === "undefined") return;
    const isIOS = detectarPlataformaWhatsApp() === "ios";
    const win = isIOS ? null : window.open("about:blank", "_blank");
    const ahora = new Date();
    const fechaHora = ahora.toLocaleString("es-EC", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const link = await construirLinkCorto(itemsGrupo, prov);
    const vehiculoInfo = `${orden.vehicle || "Vehículo"} (Placa: ${orden.plate || "N/A"})`;
    const detalle = itemsGrupo.map((it) => `• ${it.qty || 1}x ${it.name}`).join("\n");
    const texto = `Hola${prov?.name ? ` ${prov.name}` : ""}, solicito cotización para el vehículo ${vehiculoInfo}\nFecha y hora: ${fechaHora}\n\nLo que necesito:\n${detalle}\n\nAbre el catálogo del proveedor para confirmar disponibilidad, precio y tiempo de entrega:\n${link}`;
    abrirWhatsAppCompatible({
      phone: prov?.phone,
      text: texto,
      preOpenedWindow: win,
    });
  };

  const obtenerItemsParaEnvio = (item: PedidoItem): PedidoItem[] => {
    const marcados = listaVisible.filter((it) => Boolean(seleccionadosIds[it.id]));
    if (marcados.length > 0) {
      return marcados;
    }
    return [item];
  };

  // Agrupar ítems marcados por proveedor asignado
  const gruposPorProveedor = useMemo(() => {
    const grupos = new Map<string, { prov?: Proveedor; nombre: string; items: PedidoItem[] }>();
    itemsMarcados.forEach((it) => {
      const prov = buscarProveedor(it.supplierId || it.supplierName);
      const key = prov?.id || (it.supplierName ? `name:${it.supplierName}` : "sin_asignar");
      const nombre = prov?.name || it.supplierName || "Sin proveedor asignado";
      const actual = grupos.get(key) || { prov, nombre, items: [] };
      actual.items.push(it);
      grupos.set(key, actual);
    });
    return Array.from(grupos.entries()).map(([key, val]) => ({ key, ...val }));
  }, [itemsMarcados, proveedores]);

  useRealtimeSync({
    channels: ["presupuestos", "taller"],
    onRefresh: () => cargarDatos(true),
  });

  if (cargando) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-400">Cargando pedidos marcados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !orden) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#0f0f13] border border-rose-500/30 rounded-3xl p-6 text-center space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {error || "Orden no encontrada"}
            </h2>
            <Link
              href={`/presupuestos/${encodeURIComponent(id)}`}
              className="inline-flex h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold items-center justify-center transition-all"
            >
              ← Volver a la Propuesta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const vehiculoStr = String(orden.vehicle || "Vehículo");
  const numeroOrdenLimpio = limpiarNumeroOrden(orden.orderNumber || orden.quoteNumber);
  const sinProveedorCount = itemsMarcados.filter(
    (it) => !buscarProveedor(it.supplierId || it.supplierName) && !it.supplierName
  ).length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans pb-[calc(env(safe-area-inset-bottom)+3rem)] text-zinc-900 dark:text-white selection:bg-purple-500/30">
      {/* Toast estilo Orden de Propuesta */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2 ${toast.tipo === "ok"
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            : "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
            }`}
        >
          <span>{toast.tipo === "ok" ? "✓" : "✕"}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      <Header />

      {/* DOCUMENTO PRINCIPAL ESTILO ORDEN DE PROPUESTA (SIN CINTA SUPERIOR) */}
      <main className="w-full max-w-[1920px] mx-auto p-3 sm:p-6 md:p-8 lg:px-8 mt-2 sm:mt-4 space-y-4">
        {/* Tarjeta Principal moderna y minimalista */}
        <div className="bg-white dark:bg-[#0f0f13] border border-zinc-200/80 dark:border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl space-y-5 transition-all">
          {/* Cabecera minimalista */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-200/80 dark:border-white/[0.08]">
            <div className="flex items-center gap-3.5 min-w-0">
              <Link
                href={`/presupuestos/${encodeURIComponent(orden.id)}`}
                aria-label="Volver a Orden de Propuesta"
                title="Volver a Orden de Propuesta"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200/80 bg-zinc-50 text-zinc-600 transition-all hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-purple-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-purple-400/40 dark:hover:bg-purple-500/15 dark:hover:text-purple-300 active:scale-95"
              >
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" />
                  <path d="M20 12H9" />
                </svg>
              </Link>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Pedir
                  </h1>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-600 dark:text-purple-300 font-mono text-xs font-bold">
                    #{numeroOrdenLimpio}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {vehiculoStr}
                  {orden.plate ? ` · ${orden.plate}` : ""}
                  {orden.client ? ` · ${orden.client}` : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto shrink-0">
              <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03]">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Pedidos</span>
                <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{itemsMarcados.length}</span>
              </div>
              <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03]">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">Proveed.</span>
                <span className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-300 tabular-nums">{gruposPorProveedor.length}</span>
              </div>
              <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sinProveedorCount > 0 ? "bg-amber-400" : "bg-emerald-400"}`} />
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">Sin asig.</span>
                <span className={`text-xs sm:text-sm font-bold tabular-nums ${sinProveedorCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {sinProveedorCount}
                </span>
              </div>
            </div>
          </div>

          {/* Cuerpo principal ancho completo estilo Propuesta (sin scroll horizontal) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Pedidos ({listaVisible.length})
              </h3>
              {listaVisible.length > 0 && proveedores.length > 0 && (() => {
                const proveedorUnicoTodos =
                  gruposPorProveedor.length === 1 && gruposPorProveedor[0]?.prov
                    ? gruposPorProveedor[0].prov
                    : undefined;
                return (
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                    <div className="flex-1 min-w-[180px] sm:w-64">
                      <ProveedorRowDropdown
                        proveedores={proveedores}
                        valueId={proveedorUnicoTodos?.id}
                        valueName={
                          proveedorUnicoTodos
                            ? `Todo Proveedor: ${proveedorUnicoTodos.name}`
                            : undefined
                        }
                        placeholder="Todo Proveedor"
                        alignRight
                        onSelect={(provId) => void handleAplicarProveedorATodos(provId)}
                      />
                    </div>
                    {proveedorUnicoTodos && (
                      <>
                        <button
                          type="button"
                          onClick={() => enviarWhatsAppGrupo(listaVisible, proveedorUnicoTodos)}
                          title={`Enviar los ${listaVisible.length} pedidos en un solo WhatsApp a ${proveedorUnicoTodos.name}`}
                          className="h-9 px-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-700 dark:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm5.76 14.12c-.24.68-1.41 1.3-1.95 1.38-.5.07-1.13.1-1.82-.12-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.37-.14-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.01-2.42.26-.29.58-.36.77-.36.19 0 .38 0 .55.01.18.01.42-.07.65.49.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.41.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.65-.14.27.1 1.68.79 1.97.94.29.14.48.22.55.34.07.12.07.69-.17 1.37Z" />
                          </svg>
                          <span>Enviar todo ({listaVisible.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void abrirLinkCatalogo(listaVisible, proveedorUnicoTodos)}
                          title="Abrir enlace consolidado de todos los pedidos"
                          aria-label="Abrir enlace consolidado"
                          className="h-9 w-9 rounded-full bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/35 text-purple-700 dark:text-purple-200 inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                        >
                          🔗
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            {listaVisible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 p-8 text-center bg-zinc-50/60 dark:bg-white/[0.02]">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  No hay ítems marcados para pedir en esta orden todavía.
                </p>
              </div>
            ) : (() => {
              const serviciosPedir = listaVisible.filter((it) => it.isService);
              const productosPedir = listaVisible.filter((it) => !it.isService);

              const renderGrupoPedir = (titulo: string, icono: string, grupoItems: PedidoItem[]) => {
                if (grupoItems.length === 0) return null;
                const totalCant = grupoItems.reduce((acc, it) => acc + (Number(it.qty) || 1), 0);
                return (
                  <div className="space-y-1.5">
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <span>{icono}</span>
                      <span>{titulo} ({totalCant}):</span>
                    </span>

                    <div className="rounded-xl border border-zinc-200/80 dark:border-white/10 bg-white dark:bg-black/20 shadow-2xs overflow-visible">
                      {/* Vista Móvil */}
                      <div className="sm:hidden divide-y divide-zinc-200/60 dark:divide-white/5">
                        {grupoItems.map((item) => {
                          const marcado = esItemMarcado(item);
                          const provActual = buscarProveedor(item.supplierId || item.supplierName);
                          const badge = getBadgeDetallePedir(item);
                          return (
                            <div key={`m-${item.isService ? "srv" : "rep"}-${item.id}`} className="p-3 space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                  <div className="inline-flex items-center border border-zinc-200 dark:border-white/10 rounded-xl overflow-hidden bg-zinc-50 dark:bg-white/[0.04] h-8 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => void handleUpdateQty(item, -1)}
                                      className="w-7 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-sm font-bold cursor-pointer"
                                    >
                                      −
                                    </button>
                                    <span className="w-7 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                                      {Number(item.qty) || 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => void handleUpdateQty(item, 1)}
                                      className="w-7 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-sm font-bold cursor-pointer"
                                    >
                                      +
                                    </button>
                                  </div>
                                  <span className="break-words">{formatearPrimeraMayusculaPedir(item.name)}</span>
                                  {item.isManual && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 shrink-0">
                                      Manual
                                    </span>
                                  )}
                                  {Array.isArray(item.fotos) && item.fotos.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFlotanteFotos({
                                          titulo: formatearPrimeraMayusculaPedir(item.name),
                                          fotos: item.fotos || [],
                                          fotoActivaIdx: 0,
                                        })
                                      }
                                      className="h-7 px-2 rounded-lg border bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                      title={`Ver ${item.fotos.length} foto(s)`}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                      </svg>
                                      {item.fotos.length > 1 && <span>{item.fotos.length}</span>}
                                    </button>
                                  )}
                                  {Array.isArray(item.audios) && item.audios.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFlotanteAudios({
                                          titulo: formatearPrimeraMayusculaPedir(item.name),
                                          audios: item.audios || [],
                                        })
                                      }
                                      className="h-7 px-2 rounded-lg border bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                      title={`Escuchar ${item.audios.length} audio(s)`}
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                      </svg>
                                      {item.audios.length > 1 && <span>{item.audios.length}</span>}
                                    </button>
                                  )}
                                </div>
                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {(() => {
                                  const nombreRaw = String(item.supplierName || "").trim();
                                  const esGenerico = !nombreRaw || nombreRaw.toLowerCase() === "proveedor general";
                                  const nombreMostrar = provActual?.name || (!esGenerico ? nombreRaw : "");
                                  return (
                                    <div className="flex-1 min-w-[130px]">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBusquedaProveedorFlotante("");
                                          setFlotanteProveedorGrupo({
                                            titulo: formatearPrimeraMayusculaPedir(item.name),
                                            targetIds: [item.id],
                                          });
                                        }}
                                        className={`h-9 rounded-lg border text-xs transition-colors cursor-pointer inline-flex items-center touch-manipulation ${nombreMostrar
                                          ? "w-full px-2.5 text-left truncate bg-purple-500/10 border-purple-500/30 text-zinc-900 dark:text-white font-medium hover:bg-purple-500/15"
                                          : "px-3 justify-center bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-400 hover:text-purple-400 hover:border-purple-400/40"
                                          }`}
                                        title={nombreMostrar ? `Proveedor: ${nombreMostrar}` : "Buscar y seleccionar proveedor"}
                                      >
                                        {nombreMostrar ? (
                                          <span className="truncate">{nombreMostrar}</span>
                                        ) : (
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
                                          </svg>
                                        )}
                                      </button>
                                    </div>
                                  );
                                })()}
                                <button
                                  type="button"
                                  onClick={() => void handleToggleMarcado(item)}
                                  className={`h-9 px-2.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-all shrink-0 ${marcado
                                    ? "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300"
                                    : "bg-zinc-100 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300"
                                    }`}
                                >
                                  {marcado ? "✓ Enviado" : "Pedir"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void enviarWhatsAppGrupo(obtenerItemsParaEnvio(item), provActual)}
                                  title="Enviar este pedido por WhatsApp"
                                  aria-label="Enviar por WhatsApp"
                                  className="h-9 w-9 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                                >
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm5.76 14.12c-.24.68-1.41 1.3-1.95 1.38-.5.07-1.13.1-1.82-.12-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.37-.14-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.01-2.42.26-.29.58-.36.77-.36.19 0 .38 0 .55.01.18.01.42-.07.65.49.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.41.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.65-.14.27.1 1.68.79 1.97.94.29.14.48.22.55.34.07.12.07.69-.17 1.37Z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void abrirLinkCatalogo(obtenerItemsParaEnvio(item), provActual)}
                                  title="Abrir página del pedido"
                                  aria-label="Abrir página del pedido"
                                  className="h-9 w-9 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-700 dark:text-purple-200 inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Vista Escritorio (ancho completo, sin scroll horizontal) */}
                      <div className="hidden sm:block">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-200/80 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold">
                              <th className="py-2 px-2 w-9 text-center">
                                <input
                                  type="checkbox"
                                  aria-label="Seleccionar todos"
                                  checked={
                                    grupoItems.length > 0 &&
                                    grupoItems.every((it) => Boolean(seleccionadosIds[it.id]))
                                  }
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSeleccionadosIds((prev) => {
                                      const next = { ...prev };
                                      grupoItems.forEach((it) => {
                                        if (checked) next[it.id] = true;
                                        else delete next[it.id];
                                      });
                                      return next;
                                    });
                                  }}
                                  className="w-3.5 h-3.5 rounded accent-purple-600 cursor-pointer"
                                />
                              </th>
                              <th className="py-2 px-2 w-20 text-center">Cant.</th>
                              <th className="py-2 px-3">Descripción</th>
                              <th className="py-2 px-2 w-24 text-center">Detalle</th>
                              <th className="py-2 px-2 w-52">Proveedor</th>
                              <th className="py-2 px-2 w-24 text-center">Enviar</th>
                              <th className="py-2 px-1 w-8 text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5">
                            {grupoItems.map((item) => {
                              const provActual = buscarProveedor(item.supplierId || item.supplierName);
                              const badge = getBadgeDetallePedir(item);
                              return (
                                <tr
                                  key={`${item.isService ? "srv" : "rep"}-${item.id}`}
                                  className="hover:bg-zinc-50/60 dark:hover:bg-white/[0.02] transition-colors"
                                >
                                  <td className="py-2.5 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      aria-label={`Seleccionar ${item.name}`}
                                      checked={Boolean(seleccionadosIds[item.id])}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setSeleccionadosIds((prev) => {
                                          const next = { ...prev };
                                          if (checked) next[item.id] = true;
                                          else delete next[item.id];
                                          return next;
                                        });
                                      }}
                                      className="w-3.5 h-3.5 rounded accent-purple-600 cursor-pointer"
                                    />
                                  </td>

                                  <td className="py-2.5 px-3 text-center">
                                    <div className="inline-flex items-center h-7 border border-zinc-200 dark:border-white/10 rounded-lg overflow-hidden bg-zinc-50 dark:bg-white/[0.04]">
                                      <button
                                        type="button"
                                        onClick={() => void handleUpdateQty(item, -1)}
                                        className="w-6 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                                      >
                                        −
                                      </button>
                                      <span className="w-6 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                        {Number(item.qty) || 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => void handleUpdateQty(item, 1)}
                                        className="w-6 h-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>

                                  <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200 max-w-0 w-full">
                                    <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                                      <span className="truncate">{formatearPrimeraMayusculaPedir(item.name)}</span>
                                      {item.isManual && (
                                        <span className="inline-flex items-center h-7 px-2 rounded-lg text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 shrink-0">
                                          Manual
                                        </span>
                                      )}
                                      {Array.isArray(item.fotos) && item.fotos.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setFlotanteFotos({
                                              titulo: formatearPrimeraMayusculaPedir(item.name),
                                              fotos: item.fotos || [],
                                              fotoActivaIdx: 0,
                                            })
                                          }
                                          className="h-7 px-2 rounded-lg border bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                          title={`Ver ${item.fotos.length} foto(s)`}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                          </svg>
                                          {item.fotos.length > 1 && <span>{item.fotos.length}</span>}
                                        </button>
                                      )}
                                      {Array.isArray(item.audios) && item.audios.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setFlotanteAudios({
                                              titulo: formatearPrimeraMayusculaPedir(item.name),
                                              audios: item.audios || [],
                                            })
                                          }
                                          className="h-7 px-2 rounded-lg border bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-300 inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer active:scale-95 transition-all shrink-0"
                                          title={`Escuchar ${item.audios.length} audio(s)`}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                          </svg>
                                          {item.audios.length > 1 && <span>{item.audios.length}</span>}
                                        </button>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-2.5 px-2 text-center">
                                    <span className={`inline-flex items-center justify-center h-7 px-2.5 rounded-lg text-[10px] font-semibold border whitespace-nowrap ${badge.cls}`}>
                                      {badge.label}
                                    </span>
                                  </td>

                                  <td className="py-2.5 px-2">
                                    {(() => {
                                      const nombreRaw = String(item.supplierName || "").trim();
                                      const esGenerico = !nombreRaw || nombreRaw.toLowerCase() === "proveedor general";
                                      const nombreMostrar = provActual?.name || (!esGenerico ? nombreRaw : "");
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setBusquedaProveedorFlotante("");
                                            setFlotanteProveedorGrupo({
                                              titulo: formatearPrimeraMayusculaPedir(item.name),
                                              targetIds: [item.id],
                                            });
                                          }}
                                          className={`h-7 rounded-lg border text-xs transition-colors cursor-pointer inline-flex items-center ${nombreMostrar
                                            ? "w-full px-2.5 text-left truncate bg-purple-500/10 border-purple-500/30 text-zinc-900 dark:text-white font-medium hover:bg-purple-500/15"
                                            : "w-8 justify-center bg-zinc-50 dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-400 hover:text-purple-400 hover:border-purple-400/40"
                                            }`}
                                          title={nombreMostrar ? `Proveedor: ${nombreMostrar}` : "Buscar y seleccionar proveedor"}
                                        >
                                          {nombreMostrar ? (
                                            <span className="truncate">{nombreMostrar}</span>
                                          ) : (
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
                                            </svg>
                                          )}
                                        </button>
                                      );
                                    })()}
                                  </td>

                                  <td className="py-2.5 px-3 text-center">
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => void enviarWhatsAppGrupo(obtenerItemsParaEnvio(item), provActual)}
                                        title="Enviar este pedido por WhatsApp con enlace"
                                        aria-label="Enviar por WhatsApp"
                                        className="h-7 w-7 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 inline-flex items-center justify-center cursor-pointer transition-colors"
                                      >
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm5.76 14.12c-.24.68-1.41 1.3-1.95 1.38-.5.07-1.13.1-1.82-.12-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.37-.14-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.01-2.42.26-.29.58-.36.77-.36.19 0 .38 0 .55.01.18.01.42-.07.65.49.24.58.82 2 .89 2.14.07.14.12.31.02.5-.1.19-.15.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.58.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.41.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.38-.24.65-.14.27.1 1.68.79 1.97.94.29.14.48.22.55.34.07.12.07.69-.17 1.37Z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void abrirLinkCatalogo(obtenerItemsParaEnvio(item), provActual)}
                                        title="Abrir página de pedido para este ítem"
                                        className="h-7 px-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-700 dark:text-purple-200 text-[11px] font-semibold cursor-pointer transition-colors"
                                      >
                                        🔗
                                      </button>
                                    </div>
                                  </td>

                                  <td className="py-2.5 px-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => void handleToggleMarcado(item)}
                                      title="Quitar de la lista de pedidos"
                                      className="w-7 h-7 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 inline-flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
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
                  </div>
                );
              };

              return (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-zinc-200/90 dark:border-white/10 shadow-2xs space-y-3.5">
                  {renderGrupoPedir("Servicios", "🔧", serviciosPedir)}
                  {renderGrupoPedir("Productos", "📦", productosPedir)}
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      {/* MODAL FLOTANTE MINIMALISTA DE FOTOS */}
      {flotanteFotos && (
        <div
          onClick={() => setFlotanteFotos(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-4 sm:p-5 space-y-3.5 shadow-2xl animate-scale-up text-zinc-900 dark:text-white"
          >
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
                    {flotanteFotos.titulo}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {flotanteFotos.fotos.length} foto(s)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFlotanteFotos(null)}
                className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {flotanteFotos.fotos.length > 0 && (
              <div className="space-y-3">
                <div className="relative aspect-video sm:aspect-4/3 w-full rounded-2xl overflow-hidden bg-black/90 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center group">
                  <img
                    src={flotanteFotos.fotos[flotanteFotos.fotoActivaIdx]}
                    alt={`Foto ${flotanteFotos.fotoActivaIdx + 1}`}
                    className="w-full h-full object-contain"
                  />
                  {flotanteFotos.fotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setFlotanteFotos((prev) =>
                            prev ? { ...prev, fotoActivaIdx: (prev.fotoActivaIdx - 1 + prev.fotos.length) % prev.fotos.length } : null
                          )
                        }
                        className="absolute left-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-sm backdrop-blur-xs cursor-pointer"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFlotanteFotos((prev) =>
                            prev ? { ...prev, fotoActivaIdx: (prev.fotoActivaIdx + 1) % prev.fotos.length } : null
                          )
                        }
                        className="absolute right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-sm backdrop-blur-xs cursor-pointer"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
                {flotanteFotos.fotos.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {flotanteFotos.fotos.map((f, idx) => (
                      <button
                        key={`thumb-${idx}`}
                        type="button"
                        onClick={() => setFlotanteFotos((prev) => (prev ? { ...prev, fotoActivaIdx: idx } : null))}
                        className={`w-14 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${flotanteFotos.fotoActivaIdx === idx
                          ? "border-blue-500 scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                      >
                        <img src={f} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE MINIMALISTA DE AUDIOS */}
      {flotanteAudios && (
        <div
          onClick={() => setFlotanteAudios(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#121216] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-md w-full p-4 shadow-2xl animate-scale-up text-zinc-900 dark:text-white space-y-3"
          >
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {flotanteAudios.audios.map((aud: any, aIdx: number) => (
                <div
                  key={aud.id || `aud-${aIdx}`}
                  className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Audio #{aIdx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {aud.durationSeconds && (
                        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                          {Math.floor(aud.durationSeconds / 60)}:{(aud.durationSeconds % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                      {aIdx === 0 && (
                        <button
                          type="button"
                          onClick={() => setFlotanteAudios(null)}
                          className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                          title="Cerrar"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <MiniAudioPlayer src={aud.url} initialDuration={aud.durationSeconds} />
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
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE PARA BUSCAR Y ASIGNAR PROVEEDOR */}
      {flotanteProveedorGrupo && (
        <div
          onClick={() => setFlotanteProveedorGrupo(null)}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white/95 dark:bg-[#111116]/95 backdrop-blur-xl border border-zinc-200/80 dark:border-white/[0.08] rounded-xl max-w-sm w-full overflow-hidden shadow-2xl animate-scale-up text-zinc-900 dark:text-white"
          >
            {/* Buscador minimalista + botón cerrar */}
            <div className="p-3 flex items-center gap-2">
              <div className="relative flex-1">
                <svg
                  className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
                </svg>
                <input
                  type="text"
                  autoFocus
                  value={busquedaProveedorFlotante}
                  onChange={(e) => setBusquedaProveedorFlotante(e.target.value)}
                  placeholder="Buscar proveedor..."
                  className="w-full h-10 sm:h-9 pl-8.5 pr-3 rounded-lg bg-zinc-100/80 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/[0.08] text-base sm:text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-purple-500/60 focus:bg-white dark:focus:bg-white/[0.06] transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => setFlotanteProveedorGrupo(null)}
                aria-label="Cerrar"
                className="w-9 h-9 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] border border-zinc-200/70 dark:border-white/[0.08] flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Lista de proveedores */}
            <div className="max-h-64 overflow-y-auto border-t border-zinc-100 dark:border-white/[0.06] p-1.5 space-y-0.5">
              {(() => {
                const q = busquedaProveedorFlotante.trim().toLowerCase();
                const lista = q
                  ? proveedores.filter(
                    (p) =>
                      p.name.toLowerCase().includes(q) ||
                      (p.phone && p.phone.toLowerCase().includes(q))
                  )
                  : proveedores;
                if (lista.length === 0) {
                  return (
                    <div className="py-6 text-center text-xs text-zinc-400">
                      {proveedores.length === 0
                        ? "No hay proveedores registrados en Oficina"
                        : "Sin proveedores que coincidan"}
                    </div>
                  );
                }
                return lista.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void handleAplicarProveedorGrupo(p.id, flotanteProveedorGrupo.targetIds)}
                    className="w-full px-3 py-2 rounded-lg text-left text-xs flex items-center justify-between gap-2 text-zinc-800 dark:text-zinc-200 hover:bg-purple-500/12 hover:text-purple-700 dark:hover:text-purple-200 cursor-pointer transition-colors group"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    {p.phone ? (
                      <span className="text-[11px] font-mono text-zinc-400 group-hover:text-purple-400 shrink-0">
                        {p.phone}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 shrink-0">Sin WhatsApp</span>
                    )}
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
