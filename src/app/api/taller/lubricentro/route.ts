import { NextRequest, NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CONFIG_SETTING_ID = "lubricentro_config_v1";
const META_SETTING_ID = "lubricentro_products_meta_v1";

export interface LubCategoryItem {
  id: string;
  label: string;
  icon: string;
  order: number;
  active: boolean;
  schemaType:
    | "aceites"
    | "transmision"
    | "filtros"
    | "fluidos"
    | "baterias"
    | "custom";
}

export interface LubSubcategoryItem {
  id: string;
  categoryId: string;
  label: string;
  icon: string;
  order: number;
  active: boolean;
  subSchemaType?:
    | "aceite_motor"
    | "aditivos"
    | "flush"
    | "grasas"
    | "transmision"
    | "filtros"
    | "fluidos"
    | "baterias"
    | "custom";
}

export interface LubOptionItem {
  id: string;
  label: string;
  value?: string;
  unit?: string;
  numericQty?: number;
  basePriceRef?: number;
  order: number;
  active: boolean;
  extra?: string;
}

export interface LubBrandItem {
  id: string;
  name: string;
  origin?: string;
  description?: string;
  active: boolean;
  order: number;
}

export interface LubVehicleCompatibility {
  id: string;
  brand: string;
  model: string;
  yearFrom?: number | null;
  yearTo?: number | null;
  engine?: string;
  notes?: string;
  verified: boolean;
}

export interface LubPresentationVariant {
  id: string;
  label: string; // ej. "1 litro", "1 galón", "4 litros"
  unitOfMeasure: string;
  price: number;
  stock: number;
  skuSuffix?: string;
}

export interface LubProductMeta {
  productId: string;
  code: string;
  lubCategoryId: string;
  lubSubcategoryId: string;
  manufacturerCode?: string;
  description?: string;
  lubricantBase?: string; // Sintético, Semisintético, Mineral
  viscosity?: string; // 0W-20, 5W-30, 75W-90, etc.
  specifications?: string[]; // API SP, ACEA C3, etc.
  presentation?: string; // 1 galón, 1 litro, 4 litros, etc.
  unitOfMeasure?: string; // Galón, Litro, Unidad, Cuarto, etc.
  presentationsAvailable?: LubPresentationVariant[];
  galleryUrls?: string[];
  active: boolean;
  compatibilities?: LubVehicleCompatibility[];
  // Campos específicos por categoría
  fluidType?: string; // Transmisión: ATF, CVT, DCT/DSG, Manual, Diferencial
  filterType?: string; // Filtros: Blindado, Elemento, Panel, Cabina Carbón, etc.
  filterApplication?: string; // Aplicación vehículo / motor
  fluidClass?: string; // Fluidos: Refrigerante 50/50, DOT 4, etc.
  voltage?: string; // Baterías: 12V, 24V
  capacityAh?: string; // Baterías: 45Ah / 450 CCA, 60Ah, 75Ah
  technology?: string; // Baterías: Convencional, AGM, EFB, Start-Stop
  dimensionsGroup?: string; // Baterías: Grupo 42, 47/H5, 48/H6, etc.
  polarity?: string; // Baterías: Positivo Izquierdo (+ -), Positivo Derecho (- +)
  additiveProductType?: string; // Aditivos/Flush: Antifricción, Inyectores, Flush
  additiveApplication?: string;
  greaseType?: string; // Grasas: Litio, Complejo Litio, MoS2, Grafito
  greaseApplication?: string;
  customAttributes?: Record<string, string>;
}

export interface LubricentroConfigData {
  categories: LubCategoryItem[];
  subcategories: LubSubcategoryItem[];
  bases: LubOptionItem[];
  quantities: LubOptionItem[];
  presentations: LubOptionItem[];
  viscosities: LubOptionItem[];
  specifications: LubOptionItem[];
  brands: LubBrandItem[];
  oilConfig: {
    bases: LubOptionItem[];
    quantities: LubOptionItem[];
    presentations: LubOptionItem[];
    viscosities: LubOptionItem[];
    specifications: LubOptionItem[];
  };
  transmissionConfig: {
    fluidTypes: LubOptionItem[];
    viscosities: LubOptionItem[];
    specifications: LubOptionItem[];
    presentations: LubOptionItem[];
  };
  filtersConfig: {
    filterTypes: LubOptionItem[];
    applications: LubOptionItem[];
  };
  fluidsConfig: {
    fluidClasses: LubOptionItem[];
    specifications: LubOptionItem[];
    presentations: LubOptionItem[];
  };
  batteriesConfig: {
    voltages: LubOptionItem[];
    capacities: LubOptionItem[];
    technologies: LubOptionItem[];
    dimensionGroups: LubOptionItem[];
    polarities: LubOptionItem[];
  };
  additivesConfig: {
    productTypes: LubOptionItem[];
    applications: LubOptionItem[];
    presentations: LubOptionItem[];
  };
  greasesConfig: {
    greaseTypes: LubOptionItem[];
    specifications: LubOptionItem[];
    applications: LubOptionItem[];
    presentations: LubOptionItem[];
  };
  categoryOptions?: any;
}

const BASE_PRESENTATIONS: LubOptionItem[] = [
  { id: "pres_1l", label: "1 litro", value: "1 litro", unit: "Litro", order: 1, active: true },
  { id: "pres_1qt", label: "1 cuarto (Qt)", value: "1 cuarto (Qt)", unit: "Cuarto", order: 2, active: true },
  { id: "pres_4l", label: "4 litros", value: "4 litros", unit: "Galón / 4L", order: 3, active: true },
  { id: "pres_1gal", label: "1 galón", value: "1 galón", unit: "Galón", order: 4, active: true },
  { id: "pres_5gal", label: "5 galones (Caneca)", value: "5 galones", unit: "Caneca", order: 5, active: true },
  { id: "pres_350ml", label: "350 ml", value: "350 ml", unit: "Frasco", order: 6, active: true },
  { id: "pres_500ml", label: "500 ml", value: "500 ml", unit: "Frasco", order: 7, active: true },
  { id: "pres_400g", label: "Cartucho 400g", value: "Cartucho 400g", unit: "Cartucho", order: 8, active: true },
  { id: "pres_1lb", label: "Pote 1 lb", value: "Pote 1 lb", unit: "Libra", order: 9, active: true },
  { id: "pres_unid", label: "Unidad", value: "Unidad", unit: "Unidad", order: 10, active: true },
];

const DEFAULT_LUBRICENTRO_CONFIG: LubricentroConfigData = {
  categories: [
    { id: "lub_aceite", label: "Aceites", icon: "🛢️", order: 1, active: true, schemaType: "aceites" },
    { id: "lub_transmision", label: "Transmisión", icon: "⚙️", order: 2, active: true, schemaType: "transmision" },
    { id: "lub_filtros", label: "Filtros", icon: "🌪️", order: 3, active: true, schemaType: "filtros" },
    { id: "lub_fluidos", label: "Fluidos", icon: "🌡️", order: 4, active: true, schemaType: "fluidos" },
    { id: "lub_baterias", label: "Baterías", icon: "🔋", order: 5, active: true, schemaType: "baterias" },
  ],
  subcategories: [
    // 1. Aceites
    { id: "lub_aceite_motor", categoryId: "lub_aceite", label: "Aceite", icon: "🛢️", order: 1, active: true, subSchemaType: "aceite_motor" },
    { id: "lub_aditivos", categoryId: "lub_aceite", label: "Aditivos", icon: "🧪", order: 2, active: true, subSchemaType: "aditivos" },
    { id: "lub_flush", categoryId: "lub_aceite", label: "Flush", icon: "🧼", order: 3, active: true, subSchemaType: "flush" },
    { id: "lub_grasa", categoryId: "lub_aceite", label: "Grasa", icon: "🧴", order: 4, active: true, subSchemaType: "grasas" },
    { id: "lub_tratamiento", categoryId: "lub_aceite", label: "Tratamiento", icon: "🛡️", order: 5, active: true, subSchemaType: "aditivos" },
    { id: "lub_valvulina", categoryId: "lub_aceite", label: "Valvulina", icon: "⚙️", order: 6, active: true, subSchemaType: "transmision" },
    { id: "lub_hidraulico_aceite", categoryId: "lub_aceite", label: "Hidráulico", icon: "🛞", order: 7, active: true, subSchemaType: "fluidos" },
    { id: "lub_frenos_aceite", categoryId: "lub_aceite", label: "Frenos", icon: "🛑", order: 8, active: true, subSchemaType: "fluidos" },
    { id: "lub_refrigerante_aceite", categoryId: "lub_aceite", label: "Refrigerante", icon: "🌡️", order: 9, active: true, subSchemaType: "fluidos" },
    { id: "lub_limpieza_combustible", categoryId: "lub_aceite", label: "Inyectores", icon: "⛽", order: 10, active: true, subSchemaType: "aditivos" },
    // 2. Transmisión
    { id: "lub_trans_automatica", categoryId: "lub_transmision", label: "ATF", icon: "🔄", order: 1, active: true, subSchemaType: "transmision" },
    { id: "lub_trans_cvt", categoryId: "lub_transmision", label: "CVT", icon: "⚡", order: 2, active: true, subSchemaType: "transmision" },
    { id: "lub_trans_dct", categoryId: "lub_transmision", label: "DCT/DSG", icon: "🏎️", order: 3, active: true, subSchemaType: "transmision" },
    { id: "lub_trans_manual", categoryId: "lub_transmision", label: "Manual", icon: "⚙️", order: 4, active: true, subSchemaType: "transmision" },
    { id: "lub_trans_diferencial", categoryId: "lub_transmision", label: "Diferencial", icon: "🔩", order: 5, active: true, subSchemaType: "transmision" },
    { id: "lub_trans_transfer", categoryId: "lub_transmision", label: "Transfer 4x4", icon: "🚜", order: 6, active: true, subSchemaType: "transmision" },
    { id: "lub_trans_embrague", categoryId: "lub_transmision", label: "Embrague", icon: "🦶", order: 7, active: true, subSchemaType: "transmision" },
    // 3. Filtros
    { id: "lub_fil_aceite", categoryId: "lub_filtros", label: "Aceite", icon: "🛢️", order: 1, active: true, subSchemaType: "filtros" },
    { id: "lub_fil_aire", categoryId: "lub_filtros", label: "Aire", icon: "🌪️", order: 2, active: true, subSchemaType: "filtros" },
    { id: "lub_fil_cabina", categoryId: "lub_filtros", label: "Cabina", icon: "❄️", order: 3, active: true, subSchemaType: "filtros" },
    { id: "lub_fil_combustible", categoryId: "lub_filtros", label: "Combustible", icon: "⛽", order: 4, active: true, subSchemaType: "filtros" },
    { id: "lub_fil_transmision", categoryId: "lub_filtros", label: "Transmisión", icon: "⚙️", order: 5, active: true, subSchemaType: "filtros" },
    { id: "lub_fil_separador", categoryId: "lub_filtros", label: "Separador Agua", icon: "💧", order: 6, active: true, subSchemaType: "filtros" },
    // 4. Fluidos
    { id: "lub_flu_coolant", categoryId: "lub_fluidos", label: "Refrigerante", icon: "🌡️", order: 1, active: true, subSchemaType: "fluidos" },
    { id: "lub_flu_frenos", categoryId: "lub_fluidos", label: "Frenos", icon: "🛑", order: 2, active: true, subSchemaType: "fluidos" },
    { id: "lub_flu_hidraulico", categoryId: "lub_fluidos", label: "Hidráulico", icon: "🛞", order: 3, active: true, subSchemaType: "fluidos" },
    { id: "lub_flu_limpiaparabrisas", categoryId: "lub_fluidos", label: "Parabrisas", icon: "🌧️", order: 4, active: true, subSchemaType: "fluidos" },
    { id: "lub_flu_desengrasante", categoryId: "lub_fluidos", label: "Desengrasante", icon: "🧽", order: 5, active: true, subSchemaType: "fluidos" },
    { id: "lub_flu_limpiacontactos", categoryId: "lub_fluidos", label: "Limpia Contactos", icon: "⚡", order: 6, active: true, subSchemaType: "fluidos" },
    { id: "lub_flu_otros", categoryId: "lub_fluidos", label: "Otros", icon: "💧", order: 7, active: true, subSchemaType: "fluidos" },
    // 5. Baterías
    { id: "lub_bat_convencionales", categoryId: "lub_baterias", label: "Convencionales", icon: "🔋", order: 1, active: true, subSchemaType: "baterias" },
    { id: "lub_bat_agm", categoryId: "lub_baterias", label: "AGM", icon: "⚡", order: 2, active: true, subSchemaType: "baterias" },
    { id: "lub_bat_efb", categoryId: "lub_baterias", label: "EFB", icon: "🔌", order: 3, active: true, subSchemaType: "baterias" },
    { id: "lub_bat_start_stop", categoryId: "lub_baterias", label: "Start-Stop", icon: "🚀", order: 4, active: true, subSchemaType: "baterias" },
    { id: "lub_bat_motos", categoryId: "lub_baterias", label: "Motos / Gel", icon: "🏍️", order: 5, active: true, subSchemaType: "baterias" },
    { id: "lub_bat_bornes", categoryId: "lub_baterias", label: "Bornes y Terminales", icon: "🔩", order: 6, active: true, subSchemaType: "baterias" },
  ],
  bases: [
    { id: "base_sintetico", label: "Sintético", value: "Sintético", order: 1, active: true },
    { id: "base_semisintetico", label: "Semisintético", value: "Semisintético", order: 2, active: true },
    { id: "base_mineral", label: "Mineral", value: "Mineral", order: 3, active: true },
  ],
  quantities: [
    { id: "qty_1gal", label: "1 Gal", value: "1 galón", unit: "Galón", numericQty: 1, order: 1, active: true },
    { id: "qty_2gal", label: "2 Gal", value: "2 galones", unit: "Galón", numericQty: 2, order: 2, active: true },
    { id: "qty_3gal", label: "3 Gal", value: "3 galones", unit: "Galón", numericQty: 3, order: 3, active: true },
    { id: "qty_4gal", label: "4 Gal", value: "4 galones", unit: "Galón", numericQty: 4, order: 4, active: true },
    { id: "qty_5gal", label: "5 Gal", value: "5 galones", unit: "Galón", numericQty: 5, order: 5, active: true },
  ],
  presentations: BASE_PRESENTATIONS,
  viscosities: [
    { id: "visc_0w20", label: "0W-20", value: "0W-20", basePriceRef: 42, order: 1, active: true },
    { id: "visc_5w20", label: "5W-20", value: "5W-20", basePriceRef: 40, order: 2, active: true },
    { id: "visc_5w30", label: "5W-30", value: "5W-30", basePriceRef: 38, order: 3, active: true },
    { id: "visc_5w40", label: "5W-40", value: "5W-40", basePriceRef: 40, order: 4, active: true },
    { id: "visc_10w30", label: "10W-30", value: "10W-30", basePriceRef: 28, order: 5, active: true },
    { id: "visc_10w40", label: "10W-40", value: "10W-40", basePriceRef: 28, order: 6, active: true },
    { id: "visc_15w40", label: "15W-40", value: "15W-40", basePriceRef: 26, order: 7, active: true },
    { id: "visc_20w50", label: "20W-50", value: "20W-50", basePriceRef: 22, order: 8, active: true },
  ],
  specifications: [
    { id: "spec_api_sp", label: "API SP", value: "API SP", order: 1, active: true },
    { id: "spec_api_sn_plus", label: "API SN Plus", value: "API SN Plus", order: 2, active: true },
    { id: "spec_api_ck4", label: "API CK-4", value: "API CK-4", order: 3, active: true },
    { id: "spec_acea_c3", label: "ACEA C3", value: "ACEA C3", order: 4, active: true },
    { id: "spec_acea_a3b4", label: "ACEA A3/B4", value: "ACEA A3/B4", order: 5, active: true },
    { id: "spec_ilsac_gf6a", label: "ILSAC GF-6A", value: "ILSAC GF-6A", order: 6, active: true },
    { id: "spec_dexos1", label: "DEXOS 1 Gen 3", value: "DEXOS 1 Gen 3", order: 7, active: true },
    { id: "spec_vw504", label: "VW 504.00/507.00", value: "VW 504.00/507.00", order: 8, active: true },
    { id: "spec_mb22951", label: "MB 229.51", value: "MB 229.51", order: 9, active: true },
  ],
  brands: [
    { id: "br_mobil", name: "Mobil 1", origin: "EE.UU.", active: true, order: 1 },
    { id: "br_castrol", name: "Castrol", origin: "Reino Unido", active: true, order: 2 },
    { id: "br_shell", name: "Shell Helix", origin: "Países Bajos", active: true, order: 3 },
    { id: "br_valvoline", name: "Valvoline", origin: "EE.UU.", active: true, order: 4 },
    { id: "br_liquimoly", name: "Liqui Moly", origin: "Alemania", active: true, order: 5 },
    { id: "br_motul", name: "Motul", origin: "Francia", active: true, order: 6 },
    { id: "br_havoline", name: "Havoline", origin: "EE.UU.", active: true, order: 7 },
    { id: "br_bosch", name: "Bosch", origin: "Alemania", active: true, order: 8 },
    { id: "br_mann", name: "Mann-Filter", origin: "Alemania", active: true, order: 9 },
    { id: "br_wix", name: "Wix Filters", origin: "EE.UU.", active: true, order: 10 },
    { id: "br_prestone", name: "Prestone", origin: "EE.UU.", active: true, order: 11 },
    { id: "br_brembo", name: "Brembo", origin: "Italia", active: true, order: 12 },
    { id: "br_moura", name: "Moura", origin: "Brasil", active: true, order: 13 },
    { id: "br_mac", name: "MAC Silver", origin: "Colombia", active: true, order: 14 },
  ],
  oilConfig: {
    bases: [
      { id: "base_sintetico", label: "Sintético", value: "Sintético", order: 1, active: true },
      { id: "base_semisintetico", label: "Semisintético", value: "Semisintético", order: 2, active: true },
      { id: "base_mineral", label: "Mineral", value: "Mineral", order: 3, active: true },
    ],
    quantities: [
      { id: "qty_1gal", label: "1 galón", value: "1 galón", unit: "Galón", numericQty: 1, order: 1, active: true },
      { id: "qty_2gal", label: "2 galones", value: "2 galones", unit: "Galón", numericQty: 2, order: 2, active: true },
      { id: "qty_3gal", label: "3 galones", value: "3 galones", unit: "Galón", numericQty: 3, order: 3, active: true },
      { id: "qty_4gal", label: "4 galones", value: "4 galones", unit: "Galón", numericQty: 4, order: 4, active: true },
      { id: "qty_5gal", label: "5 galones", value: "5 galones", unit: "Galón", numericQty: 5, order: 5, active: true },
    ],
    presentations: BASE_PRESENTATIONS,
    viscosities: [
      { id: "visc_0w20", label: "0W-20", value: "0W-20", basePriceRef: 42, order: 1, active: true },
      { id: "visc_5w20", label: "5W-20", value: "5W-20", basePriceRef: 40, order: 2, active: true },
      { id: "visc_5w30", label: "5W-30", value: "5W-30", basePriceRef: 38, order: 3, active: true },
      { id: "visc_5w40", label: "5W-40", value: "5W-40", basePriceRef: 40, order: 4, active: true },
      { id: "visc_10w30", label: "10W-30", value: "10W-30", basePriceRef: 28, order: 5, active: true },
      { id: "visc_10w40", label: "10W-40", value: "10W-40", basePriceRef: 28, order: 6, active: true },
      { id: "visc_15w40", label: "15W-40", value: "15W-40", basePriceRef: 26, order: 7, active: true },
      { id: "visc_20w50", label: "20W-50", value: "20W-50", basePriceRef: 22, order: 8, active: true },
    ],
    specifications: [
      { id: "spec_api_sp", label: "API SP", value: "API SP", order: 1, active: true },
      { id: "spec_api_sn_plus", label: "API SN Plus", value: "API SN Plus", order: 2, active: true },
      { id: "spec_api_ck4", label: "API CK-4", value: "API CK-4", order: 3, active: true },
      { id: "spec_acea_c3", label: "ACEA C3", value: "ACEA C3", order: 4, active: true },
      { id: "spec_acea_a3b4", label: "ACEA A3/B4", value: "ACEA A3/B4", order: 5, active: true },
      { id: "spec_ilsac_gf6a", label: "ILSAC GF-6A", value: "ILSAC GF-6A", order: 6, active: true },
      { id: "spec_dexos1", label: "DEXOS 1 Gen 3", value: "DEXOS 1 Gen 3", order: 7, active: true },
      { id: "spec_vw504", label: "VW 504.00/507.00", value: "VW 504.00/507.00", order: 8, active: true },
      { id: "spec_mb22951", label: "MB 229.51", value: "MB 229.51", order: 9, active: true },
    ],
  },
  transmissionConfig: {
    fluidTypes: [
      { id: "tr_ft_atf", label: "ATF Automática", value: "ATF Automática", order: 1, active: true },
      { id: "tr_ft_cvt", label: "CVT Continua", value: "CVT Continua", order: 2, active: true },
      { id: "tr_ft_dct", label: "DCT / DSG Doble Embrague", value: "DCT / DSG", order: 3, active: true },
      { id: "tr_ft_manual", label: "Transmisión Manual (MTF)", value: "Transmisión Manual", order: 4, active: true },
      { id: "tr_ft_dif", label: "Diferencial Hipoidal", value: "Diferencial", order: 5, active: true },
    ],
    viscosities: [
      { id: "tr_v_75w80", label: "75W-80", value: "75W-80", order: 1, active: true },
      { id: "tr_v_75w90", label: "75W-90", value: "75W-90", order: 2, active: true },
      { id: "tr_v_80w90", label: "80W-90", value: "80W-90", order: 3, active: true },
      { id: "tr_v_85w140", label: "85W-140", value: "85W-140", order: 4, active: true },
      { id: "tr_v_atf", label: "ATF Baja Viscosidad", value: "ATF Multi", order: 5, active: true },
    ],
    specifications: [
      { id: "tr_sp_dex6", label: "Dexron VI", value: "Dexron VI", order: 1, active: true },
      { id: "tr_sp_dex3", label: "Dexron III / Mercon", value: "Dexron III", order: 2, active: true },
      { id: "tr_sp_merconlv", label: "Mercon LV / V", value: "Mercon LV", order: 3, active: true },
      { id: "tr_sp_cvtf", label: "CVTF NS-2 / NS-3 / TC", value: "CVTF Multi", order: 4, active: true },
      { id: "tr_sp_gl4", label: "API GL-4", value: "API GL-4", order: 5, active: true },
      { id: "tr_sp_gl5", label: "API GL-5 / LSD", value: "API GL-5", order: 6, active: true },
    ],
    presentations: BASE_PRESENTATIONS,
  },
  filtersConfig: {
    filterTypes: [
      { id: "fil_t_blindado", label: "Blindado (Spin-on)", value: "Blindado (Spin-on)", order: 1, active: true },
      { id: "fil_t_elemento", label: "Cartucho / Elemento", value: "Cartucho / Elemento", order: 2, active: true },
      { id: "fil_t_panel", label: "Panel Plano", value: "Panel Plano", order: 3, active: true },
      { id: "fil_t_cilindrico", label: "Cilíndrico / Radial", value: "Cilíndrico", order: 4, active: true },
      { id: "fil_t_carbon", label: "Cabina Carbón Activado", value: "Carbón Activado", order: 5, active: true },
      { id: "fil_t_linea", label: "Gasolina en Línea", value: "En Línea", order: 6, active: true },
      { id: "fil_t_diesel", label: "Trampa Separador Diésel", value: "Separador Diésel", order: 7, active: true },
      { id: "fil_t_caja", label: "Kit Filtro Transmisión", value: "Kit Transmisión", order: 8, active: true },
    ],
    applications: [
      { id: "fil_app_liviano", label: "Autos y SUV Gasolina", value: "Autos y SUV Gasolina", order: 1, active: true },
      { id: "fil_app_pickup", label: "Camionetas y 4x4 Diésel", value: "Camionetas y 4x4 Diésel", order: 2, active: true },
      { id: "fil_app_pesado", label: "Transporte / Heavy Duty", value: "Heavy Duty", order: 3, active: true },
      { id: "fil_app_universal", label: "Multimarca / Asiáticos / Americanos", value: "Multimarca", order: 4, active: true },
    ],
  },
  fluidsConfig: {
    fluidClasses: [
      { id: "flu_c_oat50", label: "Refrigerante Orgánico 50/50", value: "Refrigerante 50/50", order: 1, active: true },
      { id: "flu_c_conc", label: "Refrigerante Concentrado 97%", value: "Refrigerante Concentrado", order: 2, active: true },
      { id: "flu_c_dot4", label: "Líquido de Frenos DOT 4", value: "DOT 4", order: 3, active: true },
      { id: "flu_c_dot3", label: "Líquido de Frenos DOT 3", value: "DOT 3", order: 4, active: true },
      { id: "flu_c_dot51", label: "Líquido de Frenos DOT 5.1", value: "DOT 5.1", order: 5, active: true },
      { id: "flu_c_psf", label: "Dirección Hidráulica PSF", value: "Dirección Hidráulica", order: 6, active: true },
      { id: "flu_c_parabrisas", label: "Limpiaparabrisas Desengrasante", value: "Limpiaparabrisas", order: 7, active: true },
      { id: "flu_c_agua", label: "Agua Desmineralizada / Baterías", value: "Agua Desmineralizada", order: 8, active: true },
    ],
    specifications: [
      { id: "flu_sp_astm3306", label: "ASTM D3306 / G12+", value: "ASTM D3306", order: 1, active: true },
      { id: "flu_sp_fmvss116", label: "FMVSS 116 / ISO 4925", value: "FMVSS 116", order: 2, active: true },
      { id: "flu_sp_longlife", label: "Long Life 150,000 KM", value: "Long Life", order: 3, active: true },
    ],
    presentations: BASE_PRESENTATIONS,
  },
  batteriesConfig: {
    voltages: [
      { id: "bat_v_12", label: "12V", value: "12V", order: 1, active: true },
      { id: "bat_v_24", label: "24V", value: "24V", order: 2, active: true },
    ],
    capacities: [
      { id: "bat_cap_42", label: "42Ah / 400 CCA", value: "42Ah / 400 CCA", order: 1, active: true },
      { id: "bat_cap_45", label: "45Ah / 450 CCA", value: "45Ah / 450 CCA", order: 2, active: true },
      { id: "bat_cap_60", label: "60Ah / 550 CCA", value: "60Ah / 550 CCA", order: 3, active: true },
      { id: "bat_cap_75", label: "75Ah / 680 CCA", value: "75Ah / 680 CCA", order: 4, active: true },
      { id: "bat_cap_90", label: "90Ah / 800 CCA", value: "90Ah / 800 CCA", order: 5, active: true },
      { id: "bat_cap_100", label: "100Ah / 900 CCA", value: "100Ah / 900 CCA", order: 6, active: true },
    ],
    technologies: [
      { id: "bat_tec_conv", label: "Convencional Libre Mant.", value: "Convencional", order: 1, active: true },
      { id: "bat_tec_agm", label: "AGM (Absorbent Glass Mat)", value: "AGM", order: 2, active: true },
      { id: "bat_tec_efb", label: "EFB (Enhanced Flooded)", value: "EFB", order: 3, active: true },
      { id: "bat_tec_ss", label: "Start-Stop Alta Ciclabilidad", value: "Start-Stop", order: 4, active: true },
    ],
    dimensionGroups: [
      { id: "bat_dim_ns40", label: "Grupo NS40 / 42 (11 Placas)", value: "Grupo NS40 / 42", order: 1, active: true },
      { id: "bat_dim_47", label: "Grupo 47 / H5 (13 Placas)", value: "Grupo 47 / H5", order: 2, active: true },
      { id: "bat_dim_48", label: "Grupo 48 / H6 (15 Placas)", value: "Grupo 48 / H6", order: 3, active: true },
      { id: "bat_dim_49", label: "Grupo 49 / H8 / N70 (17 Placas)", value: "Grupo 49 / H8", order: 4, active: true },
      { id: "bat_dim_35", label: "Grupo 35 / Asiáticos", value: "Grupo 35", order: 5, active: true },
    ],
    polarities: [
      { id: "bat_pol_izq", label: "Positivo Izquierdo (+ -)", value: "Positivo Izquierdo (+ -)", order: 1, active: true },
      { id: "bat_pol_der", label: "Positivo Derecho (- +)", value: "Positivo Derecho (- +)", order: 2, active: true },
      { id: "bat_pol_lat", label: "Bornes Laterales / Dual", value: "Bornes Laterales", order: 3, active: true },
    ],
  },
  additivesConfig: {
    productTypes: [
      { id: "adt_pt_antifric", label: "Antifricción / Cerámico Motor", value: "Antifricción Motor", order: 1, active: true },
      { id: "adt_pt_inyectores", label: "Limpiador de Inyectores", value: "Limpiador de Inyectores", order: 2, active: true },
      { id: "adt_pt_flush", label: "Engine Flush (Lavado Interno)", value: "Engine Flush", order: 3, active: true },
      { id: "adt_pt_humo", label: "Sellador / Anti-Humo / Compresión", value: "Anti-Humo", order: 4, active: true },
      { id: "adt_pt_octano", label: "Elevador de Octanaje / Cetano", value: "Elevador de Octanaje", order: 5, active: true },
    ],
    applications: [
      { id: "adt_app_aceite", label: "Cárter de Aceite Motor", value: "Aceite de Motor", order: 1, active: true },
      { id: "adt_app_gasolina", label: "Tanque Gasolina / Inyección", value: "Sistema Gasolina", order: 2, active: true },
      { id: "adt_app_diesel", label: "Tanque Diésel / Common Rail", value: "Sistema Diésel", order: 3, active: true },
      { id: "adt_app_pre_cambio", label: "Pre-cambio de Aceite (10 min)", value: "Pre-cambio", order: 4, active: true },
    ],
    presentations: BASE_PRESENTATIONS,
  },
  greasesConfig: {
    greaseTypes: [
      { id: "gr_t_litio", label: "Grasa de Litio Multipropósito", value: "Litio Multipropósito", order: 1, active: true },
      { id: "gr_t_complejo", label: "Complejo de Litio Alta Temp.", value: "Complejo de Litio", order: 2, active: true },
      { id: "gr_t_mos2", label: "Bisulfuro de Molibdeno (MoS2)", value: "Molibdeno MoS2", order: 3, active: true },
      { id: "gr_t_sintetica", label: "Grasa Sintética Caliper / Frenos", value: "Sintética", order: 4, active: true },
      { id: "gr_t_grafito", label: "Grasa Grafitada Chasis", value: "Grafitada", order: 5, active: true },
    ],
    specifications: [
      { id: "gr_sp_nlgi2", label: "NLGI 2 EP-2", value: "NLGI 2", order: 1, active: true },
      { id: "gr_sp_nlgi3", label: "NLGI 3 Rodamientos", value: "NLGI 3", order: 2, active: true },
      { id: "gr_sp_gc_lb", label: "NLGI GC-LB (Chasis y Ruedas)", value: "NLGI GC-LB", order: 3, active: true },
    ],
    applications: [
      { id: "gr_app_rodamientos", label: "Rodamientos y Cubos de Rueda", value: "Rodamientos", order: 1, active: true },
      { id: "gr_app_chasis", label: "Chasis, Rótulas y Terminales", value: "Chasis y Rótulas", order: 2, active: true },
      { id: "gr_app_crucetas", label: "Crucetas, Cardán y Homocinéticas", value: "Crucetas y Homocinéticas", order: 3, active: true },
    ],
    presentations: BASE_PRESENTATIONS,
  },
};

function normalizeLubricentroConfig(raw: any): LubricentroConfigData {
  const merged = { ...DEFAULT_LUBRICENTRO_CONFIG, ...(raw || {}) };
  const singleWordSubMap: Record<string, string> = {
    "Aceite de motor": "Aceite",
    "Flush / Limpiadores": "Flush",
    "Flush o limpiadores internos": "Flush",
    "Grasas lubricantes": "Grasa",
    "Transmisión manual": "Manual",
    "Filtro de aceite": "Aceite",
    "Aire de motor": "Aire",
    "Aire de cabina": "Cabina",
    "Líquido de frenos": "Frenos",
    "Dirección hidráulica": "Hidráulico",
    "Limpiaparabrisas": "Parabrisas",
    "Otros fluidos": "Otros",
  };
  const subcategories = (Array.isArray(merged.subcategories)
    ? merged.subcategories
    : DEFAULT_LUBRICENTRO_CONFIG.subcategories
  ).map((sub: LubSubcategoryItem) => ({
    ...sub,
    label: singleWordSubMap[sub.label] || sub.label,
  }));

  const qtyMap: Record<string, string> = {
    "1 galón": "1 Gal",
    "2 galones": "2 Gal",
    "3 galones": "3 Gal",
    "4 galones": "4 Gal",
    "5 galones": "5 Gal",
  };
  const rawQuantities = (raw?.oilConfig?.quantities || raw?.quantities || DEFAULT_LUBRICENTRO_CONFIG.oilConfig.quantities) as LubOptionItem[];
  const normalizedQuantities = Array.isArray(rawQuantities)
    ? rawQuantities.map((q) => ({ ...q, label: qtyMap[q.label] || q.label }))
    : DEFAULT_LUBRICENTRO_CONFIG.oilConfig.quantities;

  return {
    ...merged,
    subcategories,
    oilConfig: {
      bases: raw?.oilConfig?.bases || raw?.bases || DEFAULT_LUBRICENTRO_CONFIG.oilConfig.bases,
      quantities: normalizedQuantities,
      presentations: raw?.oilConfig?.presentations || raw?.presentations || DEFAULT_LUBRICENTRO_CONFIG.oilConfig.presentations,
      viscosities: raw?.oilConfig?.viscosities || raw?.viscosities || DEFAULT_LUBRICENTRO_CONFIG.oilConfig.viscosities,
      specifications: raw?.oilConfig?.specifications || raw?.specifications || DEFAULT_LUBRICENTRO_CONFIG.oilConfig.specifications,
    },
    transmissionConfig: {
      ...DEFAULT_LUBRICENTRO_CONFIG.transmissionConfig,
      ...(raw?.categoryOptions?.transmision || {}),
      ...(raw?.transmissionConfig || {}),
    },
    filtersConfig: {
      ...DEFAULT_LUBRICENTRO_CONFIG.filtersConfig,
      ...(raw?.categoryOptions?.filtros || {}),
      ...(raw?.filtersConfig || {}),
    },
    fluidsConfig: {
      ...DEFAULT_LUBRICENTRO_CONFIG.fluidsConfig,
      ...(raw?.categoryOptions?.fluidos || {}),
      ...(raw?.fluidsConfig || {}),
    },
    batteriesConfig: {
      ...DEFAULT_LUBRICENTRO_CONFIG.batteriesConfig,
      ...(raw?.categoryOptions?.baterias || {}),
      ...(raw?.batteriesConfig || {}),
      dimensionGroups:
        raw?.batteriesConfig?.dimensionGroups ||
        raw?.categoryOptions?.baterias?.dimensions ||
        DEFAULT_LUBRICENTRO_CONFIG.batteriesConfig.dimensionGroups,
    },
    additivesConfig: {
      ...DEFAULT_LUBRICENTRO_CONFIG.additivesConfig,
      ...(raw?.categoryOptions?.aditivos || {}),
      ...(raw?.additivesConfig || {}),
    },
    greasesConfig: {
      ...DEFAULT_LUBRICENTRO_CONFIG.greasesConfig,
      ...(raw?.categoryOptions?.grasas || {}),
      ...(raw?.greasesConfig || {}),
    },
  };
}

const INITIAL_LUBRICENTRO_PRODUCTS: Array<{
  code: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  location: string;
  meta: Omit<LubProductMeta, "productId" | "code">;
}> = [
  {
    code: "LUB-ACE-0W20-SINT",
    name: "Aceite Motor 0W-20 Full Sintético",
    brand: "Mobil 1",
    category: "Lubricantes",
    price: 44.0,
    costPrice: 31.0,
    stock: 24,
    minStock: 5,
    location: "Estante A-1",
    meta: {
      lubCategoryId: "lub_aceite",
      lubSubcategoryId: "lub_aceite_motor",
      manufacturerCode: "MOB-0W20-SP-4L",
      description: "Lubricante 100% sintético avanzado para motores modernos e híbridos.",
      lubricantBase: "Sintético",
      viscosity: "0W-20",
      specifications: ["API SP", "ILSAC GF-6A", "DEXOS 1 Gen 3"],
      presentation: "1 galón",
      unitOfMeasure: "Galón",
      presentationsAvailable: [
        { id: "pv_0w20_1gal", label: "1 galón", unitOfMeasure: "Galón", price: 44.0, stock: 24, skuSuffix: "GAL" },
        { id: "pv_0w20_1l", label: "1 litro", unitOfMeasure: "Litro", price: 12.5, stock: 36, skuSuffix: "1L" },
      ],
      active: true,
      compatibilities: [
        { id: "c1", brand: "Toyota", model: "Corolla", yearFrom: 2016, yearTo: 2026, engine: "1.8L / 2.0L", verified: true },
        { id: "c2", brand: "Mazda", model: "CX-5", yearFrom: 2017, yearTo: 2026, engine: "2.0L / 2.5L SkyActiv", verified: true },
      ],
    },
  },
  {
    code: "LUB-ACE-5W30-SINT",
    name: "Aceite Motor 5W-30 Full Sintético",
    brand: "Castrol",
    category: "Lubricantes",
    price: 38.0,
    costPrice: 26.5,
    stock: 30,
    minStock: 6,
    location: "Estante A-1",
    meta: {
      lubCategoryId: "lub_aceite",
      lubSubcategoryId: "lub_aceite_motor",
      manufacturerCode: "CAS-EDGE-5W30-4L",
      description: "Protección sintética con tecnología Fluid Titanium para motores turbo y multipunto.",
      lubricantBase: "Sintético",
      viscosity: "5W-30",
      specifications: ["API SP", "ACEA C3", "DEXOS 1 Gen 3"],
      presentation: "1 galón",
      unitOfMeasure: "Galón",
      presentationsAvailable: [
        { id: "pv_5w30_1gal", label: "1 galón", unitOfMeasure: "Galón", price: 38.0, stock: 30, skuSuffix: "GAL" },
        { id: "pv_5w30_1qt", label: "1 cuarto (Qt)", unitOfMeasure: "Cuarto", price: 10.5, stock: 40, skuSuffix: "QT" },
      ],
      active: true,
      compatibilities: [
        { id: "c3", brand: "Chevrolet", model: "Tracker", yearFrom: 2018, yearTo: 2026, engine: "1.2L Turbo / 1.8L", verified: true },
        { id: "c4", brand: "Kia", model: "Sportage", yearFrom: 2016, yearTo: 2026, engine: "2.0L MPI", verified: true },
      ],
    },
  },
  {
    code: "LUB-ACE-10W30-SEMI",
    name: "Aceite Motor 10W-30 Semisintético",
    brand: "Shell Helix",
    category: "Lubricantes",
    price: 28.0,
    costPrice: 19.5,
    stock: 35,
    minStock: 6,
    location: "Estante A-2",
    meta: {
      lubCategoryId: "lub_aceite",
      lubSubcategoryId: "lub_aceite_motor",
      manufacturerCode: "SH-HX7-10W30",
      description: "Tecnología sintética limpiadora activa que evita formación de lodos.",
      lubricantBase: "Semisintético",
      viscosity: "10W-30",
      specifications: ["API SP", "ILSAC GF-6A"],
      presentation: "1 galón",
      unitOfMeasure: "Galón",
      presentationsAvailable: [
        { id: "pv_10w30_1gal", label: "1 galón", unitOfMeasure: "Galón", price: 28.0, stock: 35, skuSuffix: "GAL" },
        { id: "pv_10w30_1l", label: "1 litro", unitOfMeasure: "Litro", price: 8.0, stock: 45, skuSuffix: "1L" },
      ],
      active: true,
      compatibilities: [
        { id: "c5", brand: "Hyundai", model: "Accent", yearFrom: 2012, yearTo: 2024, engine: "1.4L / 1.6L", verified: true },
        { id: "c6", brand: "Chevrolet", model: "Sail", yearFrom: 2014, yearTo: 2024, engine: "1.4L / 1.5L", verified: true },
      ],
    },
  },
  {
    code: "LUB-ACE-10W40-SEMI",
    name: "Aceite Motor 10W-40 Semisintético",
    brand: "Liqui Moly",
    category: "Lubricantes",
    price: 32.0,
    costPrice: 22.0,
    stock: 20,
    minStock: 5,
    location: "Estante A-2",
    meta: {
      lubCategoryId: "lub_aceite",
      lubSubcategoryId: "lub_aceite_motor",
      manufacturerCode: "LM-MOS2-10W40",
      description: "Semisintético de alto kilometraje con antifricción para máxima protección.",
      lubricantBase: "Semisintético",
      viscosity: "10W-40",
      specifications: ["API SN Plus", "ACEA A3/B4"],
      presentation: "4 litros",
      unitOfMeasure: "Galón / 4L",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-ACE-15W40-DSL",
    name: "Aceite Motor 15W-40 Heavy Duty Diésel / Gasolina",
    brand: "Valvoline",
    category: "Lubricantes",
    price: 26.0,
    costPrice: 18.0,
    stock: 28,
    minStock: 5,
    location: "Estante A-3",
    meta: {
      lubCategoryId: "lub_aceite",
      lubSubcategoryId: "lub_aceite_motor",
      manufacturerCode: "VAL-ALLFLEET-15W40",
      description: "Especial para camionetas 4x4, turbo diésel y trabajo pesado.",
      lubricantBase: "Mineral",
      viscosity: "15W-40",
      specifications: ["API CK-4", "API SN Plus"],
      presentation: "1 galón",
      unitOfMeasure: "Galón",
      active: true,
      compatibilities: [
        { id: "c7", brand: "Chevrolet", model: "D-Max", yearFrom: 2010, yearTo: 2025, engine: "2.5L / 3.0L CRDI Diésel", verified: true },
        { id: "c8", brand: "Toyota", model: "Hilux", yearFrom: 2010, yearTo: 2025, engine: "2.4L / 2.8L GD Diésel", verified: true },
      ],
    },
  },
  {
    code: "LUB-ACE-20W50-MIN",
    name: "Aceite Motor 20W-50 Alto Kilometraje",
    brand: "Havoline",
    category: "Lubricantes",
    price: 22.0,
    costPrice: 15.0,
    stock: 32,
    minStock: 6,
    location: "Estante A-3",
    meta: {
      lubCategoryId: "lub_aceite",
      lubSubcategoryId: "lub_aceite_motor",
      manufacturerCode: "HAV-20W50-GAL",
      description: "Mineral premium con selladores de empaques para motores con recorrido.",
      lubricantBase: "Mineral",
      viscosity: "20W-50",
      specifications: ["API SP"],
      presentation: "1 galón",
      unitOfMeasure: "Galón",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-ADT-CERATEC",
    name: "Aditivo Antifricción Cerámico Cera Tec",
    brand: "Liqui Moly",
    category: "Lubricantes",
    price: 24.0,
    costPrice: 16.5,
    stock: 15,
    minStock: 4,
    location: "Vitrina B-1",
    meta: {
      lubCategoryId: "lub_aceite",
      lubSubcategoryId: "lub_aditivos",
      manufacturerCode: "LM-3721",
      description: "Protección microcerámica que reduce fricción y desgaste hasta por 50,000 km.",
      presentation: "350 ml",
      unitOfMeasure: "Frasco",
      additiveProductType: "Antifricción Motor",
      additiveApplication: "Aceite de Motor",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-FLUSH-PRO",
    name: "Engine Flush Lavado Interno de Motor",
    brand: "Liqui Moly",
    category: "Lubricantes",
    price: 12.0,
    costPrice: 8.0,
    stock: 20,
    minStock: 5,
    location: "Vitrina B-1",
    meta: {
      lubCategoryId: "lub_aceite",
      lubSubcategoryId: "lub_flush",
      manufacturerCode: "LM-2657",
      description: "Disuelve lodos, barnices y carbón acumulado antes del cambio de aceite.",
      presentation: "350 ml",
      unitOfMeasure: "Frasco",
      additiveProductType: "Engine Flush",
      additiveApplication: "Pre-cambio",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-GRAS-EP2",
    name: "Grasa Complejo de Litio Azul EP-2 Alta Temp.",
    brand: "Mobil 1",
    category: "Lubricantes",
    price: 9.5,
    costPrice: 6.0,
    stock: 18,
    minStock: 4,
    location: "Estante B-2",
    meta: {
      lubCategoryId: "lub_aceite",
      lubSubcategoryId: "lub_grasa",
      manufacturerCode: "MOB-XHP-222",
      description: "Grasa de extrema presión para rodamientos, cubos de rueda, crucetas y chasis.",
      presentation: "Cartucho 400g",
      unitOfMeasure: "Cartucho",
      greaseType: "Complejo de Litio",
      specifications: ["NLGI 2", "NLGI GC-LB"],
      greaseApplication: "Rodamientos",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-TR-ATF-DEX6",
    name: "Fluido Transmisión Automática ATF Dexron VI Sintético",
    brand: "Valvoline",
    category: "Lubricantes",
    price: 14.5,
    costPrice: 9.8,
    stock: 36,
    minStock: 8,
    location: "Estante C-1",
    meta: {
      lubCategoryId: "lub_transmision",
      lubSubcategoryId: "lub_trans_automatica",
      manufacturerCode: "VAL-ATF-DEX6-QT",
      description: "Fluido 100% sintético para cajas automáticas modernas de 6, 8 y 10 velocidades.",
      fluidType: "ATF Automática",
      viscosity: "ATF Multi",
      specifications: ["Dexron VI", "Mercon LV"],
      presentation: "1 cuarto (Qt)",
      unitOfMeasure: "Cuarto",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-TR-CVT-SINT",
    name: "Fluido Transmisión CVT Full Sintético",
    brand: "Motul",
    category: "Lubricantes",
    price: 19.0,
    costPrice: 13.0,
    stock: 22,
    minStock: 6,
    location: "Estante C-1",
    meta: {
      lubCategoryId: "lub_transmision",
      lubSubcategoryId: "lub_trans_cvt",
      manufacturerCode: "MOT-CVTF-1L",
      description: "Fluido sintético de alta fricción para cajas CVT de poleas y cadena metálica.",
      fluidType: "CVT Continua",
      viscosity: "ATF Multi",
      specifications: ["CVTF Multi"],
      presentation: "1 litro",
      unitOfMeasure: "Litro",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-TR-MAN-75W90",
    name: "Valvulina Caja Manual y Diferencial 75W-90 Sintética",
    brand: "Castrol",
    category: "Lubricantes",
    price: 16.0,
    costPrice: 11.0,
    stock: 25,
    minStock: 5,
    location: "Estante C-2",
    meta: {
      lubCategoryId: "lub_transmision",
      lubSubcategoryId: "lub_trans_manual",
      manufacturerCode: "CAS-SYNTRANS-75W90",
      description: "Protección de sincronizadores y engranajes bajo carga severa.",
      fluidType: "Transmisión Manual",
      viscosity: "75W-90",
      specifications: ["API GL-4", "API GL-5"],
      presentation: "1 litro",
      unitOfMeasure: "Litro",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-FIL-ACE-W610",
    name: "Filtro de Aceite Blindado W 610/3",
    brand: "Mann-Filter",
    category: "Filtros",
    price: 9.5,
    costPrice: 5.8,
    stock: 40,
    minStock: 10,
    location: "Estante D-1",
    meta: {
      lubCategoryId: "lub_filtros",
      lubSubcategoryId: "lub_fil_aceite",
      manufacturerCode: "W610/3 / 15208-65F0C",
      description: "Filtro blindado con válvula antirretorno de silicona para retención de presión.",
      filterType: "Blindado (Spin-on)",
      filterApplication: "Autos y SUV Gasolina",
      presentation: "Unidad",
      unitOfMeasure: "Unidad",
      active: true,
      compatibilities: [
        { id: "c9", brand: "Kia", model: "Rio", yearFrom: 2012, yearTo: 2025, engine: "1.4L / 1.6L", verified: true },
        { id: "c10", brand: "Hyundai", model: "Tucson", yearFrom: 2014, yearTo: 2025, engine: "2.0L", verified: true },
      ],
    },
  },
  {
    code: "LUB-FIL-AIR-C24005",
    name: "Filtro de Aire de Motor Panel C 24 005",
    brand: "Mann-Filter",
    category: "Filtros",
    price: 14.0,
    costPrice: 8.5,
    stock: 22,
    minStock: 5,
    location: "Estante D-2",
    meta: {
      lubCategoryId: "lub_filtros",
      lubSubcategoryId: "lub_fil_aire",
      manufacturerCode: "C24005 / 17801-21050",
      description: "Media filtrante de microfibra de alta eficiencia contra polvo fino.",
      filterType: "Panel Plano",
      filterApplication: "Autos y SUV Gasolina",
      presentation: "Unidad",
      unitOfMeasure: "Unidad",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-FIL-CAB-CUK1919",
    name: "Filtro de Cabina A/C con Carbón Activado",
    brand: "Bosch",
    category: "Filtros",
    price: 16.5,
    costPrice: 10.0,
    stock: 18,
    minStock: 5,
    location: "Estante D-3",
    meta: {
      lubCategoryId: "lub_filtros",
      lubSubcategoryId: "lub_fil_cabina",
      manufacturerCode: "0986AF5014",
      description: "Retiene polen, bacterias, polvo y neutraliza gases y malos olores.",
      filterType: "Carbón Activado",
      filterApplication: "Autos y SUV Gasolina",
      presentation: "Unidad",
      unitOfMeasure: "Unidad",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-FLU-COOL-5050",
    name: "Refrigerante Anticongelante Orgánico 50/50 Long Life",
    brand: "Prestone",
    category: "Lubricantes",
    price: 16.0,
    costPrice: 10.5,
    stock: 28,
    minStock: 6,
    location: "Estante E-1",
    meta: {
      lubCategoryId: "lub_fluidos",
      lubSubcategoryId: "lub_flu_coolant",
      manufacturerCode: "AF2100",
      description: "Listo para usar, protege aluminio y radiadores hasta por 150,000 km.",
      fluidClass: "Refrigerante 50/50",
      specifications: ["ASTM D3306", "Long Life"],
      presentation: "1 galón",
      unitOfMeasure: "Galón",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-FLU-DOT4-500",
    name: "Líquido de Frenos Sintético DOT 4 LV",
    brand: "Brembo",
    category: "Lubricantes",
    price: 9.5,
    costPrice: 6.0,
    stock: 30,
    minStock: 6,
    location: "Estante E-2",
    meta: {
      lubCategoryId: "lub_fluidos",
      lubSubcategoryId: "lub_flu_frenos",
      manufacturerCode: "L04005",
      description: "Punto de ebullición seco 265°C, ideal para sistemas con ABS y ESP.",
      fluidClass: "DOT 4",
      specifications: ["FMVSS 116"],
      presentation: "500 ml",
      unitOfMeasure: "Frasco",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-BAT-MOURA-60AH",
    name: "Batería Automotriz 12V 60Ah Libre de Mantenimiento",
    brand: "Moura",
    category: "Baterías",
    price: 95.0,
    costPrice: 68.0,
    stock: 10,
    minStock: 3,
    location: "Bodega Baterías",
    meta: {
      lubCategoryId: "lub_baterias",
      lubSubcategoryId: "lub_bat_convencionales",
      manufacturerCode: "M22GD-60AH",
      description: "Batería sellada con aleación plata-estaño y 18 meses de garantía.",
      voltage: "12V",
      capacityAh: "60Ah / 550 CCA",
      technology: "Convencional",
      dimensionsGroup: "Grupo 47 / H5",
      polarity: "Positivo Derecho (- +)",
      presentation: "Unidad",
      unitOfMeasure: "Unidad",
      active: true,
      compatibilities: [],
    },
  },
  {
    code: "LUB-BAT-BOSCH-AGM70",
    name: "Batería Bosch S6 AGM Start-Stop 12V 75Ah",
    brand: "Bosch",
    category: "Baterías",
    price: 165.0,
    costPrice: 122.0,
    stock: 6,
    minStock: 2,
    location: "Bodega Baterías",
    meta: {
      lubCategoryId: "lub_baterias",
      lubSubcategoryId: "lub_bat_agm",
      manufacturerCode: "0092S60080",
      description: "Tecnología AGM para vehículos con sistema Start-Stop y alta demanda eléctrica.",
      voltage: "12V",
      capacityAh: "75Ah / 680 CCA",
      technology: "AGM",
      dimensionsGroup: "Grupo 48 / H6",
      polarity: "Positivo Derecho (- +)",
      presentation: "Unidad",
      unitOfMeasure: "Unidad",
      active: true,
      compatibilities: [],
    },
  },
];

function calcularEstadoStock(stock: number, minStock: number = 5, active: boolean = true): string {
  if (!active) return "Inactivo";
  if (stock <= 0) return "Agotado";
  if (stock <= minStock) return "Bajo Stock";
  return "En Stock";
}

function inferirSubcategoriaParaProductoExistente(p: any): {
  lubCategoryId: string;
  lubSubcategoryId: string;
  viscosity?: string;
  lubricantBase?: string;
  presentation?: string;
} {
  const txt = `${p.name || ""} ${p.category || ""} ${p.code || ""}`.toLowerCase();
  const viscMatch = (p.name || "").match(/\b(\d{1,2}W-\d{2})\b/i);
  const viscosity = viscMatch ? viscMatch[1].toUpperCase() : undefined;

  let lubricantBase: string | undefined;
  if (txt.includes("semi-sint") || txt.includes("semisint")) lubricantBase = "Semisintético";
  else if (txt.includes("sintético") || txt.includes("sintetico")) lubricantBase = "Sintético";
  else if (txt.includes("mineral")) lubricantBase = "Mineral";

  let presentation: string | undefined;
  if (txt.includes("galón") || txt.includes("galon") || txt.includes("gal")) presentation = "1 galón";
  else if (txt.includes("4l") || txt.includes("4 litros")) presentation = "4 litros";
  else if (txt.includes("1l") || txt.includes("1 litro")) presentation = "1 litro";

  if (txt.includes("batería") || txt.includes("bateria") || txt.includes("agm") || txt.includes("efb")) {
    if (txt.includes("agm")) return { lubCategoryId: "lub_baterias", lubSubcategoryId: "lub_bat_agm" };
    if (txt.includes("efb")) return { lubCategoryId: "lub_baterias", lubSubcategoryId: "lub_bat_efb" };
    if (txt.includes("start")) return { lubCategoryId: "lub_baterias", lubSubcategoryId: "lub_bat_start_stop" };
    return { lubCategoryId: "lub_baterias", lubSubcategoryId: "lub_bat_convencionales" };
  }
  if (txt.includes("filtro")) {
    if (txt.includes("aire") && (txt.includes("cabina") || txt.includes("a/c"))) {
      return { lubCategoryId: "lub_filtros", lubSubcategoryId: "lub_fil_cabina" };
    }
    if (txt.includes("aire")) return { lubCategoryId: "lub_filtros", lubSubcategoryId: "lub_fil_aire" };
    if (txt.includes("combustible") || txt.includes("gasolina") || txt.includes("diésel") || txt.includes("diesel")) {
      return { lubCategoryId: "lub_filtros", lubSubcategoryId: "lub_fil_combustible" };
    }
    if (txt.includes("transmisión") || txt.includes("caja")) {
      return { lubCategoryId: "lub_filtros", lubSubcategoryId: "lub_fil_transmision" };
    }
    return { lubCategoryId: "lub_filtros", lubSubcategoryId: "lub_fil_aceite" };
  }
  if (
    txt.includes("atf") ||
    txt.includes("cvt") ||
    txt.includes("dct") ||
    txt.includes("dsg") ||
    txt.includes("caja manual") ||
    txt.includes("valvulina") ||
    txt.includes("diferencial") ||
    txt.includes("75w") ||
    txt.includes("80w") ||
    txt.includes("85w")
  ) {
    if (txt.includes("cvt")) return { lubCategoryId: "lub_transmision", lubSubcategoryId: "lub_trans_cvt", viscosity };
    if (txt.includes("dct") || txt.includes("dsg")) return { lubCategoryId: "lub_transmision", lubSubcategoryId: "lub_trans_dct", viscosity };
    if (txt.includes("diferencial") || txt.includes("85w")) return { lubCategoryId: "lub_transmision", lubSubcategoryId: "lub_trans_diferencial", viscosity };
    if (txt.includes("manual") || txt.includes("75w") || txt.includes("80w")) {
      return { lubCategoryId: "lub_transmision", lubSubcategoryId: "lub_trans_manual", viscosity };
    }
    return { lubCategoryId: "lub_transmision", lubSubcategoryId: "lub_trans_automatica", viscosity };
  }
  if (
    txt.includes("refrigerante") ||
    txt.includes("coolant") ||
    txt.includes("dot 3") ||
    txt.includes("dot 4") ||
    txt.includes("líquido de freno") ||
    txt.includes("liquido de freno") ||
    txt.includes("hidráulic") ||
    txt.includes("parabrisas")
  ) {
    if (txt.includes("dot") || txt.includes("freno")) return { lubCategoryId: "lub_fluidos", lubSubcategoryId: "lub_flu_frenos", presentation };
    if (txt.includes("hidráulic") || txt.includes("hidraulic")) return { lubCategoryId: "lub_fluidos", lubSubcategoryId: "lub_flu_hidraulico", presentation };
    if (txt.includes("parabrisas")) return { lubCategoryId: "lub_fluidos", lubSubcategoryId: "lub_flu_limpiaparabrisas", presentation };
    return { lubCategoryId: "lub_fluidos", lubSubcategoryId: "lub_flu_coolant", presentation };
  }
  if (txt.includes("flush") || txt.includes("lavado interno")) {
    return { lubCategoryId: "lub_aceite", lubSubcategoryId: "lub_flush", presentation };
  }
  if (txt.includes("aditivo") || txt.includes("antifric") || txt.includes("inyector") || txt.includes("cera tec")) {
    return { lubCategoryId: "lub_aceite", lubSubcategoryId: "lub_aditivos", presentation };
  }
  if (txt.includes("grasa") || txt.includes("litio")) {
    return { lubCategoryId: "lub_aceite", lubSubcategoryId: "lub_grasa", presentation };
  }
  return {
    lubCategoryId: "lub_aceite",
    lubSubcategoryId: "lub_aceite_motor",
    viscosity,
    lubricantBase,
    presentation,
  };
}

async function getOrInitConfigAndMeta() {
  return await withRetry(async () => {
    const [configRow, metaRow] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { id: CONFIG_SETTING_ID } }),
      prisma.systemSetting.findUnique({ where: { id: META_SETTING_ID } }),
    ]);

    let config: LubricentroConfigData = DEFAULT_LUBRICENTRO_CONFIG;
    if (configRow?.configJson) {
      try {
        const parsed = JSON.parse(configRow.configJson);
        config = normalizeLubricentroConfig(parsed);
      } catch {}
    } else {
      await prisma.systemSetting.upsert({
        where: { id: CONFIG_SETTING_ID },
        update: {},
        create: {
          id: CONFIG_SETTING_ID,
          configJson: JSON.stringify(DEFAULT_LUBRICENTRO_CONFIG),
        },
      });
    }

    let metaMap: Record<string, LubProductMeta> = {};
    let seededOnce = false;
    if (metaRow?.configJson) {
      try {
        const parsedMeta = JSON.parse(metaRow.configJson);
        metaMap = parsedMeta.items || {};
        seededOnce = Boolean(parsedMeta.seededOnce);
      } catch {}
    }

    // Sembrar productos iniciales de Lubricentro en prisma.product solo la primera vez de forma aditiva y segura
    if (!seededOnce) {
      for (const item of INITIAL_LUBRICENTRO_PRODUCTS) {
        const existing = await prisma.product.findUnique({
          where: { code: item.code },
        });
        const prod = existing
          ? existing
          : await prisma.product.create({
              data: {
                code: item.code,
                name: item.name,
                brand: item.brand,
                category: item.category,
                price: item.price,
                costPrice: item.costPrice,
                stock: item.stock,
                minStock: item.minStock,
                location: item.location,
                status: calcularEstadoStock(item.stock, item.minStock, true),
              },
            });

        if (!metaMap[prod.id]) {
          metaMap[prod.id] = {
            ...item.meta,
            productId: prod.id,
            code: prod.code,
          };
        }
      }

      await prisma.systemSetting.upsert({
        where: { id: META_SETTING_ID },
        update: {
          configJson: JSON.stringify({ seededOnce: true, items: metaMap }),
        },
        create: {
          id: META_SETTING_ID,
          configJson: JSON.stringify({ seededOnce: true, items: metaMap }),
        },
      });
    }

    const [allProducts, vehicles] = await Promise.all([
      prisma.product.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.vehicle.findMany({
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
    ]);

    // Sincronizar marcas reales de productos existentes hacia config.brands sin duplicar
    const existingBrandNames = new Set(config.brands.map((b) => b.name.toLowerCase()));
    let brandsUpdated = false;
    allProducts.forEach((p) => {
      if (p.brand && p.brand.trim() && !existingBrandNames.has(p.brand.trim().toLowerCase())) {
        existingBrandNames.add(p.brand.trim().toLowerCase());
        config.brands.push({
          id: `br_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: p.brand.trim(),
          active: true,
          order: config.brands.length + 1,
        });
        brandsUpdated = true;
      }
    });

    if (brandsUpdated) {
      await prisma.systemSetting.upsert({
        where: { id: CONFIG_SETTING_ID },
        update: { configJson: JSON.stringify(config) },
        create: { id: CONFIG_SETTING_ID, configJson: JSON.stringify(config) },
      });
    }

    // Construir lista enriquecida de productos de Lubricentro
    const categoriasLubNombres = ["lubricantes", "lubricentro", "aceites", "filtros", "baterías", "baterias", "fluidos", "transmisión", "transmision"];
    const enrichedProducts = allProducts
      .filter((p) => {
        if (metaMap[p.id]) return true;
        const catLow = (p.category || "").toLowerCase();
        const codeLow = (p.code || "").toLowerCase();
        return (
          categoriasLubNombres.some((c) => catLow.includes(c)) ||
          codeLow.startsWith("lub-") ||
          codeLow.startsWith("flt-") ||
          codeLow.startsWith("bat-")
        );
      })
      .map((p) => {
        const existingMeta = metaMap[p.id];
        const inferred = existingMeta || inferirSubcategoriaParaProductoExistente(p);
        const active =
          existingMeta?.active !== undefined
            ? existingMeta.active
            : p.status !== "Inactivo";

        return {
          id: p.id,
          code: p.code,
          name: p.name,
          brand: p.brand || "",
          category: p.category,
          price: Number(p.price),
          costPrice: p.costPrice !== null && p.costPrice !== undefined ? Number(p.costPrice) : null,
          stock: Number(p.stock),
          minStock: Number(p.minStock || 5),
          location: p.location || "",
          imageUrl: p.imageUrl || null,
          status: calcularEstadoStock(Number(p.stock), Number(p.minStock || 5), active),
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          // Metadatos enriquecidos de Lubricentro
          lubCategoryId: existingMeta?.lubCategoryId || inferred.lubCategoryId,
          lubSubcategoryId: existingMeta?.lubSubcategoryId || inferred.lubSubcategoryId,
          manufacturerCode: existingMeta?.manufacturerCode || "",
          description: existingMeta?.description || "",
          lubricantBase: existingMeta?.lubricantBase || inferred.lubricantBase || "",
          viscosity: existingMeta?.viscosity || inferred.viscosity || "",
          specifications: existingMeta?.specifications || [],
          presentation: existingMeta?.presentation || inferred.presentation || "Unidad",
          unitOfMeasure: existingMeta?.unitOfMeasure || "Unidad",
          presentationsAvailable: existingMeta?.presentationsAvailable || [],
          galleryUrls: existingMeta?.galleryUrls || (p.imageUrl ? [p.imageUrl] : []),
          active,
          compatibilities: existingMeta?.compatibilities || [],
          fluidType: existingMeta?.fluidType || "",
          filterType: existingMeta?.filterType || "",
          filterApplication: existingMeta?.filterApplication || "",
          fluidClass: existingMeta?.fluidClass || "",
          voltage: existingMeta?.voltage || "",
          capacityAh: existingMeta?.capacityAh || "",
          technology: existingMeta?.technology || "",
          dimensionsGroup: existingMeta?.dimensionsGroup || "",
          polarity: existingMeta?.polarity || "",
          additiveProductType: existingMeta?.additiveProductType || "",
          additiveApplication: existingMeta?.additiveApplication || "",
          greaseType: existingMeta?.greaseType || "",
          greaseApplication: existingMeta?.greaseApplication || "",
          customAttributes: existingMeta?.customAttributes || {},
        };
      });

    return {
      config,
      metaMap,
      products: enrichedProducts,
      vehicles: vehicles.map((v) => ({
        id: v.id,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        fuelType: v.fuelType,
        vehicleType: v.vehicleType,
      })),
    };
  });
}

// Caché en memoria en el servidor para respuestas instantáneas (< 2ms)
let serverLubricentroCache: {
  config: any;
  products: any[];
  vehicles: any[];
  timestamp: number;
} | null = null;

export function invalidateServerLubricentroCache() {
  serverLubricentroCache = null;
}

// GET: Obtener toda la configuración manual de Lubricentro, productos reales y vehículos registrados
export async function GET() {
  try {
    const now = Date.now();
    // Cache de 10 minutos (invalida al guardar en PUT/POST/DELETE)
    if (serverLubricentroCache && now - serverLubricentroCache.timestamp < 600000) {
      return NextResponse.json({
        success: true,
        config: serverLubricentroCache.config,
        products: serverLubricentroCache.products,
        vehicles: serverLubricentroCache.vehicles,
      });
    }

    const data = await getOrInitConfigAndMeta();
    serverLubricentroCache = {
      config: data.config,
      products: data.products,
      vehicles: data.vehicles,
      timestamp: now,
    };

    return NextResponse.json({
      success: true,
      config: data.config,
      products: data.products,
      vehicles: data.vehicles,
    });
  } catch (error: any) {
    console.error("Error en GET /api/taller/lubricentro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al cargar datos de Lubricentro" },
      { status: 500 }
    );
  }
}

// PUT: Guardar cambios en la configuración manual (categorías, subcategorías, viscosidades, bases, cantidades, presentaciones, marcas, especificaciones, opciones por categoría)
export async function PUT(req: NextRequest) {
  serverLubricentroCache = null;
  try {
    const body = await req.json();
    const { config: incomingConfig, checkDeleteCategoryId, checkDeleteSubcategoryId } = body;

    const current = await getOrInitConfigAndMeta();

    // Validación de integridad al intentar eliminar una categoría o subcategoría
    if (checkDeleteCategoryId) {
      const hasSubcats = current.config.subcategories.some(
        (s) => s.categoryId === checkDeleteCategoryId
      );
      const hasProducts = current.products.some(
        (p) => p.lubCategoryId === checkDeleteCategoryId
      );
      if (hasSubcats || hasProducts) {
        return NextResponse.json(
          {
            success: false,
            hasDependencies: true,
            error:
              "Esta categoría tiene subcategorías o productos vinculados. Desactívala en lugar de eliminarla para conservar la integridad del catálogo.",
          },
          { status: 409 }
        );
      }
    }

    if (checkDeleteSubcategoryId) {
      const hasProducts = current.products.some(
        (p) => p.lubSubcategoryId === checkDeleteSubcategoryId
      );
      if (hasProducts) {
        return NextResponse.json(
          {
            success: false,
            hasDependencies: true,
            error:
              "Esta subcategoría tiene productos asociados en el catálogo. Puedes desactivarla en lugar de eliminarla.",
          },
          { status: 409 }
        );
      }
    }

    const updatedConfig: LubricentroConfigData = normalizeLubricentroConfig({
      ...current.config,
      ...incomingConfig,
      categoryOptions: {
        ...current.config.categoryOptions,
        ...(incomingConfig?.categoryOptions || {}),
      },
    });

    await withRetry(async () => {
      await prisma.systemSetting.upsert({
        where: { id: CONFIG_SETTING_ID },
        update: { configJson: JSON.stringify(updatedConfig) },
        create: { id: CONFIG_SETTING_ID, configJson: JSON.stringify(updatedConfig) },
      });
    });

    return NextResponse.json({
      success: true,
      config: updatedConfig,
    });
  } catch (error: any) {
    console.error("Error en PUT /api/taller/lubricentro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar configuración de Lubricentro" },
      { status: 500 }
    );
  }
}

// POST: Crear/Editar producto de Lubricentro en Neon o validar precio/stock en el servidor al agregar al carrito/orden
export async function POST(req: NextRequest) {
  serverLubricentroCache = null;
  try {
    const body = await req.json();
    const { action } = body;

    // Acción 1: Validar precio y stock real en el servidor antes de agregar al carrito u orden activa
    if (action === "VALIDAR_Y_AGREGAR_CARRITO") {
      const { productId, code, presentationId, quantity = 1 } = body;
      const qtyReq = Math.max(1, Number(quantity) || 1);

      const current = await getOrInitConfigAndMeta();
      const prod = current.products.find(
        (p) => (productId && p.id === productId) || (code && p.code === code)
      );

      if (!prod) {
        return NextResponse.json(
          { success: false, error: "El producto no existe en la base de datos." },
          { status: 404 }
        );
      }

      if (!prod.active || prod.status === "Inactivo") {
        return NextResponse.json(
          { success: false, error: "Este producto se encuentra inactivo para la venta." },
          { status: 400 }
        );
      }

      // Verificar si se eligió una variante de presentación comercial específica
      let finalPrice = Number(prod.price);
      let availableStock = Number(prod.stock);
      let selectedPresentationLabel = prod.presentation || "Unidad";

      if (presentationId && Array.isArray(prod.presentationsAvailable) && prod.presentationsAvailable.length > 0) {
        const variant = prod.presentationsAvailable.find((v) => v.id === presentationId || v.label === presentationId);
        if (variant) {
          finalPrice = Number(variant.price);
          availableStock = Number(variant.stock);
          selectedPresentationLabel = variant.label;
        }
      }

      if (availableStock <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: `El producto "${prod.name}" (${selectedPresentationLabel}) está agotado en inventario.`,
          },
          { status: 400 }
        );
      }

      if (qtyReq > availableStock) {
        return NextResponse.json(
          {
            success: false,
            error: `Stock insuficiente para "${prod.name}". Disponible: ${availableStock} (${selectedPresentationLabel}).`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        validatedItem: {
          productId: prod.id,
          code: prod.code,
          name: prod.name,
          brand: prod.brand,
          presentation: selectedPresentationLabel,
          unitOfMeasure: prod.unitOfMeasure || "Unidad",
          price: finalPrice,
          quantity: qtyReq,
          qty: qtyReq,
          availableStock,
          imageUrl: prod.imageUrl || null,
          lubCategoryId: prod.lubCategoryId,
          lubSubcategoryId: prod.lubSubcategoryId,
        },
      });
    }

    // Acción 2: Crear o Actualizar Producto Completo en Neon (prisma.product + metadatos técnicos)
    const payload = body.product || body;
    const {
      id,
      code,
      name,
      brand,
      category = "Lubricantes",
      lubCategoryId = "lub_aceite",
      lubSubcategoryId = "lub_aceite_motor",
      manufacturerCode = "",
      description = "",
      lubricantBase = "",
      viscosity = "",
      specifications = [],
      presentation = "Unidad",
      unitOfMeasure = "Unidad",
      presentationsAvailable = [],
      price = 0,
      costPrice,
      stock = 0,
      minStock = 5,
      location = "",
      imageUrl = null,
      galleryUrls = [],
      active = true,
      compatibilities = [],
      fluidType = "",
      filterType = "",
      filterApplication = "",
      fluidClass = "",
      voltage = "",
      capacityAh = "",
      technology = "",
      dimensionsGroup = "",
      polarity = "",
      additiveProductType = "",
      additiveApplication = "",
      greaseType = "",
      greaseApplication = "",
      customAttributes = {},
    } = payload;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre comercial del producto es obligatorio." },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    const rawCode = String(code || "").trim().toUpperCase();
    const finalCode = rawCode || `LUB-${Date.now().toString().slice(-6)}`;
    const numPrice = Math.max(0, Number(price) || 0);
    const numCost =
      costPrice !== undefined && costPrice !== null && String(costPrice).trim() !== ""
        ? Math.max(0, Number(costPrice))
        : null;
    const numStock = Math.max(0, parseInt(String(stock ?? 0), 10) || 0);
    const numMinStock = Math.max(0, parseInt(String(minStock ?? 5), 10) || 5);
    const isActive = Boolean(active);
    const status = calcularEstadoStock(numStock, numMinStock, isActive);
    const primaryImage =
      imageUrl || (Array.isArray(galleryUrls) && galleryUrls.length > 0 ? galleryUrls[0] : null);

    const savedData = await withRetry(async () => {
      let dbProd;
      if (id) {
        dbProd = await prisma.product.update({
          where: { id },
          data: {
            code: finalCode,
            name: cleanName,
            brand: brand ? String(brand).trim() : null,
            category: String(category || "Lubricantes").trim(),
            price: numPrice,
            costPrice: numCost,
            stock: numStock,
            minStock: numMinStock,
            location: location ? String(location).trim() : null,
            imageUrl: primaryImage,
            status,
          },
        });
      } else {
        const duplicate = await prisma.product.findUnique({ where: { code: finalCode } });
        if (duplicate) {
          throw new Error(`Ya existe un producto con el código SKU "${finalCode}".`);
        }
        dbProd = await prisma.product.create({
          data: {
            code: finalCode,
            name: cleanName,
            brand: brand ? String(brand).trim() : null,
            category: String(category || "Lubricantes").trim(),
            price: numPrice,
            costPrice: numCost,
            stock: numStock,
            minStock: numMinStock,
            location: location ? String(location).trim() : null,
            imageUrl: primaryImage,
            status,
          },
        });
      }

      // Actualizar metadatos técnicos en SystemSetting
      const metaRow = await prisma.systemSetting.findUnique({ where: { id: META_SETTING_ID } });
      let metaMap: Record<string, LubProductMeta> = {};
      let seededOnce = true;
      if (metaRow?.configJson) {
        try {
          const parsed = JSON.parse(metaRow.configJson);
          metaMap = parsed.items || {};
          seededOnce = parsed.seededOnce ?? true;
        } catch {}
      }

      const metaEntry: LubProductMeta = {
        productId: dbProd.id,
        code: dbProd.code,
        lubCategoryId,
        lubSubcategoryId,
        manufacturerCode: String(manufacturerCode || "").trim(),
        description: String(description || "").trim(),
        lubricantBase: String(lubricantBase || "").trim(),
        viscosity: String(viscosity || "").trim(),
        specifications: Array.isArray(specifications) ? specifications : [],
        presentation: String(presentation || "Unidad").trim(),
        unitOfMeasure: String(unitOfMeasure || "Unidad").trim(),
        presentationsAvailable: Array.isArray(presentationsAvailable) ? presentationsAvailable : [],
        galleryUrls:
          Array.isArray(galleryUrls) && galleryUrls.length > 0
            ? galleryUrls
            : primaryImage
            ? [primaryImage]
            : [],
        active: isActive,
        compatibilities: Array.isArray(compatibilities) ? compatibilities : [],
        fluidType: String(fluidType || "").trim(),
        filterType: String(filterType || "").trim(),
        filterApplication: String(filterApplication || "").trim(),
        fluidClass: String(fluidClass || "").trim(),
        voltage: String(voltage || "").trim(),
        capacityAh: String(capacityAh || "").trim(),
        technology: String(technology || "").trim(),
        dimensionsGroup: String(dimensionsGroup || "").trim(),
        polarity: String(polarity || "").trim(),
        additiveProductType: String(additiveProductType || "").trim(),
        additiveApplication: String(additiveApplication || "").trim(),
        greaseType: String(greaseType || "").trim(),
        greaseApplication: String(greaseApplication || "").trim(),
        customAttributes: customAttributes || {},
      };

      metaMap[dbProd.id] = metaEntry;

      await prisma.systemSetting.upsert({
        where: { id: META_SETTING_ID },
        update: { configJson: JSON.stringify({ seededOnce, items: metaMap }) },
        create: { id: META_SETTING_ID, configJson: JSON.stringify({ seededOnce, items: metaMap }) },
      });

      return { dbProd, metaEntry };
    });

    const refreshed = await getOrInitConfigAndMeta();
    const product = refreshed.products.find((p) => p.id === savedData.dbProd.id);

    return NextResponse.json({
      success: true,
      product,
      products: refreshed.products,
      config: refreshed.config,
    });
  } catch (error: any) {
    console.error("Error en POST /api/taller/lubricentro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar el producto en Neon" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar categoría, subcategoría o producto si no tiene dependencias/ventas históricas; de lo contrario desactivarlo de forma segura
export async function DELETE(req: NextRequest) {
  serverLubricentroCache = null;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") || "product";
    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });
    }

    if (type === "category" || type === "subcategory") {
      const current = await getOrInitConfigAndMeta();
      if (type === "category") {
        const hasSubcats = current.config.subcategories.some((s) => s.categoryId === id);
        const hasProducts = current.products.some((p) => p.lubCategoryId === id);
        if (hasSubcats || hasProducts) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Esta categoría tiene subcategorías o productos vinculados. Desactívala en lugar de eliminarla para conservar la integridad del catálogo.",
            },
            { status: 409 }
          );
        }
        const updatedConfig = normalizeLubricentroConfig({
          ...current.config,
          categories: current.config.categories.filter((c) => c.id !== id),
        });
        await withRetry(async () => {
          await prisma.systemSetting.upsert({
            where: { id: CONFIG_SETTING_ID },
            update: { configJson: JSON.stringify(updatedConfig) },
            create: { id: CONFIG_SETTING_ID, configJson: JSON.stringify(updatedConfig) },
          });
        });
        return NextResponse.json({ success: true, config: updatedConfig });
      } else {
        const hasProducts = current.products.some((p) => p.lubSubcategoryId === id);
        if (hasProducts) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Esta subcategoría tiene productos asociados en el catálogo. Puedes desactivarla en lugar de eliminarla.",
            },
            { status: 409 }
          );
        }
        const updatedConfig = normalizeLubricentroConfig({
          ...current.config,
          subcategories: current.config.subcategories.filter((s) => s.id !== id),
        });
        await withRetry(async () => {
          await prisma.systemSetting.upsert({
            where: { id: CONFIG_SETTING_ID },
            update: { configJson: JSON.stringify(updatedConfig) },
            create: { id: CONFIG_SETTING_ID, configJson: JSON.stringify(updatedConfig) },
          });
        });
        return NextResponse.json({ success: true, config: updatedConfig });
      }
    }

    const result = await withRetry(async () => {
      const prod = await prisma.product.findUnique({ where: { id } });
      if (!prod) {
        throw new Error("Producto no encontrado");
      }

      // Verificar si está asociado a ventas históricas (SaleItem) u órdenes de taller (WorkshopOrder)
      const [salesCount, ordersWithProduct] = await Promise.all([
        prisma.saleItem.count({
          where: {
            OR: [{ productId: id }, { code: prod.code }],
          },
        }),
        prisma.workshopOrder.count({
          where: {
            OR: [
              { itemsJson: { contains: id } },
              { itemsJson: { contains: prod.code } },
            ],
          },
        }),
      ]);

      const metaRow = await prisma.systemSetting.findUnique({ where: { id: META_SETTING_ID } });
      let metaMap: Record<string, LubProductMeta> = {};
      let seededOnce = true;
      if (metaRow?.configJson) {
        try {
          const parsed = JSON.parse(metaRow.configJson);
          metaMap = parsed.items || {};
          seededOnce = parsed.seededOnce ?? true;
        } catch {}
      }

      if (salesCount > 0 || ordersWithProduct > 0) {
        // Desactivar en lugar de eliminar físicamente para proteger integridad histórica
        await prisma.product.update({
          where: { id },
          data: { status: "Inactivo" },
        });
        if (metaMap[id]) {
          metaMap[id] = { ...metaMap[id], active: false };
          await prisma.systemSetting.upsert({
            where: { id: META_SETTING_ID },
            update: { configJson: JSON.stringify({ seededOnce, items: metaMap }) },
            create: { id: META_SETTING_ID, configJson: JSON.stringify({ seededOnce, items: metaMap }) },
          });
        }
        return {
          deactivatedInstead: true,
          message:
            "El producto está vinculado a ventas u órdenes históricas, por lo que fue desactivado en lugar de eliminarse físicamente.",
        };
      }

      await prisma.product.delete({ where: { id } });
      if (metaMap[id]) {
        delete metaMap[id];
        await prisma.systemSetting.upsert({
          where: { id: META_SETTING_ID },
          update: { configJson: JSON.stringify({ seededOnce, items: metaMap }) },
          create: { id: META_SETTING_ID, configJson: JSON.stringify({ seededOnce, items: metaMap }) },
        });
      }

      return {
        deactivatedInstead: false,
        message: "Producto eliminado correctamente.",
      };
    });

    const refreshed = await getOrInitConfigAndMeta();
    return NextResponse.json({
      success: true,
      ...result,
      products: refreshed.products,
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/taller/lubricentro:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar/desactivar el producto" },
      { status: 500 }
    );
  }
}
