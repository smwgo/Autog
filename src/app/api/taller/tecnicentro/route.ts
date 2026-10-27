import { NextRequest, NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TECNICENTRO_CONFIG_ID = "tecnicentro_config_v1";
const TECNICENTRO_SERVICES_META_ID = "tecnicentro_services_meta_v1";
const TECNICENTRO_TIRES_META_ID = "tecnicentro_tires_meta_v1";

export type TecAvailability = "Disponible" | "Alta demanda" | "Sujeto a cupo" | "No disponible";
export type TecPricingMode = "FIXED" | "PER_WHEEL" | "PER_AXLE" | "PER_COMPONENT" | "QUOTE_REQUIRED";
export type TecFilterGroup =
  | "alineacion"
  | "balanceo"
  | "neumaticos"
  | "suspension"
  | "frenos"
  | "direccion"
  | "diagnostico"
  | "otros";

export interface TecnicentroCategory {
  id: string;
  name: string;
  icon: string;
  shortDescription: string;
  imageUrl: string;
  startingPrice: number | null;
  quoteRequiredDefault?: boolean;
  estimatedMinutes: number | null;
  applicableVehicleTypes: string[];
  availability: TecAvailability;
  filterGroup: TecFilterGroup;
  active: boolean;
  order: number;
}

export interface TecnicentroSubcategory {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  active: boolean;
  order: number;
}

export interface TecnicentroVehicleType {
  id: string;
  name: string;
  icon: string;
  description: string;
  active: boolean;
  order: number;
}

export interface TecnicentroPackage {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  basePrice: number | null;
  promoPrice: number | null;
  priceByVehicleType: Record<string, number>;
  quoteRequired: boolean;
  estimatedMinutes: number;
  applicableVehicleTypes: string[];
  includedServicesList: string[];
  includedServiceCodes: string[];
  includedAddonIds: string[];
  conditionsText: string;
  availability: TecAvailability;
  badgeText?: string;
  active: boolean;
  order: number;
}

export interface TecnicentroAddon {
  id: string;
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number | null;
  priceByVehicleType: Record<string, number>;
  estimatedMinutes: number;
  availability: TecAvailability;
  canBeStandalone: boolean;
  isPartOrSupply: boolean; // true = repuesto/insumo (ej. válvula/pesas), false = servicio adicional
  conditionsText: string;
  active: boolean;
  order: number;
}

export interface TecnicentroFilterOptions {
  alignmentTypes: string[];
  balanceWheelCounts: string[];
  balanceServiceTypes: string[];
  tireWidths: string[];
  tireProfiles: string[];
  tireRimDiameters: string[];
  tireLoadSpeedIndices: string[];
  tireBrands: string[];
  suspensionInspectionTypes: string[];
  suspensionComponents: string[];
  brakeComponents: string[];
  brakeServiceTypes: string[];
  diagnosticTypes: string[];
  diagnosticSystems: string[];
  steeringComponents: string[];
  steeringInspectionClasses: string[];
}

export interface TecnicentroServiceMeta {
  serviceId: string;
  code: string;
  categoryId: string;
  subcategoryId: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  pricingMode: TecPricingMode;
  basePrice: number | null;
  promoPrice: number | null;
  priceByVehicleType: Record<string, number>;
  requiresPriorInspection: boolean;
  defaultUnitsCount: number; // ej. 4 ruedas
  estimatedMinutes: number;
  applicableVehicleTypes: string[];
  includesList: string[];
  excludesList: string[];
  materialsIncluded: string[];
  partsIncluded: string[];
  associatedAddonIds: string[];
  conditionsText: string;
  availability: TecAvailability;
  // Atributos técnicos para filtros específicos por categoría
  alignmentType?: string;
  wheelCount?: string;
  balanceServiceType?: string;
  suspensionInspectionType?: string;
  suspensionComponent?: string;
  brakeComponent?: string;
  brakeServiceType?: string;
  diagnosticType?: string;
  diagnosticSystem?: string;
  steeringComponent?: string;
  steeringInspectionClass?: string;
  order: number;
  active: boolean;
  archived?: boolean;
}

export interface TecnicentroTireMeta {
  productId: string;
  code: string;
  categoryId: string;
  subcategoryId: string;
  tireSize: string; // ej. "205/55 R16"
  width: string; // "205"
  profile: string; // "55"
  rimDiameter: string; // "R16"
  loadIndex: string; // "91"
  speedRating: string; // "V"
  modelRef: string;
  specifications: string;
  includesInstallation: boolean;
  compatibilities: Array<{
    brand: string;
    model: string;
    yearFrom?: number;
    yearTo?: number;
    version?: string;
  }>;
  active: boolean;
}

export interface TecnicentroConfigData {
  categories: TecnicentroCategory[];
  subcategories: TecnicentroSubcategory[];
  vehicleTypes: TecnicentroVehicleType[];
  packages: TecnicentroPackage[];
  addons: TecnicentroAddon[];
  filterOptions: TecnicentroFilterOptions;
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  bays: string[];
}

const ALL_DEFAULT_VTS = [
  "vt_automovil",
  "vt_sedan",
  "vt_hatchback",
  "vt_suv",
  "vt_camioneta",
  "vt_furgoneta",
  "vt_motocicleta",
  "vt_pesado",
];

export const DEFAULT_TECNICENTRO_CONFIG: TecnicentroConfigData = {
  taxRatePercent: 15,
  pricesIncludeTax: true,
  bays: [
    "Bahía Alineación 3D #1",
    "Bahía Balanceo & Llantas #2",
    "Bahía Frenos & Suspensión #3",
    "Bahía Diagnóstico Electrónico #4",
  ],
  vehicleTypes: [
    { id: "vt_automovil", name: "Automóvil", icon: "🚗", description: "Compactos y city cars", active: true, order: 1 },
    { id: "vt_sedan", name: "Sedán", icon: "🚘", description: "Sedanes familiares y ejecutivos", active: true, order: 2 },
    { id: "vt_hatchback", name: "Hatchback", icon: "🚙", description: "Vehículos de 5 puertas", active: true, order: 3 },
    { id: "vt_suv", name: "SUV", icon: "🛞", description: "SUVs compactas, medianas y 3 filas", active: true, order: 4 },
    { id: "vt_camioneta", name: "Camioneta", icon: "🛻", description: "Pickups 4x2 y 4x4", active: true, order: 5 },
    { id: "vt_furgoneta", name: "Furgoneta", icon: "🚐", description: "Vans de pasajeros o carga", active: true, order: 6 },
    { id: "vt_motocicleta", name: "Motocicleta", icon: "🏍️", description: "Motos urbanas y de alta cilindrada", active: true, order: 7 },
    { id: "vt_pesado", name: "Utilitario / Mayor tamaño", icon: "🚛", description: "Camiones ligeros y comerciales", active: true, order: 8 },
  ],
  categories: [
    {
      id: "tc_cat_alineacion",
      name: "Alineación",
      icon: "📐",
      shortDescription: "Alineación computarizada 3D de eje delantero o cuatro ruedas y geometría de dirección.",
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
      startingPrice: 15,
      estimatedMinutes: 40,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta", "vt_pesado"],
      availability: "Disponible",
      filterGroup: "alineacion",
      active: true,
      order: 1,
    },
    {
      id: "tc_cat_balanceo",
      name: "Balanceo",
      icon: "⚖️",
      shortDescription: "Balanceo dinámico computarizado de ruedas y eliminación de vibraciones en volante.",
      imageUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80",
      startingPrice: 4,
      estimatedMinutes: 30,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      availability: "Disponible",
      filterGroup: "balanceo",
      active: true,
      order: 2,
    },
    {
      id: "tc_cat_montaje",
      name: "Montaje y desmontaje de llantas",
      icon: "🔧",
      shortDescription: "Desmontaje seguro sin dañar el aro, montaje técnico de neumáticos y talonado.",
      imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=900&q=80",
      startingPrice: 5,
      estimatedMinutes: 25,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      availability: "Disponible",
      filterGroup: "neumaticos",
      active: true,
      order: 3,
    },
    {
      id: "tc_cat_reparacion_neum",
      name: "Reparación de neumáticos",
      icon: "🩹",
      shortDescription: "Reparación técnica de pinchazos con parche en frío, parche tipo hongo y vulcanizado.",
      imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80",
      startingPrice: 5,
      estimatedMinutes: 25,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      availability: "Disponible",
      filterGroup: "neumaticos",
      active: true,
      order: 4,
    },
    {
      id: "tc_cat_rotacion",
      name: "Rotación de neumáticos",
      icon: "🔄",
      shortDescription: "Permutación técnica de neumáticos entre ejes para garantizar desgaste uniforme.",
      imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
      startingPrice: 8,
      estimatedMinutes: 25,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      availability: "Disponible",
      filterGroup: "neumaticos",
      active: true,
      order: 5,
    },
    {
      id: "tc_cat_venta_neum",
      name: "Venta de neumáticos",
      icon: "🛞",
      shortDescription: "Catálogo de neumáticos nuevos por marca, medida, ancho, perfil, aro e índice de carga.",
      imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=900&q=80",
      startingPrice: 55,
      estimatedMinutes: 30,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      availability: "Disponible",
      filterGroup: "neumaticos",
      active: true,
      order: 6,
    },
    {
      id: "tc_cat_suspension",
      name: "Suspensión",
      icon: "🔩",
      shortDescription: "Inspección y servicio de amortiguadores, bujes, rótulas, terminales y espirales.",
      imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80",
      startingPrice: 12,
      estimatedMinutes: 45,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta", "vt_pesado"],
      availability: "Disponible",
      filterGroup: "suspension",
      active: true,
      order: 7,
    },
    {
      id: "tc_cat_frenos",
      name: "Frenos",
      icon: "🛑",
      shortDescription: "Inspección de frenos, revisión y servicio de pastillas, discos, tambores e hidráulico.",
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
      startingPrice: 10,
      estimatedMinutes: 45,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      availability: "Disponible",
      filterGroup: "frenos",
      active: true,
      order: 8,
    },
    {
      id: "tc_cat_direccion",
      name: "Dirección",
      icon: "🎯",
      shortDescription: "Inspección de dirección hidráulica/asistida, terminales, axiales, rótulas y holguras.",
      imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80",
      startingPrice: 12,
      estimatedMinutes: 40,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      availability: "Disponible",
      filterGroup: "direccion",
      active: true,
      order: 9,
    },
    {
      id: "tc_cat_diagnostico",
      name: "Diagnóstico automotriz",
      icon: "💻",
      shortDescription: "Diagnóstico integral de sistemas electrónicos, sensores, actuadores e informe técnico.",
      imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80",
      startingPrice: 15,
      estimatedMinutes: 35,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      availability: "Disponible",
      filterGroup: "diagnostico",
      active: true,
      order: 10,
    },
    {
      id: "tc_cat_tren_delantero",
      name: "Revisión de tren delantero",
      icon: "🔍",
      shortDescription: "Evaluación en elevador de holguras, trapecios, rótulas, bujes y barra estabilizadora.",
      imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80",
      startingPrice: 10,
      estimatedMinutes: 30,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      availability: "Disponible",
      filterGroup: "direccion",
      active: true,
      order: 11,
    },
    {
      id: "tc_cat_tren_posterior",
      name: "Revisión de tren posterior",
      icon: "⚙️",
      shortDescription: "Inspección de puente trasero, brazos de arrastre, bujes posteriores, muelles y amortiguación.",
      imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80",
      startingPrice: 10,
      estimatedMinutes: 30,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      availability: "Disponible",
      filterGroup: "direccion",
      active: true,
      order: 12,
    },
    {
      id: "tc_cat_presion_neum",
      name: "Revisión de neumáticos y presión",
      icon: "🌡️",
      shortDescription: "Medición de profundidad de labrado (mm), inspección de desgaste irregular y calibración aire/nitrógeno.",
      imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=900&q=80",
      startingPrice: 4,
      estimatedMinutes: 15,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      availability: "Disponible",
      filterGroup: "neumaticos",
      active: true,
      order: 13,
    },
    {
      id: "tc_cat_escaneo",
      name: "Escaneo electrónico",
      icon: "⚡",
      shortDescription: "Lectura multimarca de códigos DTC en motor, ABS, Airbag y transmisión con reporte.",
      imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80",
      startingPrice: 12,
      estimatedMinutes: 25,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      availability: "Disponible",
      filterGroup: "diagnostico",
      active: true,
      order: 14,
    },
    {
      id: "tc_cat_otros",
      name: "Otros servicios de tecnicentro",
      icon: "🛠️",
      shortDescription: "Servicios complementarios de tecnicentro, calibración TPMS, perno de rueda y más.",
      imageUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
      startingPrice: 5,
      estimatedMinutes: 25,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      availability: "Disponible",
      filterGroup: "otros",
      active: true,
      order: 15,
    },
  ],
  subcategories: [
    // A. Alineación
    { id: "tc_sub_ali_ruedas", categoryId: "tc_cat_alineacion", name: "Alineación de ruedas", icon: "📐", active: true, order: 1 },
    { id: "tc_sub_ali_delantero", categoryId: "tc_cat_alineacion", name: "Alineación del eje delantero", icon: "⬆️", active: true, order: 2 },
    { id: "tc_sub_ali_4ruedas", categoryId: "tc_cat_alineacion", name: "Alineación de cuatro ruedas", icon: "🚗", active: true, order: 3 },
    { id: "tc_sub_ali_geometria", categoryId: "tc_cat_alineacion", name: "Revisión de geometría de dirección", icon: "🎯", active: true, order: 4 },
    { id: "tc_sub_ali_otros", categoryId: "tc_cat_alineacion", name: "Otros servicios de alineación", icon: "➕", active: true, order: 5 },
    // B. Balanceo
    { id: "tc_sub_bal_ruedas", categoryId: "tc_cat_balanceo", name: "Balanceo de ruedas", icon: "⚖️", active: true, order: 1 },
    { id: "tc_sub_bal_4ruedas", categoryId: "tc_cat_balanceo", name: "Balanceo de cuatro ruedas", icon: "🛞", active: true, order: 2 },
    { id: "tc_sub_bal_indiv", categoryId: "tc_cat_balanceo", name: "Balanceo de ruedas individuales", icon: "1️⃣", active: true, order: 3 },
    { id: "tc_sub_bal_vibracion", categoryId: "tc_cat_balanceo", name: "Revisión de vibraciones", icon: "〰️", active: true, order: 4 },
    { id: "tc_sub_bal_otros", categoryId: "tc_cat_balanceo", name: "Otros servicios de balanceo", icon: "➕", active: true, order: 5 },
    // C. Neumáticos (Montaje, Reparación, Rotación, Venta, Presión)
    { id: "tc_sub_neu_montaje", categoryId: "tc_cat_montaje", name: "Montaje de neumáticos", icon: "🔧", active: true, order: 1 },
    { id: "tc_sub_neu_desmontaje", categoryId: "tc_cat_montaje", name: "Desmontaje", icon: "🔩", active: true, order: 2 },
    { id: "tc_sub_neu_cambio", categoryId: "tc_cat_montaje", name: "Cambio de neumáticos", icon: "🛞", active: true, order: 3 },
    { id: "tc_sub_neu_pinchazo", categoryId: "tc_cat_reparacion_neum", name: "Reparación de pinchazos", icon: "🩹", active: true, order: 1 },
    { id: "tc_sub_neu_vulcanizado", categoryId: "tc_cat_reparacion_neum", name: "Vulcanizado / Parche hongo", icon: "🔥", active: true, order: 2 },
    { id: "tc_sub_neu_rotacion", categoryId: "tc_cat_rotacion", name: "Rotación", icon: "🔄", active: true, order: 1 },
    { id: "tc_sub_neu_venta", categoryId: "tc_cat_venta_neum", name: "Venta de neumáticos", icon: "🛞", active: true, order: 1 },
    { id: "tc_sub_neu_presion", categoryId: "tc_cat_presion_neum", name: "Revisión de presión", icon: "🌡️", active: true, order: 1 },
    { id: "tc_sub_neu_desgaste", categoryId: "tc_cat_presion_neum", name: "Inspección de desgaste", icon: "🔍", active: true, order: 2 },
    // D. Suspensión
    { id: "tc_sub_sus_inspeccion", categoryId: "tc_cat_suspension", name: "Inspección de suspensión", icon: "🔍", active: true, order: 1 },
    { id: "tc_sub_sus_amort", categoryId: "tc_cat_suspension", name: "Revisión de amortiguadores", icon: "🔽", active: true, order: 2 },
    { id: "tc_sub_sus_bujes", categoryId: "tc_cat_suspension", name: "Revisión de bujes", icon: "⭕", active: true, order: 3 },
    { id: "tc_sub_sus_rotulas", categoryId: "tc_cat_suspension", name: "Revisión de rótulas", icon: "🔩", active: true, order: 4 },
    { id: "tc_sub_sus_terminales", categoryId: "tc_cat_suspension", name: "Revisión de terminales", icon: "↔️", active: true, order: 5 },
    { id: "tc_sub_sus_rel", categoryId: "tc_cat_suspension", name: "Revisión de componentes relacionados", icon: "⚙️", active: true, order: 6 },
    // E. Frenos
    { id: "tc_sub_fre_inspeccion", categoryId: "tc_cat_frenos", name: "Inspección del sistema de frenos", icon: "🛑", active: true, order: 1 },
    { id: "tc_sub_fre_pastillas", categoryId: "tc_cat_frenos", name: "Revisión de pastillas", icon: "🟫", active: true, order: 2 },
    { id: "tc_sub_fre_discos", categoryId: "tc_cat_frenos", name: "Revisión de discos", icon: "💿", active: true, order: 3 },
    { id: "tc_sub_fre_tambores", categoryId: "tc_cat_frenos", name: "Revisión de tambores", icon: "🥁", active: true, order: 4 },
    { id: "tc_sub_fre_hidraulico", categoryId: "tc_cat_frenos", name: "Revisión de componentes hidráulicos", icon: "💧", active: true, order: 5 },
    // F. Dirección y tren delantero / posterior
    { id: "tc_sub_dir_inspeccion", categoryId: "tc_cat_direccion", name: "Inspección de dirección", icon: "🎯", active: true, order: 1 },
    { id: "tc_sub_dir_terminales", categoryId: "tc_cat_direccion", name: "Revisión de terminales", icon: "↔️", active: true, order: 2 },
    { id: "tc_sub_dir_rotulas", categoryId: "tc_cat_direccion", name: "Revisión de rótulas", icon: "🔩", active: true, order: 3 },
    { id: "tc_sub_dir_holguras", categoryId: "tc_cat_direccion", name: "Revisión de holguras", icon: "📏", active: true, order: 4 },
    { id: "tc_sub_tdel_insp", categoryId: "tc_cat_tren_delantero", name: "Inspección del tren delantero", icon: "🔍", active: true, order: 1 },
    { id: "tc_sub_tpost_insp", categoryId: "tc_cat_tren_posterior", name: "Inspección del tren posterior", icon: "⚙️", active: true, order: 1 },
    // G. Diagnóstico automotriz & Escaneo
    { id: "tc_sub_diag_escaneo", categoryId: "tc_cat_diagnostico", name: "Escaneo electrónico", icon: "💻", active: true, order: 1 },
    { id: "tc_sub_diag_codigos", categoryId: "tc_cat_diagnostico", name: "Lectura de códigos de falla", icon: "📋", active: true, order: 2 },
    { id: "tc_sub_diag_sistemas", categoryId: "tc_cat_diagnostico", name: "Diagnóstico de sistemas electrónicos", icon: "⚡", active: true, order: 3 },
    { id: "tc_sub_diag_sensores", categoryId: "tc_cat_diagnostico", name: "Revisión de sensores", icon: "📡", active: true, order: 4 },
    { id: "tc_sub_diag_informe", categoryId: "tc_cat_diagnostico", name: "Informe de diagnóstico", icon: "📄", active: true, order: 5 },
    { id: "tc_sub_esc_lectura", categoryId: "tc_cat_escaneo", name: "Lectura de códigos DTC", icon: "⚡", active: true, order: 1 },
  ],
  filterOptions: {
    alignmentTypes: [
      "Alineación eje delantero",
      "Alineación 4 ruedas (2 ejes)",
      "Alineación 3D Computarizada",
      "Revisión de geometría (Camber / Caster / Toe)",
    ],
    balanceWheelCounts: ["1 rueda", "2 ruedas", "4 ruedas"],
    balanceServiceTypes: [
      "Balanceo computarizado estándar",
      "Balanceo dinámico con pesas adhesivas",
      "Revisión de vibración de dirección",
    ],
    tireWidths: ["175", "185", "195", "205", "215", "225", "235", "245", "265"],
    tireProfiles: ["45", "50", "55", "60", "65", "70", "75"],
    tireRimDiameters: ["R13", "R14", "R15", "R16", "R17", "R18", "R19", "R20"],
    tireLoadSpeedIndices: ["82T", "88H", "91V", "94W", "99H", "104T", "112S"],
    tireBrands: ["Michelin", "Bridgestone", "Goodyear", "Continental", "Pirelli", "Hankook", "Kumho", "Dunlop"],
    suspensionInspectionTypes: [
      "Inspección visual y en elevador",
      "Diagnóstico de ruidos y holguras",
      "Mano de obra de reemplazo (no incluye repuesto)",
    ],
    suspensionComponents: [
      "Amortiguadores",
      "Bujes",
      "Rótulas",
      "Terminales",
      "Trapecios / Mesas",
      "Barra estabilizadora / Bieletas",
    ],
    brakeComponents: [
      "Sistema completo (4 ruedas)",
      "Pastillas de freno",
      "Discos de freno",
      "Tambores / Zapatas",
      "Componentes hidráulicos / Calipers",
    ],
    brakeServiceTypes: [
      "Inspección y medición de espesor",
      "Mano de obra cambio de pastillas",
      "Regulación y limpieza de frenos",
      "Purga de sistema hidráulico",
    ],
    diagnosticTypes: [
      "Escaneo electrónico multimarca",
      "Lectura de códigos de falla (DTC)",
      "Diagnóstico de sensores en tiempo real",
      "Informe técnico impreso / PDF",
    ],
    diagnosticSystems: [
      "Motor (Check Engine / ECM)",
      "Frenos ABS / Control de estabilidad ESP",
      "Airbag / SRS",
      "Transmisión automática / CVT",
      "Dirección electrónica EPS / TPMS",
    ],
    steeringComponents: [
      "Tren delantero completo",
      "Tren posterior completo",
      "Terminales y axiales de dirección",
      "Rótulas y holguras",
      "Cremallera / Caja de dirección",
    ],
    steeringInspectionClasses: [
      "Inspección preventiva de seguridad",
      "Revisión pre-alineación",
      "Diagnóstico por desgaste irregular de llantas",
    ],
  },
  packages: [
    {
      id: "pkg_tc_revision_basica",
      code: "PKG-TC-REV-BAS",
      name: "Paquete de revisión básica",
      categoryId: "tc_cat_presion_neum",
      shortDescription: "Inspección visual de neumáticos, medición de labrado, revisión de presión e inspección general.",
      fullDescription: "Paquete preventivo rápido para verificar el estado seguro de rodaje de los 4 neumáticos y repuesto.",
      imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=900&q=80",
      basePrice: 10,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 12, vt_camioneta: 12, vt_furgoneta: 14 },
      quoteRequired: false,
      estimatedMinutes: 25,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      includedServicesList: [
        "Inspección visual de neumáticos y desgaste",
        "Revisión y calibración de presión en 4 ruedas + repuesto",
        "Inspección visual general de frenos y suspensión",
      ],
      includedServiceCodes: ["TC-SRV-PRESION"],
      includedAddonIds: ["addon_tc_presion"],
      conditionsText: "Inspección diagnóstica; no incluye repuestos ni mano de obra de reparación.",
      availability: "Disponible",
      badgeText: "Preventivo",
      active: true,
      order: 1,
    },
    {
      id: "pkg_tc_neumaticos",
      code: "PKG-TC-NEUM-FULL",
      name: "Paquete de neumáticos (Montaje + Balanceo + Alineación)",
      categoryId: "tc_cat_alineacion",
      shortDescription: "Montaje de 4 neumáticos, balanceo computarizado de 4 ruedas y alineación 3D.",
      fullDescription: "Combo integral ideal al cambiar llantas o realizar mantenimiento de rodaje cada 10,000 km.",
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
      basePrice: 32,
      promoPrice: 28,
      priceByVehicleType: {
        vt_automovil: 28,
        vt_sedan: 28,
        vt_hatchback: 28,
        vt_suv: 34,
        vt_camioneta: 36,
        vt_furgoneta: 38,
      },
      quoteRequired: false,
      estimatedMinutes: 60,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      includedServicesList: [
        "Montaje / rotación de 4 neumáticos",
        "Balanceo computarizado de las 4 ruedas",
        "Alineación computarizada 3D",
        "Calibración de presión de inflado",
      ],
      includedServiceCodes: ["TC-SRV-ALI-3D", "TC-SRV-BAL-4R", "TC-SRV-ROT-4R"],
      includedAddonIds: ["addon_tc_pesas", "addon_tc_presion"],
      conditionsText: "Incluye pesas estándar de balanceo y revisión de presión sin cargo extra.",
      availability: "Disponible",
      badgeText: "Más Vendido",
      active: true,
      order: 2,
    },
    {
      id: "pkg_tc_tren_delantero",
      code: "PKG-TC-TREN-DEL",
      name: "Paquete de revisión del tren delantero",
      categoryId: "tc_cat_tren_delantero",
      shortDescription: "Revisión en elevador de rótulas, terminales, bujes, amortiguadores e informe de holguras.",
      fullDescription: "Inspección mecánica especializada del tren delantero y dirección para detectar el origen de ruidos, golpeteos o desgaste irregular de neumáticos.",
      imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80",
      basePrice: 15,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 18, vt_camioneta: 18, vt_furgoneta: 20 },
      quoteRequired: false,
      estimatedMinutes: 35,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      includedServicesList: [
        "Revisión de componentes de suspensión y dirección",
        "Inspección técnica de holguras en rótulas, terminales y bujes",
        "Informe detallado de observaciones y cotización de repuestos si se requieren",
      ],
      includedServiceCodes: ["TC-SRV-TREN-DEL"],
      includedAddonIds: [],
      conditionsText: "Servicio de inspección y diagnóstico. El reemplazo de piezas se cotiza por separado.",
      availability: "Disponible",
      badgeText: "Seguridad Vial",
      active: true,
      order: 3,
    },
    {
      id: "pkg_tc_preventivo_total",
      code: "PKG-TC-PREV-PRO",
      name: "Paquete de revisión preventiva + Escaneo",
      categoryId: "tc_cat_diagnostico",
      shortDescription: "Inspección de frenos, tren delantero/posterior, neumáticos y escaneo electrónico OBD2.",
      fullDescription: "Evaluación integral pre-viaje o pre-compra que revisa los puntos críticos de seguridad activa y electrónica del vehículo.",
      imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80",
      basePrice: 25,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 28, vt_camioneta: 30 },
      quoteRequired: false,
      estimatedMinutes: 50,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      includedServicesList: [
        "Inspección del sistema de frenos (pastillas, discos, líquido)",
        "Revisión de tren delantero y posterior en elevador",
        "Escaneo electrónico multimarca de códigos DTC",
        "Revisión de presión y estado de neumáticos",
      ],
      includedServiceCodes: ["TC-SRV-ESC-OBD2", "TC-SRV-FRE-INSP", "TC-SRV-TREN-DEL"],
      includedAddonIds: ["addon_tc_presion"],
      conditionsText: "Entrega diagnóstico completo del estado mecánico y electrónico.",
      availability: "Disponible",
      badgeText: "Pre-Viaje",
      active: true,
      order: 4,
    },
  ],
  addons: [
    {
      id: "addon_tc_valvulas",
      code: "ADD-TC-VALV",
      name: "Válvulas nuevas para neumáticos (Juego x4)",
      description: "Válvulas cromadas o de caucho de alta presión TR413/TR414.",
      imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80",
      price: 6,
      priceByVehicleType: {},
      estimatedMinutes: 10,
      availability: "Disponible",
      canBeStandalone: true,
      isPartOrSupply: true,
      conditionsText: "No incluye sensores electrónicos TPMS.",
      active: true,
      order: 1,
    },
    {
      id: "addon_tc_pesas",
      code: "ADD-TC-PESAS",
      name: "Pesas adhesivas para balanceo de aros de magnesio",
      description: "Contrapesos adhesivos de plomo/zinc ocultos para rines de aleación.",
      imageUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80",
      price: 4,
      priceByVehicleType: {},
      estimatedMinutes: 5,
      availability: "Disponible",
      canBeStandalone: false,
      isPartOrSupply: true,
      conditionsText: "Asociado al servicio de balanceo.",
      active: true,
      order: 2,
    },
    {
      id: "addon_tc_pinchazo",
      code: "ADD-TC-PINCH",
      name: "Reparación adicional de pinchazo (Parche frío)",
      description: "Desmontaje, lijado interno y aplicación de parche vulcanizado en frío.",
      imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80",
      price: 5,
      priceByVehicleType: { vt_camioneta: 7, vt_suv: 6 },
      estimatedMinutes: 15,
      availability: "Disponible",
      canBeStandalone: true,
      isPartOrSupply: false,
      conditionsText: "Sujeto a que la perforación esté en la banda de rodadura y no en el flanco lateral.",
      active: true,
      order: 3,
    },
    {
      id: "addon_tc_presion",
      code: "ADD-TC-NITRO",
      name: "Revisión de presión / Inflado con Nitrógeno (4 ruedas)",
      description: "Estabiliza la temperatura del neumático y mantiene la presión por más tiempo.",
      imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
      price: 5,
      priceByVehicleType: {},
      estimatedMinutes: 10,
      availability: "Disponible",
      canBeStandalone: true,
      isPartOrSupply: false,
      conditionsText: "Incluye tapones identificadores verdes.",
      active: true,
      order: 4,
    },
    {
      id: "addon_tc_insp_adicional",
      code: "ADD-TC-INSP-COMP",
      name: "Inspección adicional de fluido de frenos y batería",
      description: "Medición de humedad en líquido de frenos y test de carga de batería.",
      imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
      price: 6,
      priceByVehicleType: {},
      estimatedMinutes: 15,
      availability: "Disponible",
      canBeStandalone: false,
      isPartOrSupply: false,
      conditionsText: "Complemento preventivo.",
      active: true,
      order: 5,
    },
    {
      id: "addon_tc_limpieza_frenos",
      code: "ADD-TC-CLEAN-FRE",
      name: "Spray desengrasante limpiador de frenos (Insumo)",
      description: "Elimina polvo de asbesto/cerámica y grasa en discos, calipers y tambores.",
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80",
      price: 6,
      priceByVehicleType: {},
      estimatedMinutes: 5,
      availability: "Disponible",
      canBeStandalone: false,
      isPartOrSupply: true,
      conditionsText: "Insumo para servicios de frenos.",
      active: true,
      order: 6,
    },
  ],
};

// Servicios iniciales de Tecnicentro para sembrar en prisma.workshopService
const INITIAL_TECNICENTRO_SERVICES: Array<{
  code: string;
  name: string;
  category: string;
  price: number;
  estimatedMinutes: number;
  description: string;
  meta: Omit<TecnicentroServiceMeta, "serviceId" | "code">;
}> = [
  {
    code: "TC-SRV-ALI-DEL",
    name: "Alineación Computarizada 3D Eje Delantero",
    category: "Tecnicentro",
    price: 15,
    estimatedMinutes: 35,
    description: "Ajuste computarizado de convergencia, camber y caster del eje delantero.",
    meta: {
      categoryId: "tc_cat_alineacion",
      subcategoryId: "tc_sub_ali_delantero",
      shortDescription: "Ajuste de geometría del eje delantero con sensores 3D.",
      fullDescription: "Corrige la desviación del volante y evita el desgaste prematuro en los bordes de los neumáticos delanteros.",
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 15,
      promoPrice: null,
      priceByVehicleType: { vt_automovil: 15, vt_sedan: 15, vt_hatchback: 15, vt_suv: 18, vt_camioneta: 20, vt_furgoneta: 22 },
      requiresPriorInspection: true,
      defaultUnitsCount: 1,
      estimatedMinutes: 35,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      includesList: ["Medición láser/3D de 4 ruedas", "Ajuste de convergencia delantera", "Centrado de volante", "Reporte antes/después"],
      excludesList: ["Reemplazo de terminales o rótulas con holgura"],
      materialsIncluded: [],
      partsIncluded: [],
      associatedAddonIds: ["addon_tc_presion"],
      conditionsText: "Requiere que terminales y rótulas no presenten holgura excesiva.",
      availability: "Disponible",
      alignmentType: "Alineación eje delantero",
      order: 1,
      active: true,
    },
  },
  {
    code: "TC-SRV-ALI-3D",
    name: "Alineación Computarizada 3D de Cuatro Ruedas (2 Ejes)",
    category: "Tecnicentro",
    price: 22,
    estimatedMinutes: 45,
    description: "Alineación integral delantera y posterior para vehículos con suspensión independiente o multibrazo.",
    meta: {
      categoryId: "tc_cat_alineacion",
      subcategoryId: "tc_sub_ali_4ruedas",
      shortDescription: "Geometría completa en eje delantero y trasero para máxima estabilidad.",
      fullDescription: "Recomendado para sedanes modernos y SUVs con regulación excéntrica en el tren posterior.",
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 22,
      promoPrice: 20,
      priceByVehicleType: { vt_automovil: 20, vt_sedan: 22, vt_hatchback: 22, vt_suv: 25, vt_camioneta: 26 },
      requiresPriorInspection: true,
      defaultUnitsCount: 1,
      estimatedMinutes: 45,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta"],
      includesList: ["Revisión de geometría en 4 ruedas", "Ajuste de eje delantero y trasero", "Centrado de volante"],
      excludesList: ["Correctores de camber adicionales si el vehículo los requiere"],
      materialsIncluded: [],
      partsIncluded: [],
      associatedAddonIds: ["addon_tc_presion"],
      conditionsText: "Sujeto a estado de bujes y excéntricas posteriores.",
      availability: "Disponible",
      alignmentType: "Alineación 4 ruedas (2 ejes)",
      order: 2,
      active: true,
    },
  },
  {
    code: "TC-SRV-BAL-4R",
    name: "Balanceo Computarizado de Cuatro Ruedas",
    category: "Tecnicentro",
    price: 12,
    estimatedMinutes: 30,
    description: "Equilibrado dinámico de las 4 ruedas para eliminar vibraciones a alta velocidad.",
    meta: {
      categoryId: "tc_cat_balanceo",
      subcategoryId: "tc_sub_bal_4ruedas",
      shortDescription: "Balanceo de 4 neumáticos en máquina computarizada.",
      fullDescription: "Compensa los desbalances de masa entre llanta y aro, protegiendo rodamientos, amortiguadores y dirección.",
      imageUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 12,
      promoPrice: null,
      priceByVehicleType: { vt_automovil: 12, vt_sedan: 12, vt_hatchback: 12, vt_suv: 15, vt_camioneta: 16, vt_furgoneta: 16 },
      requiresPriorInspection: false,
      defaultUnitsCount: 4,
      estimatedMinutes: 30,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      includesList: ["Desmontaje y montaje de 4 ruedas en vehículo", "Equilibrado en máquina", "Pesas estándar de grapa"],
      excludesList: ["Rectificación de aros doblados"],
      materialsIncluded: ["Pesas de balanceo estándar"],
      partsIncluded: [],
      associatedAddonIds: ["addon_tc_pesas", "addon_tc_valvulas"],
      conditionsText: "Para aros de aleación especiales puedes agregar pesas adhesivas.",
      availability: "Disponible",
      wheelCount: "4 ruedas",
      balanceServiceType: "Balanceo computarizado estándar",
      order: 3,
      active: true,
    },
  },
  {
    code: "TC-SRV-BAL-IND",
    name: "Balanceo de Rueda Individual",
    category: "Tecnicentro",
    price: 4,
    estimatedMinutes: 15,
    description: "Balanceo computarizado por rueda individual.",
    meta: {
      categoryId: "tc_cat_balanceo",
      subcategoryId: "tc_sub_bal_indiv",
      shortDescription: "Tarifa unitaria por rueda balanceada.",
      fullDescription: "Ideal después de reparar un pinchazo o montar un neumático individual.",
      imageUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80",
      pricingMode: "PER_WHEEL",
      basePrice: 4,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 4.5, vt_camioneta: 5 },
      requiresPriorInspection: false,
      defaultUnitsCount: 1,
      estimatedMinutes: 15,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      includesList: ["Balanceo dinámico de 1 rueda", "Pesas estándar"],
      excludesList: [],
      materialsIncluded: ["Contrapeso estándar"],
      partsIncluded: [],
      associatedAddonIds: ["addon_tc_pesas"],
      conditionsText: "Precio por cada rueda atendida.",
      availability: "Disponible",
      wheelCount: "1 rueda",
      balanceServiceType: "Balanceo computarizado estándar",
      order: 4,
      active: true,
    },
  },
  {
    code: "TC-SRV-MONTAJE",
    name: "Montaje y Desmontaje Técnico de Neumático (Por Rueda)",
    category: "Tecnicentro",
    price: 5,
    estimatedMinutes: 20,
    description: "Desmontaje de casco anterior y montaje de neumático en el aro con pasta lubricante de talón.",
    meta: {
      categoryId: "tc_cat_montaje",
      subcategoryId: "tc_sub_neu_montaje",
      shortDescription: "Servicio de enllantaje y desenllantaje sin maltratar el rin.",
      fullDescription: "Realizado en desmontadora neumática con protectores plásticos para cuidar rines de aluminio o magnesio.",
      imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=900&q=80",
      pricingMode: "PER_WHEEL",
      basePrice: 5,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 6, vt_camioneta: 7 },
      requiresPriorInspection: false,
      defaultUnitsCount: 1,
      estimatedMinutes: 20,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      includesList: ["Desmontaje del neumático usado", "Limpieza de pestaña del aro", "Montaje con pasta de talón e inflado"],
      excludesList: ["Balanceo y válvula nueva (seleccionables como adicional)"],
      materialsIncluded: ["Pasta de montaje"],
      partsIncluded: [],
      associatedAddonIds: ["addon_tc_valvulas", "addon_tc_pesas"],
      conditionsText: "Mano de obra por rueda.",
      availability: "Disponible",
      order: 5,
      active: true,
    },
  },
  {
    code: "TC-SRV-PINCHAZO",
    name: "Reparación Técnica de Pinchazo con Parche / Hongo",
    category: "Tecnicentro",
    price: 6,
    estimatedMinutes: 25,
    description: "Desmontaje de llanta, sellado interno con parche vulcanizado en frío o tipo hongo y prueba de estanqueidad.",
    meta: {
      categoryId: "tc_cat_reparacion_neum",
      subcategoryId: "tc_sub_neu_pinchazo",
      shortDescription: "Reparación interna segura y duradera (no mecha externa temporal).",
      fullDescription: "Desmontamos la cubierta del aro para inspeccionar la estructura interna, aplicamos cemento vulcanizante y parche radial reforzado.",
      imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80",
      pricingMode: "PER_WHEEL",
      basePrice: 6,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 7, vt_camioneta: 8 },
      requiresPriorInspection: true,
      defaultUnitsCount: 1,
      estimatedMinutes: 25,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      includesList: ["Desmontaje de rueda", "Parche radial interno", "Prueba de inmersión sin fugas", "Montaje en vehículo"],
      excludesList: ["Cortes laterales en el flanco que comprometan la seguridad"],
      materialsIncluded: ["Parche radial", "Cemento vulcanizante"],
      partsIncluded: [],
      associatedAddonIds: ["addon_tc_valvulas"],
      conditionsText: "Sujeto a inspección de que la banda lateral no esté dañada.",
      availability: "Disponible",
      order: 6,
      active: true,
    },
  },
  {
    code: "TC-SRV-ROT-4R",
    name: "Rotación Técnica de Neumáticos (4 Ruedas)",
    category: "Tecnicentro",
    price: 8,
    estimatedMinutes: 25,
    description: "Intercambio cruzado o lineal de neumáticos según tracción del vehículo y torqueo con torquímetro.",
    meta: {
      categoryId: "tc_cat_rotacion",
      subcategoryId: "tc_sub_neu_rotacion",
      shortDescription: "Extiende la vida útil de tus llantas igualando el desgaste entre ejes.",
      fullDescription: "Realizamos el esquema de rotación recomendado para tracción delantera, trasera o 4WD/AWD y ajustamos tuercas con torquímetro.",
      imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 8,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 10, vt_camioneta: 10 },
      requiresPriorInspection: false,
      defaultUnitsCount: 1,
      estimatedMinutes: 25,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      includesList: ["Rotación de las 4 ruedas", "Inspección de desgaste de labrado", "Calibración de presión", "Apriete con torquímetro"],
      excludesList: ["Balanceo (disponible por separado o en paquete)"],
      materialsIncluded: [],
      partsIncluded: [],
      associatedAddonIds: ["addon_tc_presion"],
      conditionsText: "Recomendado cada 8,000 a 10,000 km.",
      availability: "Disponible",
      order: 7,
      active: true,
    },
  },
  {
    code: "TC-SRV-SUS-INSP",
    name: "Inspección Completa de Suspensión y Amortiguadores",
    category: "Tecnicentro",
    price: 12,
    estimatedMinutes: 35,
    description: "Revisión técnica en elevador de amortiguadores, espirales, bujes, rótulas, terminales y bases.",
    meta: {
      categoryId: "tc_cat_suspension",
      subcategoryId: "tc_sub_sus_inspeccion",
      shortDescription: "Diagnóstico mecánico de suspensión (no incluye reemplazo de piezas).",
      fullDescription: "Verificamos fugas de aceite en amortiguadores, fatiga de espirales, grietas en bujes de caucho y juego en rótulas o bieletas.",
      imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 12,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 15, vt_camioneta: 15 },
      requiresPriorInspection: false,
      defaultUnitsCount: 1,
      estimatedMinutes: 35,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      includesList: ["Inspección de 4 amortiguadores", "Revisión de bujes, rótulas y terminales", "Informe de estado y presupuesto de mano de obra/repuestos"],
      excludesList: ["El valor corresponde únicamente a la inspección; no incluye repuestos ni mano de obra de reemplazo"],
      materialsIncluded: [],
      partsIncluded: [],
      associatedAddonIds: [],
      conditionsText: "Importante: Esta inspección no incluye el reemplazo físico de piezas.",
      availability: "Disponible",
      suspensionInspectionType: "Inspección visual y en elevador",
      suspensionComponent: "Amortiguadores",
      order: 8,
      active: true,
    },
  },
  {
    code: "TC-SRV-FRE-INSP",
    name: "Inspección del Sistema de Frenos (4 Ruedas)",
    category: "Tecnicentro",
    price: 10,
    estimatedMinutes: 30,
    description: "Medición de espesor de pastillas y discos, revisión de tambores, zapatas y fugas hidráulicas.",
    meta: {
      categoryId: "tc_cat_frenos",
      subcategoryId: "tc_sub_fre_inspeccion",
      shortDescription: "Evaluación de pastillas, discos, tambores y sistema hidráulico.",
      fullDescription: "Desmontamos las ruedas para medir milimétricamente el material de fricción restante en pastillas/zapatas y el estado de los discos.",
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 10,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 12, vt_camioneta: 12 },
      requiresPriorInspection: false,
      defaultUnitsCount: 1,
      estimatedMinutes: 30,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      includesList: ["Revisión de pastillas y discos delanteros", "Revisión de discos o tambores posteriores", "Verificación de nivel y estado del líquido de frenos"],
      excludesList: ["Repuestos (pastillas/discos) y mano de obra de cambio"],
      materialsIncluded: [],
      partsIncluded: [],
      associatedAddonIds: ["addon_tc_limpieza_frenos"],
      conditionsText: "Distingue claramente la inspección del cambio de repuestos.",
      availability: "Disponible",
      brakeComponent: "Sistema completo (4 ruedas)",
      brakeServiceType: "Inspección y medición de espesor",
      order: 9,
      active: true,
    },
  },
  {
    code: "TC-SRV-FRE-MO-PAST",
    name: "Mano de Obra Cambio de Pastillas de Freno (Por Eje)",
    category: "Tecnicentro",
    price: 15,
    estimatedMinutes: 45,
    description: "Servicio de reemplazo de pastillas de freno, limpieza de mordazas y lubricación de pines guía.",
    meta: {
      categoryId: "tc_cat_frenos",
      subcategoryId: "tc_sub_fre_pastillas",
      shortDescription: "Mano de obra especializada por eje (repuesto se cotiza según vehículo).",
      fullDescription: "Incluye retracción técnica de pistón de caliper, limpieza de portamordaza, lubricación de pines con grasa sintética de alta temperatura e instalación de pastillas.",
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
      pricingMode: "PER_AXLE",
      basePrice: 15,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 18, vt_camioneta: 20 },
      requiresPriorInspection: true,
      defaultUnitsCount: 1,
      estimatedMinutes: 45,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      includesList: ["Mano de obra de instalación de pastillas en 1 eje", "Lubricación de pines guía de caliper"],
      excludesList: ["Juego físico de pastillas de freno y rectificado de discos"],
      materialsIncluded: ["Grasa dieléctrica/cerámica para calipers"],
      partsIncluded: [],
      associatedAddonIds: ["addon_tc_limpieza_frenos"],
      conditionsText: "El valor corresponde exclusivamente a la mano de obra por eje.",
      availability: "Disponible",
      brakeComponent: "Pastillas de freno",
      brakeServiceType: "Mano de obra cambio de pastillas",
      order: 10,
      active: true,
    },
  },
  {
    code: "TC-SRV-DIR-INSP",
    name: "Inspección de Dirección, Terminales, Rótulas y Holguras",
    category: "Tecnicentro",
    price: 12,
    estimatedMinutes: 35,
    description: "Revisión de caja/cremallera de dirección, guardapolvos, axiales, terminales y rótulas.",
    meta: {
      categoryId: "tc_cat_direccion",
      subcategoryId: "tc_sub_dir_inspeccion",
      shortDescription: "Diagnóstico de holguras y fugas en el sistema de dirección.",
      fullDescription: "Detecta juegos axiales en terminales, rotura de guardapolvos de cremallera y desgaste de rótulas antes de alinear.",
      imageUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 12,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 14, vt_camioneta: 15 },
      requiresPriorInspection: false,
      defaultUnitsCount: 1,
      estimatedMinutes: 35,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      includesList: ["Inspección de terminales y axiales", "Revisión de guardapolvos y cremallera", "Verificación de holguras"],
      excludesList: ["Repuestos y mano de obra de cambio de componentes"],
      materialsIncluded: [],
      partsIncluded: [],
      associatedAddonIds: [],
      conditionsText: "Servicio de inspección diagnóstica.",
      availability: "Disponible",
      steeringComponent: "Terminales y axiales de dirección",
      steeringInspectionClass: "Revisión pre-alineación",
      order: 11,
      active: true,
    },
  },
  {
    code: "TC-SRV-TREN-DEL",
    name: "Revisión Integral de Tren Delantero en Elevador",
    category: "Tecnicentro",
    price: 10,
    estimatedMinutes: 30,
    description: "Inspección punto por punto de mesas, bujes, rótulas, rodamientos y barra estabilizadora delantera.",
    meta: {
      categoryId: "tc_cat_tren_delantero",
      subcategoryId: "tc_sub_tdel_insp",
      shortDescription: "Evaluación completa del tren delantero para eliminar ruidos e inestabilidad.",
      fullDescription: "Revisión física con palanca de esfuerzo en elevador para comprobar el estado real de cada articulación delantera.",
      imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 10,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 12, vt_camioneta: 14 },
      requiresPriorInspection: false,
      defaultUnitsCount: 1,
      estimatedMinutes: 30,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      includesList: ["Inspección de trapecios, bujes y rótulas", "Verificación de rodamientos de rueda", "Reporte escrito"],
      excludesList: ["Reemplazo de piezas (se cotiza según hallazgos)"],
      materialsIncluded: [],
      partsIncluded: [],
      associatedAddonIds: [],
      conditionsText: "Inspección técnica; cualquier reemplazo se presupuesta previa autorización.",
      availability: "Disponible",
      steeringComponent: "Tren delantero completo",
      steeringInspectionClass: "Inspección preventiva de seguridad",
      order: 12,
      active: true,
    },
  },
  {
    code: "TC-SRV-TREN-POST",
    name: "Revisión de Tren Posterior y Suspensión Trasera",
    category: "Tecnicentro",
    price: 10,
    estimatedMinutes: 30,
    description: "Inspección de puente trasero, bujes de arrastre, brazos multibrazo, ballestas y amortiguadores posteriores.",
    meta: {
      categoryId: "tc_cat_tren_posterior",
      subcategoryId: "tc_sub_tpost_insp",
      shortDescription: "Diagnóstico mecánico de eje trasero y estabilidad posterior.",
      fullDescription: "Verifica el estado de bujes de puente trasero, tensores, muelles/ballestas y amortiguadores posteriores.",
      imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 10,
      promoPrice: null,
      priceByVehicleType: { vt_suv: 12, vt_camioneta: 14 },
      requiresPriorInspection: false,
      defaultUnitsCount: 1,
      estimatedMinutes: 30,
      applicableVehicleTypes: ["vt_automovil", "vt_sedan", "vt_hatchback", "vt_suv", "vt_camioneta", "vt_furgoneta"],
      includesList: ["Revisión de bujes y brazos traseros", "Inspección de amortiguadores y espirales/ballestas"],
      excludesList: ["Cambio de repuestos"],
      materialsIncluded: [],
      partsIncluded: [],
      associatedAddonIds: [],
      conditionsText: "Servicio de inspección.",
      availability: "Disponible",
      steeringComponent: "Tren posterior completo",
      steeringInspectionClass: "Inspección preventiva de seguridad",
      order: 13,
      active: true,
    },
  },
  {
    code: "TC-SRV-PRESION",
    name: "Revisión de Neumáticos, Desgaste de Labrado y Presión",
    category: "Tecnicentro",
    price: 4,
    estimatedMinutes: 15,
    description: "Medición con profundímetro digital en las 4 llantas, inspección de deformaciones y calibración de PSI.",
    meta: {
      categoryId: "tc_cat_presion_neum",
      subcategoryId: "tc_sub_neu_presion",
      shortDescription: "Control de presión exacta y diagnóstico de vida útil del neumático.",
      fullDescription: "Inspeccionamos profundidad en milímetros en surcos centrales y laterales para detectar problemas de alineación o presión incorrecta.",
      imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 4,
      promoPrice: null,
      priceByVehicleType: {},
      requiresPriorInspection: false,
      defaultUnitsCount: 1,
      estimatedMinutes: 15,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      includesList: ["Calibración de presión según placa del fabricante", "Medición de profundidad de huella (mm)", "Revisión de llanta de emergencia"],
      excludesList: [],
      materialsIncluded: [],
      partsIncluded: [],
      associatedAddonIds: ["addon_tc_valvulas"],
      conditionsText: "Servicio rápido sin espera.",
      availability: "Disponible",
      order: 14,
      active: true,
    },
  },
  {
    code: "TC-SRV-ESC-OBD2",
    name: "Escaneo Electrónico Multimarca y Lectura de Códigos DTC",
    category: "Tecnicentro",
    price: 15,
    estimatedMinutes: 30,
    description: "Conexión de escáner profesional para lectura de códigos de falla en Motor, ABS, Airbag y Transmisión con informe.",
    meta: {
      categoryId: "tc_cat_escaneo",
      subcategoryId: "tc_sub_esc_lectura",
      shortDescription: "Lectura electrónica de códigos de falla y datos en vivo con informe técnico.",
      fullDescription: "Permite identificar qué módulo o sensor registra anomalías (Check Engine, ABS, Airbag, etc.) entregando el reporte de códigos DTC.",
      imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80",
      pricingMode: "FIXED",
      basePrice: 15,
      promoPrice: 12,
      priceByVehicleType: {},
      requiresPriorInspection: false,
      defaultUnitsCount: 1,
      estimatedMinutes: 30,
      applicableVehicleTypes: ALL_DEFAULT_VTS,
      includesList: ["Lectura de códigos DTC en módulos electrónicos", "Verificación de parámetros en vivo", "Entrega de informe de diagnóstico"],
      excludesList: ["Reparación física de cableado o cambio de sensores"],
      materialsIncluded: [],
      partsIncluded: [],
      associatedAddonIds: [],
      conditionsText: "Importante: El escaneo electrónico identifica los códigos de falla registrados; no implica que la falla física quede reparada sin efectuar el correctivo correspondiente.",
      availability: "Disponible",
      diagnosticType: "Escaneo electrónico multimarca",
      diagnosticSystem: "Motor (Check Engine / ECM)",
      order: 15,
      active: true,
    },
  },
];

// Neumáticos iniciales para sembrar en prisma.product de forma aditiva
const INITIAL_TECNICENTRO_TIRES: Array<{
  code: string;
  name: string;
  brand: string;
  price: number;
  costPrice: number;
  stock: number;
  imageUrl: string;
  meta: Omit<TecnicentroTireMeta, "productId" | "code">;
}> = [
  {
    code: "TC-NEU-185-65R15",
    name: "Neumático 185/65 R15 88H Touring",
    brand: "Bridgestone",
    price: 68,
    costPrice: 48,
    stock: 12,
    imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80",
    meta: {
      categoryId: "tc_cat_venta_neum",
      subcategoryId: "tc_sub_neu_venta",
      tireSize: "185/65 R15",
      width: "185",
      profile: "65",
      rimDiameter: "R15",
      loadIndex: "88",
      speedRating: "H",
      modelRef: "Ecopia EP150",
      specifications: "Baja resistencia al rodamiento, excelente frenado en mojado. UTQG 400 AA.",
      includesInstallation: false,
      compatibilities: [
        { brand: "Chevrolet", model: "Sail", yearFrom: 2016, yearTo: 2024 },
        { brand: "Nissan", model: "Versa", yearFrom: 2015, yearTo: 2023 },
        { brand: "Kia", model: "Rio", yearFrom: 2015, yearTo: 2023 },
      ],
      active: true,
    },
  },
  {
    code: "TC-NEU-205-55R16",
    name: "Neumático 205/55 R16 91V Primacy",
    brand: "Michelin",
    price: 95,
    costPrice: 70,
    stock: 8,
    imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80",
    meta: {
      categoryId: "tc_cat_venta_neum",
      subcategoryId: "tc_sub_neu_venta",
      tireSize: "205/55 R16",
      width: "205",
      profile: "55",
      rimDiameter: "R16",
      loadIndex: "91",
      speedRating: "V",
      modelRef: "Primacy 4",
      specifications: "Compuesto de alto desempeño para sedanes y hatchbacks. Máxima duración y confort acústico.",
      includesInstallation: false,
      compatibilities: [
        { brand: "Toyota", model: "Corolla", yearFrom: 2014, yearTo: 2024 },
        { brand: "Mazda", model: "3", yearFrom: 2014, yearTo: 2022 },
        { brand: "Hyundai", model: "Elantra", yearFrom: 2015, yearTo: 2024 },
      ],
      active: true,
    },
  },
  {
    code: "TC-NEU-225-65R17",
    name: "Neumático 225/65 R17 102H SUV HT",
    brand: "Goodyear",
    price: 118,
    costPrice: 86,
    stock: 10,
    imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80",
    meta: {
      categoryId: "tc_cat_venta_neum",
      subcategoryId: "tc_sub_neu_venta",
      tireSize: "225/65 R17",
      width: "225",
      profile: "65",
      rimDiameter: "R17",
      loadIndex: "102",
      speedRating: "H",
      modelRef: "EfficientGrip SUV",
      specifications: "Diseño reforzado para SUVs familiares con gran agarre en carretera y lluvia.",
      includesInstallation: false,
      compatibilities: [
        { brand: "Kia", model: "Sportage", yearFrom: 2016, yearTo: 2024 },
        { brand: "Hyundai", model: "Tucson", yearFrom: 2016, yearTo: 2024 },
        { brand: "Toyota", model: "RAV4", yearFrom: 2015, yearTo: 2023 },
      ],
      active: true,
    },
  },
  {
    code: "TC-NEU-265-65R17",
    name: "Neumático 265/65 R17 112T All-Terrain A/T",
    brand: "Hankook",
    price: 155,
    costPrice: 115,
    stock: 6,
    imageUrl: "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80",
    meta: {
      categoryId: "tc_cat_venta_neum",
      subcategoryId: "tc_sub_neu_venta",
      tireSize: "265/65 R17",
      width: "265",
      profile: "65",
      rimDiameter: "R17",
      loadIndex: "112",
      speedRating: "T",
      modelRef: "Dynapro AT2",
      specifications: "Todo terreno para Pickups 4x4 y SUVs grandes. Tracción superior en tierra y asfalto.",
      includesInstallation: false,
      compatibilities: [
        { brand: "Toyota", model: "Hilux", yearFrom: 2016, yearTo: 2024 },
        { brand: "Toyota", model: "Fortuner", yearFrom: 2015, yearTo: 2024 },
        { brand: "Chevrolet", model: "D-Max", yearFrom: 2017, yearTo: 2024 },
      ],
      active: true,
    },
  },
];

function normalizeTecnicentroConfig(raw: any): TecnicentroConfigData {
  if (!raw || typeof raw !== "object") return DEFAULT_TECNICENTRO_CONFIG;
  return {
    taxRatePercent:
      typeof raw.taxRatePercent === "number"
        ? raw.taxRatePercent
        : DEFAULT_TECNICENTRO_CONFIG.taxRatePercent,
    pricesIncludeTax:
      typeof raw.pricesIncludeTax === "boolean"
        ? raw.pricesIncludeTax
        : DEFAULT_TECNICENTRO_CONFIG.pricesIncludeTax,
    bays:
      Array.isArray(raw.bays) && raw.bays.length > 0
        ? raw.bays
        : DEFAULT_TECNICENTRO_CONFIG.bays,
    vehicleTypes:
      Array.isArray(raw.vehicleTypes) && raw.vehicleTypes.length > 0
        ? raw.vehicleTypes
        : DEFAULT_TECNICENTRO_CONFIG.vehicleTypes,
    categories:
      Array.isArray(raw.categories) && raw.categories.length > 0
        ? raw.categories
        : DEFAULT_TECNICENTRO_CONFIG.categories,
    subcategories:
      Array.isArray(raw.subcategories) && raw.subcategories.length > 0
        ? raw.subcategories
        : DEFAULT_TECNICENTRO_CONFIG.subcategories,
    packages:
      Array.isArray(raw.packages) && raw.packages.length > 0
        ? raw.packages
        : DEFAULT_TECNICENTRO_CONFIG.packages,
    addons:
      Array.isArray(raw.addons) && raw.addons.length > 0
        ? raw.addons
        : DEFAULT_TECNICENTRO_CONFIG.addons,
    filterOptions: {
      ...DEFAULT_TECNICENTRO_CONFIG.filterOptions,
      ...(raw.filterOptions || {}),
    },
  };
}

export function resolveTecnicentroPrice(
  item: {
    pricingMode?: TecPricingMode;
    quoteRequired?: boolean;
    basePrice?: number | null;
    price?: number | null;
    promoPrice?: number | null;
    priceByVehicleType?: Record<string, number>;
  },
  vehicleTypeId?: string
): { unitPrice: number | null; originalPrice: number | null; quoteRequired: boolean } {
  if (item.pricingMode === "QUOTE_REQUIRED" || item.quoteRequired) {
    return { unitPrice: null, originalPrice: null, quoteRequired: true };
  }
  const byVt =
    vehicleTypeId &&
    item.priceByVehicleType &&
    typeof item.priceByVehicleType[vehicleTypeId] === "number" &&
    item.priceByVehicleType[vehicleTypeId] > 0
      ? Number(item.priceByVehicleType[vehicleTypeId])
      : null;

  const baseVal =
    item.basePrice !== undefined && item.basePrice !== null
      ? Number(item.basePrice)
      : item.price !== undefined && item.price !== null
      ? Number(item.price)
      : null;

  if (byVt !== null) {
    if (
      item.promoPrice &&
      item.promoPrice > 0 &&
      baseVal &&
      item.promoPrice < baseVal &&
      byVt === baseVal
    ) {
      return { unitPrice: Number(item.promoPrice), originalPrice: byVt, quoteRequired: false };
    }
    return { unitPrice: byVt, originalPrice: byVt, quoteRequired: false };
  }

  if (baseVal === null || baseVal <= 0) {
    return { unitPrice: null, originalPrice: null, quoteRequired: true };
  }

  if (item.promoPrice && item.promoPrice > 0 && item.promoPrice < baseVal) {
    return { unitPrice: Number(item.promoPrice), originalPrice: baseVal, quoteRequired: false };
  }

  return { unitPrice: baseVal, originalPrice: baseVal, quoteRequired: false };
}

async function getOrInitTecnicentroData() {
  return await withRetry(async () => {
    const [configRow, srvMetaRow, tiresMetaRow] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { id: TECNICENTRO_CONFIG_ID } }),
      prisma.systemSetting.findUnique({ where: { id: TECNICENTRO_SERVICES_META_ID } }),
      prisma.systemSetting.findUnique({ where: { id: TECNICENTRO_TIRES_META_ID } }),
    ]);

    let config: TecnicentroConfigData = DEFAULT_TECNICENTRO_CONFIG;
    if (configRow?.configJson) {
      try {
        config = normalizeTecnicentroConfig(JSON.parse(configRow.configJson));
      } catch {}
    } else {
      await prisma.systemSetting.upsert({
        where: { id: TECNICENTRO_CONFIG_ID },
        update: {},
        create: {
          id: TECNICENTRO_CONFIG_ID,
          configJson: JSON.stringify(DEFAULT_TECNICENTRO_CONFIG),
        },
      });
    }

    let srvMetaMap: Record<string, TecnicentroServiceMeta> = {};
    let srvSeeded = false;
    if (srvMetaRow?.configJson) {
      try {
        const parsed = JSON.parse(srvMetaRow.configJson);
        srvMetaMap = parsed.items || {};
        srvSeeded = Boolean(parsed.seededOnce);
      } catch {}
    }

    if (!srvSeeded) {
      for (const sItem of INITIAL_TECNICENTRO_SERVICES) {
        const existing = await prisma.workshopService.findUnique({
          where: { code: sItem.code },
        });
        const dbSrv = existing
          ? existing
          : await prisma.workshopService.create({
              data: {
                code: sItem.code,
                name: sItem.name,
                category: sItem.category,
                price: sItem.price,
                estimatedMinutes: sItem.estimatedMinutes,
                description: sItem.description,
                requiresBay: true,
                active: true,
              },
            });

        if (!srvMetaMap[dbSrv.id]) {
          srvMetaMap[dbSrv.id] = {
            ...sItem.meta,
            serviceId: dbSrv.id,
            code: dbSrv.code,
          };
        }
      }

      await prisma.systemSetting.upsert({
        where: { id: TECNICENTRO_SERVICES_META_ID },
        update: { configJson: JSON.stringify({ seededOnce: true, items: srvMetaMap }) },
        create: { id: TECNICENTRO_SERVICES_META_ID, configJson: JSON.stringify({ seededOnce: true, items: srvMetaMap }) },
      });
    }

    let tiresMetaMap: Record<string, TecnicentroTireMeta> = {};
    let tiresSeeded = false;
    if (tiresMetaRow?.configJson) {
      try {
        const parsed = JSON.parse(tiresMetaRow.configJson);
        tiresMetaMap = parsed.items || {};
        tiresSeeded = Boolean(parsed.seededOnce);
      } catch {}
    }

    if (!tiresSeeded) {
      for (const tItem of INITIAL_TECNICENTRO_TIRES) {
        const existing = await prisma.product.findUnique({
          where: { code: tItem.code },
        });
        const dbProd = existing
          ? existing
          : await prisma.product.create({
              data: {
                code: tItem.code,
                name: tItem.name,
                brand: tItem.brand,
                category: "Neumáticos",
                price: tItem.price,
                costPrice: tItem.costPrice,
                stock: tItem.stock,
                minStock: 4,
                location: "Rack Neumáticos",
                imageUrl: tItem.imageUrl,
                status: "En Stock",
              },
            });

        if (!tiresMetaMap[dbProd.id]) {
          tiresMetaMap[dbProd.id] = {
            ...tItem.meta,
            productId: dbProd.id,
            code: dbProd.code,
          };
        }
      }

      await prisma.systemSetting.upsert({
        where: { id: TECNICENTRO_TIRES_META_ID },
        update: { configJson: JSON.stringify({ seededOnce: true, items: tiresMetaMap }) },
        create: { id: TECNICENTRO_TIRES_META_ID, configJson: JSON.stringify({ seededOnce: true, items: tiresMetaMap }) },
      });
    }

    const [allServices, allProducts, vehicles, promotions, appointments] = await Promise.all([
      prisma.workshopService.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.product.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.vehicle.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }),
      prisma.posPromotion.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
      prisma.clientAppointment.findMany({
        where: { status: { notIn: ["Cancelada", "CANCELADA"] } },
        orderBy: { createdAt: "desc" },
        take: 150,
      }),
    ]);

    const enrichedServices = allServices
      .filter((s) => {
        if (srvMetaMap[s.id]) return !srvMetaMap[s.id].archived;
        const catLow = (s.category || "").toLowerCase();
        const codeLow = (s.code || "").toLowerCase();
        return (
          catLow.includes("tecnicentro") ||
          catLow.includes("llantera") ||
          catLow.includes("alineacion") ||
          catLow.includes("balanceo") ||
          codeLow.startsWith("tc-")
        );
      })
      .map((s, idx) => {
        const meta = srvMetaMap[s.id];
        const basePrice = Number(s.price);
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          category: s.category,
          pricingMode: meta?.pricingMode || (basePrice > 0 ? "FIXED" : "QUOTE_REQUIRED"),
          basePrice: meta?.pricingMode === "QUOTE_REQUIRED" ? null : basePrice > 0 ? basePrice : null,
          promoPrice: meta?.promoPrice ?? null,
          priceByVehicleType: meta?.priceByVehicleType || {},
          requiresPriorInspection: Boolean(meta?.requiresPriorInspection),
          defaultUnitsCount: meta?.defaultUnitsCount || 1,
          estimatedMinutes: Number(s.estimatedMinutes || meta?.estimatedMinutes || 30),
          applicableVehicleTypes:
            meta?.applicableVehicleTypes && meta.applicableVehicleTypes.length > 0
              ? meta.applicableVehicleTypes
              : ALL_DEFAULT_VTS,
          categoryId: meta?.categoryId || "tc_cat_alineacion",
          subcategoryId: meta?.subcategoryId || "tc_sub_ali_ruedas",
          shortDescription: meta?.shortDescription || s.description || "",
          fullDescription: meta?.fullDescription || s.description || "",
          imageUrl:
            meta?.imageUrl ||
            "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
          includesList: meta?.includesList || [],
          excludesList: meta?.excludesList || [],
          materialsIncluded: meta?.materialsIncluded || [],
          partsIncluded: meta?.partsIncluded || [],
          associatedAddonIds: meta?.associatedAddonIds || [],
          conditionsText: meta?.conditionsText || "",
          availability: meta?.availability || (s.active ? "Disponible" : "No disponible"),
          alignmentType: meta?.alignmentType || "",
          wheelCount: meta?.wheelCount || "",
          balanceServiceType: meta?.balanceServiceType || "",
          suspensionInspectionType: meta?.suspensionInspectionType || "",
          suspensionComponent: meta?.suspensionComponent || "",
          brakeComponent: meta?.brakeComponent || "",
          brakeServiceType: meta?.brakeServiceType || "",
          diagnosticType: meta?.diagnosticType || "",
          diagnosticSystem: meta?.diagnosticSystem || "",
          steeringComponent: meta?.steeringComponent || "",
          steeringInspectionClass: meta?.steeringInspectionClass || "",
          order: meta?.order ?? idx + 1,
          active: meta?.active !== undefined ? meta.active : s.active,
        };
      })
      .sort((a, b) => a.order - b.order);

    const enrichedTires = allProducts
      .filter((p) => {
        if (tiresMetaMap[p.id]) return true;
        const catLow = (p.category || "").toLowerCase();
        const codeLow = (p.code || "").toLowerCase();
        return (
          catLow.includes("neumático") ||
          catLow.includes("neumatico") ||
          catLow.includes("llanta") ||
          codeLow.startsWith("tc-neu-")
        );
      })
      .map((p) => {
        const meta = tiresMetaMap[p.id];
        // Inferir medida si existe en el nombre ej. 205/55 R16
        const sizeMatch = p.name.match(/(\d{3})\/(\d{2})\s*R(\d{2})/i);
        const width = meta?.width || (sizeMatch ? sizeMatch[1] : "205");
        const profile = meta?.profile || (sizeMatch ? sizeMatch[2] : "55");
        const rimDiameter = meta?.rimDiameter || (sizeMatch ? `R${sizeMatch[3]}` : "R16");
        const tireSize = meta?.tireSize || `${width}/${profile} ${rimDiameter}`;
        const active = meta?.active !== undefined ? meta.active : p.status !== "Inactivo";

        return {
          id: p.id,
          code: p.code,
          name: p.name,
          brand: p.brand || "Genérica",
          category: p.category,
          price: Number(p.price),
          costPrice: p.costPrice !== null ? Number(p.costPrice) : null,
          stock: Number(p.stock),
          minStock: Number(p.minStock || 4),
          imageUrl:
            p.imageUrl ||
            "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80",
          status: p.status,
          categoryId: meta?.categoryId || "tc_cat_venta_neum",
          subcategoryId: meta?.subcategoryId || "tc_sub_neu_venta",
          tireSize,
          width,
          profile,
          rimDiameter,
          loadIndex: meta?.loadIndex || "91",
          speedRating: meta?.speedRating || "V",
          modelRef: meta?.modelRef || p.code,
          specifications: meta?.specifications || "",
          includesInstallation: Boolean(meta?.includesInstallation),
          compatibilities: meta?.compatibilities || [],
          active,
        };
      });

    return {
      config,
      services: enrichedServices,
      tires: enrichedTires,
      vehicles: vehicles.map((v) => ({
        id: v.id,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        fuelType: v.fuelType,
        vehicleType: v.vehicleType,
      })),
      promotions: promotions.map((pr) => ({
        id: pr.id,
        code: pr.code,
        title: pr.title,
        discountType: pr.discountType,
        discountValue: Number(pr.discountValue),
        minPurchase: Number(pr.minPurchase),
      })),
      appointments: appointments.map((ap) => ({
        id: ap.id,
        appointmentNumber: ap.appointmentNumber,
        vehicle: ap.vehicle,
        plate: ap.plate,
        clientName: ap.clientName,
        serviceName: ap.serviceName,
        date: ap.date,
        timeSlot: ap.timeSlot,
        status: ap.status,
        bay: ap.bay,
      })),
    };
  });
}

// Caché en memoria en el servidor para respuestas instantáneas (< 50ms tras primer call)
let serverTecnicentroCache: {
  config: any;
  services: any[];
  tires: any[];
  vehicles: any[];
  promotions: any[];
  appointments: any[];
  timestamp: number;
} | null = null;

// GET: Cargar configuración, categorías, servicios, neumáticos, vehículos, promociones y citas
export async function GET() {
  try {
    const now = Date.now();
    // Cache de servidor de 10 minutos (se invalida en PUT/POST/DELETE)
    if (serverTecnicentroCache && now - serverTecnicentroCache.timestamp < 600000) {
      return NextResponse.json({
        success: true,
        config: serverTecnicentroCache.config,
        services: serverTecnicentroCache.services,
        tires: serverTecnicentroCache.tires,
        vehicles: serverTecnicentroCache.vehicles,
        promotions: serverTecnicentroCache.promotions,
        appointments: serverTecnicentroCache.appointments,
      });
    }
    const data = await getOrInitTecnicentroData();
    serverTecnicentroCache = {
      config: data.config,
      services: data.services,
      tires: data.tires,
      vehicles: data.vehicles,
      promotions: data.promotions,
      appointments: data.appointments,
      timestamp: now,
    };
    return NextResponse.json({
      success: true,
      config: data.config,
      services: data.services,
      tires: data.tires,
      vehicles: data.vehicles,
      promotions: data.promotions,
      appointments: data.appointments,
    });
  } catch (error: any) {
    console.error("Error en GET /api/taller/tecnicentro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al cargar datos de Tecnicentro" },
      { status: 500 }
    );
  }
}

// PUT: Guardar cambios manuales en la configuración de Tecnicentro
export async function PUT(req: NextRequest) {
  serverTecnicentroCache = null;
  try {
    const body = await req.json();
    const { config: incomingConfig } = body;

    const current = await getOrInitTecnicentroData();
    const updated = normalizeTecnicentroConfig({
      ...current.config,
      ...(incomingConfig || {}),
    });

    await withRetry(async () => {
      await prisma.systemSetting.upsert({
        where: { id: TECNICENTRO_CONFIG_ID },
        update: { configJson: JSON.stringify(updated) },
        create: { id: TECNICENTRO_CONFIG_ID, configJson: JSON.stringify(updated) },
      });
    });

    const refreshed = await getOrInitTecnicentroData();
    return NextResponse.json({
      success: true,
      config: refreshed.config,
      services: refreshed.services,
      tires: refreshed.tires,
    });
  } catch (error: any) {
    console.error("Error en PUT /api/taller/tecnicentro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar configuración de Tecnicentro" },
      { status: 500 }
    );
  }
}

// POST:
// 1. CALCULAR_Y_VALIDAR_SELECCION
// 2. SAVE_SERVICE
// 3. SAVE_TIRE_PRODUCT
// 4. CREAR_RESERVA_TECNICENTRO
export async function POST(req: NextRequest) {
  serverTecnicentroCache = null;
  try {
    const body = await req.json();
    const { action } = body;

    const current = await getOrInitTecnicentroData();

    // =========================================================================
    // ACCIÓN 1: VALIDAR Y CALCULAR SELECCIÓN EN EL SERVIDOR
    // =========================================================================
    if (action === "CALCULAR_Y_VALIDAR_SELECCION") {
      const {
        vehicleTypeId = "vt_sedan",
        selectedPackages = [], // string[]
        selectedServices = [], // Array<{ id: string; quantity?: number }>
        selectedAddons = [], // Array<{ id: string; quantity?: number }>
        selectedTires = [], // Array<{ id: string; quantity: number }>
        promoCode = "",
      } = body;

      const vehicleType =
        current.config.vehicleTypes.find((v) => v.id === vehicleTypeId) ||
        current.config.vehicleTypes[1] ||
        current.config.vehicleTypes[0];

      const includedServiceCodesSet = new Set<string>();
      const includedAddonIdsSet = new Set<string>();
      const includedByPackageName: Record<string, string> = {};

      const lines: Array<{
        id: string;
        code: string;
        name: string;
        group: "PACKAGE" | "LABOR_SERVICE" | "ADDON_SERVICE" | "PARTS_TIRES" | "QUOTE_PENDING";
        type: "SERVICE" | "PART";
        unitPrice: number;
        quantity: number;
        lineTotal: number;
        estimatedMinutes: number;
        alreadyIncludedInPackage: boolean;
        quoteRequired: boolean;
        subCategory: string;
        notes?: string;
      }> = [];

      // 1. Paquetes seleccionados
      for (const pkgId of selectedPackages) {
        const pkg = current.config.packages.find((p) => p.id === pkgId || p.code === pkgId);
        if (!pkg || !pkg.active) continue;
        if (pkg.availability === "No disponible") {
          return NextResponse.json(
            { success: false, error: `El paquete "${pkg.name}" no está disponible.` },
            { status: 400 }
          );
        }

        (pkg.includedServiceCodes || []).forEach((c) => {
          includedServiceCodesSet.add(c);
          includedByPackageName[c] = pkg.name;
        });
        (pkg.includedAddonIds || []).forEach((aId) => {
          includedAddonIdsSet.add(aId);
          includedByPackageName[aId] = pkg.name;
        });

        const priceInfo = resolveTecnicentroPrice(pkg, vehicleType?.id);
        lines.push({
          id: pkg.id,
          code: pkg.code,
          name: `${pkg.name} (${vehicleType?.name || "Vehículo"})`,
          group: priceInfo.quoteRequired ? "QUOTE_PENDING" : "PACKAGE",
          type: "SERVICE",
          unitPrice: priceInfo.unitPrice ?? 0,
          quantity: 1,
          lineTotal: priceInfo.unitPrice ?? 0,
          estimatedMinutes: Number(pkg.estimatedMinutes || 40),
          alreadyIncludedInPackage: false,
          quoteRequired: priceInfo.quoteRequired,
          subCategory: pkg.categoryId,
        });
      }

      // 2. Servicios individuales seleccionados
      for (const srvEntry of selectedServices) {
        const srvId = typeof srvEntry === "string" ? srvEntry : srvEntry.id;
        const reqQty = typeof srvEntry === "object" && srvEntry.quantity ? Math.max(1, Number(srvEntry.quantity)) : 1;
        const srv = current.services.find((s) => s.id === srvId || s.code === srvId);
        if (!srv || !srv.active) continue;
        if (srv.availability === "No disponible") {
          return NextResponse.json(
            { success: false, error: `El servicio "${srv.name}" no está disponible.` },
            { status: 400 }
          );
        }

        const alreadyInPkg = includedServiceCodesSet.has(srv.code);
        if (alreadyInPkg) {
          lines.push({
            id: srv.id,
            code: srv.code,
            name: `${srv.name} (Incluido en ${includedByPackageName[srv.code]})`,
            group: "LABOR_SERVICE",
            type: "SERVICE",
            unitPrice: 0,
            quantity: 1,
            lineTotal: 0,
            estimatedMinutes: 0,
            alreadyIncludedInPackage: true,
            quoteRequired: false,
            subCategory: srv.categoryId,
          });
          continue;
        }

        const priceInfo = resolveTecnicentroPrice(srv, vehicleType?.id);
        // Solo multiplicar por cantidad de ruedas/ejes/componentes cuando el administrador haya configurado esa regla
        const allowsMultiQty =
          srv.pricingMode === "PER_WHEEL" ||
          srv.pricingMode === "PER_AXLE" ||
          srv.pricingMode === "PER_COMPONENT";
        const effectiveQty = allowsMultiQty ? reqQty : 1;
        const unitPrice = priceInfo.unitPrice ?? 0;

        lines.push({
          id: srv.id,
          code: srv.code,
          name: `${srv.name}${allowsMultiQty && effectiveQty > 1 ? ` (x${effectiveQty})` : ""} - ${vehicleType?.name || "Vehículo"}`,
          group: priceInfo.quoteRequired ? "QUOTE_PENDING" : "LABOR_SERVICE",
          type: "SERVICE",
          unitPrice,
          quantity: effectiveQty,
          lineTotal: Number((unitPrice * effectiveQty).toFixed(2)),
          estimatedMinutes: Number(srv.estimatedMinutes || 30),
          alreadyIncludedInPackage: false,
          quoteRequired: priceInfo.quoteRequired,
          subCategory: srv.categoryId,
          notes: srv.conditionsText,
        });
      }

      // 3. Servicios adicionales / complementos
      const hasPrimary =
        selectedPackages.length > 0 || selectedServices.length > 0 || selectedTires.length > 0;

      for (const addEntry of selectedAddons) {
        const addId = typeof addEntry === "string" ? addEntry : addEntry.id;
        const qty = typeof addEntry === "object" && addEntry.quantity ? Math.max(1, Number(addEntry.quantity)) : 1;
        const addon = current.config.addons.find((a) => a.id === addId || a.code === addId);
        if (!addon || !addon.active) continue;

        if (!addon.canBeStandalone && !hasPrimary) {
          return NextResponse.json(
            {
              success: false,
              error: `El adicional "${addon.name}" requiere seleccionar un servicio o neumático principal.`,
            },
            { status: 400 }
          );
        }

        const alreadyInPkg = includedAddonIdsSet.has(addon.id);
        if (alreadyInPkg) {
          lines.push({
            id: addon.id,
            code: addon.code,
            name: `${addon.name} (Incluido en ${includedByPackageName[addon.id]})`,
            group: addon.isPartOrSupply ? "PARTS_TIRES" : "ADDON_SERVICE",
            type: addon.isPartOrSupply ? "PART" : "SERVICE",
            unitPrice: 0,
            quantity: 1,
            lineTotal: 0,
            estimatedMinutes: 0,
            alreadyIncludedInPackage: true,
            quoteRequired: false,
            subCategory: "tc_cat_otros",
          });
          continue;
        }

        const priceInfo = resolveTecnicentroPrice(addon, vehicleType?.id);
        const unitPrice = priceInfo.unitPrice ?? 0;
        lines.push({
          id: addon.id,
          code: addon.code,
          name: addon.name,
          group: addon.isPartOrSupply ? "PARTS_TIRES" : "ADDON_SERVICE",
          type: addon.isPartOrSupply ? "PART" : "SERVICE",
          unitPrice,
          quantity: qty,
          lineTotal: Number((unitPrice * qty).toFixed(2)),
          estimatedMinutes: Number(addon.estimatedMinutes || 10),
          alreadyIncludedInPackage: false,
          quoteRequired: priceInfo.quoteRequired,
          subCategory: "tc_cat_otros",
        });
      }

      // 4. Neumáticos y productos del catálogo (validando stock real en Neon)
      for (const tireEntry of selectedTires) {
        const tire = current.tires.find((t) => t.id === tireEntry.id || t.code === tireEntry.id);
        if (!tire || !tire.active) continue;
        const qty = Math.max(1, Number(tireEntry.quantity || 1));

        if (tire.stock <= 0) {
          return NextResponse.json(
            { success: false, error: `El neumático "${tire.name}" se encuentra agotado.` },
            { status: 400 }
          );
        }
        if (qty > tire.stock) {
          return NextResponse.json(
            {
              success: false,
              error: `Stock insuficiente para "${tire.name}". Disponible: ${tire.stock} unidades.`,
            },
            { status: 400 }
          );
        }

        const unitPrice = Number(tire.price);
        lines.push({
          id: tire.id,
          code: tire.code,
          name: `${tire.name} (${tire.brand} - ${tire.tireSize})`,
          group: "PARTS_TIRES",
          type: "PART",
          unitPrice,
          quantity: qty,
          lineTotal: Number((unitPrice * qty).toFixed(2)),
          estimatedMinutes: 0, // La instalación se distingue como servicio aparte salvo que includesInstallation sea true
          alreadyIncludedInPackage: false,
          quoteRequired: false,
          subCategory: "tc_cat_venta_neum",
          notes: tire.includesInstallation
            ? "Incluye montaje básico según regla comercial."
            : "Precio del neumático; montaje y balanceo se registran como servicio independiente.",
        });
      }

      // Desglose por rubro (Servicios/Mano de Obra vs Paquetes vs Adicionales vs Repuestos/Neumáticos)
      const laborTotal = lines
        .filter((l) => l.group === "LABOR_SERVICE" && !l.quoteRequired)
        .reduce((acc, l) => acc + l.lineTotal, 0);
      const packagesTotal = lines
        .filter((l) => l.group === "PACKAGE" && !l.quoteRequired)
        .reduce((acc, l) => acc + l.lineTotal, 0);
      const addonsTotal = lines
        .filter((l) => l.group === "ADDON_SERVICE" && !l.quoteRequired)
        .reduce((acc, l) => acc + l.lineTotal, 0);
      const partsAndTiresTotal = lines
        .filter((l) => l.group === "PARTS_TIRES" && !l.quoteRequired)
        .reduce((acc, l) => acc + l.lineTotal, 0);
      const quotePendingCount = lines.filter((l) => l.quoteRequired).length;

      const subtotal = Number(
        (laborTotal + packagesTotal + addonsTotal + partsAndTiresTotal).toFixed(2)
      );
      const totalMinutes = lines.reduce((acc, l) => acc + l.estimatedMinutes, 0);

      let promoDiscount = 0;
      let appliedPromotion: any = null;
      if (promoCode && String(promoCode).trim()) {
        const cleanPromo = String(promoCode).trim().toUpperCase();
        const foundPromo = current.promotions.find((p) => p.code.toUpperCase() === cleanPromo);
        if (foundPromo && subtotal >= foundPromo.minPurchase) {
          appliedPromotion = foundPromo;
          promoDiscount =
            foundPromo.discountType === "PERCENT"
              ? Number(((subtotal * foundPromo.discountValue) / 100).toFixed(2))
              : Math.min(subtotal, Number(foundPromo.discountValue));
        }
      }

      const netAfterDiscount = Math.max(0, Number((subtotal - promoDiscount).toFixed(2)));
      const taxRate = Number(current.config.taxRatePercent || 15);
      const pricesIncludeTax = Boolean(current.config.pricesIncludeTax);
      const taxAmount = pricesIncludeTax
        ? Number((netAfterDiscount - netAfterDiscount / (1 + taxRate / 100)).toFixed(2))
        : Number(((netAfterDiscount * taxRate) / 100).toFixed(2));
      const total = pricesIncludeTax
        ? netAfterDiscount
        : Number((netAfterDiscount + taxAmount).toFixed(2));

      return NextResponse.json({
        success: true,
        calculation: {
          vehicleType,
          lines,
          breakdown: {
            laborTotal: Number(laborTotal.toFixed(2)),
            packagesTotal: Number(packagesTotal.toFixed(2)),
            addonsTotal: Number(addonsTotal.toFixed(2)),
            partsAndTiresTotal: Number(partsAndTiresTotal.toFixed(2)),
            quotePendingCount,
          },
          subtotal,
          promoDiscount,
          appliedPromotion,
          taxRate,
          pricesIncludeTax,
          taxAmount,
          total,
          totalMinutes,
        },
      });
    }

    // =========================================================================
    // ACCIÓN 2: CREAR O EDITAR SERVICIO DE TECNICENTRO EN NEON
    // =========================================================================
    if (action === "SAVE_SERVICE") {
      const sPayload = body.service || body;
      const {
        id,
        code,
        name,
        categoryId = "tc_cat_alineacion",
        subcategoryId = "tc_sub_ali_ruedas",
        shortDescription = "",
        fullDescription = "",
        imageUrl = "",
        pricingMode = "FIXED",
        basePrice,
        promoPrice = null,
        priceByVehicleType = {},
        requiresPriorInspection = false,
        defaultUnitsCount = 1,
        estimatedMinutes = 30,
        applicableVehicleTypes = ALL_DEFAULT_VTS,
        includesList = [],
        excludesList = [],
        materialsIncluded = [],
        partsIncluded = [],
        associatedAddonIds = [],
        conditionsText = "",
        availability = "Disponible",
        alignmentType = "",
        wheelCount = "",
        balanceServiceType = "",
        suspensionInspectionType = "",
        suspensionComponent = "",
        brakeComponent = "",
        brakeServiceType = "",
        diagnosticType = "",
        diagnosticSystem = "",
        steeringComponent = "",
        steeringInspectionClass = "",
        order = 1,
        active = true,
      } = sPayload;

      if (!name || !String(name).trim()) {
        return NextResponse.json(
          { success: false, error: "El nombre del servicio es obligatorio." },
          { status: 400 }
        );
      }

      const cleanName = String(name).trim();
      const finalCode =
        String(code || "").trim().toUpperCase() || `TC-SRV-${Date.now().toString().slice(-5)}`;
      const isQuote = pricingMode === "QUOTE_REQUIRED";
      const numPrice =
        !isQuote && basePrice !== null && basePrice !== undefined && String(basePrice) !== ""
          ? Math.max(0, Number(basePrice))
          : 0;
      const numPromo =
        !isQuote && promoPrice !== null && promoPrice !== undefined && Number(promoPrice) > 0
          ? Number(promoPrice)
          : null;
      const numMinutes = Math.max(5, parseInt(String(estimatedMinutes || 30), 10) || 30);

      await withRetry(async () => {
        let dbSrv;
        if (id) {
          dbSrv = await prisma.workshopService.update({
            where: { id },
            data: {
              code: finalCode,
              name: cleanName,
              category: "Tecnicentro",
              price: numPrice,
              estimatedMinutes: numMinutes,
              description: String(shortDescription || fullDescription || "").trim(),
              active: Boolean(active),
            },
          });
        } else {
          const dup = await prisma.workshopService.findUnique({ where: { code: finalCode } });
          if (dup) throw new Error(`Ya existe un servicio con el código "${finalCode}".`);
          dbSrv = await prisma.workshopService.create({
            data: {
              code: finalCode,
              name: cleanName,
              category: "Tecnicentro",
              price: numPrice,
              estimatedMinutes: numMinutes,
              description: String(shortDescription || fullDescription || "").trim(),
              requiresBay: true,
              active: Boolean(active),
            },
          });
        }

        const metaRow = await prisma.systemSetting.findUnique({
          where: { id: TECNICENTRO_SERVICES_META_ID },
        });
        let metaMap: Record<string, TecnicentroServiceMeta> = {};
        if (metaRow?.configJson) {
          try {
            metaMap = JSON.parse(metaRow.configJson).items || {};
          } catch {}
        }

        metaMap[dbSrv.id] = {
          serviceId: dbSrv.id,
          code: dbSrv.code,
          categoryId,
          subcategoryId,
          shortDescription: String(shortDescription || "").trim(),
          fullDescription: String(fullDescription || shortDescription || "").trim(),
          imageUrl:
            imageUrl ||
            "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
          pricingMode,
          basePrice: isQuote ? null : numPrice > 0 ? numPrice : null,
          promoPrice: numPromo,
          priceByVehicleType: priceByVehicleType || {},
          requiresPriorInspection: Boolean(requiresPriorInspection),
          defaultUnitsCount: Math.max(1, Number(defaultUnitsCount || 1)),
          estimatedMinutes: numMinutes,
          applicableVehicleTypes: Array.isArray(applicableVehicleTypes)
            ? applicableVehicleTypes
            : ALL_DEFAULT_VTS,
          includesList: Array.isArray(includesList) ? includesList : [],
          excludesList: Array.isArray(excludesList) ? excludesList : [],
          materialsIncluded: Array.isArray(materialsIncluded) ? materialsIncluded : [],
          partsIncluded: Array.isArray(partsIncluded) ? partsIncluded : [],
          associatedAddonIds: Array.isArray(associatedAddonIds) ? associatedAddonIds : [],
          conditionsText: String(conditionsText || "").trim(),
          availability: availability || "Disponible",
          alignmentType: String(alignmentType || ""),
          wheelCount: String(wheelCount || ""),
          balanceServiceType: String(balanceServiceType || ""),
          suspensionInspectionType: String(suspensionInspectionType || ""),
          suspensionComponent: String(suspensionComponent || ""),
          brakeComponent: String(brakeComponent || ""),
          brakeServiceType: String(brakeServiceType || ""),
          diagnosticType: String(diagnosticType || ""),
          diagnosticSystem: String(diagnosticSystem || ""),
          steeringComponent: String(steeringComponent || ""),
          steeringInspectionClass: String(steeringInspectionClass || ""),
          order: Number(order || 1),
          active: Boolean(active),
          archived: false,
        };

        await prisma.systemSetting.upsert({
          where: { id: TECNICENTRO_SERVICES_META_ID },
          update: { configJson: JSON.stringify({ seededOnce: true, items: metaMap }) },
          create: { id: TECNICENTRO_SERVICES_META_ID, configJson: JSON.stringify({ seededOnce: true, items: metaMap }) },
        });
      });

      const refreshed = await getOrInitTecnicentroData();
      return NextResponse.json({
        success: true,
        config: refreshed.config,
        services: refreshed.services,
      });
    }

    // =========================================================================
    // ACCIÓN 3: CREAR O EDITAR NEUMÁTICO / PRODUCTO DE TECNICENTRO EN NEON
    // =========================================================================
    if (action === "SAVE_TIRE_PRODUCT") {
      const tPayload = body.tire || body;
      const {
        id,
        code,
        name,
        brand = "Michelin",
        price = 0,
        costPrice = null,
        stock = 4,
        minStock = 4,
        imageUrl = "",
        width = "205",
        profile = "55",
        rimDiameter = "R16",
        loadIndex = "91",
        speedRating = "V",
        modelRef = "",
        specifications = "",
        includesInstallation = false,
        compatibilities = [],
        active = true,
      } = tPayload;

      if (!name || !String(name).trim()) {
        return NextResponse.json(
          { success: false, error: "El nombre del neumático o producto es obligatorio." },
          { status: 400 }
        );
      }

      const cleanName = String(name).trim();
      const finalCode =
        String(code || "").trim().toUpperCase() || `TC-NEU-${Date.now().toString().slice(-5)}`;
      const numPrice = Math.max(0, Number(price || 0));
      const numCost = costPrice !== null && costPrice !== "" ? Math.max(0, Number(costPrice)) : null;
      const numStock = Math.max(0, parseInt(String(stock ?? 0), 10) || 0);
      const status = !active ? "Inactivo" : numStock <= 0 ? "Agotado" : "En Stock";
      const cleanRim = String(rimDiameter).toUpperCase().startsWith("R")
        ? String(rimDiameter).toUpperCase()
        : `R${rimDiameter}`;
      const tireSize = `${width}/${profile} ${cleanRim}`;

      await withRetry(async () => {
        let dbProd;
        if (id) {
          dbProd = await prisma.product.update({
            where: { id },
            data: {
              code: finalCode,
              name: cleanName,
              brand: String(brand || "").trim(),
              category: "Neumáticos",
              price: numPrice,
              costPrice: numCost,
              stock: numStock,
              minStock: Number(minStock || 4),
              imageUrl:
                imageUrl ||
                "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80",
              status,
            },
          });
        } else {
          const dup = await prisma.product.findUnique({ where: { code: finalCode } });
          if (dup) throw new Error(`Ya existe un producto con el código SKU "${finalCode}".`);
          dbProd = await prisma.product.create({
            data: {
              code: finalCode,
              name: cleanName,
              brand: String(brand || "").trim(),
              category: "Neumáticos",
              price: numPrice,
              costPrice: numCost,
              stock: numStock,
              minStock: Number(minStock || 4),
              location: "Rack Neumáticos",
              imageUrl:
                imageUrl ||
                "https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80",
              status,
            },
          });
        }

        const metaRow = await prisma.systemSetting.findUnique({
          where: { id: TECNICENTRO_TIRES_META_ID },
        });
        let metaMap: Record<string, TecnicentroTireMeta> = {};
        if (metaRow?.configJson) {
          try {
            metaMap = JSON.parse(metaRow.configJson).items || {};
          } catch {}
        }

        metaMap[dbProd.id] = {
          productId: dbProd.id,
          code: dbProd.code,
          categoryId: "tc_cat_venta_neum",
          subcategoryId: "tc_sub_neu_venta",
          tireSize,
          width: String(width),
          profile: String(profile),
          rimDiameter: cleanRim,
          loadIndex: String(loadIndex || ""),
          speedRating: String(speedRating || ""),
          modelRef: String(modelRef || ""),
          specifications: String(specifications || ""),
          includesInstallation: Boolean(includesInstallation),
          compatibilities: Array.isArray(compatibilities) ? compatibilities : [],
          active: Boolean(active),
        };

        await prisma.systemSetting.upsert({
          where: { id: TECNICENTRO_TIRES_META_ID },
          update: { configJson: JSON.stringify({ seededOnce: true, items: metaMap }) },
          create: { id: TECNICENTRO_TIRES_META_ID, configJson: JSON.stringify({ seededOnce: true, items: metaMap }) },
        });
      });

      const refreshed = await getOrInitTecnicentroData();
      return NextResponse.json({
        success: true,
        tires: refreshed.tires,
      });
    }

    // =========================================================================
    // ACCIÓN 4: CREAR RESERVA DE BAHÍA DE TECNICENTRO (ClientAppointment)
    // =========================================================================
    if (action === "CREAR_RESERVA_TECNICENTRO") {
      const {
        vehicle = "",
        plate = "",
        clientName = "",
        clientPhone = "",
        serviceSummary = "",
        date = "",
        timeSlot = "",
        bay = "Bahía Alineación 3D #1",
        notes = "",
        idempotencyKey = "",
      } = body;

      if (!date || !timeSlot || !serviceSummary) {
        return NextResponse.json(
          { success: false, error: "Selecciona fecha, hora y servicio para agendar." },
          { status: 400 }
        );
      }

      const cleanPlate = String(plate || "S/P").trim().toUpperCase();
      const existingSlot = await prisma.clientAppointment.findFirst({
        where: {
          date: String(date).trim(),
          timeSlot: String(timeSlot).trim(),
          bay: String(bay).trim(),
          status: { notIn: ["Cancelada", "CANCELADA"] },
        },
      });

      if (existingSlot) {
        if (
          existingSlot.plate.toUpperCase() === cleanPlate &&
          existingSlot.serviceName === serviceSummary
        ) {
          return NextResponse.json({
            success: true,
            alreadyRegistered: true,
            appointment: existingSlot,
          });
        }
        return NextResponse.json(
          {
            success: false,
            error: `La ${bay} ya está ocupada el ${date} a las ${timeSlot}. Elige otro horario o bahía.`,
          },
          { status: 409 }
        );
      }

      const appointmentNumber = idempotencyKey
        ? `TC-${String(idempotencyKey).slice(-6).toUpperCase()}`
        : `TC-${Date.now().toString().slice(-6)}`;

      const created = await prisma.clientAppointment.create({
        data: {
          appointmentNumber,
          vehicle: String(vehicle || "Vehículo Tecnicentro").trim(),
          plate: cleanPlate,
          clientName: String(clientName || "Cliente Tecnicentro").trim(),
          clientPhone: clientPhone ? String(clientPhone).trim() : null,
          serviceName: String(serviceSummary).trim(),
          date: String(date).trim(),
          timeSlot: String(timeSlot).trim(),
          status: "Programada",
          tech: "Especialista Tecnicentro",
          bay: String(bay).trim(),
          notes: notes ? String(notes).trim() : null,
        },
      });

      return NextResponse.json({
        success: true,
        appointment: created,
      });
    }

    return NextResponse.json({ success: false, error: "Acción no reconocida" }, { status: 400 });
  } catch (error: any) {
    console.error("Error en POST /api/taller/tecnicentro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar solicitud en Tecnicentro" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar o archivar servicio o neumático protegiendo historial
export async function DELETE(req: NextRequest) {
  serverTecnicentroCache = null;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") || "service";

    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });
    }

    if (type === "tire") {
      const prod = await prisma.product.findUnique({ where: { id } });
      if (!prod) {
        return NextResponse.json({ success: false, error: "Neumático no encontrado" }, { status: 404 });
      }
      const [salesCount, ordersCount] = await Promise.all([
        prisma.saleItem.count({ where: { OR: [{ productId: id }, { code: prod.code }] } }),
        prisma.workshopOrder.count({ where: { itemsJson: { contains: prod.code } } }),
      ]);

      if (salesCount > 0 || ordersCount > 0) {
        await prisma.product.update({ where: { id }, data: { status: "Inactivo" } });
        const refreshed = await getOrInitTecnicentroData();
        return NextResponse.json({
          success: true,
          archivedInstead: true,
          message: "El neumático tiene historial de ventas/órdenes y fue desactivado de forma segura.",
          tires: refreshed.tires,
        });
      }

      await prisma.product.delete({ where: { id } });
      const refreshed = await getOrInitTecnicentroData();
      return NextResponse.json({
        success: true,
        message: "Neumático eliminado correctamente.",
        tires: refreshed.tires,
      });
    }

    const srv = await prisma.workshopService.findUnique({ where: { id } });
    if (!srv) {
      return NextResponse.json({ success: false, error: "Servicio no encontrado" }, { status: 404 });
    }

    const [ordersCount, salesCount] = await Promise.all([
      prisma.workshopOrder.count({
        where: {
          OR: [{ itemsJson: { contains: srv.code } }, { servicesJson: { contains: srv.code } }],
        },
      }),
      prisma.saleItem.count({ where: { code: srv.code } }),
    ]);

    const metaRow = await prisma.systemSetting.findUnique({
      where: { id: TECNICENTRO_SERVICES_META_ID },
    });
    let metaMap: Record<string, TecnicentroServiceMeta> = {};
    if (metaRow?.configJson) {
      try {
        metaMap = JSON.parse(metaRow.configJson).items || {};
      } catch {}
    }

    if (ordersCount > 0 || salesCount > 0) {
      await prisma.workshopService.update({ where: { id }, data: { active: false } });
      if (metaMap[id]) {
        metaMap[id] = { ...metaMap[id], active: false, archived: true };
        await prisma.systemSetting.upsert({
          where: { id: TECNICENTRO_SERVICES_META_ID },
          update: { configJson: JSON.stringify({ seededOnce: true, items: metaMap }) },
          create: { id: TECNICENTRO_SERVICES_META_ID, configJson: JSON.stringify({ seededOnce: true, items: metaMap }) },
        });
      }
      const refreshed = await getOrInitTecnicentroData();
      return NextResponse.json({
        success: true,
        archivedInstead: true,
        message: "El servicio cuenta con historial de órdenes y fue archivado/desactivado.",
        services: refreshed.services,
      });
    }

    await prisma.workshopService.delete({ where: { id } });
    if (metaMap[id]) {
      delete metaMap[id];
      await prisma.systemSetting.upsert({
        where: { id: TECNICENTRO_SERVICES_META_ID },
        update: { configJson: JSON.stringify({ seededOnce: true, items: metaMap }) },
        create: { id: TECNICENTRO_SERVICES_META_ID, configJson: JSON.stringify({ seededOnce: true, items: metaMap }) },
      });
    }

    const refreshed = await getOrInitTecnicentroData();
    return NextResponse.json({
      success: true,
      message: "Servicio eliminado correctamente.",
      services: refreshed.services,
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/taller/tecnicentro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar/archivar registro" },
      { status: 500 }
    );
  }
}
