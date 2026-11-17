"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface RecibidoItem {
  id: string;
  name: string;
  qty: number;
  isService?: boolean;
  supplierAvailability?: string | null;
  supplierPrice?: number | null;
  supplierId?: string | null;
  supplierName?: string | null;
  supplierPhone?: string | null;
  deliveryTime?: string | null;
  supplierNotes?: string | null;
  supplierRespondedAt?: string | null;
}

interface ProveedorInfo {
  id: string;
  name?: string;
  phone?: string;
}

interface OrdenResumen {
  id: string;
  orderNumber?: string;
  vehicle?: string;
  plate?: string;
  client?: string;
  items?: RecibidoItem[];
  services?: RecibidoItem[];
}

export default function RecibidosProveedorPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? decodeURIComponent(params.id) : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orden, setOrden] = useState<OrdenResumen | null>(null);
  const [proveedores, setProveedores] = useState<ProveedorInfo[]>([]);
  const [filtro, setFiltro] = useState<"TODOS" | "SI_HAY" | "NO_HAY">("TODOS");

  const cargarDatos = useCallback(
    async (silencioso = false) => {
      if (!id) return;
      if (!silencioso) setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/presupuestos/detalle?id=${encodeURIComponent(id)}&t=${Date.now()}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok || !data?.success || !data?.order) {
          throw new Error(data?.error || "No se pudo cargar la orden");
        }
        setOrden(data.order);
        if (Array.isArray(data.proveedores)) {
          setProveedores(data.proveedores);
        }
      } catch (err: any) {
        if (!silencioso) {
          setError(err?.message || "Error al cargar respuestas recibidas");
        }
      } finally {
        if (!silencioso) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    cargarDatos(false);
  }, [cargarDatos]);

  useRealtimeSync({
    channels: ["presupuestos", "taller"],
    onRefresh: () => cargarDatos(true),
  });

  const itemsRespondidos = useMemo(() => {
    if (!orden) return [];
    const vistos = new Set<string>();
    const combinados: RecibidoItem[] = [];
    const lista = [
      ...(Array.isArray(orden.services)
        ? orden.services.map((s) => ({ ...s, isService: true }))
        : []),
      ...(Array.isArray(orden.items)
        ? orden.items.map((r) => ({ ...r, isService: false }))
        : []),
    ];
    for (const it of lista) {
      if (
        it.supplierAvailability !== "SI_HAY" &&
        it.supplierAvailability !== "NO_HAY"
      ) {
        continue;
      }
      const key = String(it.id || `${it.isService ? "s" : "r"}-${it.name}`);
      if (vistos.has(key)) continue;
      vistos.add(key);
      combinados.push(it);
    }
    return combinados.sort((a, b) => {
      const ta = a.supplierRespondedAt ? new Date(a.supplierRespondedAt).getTime() : 0;
      const tb = b.supplierRespondedAt ? new Date(b.supplierRespondedAt).getTime() : 0;
      return tb - ta;
    });
  }, [orden]);

  const totalSiHay = useMemo(
    () => itemsRespondidos.filter((i) => i.supplierAvailability === "SI_HAY").length,
    [itemsRespondidos]
  );
  const totalNoHay = itemsRespondidos.length - totalSiHay;

  const itemsFiltrados = useMemo(() => {
    if (filtro === "TODOS") return itemsRespondidos;
    return itemsRespondidos.filter((i) => i.supplierAvailability === filtro);
  }, [itemsRespondidos, filtro]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      <Header />

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        <div className="bg-white dark:bg-[#111114] border border-zinc-200 dark:border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push(`/presupuestos/${encodeURIComponent(id)}`)}
              title="Volver a la orden"
              className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-zinc-200 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shrink-0 cursor-pointer transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white">
                  Recibidos
                </h1>
                {orden?.orderNumber && (
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.06] text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300">
                    #{orden.orderNumber}
                  </span>
                )}
              </div>
              {orden && (
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {[orden.vehicle, orden.plate, orden.client].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => router.push(`/presupuestos/${encodeURIComponent(id)}/pedir`)}
              className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Ir a Pedir
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFiltro("TODOS")}
              className={`h-8 px-3 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                filtro === "TODOS"
                  ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                  : "bg-white dark:bg-[#111114] text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/[0.05]"
              }`}
            >
              Todos ({itemsRespondidos.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("SI_HAY")}
              className={`h-8 px-3 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                filtro === "SI_HAY"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
              }`}
            >
              ✓ Sí hay ({totalSiHay})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("NO_HAY")}
              className={`h-8 px-3 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                filtro === "NO_HAY"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
              }`}
            >
              ✕ No hay ({totalNoHay})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-[#111114] border border-zinc-200 dark:border-white/10 rounded-2xl p-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Cargando respuestas recibidas...
          </div>
        ) : error ? (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
            <button
              type="button"
              onClick={() => cargarDatos(false)}
              className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="bg-white dark:bg-[#111114] border border-zinc-200 dark:border-white/10 rounded-2xl p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
              {itemsRespondidos.length === 0
                ? "Sin respuestas de proveedores aún."
                : "No hay elementos en este filtro."}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Cuando un proveedor responda desde el enlace enviado, aparecerá aquí automáticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {itemsFiltrados.map((it) => {
              const siHay = it.supplierAvailability === "SI_HAY";
              const provMatch = proveedores.find(
                (p) =>
                  (it.supplierId && p.id === it.supplierId) ||
                  (it.supplierName &&
                    String(p.name || "").trim().toLowerCase() ===
                      String(it.supplierName || "").trim().toLowerCase())
              );
              const proveedorNombre = it.supplierName || provMatch?.name || "Proveedor";
              const proveedorWhatsapp = it.supplierPhone || provMatch?.phone || "";
              const fechaResp = it.supplierRespondedAt
                ? new Date(it.supplierRespondedAt).toLocaleString("es-EC", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <div
                  key={`${it.isService ? "s" : "r"}-${it.id}`}
                  className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    siHay
                      ? "bg-emerald-500/[0.06] border-emerald-500/25"
                      : "bg-rose-500/[0.06] border-rose-500/25"
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          siHay
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {siHay ? "✓ Sí hay" : "✕ No hay"}
                      </span>
                      <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {it.qty}x
                      </span>
                      <span className="text-base font-bold text-zinc-900 dark:text-white break-words">
                        {it.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-sm sm:text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-semibold text-purple-600 dark:text-purple-300">
                        Proveedor: {proveedorNombre}
                      </span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        WhatsApp: {proveedorWhatsapp || "Sin número"}
                      </span>
                      {it.deliveryTime && <span>Envío: {it.deliveryTime}</span>}
                      {fechaResp && <span>{fechaResp}</span>}
                    </div>
                    {it.supplierNotes && (
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-100/80 dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 rounded-lg px-2.5 py-1.5">
                        Detalle: {it.supplierNotes}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-lg font-black font-mono ${
                        siHay
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-400 line-through"
                      }`}
                    >
                      ${Number(it.supplierPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
