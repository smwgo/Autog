"use client";

import React from "react";
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
  tallerNombre = "TALLER AUTOMOTRIZ ESPECIALIZADO",
  tallerDireccion = "Av. Principal y Panamericana Norte",
  tallerTelefono = "+593 99 999 9999",
  tallerRuc = "1790000000001",
}: ModalPresupuestoPdfProps) {
  if (!abierto || !orden) return null;

  const items = orden.items || [];
  const hallazgos = orden.inspectionFindings || [];

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
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1),
    0
  );
  const descuento = Number(orden.discountAmount) || 0;
  const subtotalConDescuento = Math.max(0, subtotal - descuento);
  const iva = Number(orden.taxAmount) || subtotalConDescuento * 0.15; // 15% IVA default
  const total = subtotalConDescuento + iva;

  const fechaEmision = new Date().toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleImprimir = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleEnviarWhatsApp = () => {
    const telDigits = (orden.clientPhone || "").replace(/\D/g, "");
    const msg = `Hola *${orden.client || "Cliente"}*, le adjuntamos el *Presupuesto Oficial* de su vehículo *${orden.vehicle || ""}* (${orden.plate || ""}) con Orden *#${orden.orderNumber}*.\n\n*Total a pagar:* $${total.toFixed(2)} USD.\n\nContáctenos para cualquier duda o confirmación del trabajo.`;
    const waUrl = telDigits
      ? `https://wa.me/${telDigits.startsWith("593") || telDigits.length > 10 ? telDigits : `593${telDigits.replace(/^0/, "")}`}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white text-zinc-900 rounded-2xl shadow-2xl p-4 sm:p-8 space-y-6 my-auto print:p-0 print:m-0 print:shadow-none print:w-full">
        {/* ===================================================================
            CABECERA DEL DOCUMENTO PDF / IMPRESIÓN
            =================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-zinc-900 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔧</span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 uppercase">
                {tallerNombre}
              </h1>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              RUC: {tallerRuc} • Tel: {tallerTelefono}
            </p>
            <p className="text-xs text-zinc-600">{tallerDireccion}</p>
          </div>

          <div className="text-left sm:text-right bg-zinc-100 p-3 rounded-xl border border-zinc-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
              Documento de Cotización
            </span>
            <span className="text-base sm:text-lg font-mono font-black text-zinc-900 block">
              PRESUPUESTO #{orden.orderNumber}
            </span>
            <span className="text-xs text-zinc-600 font-medium block mt-0.5">
              Fecha: {fechaEmision}
            </span>
          </div>
        </div>

        {/* ===================================================================
            DATOS DEL CLIENTE Y VEHÍCULO
            =================================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Cliente</span>
            <span className="font-bold text-zinc-900 block truncate">{orden.client || "Consumidor Final"}</span>
            <span className="text-zinc-600 font-mono text-[11px]">{orden.clientPhone || "Sin teléfono"}</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Vehículo</span>
            <span className="font-bold text-zinc-900 block truncate">{orden.vehicle || "Vehículo"}</span>
            <span className="font-mono text-zinc-700 font-semibold text-[11px]">Placa: {orden.plate}</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Kilometraje</span>
            <span className="font-bold text-zinc-900 block">
              {orden.mileage ? `${orden.mileage.toLocaleString()} km` : "No registrado"}
            </span>
            <span className="text-zinc-600 text-[11px]">Nivel: {orden.fuelLevel || "1/2"}</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-semibold block uppercase">Técnico / Asesor</span>
            <span className="font-bold text-zinc-900 block truncate">{orden.mechanic || "Taller"}</span>
            <span className="text-emerald-700 font-semibold text-[11px]">Validez: 15 días</span>
          </div>
        </div>

        {/* ===================================================================
            SECCIÓN 1: HALLAZGOS DE INSPECCIÓN POR SECCIÓN (LO QUE SE DETECTÓ)
            =================================================================== */}
        {secciones.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                <span>🔍</span>
                <span>1. Diagnóstico e Inspección Previa del Vehículo</span>
              </h2>
              <span className="text-[11px] font-mono text-zinc-500">
                {hallazgos.length} {hallazgos.length === 1 ? "hallazgo" : "hallazgos"}
              </span>
            </div>

            <div className="space-y-3">
              {secciones.map((sec) => (
                <div key={sec.id} className="rounded-xl border border-zinc-200 overflow-hidden text-xs">
                  <div className="bg-zinc-100 px-3 py-1.5 font-bold text-zinc-800 flex items-center gap-2 border-b border-zinc-200">
                    <span>{sec.icon}</span>
                    <span>{sec.nombre}</span>
                    <span className="text-[10px] bg-zinc-200 px-1.5 py-0.2 rounded font-normal text-zinc-700 ml-auto">
                      {sec.items.length} {sec.items.length === 1 ? "punto" : "puntos"}
                    </span>
                  </div>

                  <div className="divide-y divide-zinc-100 p-2 space-y-2">
                    {sec.items.map((pin) => {
                      const fotosPin = pin.photoUrls || (pin.photoUrl ? [pin.photoUrl] : []);
                      return (
                        <div key={pin.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                #{pin.pinNumber || 1}
                              </span>
                              <span className="font-bold text-zinc-900">{pin.tipo}</span>
                              <span className="text-[10px] text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                                {pin.vistaLabel || pin.vista}
                              </span>
                            </div>
                            {pin.descripcion && (
                              <p className="text-[11px] text-zinc-700 italic pl-7">
                                &quot;{pin.descripcion}&quot;
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
                                  className="w-9 h-9 rounded object-cover border border-zinc-300"
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
            SECCIÓN 2: DETALLE DEL PRESUPUESTO (SERVICIOS Y REPUESTOS)
            =================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
              <span>💼</span>
              <span>2. Trabajos, Servicios y Repuestos Cotizados</span>
            </h2>
            <span className="text-[11px] font-mono text-zinc-500">
              {items.length} {items.length === 1 ? "ítem" : "ítems"}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-400 italic bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
              No se han agregado servicios ni repuestos a la cotización todavía.
            </div>
          ) : (
            <div className="border border-zinc-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-100 text-[10px] uppercase font-bold text-zinc-600 border-b border-zinc-200">
                    <th className="py-2 px-3">Cant.</th>
                    <th className="py-2 px-3">Descripción del Trabajo / Repuesto</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3 text-right">P. Unitario</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {items.map((it, idx) => {
                    const cant = Number(it.qty) || 1;
                    const precio = Number(it.price) || 0;
                    const totalLinea = cant * precio;
                    const esRepuesto = it.type === "PART" || it.category?.includes("Repuesto");

                    return (
                      <tr key={it.id || idx} className="hover:bg-zinc-50/60">
                        <td className="py-2 px-3 font-mono font-bold text-zinc-800">{cant}</td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-zinc-900 block">{it.name}</span>
                          {it.category && (
                            <span className="text-[10px] text-zinc-500 block">{it.category}</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              esRepuesto
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {esRepuesto ? "Repuesto" : "Mano de Obra"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-zinc-700">
                          ${precio.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900">
                          ${totalLinea.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===================================================================
            TOTALES Y FIRMAS
            =================================================================== */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 pt-2">
          {/* Términos y Condiciones */}
          <div className="text-[10px] text-zinc-500 space-y-1 max-w-sm">
            <p className="font-bold text-zinc-700 uppercase">Términos y Condiciones:</p>
            <p>• Los repuestos cotizados cuentan con garantía del fabricante.</p>
            <p>• Mano de obra garantizada por 30 días o 1,000 km.</p>
            <p>• Cualquier daño oculto adicional se informará antes de proceder.</p>
          </div>

          {/* Cuadro de Totales */}
          <div className="w-full sm:w-64 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-xs space-y-1.5 ml-auto">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Descuento:</span>
                <span className="font-mono">-${descuento.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600">
              <span>IVA (15%):</span>
              <span className="font-mono font-semibold">${iva.toFixed(2)}</span>
            </div>
            <div className="border-t border-zinc-300 pt-1.5 flex justify-between text-sm font-black text-zinc-900">
              <span>TOTAL:</span>
              <span className="font-mono text-base text-emerald-700 font-black">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Firmas de Conformidad */}
        <div className="pt-6 border-t-2 border-zinc-900 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="h-12 border-b border-zinc-400 mb-1 flex items-center justify-center">
              <span className="text-[11px] text-zinc-400 italic">Firma del Asesor Técnico</span>
            </div>
            <p className="font-bold text-zinc-900">{orden.mechanic || "Responsable de Taller"}</p>
            <p className="text-[10px] text-zinc-500">Taller Automotriz</p>
          </div>

          <div>
            <div className="h-12 border-b border-zinc-400 mb-1 flex items-center justify-center">
              {orden.receptionSignatureUrl ? (
                <img
                  src={orden.receptionSignatureUrl}
                  alt="Firma Cliente"
                  className="max-h-11 object-contain"
                />
              ) : (
                <span className="text-[11px] text-zinc-400 italic">Firma de Aprobación</span>
              )}
            </div>
            <p className="font-bold text-zinc-900">{orden.client || "Cliente"}</p>
            <p className="text-[10px] text-zinc-500">Aceptación de Presupuesto</p>
          </div>
        </div>

        {/* ===================================================================
            BOTONES DE ACCIÓN (NO SE IMPRIMEN)
            =================================================================== */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-zinc-200 print:hidden">
          <button
            type="button"
            onClick={onCerrar}
            className="h-10 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-700 transition-all cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleEnviarWhatsApp}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95"
          >
            <span>💬 Enviar WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleImprimir}
            className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-600/25 active:scale-95"
          >
            <span>🖨️ Descargar / Imprimir PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
