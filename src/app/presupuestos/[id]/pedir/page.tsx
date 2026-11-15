"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

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
  const [proveedorGlobalId, setProveedorGlobalId] = useState<string>("");
  const [mostrarTodosItems, setMostrarTodosItems] = useState(false);

  // Crear proveedor rápido inline
  const [mostrarNuevoProv, setMostrarNuevoProv] = useState(false);
  const [nuevoProvNombre, setNuevoProvNombre] = useState("");
  const [nuevoProvTelefono, setNuevoProvTelefono] = useState("");
  const [creandoProv, setCreandoProv] = useState(false);

  // Toast estilo Orden de Propuesta
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);
  const mostrarToast = (msg: string, tipo: "ok" | "err" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3200);
  };

  const cargarDatos = useCallback(async () => {
    if (!id) return;
    try {
      setCargando(true);
      setError(null);
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
        Array.isArray(dataDet.proveedores) && dataDet.proveedores.length > 0
          ? dataDet.proveedores
          : Array.isArray(dataProv?.proveedores) && dataProv.proveedores.length > 0
            ? dataProv.proveedores
            : PROVEEDORES_RESPALDO;

      setProveedores(listaProv);
      if (listaProv.length > 0) {
        setProveedorGlobalId((prev) => prev || listaProv[0].id);
      }
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

  const listaVisible = useMemo(() => {
    if (mostrarTodosItems) return [...repuestos, ...servicios];
    return itemsMarcados;
  }, [mostrarTodosItems, repuestos, servicios, itemsMarcados]);

  const guardarCambiosEnServidor = async (
    nuevosRepuestos: PedidoItem[],
    nuevosServicios: PedidoItem[],
    mensajeExito?: string
  ) => {
    if (!orden) return false;
    try {
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

  // Asignar proveedor a TODA LA LISTA marcada
  const handleAsignarProveedorATodos = async (provId: string) => {
    const prov = proveedores.find((p) => p.id === provId);
    if (!prov) {
      mostrarToast("Selecciona un proveedor primero", "err");
      return;
    }
    const idsTarget = new Set(
      (itemsMarcados.length > 0 ? itemsMarcados : listaVisible).map((it) => it.id)
    );
    if (idsTarget.size === 0) {
      mostrarToast("No hay pedidos marcados en la lista", "err");
      return;
    }

    const actualizar = (arr: PedidoItem[]) =>
      arr.map((it) =>
        idsTarget.has(it.id)
          ? {
              ...it,
              enviadoProveedor: true,
              inStock: false,
              purchaseStatus:
                it.purchaseStatus === "COTIZADO" ? "COTIZADO" : "PEDIDO_WHATSAPP",
              supplierId: prov.id,
              supplierName: prov.name,
              supplierPhone: prov.phone || "",
            }
          : it
      );

    const nuevosRep = actualizar(repuestos);
    const nuevosSrv = actualizar(servicios);
    setRepuestos(nuevosRep);
    setServicios(nuevosSrv);

    await guardarCambiosEnServidor(
      nuevosRep,
      nuevosSrv,
      `Toda la lista (${idsTarget.size}) asignada a ${prov.name}`
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

  // Registrar proveedor nuevo rápido
  const handleCrearProveedorRapido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProvNombre.trim()) {
      mostrarToast("Escribe el nombre del proveedor", "err");
      return;
    }
    try {
      setCreandoProv(true);
      const res = await fetch("/api/presupuestos/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nuevoProvNombre.trim(),
          phone: nuevoProvTelefono.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.proveedor) {
        const nuevo: Proveedor = data.proveedor;
        setProveedores((prev) => [nuevo, ...prev]);
        setProveedorGlobalId(nuevo.id);
        setNuevoProvNombre("");
        setNuevoProvTelefono("");
        setMostrarNuevoProv(false);
        mostrarToast(`Proveedor "${nuevo.name}" creado`, "ok");
      } else {
        mostrarToast(data?.error || "No se pudo crear el proveedor", "err");
      }
    } catch {
      mostrarToast("Error al crear proveedor", "err");
    } finally {
      setCreandoProv(false);
    }
  };

  const construirLinkCatalogo = (itemsGrupo: PedidoItem[], prov?: Proveedor) => {
    if (!orden || typeof window === "undefined") return "";
    const query = new URLSearchParams();
    if (itemsGrupo.length > 0) {
      query.set("items", itemsGrupo.map((i) => String(i.id)).join(","));
    }
    if (prov?.name) query.set("supplier", prov.name);
    if (prov?.phone) query.set("phone", prov.phone);
    if (orden?.supplierSig) query.set("sig", orden.supplierSig);
    return `${window.location.origin}/pedidos-proveedor/${orden.id}?${query.toString()}`;
  };

  const enviarWhatsAppGrupo = (itemsGrupo: PedidoItem[], prov?: Proveedor) => {
    if (!orden || itemsGrupo.length === 0) return;
    const link = construirLinkCatalogo(itemsGrupo, prov);
    const vehiculoInfo = `${orden.vehicle || "Vehículo"} (Placa: ${orden.plate || "N/A"})`;
    const detalle = itemsGrupo.map((it) => `• ${it.qty || 1}x ${it.name}`).join("\n");
    const mensaje = encodeURIComponent(
      `Hola${prov?.name ? ` ${prov.name}` : ""}, solicito cotización para el vehículo ${vehiculoInfo}:\n${detalle}\n\nAbre el catálogo del proveedor para confirmar disponibilidad, precio y tiempo de entrega:\n${link}`
    );
    const phoneClean = (prov?.phone || "").replace(/[^0-9]/g, "");
    const url = phoneClean
      ? `https://wa.me/${phoneClean}?text=${mensaje}`
      : `https://wa.me/?text=${mensaje}`;
    window.open(url, "_blank");
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
    onRefresh: () => cargarDatos(),
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
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans pb-16 text-zinc-900 dark:text-white selection:bg-purple-500/30">
      {/* Toast estilo Orden de Propuesta */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold flex items-center gap-2 ${
            toast.tipo === "ok"
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
        {/* Barra superior de acciones */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href={`/presupuestos/${encodeURIComponent(orden.id)}`}
              aria-label="Volver a Orden de Propuesta"
              title="Volver a Orden de Propuesta"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600 dark:border-white/10 dark:bg-[#0d0d0e] dark:text-zinc-300 dark:hover:border-purple-500/40 dark:hover:bg-purple-500/15 dark:hover:text-purple-300"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
                <path d="M20 12H9" />
              </svg>
            </Link>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                Pedidos a Proveedor
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-zinc-200/80 dark:bg-white/10 text-zinc-700 dark:text-zinc-200">
                #{numeroOrdenLimpio}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold bg-purple-500/15 border-purple-400/35 text-purple-700 dark:text-purple-200">
                {itemsMarcados.length} {itemsMarcados.length === 1 ? "pedido" : "pedidos"}
              </span>
              {guardando && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400 animate-pulse">
                  Guardando...
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setMostrarTodosItems((prev) => !prev)}
              className={`h-9 px-3.5 rounded-xl text-xs sm:text-sm font-medium border transition-all cursor-pointer ${
                mostrarTodosItems
                  ? "bg-purple-500/15 border-purple-400/45 text-purple-700 dark:text-purple-200 shadow-sm"
                  : "bg-white dark:bg-white/[0.06] border-zinc-200 dark:border-white/15 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.12]"
              }`}
            >
              {mostrarTodosItems ? "Ver solo pedidos" : "Ver todos los ítems"}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/presupuestos/${encodeURIComponent(orden.id)}`)}
              className="h-9 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              ← Volver a la Propuesta
            </button>
          </div>
        </div>

        {/* Tarjeta Principal blanca/oscura idéntica a Orden de Propuesta */}
        <div className="bg-white dark:bg-[#0f0f13] border border-zinc-200 dark:border-white/10 rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl space-y-6 transition-all">
          {/* Cabecera limpia de la orden (estilo documento Orden de Propuesta) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-white/10">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-purple-600 dark:text-purple-300">
                Gestión de Compras y Proveedores
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                Orden #{numeroOrdenLimpio} · {vehiculoStr}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                {orden.plate ? `Placa ${orden.plate}` : "Sin placa"}
                {orden.client ? ` · Cliente: ${orden.client}` : ""}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
              <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] px-3.5 py-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pedidos</p>
                <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">{itemsMarcados.length}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] px-3.5 py-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Proveedores</p>
                <p className="text-base sm:text-lg font-bold text-purple-600 dark:text-purple-300">{gruposPorProveedor.length}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] px-3.5 py-2.5 text-center">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Sin asignar</p>
                <p className={`text-base sm:text-lg font-bold ${sinProveedorCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {sinProveedorCount}
                </p>
              </div>
            </div>
          </div>

          {/* Barra rápida: Asignar proveedor a toda la lista */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.03] p-4 sm:p-5 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Asignar proveedor a toda la lista
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Elige un proveedor para aplicarlo a todos los pedidos marcados o selecciona uno por cada fila.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={proveedorGlobalId}
                  onChange={(e) => setProveedorGlobalId(e.target.value)}
                  className="h-9 min-w-[220px] px-3 rounded-xl bg-white dark:bg-[#17171f] border border-zinc-300 dark:border-white/15 text-xs sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `(${p.phone})` : ""}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={!proveedorGlobalId || guardando || (itemsMarcados.length === 0 && listaVisible.length === 0)}
                  onClick={() => void handleAsignarProveedorATodos(proveedorGlobalId)}
                  className="h-9 px-4 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 disabled:opacity-40 border border-purple-400/45 text-purple-700 dark:text-purple-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  Aplicar a todos
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarNuevoProv((prev) => !prev)}
                  className="h-9 px-3 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-zinc-100 dark:hover:bg-white/[0.12] border border-zinc-300 dark:border-white/15 text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer"
                >
                  + Nuevo proveedor
                </button>
              </div>
            </div>

            {mostrarNuevoProv && (
              <form
                onSubmit={handleCrearProveedorRapido}
                className="pt-3 border-t border-zinc-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <input
                  type="text"
                  value={nuevoProvNombre}
                  onChange={(e) => setNuevoProvNombre(e.target.value)}
                  placeholder="Nombre del proveedor (ej. Repuestos Quito)"
                  className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-[#17171f] border border-zinc-300 dark:border-white/15 text-xs text-zinc-900 dark:text-white"
                />
                <input
                  type="text"
                  value={nuevoProvTelefono}
                  onChange={(e) => setNuevoProvTelefono(e.target.value)}
                  placeholder="WhatsApp (ej. 593991234567)"
                  className="sm:w-52 h-9 px-3 rounded-xl bg-white dark:bg-[#17171f] border border-zinc-300 dark:border-white/15 text-xs text-zinc-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={creandoProv}
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  {creandoProv ? "Creando..." : "Guardar"}
                </button>
              </form>
            )}
          </div>

          {/* Cuerpo principal: Tabla de pedidos (2/3) + Envío agrupado por proveedor (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Tabla estilo Orden de Propuesta */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {mostrarTodosItems ? `Todos los ítems de la orden (${listaVisible.length})` : `Pedidos por enviar (${listaVisible.length})`}
                </h3>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Marca, asigna proveedor y envía por WhatsApp
                </span>
              </div>

              {listaVisible.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/15 p-8 text-center space-y-3 bg-zinc-50/60 dark:bg-white/[0.02]">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    No hay ítems marcados para pedir en esta orden todavía.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMostrarTodosItems(true)}
                    className="h-9 px-4 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/40 text-purple-700 dark:text-purple-200 text-xs font-semibold cursor-pointer"
                  >
                    Ver todos los ítems de la orden
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-white/10">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.03] text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        <th className="py-2.5 px-3 w-10 text-center">Pedir</th>
                        <th className="py-2.5 px-3">Ítem / Detalle</th>
                        <th className="py-2.5 px-3">Proveedor</th>
                        <th className="py-2.5 px-3 text-right">Enviar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/80 dark:divide-white/10 text-xs sm:text-sm">
                      {listaVisible.map((item) => {
                        const marcado = esItemMarcado(item);
                        const provActual = buscarProveedor(item.supplierId || item.supplierName);
                        return (
                          <tr
                            key={`${item.isService ? "srv" : "rep"}-${item.id}`}
                            className={`transition-colors ${
                              marcado
                                ? "hover:bg-zinc-50/80 dark:hover:bg-white/[0.02]"
                                : "opacity-60 hover:opacity-100"
                            }`}
                          >
                            <td className="py-3 px-3 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => void handleToggleMarcado(item)}
                                title={marcado ? "Quitar de pedidos marcados" : "Marcar para pedir"}
                                className={`w-5 h-5 rounded-md border inline-flex items-center justify-center cursor-pointer transition-colors ${
                                  marcado
                                    ? "bg-purple-600 border-purple-500 text-white"
                                    : "border-zinc-400 dark:border-zinc-600 text-transparent"
                                }`}
                              >
                                ✓
                              </button>
                            </td>

                            <td className="py-3 px-3 align-middle">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-zinc-900 dark:text-white">
                                  {item.qty}x {item.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                    item.isService
                                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/25"
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/25"
                                  }`}
                                >
                                  {item.isService ? "Servicio" : "Repuesto"}
                                </span>
                                {item.code && (
                                  <span className="text-[11px] font-mono text-zinc-500">{item.code}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {provActual || item.supplierName ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    {provActual?.name || item.supplierName}
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    Sin proveedor asignado
                                  </span>
                                )}
                                {typeof item.price === "number" && item.price > 0
                                  ? ` · Ref. $${Number(item.price).toFixed(2)}`
                                  : ""}
                              </p>
                            </td>

                            <td className="py-3 px-3 align-middle">
                              <select
                                value={provActual?.id || ""}
                                onChange={(e) => void handleAsignarProveedorItem(item, e.target.value)}
                                className="h-9 w-full min-w-[165px] max-w-[220px] px-2.5 rounded-xl bg-white dark:bg-[#17171f] border border-zinc-300 dark:border-white/15 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="">Asignar proveedor...</option>
                                {proveedores.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-3 px-3 text-right align-middle">
                              <button
                                type="button"
                                onClick={() => enviarWhatsAppGrupo([item], provActual)}
                                title="Enviar este pedido por WhatsApp"
                                className="h-9 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold cursor-pointer transition-colors"
                              >
                                WhatsApp
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Envío agrupado por proveedor (1/3) */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white px-1">
                Mandar a proveedores
              </h3>

              {gruposPorProveedor.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] p-5 text-xs text-zinc-500 dark:text-zinc-400">
                  Marca o asigna pedidos para ver aquí cada grupo listo para enviar al proveedor.
                </div>
              ) : (
                <div className="space-y-3">
                  {gruposPorProveedor.map((grupo) => (
                    <div
                      key={grupo.key}
                      className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.03] p-4 space-y-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {grupo.nombre}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {grupo.items.length} {grupo.items.length === 1 ? "ítem" : "ítems"}
                          {grupo.prov?.phone ? ` · ${grupo.prov.phone}` : ""}
                        </p>
                      </div>

                      <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300 border-t border-zinc-200/70 dark:border-white/10 pt-2">
                        {grupo.items.map((it) => (
                          <li key={it.id} className="truncate">
                            • {it.qty}x {it.name}
                          </li>
                        ))}
                      </ul>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => enviarWhatsAppGrupo(grupo.items, grupo.prov)}
                          className="flex-1 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Enviar por WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const url = construirLinkCatalogo(grupo.items, grupo.prov);
                            if (url) window.open(url, "_blank");
                          }}
                          className="h-9 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-700 dark:text-purple-200 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Catálogo
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
