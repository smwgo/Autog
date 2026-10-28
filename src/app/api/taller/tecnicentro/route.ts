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
  packages: [],
  addons: [],
};

// Servicios iniciales de Tecnicentro para sembrar en prisma.workshopService
const INITIAL_TECNICENTRO_SERVICES: Array<any> = [];

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
    packages: Array.isArray(raw.packages) ? raw.packages : [],
    addons: Array.isArray(raw.addons) ? raw.addons : [],
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

    let tiresMetaMap: Record<string, TecnicentroTireMeta> = {};
    if (tiresMetaRow?.configJson) {
      try {
        const parsed = JSON.parse(tiresMetaRow.configJson);
        tiresMetaMap = parsed.items || {};
      } catch {}
    }

    // Modo de datos 100% reales: no inyectar servicios ni neumáticos ficticios automáticamente.
    // Solo se utilizan los datos reales creados o gestionados por el usuario.

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

// GET: Cargar configuración, categorías, servicios, neumáticos, vehículos, promociones y citas desde Neon PostgreSQL
export async function GET() {
  try {
    const data = await getOrInitTecnicentroData();
    serverTecnicentroCache = null;
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
