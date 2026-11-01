"use client";

import React, { useMemo } from "react";
import type { UnifiedOrder, InspectionFinding, OrderItem } from "@/app/taller/page";

interface ModalPresupuestoPdfProps {
  abierto: boolean;
  onCerrar: () => void;
  orden: UnifiedOrder | null;
  tallerNombre?: string;
  tallerDireccion?: string;
  tallerTelefono?: string;
  tallerRuc?: string;
}

export default function ModalPresupuestoPdf({
  abierto,
  onCerrar,
  orden,
  tallerNombre = "Auto / G",
  tallerDireccion = "Av. Principal y Panamericana Norte",
  tallerTelefono = "+593 99 999 9999",
  tallerRuc = "1790000000001",
}: ModalPresupuestoPdfProps) {
  if (!abierto || !orden) return null;

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
  const hallazgos = orden.inspectionFindings || [];
  const nombreFinalTaller = "Auto / G";

  // Clasificador de cada ítem en: Taller, Lubricentro, Car Wash, Tecnicentro y su subcategoría
  const clasificarItem = (it: any): {
    modulo: "Taller" | "Lubricentro" | "Car Wash" | "Tecnicentro";
    moduloIcon: string;
    subcategoria: string;
  } => {
    const cat = String(it.category || "").toLowerCase();
    const sub = String(it.subCategory || it.subcategory || "").toLowerCase();
    const name = String(it.name || "").toLowerCase();
    const id = String(it.id || "").toLowerCase();

    // 1. Tecnicentro
    if (
      cat.includes("tecnicentro") ||
      sub.includes("tecnicentro") ||
      id.startsWith("tc_") ||
      name.match(/llanta|alineaci[oó]n|balanceo|camber|enllanta|vulcaniz|parche|aro |rin |pit[oó]n|v[aá]lvula|pastilla|disco.*freno|zapata|rectific|suspensi[oó]n|amortiguador|terminal.*direcci[oó]n|r[oó]tula|buje|bater[ií]a|borne/i)
    ) {
      let subCat = "Servicios";
      if (name.match(/llanta|aro |rin /i) || cat.includes("llanta")) subCat = "Llantas";
      else if (name.match(/alineaci[oó]n|balanceo|camber|rotaci[oó]n/i) || cat.includes("alineacion")) subCat = "Alineación y Balanceo";
      else if (name.match(/enllanta|parche|vulcaniz|nitr[oó]geno|v[aá]lvula/i) || cat.includes("enllantaje")) subCat = "Enllantaje";
      else if (name.match(/freno|pastilla|disco|zapata/i) || cat.includes("frenos")) subCat = "Frenos";
      else if (name.match(/suspensi|amortiguador|terminal|r[oó]tula|buje|mesa/i) || cat.includes("suspension")) subCat = "Suspensión y Dirección";
      else if (name.match(/bater[ií]a|borne/i) || cat.includes("bateria")) subCat = "Baterías";
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
      name.match(/lavado|aspirado|tapicer[ií]a|grafitado|chasis|cera|encerado|pulido|detailing|ozono|desengrase|shampoo|ambientador/i)
    ) {
      let subCat = "Lavado";
      if (name.match(/chasis|grafitado|desengrase/i) || cat.includes("chasis")) subCat = "Chasis y Motor";
      else if (name.match(/aspirado|tapicer[ií]a|cuero|techo|ozono|interior/i) || cat.includes("interior")) subCat = "Interior y Tapicería";
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
      name.match(/aceite|filtro|valvulina|refrigerante|l[ií]quido.*freno|flush|aditivo|10w|20w|5w|0w|sint[eé]tico|mineral/i)
    ) {
      let subCat = "Mantenimiento";
      if (name.match(/aceite|lubricante|10w|20w|5w|0w|motor/i) || cat.includes("aceite")) subCat = "Aceites";
      else if (name.match(/filtro/i) || cat.includes("filtro")) subCat = "Filtros";
      else if (name.match(/refrigerante|freno|hidr[aá]ulico|fluido/i) || cat.includes("fluido")) subCat = "Fluidos y Refrigerantes";
      else if (name.match(/transmisi[oó]n|atf|cvt|caja|diferencial/i) || cat.includes("transmision")) subCat = "Transmisión";
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
  };

  // Agrupación de trabajos por módulo y subcategoría
  const gruposModulos = useMemo(() => {
    const ordenModulos: Array<{ id: "Taller" | "Lubricentro" | "Car Wash" | "Tecnicentro"; icon: string }> = [
      { id: "Taller", icon: "🔧" },
      { id: "Lubricentro", icon: "🛢️" },
      { id: "Car Wash", icon: "🧼" },
      { id: "Tecnicentro", icon: "⚡" },
    ];

    const mapa: Record<string, Record<string, OrderItem[]>> = {};

    items.forEach((it) => {
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
  }, [items]);

  // Agrupar hallazgos por sección
  const secciones = [
    {
      id: "carroceria",
      nombre: "Carrocería",
      icon: "🚗",
      items: hallazgos.filter((h) =>
        ["frontal", "trasera", "lateral_izq", "lateral_der", "superior"].includes(h.vista)
      ),
    },
    {
      id: "motor",
      nombre: "Motor",
      icon: "⚙️",
      items: hallazgos.filter((h) => h.vista === "motor"),
    },
    {
      id: "frenos",
      nombre: "Frenos",
      icon: "🛑",
      items: hallazgos.filter((h) => h.vista === "frenos"),
    },
    {
      id: "suspension",
      nombre: "Suspensión",
      icon: "🔩",
      items: hallazgos.filter((h) => h.vista === "suspension"),
    },
    {
      id: "electrico",
      nombre: "Eléctrico",
      icon: "⚡",
      items: hallazgos.filter((h) => h.vista === "electrico"),
    },
    {
      id: "aire",
      nombre: "Aire Acondicionado",
      icon: "❄️",
      items: hallazgos.filter((h) => h.vista === "aire"),
    },
  ].filter((s) => s.items.length > 0);

  // Totales
  const subtotalCalculado = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );
  const totalBase = subtotalCalculado > 0 ? subtotalCalculado : Number(orden.totalCost) || 0;
  const descuento = Number(orden.discountAmount) || 0;
  const subtotal = subtotalCalculado > 0 ? subtotalCalculado : Math.max(0, totalBase / 1.15);
  const subtotalConDescuento = Math.max(0, subtotal - descuento);
  const iva = Number(orden.taxAmount) || (subtotalCalculado > 0 ? subtotalConDescuento * 0.15 : Math.max(0, totalBase - subtotal));
  const total = subtotalCalculado > 0 ? subtotalConDescuento + iva : totalBase;

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
              {orden.quoteStatus === "Aprobado" ||
              orden.status === "Aprobado" ||
              orden.quoteStatus === "ACEPTADO" ? (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-normal">
                  Aprobado
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-sm font-normal">
                  Pendiente
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
            <span className="text-sm font-normal text-zinc-900 block truncate mt-0.5">{formatoNombrePropio(orden.mechanic || "Taller")}</span>
          </div>
        </div>

        {/* ===================================================================
            SECCIÓN 1: HALLAZGOS DE INSPECCIÓN
            =================================================================== */}
        {secciones.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-1">
              <h2 className="text-sm font-normal text-zinc-800 flex items-center gap-1.5">
                <span>🔍</span>
                <span>Diagnóstico ({hallazgos.length})</span>
              </h2>
            </div>

            <div className="space-y-3">
              {secciones.map((sec) => (
                <div key={sec.id} className="rounded-xl border border-zinc-200 overflow-hidden bg-white text-sm">
                  <div className="bg-zinc-100 px-3.5 py-1.5 font-normal text-zinc-900 flex items-center gap-2 border-b border-zinc-200 text-sm">
                    <span>{sec.icon}</span>
                    <span>{formatoPrimeraMayuscula(sec.nombre)}</span>
                    <span className="text-sm bg-zinc-200 px-2 py-0.5 rounded font-normal text-zinc-700 ml-auto">
                      {sec.items.length} {sec.items.length === 1 ? "punto" : "puntos"}
                    </span>
                  </div>

                  <div className="divide-y divide-zinc-100 p-2.5 space-y-2">
                    {sec.items.map((pin) => {
                      const fotosPin = pin.photoUrls || (pin.photoUrl ? [pin.photoUrl] : []);
                      return (
                        <div key={pin.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3 text-sm">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-normal text-xs flex items-center justify-center shrink-0">
                                #{pin.pinNumber || 1}
                              </span>
                              <span className="font-normal text-zinc-900 text-sm">{formatoPrimeraMayuscula(pin.tipo)}</span>
                              <span className="text-sm font-normal text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                                {formatoPrimeraMayuscula(pin.vistaLabel || pin.vista)}
                              </span>
                            </div>
                            {pin.descripcion && (
                              <p className="text-sm font-normal text-zinc-700 italic pl-7">
                                &quot;{formatoPrimeraMayuscula(pin.descripcion)}&quot;
                              </p>
                            )}
                          </div>

                          {/* Miniaturas de fotos tomadas en el pin */}
                          {fotosPin.length > 0 && (
                            <div className="flex items-center gap-1 shrink-0">
                              {fotosPin.slice(0, 3).map((fUrl, fIdx) => (
                                <img
                                  key={fIdx}
                                  src={fUrl}
                                  alt="Evidencia"
                                  className="w-10 h-10 rounded object-cover border border-zinc-300"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            SECCIÓN 2: TRABAJOS AGRUPADOS POR MÓDULO (SIN VALORES)
            =================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-1">
            <h2 className="text-sm font-normal text-zinc-800 flex items-center gap-1.5">
              <span>💼</span>
              <span>Trabajos ({items.length})</span>
            </h2>
          </div>

          {gruposModulos.length === 0 ? (
            <div className="py-6 text-center text-sm font-normal text-zinc-400 italic bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
              No se han agregado trabajos a la propuesta todavía.
            </div>
          ) : (
            <div className="space-y-3">
              {gruposModulos.map((mod) => (
                <div key={mod.id} className="rounded-xl border border-zinc-200 overflow-hidden bg-white text-sm">
                  {/* Cabecera del Módulo (Taller, Lubricentro, Car Wash, Tecnicentro) */}
                  <div className="bg-zinc-100 px-3.5 py-1.5 font-normal text-zinc-900 flex items-center gap-2 border-b border-zinc-200 text-sm">
                    <span>{mod.icon}</span>
                    <span>{mod.nombre}</span>
                    <span className="text-sm bg-zinc-200 px-2 py-0.5 rounded font-normal text-zinc-700 ml-auto">
                      {mod.totalItems} {mod.totalItems === 1 ? "trabajo" : "trabajos"}
                    </span>
                  </div>

                  {/* Subcategorías y Lista de Trabajos (Sin Valores) */}
                  <div className="divide-y divide-zinc-200">
                    {mod.subcategorias.map((sub, sIdx) => (
                      <div key={sIdx} className="bg-white">
                        {/* Subcategoría directamente debajo del módulo */}
                        <div className="bg-zinc-50/70 px-3.5 py-1.5 flex items-center justify-between border-b border-zinc-100">
                          <span className="font-normal text-zinc-700 text-sm flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                            {formatoPrimeraMayuscula(sub.nombre)}
                          </span>
                          <span className="text-sm font-normal text-zinc-500">
                            {sub.items.length} {sub.items.length === 1 ? "ítem" : "ítems"}
                          </span>
                        </div>

                        {/* Lista de trabajos (Sin Valores) */}
                        <div className="divide-y divide-zinc-100 px-3.5 py-1">
                          {sub.items.map((it, itIdx) => {
                            const cant = Number(it.qty) || 1;
                            return (
                              <div
                                key={it.id || itIdx}
                                className="py-2 flex items-center justify-between gap-3 text-sm"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 font-normal text-xs flex items-center justify-center shrink-0 border border-zinc-200">
                                    #{itIdx + 1}
                                  </span>
                                  <span className="font-normal text-zinc-900 truncate text-sm">
                                    {formatoPrimeraMayuscula(it.name)}
                                  </span>
                                </div>
                                {cant > 1 && (
                                  <span className="text-sm font-normal text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md shrink-0">
                                    Cant: {cant}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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

          <button
            type="button"
            onClick={handleImprimir}
            className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-normal transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95"
          >
            <span>Descargar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
