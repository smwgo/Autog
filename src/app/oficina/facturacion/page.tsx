"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { OficinaMobileNav } from "@/components/OficinaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { Paginacion, paginarLista } from "@/components/Paginacion";
import { useEffect, useState, useMemo, useRef } from "react";

type PeriodoFiltro = "todos" | "semana" | "quincena" | "mes";
type EstadoFiltro = "todos" | "PENDIENTE_ENVIO" | "AUTORIZADO" | "DEVUELTA" | "NO_ENVIAR";

function ModernFilterDropdown<T extends string>({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: T;
  options: {
    value: T;
    label: string;
    shortLabel?: string;
    sublabel?: string;
    badge?: number;
    badgeColor?: "amber" | "emerald" | "rose" | "zinc" | "purple";
  }[];
  onChange: (val: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value) || options[0];
  const isDefault = value === "todos";
  const displayLabel = isDefault ? label : (selected?.shortLabel || selected?.label || label);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`h-10 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
          !isDefault
            ? "border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/25"
            : "border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }`}
      >
        <span className="shrink-0 text-zinc-500 dark:text-zinc-400 flex items-center">{icon}</span>
        <span className="font-semibold">{displayLabel}</span>
        {selected?.badge !== undefined && selected.badge > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
            {selected.badge}
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl border border-zinc-200/90 dark:border-zinc-700/80 bg-white dark:bg-[#121824] p-1.5 shadow-2xl shadow-zinc-900/15 dark:shadow-black/70 backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/80 mb-1 flex items-center justify-between">
            <span>Filtrar por {label}</span>
            {!isDefault && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(options[0].value);
                  setOpen(false);
                }}
                className="text-purple-600 dark:text-purple-400 hover:underline font-normal capitalize"
              >
                Restablecer
              </button>
            )}
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition cursor-pointer ${
                    active
                      ? "bg-purple-600/10 text-purple-600 dark:text-purple-400 font-bold"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal truncate">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge !== undefined && opt.badge > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          opt.badgeColor === "amber"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : opt.badgeColor === "emerald"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : opt.badgeColor === "rose"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {active && (
                      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.26a1 1 0 0 1-1.42.003L3.294 9.17a1 1 0 1 1 1.412-1.416l4.086 4.078 6.498-6.548a1 1 0 0 1 1.414.006Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FacturacionSRI() {
  const [tab, setTab] = useState<"facturas" | "notas">("facturas");
  const [facturas, setFacturas] = useState<any[]>([]);
  const [notas, setNotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todos");

  // Selección múltiple para lotes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [procesandoLote, setProcesandoLote] = useState(false);
  const [resultadoLote, setResultadoLote] = useState<any | null>(null);
  const [loteConfirm, setLoteConfirm] = useState<string[] | null>(null);

  // Transmisión individual y reintentos
  const [enviandoIndividualId, setEnviandoIndividualId] = useState<string | null>(null);

  // Modal Enviar Correo Individual
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [targetEmail, setTargetEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ text: string; error: boolean } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oficina/facturacion");
      if (res.ok) {
        const data = await res.json();
        setFacturas(data.facturas || []);
        setNotas(data.notas || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Función para determinar si una fecha calza en el periodo seleccionado
  const matchesPeriodo = (dateStr: string, p: PeriodoFiltro): boolean => {
    if (p === "todos" || !dateStr) return true;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const toYMD = (dt: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    };

    const invDate = dateStr.slice(0, 10);

    if (p === "semana") {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(d + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return invDate >= toYMD(monday) && invDate <= toYMD(sunday);
    }

    if (p === "quincena") {
      let start: Date;
      let end: Date;
      if (d <= 15) {
        start = new Date(y, m, 1);
        end = new Date(y, m, 15);
      } else {
        start = new Date(y, m, 16);
        end = new Date(y, m + 1, 0);
      }
      return invDate >= toYMD(start) && invDate <= toYMD(end);
    }

    if (p === "mes") {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return invDate >= toYMD(start) && invDate <= toYMD(end);
    }

    return true;
  };

  // Filtrado de facturas
  const filteredFacturas = useMemo(() => {
    return facturas.filter((f) => {
      // Búsqueda por texto
      const matchesSearch =
        `${f.invoiceNumber || ""} ${f.clientName || ""} ${f.clientRfc || ""} ${f.claveAcceso || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Filtro de periodo
      if (!matchesPeriodo(f.date || f.createdAt, periodo)) return false;

      // Filtro de estado
      if (estadoFiltro !== "todos") {
        if (estadoFiltro === "PENDIENTE_ENVIO") {
          return (
            f.estadoSri === "PENDIENTE_ENVIO" ||
            f.estadoSri === "PENDIENTE" ||
            f.estadoSri === "PENDIENTE_FIRMA" ||
            f.estadoSri === "RECIBIDA" ||
            f.estadoSri === "EN_PROCESO"
          );
        }
        if (estadoFiltro === "AUTORIZADO") {
          return f.estadoSri === "AUTORIZADO" || f.status === "Autorizado";
        }
        if (estadoFiltro === "DEVUELTA") {
          return f.estadoSri === "DEVUELTA" || f.estadoSri === "NO_AUTORIZADO" || f.status === "Rechazado";
        }
        if (estadoFiltro === "NO_ENVIAR") {
          return f.estadoSri === "NO_ENVIAR";
        }
      }

      return true;
    });
  }, [facturas, search, periodo, estadoFiltro]);

  const filteredNotas = useMemo(() => {
    return notas.filter((n) =>
      `${n.noteNumber || ""} ${n.clientName || ""} ${n.invoiceRef || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [notas, search]);

  // Facturas pendientes dentro de la vista actual
  const pendientesVisibles = useMemo(() => {
    return filteredFacturas.filter(
      (f) =>
        f.estadoSri === "PENDIENTE_ENVIO" ||
        f.estadoSri === "PENDIENTE" ||
        f.estadoSri === "PENDIENTE_FIRMA" ||
        f.estadoSri === "RECIBIDA" ||
        f.estadoSri === "EN_PROCESO"
    );
  }, [filteredFacturas]);

  const [paginaActual, setPaginaActual] = useState(1);
  useEffect(() => {
    setPaginaActual(1);
  }, [search, periodo, estadoFiltro]);

  const { itemsPaginados: facturasPaginadas, paginaValida } = paginarLista(
    filteredFacturas,
    paginaActual
  );

  // Métricas globales
  const totalAutorizado = facturas
    .filter((f) => f.estadoSri === "AUTORIZADO" || f.status === "Autorizado")
    .reduce((acc, f) => acc + Number(f.amount || 0), 0);

  const countPendientesEnvio = facturas.filter(
    (f) =>
      f.estadoSri === "PENDIENTE_ENVIO" ||
      f.estadoSri === "PENDIENTE" ||
      f.estadoSri === "RECIBIDA" ||
      f.estadoSri === "EN_PROCESO" ||
      f.estadoSri === "PENDIENTE_FIRMA"
  ).length;

  const countRechazados = facturas.filter(
    (f) => f.estadoSri === "DEVUELTA" || f.estadoSri === "NO_AUTORIZADO" || f.status === "Rechazado"
  ).length;

  const countNoEnviar = facturas.filter((f) => f.estadoSri === "NO_ENVIAR").length;

  // Manejadores de Selección
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFacturas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFacturas.map((f) => f.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const seleccionarSoloPendientes = () => {
    setSelectedIds(pendientesVisibles.map((f) => f.id));
  };

  // Enviar Factura Individual al SRI
  const handleEnviarIndividualSri = async (invoice: any) => {
    setEnviandoIndividualId(invoice.id);
    try {
      const res = await fetch(`/api/oficina/facturacion/${invoice.id}/enviar-sri`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enviarCorreo: false }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Factura #${invoice.invoiceNumber} AUTORIZADA oficialmente por el SRI.`);
      } else {
        alert(`⚠️ Respuesta del SRI: ${data.error || data.estadoSri || "No autorizado"}`);
      }
      await loadData();
    } catch (err: any) {
      alert("Error al comunicar con el SRI: " + err.message);
    } finally {
      setEnviandoIndividualId(null);
    }
  };

  // Procesar Lote de Facturas al SRI
  const handleEnviarLoteSri = (idsAEnviar?: string[]) => {
    const ids = idsAEnviar || selectedIds;
    if (ids.length === 0) return;
    setLoteConfirm(ids);
  };

  const handleEjecutarLoteSri = async () => {
    if (!loteConfirm || loteConfirm.length === 0) return;
    const ids = loteConfirm;
    setLoteConfirm(null);
    setProcesandoLote(true);
    setResultadoLote(null);

    try {
      const res = await fetch("/api/oficina/facturacion/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "enviar_sri",
          invoiceIds: ids,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResultadoLote(data);
        setSelectedIds([]);
        await loadData();
      } else {
        alert(data.error || "Error al procesar el lote.");
      }
    } catch (err: any) {
      alert("Error de conexión al procesar lote: " + err.message);
    } finally {
      setProcesandoLote(false);
    }
  };

  // Decisión: Marcar como No Enviar o Habilitar
  const handleCambiarDecisionLote = async (accion: "no_enviar" | "habilitar", ids?: string[]) => {
    const targetIds = ids || selectedIds;
    if (targetIds.length === 0) return;

    try {
      const res = await fetch("/api/oficina/facturacion/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion,
          invoiceIds: targetIds,
        }),
      });
      if (res.ok) {
        setSelectedIds([]);
        await loadData();
      }
    } catch (err: any) {
      alert("Error al actualizar estado: " + err.message);
    }
  };

  // Modal Envío Correo
  const openEmailModal = (invoice: any) => {
    setSelectedInvoice(invoice);
    setTargetEmail(invoice.clientEmail || "");
    setEmailMessage(null);
    setEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice) return;
    if (!targetEmail || !targetEmail.includes("@")) {
      setEmailMessage({ text: "Ingresa un correo electrónico válido.", error: true });
      return;
    }

    setSendingEmail(true);
    setEmailMessage(null);
    try {
      const res = await fetch(`/api/oficina/facturacion/${selectedInvoice.id}/enviar-correo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        setEmailMessage({ text: "Factura y RIDE enviados exitosamente al cliente.", error: false });
        setTimeout(() => {
          setEmailModalOpen(false);
          loadData();
        }, 1500);
      } else {
        setEmailMessage({ text: data.error || "No se pudo enviar el correo.", error: true });
      }
    } catch (err: any) {
      setEmailMessage({ text: err.message || "Error al enviar correo", error: true });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col">
        {/* Breadcrumb & Header */}
        <div className="order-1 mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/oficina"
              title="Volver a Oficina"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Factura Electrónica
              </h1>
            </div>
          </div>
        </div>

        {/* Resumen Cards */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg shrink-0">
                💵
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white truncate">${totalAutorizado.toFixed(2)}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-medium truncate">Autorizado</h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-lg shrink-0">
                ⏳
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">{countPendientesEnvio}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-medium truncate">Pendientes</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-lg shrink-0">
                ❌
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">{countRechazados}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-medium truncate">Rechazados</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 text-lg shrink-0">
                🚫
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">{countNoEnviar}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs font-medium truncate">Excluidos</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Barra Unificada: Pestañas, Buscador Expandido y Filtros Desplegables Minimalistas */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-2.5 sm:p-3 mb-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 sm:gap-3">
          {/* Pestañas Principales */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl shrink-0">
            <button 
              onClick={() => setTab("facturas")}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tab === 'facturas' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Facturas ({facturas.length})
            </button>
            <button 
              onClick={() => setTab("notas")}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${tab === 'notas' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Notas ({notas.length})
            </button>
          </div>

          {/* Buscador Más Largo y Flexible */}
          <div className="relative flex-1 min-w-[240px]">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..." 
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/70 focus:bg-white dark:focus:bg-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-xs"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 flex items-center justify-center text-zinc-500 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-100 text-[10px] font-bold absolute right-3 top-2.5 transition cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros Desplegables Modernos y Minimalistas */}
          {tab === "facturas" && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Dropdown Periodo Lote */}
              <ModernFilterDropdown
                label="Periodo"
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
                    <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
                    <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
                    <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
                  </svg>
                }
                value={periodo}
                options={[
                  { value: "todos", label: "Todos los periodos", shortLabel: "Periodo", sublabel: "Sin restricción de fecha" },
                  { value: "semana", label: "Esta Semana", shortLabel: "Semana", sublabel: "Lunes a Domingo actual" },
                  { value: "quincena", label: "Esta Quincena", shortLabel: "Quincena", sublabel: "Quincena en curso (1-15 o 16-fin)" },
                  { value: "mes", label: "Este Mes", shortLabel: "Mes", sublabel: "Mes calendario actual" },
                ]}
                onChange={(val) => setPeriodo(val as PeriodoFiltro)}
              />

              {/* Dropdown Estado SRI */}
              <ModernFilterDropdown
                label="Estado"
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                value={estadoFiltro}
                options={[
                  { value: "todos", label: "Todos los estados", shortLabel: "Estado" },
                  { value: "PENDIENTE_ENVIO", label: "Pendientes de Envío", shortLabel: "Pendientes", badge: countPendientesEnvio, badgeColor: "amber", sublabel: "Listas para enviar al SRI" },
                  { value: "AUTORIZADO", label: "Autorizadas SRI", shortLabel: "Autorizadas", badgeColor: "emerald", sublabel: "Aprobadas por el SRI" },
                  { value: "DEVUELTA", label: "Rechazadas", shortLabel: "Rechazadas", badge: countRechazados, badgeColor: "rose", sublabel: "Devueltas o no autorizadas" },
                  { value: "NO_ENVIAR", label: "Excluidas (No Enviar)", shortLabel: "Excluidas", badge: countNoEnviar, badgeColor: "zinc", sublabel: "Omitidas de la transmisión" },
                ]}
                onChange={(val) => setEstadoFiltro(val as EstadoFiltro)}
              />

              {/* Botón rápido para limpiar filtros activos */}
              {(periodo !== "todos" || estadoFiltro !== "todos") && (
                <button
                  type="button"
                  onClick={() => {
                    setPeriodo("todos");
                    setEstadoFiltro("todos");
                  }}
                  className="h-10 px-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Restablecer filtros"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden xl:inline">Limpiar</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Barra de Acciones por Lote (cuando hay seleccionadas o pendientes en periodo) */}
        {tab === "facturas" && (
          <div className="order-3 mb-4 p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-indigo-500/10 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 text-xs w-full sm:w-auto">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-800 dark:text-zinc-200 select-none">
                <input
                  type="checkbox"
                  checked={filteredFacturas.length > 0 && selectedIds.length === filteredFacturas.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-purple-600"
                />
                <span>Todas ({selectedIds.length}/{filteredFacturas.length})</span>
              </label>

              {pendientesVisibles.length > 0 && (
                <button
                  type="button"
                  onClick={seleccionarSoloPendientes}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-semibold text-[11px] cursor-pointer"
                >
                  Pendientes ({pendientesVisibles.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {/* Botón Lote Seleccionado */}
              {selectedIds.length > 0 ? (
                <>
                  <button
                    onClick={() => handleEnviarLoteSri()}
                    disabled={procesandoLote}
                    className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>🚀</span>
                    <span>{procesandoLote ? "Procesando Lote..." : `Enviar Lote (${selectedIds.length}) al SRI`}</span>
                  </button>

                  <button
                    onClick={() => handleCambiarDecisionLote("no_enviar")}
                    className="h-9 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    title="Excluir de envío al SRI"
                  >
                    <span>🚫</span>
                    <span>No Enviar</span>
                  </button>

                  <button
                    onClick={() => handleCambiarDecisionLote("habilitar")}
                    className="h-9 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    title="Habilitar para envío al SRI"
                  >
                    <span>✅</span>
                    <span>Habilitar</span>
                  </button>
                </>
              ) : (
                /* Botón Rápido por Periodo */
                pendientesVisibles.length > 0 && (
                  <button
                    onClick={() => handleEnviarLoteSri(pendientesVisibles.map((f) => f.id))}
                    disabled={procesandoLote}
                    className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>🚀</span>
                    <span>
                      {procesandoLote
                        ? "Procesando Lote..."
                        : `Enviar al SRI ${
                            periodo === "semana"
                              ? "Semana"
                              : periodo === "quincena"
                              ? "Quincena"
                              : periodo === "mes"
                              ? "Mes"
                              : "Todas"
                          } (${pendientesVisibles.length} pendientes)`}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Modal de Resultado de Lote */}
        {resultadoLote && (
          <div className="order-3 mb-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300 text-sm">
              <span className="flex items-center gap-2">
                <span>🎉</span> Lote Procesado ante el SRI
              </span>
              <button
                onClick={() => setResultadoLote(null)}
                className="text-zinc-400 hover:text-zinc-600 font-normal"
              >
                ✕ Cerrar
              </button>
            </div>
            <div className="flex gap-4 font-semibold text-emerald-700 dark:text-emerald-400">
              <span>Total Enviadas: {resultadoLote.total}</span>
              <span>✅ Autorizadas: {resultadoLote.autorizados}</span>
              <span>⚠️ Devueltas: {resultadoLote.devueltos}</span>
              {resultadoLote.errores > 0 && <span>❌ Errores: {resultadoLote.errores}</span>}
            </div>
          </div>
        )}

        {/* Contenedor de Documentos */}
        <div className="order-4">
          {/* Vista Móvil */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                Cargando documentos...
              </div>
            ) : filteredFacturas.length === 0 ? null : (
              facturasPaginadas.map((row) => {
                const esPendiente =
                  row.estadoSri === "PENDIENTE_ENVIO" ||
                  row.estadoSri === "PENDIENTE" ||
                  row.estadoSri === "PENDIENTE_FIRMA" ||
                  row.estadoSri === "RECIBIDA" ||
                  row.estadoSri === "EN_PROCESO";
                const esAutorizado = row.estadoSri === "AUTORIZADO" || row.status === "Autorizado";
                const esExcluido = row.estadoSri === "NO_ENVIAR";

                return (
                  <div
                    key={row.id}
                    className={`bg-white dark:bg-zinc-900 rounded-2xl border p-4 space-y-2.5 shadow-xs transition-colors ${
                      selectedIds.includes(row.id)
                        ? "border-purple-500 bg-purple-500/5 dark:bg-purple-500/10"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleSelectOne(row.id)}
                          className="w-4 h-4 rounded text-purple-600 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {row.clientName}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                esAutorizado
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : esExcluido
                                  ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                  : row.estadoSri === "DEVUELTA" || row.estadoSri === "NO_AUTORIZADO"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {esExcluido ? "No Enviar" : esPendiente ? "Pendiente Envío" : row.estadoSri || row.status}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">#{row.invoiceNumber}</span>
                            <span> • {row.clientRfc}</span>
                            <span> • {row.date}</span>
                          </p>
                        </div>
                      </div>

                      <span className="text-sm font-black text-zinc-900 dark:text-white shrink-0">
                        ${Number(row.amount || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Acciones individuales */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      {esPendiente && (
                        <>
                          <button
                            onClick={() => handleEnviarIndividualSri(row)}
                            disabled={enviandoIndividualId === row.id}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <span>⚡</span>
                            <span>{enviandoIndividualId === row.id ? "Enviando..." : "Enviar al SRI"}</span>
                          </button>
                          <button
                            onClick={() => handleCambiarDecisionLote("no_enviar", [row.id])}
                            className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium"
                          >
                            🚫 No Enviar
                          </button>
                        </>
                      )}

                      {esExcluido && (
                        <button
                          onClick={() => handleCambiarDecisionLote("habilitar", [row.id])}
                          className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                        >
                          ✅ Habilitar para SRI
                        </button>
                      )}

                      {esAutorizado && (
                        <>
                          <a
                            href={`/api/oficina/facturacion/${row.id}/ride`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                          >
                            📄 RIDE
                          </a>
                          <a
                            href={`/api/oficina/facturacion/${row.id}/xml`}
                            download
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold"
                          >
                            XML
                          </a>
                          <button
                            onClick={() => openEmailModal(row)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold"
                          >
                            ✉️ Correo
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Vista Desktop (Tabla con Checkboxes y Filtros) */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredFacturas.length > 0 && selectedIds.length === filteredFacturas.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Factura</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                    <th className="py-3 px-4 text-center">Documentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">Cargando comprobantes...</td>
                    </tr>
                  ) : filteredFacturas.length === 0 ? null : (
                    facturasPaginadas.map((row) => {
                      const esPendiente =
                        row.estadoSri === "PENDIENTE_ENVIO" ||
                        row.estadoSri === "PENDIENTE" ||
                        row.estadoSri === "PENDIENTE_FIRMA" ||
                        row.estadoSri === "RECIBIDA" ||
                        row.estadoSri === "EN_PROCESO";
                      const esAutorizado = row.estadoSri === "AUTORIZADO" || row.status === "Autorizado";
                      const esExcluido = row.estadoSri === "NO_ENVIAR";
                      const isSelected = selectedIds.includes(row.id);

                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            isSelected
                              ? "bg-purple-50/60 dark:bg-purple-950/20"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(row.id)}
                              className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-xs">
                              #{row.invoiceNumber}
                            </span>
                            {row.claveAcceso && (
                              <p className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]" title={row.claveAcceso}>
                                {row.claveAcceso.slice(0, 14)}...
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">
                            {row.date}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.clientName}</p>
                            <p className="text-xs text-zinc-500 font-mono">{row.clientRfc} {row.clientEmail ? `• ${row.clientEmail}` : ""}</p>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-zinc-900 dark:text-zinc-100">
                            ${Number(row.amount || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                                esAutorizado
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                                  : esExcluido
                                  ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                  : row.estadoSri === "DEVUELTA" || row.estadoSri === "NO_AUTORIZADO"
                                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10"
                                  : "bg-amber-50 text-amber-600 dark:bg-amber-500/10"
                              }`}
                            >
                              {esExcluido ? "No Enviar" : esPendiente ? "Pendiente Envío" : row.estadoSri || row.status}
                            </span>
                          </td>
                          {/* Columna de Decisión / Envío */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {esPendiente ? (
                                <>
                                  <button
                                    onClick={() => handleEnviarIndividualSri(row)}
                                    disabled={enviandoIndividualId === row.id}
                                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                                    title="Enviar esta factura ahora al SRI"
                                  >
                                    <span>⚡</span>
                                    <span>{enviandoIndividualId === row.id ? "Enviando..." : "Enviar SRI"}</span>
                                  </button>

                                  <button
                                    onClick={() => handleCambiarDecisionLote("no_enviar", [row.id])}
                                    className="p-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 text-xs"
                                    title="Marcar como 'No Enviar al SRI'"
                                  >
                                    🚫
                                  </button>
                                </>
                              ) : esExcluido ? (
                                <button
                                  onClick={() => handleCambiarDecisionLote("habilitar", [row.id])}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs"
                                  title="Volver a habilitar para envío al SRI"
                                >
                                  Habilitar
                                </button>
                              ) : esAutorizado ? (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 justify-center">
                                  <span>✓</span> Autorizado
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleEnviarIndividualSri(row)}
                                  disabled={enviandoIndividualId === row.id}
                                  className="px-2 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold"
                                  title="Reintentar autorización"
                                >
                                  Reintentar
                                </button>
                              )}
                            </div>
                          </td>
                          {/* Columna de Documentos (RIDE / XML / Mail) */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {esAutorizado ? (
                                <>
                                  <a
                                    href={`/api/oficina/facturacion/${row.id}/ride`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
                                    title="Ver RIDE PDF"
                                  >
                                    PDF
                                  </a>
                                  <a
                                    href={`/api/oficina/facturacion/${row.id}/xml`}
                                    download
                                    className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs"
                                    title="Descargar XML"
                                  >
                                    XML
                                  </a>
                                  <button
                                    onClick={() => openEmailModal(row)}
                                    className={`p-1 rounded-md ${
                                      row.correoEnviado
                                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40"
                                        : "bg-blue-50 text-blue-600 dark:bg-blue-950/40"
                                    }`}
                                    title="Enviar por correo"
                                  >
                                    ✉️
                                  </button>
                                </>
                              ) : (
                                <span className="text-zinc-400 text-xs italic">
                                  {esExcluido ? "Excluido" : "No timbrado"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Paginacion
              paginaActual={paginaValida}
              totalElementos={filteredFacturas.length}
              onCambiarPagina={setPaginaActual}
            />
          </div>
        </div>
      </main>

      {/* MODAL: Enviar Factura por Correo */}
      {emailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg">
                  ✉️
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Enviar Factura Electrónica
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono">
                    #{selectedInvoice.invoiceNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 text-xs space-y-1">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Cliente: {selectedInvoice.clientName}
                </p>
                <p className="text-zinc-500">
                  RUC / Cédula: {selectedInvoice.clientRfc}
                </p>
                <p className="text-zinc-500">
                  Monto: ${Number(selectedInvoice.amount || 0).toFixed(2)} USD
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Correo Electrónico de Destino
                </label>
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {emailMessage && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  emailMessage.error
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200"
                }`}>
                  {emailMessage.text}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="flex-1 h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-600 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {sendingEmail ? "Enviando..." : "Enviar Correo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRANSMITIR SRI LOTE */}
      {loteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f141d] border border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Transmitir</h3>
            </div>

            <p className="text-sm text-zinc-300">
              ¿Enviar <span className="font-bold text-white font-mono">{loteConfirm.length}</span> facturas al SRI?
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setLoteConfirm(null)}
                className="h-10 rounded-xl border border-zinc-700 text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEjecutarLoteSri}
                className="h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold active:scale-95 transition cursor-pointer"
              >
                Transmitir
              </button>
            </div>
          </div>
        </div>
      )}

      <OficinaMobileNav />
    </div>
  );
}
