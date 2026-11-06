"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { parsearModulos } from "@/components/pos/SelectorModulos";

type ModuloTaxonomia = "Tienda" | "Taller" | "Lubricentro" | "Car Wash" | "Tecnicentro";
type CategoriaTaxonomia = { categoria: string; subcategorias: readonly string[] };

const TAXONOMIAS: Record<ModuloTaxonomia, readonly CategoriaTaxonomia[]> = {
  Tienda: [
    { categoria: "Repuestos", subcategorias: ["Motor", "Frenos", "Suspensión", "Filtros", "Eléctrico"] },
    { categoria: "Lubricantes", subcategorias: ["Aceite de motor", "Transmisión", "Refrigerante", "Grasas"] },
    { categoria: "Accesorios", subcategorias: ["Interior", "Exterior", "Iluminación", "Audio"] },
    { categoria: "Herramientas", subcategorias: ["Manuales", "Eléctricas", "Diagnóstico"] },
    { categoria: "Otros", subcategorias: ["Varios"] },
  ],
  Taller: [
    { categoria: "Suspensión y Dirección", subcategorias: ["Suspensión", "Dirección", "Bujes", "Geometría"] },
    { categoria: "Sistema Eléctrico", subcategorias: ["Batería", "Carga", "Arranque", "Cableado", "Sensores", "Iluminación"] },
    { categoria: "Transmisión y Embrague", subcategorias: ["Embrague", "Caja", "Transmisión"] },
    { categoria: "Aire Acondicionado", subcategorias: ["Refrigeración", "Diagnóstico", "Compresor", "Higienización"] },
    { categoria: "Diagnóstico y Escáner", subcategorias: ["Diagnóstico", "Compresión", "Inspección"] },
    { categoria: "Mantenimiento y Afinamiento", subcategorias: ["Afinamiento", "Inyección", "Admisión", "Encendido", "Preventivo", "Filtros"] },
    { categoria: "Frenos", subcategorias: ["Pastillas", "Discos", "Tambores", "Fluidos", "Hidráulica"] },
    { categoria: "Motor", subcategorias: ["Distribución", "Empaques", "Retenes", "Culata", "Refrigeración", "Motor Mayor"] },
  ],
  Lubricentro: [
    { categoria: "Aceites", subcategorias: ["Motor", "Aditivos", "Flush", "Grasa"] },
    { categoria: "Transmisión", subcategorias: ["ATF", "CVT", "Manual", "Diferencial"] },
    { categoria: "Filtros", subcategorias: ["Aceite", "Aire", "Cabina", "Combustible", "Caja"] },
    { categoria: "Fluidos", subcategorias: ["Refrigerante", "Frenos", "Hidráulico", "Parabrisas"] },
    { categoria: "Baterías", subcategorias: ["Convencional", "AGM", "EFB", "Motos"] },
  ],
  "Car Wash": [
    { categoria: "Lavado", subcategorias: ["Exprés", "Completo", "Motor", "Motos"] },
    { categoria: "Chasis", subcategorias: ["Agua", "Grafitado", "Desengrase", "Suspensión"] },
    { categoria: "Interior", subcategorias: ["Aspirado", "Tapicería", "Cuero", "Techo", "Ozono"] },
    { categoria: "Detailing", subcategorias: ["Cera", "Pulido", "Faros", "Gotaseca", "Aros"] },
    { categoria: "Extras", subcategorias: ["Aroma", "Silicona", "Shampoo", "Microfibra"] },
  ],
  Tecnicentro: [
    { categoria: "Llantas", subcategorias: ["Pistera", "Mixta", "Lodo", "Carga", "Aros"] },
    { categoria: "Alineación", subcategorias: ["Delantera", "Completa", "Balanceo", "Rotación", "Camber"] },
    { categoria: "Enllantaje", subcategorias: ["Montaje", "Parche", "Vulcanizado", "Válvula", "Nitrógeno"] },
    { categoria: "Frenos", subcategorias: ["Pastillas", "Discos", "Zapatas", "Rectificado", "Líquido"] },
    { categoria: "Suspensión", subcategorias: ["Amortiguador", "Terminal", "Rótula", "Bujes", "Mesa"] },
    { categoria: "Baterías", subcategorias: ["Liviano", "Pesado", "Carga", "Bornes"] },
  ],
};

const PRESENTACIONES_LUBRICENTRO = [
  "Galón",
  "Litro",
  "1 cuarto (Qt)",
  "4 litros",
  "1 galón",
  "Caneca",
  "5 galones",
  "350 ml",
  "500 ml",
  "Cartucho 400g",
  "Pote 1 lb",
  "Unidad",
];

interface CamposTaxonomiaProductoProps {
  tipo: string;
  category: string;
  subCategory: string;
  presentation: string;
  onChange: (field: "category" | "subCategory" | "presentation", value: string) => void;
  compact?: boolean;
}

interface CampoSugerenciasProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  compact: boolean;
}

function IconoCampo({
  label,
  value,
  className = "h-4 w-4",
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  const normalizado = (value || "").toLocaleLowerCase();
  const iconosPorNombre: [string, string][] = [
    ["repuestos", "⚙️"],
    ["lubricantes", "🛢️"],
    ["aceite", "🛢️"],
    ["accesorios", "✨"],
    ["herramientas", "🛠️"],
    ["otros", "📦"],
    ["motor", "🚗"],
    ["freno", "🛑"],
    ["suspension", "🛞"],
    ["suspensión", "🛞"],
    ["filtro", "🌬️"],
    ["electrico", "⚡"],
    ["eléctrico", "⚡"],
    ["bateria", "🔋"],
    ["batería", "🔋"],
    ["transmision", "⚙️"],
    ["transmisión", "⚙️"],
    ["embrague", "🔧"],
    ["aire acondicionado", "❄️"],
    ["diagnostico", "🩺"],
    ["diagnóstico", "🩺"],
    ["mantenimiento", "🧰"],
    ["lavado", "🚿"],
    ["chasis", "🚙"],
    ["interior", "🪑"],
    ["detailing", "✨"],
    ["extras", "➕"],
    ["llantas", "🛞"],
    ["alineacion", "📐"],
    ["alineación", "📐"],
    ["enllantaje", "🔩"],
    ["galon", "🧴"],
    ["galón", "🧴"],
    ["litro", "🧪"],
    ["caneca", "🪣"],
    ["unidad", "📦"],
  ];
  const icono = iconosPorNombre.find(([nombre]) => normalizado.includes(nombre))?.[1]
    || (label.toLocaleLowerCase().includes("sub") ? "📂" : label.toLocaleLowerCase().includes("categor") ? "🏷️" : "🧴");

  return (
    <span className={`inline-flex shrink-0 items-center justify-center text-base leading-none ${className}`} aria-hidden="true">
      {icono}
    </span>
  );
}

function CampoSugerencias({
  label,
  value,
  options,
  onChange,
  compact,
}: CampoSugerenciasProps) {
  const [abierto, setAbierto] = useState(false);
  const [escrituraManual, setEscrituraManual] = useState(false);
  const id = useId();
  const esValorPersonalizado =
    Boolean(value) && !options.some((option) => option.toLocaleLowerCase() === value.toLocaleLowerCase());
  const mostrarEntradaManual = escrituraManual || esValorPersonalizado || options.length === 0;
  const controlClass = compact
    ? "w-full h-11 px-3.5 rounded-xl border border-zinc-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none transition-colors hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
    : "w-full h-14 px-4 rounded-xl border border-zinc-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base outline-none transition-colors hover:border-zinc-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10";

  return (
    <div className="relative">
      <label
        htmlFor={mostrarEntradaManual ? id : undefined}
        className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400"
      >
        {label}
      </label>
      {mostrarEntradaManual ? (
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <IconoCampo
              label={label}
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            />
            <input
              id={id}
              autoFocus={escrituraManual}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onFocus={(event) => {
                if (escrituraManual) event.currentTarget.select();
              }}
              placeholder={`Escribe ${label.toLocaleLowerCase()}`}
              className={`${controlClass} pl-9`}
              aria-label={label}
            />
          </div>
          {options.length > 0 && (
            <button
              type="button"
              onClick={() => setEscrituraManual(false)}
              className="shrink-0 rounded-xl px-3 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-100"
            >
              Ver opciones
            </button>
          )}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setAbierto((previous) => !previous)}
            className={`${controlClass} flex items-center justify-between gap-3 text-left font-medium text-zinc-800 dark:text-zinc-100`}
            aria-haspopup="listbox"
            aria-expanded={abierto}
            aria-label={`${label}: ${value || "seleccionar"}`}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <IconoCampo label={label} value={value} className="h-4 w-4" />
              <span className={`truncate ${value ? "" : "text-zinc-400 dark:text-zinc-500"}`}>
                {value || `Seleccionar ${label.toLocaleLowerCase()}`}
              </span>
            </span>
            <svg
              className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${abierto ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {abierto && (
            <div
              id={id}
              role="listbox"
              aria-label={label}
              className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/30"
            >
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={value === option}
                  onClick={() => {
                    onChange(option);
                    setAbierto(false);
                  }}
                  className={`flex min-h-10 w-full items-center justify-start gap-2 rounded-lg px-3 text-left text-sm transition-colors ${
                    value === option
                      ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                      : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-white/5"
                  }`}
                >
                  <IconoCampo label={label} value={option} className="h-4 w-4" />
                  <span className="truncate">{option}</span>
                  {value === option && <span className="ml-auto">✓</span>}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setEscrituraManual(true);
                  setAbierto(false);
                }}
                className="mt-1 flex min-h-10 w-full items-center rounded-lg border-t border-zinc-100 px-3 pt-1 text-left text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100"
              >
                <IconoCampo label={label} className="mr-2 h-4 w-4 shrink-0" />
                Escribir manualmente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CamposTaxonomiaProducto({
  tipo,
  category,
  subCategory,
  presentation,
  onChange,
  compact = false,
}: CamposTaxonomiaProductoProps) {
  const modulos = useMemo(
    () =>
      parsearModulos(tipo).filter(
        (modulo): modulo is ModuloTaxonomia => modulo in TAXONOMIAS
      ),
    [tipo]
  );
  const categorias = useMemo(
    () => modulos.flatMap((modulo) => [...TAXONOMIAS[modulo]]),
    [modulos]
  );
  const categoriasSugeridas = useMemo(
    () => [...new Set(categorias.map((opcion) => opcion.categoria))],
    [categorias]
  );
  const subcategoriasSugeridas = useMemo(() => {
    const categoriasSeleccionadas = categorias.filter(
      (opcion) => opcion.categoria.toLocaleLowerCase() === category.trim().toLocaleLowerCase()
    );
    const subcategorias = categoriasSeleccionadas.length > 0
      ? categoriasSeleccionadas.flatMap((opcion) => opcion.subcategorias)
      : categorias.flatMap((opcion) => opcion.subcategorias);
    return [...new Set(subcategorias)];
  }, [categorias, category]);
  const categoriaPredeterminada = modulos.includes("Lubricentro")
    ? "Aceites"
    : categoriasSugeridas[0] || "";
  const ultimoTipoInicializado = useRef<string | null>(null);

  useEffect(() => {
    if (ultimoTipoInicializado.current === tipo) return;
    ultimoTipoInicializado.current = tipo;
    const categoriaInicial = category || categoriaPredeterminada;
    if (!category && categoriaInicial) {
      onChange("category", categoriaInicial);
    }
    const subcategoriasIniciales = categorias.find(
      (opcion) => opcion.categoria.toLocaleLowerCase() === categoriaInicial.toLocaleLowerCase()
    )?.subcategorias;
    if (!subCategory && subcategoriasIniciales?.length) {
      onChange("subCategory", subcategoriasIniciales[0]);
    }
    if (!presentation) {
      onChange("presentation", modulos.includes("Lubricentro") ? "Galón" : "Unidad");
    }
  }, [
    category,
    categoriasSugeridas,
    categorias,
    categoriaPredeterminada,
    modulos,
    onChange,
    presentation,
    subCategory,
    tipo,
  ]);

  return (
    <>
      <CampoSugerencias
        label="Categoría"
        value={category}
        options={categoriasSugeridas}
        onChange={(value) => {
          onChange("category", value);
          const subcategoryOptions = categorias.find((option) => option.categoria === value)?.subcategorias;
          if (subcategoryOptions?.length) onChange("subCategory", subcategoryOptions[0]);
        }}
        compact={compact}
      />
      <CampoSugerencias
        label="Subcategoría"
        value={subCategory}
        options={subcategoriasSugeridas}
        onChange={(value) => onChange("subCategory", value)}
        compact={compact}
      />
      <CampoSugerencias
        label="Envase"
        value={presentation}
        options={PRESENTACIONES_LUBRICENTRO}
        onChange={(value) => onChange("presentation", value)}
        compact={compact}
      />
    </>
  );
}
