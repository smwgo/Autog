"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

function CustomDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickAfuera);
    return () => document.removeEventListener("mousedown", handleClickAfuera);
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
        <span>{opcionSeleccionada?.label || value}</span>
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
                  <span>{opt.label}</span>
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
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) {
      document.addEventListener("mousedown", handleOutside);
    }
    return () => document.removeEventListener("mousedown", handleOutside);
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
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
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

function NuevaFacturaForm() {
  const router = useRouter();

  // Catálogos
  const [catalogo, setCatalogo] = useState<CatalogItem[]>([]);
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  // Configuración del Negocio (Panel de Gerencia / Ajustes)
  const [negocio, setNegocio] = useState({
    nombre: "Lubricentro Conzáles",
    ruc: "1792345678001",
    direccion: "Matriz",
    iva: 15,
  });

  // Metadatos
  const [numeroFactura, setNumeroFactura] = useState("0001");
  const [fechaEmision, setFechaEmision] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [terminoPago, setTerminoPago] = useState("Contado");
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

  // Líneas
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

  // Selector de Catálogo
  const [lineaActivaParaCatalogo, setLineaActivaParaCatalogo] = useState<string | null>(null);
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [filtroTipoCatalogo, setFiltroTipoCatalogo] = useState<"TODOS" | "PRODUCTO" | "SERVICIO">("TODOS");

  // Estado
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  useEffect(() => {
    async function inicializar() {
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

        // Cargar datos de negocio de Gerencia / Ajustes
        if (resConfig.ok) {
          const dConf = await resConfig.json();
          if (dConf.config) {
            setNegocio({
              nombre: dConf.config.nombreComercial || dConf.config.razonSocial || "Lubricentro Conzáles",
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
    inicializar();
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (buscadorClienteRef.current && !buscadorClienteRef.current.contains(e.target as Node)) {
        setMostrarBuscadorCliente(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const seleccionarConsumidorFinal = () => {
    setClienteSeleccionadoId("");
    setClienteIdentificacion("9999999999999");
    setClienteNombre("Consumidor Final");
    setClienteTelefono("");
    setClienteEmail("");
    setClienteDireccion("Quito");
    setMostrarBuscadorCliente(false);
  };

  const seleccionarCliente = (c: Customer) => {
    setClienteSeleccionadoId(c.id);
    setClienteIdentificacion(c.identification || "");
    setClienteNombre(c.name || "");
    setClienteTelefono(c.phone || "");
    setClienteEmail(c.email || "");
    setClienteDireccion(c.address || "Quito");
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

  // Totales
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

  const handleSubmitFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    const itemsValidos = items.filter((i) => i.description.trim() !== "" && i.quantity > 0 && i.unitPrice >= 0);
    if (itemsValidos.length === 0) {
      setErrorMsg("Agrega al menos un producto o servicio.");
      return;
    }

    if (!clienteNombre.trim()) {
      setErrorMsg("Ingresa el nombre del cliente.");
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        customerId: clienteSeleccionadoId || null,
        customerName: clienteNombre.trim(),
        paymentMethod: formaPago,
        discount: Number(totales.totalDescuento.toFixed(2)),
        taxPercent: (negocio.iva || 15) / 100,
        items: itemsValidos.map((i) => ({
          productId: i.productId || undefined,
          code: i.code.trim() || "SRV",
          name: i.description.trim(),
          price: Number(i.unitPrice),
          qty: Number(i.quantity),
        })),
        notes: `Factura: ${numeroFactura} | Placa: ${placaVehiculo || "N/A"} | Término: ${terminoPago} | ${observaciones || ""}`,
      };

      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo emitir la factura.");
      }

      setExitoMsg(`Factura emitida: ${data.venta?.saleNumber || numeroFactura}`);
      setTimeout(() => {
        router.push("/pos/facturas");
      }, 1200);
    } catch (err: any) {
      console.error("Error al emitir factura:", err);
      setErrorMsg(err.message || "Error al emitir la factura.");
    } finally {
      setGuardando(false);
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      <Header />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-24 md:pb-12 space-y-5">
        {/* Encabezado Principal */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/pos/facturas"
              className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Nueva Factura
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pos/facturas"
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={handleSubmitFactura}
              disabled={guardando}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              {guardando ? "Emitiendo..." : "Emitir Factura"}
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
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="text-base font-bold text-zinc-900 dark:text-white">
                {negocio.nombre}
              </div>
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                RUC: {negocio.ruc} • Matriz
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2.5">
              <div className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                <span>Factura:</span>
                <input
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  className="w-24 h-8 px-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-sm font-semibold text-center focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-2.5">
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
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Cliente
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={seleccionarConsumidorFinal}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Consumidor Final
                </button>

                <div className="relative" ref={buscadorClienteRef}>
                  <button
                    type="button"
                    onClick={() => setMostrarBuscadorCliente(!mostrarBuscadorCliente)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors cursor-pointer"
                  >
                    Buscar cliente
                  </button>

                  {mostrarBuscadorCliente && (
                    <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-2 z-50">
                      <input
                        type="text"
                        placeholder="Buscar por nombre o RUC..."
                        value={filtroCliente}
                        onChange={(e) => setFiltroCliente(e.target.value)}
                        autoFocus
                        className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white mb-1.5 focus:outline-none"
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
                              className="w-full text-left py-1.5 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer"
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
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs font-normal focus:outline-none focus:border-blue-500"
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
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs font-normal focus:outline-none focus:border-blue-500"
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
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs font-normal focus:outline-none focus:border-blue-500 uppercase"
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
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs font-normal focus:outline-none focus:border-blue-500"
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
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs font-normal focus:outline-none focus:border-blue-500"
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
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white text-xs font-normal focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Detalle de Ítems */}
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Detalle
              </span>

              <button
                type="button"
                onClick={() => {
                  setLineaActivaParaCatalogo("NUEVA");
                  setBusquedaCatalogo("");
                  setFiltroTipoCatalogo("TODOS");
                }}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>+ Agregar línea</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-left text-xs">
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

          {/* 4. Pago y Totales */}
          <div className="p-5 sm:p-6 bg-zinc-50/50 dark:bg-zinc-950/40">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Forma de Pago y Observaciones */}
              <div className="lg:col-span-7 space-y-3">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Pago y Notas
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Resumen de Totales */}
              <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2.5">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  Resumen
                </span>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                    <span>Subtotal</span>
                    <span className="font-medium text-zinc-900 dark:text-white">${totales.subtotalSinDescuento.toFixed(2)}</span>
                  </div>

                  {totales.totalDescuento > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                      <span>Descuento</span>
                      <span>-${totales.totalDescuento.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                    <span>IVA ({negocio.iva}%)</span>
                    <span className="font-medium text-zinc-900 dark:text-white">${totales.iva.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      Total
                    </span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      ${totales.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitFactura}
                  disabled={guardando}
                  className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {guardando ? "Emitiendo..." : "Emitir Factura"}
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Modal Flotante Selector de Catálogo de Productos y Servicios */}
      {lineaActivaParaCatalogo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Cabecera */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Productos y Servicios
              </h3>
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
                  className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none"
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
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Filtros */}
              <div className="flex gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFiltroTipoCatalogo("TODOS")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
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
                    className="w-full p-2.5 rounded-xl text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 flex items-center justify-between transition-colors cursor-pointer group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
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

                    <div className="text-right">
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
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between text-xs">
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
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <PosMobileNav />
    </div>
  );
}

export default function NuevaFacturaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex items-center justify-center text-sm">
          Cargando...
        </div>
      }
    >
      <NuevaFacturaForm />
    </Suspense>
  );
}
