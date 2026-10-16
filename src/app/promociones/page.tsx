import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicMobileNav } from "@/components/PublicMobileNav";
import Link from "next/link";
import Image from "next/image";

export default function PromocionesPage() {
  const promociones = [
    {
      id: 1,
      title: "Pack Cambio de Aceite + Filtros",
      description: "Recibe gratis el filtro de cabina al realizar tu cambio de aceite sintético con nosotros.",
      discount: "Filtro Gratis",
      validUntil: "31 de Octubre",
      color: "from-blue-600 to-blue-400",
      image: "🛢️"
    },
    {
      id: 2,
      title: "20% OFF en Frenos Cerámicos",
      description: "Seguridad primero. Obtén un 20% de descuento en la compra e instalación de pastillas de freno de cerámica.",
      discount: "-20%",
      validUntil: "15 de Noviembre",
      color: "from-red-600 to-orange-500",
      image: "🛑"
    },
    {
      id: 3,
      title: "Diagnóstico Escáner Mitad de Precio",
      description: "Si realizas la reparación sugerida por el escáner con nosotros, el costo del diagnóstico te sale a mitad de precio.",
      discount: "-50%",
      validUntil: "Válido todo el año",
      color: "from-purple-600 to-pink-500",
      image: "💻"
    }
  ];

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
                
                <Link href="/agendar" className="flex items-center justify-center w-full min-h-[44px] py-3 px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-center rounded-xl font-semibold hover:bg-zinc-800 dark:hover:bg-white transition-colors text-base sm:text-sm">
                  Reclamar Promoción
                </Link>
              </div>
            </div>
          ))}
        </div>
        
        {/* Newsletter / Notifications */}
        <div className="mt-16 sm:mt-24 bg-blue-600 rounded-3xl p-6 sm:p-8 md:p-12 flex flex-col md:flex-row items-center justify-between text-white shadow-xl relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
          
          <div className="md:w-1/2 z-10 mb-6 sm:mb-8 md:mb-0 text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">¿No quieres perderte ninguna oferta?</h3>
            <p className="text-blue-100 text-base sm:text-lg">Regístrate en nuestro boletín y recibe descuentos exclusivos directamente en tu correo.</p>
          </div>
          <div className="md:w-1/2 z-10 w-full md:pl-12">
            <form className="flex flex-col sm:flex-row gap-3">
              <input type="email" placeholder="Tu correo electrónico" className="flex-grow px-5 sm:px-6 h-12 sm:h-14 rounded-full text-zinc-900 focus:outline-none focus:ring-4 focus:ring-blue-400/50 text-base sm:text-sm bg-white" />
              <button type="button" className="bg-zinc-900 text-white px-8 h-12 sm:h-14 rounded-full font-bold hover:bg-zinc-800 transition-colors whitespace-nowrap min-h-[48px] flex items-center justify-center text-base sm:text-sm">
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
