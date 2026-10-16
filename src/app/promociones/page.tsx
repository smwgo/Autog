"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicMobileNav } from "@/components/PublicMobileNav";
import Link from "next/link";
import { useEffect, useState } from "react";

interface PromoItem {
  id: string;
  code: string;
  title: string;
  description: string;
  discount: string;
  validUntil: string;
  color: string;
  image: string;
}

const colorVariants = [
  "from-blue-600 to-blue-400",
  "from-red-600 to-orange-500",
  "from-purple-600 to-pink-500",
  "from-emerald-600 to-teal-400",
  "from-amber-600 to-yellow-500",
];

function getPromoEmoji(category: string = "", title: string = ""): string {
  const text = (category + " " + title).toLowerCase();
  if (text.includes("aceite") || text.includes("filtro")) return "🛢️";
  if (text.includes("freno") || text.includes("pastilla")) return "🛑";
  if (text.includes("llanta") || text.includes("alineación")) return "🛞";
  if (text.includes("escáner") || text.includes("diagnóstico")) return "💻";
  if (text.includes("batería") || text.includes("eléctrico")) return "⚡";
  return "🏷️";
}

export default function PromocionesPage() {
  const [promociones, setPromociones] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPromotions() {
      try {
        const res = await fetch("/api/pos/promociones");
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.promociones)) {
          const activas = data.promociones.filter((p: any) => p.active !== false);
          const mapped: PromoItem[] = activas.map((p: any, idx: number) => ({
            id: p.id,
            code: p.code,
            title: p.title,
            description: `Aprovecha un ${p.discountType === "PERCENT" ? `${p.discountValue}%` : `$${p.discountValue}`} de descuento en ${p.category || "nuestros servicios"}. ${p.minPurchase > 0 ? `Compra mínima: $${p.minPurchase}.` : "Sin monto mínimo."}`,
            discount: p.discountType === "PERCENT" ? `-${p.discountValue}%` : `-$${p.discountValue}`,
            validUntil: p.validUntil || "Válido este mes",
            color: colorVariants[idx % colorVariants.length],
            image: getPromoEmoji(p.category, p.title),
          }));
          setPromociones(mapped);
        }
      } catch (e) {
        console.error("Error al cargar promociones de Neon DB:", e);
      } finally {
        setLoading(false);
      }
    }

    loadPromotions();
  }, []);

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-16 sm:pt-24 pb-24 md:pb-20 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <span className="inline-block py-1 px-3 rounded-full bg-red-100 text-red-600 font-semibold text-xs sm:text-sm mb-3 sm:mb-4">
            OFERTAS LIMITADAS
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4 sm:mb-6">
            Promociones
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
            Aprovecha nuestros descuentos exclusivos para mantener tu vehículo en óptimas condiciones al mejor precio.
          </p>
        </div>

        {loading ? (
          <div className="py-24 text-center text-zinc-400">
            <div className="inline-block animate-spin text-4xl mb-3">⚙️</div>
            <p className="text-base font-medium">Cargando promociones vigentes desde Neon DB...</p>
          </div>
        ) : promociones.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 max-w-md mx-auto">
            <span className="text-5xl block mb-3">🏷️</span>
            <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              No hay promociones activas en este momento
            </h3>
            <p className="text-xs text-zinc-500">
              Vuelve a consultar pronto o visita nuestro taller para promociones personalizadas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {promociones.map((promo) => (
              <div key={promo.id} className="relative group rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                {/* Card Header with Gradient */}
                <div className={`h-32 bg-gradient-to-r ${promo.color} p-6 flex items-start justify-between relative overflow-hidden`}>
                  <div className="absolute -right-4 -top-4 text-7xl opacity-30 group-hover:scale-110 transition-transform duration-500">
                    {promo.image}
                  </div>
                  <div className="z-10">
                    <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-bold shadow-sm">
                      {promo.discount}
                    </span>
                  </div>
                </div>
                
                {/* Card Body */}
                <div className="p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">{promo.title}</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
                    {promo.description}
                  </p>
                  <div className="flex items-center text-sm font-medium text-zinc-500 dark:text-zinc-500 mb-6 sm:mb-8">
                    <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Válido hasta: {promo.validUntil}
                  </div>
                  
                  <Link href={`/agendar?promo=${encodeURIComponent(promo.code)}`} className="flex items-center justify-center w-full min-h-[44px] py-3 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-center rounded-xl font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-colors text-base sm:text-sm">
                    Reclamar Promoción ({promo.code})
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Newsletter / Notifications */}
        <div className="mt-16 sm:mt-24 bg-blue-600 rounded-3xl p-6 sm:p-8 md:p-12 flex flex-col md:flex-row items-center justify-between text-white shadow-xl relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
          
          <div className="md:w-1/2 z-10 mb-6 sm:mb-8 md:mb-0 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">¿No quieres perderte ninguna oferta?</h3>
            <p className="text-blue-100 text-base sm:text-lg">Regístrate en nuestro boletín y recibe descuentos exclusivos directamente en tu correo.</p>
          </div>
          <div className="md:w-1/2 z-10 w-full md:pl-12">
            <form className="flex flex-col sm:flex-row gap-3" onSubmit={(e) => { e.preventDefault(); alert("¡Gracias por suscribirte!"); }}>
              <input type="email" required placeholder="Tu correo electrónico" className="flex-grow px-5 sm:px-6 h-12 sm:h-14 rounded-full text-zinc-900 focus:outline-none focus:ring-4 focus:ring-blue-400/50 text-base sm:text-sm bg-white" />
              <button type="submit" className="bg-zinc-900 text-white px-8 h-12 sm:h-14 rounded-full font-bold hover:bg-zinc-800 transition-colors whitespace-nowrap min-h-[48px] flex items-center justify-center text-base sm:text-sm cursor-pointer">
                Suscribirme
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
      <PublicMobileNav />
    </div>
  );
}
