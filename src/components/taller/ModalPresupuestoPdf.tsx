"use client";

import React from "react";
import type { UnifiedOrder, OrderItem } from "@/app/taller/page";

interface ModalPresupuestoPdfProps {
  abierto: boolean;
  onCerrar: () => void;
  orden: UnifiedOrder | null;
  tallerNombre?: string;
  tallerDireccion?: string;
  tallerTelefono?: string;
  tallerRuc?: string;
  onAprobar?: () => void;
}

export default function ModalPresupuestoPdf({
  abierto,
  onCerrar,
  orden,
  tallerNombre = "Auto / G",
  tallerDireccion = "Av. Principal y Panamericana Norte",
  tallerTelefono = "+593 99 999 9999",
  tallerRuc = "1790000000001",
  onAprobar,
}: ModalPresupuestoPdfProps) {
  React.useEffect(() => {
    if (abierto) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [abierto]);

  if (!abierto || !orden) return null;

  const qs = String(orden.quoteStatus || "").trim().toLowerCase();
  const st = String(orden.status || "").trim().toLowerCase();
  const esPropuestaAprobada =
    qs.includes("aprob") ||
    qs.includes("acept") ||
    qs === "pagado" ||
    qs === "facturado" ||
    st.includes("aprob") ||
    st === "en_caja" ||
    st === "pagado" ||
    st === "facturado" ||
    Boolean((orden as any).hasPriceAuthorized);

  const rawItems: OrderItem[] =
    orden.items && orden.items.length > 0
      ? orden.items
      : Array.isArray((orden as any).services)
        ? (orden as any).services.map((srv: any, idx: number) =>
          typeof srv === "string"
            ? { id: `srv_${idx}`, name: srv, qty: 1, price: 0, type: "SERVICE" }
            : {
              id: srv.id || `srv_${idx}`,
              name: srv.name || srv.title || "Servicio",
              qty: srv.qty || 1,
              price: srv.price || 0,
              type: "SERVICE",
            }
        )
        : [];

  const items = rawItems;
  const nombreFinalTaller = tallerNombre || "Auto / G";

  const productosSeleccionados = items.filter((it: any) => it.type === "PART");
  const serviciosSeleccionados = [...items.filter((it: any) => it.type !== "PART")].sort(
    (a: any, b: any) => {
      const aEsManual = Boolean(a.isManual || String(a.id || "").startsWith("reg-"));
      const bEsManual = Boolean(b.isManual || String(b.id || "").startsWith("reg-"));
      if (aEsManual && !bEsManual) return -1;
      if (!aEsManual && bEsManual) return 1;
      return 0;
    }
  );

  const totalProductos = productosSeleccionados.reduce(
    (acc, it: any) => acc + (Number(it.qty) || 1),
    0
  );
  const totalServicios = serviciosSeleccionados.reduce(
    (acc, it: any) => acc + (Number(it.qty) || 1),
    0
  );

  const getBadgeClasePorModulo = (textoModulo?: string) => {
    const m = (textoModulo || "").toLowerCase();
    if (m.includes("lubricentro")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (m.includes("car wash") || m.includes("carwash")) {
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    }
    if (m.includes("tecnicentro")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    if (m.includes("inspección") || m.includes("pin")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  // Totales (evitar doble IVA cuando totalCost ya incluye IVA o cuando IVA es 0%)
  const subtotalCalculado = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );
  const taxRate =
    (orden as any).quoteTaxRate !== undefined && (orden as any).quoteTaxRate !== null
      ? Number((orden as any).quoteTaxRate)
      : 15;
  const taxFactor = 1 + taxRate / 100;
  const pricesIncludeTax = Boolean((orden as any).pricesIncludeTax);
  const totalBase = subtotalCalculado > 0 ? subtotalCalculado : Number(orden.totalCost) || 0;
  const descuento =
    orden.discountAmount !== undefined && orden.discountAmount !== null
      ? Number(orden.discountAmount)
      : 0;
  const subtotal =
    subtotalCalculado > 0
      ? pricesIncludeTax && taxFactor > 0
        ? subtotalCalculado / taxFactor
        : subtotalCalculado
      : taxFactor > 0
      ? Math.max(0, totalBase / taxFactor)
      : totalBase;
  const subtotalConDescuento = Math.max(0, subtotal - descuento);
  const iva =
    orden.taxAmount !== undefined && orden.taxAmount !== null
      ? Number(orden.taxAmount)
      : subtotalCalculado > 0
      ? pricesIncludeTax
        ? Math.max(0, subtotalCalculado - subtotal)
        : subtotalConDescuento * (taxRate / 100)
      : Math.max(0, totalBase - subtotal);
  const total =
    subtotalCalculado > 0
      ? pricesIncludeTax
        ? Math.max(0, subtotalCalculado - descuento)
        : subtotalConDescuento + iva
      : totalBase;

  const formatearFechaPropuesta = (f: Date = new Date()) => {
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const diaSemana = dias[f.getDay()];
    const diaMes = f.getDate();
    const mes = meses[f.getMonth()];
    const anio = f.getFullYear();
    return `${diaSemana} ${diaMes} de ${mes}, ${anio}`;
  };

  const fechaEmision = formatearFechaPropuesta(new Date());

  const numeroLimpio = String(orden.orderNumber || orden.quoteNumber || "00001")
    .replace(/^#+/, "")
    .replace(/^(?:COT|OT|ORD|LUB|CW|TC)[\s\-_]*/gi, "")
    .replace(/^(?:COT|OT|ORD|LUB|CW|TC)[\s\-_]*/gi, "")
    .replace(/^#+/, "")
    .trim();
  const codigoOrdenFormateado = `#${numeroLimpio || "00001"}`;

  const formatoPrimeraMayuscula = (texto?: string) => {
    if (!texto) return "";
    const str = String(texto).trim();
    if (!str) return "";
    const res = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    return res.replace(/\(([a-záéíóúñ])/gi, (m) => m.toUpperCase());
  };

  const formatoNombrePropio = (texto?: string) => {
    if (!texto) return "";
    return String(texto)
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const handleImprimir = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in print:bg-white print:p-0 print:static">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #presupuesto-pdf-content, #presupuesto-pdf-content * {
                visibility: visible !important;
                font-family: Verdana, Geneva, Tahoma, sans-serif !important;
              }
              #presupuesto-pdf-content {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 16px !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                border: none !important;
              }
            }
          `,
        }}
      />
      <div
        id="presupuesto-pdf-content"
        style={{ fontFamily: "Verdana, Geneva, Tahoma, sans-serif" }}
        className="relative w-full max-w-4xl bg-white text-zinc-900 rounded-2xl shadow-2xl p-4 sm:p-8 space-y-6 my-auto print:p-0 print:m-0 print:shadow-none print:w-full font-normal text-sm"
      >
        {/* ===================================================================
            CABECERA DEL DOCUMENTO PDF - PROPUESTA LIMPIA
            =================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">🔧</span>
              <h1 className="text-sm font-normal tracking-tight text-zinc-900">
                {nombreFinalTaller}
              </h1>
            </div>
            {tallerTelefono && (
              <p className="text-sm font-normal text-zinc-500 mt-0.5">Tel: {tallerTelefono}</p>
            )}
          </div>

          <div className="text-left sm:text-right bg-zinc-50 px-3.5 py-2 rounded-xl border border-zinc-200">
            <span className="text-sm font-normal text-zinc-900 block">
              Propuesta {codigoOrdenFormateado}
            </span>
            <span className="text-sm font-normal text-zinc-700 block mt-0.5">
              {fechaEmision}
            </span>
            <div className="mt-1 flex items-center justify-start sm:justify-end">
              {esPropuestaAprobada ? (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-normal">
                  Aprobado
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-sm font-normal">
                  En Espera
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ===================================================================
            DATOS DEL CLIENTE Y VEHÍCULO
            =================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-50 p-4 sm:p-5 rounded-xl border border-zinc-200 text-sm">
          <div>
            <span className="text-sm font-normal text-zinc-500 block">Cliente</span>
            <span className="text-sm font-normal text-zinc-900 block truncate mt-0.5">{formatoNombrePropio(orden.client || "Consumidor Final")}</span>
            {orden.clientPhone && orden.clientPhone !== "S/N" && (
              <span className="text-sm font-normal text-zinc-600 block mt-0.5">{orden.clientPhone}</span>
            )}
          </div>
          <div>
            <span className="text-sm font-normal text-zinc-500 block">Vehículo</span>
            <span className="text-sm font-normal text-zinc-900 block truncate mt-0.5">{formatoPrimeraMayuscula(orden.vehicle || "Vehículo")}</span>
            <span className="text-sm font-normal text-zinc-700 block mt-0.5">Placa: {orden.plate}</span>
          </div>
          <div>
            <span className="text-sm font-normal text-zinc-500 block">Km</span>
            <span className="text-sm font-normal text-zinc-900 block mt-0.5">
              {orden.mileage ? `${orden.mileage.toLocaleString()} km` : "S/N"}
            </span>
            <span className="text-sm font-normal text-zinc-600 block mt-0.5">Nivel: {orden.fuelLevel || "1/2"}</span>
          </div>
          <div>
            <span className="text-sm font-normal text-zinc-500 block">Técnico</span>
            <span className="text-sm font-normal text-zinc-900 block truncate mt-0.5">{formatoNombrePropio((orden.mechanic || "Taller").replace(/\s*\([^)]*\)/g, "").trim() || "Taller")}</span>
          </div>
        </div>

        {/* ===================================================================
            SECCIÓN 2: SERVICIOS (MANUALES PRIMERO) Y PRODUCTOS (SIN VALORES)
            =================================================================== */}
        <div className="space-y-4">
          {serviciosSeleccionados.length === 0 && productosSeleccionados.length === 0 ? (
            <div className="py-6 text-center text-sm font-normal text-zinc-400 italic bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
              No se han agregado trabajos a la propuesta todavía.
            </div>
          ) : (
            <>
              {/* SERVICIOS (PRIMERO) */}
              {serviciosSeleccionados.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-normal text-zinc-500 flex items-center gap-1.5">
                    <span>🔧</span>
                    <span>Servicios ({totalServicios}):</span>
                  </span>
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-[11px] font-semibold">
                          <th className="py-2 px-3 w-16 text-center">Cant.</th>
                          <th className="py-2 px-3">Descripción</th>
                          <th className="py-2 px-3 w-36">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {serviciosSeleccionados.map((it: any, idx: number) => {
                          const cant = Number(it.qty) || 1;
                          const origen = it.category || "Taller";
                          const esManual = Boolean(it.isManual || String(it.id || "").startsWith("reg-"));
                          return (
                            <tr key={it.id || it.code || `srv-${idx}`}>
                              <td className="py-2 px-3 text-center font-medium text-zinc-800">
                                {cant}
                              </td>
                              <td className="py-2 px-3 font-normal text-zinc-900">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span>{formatoPrimeraMayuscula(it.name || it.fullName)}</span>
                                  {esManual && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 shrink-0">
                                      Manual
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getBadgeClasePorModulo(origen)}`}
                                >
                                  {formatoPrimeraMayuscula(origen)}
                                </span>
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
              {productosSeleccionados.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-normal text-zinc-500 flex items-center gap-1.5">
                    <span>📦</span>
                    <span>Productos ({totalProductos}):</span>
                  </span>
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-[11px] font-semibold">
                          <th className="py-2 px-3 w-16 text-center">Cant.</th>
                          <th className="py-2 px-3">Descripción</th>
                          <th className="py-2 px-3 w-36">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {productosSeleccionados.map((it: any, idx: number) => {
                          const cant = Number(it.qty) || 1;
                          const origen = it.category || "Taller";
                          const extra = it.presentation || it.viscosity || "";
                          return (
                            <tr key={it.id || it.code || `prod-${idx}`}>
                              <td className="py-2 px-3 text-center font-medium text-zinc-800">
                                {cant}
                              </td>
                              <td className="py-2 px-3 font-normal text-zinc-900">
                                {formatoPrimeraMayuscula(it.name || it.fullName)}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex flex-wrap items-center gap-1">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getBadgeClasePorModulo(origen)}`}
                                  >
                                    {formatoPrimeraMayuscula(origen)}
                                  </span>
                                  {extra && (
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 text-zinc-600">
                                      {formatoPrimeraMayuscula(extra)}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ===================================================================
            FIRMA DEL CLIENTE (SI EXISTE)
            =================================================================== */}
        {orden.quoteSignatureUrl && (
          <div className="pt-2 flex flex-col items-end">
            <div className="w-56 text-center space-y-1.5">
              <div className="h-20 rounded-xl border border-zinc-200 bg-zinc-50/60 flex items-center justify-center p-2">
                <img
                  src={orden.quoteSignatureUrl}
                  alt="Firma del cliente"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <span className="text-xs text-zinc-500 block border-t border-zinc-200 pt-1">
                Firma de conformidad del cliente
              </span>
            </div>
          </div>
        )}

        {/* ===================================================================
            BOTONES DE ACCIÓN (NO SE IMPRIMEN)
            =================================================================== */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-zinc-200 print:hidden">
          <button
            type="button"
            onClick={onCerrar}
            className="h-10 px-5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-normal text-zinc-700 transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
