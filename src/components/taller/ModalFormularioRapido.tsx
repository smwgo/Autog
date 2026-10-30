"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

export type EspecialidadTipo = "taller" | "lubricentro" | "carwash" | "tecnicentro";

export interface ItemPedidoRapido {
  id: string;
  type: "SERVICE" | "PART";
  category: string;
  subCategory?: string;
  code: string;
  name: string;
  price: number;
  qty: number;
  status: "Pendiente" | "En Proceso" | "Listo";
}

export interface ModalFormularioRapidoProps {
  isOpen: boolean;
  onClose: () => void;
  modoInline?: boolean;
  especialidadInicial?: EspecialidadTipo;
  mostrarPanelLubricentro?: boolean;
  mostrarPanelCarwash?: boolean;
  mostrarPanelTecnicentro?: boolean;
  fotoVehiculo?: string | null;
  ordenActiva?: any | null;
  onGuardarItems?: (
    itemsNuevos: ItemPedidoRapido[],
    especialidad: EspecialidadTipo,
    activeOrderFromServer?: any
  ) => Promise<void> | void;
  mostrarToast?: (mensaje: string, tipo?: "ok" | "err" | "info") => void;
  onCambiarEspecialidad?: (especialidad: EspecialidadTipo) => void;
}

interface FilaRegistroManual {
  id: string;
  category: string;
  subCategory: string;
  name: string;
  qty: number;
  price: number;
}

const SUGERENCIAS_POR_ESPECIALIDAD: Record<
  EspecialidadTipo,
  {
    categorias: string[];
    subcategoriasPorCat: Record<string, string[]>;
  }
> = {
  taller: {
    categorias: ["Carrocería", "Motor", "Frenos", "Suspensión", "Eléctrico", "Aire Acondicionado"],
    subcategoriasPorCat: {
      Carrocería: ["Rayón", "Abolladura", "Golpe", "Pintura", "Pulido", "Enderezado"],
      Motor: ["Distribución", "Empaquetaduras", "Retenes", "Motor Mayor", "Refrigeración"],
      Frenos: ["Pastillas", "Discos", "Zapatas", "Purga"],
      Suspensión: ["Amortiguadores", "Trapecios", "Rótulas", "Terminales", "Dirección"],
      Eléctrico: ["Batería", "Alternador", "Arrancador", "Cableado", "Sensores", "Luces"],
      "Aire Acondicionado": ["Compresor", "Gas refrigerante", "Condensador", "Filtro de cabina", "Ventilación"],
    },
  },
  lubricentro: {
    categorias: ["Aceites", "Transmisión", "Filtros", "Fluidos", "Baterías"],
    subcategoriasPorCat: {
      Aceites: ["Motor", "Aditivos", "Flush", "Grasa"],
      Transmisión: ["ATF", "CVT", "Manual", "Diferencial"],
      Filtros: ["Aceite", "Aire", "Cabina", "Combustible"],
      Fluidos: ["Refrigerante", "Frenos", "Hidráulico", "Parabrisas"],
      Baterías: ["Convencional", "AGM", "EFB", "Motos"],
    },
  },
  carwash: {
    categorias: ["Exterior", "Interior", "Completo", "Detailing", "Motor", "Extras"],
    subcategoriasPorCat: {
      Exterior: ["Express", "Espuma", "Chasis"],
      Interior: ["Aspirado", "Tapicería", "Cuero", "Ozono"],
      Completo: ["Auto", "SUV", "Camioneta", "Encerado"],
      Detailing: ["Pulido", "Cerámico", "Faros"],
      Motor: ["Vapor", "Desengrase", "Grafito"],
      Extras: ["Silicona", "Aroma", "Vidrios"],
    },
  },
  tecnicentro: {
    categorias: ["Alineación", "Balanceo", "Neumáticos", "Suspensión", "Frenos", "Diagnóstico"],
    subcategoriasPorCat: {
      Alineación: ["Delantera", "Completa", "Geometría"],
      Balanceo: ["Completo", "Individual", "Vibración"],
      Neumáticos: ["Llantas", "Montaje", "Parche", "Rotación", "Presión"],
      Suspensión: ["Amortiguadores", "Dirección", "Delantero", "Bujes", "Rótulas"],
      Frenos: ["Pastillas", "Discos", "Líquido", "Inspección"],
      Diagnóstico: ["Escáner", "Sensores", "Informe"],
    },
  },
};

const ESPECIALIDADES_INFO = [
  {
    id: "taller" as EspecialidadTipo,
    label: "Taller",
    codePrefix: "TAL",
    activeClass:
      "bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-300 backdrop-blur-md",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091.455.087.935-.012 1.39" />
      </svg>
    ),
  },
  {
    id: "lubricentro" as EspecialidadTipo,
    label: "Lubricentro",
    codePrefix: "LUB",
    activeClass:
      "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-300 backdrop-blur-md",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.25A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      </svg>
    ),
  },
  {
    id: "carwash" as EspecialidadTipo,
    label: "Car Wash",
    codePrefix: "CW",
    activeClass:
      "bg-cyan-500/15 border-cyan-500/30 text-cyan-600 dark:text-cyan-300 backdrop-blur-md",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
  },
  {
    id: "tecnicentro" as EspecialidadTipo,
    label: "Tecnicentro",
    codePrefix: "TC",
    activeClass:
      "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 backdrop-blur-md",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m0 6v6M3 12h6m6 0h6" />
      </svg>
    ),
  },
];

const ATAJOS_CATEGORIA_TALLER = [
  { label: "Carrocería", category: "Carrocería", icon: "🚘" },
  { label: "Motor", category: "Motor", icon: "⚙️" },
  { label: "Frenos", category: "Frenos", icon: "🛑" },
  { label: "Suspensión", category: "Suspensión", icon: "🔩" },
  { label: "Eléctrico", category: "Eléctrico", icon: "⚡" },
  { label: "A/C", category: "Aire Acondicionado", icon: "❄️" },
];

const ATAJOS_LUBRICENTRO = [
  { label: "Aceite motor", category: "Aceites", subCategory: "Motor", icon: "🛢️" },
  { label: "Filtro aceite", category: "Filtros", subCategory: "Aceite", icon: "🔘" },
  { label: "Filtro aire", category: "Filtros", subCategory: "Aire", icon: "🌬️" },
  { label: "Refrigerante", category: "Fluidos", subCategory: "Refrigerante", icon: "❄️" },
  { label: "Líquido frenos", category: "Fluidos", subCategory: "Frenos", icon: "🛑" },
  { label: "Engrase", category: "Aceites", subCategory: "Grasa", icon: "⚙️" },
];

const ATAJOS_CARWASH = [
  { label: "Lavado exterior", category: "Exterior", subCategory: "Express", icon: "🚿" },
  { label: "Aspirado", category: "Interior", subCategory: "Aspirado", icon: "🧹" },
  { label: "Lavado completo", category: "Completo", subCategory: "Auto", icon: "🚘" },
  { label: "SUV / Camioneta", category: "Completo", subCategory: "SUV", icon: "🚙" },
  { label: "Detailing", category: "Detailing", subCategory: "Pulido", icon: "✨" },
  { label: "Lavado de motor", category: "Motor", subCategory: "Vapor", icon: "🧽" },
];

const ATAJOS_TECNICENTRO = [
  { label: "Alineación", category: "Alineación", subCategory: "Completa", icon: "📐" },
  { label: "Balanceo", category: "Balanceo", subCategory: "Completo", icon: "⚖️" },
  { label: "Neumáticos", category: "Neumáticos", subCategory: "Rotación", icon: "🛞" },
  { label: "Suspensión", category: "Suspensión", subCategory: "Amortiguadores", icon: "🔩" },
  { label: "Frenos", category: "Frenos", subCategory: "Inspección", icon: "🛑" },
  { label: "Diagnóstico", category: "Diagnóstico", subCategory: "Informe", icon: "🔍" },
];

function obtenerDefaultsEspecialidad(
  esp: EspecialidadTipo,
  estructura: typeof SUGERENCIAS_POR_ESPECIALIDAD = SUGERENCIAS_POR_ESPECIALIDAD
): {
  defaultCat: string;
  defaultSub: string;
} {
  const cats = estructura[esp]?.categorias || SUGERENCIAS_POR_ESPECIALIDAD[esp]?.categorias || [];
  const defaultCat = cats[0] || "";
  const defaultSub =
    (defaultCat &&
      (estructura[esp]?.subcategoriasPorCat?.[defaultCat]?.[0] ||
        SUGERENCIAS_POR_ESPECIALIDAD[esp]?.subcategoriasPorCat?.[defaultCat]?.[0])) ||
    "";
  return { defaultCat, defaultSub };
}

export default function ModalFormularioRapido({
  isOpen,
  onClose,
  modoInline = false,
  especialidadInicial = "taller",
  mostrarPanelLubricentro = true,
  mostrarPanelCarwash = true,
  mostrarPanelTecnicentro = true,
  fotoVehiculo,
  ordenActiva,
  onGuardarItems,
  mostrarToast,
}: ModalFormularioRapidoProps) {
  const [especialidad, setEspecialidad] = useState<EspecialidadTipo>(especialidadInicial);
  const [estructuraDb, setEstructuraDb] = useState<typeof SUGERENCIAS_POR_ESPECIALIDAD>(
    SUGERENCIAS_POR_ESPECIALIDAD
  );
  const [filas, setFilas] = useState<FilaRegistroManual[]>(() => {
    const { defaultCat, defaultSub } = obtenerDefaultsEspecialidad(especialidadInicial);
    return [
      {
        id: "1",
        category: defaultCat,
        subCategory: defaultSub,
        name: "",
        qty: 1,
        price: 0,
      },
    ];
  });
  // Qué desplegable está abierto: { filaId, tipo: "cat" | "sub", rect } | null
  const [dropdownAbierto, setDropdownAbierto] = useState<{
    filaId: string;
    tipo: "cat" | "sub";
    top: number;
    left: number;
    width: number;
    openUpward?: boolean;
  } | null>(null);
  const [busquedaDropdown, setBusquedaDropdown] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [categoriaTallerSeleccionada, setCategoriaTallerSeleccionada] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  const abrirDropdown = (
    filaId: string,
    tipo: "cat" | "sub",
    el: HTMLElement | null
  ) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuMaxH = 220;
    const openUpward =
      typeof window !== "undefined" &&
      rect.bottom + menuMaxH > window.innerHeight &&
      rect.top > menuMaxH;
    setBusquedaDropdown("");
    setDropdownAbierto({
      filaId,
      tipo,
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUpward,
    });
  };

  // Sincronizar especialidad inicial y cargar estructura real desde Neon PostgreSQL al abrir
  useEffect(() => {
    if (isOpen) {
      setEspecialidad(especialidadInicial);
      const { defaultCat, defaultSub } = obtenerDefaultsEspecialidad(
        especialidadInicial,
        estructuraDb
      );
      setFilas([
        {
          id: "1",
          category: defaultCat,
          subCategory: defaultSub,
          name: "",
          qty: 1,
          price: 0,
        },
      ]);
      setDropdownAbierto(null);
      setBusquedaDropdown("");

      fetch("/api/taller/operacion?estructuraEspecialidades=true", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          if (data?.success && data.estructuraEspecialidades) {
            setEstructuraDb(data.estructuraEspecialidades);
            const defs = obtenerDefaultsEspecialidad(
              especialidadInicial,
              data.estructuraEspecialidades
            );
            setFilas((prev) =>
              prev.length === 1 && !prev[0].name
                ? [{ ...prev[0], category: defs.defaultCat, subCategory: defs.defaultSub }]
                : prev
            );
          }
        })
        .catch(() => {});
    }
  }, [isOpen, especialidadInicial]);

  // Cerrar desplegables al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest("[data-dropdown-manual]")) {
        setDropdownAbierto(null);
        setBusquedaDropdown("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Manejar tecla ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !guardando) {
        if (dropdownAbierto) {
          setDropdownAbierto(null);
        } else {
          if (!modoInline) onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, guardando, onClose, dropdownAbierto]);

  const espActiva = useMemo(
    () => ESPECIALIDADES_INFO.find((e) => e.id === especialidad) || ESPECIALIDADES_INFO[0],
    [especialidad]
  );

  const sugerenciasCategorias = useMemo(
    () =>
      estructuraDb[especialidad]?.categorias ||
      SUGERENCIAS_POR_ESPECIALIDAD[especialidad]?.categorias ||
      [],
    [especialidad, estructuraDb]
  );

  const obtenerSubcategoriasDeCategoria = (cat: string): string[] => {
    const mapa =
      estructuraDb[especialidad]?.subcategoriasPorCat ||
      SUGERENCIAS_POR_ESPECIALIDAD[especialidad]?.subcategoriasPorCat ||
      {};
    const catLimpiada = (cat || "").trim();
    if (catLimpiada && mapa[catLimpiada]) {
      return mapa[catLimpiada];
    }
    const matchKey = Object.keys(mapa).find(
      (k) => k.toLowerCase() === catLimpiada.toLowerCase()
    );
    if (matchKey) return mapa[matchKey];
    return Array.from(new Set(Object.values(mapa).flat()));
  };

  // Total acumulado
  const total = useMemo(() => {
    return filas.reduce(
      (acc, it) => acc + (Number(it.qty) || 0) * (Number(it.price) || 0),
      0
    );
  }, [filas]);
  const primerTrabajo = filas[0];
  const fotoVehiculoMostrar =
    fotoVehiculo ||
    (especialidad === "carwash"
      ? "/images/inspeccion/auto_3d_superior.jpg"
      : "/images/inspeccion/auto_3d_motor.jpg");

  const crearFilaVacia = (override?: Partial<FilaRegistroManual>) => {
    const { defaultCat, defaultSub } = obtenerDefaultsEspecialidad(especialidad, estructuraDb);
    return {
      id: String(Date.now() + Math.random()),
      category: defaultCat,
      subCategory: defaultSub,
      name: "",
      qty: 1,
      price: 0,
      ...override,
    } satisfies FilaRegistroManual;
  };

  const aplicarServicioRapido = (
    servicio: { label: string; category: string; subCategory: string }
  ) => {
    setFilas((prev) => {
      if (!prev[0]) return [crearFilaVacia({ name: servicio.label })];
      return prev.map((fila, index) =>
        index === 0
          ? {
              ...fila,
              category: servicio.category,
              subCategory: servicio.subCategory,
              name: fila.name?.trim() ? fila.name : servicio.label,
            }
          : fila
      );
    });
  };

  const cambiarEspecialidad = (nextEspecialidad: EspecialidadTipo) => {
    setEspecialidad(nextEspecialidad);
    const { defaultCat, defaultSub } = obtenerDefaultsEspecialidad(nextEspecialidad, estructuraDb);
    setFilas([
      {
        id: "1",
        category: defaultCat,
        subCategory: defaultSub,
        name: "",
        qty: 1,
        price: 0,
      },
    ]);
    setDropdownAbierto(null);
    setBusquedaDropdown("");
  };

  const agregarFila = () => {
    setFilas((prev) => [...prev, crearFilaVacia()]);
  };

  const actualizarFila = (
    id: string,
    campo: keyof FilaRegistroManual,
    valor: any
  ) => {
    setFilas((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (campo === "category") {
          const mapa =
            estructuraDb[especialidad]?.subcategoriasPorCat ||
            SUGERENCIAS_POR_ESPECIALIDAD[especialidad]?.subcategoriasPorCat ||
            {};
          const nuevasSubs = mapa[valor] || [];
          return {
            ...f,
            category: valor,
            subCategory: nuevasSubs[0] || f.subCategory || "",
          };
        }
        return { ...f, [campo]: valor };
      })
    );
  };

  const eliminarFila = (id: string) => {
    if (filas.length <= 1) {
      const { defaultCat, defaultSub } = obtenerDefaultsEspecialidad(especialidad, estructuraDb);
      setFilas([
        {
          id: "1",
          category: defaultCat,
          subCategory: defaultSub,
          name: "",
          qty: 1,
          price: 0,
        },
      ]);
      return;
    }
    setFilas((prev) => prev.filter((f) => f.id !== id));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const validas = filas.filter((f) => f.name.trim().length > 0);
    if (validas.length === 0) {
      mostrarToast?.("Ingresa al menos un servicio o trabajo a realizar", "err");
      return;
    }

    const itemsAConstruir: (ItemPedidoRapido & {
      rawCategory?: string;
      rawSubCategory?: string;
      rawName?: string;
    })[] = validas.map((f, idx) => {
      const catClean = (f.category || "").trim();
      const subClean = (f.subCategory || "").trim();

      const categoryFinal =
        especialidad === "lubricentro"
          ? `Lubricentro${catClean ? ` - ${catClean}` : ""}`
          : especialidad === "carwash"
          ? "Car Wash"
          : especialidad === "tecnicentro"
          ? "Tecnicentro"
          : catClean || espActiva.label;

      const prefix =
        catClean && subClean
          ? `[${catClean} / ${subClean}] `
          : catClean
          ? `[${catClean}] `
          : subClean
          ? `[${subClean}] `
          : "";

      return {
        id: `item_${Date.now()}_${idx}`,
        type: especialidad === "lubricentro" ? "PART" : "SERVICE",
        category: categoryFinal,
        subCategory: subClean || undefined,
        rawCategory: catClean || espActiva.label,
        rawSubCategory: subClean || undefined,
        rawName: f.name.trim(),
        code: `${espActiva.codePrefix}-${Date.now().toString().slice(-4)}-${idx + 1}`,
        name: `${prefix}${f.name.trim()}`,
        price: Number(f.price) || 0,
        qty: Number(f.qty) || 1,
        status: "En Proceso",
      };
    });

    setGuardando(true);
    try {
      const res = await fetch("/api/taller/operacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REGISTRAR_TRABAJO_MANUAL",
          especialidad,
          orderId: ordenActiva?.id || undefined,
          items: itemsAConstruir,
        }),
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Error en el servidor (${res.status}): ${errorText.slice(0, 100)}`);
      }
      const data = await res.json();
      if (!data?.success) {
        throw new Error(data?.error || "Error al guardar en Neon PostgreSQL");
      }

      if (data.estructuraEspecialidades) {
        setEstructuraDb(data.estructuraEspecialidades);
      }

      if (onGuardarItems) {
        await onGuardarItems(itemsAConstruir, especialidad, data.activeOrder);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("taller-catalogo-actualizado", {
            detail: { especialidad, data },
          })
        );
      }

      const { defaultCat, defaultSub } = obtenerDefaultsEspecialidad(
        especialidad,
        data.estructuraEspecialidades || estructuraDb
      );
      setFilas([
        {
          id: "1",
          category: defaultCat,
          subCategory: defaultSub,
          name: "",
          qty: 1,
          price: 0,
        },
      ]);
      if (!modoInline) onClose();
    } catch (err: any) {
      console.error("Error al registrar pedido en Neon:", err);
      mostrarToast?.(err?.message || "Error al registrar el pedido en Neon", "err");
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={
        modoInline
          ? "w-full space-y-3 animate-fade-in"
          : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      }
    >
      {modoInline && especialidad === "lubricentro" && mostrarPanelLubricentro ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-start">
          <div className="lg:col-span-8 rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                <span>🚗</span>
                <span>{ordenActiva?.vehicle || "Vehículo en servicio"}</span>
              </h2>
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300">
                Lubricentro
              </span>
            </div>
            <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-blue-200/70 bg-blue-50/60 p-3 dark:border-blue-400/20 dark:bg-blue-500/[0.04] sm:min-h-64">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage: "radial-gradient(#60a5fa 0.8px, transparent 0.8px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <img
                src={fotoVehiculoMostrar}
                alt={`Vehículo para servicio de lubricentro: ${ordenActiva?.vehicle || "automóvil"}`}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/images/inspeccion/auto_3d_motor.jpg";
                }}
                className={`relative z-10 max-h-56 w-full object-contain sm:max-h-72 ${
                  fotoVehiculo ? "" : "mix-blend-multiply dark:mix-blend-screen"
                }`}
              />
              <span className="absolute right-3 top-3 z-20 rounded-full border border-zinc-200 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-zinc-800 shadow-sm dark:border-white/15 dark:bg-[#18181b]/90 dark:text-white">
                🛠️ Vista del vehículo
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono font-bold text-zinc-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                {ordenActiva?.plate || "Sin placa"}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {ordenActiva?.client || "Sin cliente asignado"}
              </span>
              <span className="ml-auto rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                Se realizará: {primerTrabajo?.category || "Aceites"}
                {primerTrabajo?.subCategory ? ` · ${primerTrabajo.subCategory}` : ""}
                {primerTrabajo?.name ? ` — ${primerTrabajo.name}` : ""}
              </span>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-4">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                  <span>🧰</span>
                  <span>Servicios de Lubricentro</span>
                </h2>
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                  Selección rápida
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ATAJOS_LUBRICENTRO.map((servicio) => (
                  <button
                    key={servicio.label}
                    type="button"
                    onClick={() => aplicarServicioRapido(servicio)}
                    className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-1.5 py-2 text-[10px] font-bold text-zinc-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 active:scale-95 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
                  >
                    <span className="text-base leading-none">{servicio.icon}</span>
                    <span className="text-center leading-tight">{servicio.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                  <span>📝</span>
                  <span>Registro Manual</span>
                </h2>
                <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                  {ordenActiva?.items?.length || 0} en orden
                </span>
              </div>
              <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-3 dark:border-white/5 dark:bg-black/20">
                <p className="text-xl font-black text-zinc-900 dark:text-white">${total.toFixed(2)}</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Total de servicios ingresados
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : modoInline && especialidad === "carwash" && mostrarPanelCarwash ? (
        <div className="grid grid-cols-1 items-start gap-3 sm:gap-3.5 lg:grid-cols-12">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4 lg:col-span-8">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                <span>🚘</span>
                <span>{ordenActiva?.vehicle || "Vehículo en servicio"}</span>
              </h2>
              <span className="rounded-full border border-cyan-300 bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300">
                Car Wash
              </span>
            </div>
            <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-cyan-200/70 bg-cyan-50/60 p-3 dark:border-cyan-400/20 dark:bg-cyan-500/[0.04] sm:min-h-64">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage: "radial-gradient(#22d3ee 0.8px, transparent 0.8px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <img
                src={fotoVehiculoMostrar}
                alt={`Vehículo para lavado: ${ordenActiva?.vehicle || "automóvil"}`}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/images/inspeccion/auto_3d_superior.jpg";
                }}
                className={`relative z-10 max-h-56 w-full object-contain sm:max-h-72 ${
                  fotoVehiculo ? "" : "mix-blend-multiply dark:mix-blend-screen"
                }`}
              />
              <span className="absolute right-3 top-3 z-20 rounded-full border border-zinc-200 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-zinc-800 shadow-sm dark:border-white/15 dark:bg-[#18181b]/90 dark:text-white">
                💦 Vista del vehículo
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono font-bold text-zinc-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                {ordenActiva?.plate || "Sin placa"}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {ordenActiva?.client || "Sin cliente asignado"}
              </span>
              <span className="ml-auto rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 font-semibold text-cyan-800 dark:border-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-200">
                Servicio: {primerTrabajo?.category || "Exterior"}
                {primerTrabajo?.subCategory ? ` · ${primerTrabajo.subCategory}` : ""}
                {primerTrabajo?.name ? ` — ${primerTrabajo.name}` : ""}
              </span>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-4">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                  <span>🧼</span>
                  <span>Servicios Car Wash</span>
                </h2>
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                  Selección rápida
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ATAJOS_CARWASH.map((servicio) => (
                  <button
                    key={servicio.label}
                    type="button"
                    onClick={() => {
                      if (!filas[0]) return;
                      setFilas((prev) =>
                        prev.map((fila, index) =>
                          index === 0
                            ? {
                                ...fila,
                                category: servicio.category,
                                subCategory: servicio.subCategory,
                                name: fila.name || servicio.label,
                              }
                            : fila
                        )
                      );
                    }}
                    className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-1.5 py-2 text-[10px] font-bold text-zinc-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 active:scale-95 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-cyan-500/40 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-200"
                  >
                    <span className="text-base leading-none">{servicio.icon}</span>
                    <span className="text-center leading-tight">{servicio.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                  <span>🫧</span>
                  <span>Resumen del lavado</span>
                </h2>
                <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                  {ordenActiva?.items?.length || 0} en orden
                </span>
              </div>
              <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-3 dark:border-white/5 dark:bg-black/20">
                <p className="text-xl font-black text-zinc-900 dark:text-white">${total.toFixed(2)}</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Total de servicios Car Wash ingresados
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : modoInline && especialidad === "tecnicentro" && mostrarPanelTecnicentro ? (
        <div className="grid grid-cols-1 items-start gap-3 sm:gap-3.5 lg:grid-cols-12">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4 lg:col-span-8">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                <span>🚗</span>
                <span>{ordenActiva?.vehicle || "Vehículo en servicio"}</span>
              </h2>
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                Tecnicentro
              </span>
            </div>
            <div className="relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/[0.04] sm:min-h-64">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  backgroundImage: "radial-gradient(#34d399 0.8px, transparent 0.8px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <img
                src={fotoVehiculoMostrar}
                alt={`Vehículo para servicio de tecnicentro: ${ordenActiva?.vehicle || "automóvil"}`}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/images/inspeccion/auto_3d_suspension.jpg";
                }}
                className={`relative z-10 max-h-56 w-full object-contain sm:max-h-72 ${
                  fotoVehiculo ? "" : "mix-blend-multiply dark:mix-blend-screen"
                }`}
              />
              <span className="absolute right-3 top-3 z-20 rounded-full border border-zinc-200 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-zinc-800 shadow-sm dark:border-white/15 dark:bg-[#18181b]/90 dark:text-white">
                🛞 Revisión técnica
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono font-bold text-zinc-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                {ordenActiva?.plate || "Sin placa"}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {ordenActiva?.client || "Sin cliente asignado"}
              </span>
              <span className="ml-auto rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                Servicio: {primerTrabajo?.category || "Alineación"}
                {primerTrabajo?.subCategory ? ` · ${primerTrabajo.subCategory}` : ""}
                {primerTrabajo?.name ? ` — ${primerTrabajo.name}` : ""}
              </span>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-4">
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                  <span>🛞</span>
                  <span>Servicios Tecnicentro</span>
                </h2>
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                  Selección rápida
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ATAJOS_TECNICENTRO.map((servicio) => (
                  <button
                    key={servicio.label}
                    type="button"
                    onClick={() => {
                      if (!filas[0]) return;
                      setFilas((prev) =>
                        prev.map((fila, index) =>
                          index === 0
                            ? {
                                ...fila,
                                category: servicio.category,
                                subCategory: servicio.subCategory,
                                name: fila.name || servicio.label,
                              }
                            : fila
                        )
                      );
                    }}
                    className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-1.5 py-2 text-[10px] font-bold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 active:scale-95 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-200"
                  >
                    <span className="text-base leading-none">{servicio.icon}</span>
                    <span className="text-center leading-tight">{servicio.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                  <span>📝</span>
                  <span>Resumen técnico</span>
                </h2>
                <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                  {ordenActiva?.items?.length || 0} en orden
                </span>
              </div>
              <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-3 dark:border-white/5 dark:bg-black/20">
                <p className="text-xl font-black text-zinc-900 dark:text-white">${total.toFixed(2)}</p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Total de servicios técnicos ingresados
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : modoInline && especialidad === "tecnicentro" ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                <span>🚗</span>
                <span>Orden de Tecnicentro</span>
              </h2>
              <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                {ordenActiva ? "Activa" : "Registro"}
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-3 dark:border-white/5 dark:bg-black/20">
              <p className="truncate text-lg font-black text-zinc-900 dark:text-white">
                {ordenActiva?.plate || "Sin vehículo"}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-300">
                {ordenActiva?.vehicle || "Servicios de neumáticos y alineación"}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                <span>🛞</span>
                <span>Servicios rápidos</span>
              </h2>
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                Selección rápida
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ATAJOS_TECNICENTRO.map((servicio) => (
                <button
                  key={servicio.label}
                  type="button"
                  onClick={() => {
                    if (filas[0]) actualizarFila(filas[0].id, "category", servicio.label);
                  }}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50 px-1.5 py-2 text-[10px] font-bold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                >
                  <span className="text-base leading-none">{servicio.icon}</span>
                  <span className="truncate">{servicio.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                <span>📝</span>
                <span>Registro Manual</span>
              </h2>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                {ordenActiva?.items?.length || 0} en orden
              </span>
            </div>
            <div className="rounded-xl border border-zinc-200/70 bg-zinc-50 p-3 dark:border-white/5 dark:bg-black/20">
              <p className="text-xl font-black text-zinc-900 dark:text-white">${total.toFixed(2)}</p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Total de servicios ingresados
              </p>
            </div>
          </div>
        </div>
      ) : modoInline && especialidad === "taller" ? (
        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white">
                <span>🧰</span>
                <span>Productos / Servicios</span>
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ATAJOS_CATEGORIA_TALLER.map((categoria) => (
                <button
                  key={categoria.label}
                  type="button"
                  onClick={() => {
                    setCategoriaTallerSeleccionada(categoria.category);
                    if (filas[0]) {
                      actualizarFila(filas[0].id, "category", categoria.category);
                    }
                  }}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-[10px] font-bold transition active:scale-95 ${
                    categoriaTallerSeleccionada === categoria.category
                      ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500/50 dark:bg-blue-500/15 dark:text-blue-200"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                  }`}
                >
                  <span className="text-base leading-none">{categoria.icon}</span>
                  <span className="text-center leading-tight">{categoria.label}</span>
                </button>
              ))}
            </div>
            {categoriaTallerSeleccionada && (
              <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-white/5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {categoriaTallerSeleccionada === "Aire Acondicionado" ? "A/C" : categoriaTallerSeleccionada}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(estructuraDb.taller.subcategoriasPorCat[categoriaTallerSeleccionada] ||
                    SUGERENCIAS_POR_ESPECIALIDAD.taller.subcategoriasPorCat[categoriaTallerSeleccionada] ||
                    []).map((subcategoria) => (
                    <button
                      key={subcategoria}
                      type="button"
                      onClick={() => {
                        const fila = filas[0];
                        if (!fila) return;
                        actualizarFila(fila.id, "category", categoriaTallerSeleccionada);
                        setFilas((prev) =>
                          prev.map((item, index) =>
                            index === 0 ? { ...item, category: categoriaTallerSeleccionada, subCategory: subcategoria } : item
                          )
                        );
                      }}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                        filas[0]?.subCategory === subcategoria && filas[0]?.category === categoriaTallerSeleccionada
                          ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500/50 dark:bg-blue-500/15 dark:text-blue-200"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-blue-300 hover:bg-blue-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10"
                      }`}
                    >
                      {subcategoria}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {!(
        modoInline &&
        ((especialidad === "lubricentro" && mostrarPanelLubricentro) ||
          (especialidad === "carwash" && mostrarPanelCarwash) ||
          (especialidad === "tecnicentro" && mostrarPanelTecnicentro))
      ) && (
        <div
          className={`relative ${
            modoInline
              ? "w-full max-h-[75dvh] sm:max-h-none"
              : "w-[95%] sm:w-full max-w-lg max-h-[90dvh]"
          } flex flex-col bg-white dark:bg-[#121214] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden`}
        >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/70 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-none truncate">
                {modoInline
                  ? `Registro manual de ${
                      especialidad === "lubricentro"
                        ? "Lubricentro"
                        : especialidad === "tecnicentro"
                          ? "Tecnicentro"
                          : "Taller"
                    }`
                  : "Registrar Trabajo"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 sm:h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label={modoInline ? "Volver al modo normal de Taller" : "Cerrar"}
          >
            {modoInline ? <span>Volver</span> : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>

        {/* Formulario */}
        <form
          ref={formRef}
          onSubmit={handleGuardar}
          onScroll={() => setDropdownAbierto(null)}
          className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 ${modoInline ? "rounded-2xl border border-zinc-200/90 bg-white shadow-2xs dark:border-white/10 dark:bg-white/[0.03]" : ""}`}
        >
          {/* Cabecera superior: Etiqueta única suave y transparente + botón Añadir fila */}
          <div className="flex items-center justify-between gap-2">
            <div
              className={`h-9 px-3.5 rounded-xl text-xs font-normal inline-flex items-center justify-center gap-1.5 border ${espActiva.activeClass}`}
            >
              {espActiva.icon}
              <span>{espActiva.label}</span>
            </div>

            <button
              type="button"
              onClick={agregarFila}
              className="h-8 px-3 rounded-xl text-xs font-normal bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-600 dark:text-blue-300 backdrop-blur-md inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>+ Añadir trabajo</span>
            </button>
          </div>

          {/* Bloques unificados: cada fila incluye su propia Categoría + Subcategoría + Realizar */}
          <div className="space-y-2.5">
            {filas.map((f, index) => {
              const subtotal = (Number(f.qty) || 0) * (Number(f.price) || 0);
              const catMenuOpen =
                dropdownAbierto?.filaId === f.id && dropdownAbierto?.tipo === "cat";
              const subMenuOpen =
                dropdownAbierto?.filaId === f.id && dropdownAbierto?.tipo === "sub";

              return (
                <div
                  key={f.id}
                  className="p-2.5 rounded-xl bg-zinc-50/70 dark:bg-white/[0.02] border border-zinc-200/70 dark:border-white/10 space-y-2"
                >
                  {/* Fila 1 del bloque: Categoría + Subcategoría (buscables y seleccionables) */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Combobox Categoría */}
                    <div data-dropdown-manual className="relative space-y-1">
                      <label className="text-[10px] font-normal uppercase tracking-wider text-zinc-400 block">
                        Categoría
                      </label>
                      <div
                        className={`relative flex items-center w-full h-9 rounded-lg border transition-all ${
                          catMenuOpen
                            ? "bg-white dark:bg-[#18181b] border-blue-500/60 dark:border-blue-400/50 ring-1 ring-blue-500/20"
                            : "bg-white dark:bg-white/[0.04] hover:bg-zinc-100/70 dark:hover:bg-white/[0.07] border-zinc-200 dark:border-white/10"
                        }`}
                      >
                        <input
                          type="text"
                          value={f.category}
                          placeholder="Buscar o elegir..."
                          onFocus={(e) => {
                            const wrapper = e.currentTarget.parentElement;
                            abrirDropdown(f.id, "cat", wrapper);
                            e.currentTarget.select();
                          }}
                          onClick={(e) => {
                            const wrapper = e.currentTarget.parentElement;
                            if (!catMenuOpen) {
                              abrirDropdown(f.id, "cat", wrapper);
                              e.currentTarget.select();
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBusquedaDropdown(val);
                            actualizarFila(f.id, "category", val);
                            if (!catMenuOpen) {
                              abrirDropdown(f.id, "cat", e.currentTarget.parentElement);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const q = busquedaDropdown.trim().toLowerCase();
                              if (q) {
                                const match = sugerenciasCategorias.find((c) =>
                                  c.toLowerCase().includes(q)
                                );
                                if (match) actualizarFila(f.id, "category", match);
                              }
                              setDropdownAbierto(null);
                              setBusquedaDropdown("");
                            }
                          }}
                          className="w-full h-full pl-2.5 pr-7 bg-transparent text-base sm:text-xs font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none truncate"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            const wrapper = e.currentTarget.parentElement;
                            if (catMenuOpen) {
                              setDropdownAbierto(null);
                              setBusquedaDropdown("");
                            } else {
                              abrirDropdown(f.id, "cat", wrapper);
                              const inputEl = wrapper?.querySelector("input");
                              inputEl?.focus();
                              inputEl?.select();
                            }
                          }}
                          className="absolute right-1.5 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          <svg
                            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                              catMenuOpen ? "rotate-180 text-blue-500 dark:text-blue-400" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Combobox Subcategoría */}
                    <div data-dropdown-manual className="relative space-y-1">
                      <label className="text-[10px] font-normal uppercase tracking-wider text-zinc-400 block">
                        Subcategoría
                      </label>
                      <div
                        className={`relative flex items-center w-full h-9 rounded-lg border transition-all ${
                          subMenuOpen
                            ? "bg-white dark:bg-[#18181b] border-blue-500/60 dark:border-blue-400/50 ring-1 ring-blue-500/20"
                            : "bg-white dark:bg-white/[0.04] hover:bg-zinc-100/70 dark:hover:bg-white/[0.07] border-zinc-200 dark:border-white/10"
                        }`}
                      >
                        <input
                          type="text"
                          value={f.subCategory}
                          placeholder="Buscar o elegir..."
                          onFocus={(e) => {
                            const wrapper = e.currentTarget.parentElement;
                            abrirDropdown(f.id, "sub", wrapper);
                            e.currentTarget.select();
                          }}
                          onClick={(e) => {
                            const wrapper = e.currentTarget.parentElement;
                            if (!subMenuOpen) {
                              abrirDropdown(f.id, "sub", wrapper);
                              e.currentTarget.select();
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBusquedaDropdown(val);
                            actualizarFila(f.id, "subCategory", val);
                            if (!subMenuOpen) {
                              abrirDropdown(f.id, "sub", e.currentTarget.parentElement);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const subOpciones = obtenerSubcategoriasDeCategoria(f.category);
                              const q = busquedaDropdown.trim().toLowerCase();
                              if (q) {
                                const match = subOpciones.find((s) =>
                                  s.toLowerCase().includes(q)
                                );
                                if (match) actualizarFila(f.id, "subCategory", match);
                              }
                              setDropdownAbierto(null);
                              setBusquedaDropdown("");
                            }
                          }}
                          className="w-full h-full pl-2.5 pr-7 bg-transparent text-base sm:text-xs font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none truncate"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            const wrapper = e.currentTarget.parentElement;
                            if (subMenuOpen) {
                              setDropdownAbierto(null);
                              setBusquedaDropdown("");
                            } else {
                              abrirDropdown(f.id, "sub", wrapper);
                              const inputEl = wrapper?.querySelector("input");
                              inputEl?.focus();
                              inputEl?.select();
                            }
                          }}
                          className="absolute right-1.5 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                        >
                          <svg
                            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                              subMenuOpen ? "rotate-180 text-blue-500 dark:text-blue-400" : ""
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Fila 2 del bloque: Realizar (Servicio/Trabajo + Cantidad + Precio + Subtotal + Eliminar) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-normal uppercase tracking-wider text-zinc-400 block">
                      Realizar
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={f.name}
                        onChange={(e) => actualizarFila(f.id, "name", e.target.value)}
                        placeholder="Servicio o trabajo a realizar"
                        autoFocus={index === filas.length - 1 && !f.name}
                        className="flex-1 min-w-0 h-9 px-2.5 rounded-lg bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 text-base sm:text-xs font-normal text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />

                      <input
                        type="number"
                        min={1}
                        value={f.qty}
                        onChange={(e) =>
                          actualizarFila(f.id, "qty", parseInt(e.target.value, 10) || 1)
                        }
                        className="w-13 h-9 px-1.5 rounded-lg bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 text-base sm:text-xs font-normal text-center text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        title="Cantidad"
                      />

                      <div className="relative w-20">
                        <span className="absolute left-2 top-2.5 text-[10px] text-zinc-400">$</span>
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          value={f.price === 0 ? "" : f.price}
                          onChange={(e) =>
                            actualizarFila(f.id, "price", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className="w-full h-9 pl-5 pr-1.5 rounded-lg bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 text-base sm:text-xs font-normal text-right text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          title="Precio"
                        />
                      </div>

                      <span className="w-14 text-right text-xs font-normal text-zinc-700 dark:text-zinc-300">
                        ${subtotal.toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => eliminarFila(f.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                        title="Eliminar fila"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pie: Total y Guardar */}
          <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-normal uppercase tracking-wider text-zinc-400">Total</span>
              <div className="text-xl font-normal text-emerald-600 dark:text-emerald-400">
                ${total.toFixed(2)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-xl text-xs font-normal text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="h-10 px-5 rounded-xl text-xs font-normal bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {guardando ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
        </div>
      )}

      {/* Menú desplegable flotante encima del modal (fuera de overflow-hidden) */}
      {dropdownAbierto && (() => {
        const filaActiva = filas.find((item) => item.id === dropdownAbierto.filaId);
        if (!filaActiva) return null;

        const esCat = dropdownAbierto.tipo === "cat";
        const opcionesBase = esCat
          ? sugerenciasCategorias
          : obtenerSubcategoriasDeCategoria(filaActiva.category);
        const valorActual = esCat ? filaActiva.category : filaActiva.subCategory;
        const query = busquedaDropdown.trim().toLowerCase();

        const opcionesFiltradas = query
          ? opcionesBase.filter((op) => op.toLowerCase().includes(query))
          : opcionesBase;

        const existeExacta = opcionesBase.some(
          (op) => op.toLowerCase() === (valorActual || "").trim().toLowerCase()
        );

        return (
          <div
            data-dropdown-manual
            style={{
              position: "fixed",
              left: dropdownAbierto.left,
              width: dropdownAbierto.width,
              ...(dropdownAbierto.openUpward
                ? { bottom: window.innerHeight - dropdownAbierto.top }
                : { top: dropdownAbierto.top }),
            }}
            className="z-[9999] rounded-xl bg-white dark:bg-[#18181c] border border-zinc-200 dark:border-white/15 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 p-1.5 animate-fade-in"
          >
            <div className="max-h-48 overflow-y-auto space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {opcionesFiltradas.map((opcion) => {
                const activo =
                  (valorActual || "").trim().toLowerCase() === opcion.toLowerCase();
                return (
                  <button
                    key={opcion}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      actualizarFila(
                        filaActiva.id,
                        esCat ? "category" : "subCategory",
                        opcion
                      );
                      setDropdownAbierto(null);
                      setBusquedaDropdown("");
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-normal flex items-center justify-between transition-colors cursor-pointer ${
                      activo
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-300"
                        : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.07]"
                    }`}
                  >
                    <span className="truncate">{opcion}</span>
                    {activo && <span className="text-xs">✓</span>}
                  </button>
                );
              })}

              {valorActual.trim() && !existeExacta && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setDropdownAbierto(null);
                    setBusquedaDropdown("");
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs font-normal flex items-center justify-between text-blue-600 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer"
                >
                  <span className="truncate">Usar &ldquo;{valorActual.trim()}&rdquo;</span>
                  <span className="text-[10px] opacity-80">↵</span>
                </button>
              )}

              {opcionesFiltradas.length === 0 && !valorActual.trim() && (
                <div className="px-2.5 py-2 text-[11px] font-normal text-zinc-400 text-center">
                  Escribe para buscar o agregar...
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
