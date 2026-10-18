"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { PosMobileNav } from "@/components/PosMobileNav";

interface CatalogItem {
  id: string;
  code: string;
  name: string;
  price: number;
  stock?: number;
  isService?: boolean;
  category?: string;
}

interface Customer {
  id: string;
  identification: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  vehicles?: { plate: string }[];
}

interface InvoiceLineItem {
  tempId: string;
  productId?: string;
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxable: boolean;
}

const FORMAS_PAGO = [
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta", label: "Tarjeta" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Crédito", label: "Crédito" },
];

const TERMINOS_PAGO = [
  { value: "Contado", label: "Contado" },
  { value: "15_dias", label: "15 días" },
  { value: "30_dias", label: "30 días" },
  { value: "60_dias", label: "60 días" },
];

const ESTADOS_FACTURA = [
  { value: "Completada", label: "Completada", dot: "bg-emerald-500" },
  { value: "Anulada", label: "Anulada", dot: "bg-rose-500" },
];

function CustomDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; dot?: string }[];
  onChange: (val: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickAfuera);
    document.addEventListener("touchstart", handleClickAfuera);
    return () => {
      document.removeEventListener("mousedown", handleClickAfuera);
      document.removeEventListener("touchstart", handleClickAfuera);
    };
  }, []);

  const opcionSeleccionada = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="w-full px-3.5 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-sm font-normal flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-xs focus:outline-none"
      >
        <span className="flex items-center gap-2">
          {opcionSeleccionada?.dot && (
            <span className={`w-2 h-2 rounded-full ${opcionSeleccionada.dot}`} />
          )}
          <span>{opcionSeleccionada?.label || value}</span>
        </span>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
            abierto ? "rotate-180 text-blue-500" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-0.5">
            {options.map((opt) => {
              const esActivo = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setAbierto(false);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center justify-between cursor-pointer ${
                    esActivo
                      ? "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {opt.dot && <span className={`w-2 h-2 rounded-full ${opt.dot}`} />}
                    <span>{opt.label}</span>
                  </span>
                  {esActivo && (
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatearFecha(dateStr: string): string {
  if (!dateStr) return "";
  const partes = dateStr.split("-").map(Number);
  if (partes.length !== 3) return dateStr;
  const [year, month, day] = partes;
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);

  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const meses = [
    "Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.",
    "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."
  ];

  const diaSem = diasSemana[d.getDay()];
  const mesNom = meses[month - 1];
  const anioCorto = String(year).slice(-2);

  return `${diaSem} ${day} ${mesNom} ${anioCorto}`;
}

function MinimalDatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsearFecha = (val: string) => {
    if (!val) {
      const hoy = new Date();
      return { anio: hoy.getFullYear(), mes: hoy.getMonth(), dia: hoy.getDate() };
    }
    const [y, m, d] = val.split("-").map(Number);
    return { anio: y || 2026, mes: (m ? m - 1 : 9), dia: d || 1 };
  };

  const { anio: valAnio, mes: valMes, dia: valDia } = parsearFecha(value);

  const [navAnio, setNavAnio] = useState(valAnio);
  const [navMes, setNavMes] = useState(valMes);

  useEffect(() => {
    const { anio, mes } = parsearFecha(value);
    setNavAnio(anio);
    setNavMes(mes);
  }, [value]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("touchstart", handleOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [abierto]);

  const mesesNombres = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const diasSemanaCorta = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  const diasEnMes = new Date(navAnio, navMes + 1, 0).getDate();
  const primerDiaSemana = (new Date(navAnio, navMes, 1).getDay() + 6) % 7;

  const mesAnterior = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navMes === 0) {
      setNavMes(11);
      setNavAnio(navAnio - 1);
    } else {
      setNavMes(navMes - 1);
    }
  };

  const mesSiguiente = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navMes === 11) {
      setNavMes(0);
      setNavAnio(navAnio + 1);
    } else {
      setNavMes(navMes + 1);
    }
  };

  const seleccionarDia = (dia: number) => {
    const mStr = String(navMes + 1).padStart(2, "0");
    const dStr = String(dia).padStart(2, "0");
    onChange(`${navAnio}-${mStr}-${dStr}`);
    setAbierto(false);
  };

  const setFechaRapida = (diasOffset: number) => {
    const f = new Date();
    f.setDate(f.getDate() + diasOffset);
    const y = f.getFullYear();
    const m = String(f.getMonth() + 1).padStart(2, "0");
    const d = String(f.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${d}`);
    setAbierto(false);
  };

  return (
    <div className="relative flex flex-col" ref={containerRef}>
      <label className="text-xs text-zinc-600 dark:text-zinc-400 mb-1 font-medium">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-medium flex items-center gap-2 cursor-pointer transition-all shadow-xs"
      >
        <svg
          className="w-3.5 h-3.5 text-blue-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>

        <span className="truncate select-none font-medium text-zinc-800 dark:text-zinc-200">
          {formatearFecha(value)}
        </span>
      </button>

      {/* Popover Minimalista sin filos blancos */}
      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2.5rem)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          {/* Cabecera del Mes */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={mesAnterior}
              className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center cursor-pointer transition-colors text-sm font-bold"
            >
              ‹
            </button>
            <span className="text-xs font-bold text-zinc-900 dark:text-white">
              {mesesNombres[navMes]} {navAnio}
            </span>
            <button
              type="button"
              onClick={mesSiguiente}
              className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center cursor-pointer transition-colors text-sm font-bold"
            >
              ›
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-zinc-400 mb-1">
            {diasSemanaCorta.map((d) => (
              <div key={d} className="py-0.5">{d}</div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: primerDiaSemana }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: diasEnMes }).map((_, i) => {
              const dia = i + 1;
              const esSeleccionado = navAnio === valAnio && navMes === valMes && dia === valDia;
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => seleccionarDia(dia)}
                  className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center font-medium transition-colors cursor-pointer ${
                    esSeleccionado
                      ? "bg-blue-600 text-white font-bold shadow-xs"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {dia}
                </button>
              );
            })}
          </div>

          {/* Atajos Rápidos */}
          <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => setFechaRapida(0)}
              className="px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 font-semibold cursor-pointer"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setFechaRapida(15)}
              className="px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              +15 días
            </button>
            <button
              type="button"
              onClick={() => setFechaRapida(30)}
              className="px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              +30 días
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditarFacturaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  // Estados de catálogos y configuración
  const [catalogo, setCatalogo] = useState<CatalogItem[]>([]);
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [cargandoFactura, setCargandoFactura] = useState(true);

  // Datos de la empresa emisora
  const [negocio, setNegocio] = useState({
    nombre: "Lubricentro González",
    ruc: "1792345678001",
    direccion: "Matriz",
    iva: 15,
  });

  // Metadatos de la Factura
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [terminoPago, setTerminoPago] = useState("Contado");
  const [status, setStatus] = useState("Completada");
  const [observaciones, setObservaciones] = useState("");
  const [placaVehiculo, setPlacaVehiculo] = useState("");

  // Cliente
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState("");
  const [clienteIdentificacion, setClienteIdentificacion] = useState("9999999999999");
  const [clienteNombre, setClienteNombre] = useState("Consumidor Final");
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteDireccion, setClienteDireccion] = useState("Quito");

  // Buscador de Clientes
  const [mostrarBuscadorCliente, setMostrarBuscadorCliente] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState("");
  const buscadorClienteRef = useRef<HTMLDivElement>(null);

  // Líneas de detalle
  const [items, setItems] = useState<InvoiceLineItem[]>([
    {
      tempId: "line-1",
      code: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      discountPercent: 0,
      taxable: true,
    },
  ]);

  // Selector de Catálogo flotante
  const [lineaActivaParaCatalogo, setLineaActivaParaCatalogo] = useState<string | null>(null);
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [filtroTipoCatalogo, setFiltroTipoCatalogo] = useState<"TODOS" | "PRODUCTO" | "SERVICIO">("TODOS");

  // Estado de acción
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Estado para eliminar factura
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Opciones de Impresión (Ticket o A4)
  const [menuImpresionAbierto, setMenuImpresionAbierto] = useState(false);
  const [formatoImpresion, setFormatoImpresion] = useState<"TICKET" | "A4">("A4");
  const menuImpresionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideImpresion = (e: MouseEvent | TouchEvent) => {
      if (menuImpresionRef.current && !menuImpresionRef.current.contains(e.target as Node)) {
        setMenuImpresionAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideImpresion);
    document.addEventListener("touchstart", handleOutsideImpresion);
    return () => {
      document.removeEventListener("mousedown", handleOutsideImpresion);
      document.removeEventListener("touchstart", handleOutsideImpresion);
    };
  }, []);

  const dispararImpresion = (formato: "TICKET" | "A4") => {
    setFormatoImpresion(formato);
    setMenuImpresionAbierto(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // 1. Cargar catálogos y ajustes
  useEffect(() => {
    async function inicializarCatalogos() {
      setCargandoCatalogos(true);
      try {
        const [resProd, resServ, resCli, resConfig] = await Promise.all([
          fetch("/api/productos"),
          fetch("/api/servicios-taller?activos=true"),
          fetch("/api/clientes"),
          fetch("/api/gerencia/configuracion"),
        ]);

        let itemsCombinados: CatalogItem[] = [];

        if (resProd.ok) {
          const dProd = await resProd.json();
          if (dProd.success && Array.isArray(dProd.productos)) {
            itemsCombinados = [
              ...itemsCombinados,
              ...dProd.productos.map((p: any) => ({
                id: p.id,
                code: p.code || "REP",
                name: p.name,
                price: Number(p.price) || 0,
                stock: p.stock ?? 0,
                isService: false,
                category: p.category || "Repuestos",
              })),
            ];
          }
        }

        if (resServ.ok) {
          const dServ = await resServ.json();
          if (dServ.success && Array.isArray(dServ.servicios)) {
            itemsCombinados = [
              ...itemsCombinados,
              ...dServ.servicios.map((s: any) => ({
                id: s.id,
                code: s.code || "SRV",
                name: s.name,
                price: Number(s.price) || 0,
                stock: 999,
                isService: true,
                category: s.category || "Servicios",
              })),
            ];
          }
        }

        setCatalogo(itemsCombinados);

        if (resCli.ok) {
          const dCli = await resCli.json();
          if (dCli.success && Array.isArray(dCli.clientes)) {
            setClientes(dCli.clientes);
          }
        }

        if (resConfig.ok) {
          const dConf = await resConfig.json();
          if (dConf.config) {
            setNegocio({
              nombre: dConf.config.nombreComercial || dConf.config.razonSocial || "Lubricentro González",
              ruc: dConf.config.ruc || "1792345678001",
              direccion: dConf.config.direccion || "Matriz",
              iva: Number(dConf.config.iva) || 15,
            });
          }
        }
      } catch (err) {
        console.error("Error al cargar catálogos y ajustes:", err);
      } finally {
        setCargandoCatalogos(false);
      }
    }
    inicializarCatalogos();
  }, []);

  // 2. Cargar datos de la Factura existente
  useEffect(() => {
    if (!id) {
      setErrorMsg("No se proporcionó un ID de factura válido.");
      setCargandoFactura(false);
      return;
    }

    async function cargarFactura() {
      try {
        setCargandoFactura(true);
        setErrorMsg(null);
        const res = await fetch(`/api/ventas?id=${encodeURIComponent(id!)}`, { cache: "no-store" });
        const data = await res.json();

        if (res.ok && data.success && data.venta) {
          const v = data.venta;
          setNumeroFactura(v.saleNumber || "");
          if (v.createdAt) {
            setFechaEmision(v.createdAt.split("T")[0]);
            const d = new Date(v.createdAt);
            d.setDate(d.getDate() + 30);
            setFechaVencimiento(d.toISOString().split("T")[0]);
          }
          setFormaPago(v.paymentMethod || "Efectivo");
          setStatus(v.status || "Completada");

          // Cliente
          setClienteSeleccionadoId(v.customerId || "");
          setClienteNombre(v.customerName || (v.customer ? v.customer.name : "Consumidor Final"));
          if (v.customer) {
            setClienteIdentificacion(v.customer.identification || "9999999999999");
            setClienteTelefono(v.customer.phone || "");
            setClienteEmail(v.customer.email || "");
            setClienteDireccion(v.customer.address || "Quito");
            if (v.customer.vehicles && v.customer.vehicles.length > 0) {
              setPlacaVehiculo(v.customer.vehicles[0].plate || "");
            }
          }

          // Items
          if (Array.isArray(v.items) && v.items.length > 0) {
            const mappedItems: InvoiceLineItem[] = v.items.map((it: any, idx: number) => ({
              tempId: it.id || `line-${idx}-${Date.now()}`,
              productId: it.productId || undefined,
              code: it.code || "SRV",
              description: it.name || "",
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.price) || 0,
              discountPercent: 0,
              taxable: true,
            }));
            setItems(mappedItems);
          }
        } else {
          setErrorMsg(data.error || "No se encontró la factura solicitada.");
        }
      } catch (err: any) {
        console.error("Error al cargar factura:", err);
        setErrorMsg("Error de conexión al cargar la factura.");
      } finally {
        setCargandoFactura(false);
      }
    }

    cargarFactura();
  }, [id]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (buscadorClienteRef.current && !buscadorClienteRef.current.contains(e.target as Node)) {
        setMostrarBuscadorCliente(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, []);

  const seleccionarConsumidorFinal = () => {
    setClienteSeleccionadoId("");
    setClienteIdentificacion("9999999999999");
    setClienteNombre("Consumidor Final");
    setClienteTelefono("");
    setClienteEmail("");
    setClienteDireccion("Quito");
    setPlacaVehiculo("");
    setMostrarBuscadorCliente(false);
  };

  const seleccionarCliente = (c: Customer) => {
    setClienteSeleccionadoId(c.id);
    setClienteIdentificacion(c.identification || "");
    setClienteNombre(c.name || "");
    setClienteTelefono(c.phone || "");
    setClienteEmail(c.email || "");
    setClienteDireccion(c.address || "Quito");
    if (c.vehicles && c.vehicles.length > 0) {
      setPlacaVehiculo(c.vehicles[0].plate || "");
    }
    setMostrarBuscadorCliente(false);
  };

  const agregarLinea = () => {
    setItems((prev) => [
      ...prev,
      {
        tempId: `line-${Date.now()}`,
        code: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxable: true,
      },
    ]);
  };

  const eliminarLinea = (tempId: string) => {
    if (items.length === 1) {
      setItems([
        {
          tempId: `line-${Date.now()}`,
          code: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
          discountPercent: 0,
          taxable: true,
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const actualizarLinea = (tempId: string, campo: keyof InvoiceLineItem, valor: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        return { ...item, [campo]: valor };
      })
    );
  };

  const asignarItemDeCatalogo = (catItem: CatalogItem) => {
    if (lineaActivaParaCatalogo && lineaActivaParaCatalogo !== "NUEVA") {
      setItems((prev) =>
        prev.map((item) => {
          if (item.tempId !== lineaActivaParaCatalogo) return item;
          return {
            ...item,
            productId: catItem.isService ? undefined : catItem.id,
            code: catItem.code,
            description: catItem.name,
            unitPrice: catItem.price,
          };
        })
      );
    } else {
      const esPrimeraVacia = items.length === 1 && !items[0].description.trim() && items[0].unitPrice === 0;
      if (esPrimeraVacia) {
        setItems([
          {
            tempId: items[0].tempId,
            productId: catItem.isService ? undefined : catItem.id,
            code: catItem.code,
            description: catItem.name,
            quantity: 1,
            unitPrice: catItem.price,
            discountPercent: 0,
            taxable: true,
          },
        ]);
      } else {
        setItems((prev) => [
          ...prev,
          {
            tempId: `line-${Date.now()}`,
            productId: catItem.isService ? undefined : catItem.id,
            code: catItem.code,
            description: catItem.name,
            quantity: 1,
            unitPrice: catItem.price,
            discountPercent: 0,
            taxable: true,
          },
        ]);
      }
    }
    setLineaActivaParaCatalogo(null);
    setBusquedaCatalogo("");
  };

  // Cálculo en tiempo real de totales
  const calcularTotales = () => {
    let subtotalSinDescuento = 0;
    let totalDescuento = 0;
    let subtotalGravado15 = 0;

    items.forEach((item) => {
      const q = Math.max(0, item.quantity);
      const p = Math.max(0, item.unitPrice);
      const lineaBruta = q * p;
      const descPct = Math.min(100, Math.max(0, item.discountPercent)) / 100;
      const lineaDesc = lineaBruta * descPct;
      const lineaNeta = lineaBruta - lineaDesc;

      subtotalSinDescuento += lineaBruta;
      totalDescuento += lineaDesc;

      if (item.taxable) {
        subtotalGravado15 += lineaNeta;
      }
    });

    const ivaRate = (negocio.iva || 15) / 100;
    const subtotal = subtotalSinDescuento - totalDescuento;
    const iva = subtotalGravado15 * ivaRate;
    const total = subtotal + iva;

    return {
      subtotalSinDescuento,
      totalDescuento,
      subtotal,
      iva,
      total,
    };
  };

  const totales = calcularTotales();

  // Guardar Cambios en la Factura
  const handleGuardarCambios = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    if (!id) {
      setErrorMsg("ID de factura no válido.");
      return;
    }

    const itemsValidos = items.filter(
      (i) => i.description.trim() !== "" && i.quantity > 0 && i.unitPrice >= 0
    );
    if (itemsValidos.length === 0) {
      setErrorMsg("Agrega al menos un producto o servicio a la factura.");
      return;
    }

    if (!clienteNombre.trim()) {
      setErrorMsg("Ingresa el nombre del cliente.");
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        id,
        saleNumber: numeroFactura.trim() || undefined,
        status,
        customerName: clienteNombre.trim(),
        customerId: clienteSeleccionadoId || null,
        customerPhone: clienteTelefono.trim(),
        customerEmail: clienteEmail.trim(),
        customerAddress: clienteDireccion.trim(),
        paymentMethod: formaPago,
        discount: Number(totales.totalDescuento.toFixed(2)),
        subtotal: Number(totales.subtotal.toFixed(2)),
        tax: Number(totales.iva.toFixed(2)),
        total: Number(totales.total.toFixed(2)),
        items: itemsValidos.map((i) => ({
          productId: i.productId || null,
          code: i.code.trim() || "SRV",
          name: i.description.trim(),
          price: Number(i.unitPrice),
          quantity: Number(i.quantity),
          total: Number(
            (
              Number(i.unitPrice) *
              Number(i.quantity) *
              (1 - (i.discountPercent || 0) / 100)
            ).toFixed(2)
          ),
        })),
      };

      const res = await fetch("/api/ventas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudieron guardar los cambios de la factura.");
      }

      setExitoMsg(`Factura #${data.venta?.saleNumber || numeroFactura} actualizada exitosamente.`);
      setTimeout(() => {
        router.push("/pos/facturas");
      }, 1200);
    } catch (err: any) {
      console.error("Error al actualizar factura:", err);
      setErrorMsg(err.message || "Error al actualizar la factura.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarFactura = async () => {
    if (!id) return;
    setEliminando(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/ventas?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al eliminar la factura.");
      }
      setMostrarModalEliminar(false);
      setExitoMsg(`Factura #${numeroFactura} eliminada exitosamente.`);
      setTimeout(() => {
        router.push("/pos/facturas");
      }, 1000);
    } catch (err: any) {
      console.error("Error al eliminar factura:", err);
      setErrorMsg(err.message || "No se pudo eliminar la factura.");
      setMostrarModalEliminar(false);
    } finally {
      setEliminando(false);
    }
  };

  const catalogoFiltrado = catalogo.filter((c) => {
    if (filtroTipoCatalogo === "PRODUCTO" && c.isService) return false;
    if (filtroTipoCatalogo === "SERVICIO" && !c.isService) return false;
    if (!busquedaCatalogo.trim()) return true;
    const q = busquedaCatalogo.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.category && c.category.toLowerCase().includes(q))
    );
  });

  const clientesFiltrados = clientes.filter((c) => {
    if (!filtroCliente.trim()) return true;
    const q = filtroCliente.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.identification.toLowerCase().includes(q);
  });

  if (cargandoFactura) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 text-sm">Cargando datos de la factura...</p>
        </main>
        <PosMobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200 print:bg-white print:text-black print:min-h-0 print:p-0">
      {/* Estilos dinámicos de impresión */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: ${formatoImpresion === "TICKET" ? "80mm auto" : "A4 portrait"};
                margin: ${formatoImpresion === "TICKET" ? "3mm 4mm" : "8mm 10mm"};
              }
              body {
                background: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      <div className="print:hidden flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-28 sm:pb-12 space-y-4 sm:space-y-5">
          {/* Encabezado Principal - Adaptado a Móvil y Escritorio */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3 sm:pb-4">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center gap-2.5">
                <Link
                  href="/pos/facturas"
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
                  title="Volver a Facturas"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white leading-tight">
                    Editar Factura {numeroFactura ? `#${numeroFactura}` : ""}
                  </h1>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      status.toLowerCase() === "anulada"
                        ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {status}
                  </span>
                </div>
              </div>

              {/* Botones de Acción Rápida en Móvil (Imprimir y Eliminar) */}
              <div className="flex sm:hidden items-center gap-1.5">
                <div className="relative" ref={menuImpresionRef}>
                  <button
                    type="button"
                    onClick={() => setMenuImpresionAbierto(!menuImpresionAbierto)}
                    className="w-10 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
                    title="Opciones de Impresión"
                  >
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>

                  {menuImpresionAbierto && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Formato de Impresión
                      </div>
                      <button
                        type="button"
                        onClick={() => dispararImpresion("TICKET")}
                        className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 flex items-center gap-3 transition-colors cursor-pointer"
                      >
                        <span className="text-base">🧾</span>
                        <div>
                          <div className="font-semibold text-xs text-zinc-900 dark:text-white">Ticket Térmico</div>
                          <div className="text-[11px] text-zinc-500">Rollo 80mm para POS</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => dispararImpresion("A4")}
                        className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 flex items-center gap-3 transition-colors cursor-pointer"
                      >
                        <span className="text-base">📄</span>
                        <div>
                          <div className="font-semibold text-xs text-zinc-900 dark:text-white">Factura A4</div>
                          <div className="text-[11px] text-zinc-500">Hoja completa estándar</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarModalEliminar(true)}
                  className="w-10 h-10 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-all"
                  title="Eliminar factura"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Acciones principales adaptadas */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Menú de Impresión Desktop */}
              <div className="hidden sm:block relative" ref={menuImpresionRef}>
                <button
                  type="button"
                  onClick={() => setMenuImpresionAbierto(!menuImpresionAbierto)}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  title="Opciones de Impresión"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Imprimir</span>
                  <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${menuImpresionAbierto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuImpresionAbierto && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Formato de Impresión
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => dispararImpresion("TICKET")}
                      className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        🧾
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-zinc-900 dark:text-white">Ticket Térmico</div>
                        <div className="text-[11px] text-zinc-500">Rollo 80mm para POS</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => dispararImpresion("A4")}
                      className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 flex items-center gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        📄
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-zinc-900 dark:text-white">Factura A4</div>
                        <div className="text-[11px] text-zinc-500">Hoja completa estándar</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Botón Eliminar Desktop */}
              <button
                type="button"
                onClick={() => setMostrarModalEliminar(true)}
                className="hidden sm:flex w-10 h-10 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-800 transition-all items-center justify-center cursor-pointer shadow-xs active:scale-95"
                title="Eliminar factura"
                aria-label="Eliminar factura"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <Link
                href="/pos/facturas"
                className="flex-1 sm:flex-initial text-center px-4 py-2.5 sm:py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Cancelar
              </Link>
              <button
                type="button"
                onClick={handleGuardarCambios}
                disabled={guardando}
                className="flex-1 sm:flex-initial text-center px-5 py-2.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20"
              >
                {guardando ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Mensajes */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">✕</button>
            </div>
          )}

          {exitoMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm">
              {exitoMsg}
            </div>
          )}

          {/* Hoja de Factura */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            
            {/* 1. Empresa y Fechas */}
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="text-base font-bold text-zinc-900 dark:text-white">
                  {negocio.nombre}
                </div>
                <div className="text-sm text-zinc-700 dark:text-zinc-300">
                  RUC: {negocio.ruc} • Matriz
                </div>
                {negocio.direccion && negocio.direccion !== "Matriz" && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {negocio.direccion}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
                <div className="flex items-center justify-between sm:justify-end gap-2 text-sm text-zinc-700 dark:text-zinc-300 w-full">
                  <span>Factura:</span>
                  <input
                    type="text"
                    value={numeroFactura}
                    onChange={(e) => setNumeroFactura(e.target.value)}
                    className="w-28 h-9 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-base sm:text-sm font-semibold text-center focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full sm:w-auto">
                  <MinimalDatePicker
                    label="Fecha"
                    value={fechaEmision}
                    onChange={(val) => setFechaEmision(val)}
                  />
                  <MinimalDatePicker
                    label="Vencimiento"
                    value={fechaVencimiento}
                    onChange={(val) => setFechaVencimiento(val)}
                  />
                </div>
              </div>
            </div>

            {/* 2. Cliente */}
            <div className="p-4 sm:p-6 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Cliente
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={seleccionarConsumidorFinal}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Consumidor Final
                  </button>

                  <div className="relative" ref={buscadorClienteRef}>
                    <button
                      type="button"
                      onClick={() => setMostrarBuscadorCliente(!mostrarBuscadorCliente)}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors cursor-pointer"
                    >
                      Buscar cliente
                    </button>

                    {mostrarBuscadorCliente && (
                      <div className="absolute right-0 top-full mt-1.5 w-[calc(100vw-2.5rem)] max-w-sm sm:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-2.5 z-50">
                        <input
                          type="text"
                          placeholder="Buscar por nombre o RUC..."
                          value={filtroCliente}
                          onChange={(e) => setFiltroCliente(e.target.value)}
                          autoFocus
                          className="w-full h-10 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-base sm:text-xs text-zinc-900 dark:text-white mb-2 focus:outline-none"
                        />
                        <div className="max-h-52 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                          {clientesFiltrados.length === 0 ? (
                            <p className="text-zinc-400 text-center py-3">No hay clientes</p>
                          ) : (
                            clientesFiltrados.map((cli) => (
                              <button
                                key={cli.id}
                                type="button"
                                onClick={() => seleccionarCliente(cli)}
                                className="w-full text-left py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              >
                                <div className="font-medium text-zinc-900 dark:text-white">{cli.name}</div>
                                <div className="text-[11px] text-zinc-500">{cli.identification}</div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                    RUC / Cédula
                  </label>
                  <input
                    type="text"
                    value={clienteIdentificacion}
                    onChange={(e) => setClienteIdentificacion(e.target.value)}
                    placeholder="1790012345001"
                    className="w-full h-11 sm:h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-base sm:text-xs font-normal focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                    Cliente / Razón Social
                  </label>
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Nombre o empresa"
                    className="w-full h-11 sm:h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-base sm:text-xs font-normal focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                    Placa
                  </label>
                  <input
                    type="text"
                    value={placaVehiculo}
                    onChange={(e) => setPlacaVehiculo(e.target.value.toUpperCase())}
                    placeholder="PBX-1234"
                    className="w-full h-11 sm:h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-base sm:text-xs font-normal focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="text"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="0991234567"
                    className="w-full h-11 sm:h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-base sm:text-xs font-normal focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                    placeholder="cliente@correo.com"
                    className="w-full h-11 sm:h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-base sm:text-xs font-normal focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={clienteDireccion}
                    onChange={(e) => setClienteDireccion(e.target.value)}
                    placeholder="Dirección del cliente"
                    className="w-full h-11 sm:h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-base sm:text-xs font-normal focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Detalle de Ítems */}
            <div className="p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Detalle de Ítems
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                    {items.length} {items.length === 1 ? "ítem" : "ítems"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLineaActivaParaCatalogo("NUEVA");
                    setBusquedaCatalogo("");
                    setFiltroTipoCatalogo("TODOS");
                  }}
                  className="px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>+ Agregar línea</span>
                </button>
              </div>

              {/* Vista Móvil (Tarjetas táctiles adaptadas a Android e iOS) */}
              <div className="sm:hidden space-y-4">
                {items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    No hay ítems agregados. Pulsa "+ Agregar línea" para añadir uno.
                  </div>
                ) : (
                  items.map((linea, index) => {
                    const q = Math.max(0, linea.quantity);
                    const p = Math.max(0, linea.unitPrice);
                    const subBruto = q * p;
                    const descVal = subBruto * (Math.min(100, Math.max(0, linea.discountPercent)) / 100);
                    const subNeto = subBruto - descVal;

                    return (
                      <div
                        key={linea.tempId}
                        className="bg-zinc-50/70 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3.5 shadow-xs"
                      >
                        {/* Cabecera de la tarjeta: #, Código y Eliminar */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold flex items-center justify-center">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              value={linea.code}
                              onChange={(e) => actualizarLinea(linea.tempId, "code", e.target.value)}
                              placeholder="Código"
                              className="w-24 h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-xs font-mono uppercase focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => eliminarLinea(linea.tempId)}
                            className="w-8 h-8 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                            title="Eliminar línea"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Descripción + Botón Catálogo */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={linea.description}
                            onChange={(e) => actualizarLinea(linea.tempId, "description", e.target.value)}
                            placeholder="Descripción del producto o servicio..."
                            className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-xs focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setLineaActivaParaCatalogo(linea.tempId);
                              setBusquedaCatalogo("");
                            }}
                            title="Buscar en catálogo"
                            className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </button>
                        </div>

                        {/* Grid de Controles: Cantidad, Precio, Descuento */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                              Cant.
                            </label>
                            <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 h-10">
                              <button
                                type="button"
                                onClick={() => actualizarLinea(linea.tempId, "quantity", Math.max(1, (linea.quantity || 1) - 1))}
                                className="w-7 h-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 text-sm font-bold select-none cursor-pointer"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={linea.quantity}
                                onChange={(e) => actualizarLinea(linea.tempId, "quantity", parseFloat(e.target.value) || 0)}
                                className="w-full h-full text-center text-base sm:text-xs font-semibold bg-transparent text-zinc-900 dark:text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => actualizarLinea(linea.tempId, "quantity", (linea.quantity || 1) + 1)}
                                className="w-7 h-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 text-sm font-bold select-none cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                              Precio ($)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={linea.unitPrice}
                              onChange={(e) => actualizarLinea(linea.tempId, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="w-full h-10 px-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-xs font-semibold text-right focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                              Desc. %
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={linea.discountPercent}
                              onChange={(e) => actualizarLinea(linea.tempId, "discountPercent", parseFloat(e.target.value) || 0)}
                              className="w-full h-10 px-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-xs font-semibold text-center focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Pie de la tarjeta: Checkbox IVA y Subtotal destacado */}
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-200/70 dark:border-zinc-800/70">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={linea.taxable}
                              onChange={(e) => actualizarLinea(linea.tempId, "taxable", e.target.checked)}
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                            />
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              Aplica IVA ({negocio.iva}%)
                            </span>
                          </label>

                          <div className="text-right">
                            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-medium">Subtotal</span>
                            <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                              ${subNeto.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Vista Escritorio / Tablet (Tabla Completa con scroll horizontal suave si es necesario) */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-950/80 text-zinc-600 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-28">Código</th>
                      <th className="py-2.5 px-3 min-w-[220px]">Descripción</th>
                      <th className="py-2.5 px-3 w-20 text-center">Cant.</th>
                      <th className="py-2.5 px-3 w-24 text-right">Precio</th>
                      <th className="py-2.5 px-3 w-20 text-center">Desc %</th>
                      <th className="py-2.5 px-3 w-16 text-center">IVA</th>
                      <th className="py-2.5 px-3 w-24 text-right">Subtotal</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900/40">
                    {items.map((linea, index) => {
                      const q = Math.max(0, linea.quantity);
                      const p = Math.max(0, linea.unitPrice);
                      const subBruto = q * p;
                      const descVal = subBruto * (Math.min(100, Math.max(0, linea.discountPercent)) / 100);
                      const subNeto = subBruto - descVal;

                      return (
                        <tr key={linea.tempId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                          <td className="py-2 px-3 text-center text-zinc-400">{index + 1}</td>

                          {/* Código */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={linea.code}
                              onChange={(e) => actualizarLinea(linea.tempId, "code", e.target.value)}
                              placeholder="Código"
                              className="w-full h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs focus:outline-none"
                            />
                          </td>

                          {/* Descripción + Buscar */}
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={linea.description}
                                onChange={(e) => actualizarLinea(linea.tempId, "description", e.target.value)}
                                placeholder="Descripción..."
                                className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLineaActivaParaCatalogo(linea.tempId);
                                  setBusquedaCatalogo("");
                                }}
                                title="Buscar producto o servicio"
                                className="w-8 h-8 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </button>
                            </div>
                          </td>

                          {/* Cantidad */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={linea.quantity}
                              onChange={(e) => actualizarLinea(linea.tempId, "quantity", parseFloat(e.target.value) || 0)}
                              className="w-full h-8 px-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-center text-xs focus:outline-none"
                            />
                          </td>

                          {/* Precio */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={linea.unitPrice}
                              onChange={(e) => actualizarLinea(linea.tempId, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="w-full h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-right text-xs focus:outline-none"
                            />
                          </td>

                          {/* Descuento % */}
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={linea.discountPercent}
                              onChange={(e) => actualizarLinea(linea.tempId, "discountPercent", parseFloat(e.target.value) || 0)}
                              className="w-full h-8 px-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-center text-xs focus:outline-none"
                            />
                          </td>

                          {/* IVA */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={linea.taxable}
                              onChange={(e) => actualizarLinea(linea.tempId, "taxable", e.target.checked)}
                              className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                            />
                          </td>

                          {/* Subtotal */}
                          <td className="py-2 px-3 text-right font-medium text-zinc-900 dark:text-white text-xs">
                            ${subNeto.toFixed(2)}
                          </td>

                          {/* Eliminar */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarLinea(linea.tempId)}
                              className="w-7 h-7 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center justify-center cursor-pointer"
                              title="Eliminar"
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

            {/* 4. Pago, Estado y Totales */}
            <div className="p-4 sm:p-6 bg-zinc-50/50 dark:bg-zinc-950/40">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Forma de Pago, Estado y Observaciones */}
                <div className="lg:col-span-7 space-y-3">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block">
                    Pago y Notas
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <CustomDropdown
                      label="Forma de pago"
                      value={formaPago}
                      options={FORMAS_PAGO}
                      onChange={(val) => setFormaPago(val)}
                    />

                    <CustomDropdown
                      label="Término"
                      value={terminoPago}
                      options={TERMINOS_PAGO}
                      onChange={(val) => setTerminoPago(val)}
                    />

                    <CustomDropdown
                      label="Estado"
                      value={status}
                      options={ESTADOS_FACTURA}
                      onChange={(val) => setStatus(val)}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-600 dark:text-zinc-400 block mb-1">
                      Observaciones
                    </label>
                    <textarea
                      rows={2}
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Notas u observaciones (opcional)..."
                      className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-base sm:text-xs focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                {/* Resumen de Totales */}
                <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3 shadow-xs">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    Resumen de la Factura
                  </span>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                      <span>Subtotal</span>
                      <span className="font-semibold text-zinc-900 dark:text-white font-mono">${totales.subtotalSinDescuento.toFixed(2)}</span>
                    </div>

                    {totales.totalDescuento > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                        <span>Descuento</span>
                        <span className="font-semibold font-mono">-${totales.totalDescuento.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                      <span>IVA ({negocio.iva}%)</span>
                      <span className="font-semibold text-zinc-900 dark:text-white font-mono">${totales.iva.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2.5 flex justify-between items-center">
                      <span className="text-base font-bold text-zinc-900 dark:text-white">
                        Total a Pagar
                      </span>
                      <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                        ${totales.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGuardarCambios}
                    disabled={guardando}
                    className="w-full mt-3 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/20"
                  >
                    {guardando ? "Guardando Cambios..." : "Guardar Cambios"}
                  </button>
                </div>

              </div>
            </div>

          </div>
        </main>

        {/* Modal Flotante Selector de Catálogo de Productos y Servicios */}
        {lineaActivaParaCatalogo && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-150">
              {/* Cabecera */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Productos y Servicios
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Selecciona del inventario para cargar los datos automáticamente
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLineaActivaParaCatalogo(null)}
                  className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Buscador y Pestañas */}
              <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800/60 space-y-2.5">
                <div className="relative">
                  <svg
                    className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por código, nombre o categoría..."
                    value={busquedaCatalogo}
                    onChange={(e) => setBusquedaCatalogo(e.target.value)}
                    autoFocus
                    className="w-full h-11 sm:h-10 pl-9 pr-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-base sm:text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Filtros con scroll horizontal táctil */}
                <div className="flex gap-1.5 text-xs overflow-x-auto no-scrollbar py-0.5">
                  <button
                    type="button"
                    onClick={() => setFiltroTipoCatalogo("TODOS")}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      filtroTipoCatalogo === "TODOS"
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Todos ({catalogo.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipoCatalogo("PRODUCTO")}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      filtroTipoCatalogo === "PRODUCTO"
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Repuestos ({catalogo.filter((c) => !c.isService).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipoCatalogo("SERVICIO")}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      filtroTipoCatalogo === "SERVICIO"
                        ? "bg-blue-600 text-white font-semibold"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    Servicios ({catalogo.filter((c) => c.isService).length})
                  </button>
                </div>
              </div>

              {/* Lista de ítems */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80 p-2">
                {cargandoCatalogos ? (
                  <div className="py-12 text-center text-xs text-zinc-400">Cargando inventario y servicios...</div>
                ) : catalogoFiltrado.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-400">
                    No se encontraron productos o servicios.
                  </div>
                ) : (
                  catalogoFiltrado.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => asignarItemDeCatalogo(item)}
                      className="w-full p-3 rounded-xl text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <div className="space-y-0.5 pr-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                            {item.code}
                          </span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {item.name}
                          </span>
                          {item.isService ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium border border-purple-500/20">
                              Servicio
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                              Stock: {item.stock}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {item.category}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white block font-mono">
                          ${item.price.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                          + Seleccionar
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Pie de modal con opción manual */}
              <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between text-xs pb-safe">
                <button
                  type="button"
                  onClick={() => {
                    agregarLinea();
                    setLineaActivaParaCatalogo(null);
                  }}
                  className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-500 cursor-pointer transition-colors"
                >
                  + Línea manual
                </button>

                <button
                  type="button"
                  onClick={() => setLineaActivaParaCatalogo(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal de Confirmación de Eliminación */}
      {mostrarModalEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  ¿Eliminar factura?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200/60 dark:border-zinc-800 text-xs flex justify-between items-center">
              <span className="font-mono text-zinc-600 dark:text-zinc-400">#{numeroFactura}</span>
              <span className="font-bold text-zinc-900 dark:text-white">${totales.total.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMostrarModalEliminar(false)}
                disabled={eliminando}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminarFactura}
                disabled={eliminando}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-rose-500/20 active:scale-95"
              >
                {eliminando ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <PosMobileNav />
      {/* Fin de UI interactiva (oculta al imprimir) */}
      </div>

      {/* VISTA DE IMPRESIÓN (visible exclusivamente al imprimir) */}
      <div className="hidden print:block w-full bg-white text-black font-sans">
        {formatoImpresion === "TICKET" ? (
          /* ============================================================== */
          /* FORMATO TICKET TÉRMICO (80mm) */
          /* ============================================================== */
          <div className="w-[74mm] max-w-[74mm] mx-auto text-black font-mono text-[11px] leading-tight p-1 bg-white">
            {/* Encabezado Negocio */}
            <div className="text-center space-y-0.5 mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wide">{negocio.nombre}</h2>
              <p className="text-[10px]">RUC: {negocio.ruc}</p>
              <p className="text-[10px]">{negocio.direccion}</p>
              <p className="text-[10px]">Ecuador</p>
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Metadatos Factura */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between font-bold">
                <span>FACTURA:</span>
                <span>#{numeroFactura}</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span>{fechaEmision}</span>
              </div>
              <div className="flex justify-between">
                <span>VENCE:</span>
                <span>{fechaVencimiento}</span>
              </div>
              <div className="flex justify-between">
                <span>PAGO:</span>
                <span>{formaPago} ({terminoPago})</span>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Datos del Cliente */}
            <div className="space-y-0.5 text-[10px]">
              <div><span className="font-bold">CLIENTE:</span> {clienteNombre}</div>
              <div><span className="font-bold">RUC/CI:</span> {clienteIdentificacion}</div>
              {clienteDireccion && <div><span className="font-bold">DIR:</span> {clienteDireccion}</div>}
              {clienteTelefono && <div><span className="font-bold">TEL:</span> {clienteTelefono}</div>}
              {placaVehiculo && <div><span className="font-bold">PLACA:</span> {placaVehiculo}</div>}
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Lista de Items */}
            <div className="text-[10px]">
              <div className="flex justify-between font-bold pb-1 border-b border-black">
                <span className="w-8">CANT</span>
                <span className="flex-1 px-1">DETALLE</span>
                <span className="w-14 text-right">TOTAL</span>
              </div>
              <div className="divide-y divide-dashed divide-zinc-300 py-1 space-y-1">
                {items
                  .filter((i) => i.description.trim())
                  .map((item, idx) => {
                    const qty = item.quantity || 1;
                    const pu = item.unitPrice || 0;
                    const descPct = (item.discountPercent || 0) / 100;
                    const totalLinea = qty * pu * (1 - descPct);
                    return (
                      <div key={idx} className="pt-1">
                        <div className="flex justify-between items-start">
                          <span className="w-8 font-bold">{qty}</span>
                          <span className="flex-1 px-1">{item.description}</span>
                          <span className="w-14 text-right font-bold">${totalLinea.toFixed(2)}</span>
                        </div>
                        {item.discountPercent > 0 && (
                          <div className="text-[9px] text-zinc-600 pl-8">
                            P.U: ${pu.toFixed(2)} | Desc: {item.discountPercent}%
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Totales */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>${totales.subtotalSinDescuento.toFixed(2)}</span>
              </div>
              {totales.totalDescuento > 0 && (
                <div className="flex justify-between">
                  <span>DESCUENTO:</span>
                  <span>-${totales.totalDescuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>BASE IMPONIBLE:</span>
                <span>${totales.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA {negocio.iva || 15}%:</span>
                <span>${totales.iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-black">
                <span>TOTAL A PAGAR:</span>
                <span>${totales.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-3"></div>

            {/* Pie del Ticket */}
            <div className="text-center space-y-1 text-[9px]">
              <p className="font-bold">¡GRACIAS POR SU PREFERENCIA!</p>
              <p>Comprobante de venta emitido en sistema POS.</p>
              <p className="text-[8px] text-zinc-500">AutoG Sistema Automotriz</p>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* FORMATO FACTURA A4 */
          /* ============================================================== */
          <div className="w-full max-w-[210mm] mx-auto text-black font-sans text-xs p-6 bg-white space-y-4">
            {/* Cabecera SRI Oficial */}
            <div className="grid grid-cols-12 gap-4 items-start">
              {/* Información del Emisor */}
              <div className="col-span-6 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                    {negocio.nombre.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 leading-tight">{negocio.nombre}</h2>
                    <p className="text-[11px] text-zinc-600">Servicios Mecánicos y Repuestos Automotrices</p>
                  </div>
                </div>

                <div className="border border-zinc-300 rounded-xl p-3 space-y-1 text-[11px] text-zinc-700 bg-zinc-50/50">
                  <p><span className="font-bold">Dirección Matriz:</span> {negocio.direccion}</p>
                  <p><span className="font-bold">Dirección Sucursal:</span> {negocio.direccion}</p>
                  <p><span className="font-bold">Obligado a Llevar Contabilidad:</span> NO</p>
                  <p><span className="font-bold">Contribuyente Régimen:</span> RIMPE - Negocio Popular</p>
                </div>
              </div>

              {/* Caja Fiscal Factura */}
              <div className="col-span-6 border-2 border-zinc-800 rounded-xl p-3.5 space-y-1.5 bg-zinc-50/30">
                <div className="flex justify-between items-center border-b border-zinc-200 pb-1">
                  <span className="text-[11px] font-bold text-zinc-600 uppercase">R.U.C.</span>
                  <span className="font-mono font-bold text-sm text-zinc-900">{negocio.ruc}</span>
                </div>
                <div className="text-base font-black tracking-wider text-zinc-900">
                  FACTURA
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-600">No.</span>
                  <span className="font-mono font-bold text-blue-700">{numeroFactura ? `#${numeroFactura}` : "001-001"}</span>
                </div>
                <div className="space-y-0.5 text-[10px] text-zinc-600 pt-1 border-t border-zinc-200">
                  <p><span className="font-semibold text-zinc-800">FECHA DE EMISIÓN:</span> {fechaEmision}</p>
                  <p><span className="font-semibold text-zinc-800">FECHA VENCIMIENTO:</span> {fechaVencimiento}</p>
                  <p><span className="font-semibold text-zinc-800">AMBIENTE:</span> PRODUCCIÓN</p>
                  <p><span className="font-semibold text-zinc-800">EMISIÓN:</span> NORMAL</p>
                </div>
              </div>
            </div>

            {/* Datos del Cliente */}
            <div className="border border-zinc-300 rounded-xl p-3 bg-zinc-50/30 grid grid-cols-12 gap-2 text-[11px]">
              <div className="col-span-8">
                <span className="font-bold text-zinc-800">Razón Social / Nombres:</span>{" "}
                <span className="text-zinc-900 uppercase font-semibold">{clienteNombre}</span>
              </div>
              <div className="col-span-4">
                <span className="font-bold text-zinc-800">Identificación:</span>{" "}
                <span className="font-mono font-semibold text-zinc-900">{clienteIdentificacion}</span>
              </div>
              <div className="col-span-8">
                <span className="font-bold text-zinc-800">Dirección:</span>{" "}
                <span className="text-zinc-700">{clienteDireccion || "S/N"}</span>
              </div>
              <div className="col-span-4">
                <span className="font-bold text-zinc-800">Teléfono:</span>{" "}
                <span className="text-zinc-700">{clienteTelefono || "S/N"}</span>
              </div>
              {placaVehiculo && (
                <div className="col-span-4">
                  <span className="font-bold text-zinc-800">Placa:</span>{" "}
                  <span className="font-mono font-bold text-blue-700 uppercase bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {placaVehiculo}
                  </span>
                </div>
              )}
              <div className="col-span-8">
                <span className="font-bold text-zinc-800">Correo:</span>{" "}
                <span className="text-zinc-700">{clienteEmail || "S/N"}</span>
              </div>
            </div>

            {/* Tabla de Productos / Servicios */}
            <div className="border border-zinc-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3 text-center w-12 border-r border-zinc-200">Cant.</th>
                    <th className="py-2 px-3 w-24 border-r border-zinc-200">Código</th>
                    <th className="py-2 px-3 border-r border-zinc-200">Descripción</th>
                    <th className="py-2 px-3 w-24 text-right border-r border-zinc-200">P. Unitario</th>
                    <th className="py-2 px-3 w-20 text-right border-r border-zinc-200">Desc.</th>
                    <th className="py-2 px-3 w-24 text-right">Precio Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-800 text-[11px]">
                  {items
                    .filter((i) => i.description.trim())
                    .map((item, idx) => {
                      const qty = item.quantity || 1;
                      const pu = item.unitPrice || 0;
                      const descVal = qty * pu * ((item.discountPercent || 0) / 100);
                      const totalLinea = qty * pu - descVal;
                      return (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-center font-bold border-r border-zinc-200">{qty}</td>
                          <td className="py-2 px-3 font-mono text-zinc-600 border-r border-zinc-200">{item.code || "SRV"}</td>
                          <td className="py-2 px-3 font-medium border-r border-zinc-200">{item.description}</td>
                          <td className="py-2 px-3 text-right font-mono border-r border-zinc-200">${pu.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono text-zinc-500 border-r border-zinc-200">${descVal.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900">${totalLinea.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Bloque Inferior: Información Adicional y Totales */}
            <div className="grid grid-cols-12 gap-4 items-start pt-1">
              <div className="col-span-7 space-y-2">
                <div className="border border-zinc-300 rounded-xl p-3 bg-zinc-50/40 text-[11px] space-y-1.5">
                  <p className="font-bold text-zinc-800 uppercase text-[10px] tracking-wider border-b border-zinc-200 pb-1">
                    Información Adicional
                  </p>
                  <p><span className="font-semibold text-zinc-700">Forma de Pago:</span> {formaPago}</p>
                  <p><span className="font-semibold text-zinc-700">Término:</span> {terminoPago}</p>
                  {observaciones && <p><span className="font-semibold text-zinc-700">Observaciones:</span> {observaciones}</p>}
                  <p className="text-[10px] text-zinc-500 pt-1">
                    Comprobante emitido con validez tributaria y contable. Gracias por su preferencia.
                  </p>
                </div>
              </div>

              <div className="col-span-5 border border-zinc-300 rounded-xl overflow-hidden divide-y divide-zinc-200 text-xs">
                <div className="flex justify-between py-1.5 px-3 bg-zinc-50/50">
                  <span className="text-zinc-600 font-medium">SUBTOTAL {negocio.iva || 15}%:</span>
                  <span className="font-mono font-semibold">${totales.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-3 bg-zinc-50/50">
                  <span className="text-zinc-600 font-medium">SUBTOTAL 0%:</span>
                  <span className="font-mono font-semibold">$0.00</span>
                </div>
                <div className="flex justify-between py-1.5 px-3 bg-zinc-50/50">
                  <span className="text-zinc-600 font-medium">SUBTOTAL NO OBJETO DE IVA:</span>
                  <span className="font-mono font-semibold">$0.00</span>
                </div>
                <div className="flex justify-between py-1.5 px-3 bg-zinc-50/50">
                  <span className="text-zinc-600 font-medium">SUBTOTAL SIN IMPUESTOS:</span>
                  <span className="font-mono font-semibold">${totales.subtotalSinDescuento.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-3 bg-zinc-50/50">
                  <span className="text-zinc-600 font-medium">TOTAL DESCUENTO:</span>
                  <span className="font-mono font-semibold">-${totales.totalDescuento.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-3 bg-zinc-50/50">
                  <span className="text-zinc-600 font-medium">IVA {negocio.iva || 15}%:</span>
                  <span className="font-mono font-semibold">${totales.iva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 px-3 bg-zinc-100 font-bold text-sm">
                  <span className="text-zinc-900">VALOR TOTAL:</span>
                  <span className="font-mono text-zinc-900">${totales.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditarFacturaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex items-center justify-center text-sm">
          Cargando...
        </div>
      }
    >
      <EditarFacturaForm />
    </Suspense>
  );
}
