import { NextRequest, NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CARWASH_CONFIG_ID = "carwash_config_v1";
const CARWASH_META_ID = "carwash_services_meta_v1";

export type AvailabilityStatus = "Disponible" | "Alta demanda" | "Sujeto a cupo" | "No disponible";

export interface CarWashCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  shortDescription: string;
  imageUrl: string;
  startingPrice: number | null;
  estimatedMinutes: number | null;
  availability: AvailabilityStatus;
  active: boolean;
  order: number;
}

export interface CarWashSubcategory {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  description?: string;
  active: boolean;
  order: number;
}

export interface CarWashVehicleType {
  id: string;
  name: string;
  code: string;
  icon: string;
  description: string;
  sizeMultiplierHint?: number;
  active: boolean;
  order: number;
}

export interface CarWashPackage {
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
  estimatedMinutes: number;
  applicableVehicleTypes: string[]; // IDs of CarWashVehicleType
  includedProcedures: string[];
  excludedProcedures: string[];
  includedAddonIds: string[]; // IDs of CarWashAddon to avoid double charging
  materialsIncluded: string[];
  conditionsText: string;
  availability: AvailabilityStatus;
  badgeText?: string;
  active: boolean;
  order: number;
}

export interface CarWashAddon {
  id: string;
  code: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number | null;
  promoPrice: number | null;
  priceByVehicleType: Record<string, number>;
  estimatedMinutes: number;
  availability: AvailabilityStatus;
  canBeStandalone: boolean;
  applicableCategoryIds: string[]; // empty = all categories
  applicableVehicleTypes: string[]; // empty = all vehicle types
  active: boolean;
  order: number;
}

export interface CarWashServiceMeta {
  serviceId: string;
  code: string;
  categoryId: string;
  subcategoryId: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl: string;
  galleryUrls: string[];
  promoPrice: number | null;
  priceConfigured: boolean;
  priceByVehicleType: Record<string, number>;
  durationByVehicleType: Record<string, number>;
  applicableVehicleTypes: string[];
  includesList: string[];
  excludesList: string[];
  materialsIncluded: string[];
  associatedAddonIds: string[];
  conditionsText: string;
  availability: AvailabilityStatus;
  order: number;
  active: boolean;
  archived?: boolean;
}

export interface CarWashConfigData {
  categories: CarWashCategory[];
  subcategories: CarWashSubcategory[];
  vehicleTypes: CarWashVehicleType[];
  packages: CarWashPackage[];
  addons: CarWashAddon[];
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  bays: string[];
}

// ============================================================================
// CONFIGURACIÓN INICIAL COMPLETA (12 CATEGORÍAS, 9 TIPOS DE VEHÍCULO, PAQUETES Y ADICIONALES)
// ============================================================================
export const DEFAULT_CARWASH_CONFIG: CarWashConfigData = {
  taxRatePercent: 15,
  pricesIncludeTax: true,
  bays: ["Bahía Lavado 1", "Bahía Lavado 2", "Bahía Detailing Pro", "Bahía Motos & Express"],
  categories: [
    {
      id: "cw_cat_exterior",
      name: "Lavado exterior",
      slug: "lavado-exterior",
      icon: "🚿",
      shortDescription: "Shampoo pH neutro, espuma activa, enjuague a presión y secado con microfibra.",
      imageUrl: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=900&q=80",
      startingPrice: 6,
      estimatedMinutes: 25,
      availability: "Disponible",
      active: true,
      order: 1,
    },
    {
      id: "cw_cat_interior",
      name: "Lavado interior",
      slug: "lavado-interior",
      icon: "🧹",
      shortDescription: "Aspirado profundo de cabina, limpieza de tablero, consola, paneles y cristales.",
      imageUrl: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80",
      startingPrice: 8,
      estimatedMinutes: 30,
      availability: "Disponible",
      active: true,
      order: 2,
    },
    {
      id: "cw_cat_completo",
      name: "Lavado completo",
      slug: "lavado-completo",
      icon: "🌊",
      shortDescription: "Combinación integral de lavado exterior, chasis, aspirado interior y acabado.",
      imageUrl: "https://images.unsplash.com/photo-1552930294-6b595f4c2974?auto=format&fit=crop&w=900&q=80",
      startingPrice: 12,
      estimatedMinutes: 45,
      availability: "Disponible",
      active: true,
      order: 3,
    },
    {
      id: "cw_cat_premium",
      name: "Lavado premium",
      slug: "lavado-premium",
      icon: "👑",
      shortDescription: "Snow Foam denso, descontaminación ligera, cera líquida hidrofóbica y cabina detallada.",
      imageUrl: "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=900&q=80",
      startingPrice: 20,
      estimatedMinutes: 60,
      availability: "Disponible",
      active: true,
      order: 4,
    },
    {
      id: "cw_cat_tapiceria",
      name: "Limpieza de tapicería",
      slug: "limpieza-tapiceria",
      icon: "🛋️",
      shortDescription: "Inyección-extracción en tela o nutrición e hidratación profunda en asientos de cuero.",
      imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
      startingPrice: 35,
      estimatedMinutes: 90,
      availability: "Disponible",
      active: true,
      order: 5,
    },
    {
      id: "cw_cat_detailing",
      name: "Detailing automotriz",
      slug: "detailing-automotriz",
      icon: "💎",
      shortDescription: "Restauración estética minuciosa interior/exterior, corrección de barniz y protección cerámica.",
      imageUrl: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=900&q=80",
      startingPrice: 65,
      estimatedMinutes: 180,
      availability: "Sujeto a cupo",
      active: true,
      order: 6,
    },
    {
      id: "cw_cat_encerado",
      name: "Encerado y pulido",
      slug: "encerado-y-pulido",
      icon: "✨",
      shortDescription: "Encerado carnauba/sintético, brillo espejo y eliminación de microrayones (swirls).",
      imageUrl: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=900&q=80",
      startingPrice: 18,
      estimatedMinutes: 60,
      availability: "Disponible",
      active: true,
      order: 7,
    },
    {
      id: "cw_cat_motor",
      name: "Limpieza de motor",
      slug: "limpieza-de-motor",
      icon: "⚙️",
      shortDescription: "Desengrasado dieléctrico y limpieza al vapor segura para sensores y módulos electrónicos.",
      imageUrl: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80",
      startingPrice: 15,
      estimatedMinutes: 40,
      availability: "Disponible",
      active: true,
      order: 8,
    },
    {
      id: "cw_cat_motos",
      name: "Lavado de motos",
      slug: "lavado-de-motos",
      icon: "🏍️",
      shortDescription: "Lavado técnico a presión controlada, desengrase de transmisión y protección de carenado.",
      imageUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=900&q=80",
      startingPrice: 5,
      estimatedMinutes: 25,
      availability: "Disponible",
      active: true,
      order: 9,
    },
    {
      id: "cw_cat_camionetas",
      name: "Lavado de camionetas y vehículos grandes",
      slug: "lavado-camionetas-grandes",
      icon: "🚙",
      shortDescription: "Servicio especializado para Pickups 4x4, SUVs de 3 filas, furgonetas y vehículos de trabajo.",
      imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=80",
      startingPrice: 16,
      estimatedMinutes: 55,
      availability: "Disponible",
      active: true,
      order: 10,
    },
    {
      id: "cw_cat_desinfeccion",
      name: "Desinfección y eliminación de olores",
      slug: "desinfeccion-y-olores",
      icon: "🌬️",
      shortDescription: "Sanitización con ozono médico, nebulización antibacteriana y neutralización de olores en A/C.",
      imageUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=900&q=80",
      startingPrice: 15,
      estimatedMinutes: 35,
      availability: "Disponible",
      active: true,
      order: 11,
    },
    {
      id: "cw_cat_adicionales",
      name: "Servicios adicionales",
      slug: "servicios-adicionales",
      icon: "➕",
      shortDescription: "Complementos individuales: faros, plásticos, alfombras, maletero, lluvia ácida y más.",
      imageUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
      startingPrice: 5,
      estimatedMinutes: 20,
      availability: "Disponible",
      active: true,
      order: 12,
    },
  ],
  subcategories: [
    { id: "cw_sub_ext_express", categoryId: "cw_cat_exterior", name: "Exterior Express", icon: "🚿", active: true, order: 1 },
    { id: "cw_sub_ext_foam", categoryId: "cw_cat_exterior", name: "Espuma Activa", icon: "🫧", active: true, order: 2 },
    { id: "cw_sub_int_aspirado", categoryId: "cw_cat_interior", name: "Aspirado y Cabina", icon: "🧹", active: true, order: 1 },
    { id: "cw_sub_int_profundo", categoryId: "cw_cat_interior", name: "Interior Detallado", icon: "🧽", active: true, order: 2 },
    { id: "cw_sub_comp_estandar", categoryId: "cw_cat_completo", name: "Completo Estándar", icon: "🌊", active: true, order: 1 },
    { id: "cw_sub_comp_chasis", categoryId: "cw_cat_completo", name: "Completo + Chasis", icon: "🔩", active: true, order: 2 },
    { id: "cw_sub_prem_ejecutivo", categoryId: "cw_cat_premium", name: "Premium Ejecutivo", icon: "👔", active: true, order: 1 },
    { id: "cw_sub_prem_spa", categoryId: "cw_cat_premium", name: "Full Spa", icon: "👑", active: true, order: 2 },
    { id: "cw_sub_tap_tela", categoryId: "cw_cat_tapiceria", name: "Tapicería de Tela", icon: "🛋️", active: true, order: 1 },
    { id: "cw_sub_tap_cuero", categoryId: "cw_cat_tapiceria", name: "Asientos de Cuero", icon: "🧴", active: true, order: 2 },
    { id: "cw_sub_det_int", categoryId: "cw_cat_detailing", name: "Detailing Interior", icon: "💎", active: true, order: 1 },
    { id: "cw_sub_det_ext", categoryId: "cw_cat_detailing", name: "Detailing Exterior / Cerámico", icon: "🛡️", active: true, order: 2 },
    { id: "cw_sub_enc_cera", categoryId: "cw_cat_encerado", name: "Encerado Protector", icon: "✨", active: true, order: 1 },
    { id: "cw_sub_enc_pulido", categoryId: "cw_cat_encerado", name: "Pulido de Pintura", icon: "🌟", active: true, order: 2 },
    { id: "cw_sub_mot_vapor", categoryId: "cw_cat_motor", name: "Motor al Vapor", icon: "⚙️", active: true, order: 1 },
    { id: "cw_sub_mot_diel", categoryId: "cw_cat_motor", name: "Motor Dieléctrico", icon: "🔋", active: true, order: 2 },
    { id: "cw_sub_motos_urb", categoryId: "cw_cat_motos", name: "Motos Urbanas / Scooter", icon: "🛵", active: true, order: 1 },
    { id: "cw_sub_motos_alt", categoryId: "cw_cat_motos", name: "Alta Cilindrada / Touring", icon: "🏍️", active: true, order: 2 },
    { id: "cw_sub_cam_suv", categoryId: "cw_cat_camionetas", name: "SUV y 3 Filas", icon: "🚙", active: true, order: 1 },
    { id: "cw_sub_cam_pickup", categoryId: "cw_cat_camionetas", name: "Pickups 4x4 y Furgonetas", icon: "🛻", active: true, order: 2 },
    { id: "cw_sub_des_ozono", categoryId: "cw_cat_desinfeccion", name: "Cabina con Ozono", icon: "🌬️", active: true, order: 1 },
    { id: "cw_sub_des_ac", categoryId: "cw_cat_desinfeccion", name: "Ductos A/C y Antibacterial", icon: "❄️", active: true, order: 2 },
    { id: "cw_sub_adi_general", categoryId: "cw_cat_adicionales", name: "Complementos Rápidos", icon: "➕", active: true, order: 1 },
  ],
  vehicleTypes: [
    {
      id: "vt_moto",
      name: "Motocicleta",
      code: "MOTO",
      icon: "🏍️",
      description: "Motos lineales, scooters, deportivas y cuadrones",
      active: true,
      order: 1,
    },
    {
      id: "vt_auto_pequeno",
      name: "Automóvil pequeño",
      code: "CITYCAR",
      icon: "🚗",
      description: "City cars y compactos de 2 o 4 puertas (Spark, Picanto, i10)",
      active: true,
      order: 2,
    },
    {
      id: "vt_sedan",
      name: "Sedán",
      code: "SEDAN",
      icon: "🚘",
      description: "Sedanes medianos y ejecutivos de 4 puertas",
      active: true,
      order: 3,
    },
    {
      id: "vt_hatchback",
      name: "Hatchback",
      code: "HATCHBACK",
      icon: "🚙",
      description: "Vehículos compactos y medianos de 5 puertas",
      active: true,
      order: 4,
    },
    {
      id: "vt_suv",
      name: "SUV",
      code: "SUV",
      icon: "🛞",
      description: "Camionetas cerradas familiares de 2 filas (Sportage, Tucson, RAV4)",
      active: true,
      order: 5,
    },
    {
      id: "vt_camioneta",
      name: "Camioneta",
      code: "PICKUP",
      icon: "🛻",
      description: "Pickups cabina simple o doble cabina (Hilux, D-Max, Amarok)",
      active: true,
      order: 6,
    },
    {
      id: "vt_camioneta_grande",
      name: "Camioneta grande",
      code: "SUV_XL",
      icon: "🚐",
      description: "SUVs de 3 filas y Pickups Full-Size (Tahoe, Prado, F-150)",
      active: true,
      order: 7,
    },
    {
      id: "vt_furgoneta",
      name: "Furgoneta",
      code: "VAN",
      icon: "🚌",
      description: "Minivans, furgonetas de pasajeros o carga ligera (H1, Staria, Hiace)",
      active: true,
      order: 8,
    },
    {
      id: "vt_mayor_tamano",
      name: "Vehículo de mayor tamaño",
      code: "HEAVY",
      icon: "🚛",
      description: "Furgones altos, microbuses y vehículos comerciales especiales",
      active: true,
      order: 9,
    },
  ],
  packages: [],
  addons: [],
};

// Servicios individuales iniciales para sembrar en prisma.workshopService la primera vez
const INITIAL_CARWASH_SERVICES: Array<any> = [];

function normalizeCarWashConfig(raw: any): CarWashConfigData {
  if (!raw || typeof raw !== "object") return DEFAULT_CARWASH_CONFIG;
  return {
    taxRatePercent:
      typeof raw.taxRatePercent === "number" ? raw.taxRatePercent : DEFAULT_CARWASH_CONFIG.taxRatePercent,
    pricesIncludeTax:
      typeof raw.pricesIncludeTax === "boolean"
        ? raw.pricesIncludeTax
        : DEFAULT_CARWASH_CONFIG.pricesIncludeTax,
    bays:
      Array.isArray(raw.bays) && raw.bays.length > 0 ? raw.bays : DEFAULT_CARWASH_CONFIG.bays,
    categories:
      Array.isArray(raw.categories) && raw.categories.length > 0
        ? raw.categories
        : DEFAULT_CARWASH_CONFIG.categories,
    subcategories:
      Array.isArray(raw.subcategories) && raw.subcategories.length > 0
        ? raw.subcategories
        : DEFAULT_CARWASH_CONFIG.subcategories,
    vehicleTypes:
      Array.isArray(raw.vehicleTypes) && raw.vehicleTypes.length > 0
        ? raw.vehicleTypes
        : DEFAULT_CARWASH_CONFIG.vehicleTypes,
    packages: Array.isArray(raw.packages) ? raw.packages : [],
    addons: Array.isArray(raw.addons) ? raw.addons : [],
  };
}

// Resuelve el precio aplicable para un servicio o paquete dado un tipo de vehículo
export function resolveServiceOrPackagePrice(
  item: {
    basePrice?: number | null;
    price?: number | null;
    promoPrice?: number | null;
    priceByVehicleType?: Record<string, number>;
    priceConfigured?: boolean;
  },
  vehicleTypeId?: string
): { unitPrice: number | null; originalPrice: number | null; isPromo: boolean; isConfigured: boolean } {
  if (item.priceConfigured === false) {
    return { unitPrice: null, originalPrice: null, isPromo: false, isConfigured: false };
  }

  const byVt =
    vehicleTypeId &&
    item.priceByVehicleType &&
    typeof item.priceByVehicleType[vehicleTypeId] === "number" &&
    item.priceByVehicleType[vehicleTypeId] > 0
      ? Number(item.priceByVehicleType[vehicleTypeId])
      : null;

  const rawBase =
    item.basePrice !== undefined && item.basePrice !== null
      ? Number(item.basePrice)
      : item.price !== undefined && item.price !== null
      ? Number(item.price)
      : null;

  if (byVt !== null) {
    // Si tiene precio promocional menor al base y no hay tarifa específica distinta, o aplicar descuento proporcional
    if (
      item.promoPrice !== null &&
      item.promoPrice !== undefined &&
      Number(item.promoPrice) > 0 &&
      rawBase &&
      Number(item.promoPrice) < rawBase &&
      byVt === rawBase
    ) {
      return {
        unitPrice: Number(item.promoPrice),
        originalPrice: byVt,
        isPromo: true,
        isConfigured: true,
      };
    }
    return {
      unitPrice: byVt,
      originalPrice: byVt,
      isPromo: false,
      isConfigured: true,
    };
  }

  if (rawBase === null || rawBase <= 0) {
    return { unitPrice: null, originalPrice: null, isPromo: false, isConfigured: false };
  }

  if (
    item.promoPrice !== null &&
    item.promoPrice !== undefined &&
    Number(item.promoPrice) > 0 &&
    Number(item.promoPrice) < rawBase
  ) {
    return {
      unitPrice: Number(item.promoPrice),
      originalPrice: rawBase,
      isPromo: true,
      isConfigured: true,
    };
  }

  return {
    unitPrice: rawBase,
    originalPrice: rawBase,
    isPromo: false,
    isConfigured: true,
  };
}

async function getOrInitCarWashData() {
  return await withRetry(async () => {
    const [configRow, metaRow] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { id: CARWASH_CONFIG_ID } }),
      prisma.systemSetting.findUnique({ where: { id: CARWASH_META_ID } }),
    ]);

    let config: CarWashConfigData = DEFAULT_CARWASH_CONFIG;
    if (configRow?.configJson) {
      try {
        config = normalizeCarWashConfig(JSON.parse(configRow.configJson));
      } catch {}
    } else {
      await prisma.systemSetting.upsert({
        where: { id: CARWASH_CONFIG_ID },
        update: {},
        create: {
          id: CARWASH_CONFIG_ID,
          configJson: JSON.stringify(DEFAULT_CARWASH_CONFIG),
        },
      });
    }

    let metaMap: Record<string, CarWashServiceMeta> = {};
    let seededOnce = false;
    if (metaRow?.configJson) {
      try {
        const parsed = JSON.parse(metaRow.configJson);
        metaMap = parsed.items || {};
        seededOnce = Boolean(parsed.seededOnce);
      } catch {}
    }

    // Modo de datos 100% reales: no inyectar servicios ficticios automáticamente.
    // Solo se utilizan los servicios registrados por el usuario.

    const [allWorkshopServices, activePromotions, appointments, allProducts] = await Promise.all([
      prisma.workshopService.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      prisma.posPromotion.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clientAppointment.findMany({
        where: {
          status: { notIn: ["Cancelada", "CANCELADA"] },
        },
        orderBy: { createdAt: "desc" },
        take: 150,
      }),
      prisma.product.findMany({
        where: { status: { not: "Inactivo" } },
        orderBy: { name: "asc" },
      }),
    ]);

    const enrichedServices = allWorkshopServices
      .filter((s) => {
        if (metaMap[s.id]) return !metaMap[s.id].archived;
        const catLow = (s.category || "").toLowerCase();
        const codeLow = (s.code || "").toLowerCase();
        const specLow = ((s as any).specialty || "").toLowerCase();
        return (
          catLow.includes("car wash") ||
          catLow.includes("carwash") ||
          catLow.includes("lavado") ||
          catLow.includes("detailing") ||
          catLow.includes("limpieza") ||
          specLow.includes("carwash") ||
          specLow.includes("lavado") ||
          codeLow.startsWith("cw-")
        );
      })
      .map((s, idx) => {
        const meta = metaMap[s.id];
        const basePrice = Number(s.price);
        const priceConfigured = meta?.priceConfigured !== undefined ? meta.priceConfigured : basePrice > 0;
        
        let deducedCatId = meta?.categoryId;
        if (!deducedCatId) {
          const n = (s.name || "").toLowerCase();
          if (n.includes("motor")) deducedCatId = "cw_cat_motor";
          else if (n.includes("tapicer") || n.includes("cuero")) deducedCatId = "cw_cat_tapiceria";
          else if (n.includes("interior") || n.includes("cabina") || n.includes("aspirado")) deducedCatId = "cw_cat_interior";
          else if (n.includes("chasis") || n.includes("completo") || n.includes("4x4") || n.includes("elevador")) deducedCatId = "cw_cat_completo";
          else deducedCatId = "cw_cat_exterior";
        }

        return {
          id: s.id,
          code: s.code,
          name: s.name,
          category: s.category,
          basePrice: priceConfigured ? basePrice : null,
          price: priceConfigured ? basePrice : null,
          promoPrice: meta?.promoPrice ?? null,
          priceConfigured,
          estimatedMinutes: Number(s.estimatedMinutes || 30),
          requiresBay: s.requiresBay,
          active: meta?.active !== undefined ? meta.active : s.active,
          archived: Boolean(meta?.archived),
          categoryId: deducedCatId,
          subcategoryId: meta?.subcategoryId || "cw_sub_ext_express",
          shortDescription: meta?.shortDescription || s.description || "",
          fullDescription: meta?.fullDescription || s.description || "",
          imageUrl:
            meta?.imageUrl ||
            "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=900&q=80",
          galleryUrls: meta?.galleryUrls || (meta?.imageUrl ? [meta.imageUrl] : []),
          priceByVehicleType: meta?.priceByVehicleType || {},
          durationByVehicleType: meta?.durationByVehicleType || {},
          applicableVehicleTypes:
            meta?.applicableVehicleTypes && meta.applicableVehicleTypes.length > 0
              ? meta.applicableVehicleTypes
              : config.vehicleTypes.map((vt) => vt.id),
          includesList: meta?.includesList || [],
          excludesList: meta?.excludesList || [],
          materialsIncluded: meta?.materialsIncluded || [],
          associatedAddonIds: meta?.associatedAddonIds || [],
          conditionsText: meta?.conditionsText || "",
          availability: meta?.availability || (s.active ? "Disponible" : "No disponible"),
          order: meta?.order ?? idx + 1,
        };
      })
      .sort((a, b) => a.order - b.order);

    const mappedProducts = (allProducts || []).map((p: any) => {
      const catLow = (p.category || "").toLowerCase();
      const nameLow = (p.name || "").toLowerCase();
      let cwCatId = "cw_cat_exterior";
      if (catLow.includes("interior") || nameLow.includes("interior") || nameLow.includes("ambientador") || nameLow.includes("silicona")) {
        cwCatId = "cw_cat_interior";
      } else if (catLow.includes("tapicer") || nameLow.includes("tapiceria") || nameLow.includes("asiento")) {
        cwCatId = "cw_cat_tapiceria";
      } else if (catLow.includes("motor") || nameLow.includes("motor") || nameLow.includes("desengrasante")) {
        cwCatId = "cw_cat_motor";
      }
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        brand: p.brand || "Insumo",
        category: p.category || "Insumo",
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        minStock: Number(p.minStock || 0),
        imageUrl: p.imageUrl || null,
        type: "PART",
        cwCategoryId: cwCatId,
      };
    });

    // Actualizar dinámicamente startingPrice y estimatedMinutes de cada categoría según servicios y productos reales
    const categoriesWithRealStats = config.categories
      .map((cat) => {
        const catServices = enrichedServices.filter(
          (srv) => srv.categoryId === cat.id && srv.active && srv.basePrice && srv.basePrice > 0
        );
        const catProducts = mappedProducts.filter(
          (p: any) => p.cwCategoryId === cat.id
        );
        const allPrices = [
          ...catServices.map((s) => Number(s.promoPrice && s.promoPrice > 0 ? s.promoPrice : s.basePrice)),
          ...catProducts.map((p) => Number(p.price)),
        ].filter((n) => n > 0);

        const minRealPrice = allPrices.length > 0 ? Math.min(...allPrices) : null;
        return {
          ...cat,
          startingPrice:
            cat.startingPrice !== null && cat.startingPrice !== undefined && cat.startingPrice > 0
              ? cat.startingPrice
              : minRealPrice,
          servicesCount: catServices.length + catProducts.length,
        };
      })
      .sort((a, b) => a.order - b.order);

    return {
      config: {
        ...config,
        packages: [] as CarWashPackage[],
        addons: [] as CarWashAddon[],
        categories: categoriesWithRealStats,
      },
      metaMap,
      services: enrichedServices,
      products: mappedProducts,
      promotions: activePromotions.map((p) => ({
        id: p.id,
        code: p.code,
        title: p.title,
        discountType: p.discountType,
        discountValue: Number(p.discountValue),
        minPurchase: Number(p.minPurchase),
        category: p.category,
        validUntil: p.validUntil,
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        appointmentNumber: a.appointmentNumber,
        vehicle: a.vehicle,
        plate: a.plate,
        clientName: a.clientName,
        clientPhone: a.clientPhone,
        serviceName: a.serviceName,
        date: a.date,
        timeSlot: a.timeSlot,
        status: a.status,
        bay: a.bay,
      })),
    };
  });
}

// Caché en memoria en el servidor para respuestas instantáneas (< 50ms tras primer call)
let serverCarWashCache: {
  config: any;
  services: any[];
  promotions: any[];
  appointments: any[];
  timestamp: number;
} | null = null;

// GET: Cargar toda la configuración de Car Wash, servicios, paquetes, adicionales, tipos de vehículo, promociones y citas desde Neon PostgreSQL
export async function GET() {
  try {
    const data = await getOrInitCarWashData();
    serverCarWashCache = null;
    return NextResponse.json({
      success: true,
      config: data.config,
      services: data.services,
      products: data.products,
      promotions: data.promotions,
      appointments: data.appointments,
    });
  } catch (error: any) {
    console.error("Error en GET /api/taller/carwash:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al cargar módulo Car Wash" },
      { status: 500 }
    );
  }
}

// PUT: Guardar cambios manuales en la configuración (categorías, subcategorías, tipos de vehículo, paquetes, adicionales, tarifas)
export async function PUT(req: NextRequest) {
  serverCarWashCache = null;
  try {
    const body = await req.json();
    const { config: incomingConfig } = body;

    const current = await getOrInitCarWashData();
    const updatedConfig = normalizeCarWashConfig({
      ...current.config,
      ...(incomingConfig || {}),
    });

    await withRetry(async () => {
      await prisma.systemSetting.upsert({
        where: { id: CARWASH_CONFIG_ID },
        update: { configJson: JSON.stringify(updatedConfig) },
        create: { id: CARWASH_CONFIG_ID, configJson: JSON.stringify(updatedConfig) },
      });
    });

    const refreshed = await getOrInitCarWashData();
    return NextResponse.json({
      success: true,
      config: refreshed.config,
      services: refreshed.services,
    });
  } catch (error: any) {
    console.error("Error en PUT /api/taller/carwash:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar configuración de Car Wash" },
      { status: 500 }
    );
  }
}

// POST:
// 1. CALCULAR_Y_VALIDAR_SELECCION (cálculo y validación de precios/disponibilidad/adicionales en servidor)
// 2. CREAR_RESERVA_CARWASH (reserva real en ClientAppointment evitando duplicados)
// 3. SAVE_SERVICE (crear o editar un servicio en WorkshopService + SystemSetting)
export async function POST(req: NextRequest) {
  serverCarWashCache = null;
  try {
    const body = await req.json();
    const { action } = body;

    const current = await getOrInitCarWashData();

    // =========================================================================
    // ACCIÓN 1: CALCULAR Y VALIDAR SELECCIÓN EN EL SERVIDOR
    // =========================================================================
    if (action === "CALCULAR_Y_VALIDAR_SELECCION") {
      const {
        vehicleTypeId = "vt_sedan",
        selectedServiceIds = [],
        selectedPackageIds = [],
        selectedAddonIds = [],
        promoCode = "",
      } = body;

      const vehicleType =
        current.config.vehicleTypes.find((v) => v.id === vehicleTypeId) ||
        current.config.vehicleTypes[2] ||
        current.config.vehicleTypes[0];

      const validatedLines: Array<{
        id: string;
        code: string;
        name: string;
        kind: "PACKAGE" | "SERVICE" | "ADDON";
        unitPrice: number;
        originalPrice: number;
        estimatedMinutes: number;
        alreadyIncludedInPackage: boolean;
        includedInPackageName?: string;
        category: string;
        subCategory: string;
      }> = [];

      const unconfiguredItems: string[] = [];
      const unavailableItems: string[] = [];
      const includedAddonSet = new Set<string>();
      const includedAddonPackageMap: Record<string, string> = {};

      // 1. Procesar Paquetes seleccionados
      for (const pkgId of selectedPackageIds) {
        const pkg = current.config.packages.find((p) => p.id === pkgId || p.code === pkgId);
        if (!pkg) continue;
        if (!pkg.active || pkg.availability === "No disponible") {
          unavailableItems.push(pkg.name);
          continue;
        }
        const priceInfo = resolveServiceOrPackagePrice(pkg, vehicleType?.id);
        if (!priceInfo.isConfigured || priceInfo.unitPrice === null) {
          unconfiguredItems.push(pkg.name);
          continue;
        }

        (pkg.includedAddonIds || []).forEach((addonId) => {
          includedAddonSet.add(addonId);
          includedAddonPackageMap[addonId] = pkg.name;
        });

        validatedLines.push({
          id: pkg.id,
          code: pkg.code,
          name: `${pkg.name} (${vehicleType?.name || "Vehículo"})`,
          kind: "PACKAGE",
          unitPrice: priceInfo.unitPrice,
          originalPrice: priceInfo.originalPrice || priceInfo.unitPrice,
          estimatedMinutes: Number(pkg.estimatedMinutes || 45),
          alreadyIncludedInPackage: false,
          category: "Lavado",
          subCategory: pkg.categoryId,
        });
      }

      // 2. Procesar Servicios individuales seleccionados
      for (const srvId of selectedServiceIds) {
        const srv = current.services.find((s) => s.id === srvId || s.code === srvId);
        if (!srv) continue;
        if (!srv.active || srv.availability === "No disponible") {
          unavailableItems.push(srv.name);
          continue;
        }
        const priceInfo = resolveServiceOrPackagePrice(srv, vehicleType?.id);
        if (!priceInfo.isConfigured || priceInfo.unitPrice === null) {
          unconfiguredItems.push(srv.name);
          continue;
        }

        const duration =
          vehicleType?.id &&
          srv.durationByVehicleType &&
          srv.durationByVehicleType[vehicleType.id] > 0
            ? Number(srv.durationByVehicleType[vehicleType.id])
            : Number(srv.estimatedMinutes || 30);

        validatedLines.push({
          id: srv.id,
          code: srv.code,
          name: `${srv.name} (${vehicleType?.name || "Vehículo"})`,
          kind: "SERVICE",
          unitPrice: priceInfo.unitPrice,
          originalPrice: priceInfo.originalPrice || priceInfo.unitPrice,
          estimatedMinutes: duration,
          alreadyIncludedInPackage: false,
          category: "Lavado",
          subCategory: srv.categoryId,
        });
      }

      // 3. Procesar Servicios Adicionales / Complementos (evitando cobrar dos veces los ya incluidos en un paquete)
      const hasPrimaryServiceOrPackage =
        selectedPackageIds.length > 0 || selectedServiceIds.length > 0;

      for (const addonId of selectedAddonIds) {
        const addon = current.config.addons.find((a) => a.id === addonId || a.code === addonId);
        if (!addon) continue;
        if (!addon.active || addon.availability === "No disponible") {
          unavailableItems.push(addon.name);
          continue;
        }

        if (!addon.canBeStandalone && !hasPrimaryServiceOrPackage) {
          return NextResponse.json(
            {
              success: false,
              error: `El complemento "${addon.name}" solo puede contratarse junto con un servicio o paquete principal.`,
            },
            { status: 400 }
          );
        }

        const isIncludedInPkg = includedAddonSet.has(addon.id);
        if (isIncludedInPkg) {
          validatedLines.push({
            id: addon.id,
            code: addon.code,
            name: `${addon.name} (Incluido en ${includedAddonPackageMap[addon.id]})`,
            kind: "ADDON",
            unitPrice: 0,
            originalPrice: Number(addon.price || 0),
            estimatedMinutes: 0, // Ya contemplado en el tiempo del paquete
            alreadyIncludedInPackage: true,
            includedInPackageName: includedAddonPackageMap[addon.id],
            category: "Lavado",
            subCategory: "cw_cat_adicionales",
          });
          continue;
        }

        const priceInfo = resolveServiceOrPackagePrice(addon, vehicleType?.id);
        if (!priceInfo.isConfigured || priceInfo.unitPrice === null) {
          unconfiguredItems.push(addon.name);
          continue;
        }

        validatedLines.push({
          id: addon.id,
          code: addon.code,
          name: addon.name,
          kind: "ADDON",
          unitPrice: priceInfo.unitPrice,
          originalPrice: priceInfo.originalPrice || priceInfo.unitPrice,
          estimatedMinutes: Number(addon.estimatedMinutes || 15),
          alreadyIncludedInPackage: false,
          category: "Lavado",
          subCategory: "cw_cat_adicionales",
        });
      }

      if (unavailableItems.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Los siguientes servicios no están disponibles actualmente: ${unavailableItems.join(", ")}`,
          },
          { status: 400 }
        );
      }

      if (unconfiguredItems.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Falta configurar el precio de: ${unconfiguredItems.join(", ")}. Configúrelo antes de confirmar.`,
          },
          { status: 400 }
        );
      }

      const subtotal = validatedLines.reduce((acc, item) => acc + item.unitPrice, 0);
      const totalMinutes = validatedLines.reduce((acc, item) => acc + item.estimatedMinutes, 0);

      // Validar código promocional si se envió
      let promoDiscount = 0;
      let appliedPromotion: any = null;
      if (promoCode && String(promoCode).trim()) {
        const cleanCode = String(promoCode).trim().toUpperCase();
        const promo = current.promotions.find((p) => p.code.toUpperCase() === cleanCode);
        if (promo && subtotal >= promo.minPurchase) {
          appliedPromotion = promo;
          if (promo.discountType === "PERCENT") {
            promoDiscount = Number(((subtotal * promo.discountValue) / 100).toFixed(2));
          } else {
            promoDiscount = Math.min(subtotal, Number(promo.discountValue));
          }
        }
      }

      const netAfterDiscount = Math.max(0, Number((subtotal - promoDiscount).toFixed(2)));
      const taxRate = Number(current.config.taxRatePercent || 15);
      const pricesIncludeTax = Boolean(current.config.pricesIncludeTax);

      const taxAmount = pricesIncludeTax
        ? Number((netAfterDiscount - netAfterDiscount / (1 + taxRate / 100)).toFixed(2))
        : Number(((netAfterDiscount * taxRate) / 100).toFixed(2));

      const finalTotal = pricesIncludeTax
        ? netAfterDiscount
        : Number((netAfterDiscount + taxAmount).toFixed(2));

      return NextResponse.json({
        success: true,
        calculation: {
          vehicleType,
          lines: validatedLines,
          subtotal,
          promoDiscount,
          appliedPromotion,
          taxRate,
          pricesIncludeTax,
          taxAmount,
          total: finalTotal,
          totalMinutes,
        },
      });
    }

    // =========================================================================
    // ACCIÓN 2: CREAR RESERVA DE BAHÍA DE LAVADO (REUTILIZANDO ClientAppointment)
    // =========================================================================
    if (action === "CREAR_RESERVA_CARWASH") {
      const {
        vehicle = "",
        plate = "",
        clientName = "",
        clientPhone = "",
        serviceSummary = "",
        date = "",
        timeSlot = "",
        bay = "Bahía Lavado 1",
        notes = "",
        idempotencyKey = "",
      } = body;

      if (!date || !timeSlot || !serviceSummary) {
        return NextResponse.json(
          {
            success: false,
            error: "Selecciona fecha, horario y al menos un servicio para registrar la reserva.",
          },
          { status: 400 }
        );
      }

      const cleanPlate = String(plate || "S/P").trim().toUpperCase();
      const cleanClient = String(clientName || "Cliente Car Wash").trim();

      // Verificar disponibilidad real en la bahía, fecha y hora (y prevenir doble envío)
      const existingSlot = await prisma.clientAppointment.findFirst({
        where: {
          date: String(date).trim(),
          timeSlot: String(timeSlot).trim(),
          bay: String(bay).trim(),
          status: { notIn: ["Cancelada", "CANCELADA"] },
        },
      });

      if (existingSlot) {
        // Si es exactamente la misma reserva enviada dos veces (idempotencia), devolver la existente sin duplicar
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
            error: `La ${bay} ya tiene una reserva programada el ${date} a las ${timeSlot}. Por favor elige otro horario o bahía.`,
          },
          { status: 409 }
        );
      }

      const appointmentNumber = idempotencyKey
        ? `CW-${String(idempotencyKey).slice(-6).toUpperCase()}`
        : `CW-${Date.now().toString().slice(-6)}`;

      const created = await prisma.clientAppointment.create({
        data: {
          appointmentNumber,
          vehicle: String(vehicle || "Vehículo Car Wash").trim(),
          plate: cleanPlate,
          clientName: cleanClient,
          clientPhone: clientPhone ? String(clientPhone).trim() : null,
          serviceName: String(serviceSummary).trim(),
          date: String(date).trim(),
          timeSlot: String(timeSlot).trim(),
          status: "Programada",
          tech: "Equipo Car Wash",
          bay: String(bay).trim(),
          notes: notes ? String(notes).trim() : null,
        },
      });

      return NextResponse.json({
        success: true,
        appointment: created,
      });
    }

    // =========================================================================
    // ACCIÓN 3: CREAR O EDITAR UN SERVICIO EN Neon (WorkshopService + Meta)
    // =========================================================================
    const payload = body.service || body;
    const {
      id,
      code,
      name,
      categoryId = "cw_cat_exterior",
      subcategoryId = "cw_sub_ext_express",
      shortDescription = "",
      fullDescription = "",
      imageUrl = "",
      galleryUrls = [],
      basePrice,
      price,
      promoPrice = null,
      priceByVehicleType = {},
      durationByVehicleType = {},
      estimatedMinutes = 30,
      applicableVehicleTypes = [],
      includesList = [],
      excludesList = [],
      materialsIncluded = [],
      associatedAddonIds = [],
      conditionsText = "",
      availability = "Disponible",
      order = 1,
      active = true,
    } = payload;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre del servicio es obligatorio." },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    const rawCode = String(code || "").trim().toUpperCase();
    const finalCode = rawCode || `CW-SRV-${Date.now().toString().slice(-5)}`;
    const rawPriceValue = basePrice !== undefined ? basePrice : price;
    const priceConfigured =
      rawPriceValue !== null &&
      rawPriceValue !== undefined &&
      String(rawPriceValue).trim() !== "" &&
      Number(rawPriceValue) > 0;
    const numPrice = priceConfigured ? Math.max(0, Number(rawPriceValue)) : 0;
    const numPromo =
      promoPrice !== null &&
      promoPrice !== undefined &&
      String(promoPrice).trim() !== "" &&
      Number(promoPrice) > 0
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
            category: "Car Wash",
            price: numPrice,
            estimatedMinutes: numMinutes,
            description: String(shortDescription || fullDescription || "").trim(),
            active: Boolean(active),
          },
        });
      } else {
        const dup = await prisma.workshopService.findUnique({ where: { code: finalCode } });
        if (dup) {
          throw new Error(`Ya existe un servicio con el código "${finalCode}".`);
        }
        dbSrv = await prisma.workshopService.create({
          data: {
            code: finalCode,
            name: cleanName,
            category: "Car Wash",
            price: numPrice,
            estimatedMinutes: numMinutes,
            description: String(shortDescription || fullDescription || "").trim(),
            requiresBay: true,
            active: Boolean(active),
          },
        });
      }

      const metaRow = await prisma.systemSetting.findUnique({ where: { id: CARWASH_META_ID } });
      let metaMap: Record<string, CarWashServiceMeta> = {};
      let seededOnce = true;
      if (metaRow?.configJson) {
        try {
          const parsed = JSON.parse(metaRow.configJson);
          metaMap = parsed.items || {};
          seededOnce = parsed.seededOnce ?? true;
        } catch {}
      }

      const primaryImg =
        imageUrl ||
        (Array.isArray(galleryUrls) && galleryUrls.length > 0
          ? galleryUrls[0]
          : "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=900&q=80");

      metaMap[dbSrv.id] = {
        serviceId: dbSrv.id,
        code: dbSrv.code,
        categoryId,
        subcategoryId,
        shortDescription: String(shortDescription || "").trim(),
        fullDescription: String(fullDescription || shortDescription || "").trim(),
        imageUrl: primaryImg,
        galleryUrls:
          Array.isArray(galleryUrls) && galleryUrls.length > 0 ? galleryUrls : [primaryImg],
        promoPrice: numPromo,
        priceConfigured,
        priceByVehicleType: priceByVehicleType || {},
        durationByVehicleType: durationByVehicleType || {},
        applicableVehicleTypes: Array.isArray(applicableVehicleTypes)
          ? applicableVehicleTypes
          : [],
        includesList: Array.isArray(includesList) ? includesList : [],
        excludesList: Array.isArray(excludesList) ? excludesList : [],
        materialsIncluded: Array.isArray(materialsIncluded) ? materialsIncluded : [],
        associatedAddonIds: Array.isArray(associatedAddonIds) ? associatedAddonIds : [],
        conditionsText: String(conditionsText || "").trim(),
        availability: availability || "Disponible",
        order: Number(order || 1),
        active: Boolean(active),
        archived: false,
      };

      await prisma.systemSetting.upsert({
        where: { id: CARWASH_META_ID },
        update: { configJson: JSON.stringify({ seededOnce, items: metaMap }) },
        create: { id: CARWASH_META_ID, configJson: JSON.stringify({ seededOnce, items: metaMap }) },
      });
    });

    const refreshed = await getOrInitCarWashData();
    return NextResponse.json({
      success: true,
      config: refreshed.config,
      services: refreshed.services,
    });
  } catch (error: any) {
    console.error("Error en POST /api/taller/carwash:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar operación en Car Wash" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar o archivar servicio/categoría/paquete/adicional de forma segura protegiendo historial
export async function DELETE(req: NextRequest) {
  serverCarWashCache = null;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") || "service";

    if (!id) {
      return NextResponse.json({ success: false, error: "ID requerido" }, { status: 400 });
    }

    const current = await getOrInitCarWashData();

    if (type === "category") {
      const hasServices = current.services.some((s) => s.categoryId === id);
      const hasPackages = current.config.packages.some((p) => p.categoryId === id);
      if (hasServices || hasPackages) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Esta categoría tiene servicios o paquetes asociados. Desactívala en lugar de eliminarla para proteger el catálogo.",
          },
          { status: 409 }
        );
      }
      const updated = normalizeCarWashConfig({
        ...current.config,
        categories: current.config.categories.filter((c) => c.id !== id),
      });
      await prisma.systemSetting.upsert({
        where: { id: CARWASH_CONFIG_ID },
        update: { configJson: JSON.stringify(updated) },
        create: { id: CARWASH_CONFIG_ID, configJson: JSON.stringify(updated) },
      });
      return NextResponse.json({ success: true, config: updated });
    }

    // Eliminar o archivar servicio individual
    const srv = await prisma.workshopService.findUnique({ where: { id } });
    if (!srv) {
      return NextResponse.json({ success: false, error: "Servicio no encontrado" }, { status: 404 });
    }

    const [ordersCount, salesCount] = await Promise.all([
      prisma.workshopOrder.count({
        where: {
          OR: [
            { itemsJson: { contains: srv.code } },
            { servicesJson: { contains: srv.code } },
          ],
        },
      }),
      prisma.saleItem.count({
        where: { code: srv.code },
      }),
    ]);

    const metaRow = await prisma.systemSetting.findUnique({ where: { id: CARWASH_META_ID } });
    let metaMap: Record<string, CarWashServiceMeta> = {};
    let seededOnce = true;
    if (metaRow?.configJson) {
      try {
        const parsed = JSON.parse(metaRow.configJson);
        metaMap = parsed.items || {};
        seededOnce = parsed.seededOnce ?? true;
      } catch {}
    }

    if (ordersCount > 0 || salesCount > 0) {
      await prisma.workshopService.update({
        where: { id },
        data: { active: false },
      });
      if (metaMap[id]) {
        metaMap[id] = { ...metaMap[id], active: false, archived: true, availability: "No disponible" };
        await prisma.systemSetting.upsert({
          where: { id: CARWASH_META_ID },
          update: { configJson: JSON.stringify({ seededOnce, items: metaMap }) },
          create: { id: CARWASH_META_ID, configJson: JSON.stringify({ seededOnce, items: metaMap }) },
        });
      }
      const refreshed = await getOrInitCarWashData();
      return NextResponse.json({
        success: true,
        archivedInstead: true,
        message:
          "El servicio cuenta con historial de órdenes/ventas, por lo que fue archivado/desactivado en lugar de borrarse físicamente.",
        services: refreshed.services,
      });
    }

    await prisma.workshopService.delete({ where: { id } });
    if (metaMap[id]) {
      delete metaMap[id];
      await prisma.systemSetting.upsert({
        where: { id: CARWASH_META_ID },
        update: { configJson: JSON.stringify({ seededOnce, items: metaMap }) },
        create: { id: CARWASH_META_ID, configJson: JSON.stringify({ seededOnce, items: metaMap }) },
      });
    }

    const refreshed = await getOrInitCarWashData();
    return NextResponse.json({
      success: true,
      archivedInstead: false,
      message: "Servicio eliminado correctamente.",
      services: refreshed.services,
    });
  } catch (error: any) {
    console.error("Error en DELETE /api/taller/carwash:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar/archivar servicio" },
      { status: 500 }
    );
  }
}
