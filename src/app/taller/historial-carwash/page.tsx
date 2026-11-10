"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

interface CarWashServiceItem {
  id?: string;
  code?: string;
  nombre: string;
  categoria?: string;
  duracionMin?: number;
  cantidad?: number;
}

interface CarWashRecord {
  id: string;
  orderNumber: string;
  fecha: string;
  fechaMs: number;
  cliente: string;
  placa: string;
  vehiculo: string;
  servicios: CarWashServiceItem[];
  mecanico?: string;
  notas?: string;
  rawItems?: any[];
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

function HistorialCarWashContenido() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const placa = (searchParams.get("placa") || searchParams.get("busqueda") || searchParams.get("q") || "").toUpperCase().trim();
  const cliente = searchParams.get("cliente") || "";
  const vehiculo = searchParams.get("vehiculo") || "";
  const tipo = (searchParams.get("tipo") || searchParams.get("porte") || "Auto").trim();
  const esMoto = tipo.toLowerCase() === "moto" || vehiculo.toLowerCase().includes("moto");

  const [cargando, setCargando] = useState(true);
  const [todosLosRegistros, setTodosLosRegistros] = useState<CarWashRecord[]>([]);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const placaLimpia = useMemo(() => placa.replace(/[^A-Z0-9]/g, ""), [placa]);

  const cargarDatos = useCallback(async (placaActual: string) => {
    try {
      setCargando(true);
      const placaTarget = placaActual.replace(/[^A-Z0-9]/g, "").toUpperCase();

      const fetches: Promise<any>[] = [
        fetch("/api/taller/ordenes", { cache: "no-store" }).catch(() => null),
        fetch("/api/taller/historial", { cache: "no-store" }).catch(() => null),
      ];

      if (placaTarget) {
        fetches.push(
          fetch(`/api/taller/operacion?plate=${encodeURIComponent(placaTarget)}&historial=true`, { cache: "no-store" }).catch(() => null)
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

      const baseHistory: any[] = Array.isArray(dataHistorial?.history) ? dataHistorial.history : [];
      const operacionHistory: any[] = Array.isArray(dataOperacion?.history) ? dataOperacion.history : [];
      const historyList: any[] = [...baseHistory, ...operacionHistory];

      const normalizar = (txt: any) =>
        String(txt || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();

      // Función estricta para identificar ÚNICAMENTE servicios de Car Wash (excluyendo lubricentro, mecánica y repuestos)
      const esServicioCarWash = (it: any) => {
        if (!it) return false;
        const code = String(it.code || "").toUpperCase();
        const cat = normalizar(it.category || "");
        const sub = normalizar(it.subCategory || "");
        const n = normalizar(it.name || it.fullName || "");

        // EXCLUSIONES TOTALES: Cualquier repuesto, lubricante, neumático o mecánica general
        if (
          n.includes("filtro") ||
          n.includes("aceite") ||
          n.includes("llanta") ||
          n.includes("balanceo") ||
          n.includes("alineacion") ||
          n.includes("alineación") ||
          n.includes("freno") ||
          n.includes("pastilla") ||
          n.includes("disco") ||
          n.includes("bateria") ||
          n.includes("batería") ||
          n.includes("bujia") ||
          n.includes("bujía") ||
          n.includes("amortiguador") ||
          n.includes("suspension") ||
          n.includes("embrague") ||
          n.includes("refrigerante") ||
          cat.includes("repuesto") ||
          cat.includes("lubricante") ||
          cat.includes("mecanica")
        ) {
          return false;
        }

        // Si el vehículo NO es una moto (ej. Auto, Camioneta, SUV), descartar servicios de moto
        if (!esMoto && (n.includes("moto") || code.includes("MOTO") || sub === "motos")) {
          return false;
        }
        // Si el vehículo ES una moto, descartar servicios que no apliquen (chasis, techo)
        if (esMoto && (n.includes("chasis") || n.includes("techo"))) {
          return false;
        }

        if (code.startsWith("CW-") || code.startsWith("PKG-CW-") || code.startsWith("ADD-CW-")) return true;
        if (it.cwCategoryId === "LAVADO" || it.cwCategoryId === "INTERIOR" || it.cwCategoryId === "CHASIS" || it.cwCategoryId === "DETAILING") return true;
        if (cat === "lavado" || cat === "car wash" || cat === "carwash") return true;
        if (sub === "car wash" || sub === "lavado" || sub === "detailing") return true;

        // Búsqueda específica por palabras de lavado
        return (
          n.includes("lavado") ||
          n.includes("car wash") ||
          n.includes("carwash") ||
          n.includes("aspirado") ||
          n.includes("grafitado") ||
          n.includes("desengrase") ||
          n.includes("tapiceria") ||
          n.includes("tapicería") ||
          n.includes("gotaseca") ||
          n.includes("ozono") ||
          n.includes("encerado") ||
          n.includes("pulido") ||
          n.includes("chasis") ||
          n.includes("exprés") ||
          n.includes("expres")
        );
      };

      const registrosMapeados: CarWashRecord[] = [];

      // 1. Filtrar órdenes de trabajo (si hay placa específica, sólo esa; si no, todas con placa)
      for (const ord of ordersList) {
        const ordPlateClean = String(ord.plate || "").replace(/[^A-Z0-9]/g, "").toUpperCase();
        if (!ordPlateClean) continue;
        if (placaTarget && ordPlateClean !== placaTarget) {
          continue;
        }

        const items: any[] = Array.isArray(ord.items) ? ord.items : [];
        const itemsCarwash = items.filter(esServicioCarWash);

        const servs: any[] = Array.isArray(ord.services) ? ord.services : [];
        const servsCarwash = servs.filter((s: any) => {
          const txt = typeof s === "string" ? s : s?.name || "";
          return esServicioCarWash({ name: txt });
        });

        if (itemsCarwash.length === 0 && servsCarwash.length === 0) continue;

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

        const serviciosMapeados: CarWashServiceItem[] = itemsCarwash.length > 0
          ? itemsCarwash.map((it) => ({
              id: it.id || it.serviceId,
              code: it.code,
              nombre: it.name || it.fullName || "Lavado",
              categoria: it.category || "Car Wash",
              duracionMin: it.estimatedMinutes || it.durationMinutes,
              cantidad: Number(it.qty || 1),
            }))
          : servsCarwash.map((s: any) => ({
              nombre: typeof s === "string" ? s : s?.name || "Servicio Car Wash",
            }));

        registrosMapeados.push({
          id: String(ord.id || ord.orderNumber),
          orderNumber: String(ord.orderNumber || ord.code || ""),
          fecha: fechaStr,
          fechaMs: Number.isFinite(fechaMs) ? fechaMs : 0,
          cliente: ord.clientName || ord.customerName || ord.client || cliente || "Cliente",
          placa: ordPlateClean,
          vehiculo: [ord.vehicleBrand || ord.brand, ord.vehicleModel || ord.model, ord.year].filter(Boolean).join(" ") || vehiculo,
          servicios: serviciosMapeados,
          mecanico: ord.assignedMechanic || ord.mechanic || "Lavador / Operador",
          notas: ord.notes || undefined,
          rawItems: itemsCarwash.length > 0 ? itemsCarwash : undefined,
        });
      }

      // 2. Extraer de historial previo
      for (const h of historyList) {
        const hPlateClean = String(h.plate || "").replace(/[^A-Z0-9]/g, "").toUpperCase();
        if (!hPlateClean) continue;
        if (placaTarget && hPlateClean !== placaTarget) {
          continue;
        }

        const servs: any[] = Array.isArray(h.services) ? h.services : [];
        const servsCarwash = servs.filter((s: any) => {
          const txt = typeof s === "string" ? s : s?.name || "";
          return esServicioCarWash({ name: txt });
        });

        if (servsCarwash.length === 0) continue;

        const fechaRaw = h.date || h.createdAt || 0;
        const fechaMs = new Date(fechaRaw).getTime();

        const serviciosMapeados: CarWashServiceItem[] = servsCarwash.map((s: any) => ({
          nombre: typeof s === "string" ? s : s?.name || "Lavado",
        }));

        registrosMapeados.push({
          id: String(h.id || h.serviceCode || `hist_${Math.random()}`),
          orderNumber: String(h.orderNumber || h.serviceCode || ""),
          fecha: String(h.date || "Sin fecha"),
          fechaMs: Number.isFinite(fechaMs) ? fechaMs : 0,
          cliente: h.client || cliente || "Cliente",
          placa: hPlateClean,
          vehiculo: h.vehicle || vehiculo || "",
          servicios: serviciosMapeados,
          mecanico: h.mechanic || "Lavador / Operador",
          notas: h.notes || undefined,
        });
      }

      registrosMapeados.sort((a, b) => b.fechaMs - a.fechaMs);
      setTodosLosRegistros(registrosMapeados);
    } catch (err) {
      console.error("Error al cargar historial de Car Wash:", err);
    } finally {
      setCargando(false);
    }
  }, [cliente, vehiculo]);

  useEffect(() => {
    void cargarDatos(placa);
  }, [cargarDatos, placa]);

  // Uno por cada uno vehículos nada más (El ÚLTIMO servicio de cada vehículo)
  const registros = useMemo(() => {
    // Si hay placa activa: EXACTAMENTE UN SOLO registro (el último servicio de ese vehículo)
    if (placaLimpia) {
      const match = todosLosRegistros.find((r) => r.placa === placaLimpia);
      return match ? [match] : [];
    }

    // Si no hay placa activa: UNO por cada uno de los vehículos registrados
    const vistos = new Set<string>();
    const unicos: CarWashRecord[] = [];
    for (const r of todosLosRegistros) {
      const p = r.placa.trim().toUpperCase();
      if (!p || vistos.has(p)) continue;
      vistos.add(p);
      unicos.push(r);
    }
    return unicos;
  }, [todosLosRegistros, placaLimpia]);

  // Manejador para REPETIR este servicio seleccionado
  const handleRepetirServicio = (registro: CarWashRecord) => {
    try {
      if (typeof window === "undefined") return;

      const targetPlate = registro.placa || placaLimpia;
      const itemsParaCargar = registro.rawItems && registro.rawItems.length > 0
        ? registro.rawItems
        : registro.servicios.map((s) => ({
            id: s.id || `cw_rep_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            code: s.code || "CW-CUSTOM",
            name: s.nombre,
            category: "Lavado",
            cwCategoryId: "LAVADO",
            subCategory: "Car Wash",
            unitOfMeasure: "Servicio",
            qty: Number(s.cantidad || 1),
            estimatedMinutes: s.duracionMin || 35,
            status: "Listo",
            completed: true,
          }));

      // Guardar el servicio a cargar para que ModuloCarWashCatalogo lo aplique
      localStorage.setItem("carwash_cargar_servicio_pendiente", JSON.stringify({
        placa: targetPlate,
        items: itemsParaCargar,
        timestamp: Date.now(),
      }));

      // También refrescar la memoria del último servicio de esta placa
      if (targetPlate) {
        localStorage.setItem(`carwash_last_${targetPlate}`, JSON.stringify(itemsParaCargar));
      }

      setMensajeExito("¡Servicio seleccionado! Volviendo al taller...");
      setTimeout(() => {
        router.push("/taller");
      }, 700);
    } catch {
      alert("Error al cargar el servicio para repetir.");
    }
  };

  const infoAuto = useMemo(() => {
    const primer = registros[0];
    return {
      cliente: cliente || primer?.cliente || "Cliente",
      placa: placaLimpia || primer?.placa || "",
      vehiculo: vehiculo || primer?.vehiculo || "",
      totalLavados: registros.length,
    };
  }, [registros, cliente, placaLimpia, vehiculo]);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-16">
      <Header />

      <main className="flex-grow p-3 sm:p-6 max-w-4xl mx-auto w-full space-y-3.5">
        {/* Notificación de éxito */}
        {mensajeExito && (
          <div className="p-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-center text-sm shadow-md animate-fade-in flex items-center justify-center gap-2">
            <span>✓</span>
            <span>{mensajeExito}</span>
          </div>
        )}

        {/* Cabecera con datos del vehículo activo */}
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
                <span>⚡</span>
                <span>Lavados</span>
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {infoAuto.cliente}
                </span>
                {infoAuto.placa && (
                  <>
                    <span>•</span>
                    <span className="font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                      {infoAuto.placa}
                    </span>
                  </>
                )}
                {infoAuto.vehiculo && (
                  <>
                    <span>•</span>
                    <span>{infoAuto.vehiculo}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resumen numérico SIN VALORES MONETARIOS (una sola palabra cada título) */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-400">
              {placaLimpia ? "Vehículo" : "Total"}
            </span>
            <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mt-0.5 truncate font-mono">
              {cargando ? "..." : (placaLimpia ? (infoAuto.placa || "-") : `${registros.length}`)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Último</span>
            <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white mt-0.5 truncate">
              {cargando ? "..." : registros[0]?.fecha || "-"}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Servicios</span>
            <p className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {cargando
                ? "..."
                : registros[0]?.servicios.length || 0}
            </p>
          </div>
        </div>

        {/* Lista de servicios previos del vehículo activo */}
        <div className="space-y-3">
          {cargando ? (
            <div className="p-12 text-center text-xs text-zinc-400">
              Cargando historial de Car Wash...
            </div>
          ) : !placaLimpia ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
              <span className="text-4xl">🚗</span>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Sin vehículo
              </p>
            </div>
          ) : registros.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
              <span className="text-4xl">🚿</span>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Sin lavados
              </p>
            </div>
          ) : (
            registros.map((reg, idx) => {
              const tiempo = calcularTiempoTranscurrido(reg.fechaMs, reg.fecha);
              return (
                <div
                  key={reg.id || idx}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3.5 shadow-2xs hover:border-blue-400/50 transition-colors"
                >
                  {/* Fila 1: Fecha, tiempo relativo, badges (SIN VALOR MONETARIO) */}
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-white/5 pb-2.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <span>📅</span>
                        <span>{reg.fecha}</span>
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${tiempo.colorClass}`}>
                        {tiempo.texto}
                      </span>

                      {idx === 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-500/25 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                          Último
                        </span>
                      )}

                      {reg.placa && (
                        <span className="font-mono font-bold uppercase px-2 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-500/20">
                          🚗 {reg.placa}
                        </span>
                      )}

                      {reg.vehiculo && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[200px]">
                          {reg.vehiculo}
                        </span>
                      )}

                      {reg.orderNumber && (
                        <span className="text-xs text-zinc-400 font-mono">
                          #{reg.orderNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fila 2: Servicios de lavado (SIN PRECIOS) */}
                  <div className="space-y-2 pt-0.5">
                    {reg.servicios.map((s, sIdx) => (
                      <div
                        key={`s_${sIdx}`}
                        className="flex items-center justify-between gap-2 text-sm sm:text-base p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-white/5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">🚿</span>
                          <strong className="text-zinc-900 dark:text-white truncate">
                            {s.nombre}
                          </strong>
                        </div>

                        {s.duracionMin && s.duracionMin > 0 ? (
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-zinc-200/60 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 shrink-0">
                            ⏱️ {s.duracionMin}m
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Fila 3: Operador y Botón de acción */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-100 dark:border-white/5 flex-wrap">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Operador: <strong className="text-zinc-700 dark:text-zinc-300 font-medium">{reg.mecanico}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRepetirServicio(reg)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-98"
                    >
                      <span>⚡</span>
                      <span>Repetir</span>
                      <span>→</span>
                    </button>
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

export default function HistorialCarWashPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-16">
          <Header />
          <main className="flex-grow p-6 max-w-4xl mx-auto w-full text-center text-xs text-zinc-400">
            Cargando historial de Car Wash...
          </main>
        </div>
      }
    >
      <HistorialCarWashContenido />
    </Suspense>
  );
}
