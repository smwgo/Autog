"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicMobileNav } from "@/components/PublicMobileNav";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ServiceItem {
  id: string;
  code?: string;
  title: string;
  icon: string;
  desc: string;
  features: string[];
  price: string;
}

const defaultInitialServices = [
  {
    code: "SRV-MNT",
    name: "Mantenimiento Preventivo",
    category: "Mantenimiento Rápido",
    price: 45.0,
    estimatedMinutes: 45,
    description: "Cambio de aceite, filtros de aire y cabina, revisión de fluidos y chequeo general de seguridad. Esencial para prolongar la vida de tu motor.",
  },
  {
    code: "SRV-ALN",
    name: "Alineación y Balanceo",
    category: "Suspensión y Dirección",
    price: 35.0,
    estimatedMinutes: 30,
    description: "Ajuste láser preciso para el tren delantero y trasero para evitar el desgaste irregular de los neumáticos y mejorar el control.",
  },
  {
    code: "SRV-FRN",
    name: "Frenos y Suspensión",
    category: "Frenos",
    price: 60.0,
    estimatedMinutes: 60,
    description: "Revisión profunda, rectificado de discos, cambio de pastillas y diagnóstico de amortiguadores para una conducción segura.",
  },
  {
    code: "SRV-OBD",
    name: "Diagnóstico Computarizado",
    category: "Diagnóstico Electrónico",
    price: 25.0,
    estimatedMinutes: 30,
    description: "Escaneo completo de sensores, motor y sistemas electrónicos con escáner OBD2 avanzado para detectar fallas ocultas.",
  },
  {
    code: "SRV-ELE",
    name: "Sistema Eléctrico",
    category: "Electricidad",
    price: 50.0,
    estimatedMinutes: 60,
    description: "Reparación de alternadores, motores de arranque, cableado y diagnóstico de baterías y fusibles.",
  },
  {
    code: "SRV-AC",
    name: "Aire Acondicionado",
    category: "Climatización",
    price: 40.0,
    estimatedMinutes: 45,
    description: "Recarga de gas refrigerante, detección de fugas, cambio de compresor y limpieza de ductos para máximo confort.",
  },
];

function getServiceIcon(category: string = "", name: string = ""): string {
  const text = (category + " " + name).toLowerCase();
  if (text.includes("freno")) return "🛑";
  if (text.includes("alineación") || text.includes("balanceo")) return "⚖️";
  if (text.includes("diagnóstico") || text.includes("escáner") || text.includes("obd")) return "💻";
  if (text.includes("eléctrico") || text.includes("batería")) return "⚡";
  if (text.includes("aire") || text.includes("clima")) return "❄️";
  return "🛠️";
}

export default function ServiciosPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/servicios-taller?activos=true");
        const data = await res.json();

        if (res.ok && data.success && data.servicios?.length > 0) {
          const mapped: ServiceItem[] = data.servicios.map((s: any) => ({
            id: s.id,
            code: s.code,
            title: s.name,
            icon: getServiceIcon(s.category, s.name),
            desc: s.description || "Servicio técnico certificado para tu vehículo con repuestos de calidad y garantía.",
            features: [
              s.category || "Servicio Especializado",
              `Tiempo estimado: ${s.estimatedMinutes || 30} min`,
              "Garantía de mano de obra",
            ],
            price: `Desde $${Number(s.price || 0).toFixed(2)}`,
          }));
          setServices(mapped);
        } else {
          // Auto-seed inicial a Neon PostgreSQL para persistencia real
          for (const s of defaultInitialServices) {
            await fetch("/api/servicios-taller", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(s),
            }).catch(() => {});
          }

          const retryRes = await fetch("/api/servicios-taller?activos=true");
          const retryData = await retryRes.json();
          if (retryRes.ok && retryData.success && retryData.servicios?.length > 0) {
            setServices(
              retryData.servicios.map((s: any) => ({
                id: s.id,
                code: s.code,
                title: s.name,
                icon: getServiceIcon(s.category, s.name),
                desc: s.description || "Servicio técnico certificado.",
                features: [
                  s.category || "Servicio Especializado",
                  `Tiempo estimado: ${s.estimatedMinutes || 30} min`,
                  "Garantía de mano de obra",
                ],
                price: `Desde $${Number(s.price || 0).toFixed(2)}`,
              }))
            );
          }
        }
      } catch (e) {
        console.error("Error al cargar servicios desde Neon DB:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-16 sm:pt-24 pb-24 md:pb-16 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto w-full">
        {/* Hero Section */}
        <div className="mb-10 sm:mb-16 text-center max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4 sm:mb-6">
            Catálogo de Servicios
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
            Ofrecemos una gama completa de servicios automotrices respaldados por expertos y tecnología avanzada para mantener tu vehículo en perfectas condiciones.
          </p>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="py-24 text-center text-zinc-400">
            <div className="inline-block animate-spin text-4xl mb-3">⚙️</div>
            <p className="text-base font-medium">Cargando servicios...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-16 sm:mb-20">
            {services.map((service) => (
              <div key={service.id} className="flex flex-col sm:flex-row bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="sm:w-1/3 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center p-6 sm:p-0">
                  <span className="text-6xl sm:text-7xl">{service.icon}</span>
                </div>
                <div className="sm:w-2/3 p-6 sm:p-8 flex flex-col">
                  <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2 sm:mb-3">{service.title}</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
                    {service.desc}
                  </p>
                  
                  <ul className="mb-6 sm:mb-8 space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-zinc-700 dark:text-zinc-300">
                        <svg className="w-4 h-4 mr-2 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{service.price}</span>
                    <Link href={`/agendar?service=${service.id}`} className="min-h-[44px] px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors inline-flex items-center justify-center">
                      Agendar
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Guarantee Banner */}
        <div className="bg-zinc-900 dark:bg-zinc-900 text-white rounded-3xl p-6 sm:p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between shadow-xl">
          <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
            <h3 className="text-xl sm:text-2xl font-bold mb-3">Garantía de Satisfacción Total</h3>
            <p className="text-zinc-400 text-sm sm:text-base">Todos nuestros servicios cuentan con garantía sobre mano de obra y repuestos. Tu seguridad y la de tu familia es nuestra máxima prioridad.</p>
          </div>
          <div className="md:w-1/3 flex justify-center md:justify-end">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-3xl sm:text-4xl">🏅</span>
            </div>
          </div>
        </div>

      </main>
      <Footer />
      <PublicMobileNav />
    </div>
  );
}
