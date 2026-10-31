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
  onVolver?: () => void;
  onContinuar?: () => void;
}

interface FilaRegistroManual {
  id: string;
  category: string;
  subCategory: string;
  name: string;
  qty: number;
  price: number;
  photos?: string[];
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

const VISTAS_LUBRICENTRO = [
  { label: "Motor 3D", icon: "🛠️", src: "/images/inspeccion/auto_3d_motor.jpg" },
  { label: "Frenos 3D", icon: "🛑", src: "/images/inspeccion/auto_3d_frenos.jpg" },
  { label: "Suspensión 3D", icon: "🔩", src: "/images/inspeccion/auto_3d_suspension.jpg" },
  { label: "Eléctrico 3D", icon: "⚡", src: "/images/inspeccion/auto_3d_electrico.jpg" },
  { label: "Superior 3D", icon: "🚘", src: "/images/inspeccion/auto_3d_superior.jpg" },
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
  onVolver,
  onContinuar,
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

  // Estados para Dictado y Cámara directa
  const [filaDictandoId, setFilaDictandoId] = useState<string | null>(null);
  const [subiendoFotoFilaId, setSubiendoFotoFilaId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const textoBaseDictadoRef = useRef<string>("");

  const formRef = useRef<HTMLFormElement>(null);

  // Limpiar reconocimiento al desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // Función para dictado por voz (voz a texto directo al input)
  const toggleDictado = (filaId: string) => {
    if (filaDictandoId === filaId) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      setFilaDictandoId(null);
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    const SpeechRecognition =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      mostrarToast?.("Tu navegador no soporta dictado por voz (disponible en Chrome, Safari y Edge)", "err");
      return;
    }

    try {
      const filaActual = filas.find((f) => f.id === filaId);
      textoBaseDictadoRef.current = (filaActual?.name || "").trim();

      const recognition = new SpeechRecognition();
      const navLang = typeof navigator !== "undefined" ? navigator.language : "es-ES";
      recognition.lang = navLang && navLang.startsWith("es") ? navLang : "es-ES";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setFilaDictandoId(filaId);
        mostrarToast?.("🎙️ Dictado activo... habla y se escribirá aquí", "ok");
      };

      recognition.onresult = (event: any) => {
        let finalStr = "";
        let interimStr = "";
        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalStr += item[0].transcript + " ";
          } else {
            interimStr += item[0].transcript;
          }
        }
        const dictado = (finalStr + interimStr).trim();
        if (dictado) {
          const base = textoBaseDictadoRef.current;
          const textoCompleto = base ? (base + " " + dictado) : dictado;
          actualizarFila(filaId, "name", textoCompleto);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("SpeechRecognition error:", e);
        setFilaDictandoId(null);
      };

      recognition.onend = () => {
        setFilaDictandoId(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error iniciando dictado:", err);
      mostrarToast?.("No se pudo iniciar el dictado por voz", "err");
      setFilaDictandoId(null);
    }
  };

  // Función para tomar foto directa con la cámara (capture="environment")
  const handleTomarFotoFila = async (e: React.ChangeEvent<HTMLInputElement>, filaId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoFotoFilaId(filaId);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name || ("foto_trabajo_" + Date.now() + ".jpg"));
      formData.append("folder", "taller_inspeccion_evidencia");
      formData.append("tipo", "image");
      if (ordenActiva?.id) formData.append("orderId", ordenActiva.id);
      if (ordenActiva?.plate) formData.append("plate", ordenActiva.plate);

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setFilas((prev) =>
          prev.map((f) => {
            if (f.id !== filaId) return f;
            const photos = [...(f.photos || []), data.url];
            return { ...f, photos };
          })
        );
        mostrarToast?.("📷 Foto tomada y adjuntada al trabajo", "ok");
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target?.result as string;
          if (base64) {
            setFilas((prev) =>
              prev.map((f) => {
                if (f.id !== filaId) return f;
                const photos = [...(f.photos || []), base64];
                return { ...f, photos };
              })
            );
            mostrarToast?.("📷 Foto tomada y adjuntada", "ok");
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Error subiendo foto:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          setFilas((prev) =>
            prev.map((f) => {
              if (f.id !== filaId) return f;
              const photos = [...(f.photos || []), base64];
              return { ...f, photos };
            })
          );
          mostrarToast?.("📷 Foto capturada", "ok");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setSubiendoFotoFilaId(null);
      e.target.value = "";
    }
  };

  const handleEliminarFotoFila = (filaId: string, photoIdx: number) => {
    setFilas((prev) =>
      prev.map((f) => {
        if (f.id !== filaId) return f;
        const photos = (f.photos || []).filter((_, idx) => idx !== photoIdx);
        return { ...f, photos };
      })
    );
  };

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

  const [vistaLubricentroIdx, setVistaLubricentroIdx] = useState(0);

  const isServicioActivo = (label: string) => {
    const sName = label.trim().toLowerCase();
    return filas.some((f) => f.name.trim().toLowerCase() === sName);
  };

  const toggleServicioRapido = (
    servicio: { label: string; category: string; subCategory: string }
  ) => {
    const sName = servicio.label.trim().toLowerCase();
    const existeIndex = filas.findIndex(
      (f) => f.name.trim().toLowerCase() === sName
    );

    if (existeIndex !== -1) {
      if (filas.length === 1) {
        setFilas([crearFilaVacia()]);
      } else {
        setFilas((prev) => prev.filter((_, idx) => idx !== existeIndex));
      }
      mostrarToast?.(`Removido: ${servicio.label}`, "ok");
    } else {
      setFilas((prev) => {
        if (prev.length === 1 && !prev[0].name.trim()) {
          return [
            {
              ...prev[0],
              category: servicio.category,
              subCategory: servicio.subCategory,
              name: servicio.label,
              qty: 1,
            },
          ];
        }
        return [
          ...prev,
          crearFilaVacia({
            category: servicio.category,
            subCategory: servicio.subCategory,
            name: servicio.label,
            qty: 1,
          }),
        ];
      });
      mostrarToast?.(`✓ Añadido: ${servicio.label}`, "ok");
    }
  };

  const aplicarServicioRapido = toggleServicioRapido;

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
        photos: f.photos && f.photos.length > 0 ? f.photos : undefined,
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
                src={fotoVehiculo || VISTAS_LUBRICENTRO[vistaLubricentroIdx].src}
                alt={`Vehículo para servicio de lubricentro: ${ordenActiva?.vehicle || "automóvil"}`}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = "/images/inspeccion/auto_3d_motor.jpg";
                }}
                className={`relative z-10 max-h-56 w-full object-contain sm:max-h-72 ${
                  fotoVehiculo ? "" : "mix-blend-multiply dark:mix-blend-screen"
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  const nextIdx = (vistaLubricentroIdx + 1) % VISTAS_LUBRICENTRO.length;
                  setVistaLubricentroIdx(nextIdx);
                  mostrarToast?.(`Vista cambiada: ${VISTAS_LUBRICENTRO[nextIdx].label}`, "ok");
                }}
                className="absolute right-3 top-3 z-20 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-[10px] sm:text-xs font-bold text-zinc-800 shadow-sm transition-all hover:bg-amber-50 hover:border-amber-400 hover:text-amber-800 active:scale-95 cursor-pointer dark:border-white/15 dark:bg-[#18181b]/90 dark:text-white dark:hover:bg-amber-500/15"
                title="Toca para cambiar la vista 3D del vehículo"
              >
                {VISTAS_LUBRICENTRO[vistaLubricentroIdx].icon} {VISTAS_LUBRICENTRO[vistaLubricentroIdx].label} ↻
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 font-mono font-bold text-zinc-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-white">
                {ordenActiva?.plate || "Sin placa"}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {ordenActiva?.client || "Sin cliente asignado"}
              </span>
              <span className="ml-auto rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 max-w-full">
                Se realizará: {
                  filas.filter((f) => f.name.trim().length > 0).length > 0
                    ? filas.filter((f) => f.name.trim().length > 0).map((f) => f.name.trim()).join(" • ")
                    : primerTrabajo?.name || "Aceite motor"
                }
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
                {ATAJOS_LUBRICENTRO.map((servicio) => {
                  const activo = isServicioActivo(servicio.label);
                  return (
                    <button
                      key={servicio.label}
                      type="button"
                      onClick={() => toggleServicioRapido(servicio)}
                      className={`relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
                        activo
                          ? "border-amber-400 bg-amber-500/15 text-amber-900 shadow-xs ring-2 ring-amber-400/50 dark:border-amber-400 dark:bg-amber-500/20 dark:text-amber-200"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
                      }`}
                      title={activo ? `Quitar ${servicio.label}` : `Añadir ${servicio.label}`}
                    >
                      {activo && (
                        <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center shadow">
                          ✓
                        </span>
                      )}
                      <span className="text-base leading-none">{servicio.icon}</span>
                      <span className="text-center leading-tight">{servicio.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              onClick={() => {
                if (filas.length > 0 && !filas[filas.length - 1].name.trim()) {
                  formRef.current?.scrollIntoView({ behavior: "smooth" });
                } else {
                  agregarFila();
                  formRef.current?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-white/10 dark:bg-white/[0.03] sm:p-4 cursor-pointer hover:border-amber-300 hover:bg-amber-50/10 active:scale-[0.99] transition-all group"
              title="Toca para ir a la lista de trabajos manuales o añadir uno nuevo"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 transition-colors">
                  <span>📝</span>
                  <span>Registro Manual</span>
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  {filas.filter((f) => f.name.trim().length > 0).length} en orden
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Toca aquí para escribir o dictar trabajos manuales adicionales
              </p>
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
                  ? especialidad === "taller"
                    ? "Registro Manual"
                    : `Registro manual de ${
                        especialidad === "lubricentro" ? "Lubricentro" : "Tecnicentro"
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

                  {/* Fila 2 del bloque: Realizar (Servicio/Trabajo + Dictado Voz + Tomar Foto Cámara + Cantidad + Subtotal + Eliminar) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-normal uppercase tracking-wider text-zinc-400 block">
                      Realizar
                    </label>
                    <div className="flex items-center gap-1.5">
                      {/* Input de texto con botón de Dictado por voz (micrófono) */}
                      <div className="relative flex-1 min-w-0 flex items-center">
                        <input
                          type="text"
                          value={f.name}
                          onChange={(e) => actualizarFila(f.id, "name", e.target.value)}
                          placeholder="Servicio o trabajo a realizar"
                          autoFocus={index === filas.length - 1 && !f.name}
                          className="w-full h-9 pl-2.5 pr-8 rounded-lg bg-white dark:bg-white/[0.04] border border-zinc-200 dark:border-white/10 text-base sm:text-xs font-normal text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />

                        {/* Botón Dictado por Voz (Micrófono) */}
                        <button
                          type="button"
                          onClick={() => toggleDictado(f.id)}
                          title={filaDictandoId === f.id ? "Detener dictado" : "Dictar servicio con la voz"}
                          className={'absolute right-1 w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer ' + (
                            filaDictandoId === f.id
                              ? 'bg-rose-500 text-white animate-pulse shadow-xs'
                              : 'text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-white/10'
                          )}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                      </div>

                      {/* Botón Tomar Foto Directa con la Cámara (capture="environment", sin selector de archivos ni galería) */}
                      <label
                        title="Tomar foto con la cámara (evidencia)"
                        className={'relative w-9 h-9 shrink-0 rounded-lg border flex items-center justify-center transition-all cursor-pointer overflow-hidden ' + (
                          subiendoFotoFilaId === f.id
                            ? 'bg-blue-50 border-blue-300 text-blue-500 animate-pulse'
                            : 'bg-white dark:bg-white/[0.04] border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-white/10 active:scale-95 shadow-2xs'
                        )}
                      >
                        {subiendoFotoFilaId === f.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                          </svg>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          disabled={subiendoFotoFilaId === f.id}
                          onChange={(e) => void handleTomarFotoFila(e, f.id)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                      </label>

                      {/* Cantidad */}
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

                      {especialidad !== "taller" && especialidad !== "lubricentro" && (
                        <span className="w-14 text-right text-xs font-normal text-zinc-700 dark:text-zinc-300">
                          ${subtotal.toFixed(2)}
                        </span>
                      )}

                      {/* Eliminar fila */}
                      <button
                        type="button"
                        onClick={() => eliminarFila(f.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer shrink-0"
                        title="Eliminar fila"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Miniaturas de fotos tomadas con la cámara */}
                    {f.photos && f.photos.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {f.photos.map((fotoUrl, pIdx) => (
                          <div key={pIdx} className="relative group w-12 h-12 rounded-lg border border-zinc-200 dark:border-white/10 overflow-hidden shrink-0 shadow-2xs">
                            <img src={fotoUrl} alt={'Foto trabajo ' + (pIdx + 1)} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleEliminarFotoFila(f.id, pIdx)}
                              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 hover:bg-red-600 text-white text-[9px] flex items-center justify-center cursor-pointer transition-colors"
                              title="Eliminar foto"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pie: Total y Guardar en popup (en modo inline la barra de navegación es fija abajo) */}
          {modoInline ? null : (
            <div className="sticky bottom-0 z-10 -mx-3 -mb-3 flex items-center justify-between gap-3 border-t border-zinc-100 bg-white/95 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md dark:border-white/5 dark:bg-[#121214]/95 sm:-mx-4 sm:-mb-4 sm:px-4">
              {especialidad !== "taller" && especialidad !== "lubricentro" && (
                <div>
                  <span className="text-[10px] font-normal uppercase tracking-wider text-zinc-400">Total</span>
                  <div className="text-xl font-normal text-emerald-600 dark:text-emerald-400">
                    ${total.toFixed(2)}
                  </div>
                </div>
              )}

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
          )}
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
