"use client";
import React, { useState } from "react";
import Link from "next/link";

// Catálogo local de vehículos: Marca -> Modelo -> { rango de años, versiones/motor }
type ModelInfo = { years: [number, number]; versions: string[]; photoUrl?: string };

const VEHICLE_CATALOG: Record<string, Record<string, ModelInfo>> = {
  Chevrolet: {
    "Aveo": { years: [2010, 2021], versions: ["1.4L Emotion", "1.6L Family"] },
    "Sail": { years: [2011, 2023], versions: ["1.4L LS", "1.5L LT"] },
    "Spark GT": { years: [2012, 2022], versions: ["1.2L"] },
    "Onix": { years: [2020, 2025], versions: ["1.0L Turbo", "1.2L"] },
    "Tracker": { years: [2020, 2025], versions: ["1.2L Turbo", "1.8L"] },
    "D-Max": { years: [2014, 2025], versions: ["2.4L Gasolina", "2.5L Diesel 4x2", "3.0L Diesel 4x4"] },
  },
  Toyota: {
    "Corolla": { years: [2015, 2025], versions: ["1.6L", "1.8L", "1.8L Híbrido", "2.0L"], photoUrl: "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=600" },
    "Yaris": { years: [2014, 2025], versions: ["1.3L", "1.5L"] },
    "Hilux": { years: [2012, 2025], versions: ["2.4L Diesel 4x2", "2.7L Gasolina", "2.8L Diesel 4x4"] },
    "RAV4": { years: [2015, 2025], versions: ["2.0L", "2.5L Híbrido"] },
    "Fortuner": { years: [2016, 2025], versions: ["2.7L Gasolina", "2.8L Diesel"] },
    "Land Cruiser Prado": { years: [2010, 2025], versions: ["2.7L Gasolina", "2.8L Diesel", "4.0L V6"] },
  },
  Kia: {
    "Picanto": { years: [2011, 2025], versions: ["1.0L", "1.2L"] },
    "Rio": { years: [2012, 2025], versions: ["1.4L", "1.6L"] },
    "Soluto": { years: [2019, 2025], versions: ["1.4L"] },
    "Sportage": { years: [2011, 2025], versions: ["1.6L Turbo", "2.0L", "2.0L CRDi Diesel"] },
    "Sorento": { years: [2015, 2025], versions: ["2.2L CRDi Diesel", "2.4L", "3.5L V6"] },
  },
  Hyundai: {
    "Grand i10": { years: [2014, 2025], versions: ["1.2L"] },
    "Accent": { years: [2012, 2023], versions: ["1.4L", "1.6L"] },
    "Creta": { years: [2017, 2025], versions: ["1.5L", "1.6L"] },
    "Tucson": { years: [2010, 2025], versions: ["1.6L Turbo", "2.0L", "2.0L CRDi Diesel"] },
    "Santa Fe": { years: [2013, 2025], versions: ["2.2L CRDi Diesel", "2.4L", "3.5L V6"] },
  },
  Nissan: {
    "Versa": { years: [2012, 2025], versions: ["1.6L"] },
    "Sentra": { years: [2013, 2025], versions: ["1.8L", "2.0L"], photoUrl: "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&q=80&w=600" },
    "Kicks": { years: [2017, 2025], versions: ["1.6L"] },
    "X-Trail": { years: [2015, 2025], versions: ["2.5L"] },
    "Frontier": { years: [2015, 2025], versions: ["2.5L Gasolina", "2.3L Diesel 4x4", "2.5L Diesel 4x4"] },
  },
  Mazda: {
    "Mazda 2": { years: [2015, 2025], versions: ["1.5L"] },
    "Mazda 3": { years: [2014, 2025], versions: ["1.6L", "2.0L", "2.5L"] },
    "CX-5": { years: [2013, 2025], versions: ["2.0L", "2.5L"] },
    "BT-50": { years: [2012, 2025], versions: ["2.2L Diesel", "3.0L Diesel 4x4", "3.2L Diesel 4x4"] },
  },
  Suzuki: {
    "Swift": { years: [2012, 2025], versions: ["1.2L", "1.4L"] },
    "Vitara": { years: [2016, 2025], versions: ["1.6L"] },
    "Grand Vitara": { years: [2010, 2019], versions: ["2.0L", "2.4L"] },
    "Jimny": { years: [2019, 2025], versions: ["1.5L"] },
  },
  Ford: {
    "EcoSport": { years: [2013, 2022], versions: ["1.5L", "2.0L"] },
    "Ranger": { years: [2012, 2025], versions: ["2.5L Gasolina", "2.2L Diesel", "3.2L Diesel 4x4"] },
    "Explorer": { years: [2012, 2025], versions: ["2.3L EcoBoost", "3.5L V6"] },
    "F-150": { years: [2015, 2025], versions: ["3.5L EcoBoost", "5.0L V8"] },
  },
  Volkswagen: {
    "Gol": { years: [2010, 2022], versions: ["1.6L"] },
    "Polo": { years: [2018, 2025], versions: ["1.6L", "1.0L TSI"] },
    "Tiguan": { years: [2017, 2025], versions: ["1.4L TSI", "2.0L TSI"] },
    "Amarok": { years: [2011, 2025], versions: ["2.0L TDI Diesel", "3.0L V6 TDI Diesel"] },
  },
  Renault: {
    "Kwid": { years: [2018, 2025], versions: ["1.0L"] },
    "Logan": { years: [2010, 2023], versions: ["1.6L"] },
    "Sandero": { years: [2010, 2023], versions: ["1.6L", "1.6L Stepway"] },
    "Duster": { years: [2012, 2025], versions: ["1.6L 4x2", "2.0L 4x4"] },
  },
  Honda: {
    "Fit": { years: [2010, 2020], versions: ["1.5L"] },
    "Civic": { years: [2012, 2025], versions: ["1.5L Turbo", "1.8L", "2.0L"] },
    "HR-V": { years: [2016, 2025], versions: ["1.8L"] },
    "CR-V": { years: [2012, 2025], versions: ["1.5L Turbo", "2.4L"] },
  },
  Mitsubishi: {
    "ASX": { years: [2011, 2025], versions: ["2.0L"] },
    "Outlander": { years: [2013, 2025], versions: ["2.4L", "3.0L V6"] },
    "Montero Sport": { years: [2010, 2025], versions: ["2.4L Diesel", "3.0L V6"] },
    "L200": { years: [2010, 2025], versions: ["2.4L Gasolina", "2.4L Diesel 4x4", "2.5L Diesel 4x4"] },
  },
  "Great Wall": {
    "Wingle 5": { years: [2012, 2022], versions: ["2.2L Gasolina", "2.0L Diesel"] },
    "Wingle 7": { years: [2019, 2025], versions: ["2.0L Diesel 4x4", "2.4L Gasolina"] },
    "Haval H6": { years: [2018, 2025], versions: ["1.5L Turbo", "2.0L Turbo"] },
    "Haval Jolion": { years: [2021, 2025], versions: ["1.5L Turbo", "1.5L Híbrido"] },
  },
  Chery: {
    "Arrizo 5": { years: [2019, 2025], versions: ["1.5L"] },
    "Tiggo 2 Pro": { years: [2021, 2025], versions: ["1.5L"] },
    "Tiggo 4 Pro": { years: [2022, 2025], versions: ["1.5L", "1.5L Turbo"] },
    "Tiggo 7 Pro": { years: [2021, 2025], versions: ["1.5L Turbo"] },
  },
};

const getBrands = () => Object.keys(VEHICLE_CATALOG).sort((a, b) => a.localeCompare(b));
const getModels = (brand: string) => Object.keys(VEHICLE_CATALOG[brand] || {}).sort((a, b) => a.localeCompare(b));
const getModelInfo = (brand: string, model: string): ModelInfo | undefined => VEHICLE_CATALOG[brand]?.[model];
const getYears = (brand: string, model: string) => {
  const info = getModelInfo(brand, model);
  if (!info) return [];
  const [from, to] = info.years;
  return Array.from({ length: to - from + 1 }, (_, i) => String(to - i));
};
const isDieselVersion = (version: string) => /diesel|crdi|tdi/i.test(version);

// compatibility: "*" = universal | "Marca" | "Marca Modelo"
// fuel: limita el producto a motores diesel o gasolina
type CatalogItem = {
  id: string;
  category: "Repuestos" | "Filtros" | "Lubricantes" | "Servicios";
  name: string;
  price: number | null;
  compatibility: string[];
  isService: boolean;
  stock?: number;
  description?: string;
  fuel?: "diesel" | "gasolina";
};

const DIESEL_PICKUPS = ["Toyota Hilux", "Chevrolet D-Max", "Nissan Frontier", "Ford Ranger", "Mitsubishi L200", "Mazda BT-50", "Volkswagen Amarok", "Great Wall Wingle 5", "Great Wall Wingle 7"];

const PRODUCTS: CatalogItem[] = [
  // Lubricantes
  { id: "L1", category: "Lubricantes", name: "Aceite Sintético 5W-30 (4 L)", price: 45.0, compatibility: ["*"], fuel: "gasolina", stock: 24, isService: false },
  { id: "L2", category: "Lubricantes", name: "Aceite Semisintético 10W-40 (4 L)", price: 32.0, compatibility: ["*"], fuel: "gasolina", stock: 30, isService: false },
  { id: "L3", category: "Lubricantes", name: "Aceite Sintético 0W-20 (4 L)", price: 52.0, compatibility: ["Toyota", "Honda", "Mazda", "Kia", "Hyundai"], fuel: "gasolina", stock: 10, isService: false },
  { id: "L4", category: "Lubricantes", name: "Aceite Diesel 15W-40 (Galón)", price: 38.0, compatibility: ["*"], fuel: "diesel", stock: 18, isService: false },
  { id: "L5", category: "Lubricantes", name: "Líquido de Frenos DOT 4 (500 ml)", price: 8.5, compatibility: ["*"], stock: 40, isService: false },
  { id: "L6", category: "Lubricantes", name: "Refrigerante 50/50 (Galón)", price: 14.0, compatibility: ["*"], stock: 22, isService: false },
  { id: "L7", category: "Lubricantes", name: "Aceite de Transmisión ATF (1 L)", price: 12.0, compatibility: ["*"], stock: 15, isService: false },

  // Filtros
  { id: "F1", category: "Filtros", name: "Filtro de Aceite Toyota Original", price: 12.5, compatibility: ["Toyota"], stock: 14, isService: false },
  { id: "F2", category: "Filtros", name: "Filtro de Aceite ACDelco", price: 9.9, compatibility: ["Chevrolet"], stock: 20, isService: false },
  { id: "F3", category: "Filtros", name: "Filtro de Aceite Mobis", price: 10.5, compatibility: ["Kia", "Hyundai"], stock: 18, isService: false },
  { id: "F4", category: "Filtros", name: "Filtro de Aceite Nissan Original", price: 11.0, compatibility: ["Nissan", "Renault"], stock: 12, isService: false },
  { id: "F5", category: "Filtros", name: "Filtro de Aceite Universal Premium", price: 8.0, compatibility: ["Mazda", "Suzuki", "Ford", "Volkswagen", "Honda", "Mitsubishi", "Great Wall", "Chery"], stock: 25, isService: false },
  { id: "F6", category: "Filtros", name: "Filtro de Aire de Motor", price: 18.0, compatibility: ["*"], stock: 16, isService: false, description: "Referencia exacta confirmada al despachar según tu versión." },
  { id: "F7", category: "Filtros", name: "Filtro de Cabina con Carbón Activado", price: 15.0, compatibility: ["*"], stock: 19, isService: false },
  { id: "F8", category: "Filtros", name: "Filtro de Combustible Diesel con Separador", price: 24.0, compatibility: ["*"], fuel: "diesel", stock: 9, isService: false },

  // Repuestos
  { id: "R1", category: "Repuestos", name: "Pastillas de Freno Delanteras Cerámicas", price: 48.0, compatibility: ["*"], stock: 11, isService: false },
  { id: "R2", category: "Repuestos", name: "Disco de Freno Delantero (unidad)", price: 65.0, compatibility: ["*"], stock: 8, isService: false },
  { id: "R3", category: "Repuestos", name: "Bujías Iridium (juego x4)", price: 52.0, compatibility: ["*"], fuel: "gasolina", stock: 13, isService: false },
  { id: "R4", category: "Repuestos", name: "Batería 12V 55Ah", price: 115.0, compatibility: ["*"], fuel: "gasolina", stock: 6, isService: false },
  { id: "R5", category: "Repuestos", name: "Batería 12V 90Ah Heavy Duty", price: 165.0, compatibility: ["*"], fuel: "diesel", stock: 4, isService: false },
  { id: "R6", category: "Repuestos", name: "Plumas Limpiaparabrisas (par)", price: 18.0, compatibility: ["*"], stock: 26, isService: false },
  { id: "R7", category: "Repuestos", name: "Kit de Embrague Completo", price: 185.0, compatibility: ["Chevrolet Aveo", "Chevrolet Sail", "Chevrolet Spark GT", "Hyundai Accent", "Hyundai Grand i10", "Kia Rio", "Kia Picanto", "Suzuki Swift", "Renault Logan", "Renault Sandero"], stock: 5, isService: false },
  { id: "R8", category: "Repuestos", name: "Amortiguador Delantero Reforzado", price: 95.0, compatibility: DIESEL_PICKUPS, stock: 7, isService: false },
  { id: "R9", category: "Repuestos", name: "Kit de Distribución (banda + tensor)", price: 140.0, compatibility: ["Chevrolet", "Hyundai", "Kia", "Renault", "Volkswagen", "Great Wall", "Chery"], stock: 6, isService: false },
  { id: "R10", category: "Repuestos", name: "Bomba de Agua", price: 78.0, compatibility: ["*"], stock: 5, isService: false },

  // Servicios
  { id: "S1", category: "Servicios", name: "Mantenimiento Preventivo", price: null, compatibility: ["*"], isService: true, description: "Cambio de aceite, filtros y revisión de puntos de seguridad." },
  { id: "S2", category: "Servicios", name: "Alineación y Balanceo", price: null, compatibility: ["*"], isService: true, description: "Alineación computarizada 3D y balanceo de 4 ruedas." },
  { id: "S3", category: "Servicios", name: "Frenos y Suspensión", price: null, compatibility: ["*"], isService: true, description: "Revisión y cambio de pastillas, discos o amortiguadores." },
  { id: "S4", category: "Servicios", name: "Diagnóstico Computarizado", price: null, compatibility: ["*"], isService: true, description: "Escaneo completo con equipo original." },
  { id: "S5", category: "Servicios", name: "Sistema Eléctrico", price: null, compatibility: ["*"], isService: true, description: "Revisión de alternador, batería y luces." },
  { id: "S6", category: "Servicios", name: "Aire Acondicionado", price: null, compatibility: ["*"], isService: true, description: "Recarga de gas, limpieza de ductos y cambio de filtro de cabina." },
  { id: "S7", category: "Servicios", name: "Limpieza de Inyectores Diesel", price: null, compatibility: ["*"], fuel: "diesel", isService: true, description: "Prueba en banco y limpieza de inyectores common-rail." },
  { id: "S8", category: "Servicios", name: "Afinamiento de Motor", price: null, compatibility: ["*"], fuel: "gasolina", isService: true, description: "Bujías, limpieza de cuerpo de aceleración e inyectores." },
];

const PRODUCT_CATEGORIES: CatalogItem["category"][] = ["Repuestos", "Filtros", "Lubricantes", "Servicios"];

export function VehicleSearch() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [version, setVersion] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Modal de Solicitud Web hacia POS
  const [solicitudModalItem, setSolicitudModalItem] = useState<any | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [solicitudExitosa, setSolicitudExitosa] = useState<any | null>(null);

  // Estado derivado para la búsqueda
  const vehiclePhoto = getModelInfo(brand, model)?.photoUrl || null;
  const isVehicleSelected = Boolean(brand && model && year && version);
  const isDiesel = isDieselVersion(version);

  const filteredProducts = PRODUCTS.filter(p => {
    if (!isVehicleSelected) return false;
    const compatible = p.compatibility.some(c => c === "*" || c === brand || c === `${brand} ${model}`);
    if (!compatible) return false;
    if (p.fuel === "diesel" && !isDiesel) return false;
    if (p.fuel === "gasolina" && isDiesel) return false;
    if (activeCategory && p.category !== activeCategory) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitudModalItem) return;
    setEnviandoSolicitud(true);

    try {
      const type = solicitudModalItem.isService ? "SERVICIO" : "REPUESTO";
      const vehicleDesc = `${brand} ${model} ${year} ${version}`.trim();
      const payload = {
        type,
        customerName: customerName.trim() || "Cliente Web",
        customerPhone: customerPhone.trim() || "",
        customerEmail: "",
        vehicleInfo: vehicleDesc,
        itemsSummary: `${solicitudModalItem.name} (${type})`,
        itemsJson: [
          {
            id: solicitudModalItem.id,
            name: solicitudModalItem.name,
            price: solicitudModalItem.price || 0,
            quantity: 1,
            category: solicitudModalItem.category || type,
          },
        ],
        totalEstimated: solicitudModalItem.price || 0,
        notes: notes.trim(),
      };

      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al enviar solicitud a Neon");
      }

      setSolicitudExitosa(data.solicitud);
    } catch (err: any) {
      alert("Error al enviar solicitud: " + err.message);
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const cerrarModal = () => {
    setSolicitudModalItem(null);
    setSolicitudExitosa(null);
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
  };

  return (
    <>
      <div className="w-full mx-auto bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row">
        {/* Columna Izquierda: Selección de Vehículo */}
        <div className="w-full md:w-1/3 bg-zinc-50 dark:bg-zinc-900 p-8 md:p-10 border-r border-zinc-200 dark:border-zinc-800 flex flex-col gap-6 rounded-t-2xl md:rounded-tr-none md:rounded-l-2xl">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Tu Vehículo</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Selecciona tu vehículo.</p>
          </div>

          <div className="aspect-[4/3] w-full rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50 overflow-hidden relative flex items-center justify-center border border-zinc-200 dark:border-zinc-800/80">
            {vehiclePhoto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vehiclePhoto} alt={`${brand} ${model}`} className="w-full h-full object-cover animate-in fade-in duration-700" />
              </>
            ) : (
              <div className="text-center p-6 flex flex-col items-center">
                <span className="text-5xl mb-3">🚗</span>
                <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300">
                  {brand || "Tu vehículo"} {model}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Completa los 4 pasos para ver compatibilidad exacta
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <SearchableSelect 
              label="1. Marca"
              value={brand}
              options={getBrands()}
              onChange={val => { setBrand(val); setModel(""); setYear(""); setVersion(""); }}
            />

            <SearchableSelect 
              label="2. Modelo"
              value={model}
              disabled={!brand}
              options={getModels(brand)}
              onChange={val => { setModel(val); setYear(""); setVersion(""); }}
            />

            <SearchableSelect 
              label="3. Año"
              value={year}
              disabled={!model}
              options={getYears(brand, model)}
              onChange={val => { setYear(val); setVersion(""); }}
            />

            <SearchableSelect 
              label="4. Versión / Motor"
              value={version}
              disabled={!year}
              options={getModelInfo(brand, model)?.versions || []}
              onChange={val => setVersion(val)}
            />
          </div>
        </div>

        {/* Columna Derecha: Búsqueda y Categorías */}
        <div className="w-full md:w-2/3 p-8 md:p-10 flex flex-col bg-white dark:bg-zinc-950 rounded-b-2xl md:rounded-bl-none md:rounded-r-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white mb-2 tracking-tight">¿Qué necesitas?</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Repuestos y servicios garantizados.</p>
          </div>

          <div className="relative mb-10">
            <input 
              type="text" 
              placeholder="Ej. Filtro de aire, Aceite sintético..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              disabled={!isVehicleSelected}
              className="w-full pl-14 pr-6 py-4 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-950 outline-none transition-all disabled:opacity-50 font-medium"
            />
            <svg className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          {!isVehicleSelected ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow opacity-40 pointer-events-none grayscale transition-all duration-500">
              {[
                { title: "Repuestos y accesorios", icon: "⚙️", desc: "Piezas y componentes" },
                { title: "Lubricantes", icon: "💧", desc: "Aceites y fluidos" },
                { title: "Filtros", icon: "🎛️", desc: "Aire, aceite y cabina" },
                { title: "Talleres y servicios", icon: "🛠️", desc: "Mantenimiento y revisión" }
              ].map(cat => (
                <div key={cat.title} className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-4 bg-zinc-50 dark:bg-zinc-900/50">
                  <div className="w-12 h-12 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-2xl shadow-sm">{cat.icon}</div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white">{cat.title}</h4>
                    <p className="text-sm text-zinc-500">{cat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col flex-grow animate-in fade-in duration-500">
              {/* Filtros de Categorías */}
              <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar mb-2">
                {PRODUCT_CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={`px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all border ${activeCategory === cat ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-md' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Resultados */}
              <div className="flex-grow rounded-xl pt-4 overflow-y-auto max-h-[350px] pr-2">
                {filteredProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center space-y-3 py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
                    <div>
                      <p className="font-bold text-zinc-700 dark:text-zinc-300">No hay existencias confirmadas</p>
                      <p className="text-sm mt-1">Modifica tu búsqueda o solicita una cotización.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProducts.map(p => (
                      <div key={p.id} className="bg-zinc-50 dark:bg-zinc-900/50 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-sm transition-shadow group">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-xl shrink-0 shadow-sm border border-zinc-100 dark:border-zinc-700">
                            {p.isService ? '🛠️' : '📦'}
                          </div>
                          <div>
                            <h4 className="font-bold text-zinc-900 dark:text-white text-lg leading-tight">{p.name}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-md">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                                Compatible
                              </span>
                              {!p.isService && (
                                <span className="text-xs text-zinc-500 font-medium tracking-wide">
                                  {p.stock} disponibles
                                </span>
                              )}
                            </div>
                            {p.description && <p className="text-sm text-zinc-500 mt-2">{p.description}</p>}
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 shrink-0 border-t sm:border-t-0 border-zinc-200 dark:border-zinc-800 pt-4 sm:pt-0">
                          {p.price !== null ? (
                            <span className="font-black text-xl text-zinc-900 dark:text-white">${p.price.toFixed(2)}</span>
                          ) : (
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider bg-zinc-200/50 dark:bg-zinc-800 px-2 py-1 rounded">Precio por Diagnóstico</span>
                          )}
                          <button 
                            onClick={() => setSolicitudModalItem(p)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                          >
                            {p.isService ? 'Agendar' : 'Solicitar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Solicitud Web hacia POS */}
      {solicitudModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            {solicitudExitosa ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 text-3xl flex items-center justify-center mx-auto">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  ¡Solicitud Enviada!
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Tu solicitud ha sido registrada en el sistema de ventas/POS. Nuestro equipo en tienda la preparará de inmediato.
                </p>
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-left text-xs font-mono space-y-1">
                  <div><strong>Nº Solicitud:</strong> {solicitudExitosa.requestNumber}</div>
                  <div><strong>Ítem:</strong> {solicitudExitosa.itemsSummary}</div>
                  <div><strong>Vehículo:</strong> {solicitudExitosa.vehicleInfo}</div>
                  <div><strong>Estado:</strong> {solicitudExitosa.status}</div>
                </div>
                <button
                  onClick={cerrarModal}
                  className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg font-bold text-sm transition-colors"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnviarSolicitud} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{solicitudModalItem.isService ? "🛠️" : "📦"}</span>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                      {solicitudModalItem.isService ? "Agendar Servicio" : "Solicitar Repuesto"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="text-zinc-400 hover:text-zinc-600 text-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-zinc-900 dark:text-white text-sm">{solicitudModalItem.name}</div>
                  <div className="text-zinc-500">Vehículo: {brand} {model} {year} {version}</div>
                  {solicitudModalItem.price && (
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                      Estimado: ${solicitudModalItem.price.toFixed(2)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Tu Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. +58 414 1234567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Comentarios / Detalles (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Indica cualquier detalle adicional..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoSolicitud}
                    className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    {enviandoSolicitud ? "Enviando..." : "Enviar a Tienda / POS"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function SearchableSelect({ label, value, options, onChange, disabled }: { label: string, value: string, options: string[], onChange: (val: string) => void, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={`relative w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="w-full h-14 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between cursor-pointer shadow-sm"
      >
        <span className={value ? "text-zinc-900 dark:text-white font-medium" : "text-zinc-500 font-medium"}>
          {value || label}
        </span>
        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 mt-2 w-full z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
            <input 
              autoFocus
              type="text" 
              placeholder="Buscar..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full p-4 border-b border-zinc-100 dark:border-zinc-800 bg-transparent outline-none text-zinc-900 dark:text-white"
            />
            <div className="max-h-48 overflow-y-auto">
              {filtered.map(opt => (
                <div 
                  key={opt}
                  onClick={() => { onChange(opt); setIsOpen(false); setQuery(""); }}
                  className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer text-zinc-900 dark:text-zinc-200 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 transition-colors"
                >
                  {opt}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="p-4 text-zinc-500 text-sm text-center">Sin resultados</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
