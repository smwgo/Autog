"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

interface OilChangeRecord {
  id: string;
  orderNumber: string;
  fecha: string;
  fechaMs: number;
  kilometraje: number;
  mecanico: string;
  cliente: string;
  placa: string;
  vehiculo: string;
  aceites: Array<{
    nombre: string;
    marca?: string;
    viscosidad?: string;
    presentacion?: string;
    cantidad?: number;
    precio?: number;
  }>;
  filtros: Array<{
    nombre: string;
    precio?: number;
  }>;
  otrosServicios?: string[];
  total?: number;
  notas?: string;
}

function calcularTiempoTranscurrido(fechaMs: number, fechaStr?: string): { texto: string; colorClass: string } {
  let ms = fechaMs;
  if (!ms || !Number.isFinite(ms)) {
    if (fechaStr) {
      ms = new Date(fechaStr).getTime();
    }
  }
  if (!ms || !Number.isFinite(ms)) {
    return {
      texto: "Registrado",
      colorClass: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300 border border-zinc-200 dark:border-white/10",
    };
  }

  const ahora = Date.now();
  const diffMs = ahora - ms;
  const unDiaMs = 1000 * 60 * 60 * 24;
  const dias = Math.floor(diffMs / unDiaMs);

  if (dias <= 0) {
    return {
      texto: "Hoy",
      colorClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30",
    };
  }
  if (dias === 1) {
    return {
      texto: "Ayer",
      colorClass: "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30",
    };
  }
  if (dias < 7) {
    return {
      texto: `Hace ${dias}d`,
      colorClass: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30",
    };
  }
  if (dias < 14) {
    return {
      texto: "Hace 1 sem",
      colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30",
    };
  }
  if (dias < 21) {
    return {
      texto: "Hace 2 sem",
      colorClass: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30",
    };
  }
  if (dias < 30) {
    return {
      texto: "Hace 3 sem",
      colorClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30",
    };
  }
  const meses = Math.floor(dias / 30);
  if (meses === 1) {
    return {
      texto: "Hace 1 mes",
      colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30",
    };
  }
  if (meses < 6) {
    return {
      texto: `Hace ${meses}m`,
      colorClass: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30",
    };
  }
  if (meses < 12) {
    return {
      texto: `Hace ${meses}m`,
      colorClass: "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 border border-orange-300 dark:border-orange-500/30",
    };
  }
  const anios = Math.floor(meses / 12);
  return {
    texto: anios === 1 ? "Hace 1 año" : `Hace ${anios} años`,
    colorClass: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30",
  };
}

function HistorialAceitesContenido() {
  const searchParams = useSearchParams();
  const placa = (searchParams.get("placa") || searchParams.get("busqueda") || searchParams.get("q") || "").toUpperCase().trim();
  const cliente = searchParams.get("cliente") || "";
  const vehiculo = searchParams.get("vehiculo") || "";

  const [cargando, setCargando] = useState(true);
  const [todosLosCambiosGlobal, setTodosLosCambiosGlobal] = useState<OilChangeRecord[]>([]);

  // 1. Cargar historial y órdenes desde las APIs
  const cargarTodosLosDatos = useCallback(async (placaABuscar: string) => {
    try {
      setCargando(true);
      const placaActual = placaABuscar.trim();

      const fetches: Promise<any>[] = [
        fetch("/api/taller/ordenes", { cache: "no-store" }).catch(() => null),
        fetch("/api/taller/historial", { cache: "no-store" }).catch(() => null),
      ];

      if (placaActual) {
        fetches.push(
          fetch(`/api/taller/operacion?plate=${encodeURIComponent(placaActual)}&historial=true`, { cache: "no-store" }).catch(() => null)
        );
      }

      const results = await Promise.all(fetches);
      const resOrdenes = results[0];
      const resHistorial = results[1];
      const resOperacion = results[2];

      const dataOrdenes = resOrdenes && resOrdenes.ok ? await resOrdenes.json() : null;
      const dataHistorial = resHistorial && resHistorial.ok ? await resHistorial.json() : null;
      const dataOperacion = resOperacion && resOperacion.ok ? await resOperacion.json() : null;

      const baseOrders: any[] = Array.isArray(dataOrdenes?.orders)
        ? dataOrdenes.orders
        : Array.isArray(dataOrdenes?.data)
        ? dataOrdenes.data
        : dataOrdenes?.order
        ? [dataOrdenes.order]
        : [];

      const operacionOrders: any[] = Array.isArray(dataOperacion?.orders) ? dataOperacion.orders : [];
      const ordersList: any[] = [...baseOrders, ...operacionOrders];

      const baseHistory: any[] = Array.isArray(dataHistorial?.history)
        ? dataHistorial.history
        : [];
      const operacionHistory: any[] = Array.isArray(dataOperacion?.history) ? dataOperacion.history : [];
      const historyList: any[] = [...baseHistory, ...operacionHistory];

      const normalizar = (txt: any) =>
        String(txt || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();

      const esProductoAceite = (it: any) => {
        if (!it) return false;
        if (it.lubCategoryId === "lub_aceite") return true;
        if (it.lubSubcategoryId === "lub_aceite_motor") return true;
        const code = String(it.code || "").toUpperCase();
        if (code.startsWith("OIL-") || code.startsWith("LUB-OIL")) return true;
        const n = normalizar(it.name || "");
        const fn = normalizar(it.fullName || "");
        const c = normalizar(it.category || "");
        const sub = normalizar(it.subCategory || "");
        return (
          n.includes("aceite") ||
          fn.includes("aceite") ||
          c.includes("aceite") ||
          sub.includes("aceite") ||
          /\d{1,2}w-?\d{2}/i.test(n) ||
          /\d{1,2}w-?\d{2}/i.test(fn)
        );
      };

      const esFiltroAceite = (it: any) => {
        if (!it) return false;
        if (it.lubCategoryId === "lub_filtros" && it.lubSubcategoryId === "lub_fil_aceite") return true;
        const code = String(it.code || "").toUpperCase();
        if (code.includes("FIL-OIL") || code.includes("FIL-ACEITE")) return true;
        const n = normalizar(it.name || "");
        const fn = normalizar(it.fullName || "");
        return (
          (n.includes("filtro") && n.includes("aceite")) ||
          (fn.includes("filtro") && fn.includes("aceite"))
        );
      };

      const extraerViscosidad = (texto: string) => {
        const m = String(texto).match(/\b(\d{1,2}W-\d{2})\b/i);
        return m ? m[1].toUpperCase() : undefined;
      };

      // Mapear órdenes de trabajo
      const ordenesMapeadas: OilChangeRecord[] = [];
      for (const ord of ordersList) {
        const items: any[] = Array.isArray(ord.items) ? ord.items : [];
        const itemsAceite = items.filter(esProductoAceite);
        const itemsFiltro = items.filter(esFiltroAceite);

        // Si no tiene items específicos de aceite pero services menciona aceite
        const servicesList: any[] = Array.isArray(ord.services) ? ord.services : [];
        const serviceConAceite = servicesList.find((s: any) => {
          const txt = typeof s === "string" ? s : s?.name || "";
          return (
            normalizar(txt).includes("aceite") ||
            /\d{1,2}w-?\d{2}/i.test(normalizar(txt))
          );
        });

        if (itemsAceite.length === 0 && !serviceConAceite) {
          continue;
        }

        const fechaRaw = ord.dateIn || ord.createdAt || ord.updatedAt || 0;
        const fechaMs = new Date(fechaRaw).getTime();
        const fechaStr =
          Number.isFinite(fechaMs) && fechaMs > 0
            ? new Date(fechaMs).toLocaleDateString("es-EC", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })
            : "Sin fecha";

        const km = Number(ord.mileage) || 0;

        const aceitesFormateados =
          itemsAceite.length > 0
            ? itemsAceite.map((it) => ({
                nombre: it.fullName || it.name || "Aceite de Motor",
                marca: it.brand,
                viscosidad: extraerViscosidad(it.fullName || it.name || "") || it.viscosity,
                presentacion: it.presentation || it.unitOfMeasure || "Galón",
                cantidad: Number(it.qty || 1),
                precio: Number(it.price || 0),
              }))
            : [
                {
                  nombre: String(typeof serviceConAceite === "string" ? serviceConAceite : serviceConAceite?.name || "Cambio de aceite"),
                  viscosidad: extraerViscosidad(String(typeof serviceConAceite === "string" ? serviceConAceite : serviceConAceite?.name || "")),
                },
              ];

        const filtrosFormateados = itemsFiltro.map((it) => ({
          nombre: it.fullName || it.name || "Filtro de Aceite",
          precio: Number(it.price || 0),
        }));

        ordenesMapeadas.push({
          id: String(ord.id || ord.orderNumber),
          orderNumber: String(ord.orderNumber || ord.code || ""),
          fecha: fechaStr,
          fechaMs: Number.isFinite(fechaMs) ? fechaMs : 0,
          kilometraje: km,
          mecanico: ord.assignedMechanic || ord.mechanic || "Técnico",
          cliente: ord.clientName || ord.customerName || ord.client || "Cliente",
          placa: String(ord.plate || "").toUpperCase().trim(),
          vehiculo: [ord.vehicleBrand || ord.brand, ord.vehicleModel || ord.model, ord.year]
            .filter(Boolean)
            .join(" "),
          aceites: aceitesFormateados,
          filtros: filtrosFormateados,
          otrosServicios: servicesList
            .map((s: any) => (typeof s === "string" ? s : s?.name))
            .filter(Boolean),
          total: Number(ord.totalAmount || ord.totalCost || ord.total || 0),
          notas: ord.notes || undefined,
        });
      }

      // Mapear historial
      const historialMapeado: OilChangeRecord[] = [];
      for (const h of historyList) {
        const servs: any[] = Array.isArray(h.services) ? h.services : [];
        const tieneAceite = servs.some((s: any) => {
          const txt = typeof s === "string" ? s : s?.name || "";
          return normalizar(txt).includes("aceite") || /\d{1,2}w-?\d{2}/i.test(normalizar(txt));
        });

        if (!tieneAceite) continue;

        const sAceite = servs.find((s: any) => {
          const txt = typeof s === "string" ? s : s?.name || "";
          return normalizar(txt).includes("aceite") || /\d{1,2}w-?\d{2}/i.test(normalizar(txt));
        });
        const txtAceite = typeof sAceite === "string" ? sAceite : sAceite?.name || "Cambio de aceite";

        const sFiltro = servs.find((s: any) => {
          const txt = typeof s === "string" ? s : s?.name || "";
          return normalizar(txt).includes("filtro");
        });
        const txtFiltro = typeof sFiltro === "string" ? sFiltro : sFiltro?.name;

        const km = Number(String(h.mileage || "").replace(/[^0-9]/g, "")) || 0;
        const fechaRaw = h.date || h.createdAt || 0;
        const fechaMs = new Date(fechaRaw).getTime();

        historialMapeado.push({
          id: String(h.id || h.serviceCode),
          orderNumber: String(h.orderNumber || h.serviceCode || ""),
          fecha: String(h.date || "Sin fecha"),
          fechaMs: Number.isFinite(fechaMs) ? fechaMs : 0,
          kilometraje: km,
          mecanico: h.mechanic || "Técnico",
          cliente: h.client || "Cliente",
          placa: String(h.plate || "").toUpperCase().trim(),
          vehiculo: h.vehicle || "",
          aceites: [
            {
              nombre: txtAceite,
              viscosidad: extraerViscosidad(txtAceite),
            },
          ],
          filtros: txtFiltro ? [{ nombre: txtFiltro }] : [],
          total: Number(h.cost || 0),
          notas: h.notes || undefined,
        });
      }

      const todos = [...ordenesMapeadas, ...historialMapeado].sort(
        (a, b) => b.fechaMs - a.fechaMs
      );

      setTodosLosCambiosGlobal(todos);
    } catch (err) {
      console.error("Error al cargar historial de aceites:", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarTodosLosDatos(placa);
  }, [cargarTodosLosDatos, placa]);

  // 2. Filtrar ESTRICTAMENTE y ÚNICAMENTE por el vehículo activo en consulta
  const cambios = useMemo(() => {
    const placaLimpia = placa.replace(/[^A-Z0-9]/g, "");
    if (!placaLimpia) return [];

    return todosLosCambiosGlobal.filter((c) => {
      const p = c.placa.replace(/[^A-Z0-9]/g, "");
      // Coincidencia exacta con la placa del vehículo activo
      return p === placaLimpia;
    });
  }, [todosLosCambiosGlobal, placa]);

  const autoInfo = useMemo(() => {
    const primer = cambios[0];
    return {
      cliente: cliente || primer?.cliente || "Cliente",
      placa: placa || primer?.placa || "",
      vehiculo: vehiculo || primer?.vehiculo || "",
      total: cambios.length,
    };
  }, [cambios, cliente, placa, vehiculo]);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-16">
      <Header />

      <main className="flex-grow p-3 sm:p-6 max-w-4xl mx-auto w-full space-y-3.5">
        {/* Cabecera corta y concisa con datos del vehículo activo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5">
            <Link
              href="/taller"
              className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-sm font-bold"
              title="Volver"
            >
              ←
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <span>🛢️</span>
                <span>Aceites</span>
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {autoInfo.cliente}
                </span>
                {autoInfo.placa && (
                  <>
                    <span>•</span>
                    <span className="font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                      {autoInfo.placa}
                    </span>
                  </>
                )}
                {autoInfo.vehiculo && (
                  <>
                    <span>•</span>
                    <span>{autoInfo.vehiculo}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resumen numérico corto del vehículo activo */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Total</span>
            <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mt-0.5">
              {cargando ? "..." : `${cambios.length}`}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Último</span>
            <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white mt-0.5 truncate">
              {cargando ? "..." : cambios[0]?.fecha || "-"}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Km</span>
            <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {cargando
                ? "..."
                : cambios[0]?.kilometraje
                ? `${cambios[0].kilometraje.toLocaleString()} km`
                : "-"}
            </p>
          </div>
        </div>

        {/* Lista de cambios de aceite con textos cortos (EXCLUSIVA del vehículo activo) */}
        <div className="space-y-2.5">
          {cargando ? (
            <div className="p-12 text-center text-xs text-zinc-400">
              Cargando historial de aceites...
            </div>
          ) : cambios.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
              <span className="text-3xl">🛢️</span>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Sin cambios de aceite registrados
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {placa ? `No hay registros anteriores para la placa ${placa}` : "No se ha seleccionado un vehículo"}
              </p>
            </div>
          ) : (
            cambios.map((c, idx) => {
              const tiempo = calcularTiempoTranscurrido(c.fechaMs, c.fecha);
              return (
                <div
                  key={c.id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-2xs"
                >
                  {/* Fila 1: Fecha, tiempo relativo, #Orden y Kilometraje (Sin placa ni auto) */}
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-white/5 pb-2.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <span>📅</span>
                        <span>{c.fecha}</span>
                      </span>

                      {/* Etiqueta de color para saber hace cuánto tiempo se hizo el cambio */}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${tiempo.colorClass}`}>
                        {tiempo.texto}
                      </span>

                      {idx === 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                          Último
                        </span>
                      )}
                    </div>

                    {c.kilometraje > 0 && (
                      <span className="text-sm sm:text-base font-bold font-sans text-emerald-600 dark:text-emerald-400 shrink-0">
                        {c.kilometraje.toLocaleString()} km
                      </span>
                    )}
                  </div>

                  {/* Fila 2: Aceites aplicados */}
                  <div className="space-y-2 pt-0.5">
                    {c.aceites.map((ac, acIdx) => (
                      <div key={`ac_${acIdx}`} className="flex items-center justify-between gap-2 text-sm sm:text-base">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">🛢️</span>
                          <strong className="text-zinc-900 dark:text-white truncate">
                            {ac.nombre}
                          </strong>
                          {ac.marca && (
                            <span className="text-zinc-400 text-xs sm:text-sm shrink-0">
                              ({ac.marca})
                            </span>
                          )}
                          {ac.viscosidad && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-500/30 shrink-0">
                              {ac.viscosidad}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Filtro de Aceite */}
                    {c.filtros.map((fil, filIdx) => (
                      <div key={`fil_${filIdx}`} className="flex items-center justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">⚙️</span>
                          <span className="text-zinc-400 text-xs">Filtro:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {fil.nombre}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Fila 3: Técnico */}
                  <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-white/5">
                    <span>Técnico: <strong className="text-zinc-700 dark:text-zinc-300 font-medium">{c.mecanico}</strong></span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

export default function HistorialAceitesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-16">
          <Header />
          <main className="flex-grow p-6 max-w-4xl mx-auto w-full text-center text-xs text-zinc-400">
            Cargando historial de aceites...
          </main>
        </div>
      }
    >
      <HistorialAceitesContenido />
    </Suspense>
  );
}
