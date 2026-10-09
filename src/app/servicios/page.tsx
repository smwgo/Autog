import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import Link from "next/link";

export default function ServiciosPage() {
  const allServices = [
    {
      id: "mantenimiento-preventivo",
      title: "Mantenimiento Preventivo",
      icon: "🛠️",
      desc: "Cambio de aceite, filtros de aire y cabina, revisión de fluidos y chequeo general de seguridad. Esencial para prolongar la vida de tu motor.",
      features: ["Aceite sintético/semi-sintético", "Filtros originales", "Revisión de 30 puntos"],
      price: "Desde $45.00"
    },
    {
      id: "alineacion-balanceo",
      title: "Alineación y Balanceo",
      icon: "⚖️",
      desc: "Ajuste láser preciso para el tren delantero y trasero para evitar el desgaste irregular de los neumáticos y mejorar el control.",
      features: ["Alineación láser 3D", "Balanceo computarizado", "Rotación de llantas"],
      price: "Desde $35.00"
    },
    {
      id: "frenos-suspension",
      title: "Frenos y Suspensión",
      icon: "🛑",
      desc: "Revisión profunda, rectificado de discos, cambio de pastillas y diagnóstico de amortiguadores para una conducción segura.",
      features: ["Pastillas cerámicas", "Rectificación de discos", "Líquido DOT4"],
      price: "Desde $60.00"
    },
    {
      id: "diagnostico-computarizado",
      title: "Diagnóstico Computarizado",
      icon: "💻",
      desc: "Escaneo completo de sensores, motor y sistemas electrónicos con escáner OBD2 avanzado para detectar fallas ocultas.",
      features: ["Borrado de códigos", "Informe detallado", "Revisión de check engine"],
      price: "Desde $25.00"
    },
    {
      id: "sistema-electrico",
      title: "Sistema Eléctrico",
      icon: "⚡",
      desc: "Reparación de alternadores, motores de arranque, cableado y diagnóstico de baterías y fusibles.",
      features: ["Prueba de batería", "Mantenimiento de alternador", "Luces y accesorios"],
      price: "Según diagnóstico"
    },
    {
      id: "aire-acondicionado",
      title: "Aire Acondicionado",
      icon: "❄️",
      desc: "Recarga de gas refrigerante, detección de fugas, cambio de compresor y limpieza de ductos para máximo confort.",
      features: ["Gas ecológico", "Detección UV de fugas", "Filtro antipolen"],
      price: "Desde $40.00"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
        
        {/* Hero Section */}
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6">
            Catálogo de Servicios
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Ofrecemos una gama completa de servicios automotrices respaldados por expertos y tecnología avanzada para mantener tu vehículo en perfectas condiciones.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
          {allServices.map((service) => (
            <div key={service.id} className="flex flex-col sm:flex-row bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="sm:w-1/3 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center p-8 sm:p-0">
                <span className="text-7xl">{service.icon}</span>
              </div>
              <div className="sm:w-2/3 p-8 flex flex-col">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">{service.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm leading-relaxed">
                  {service.desc}
                </p>
                
                <ul className="mb-8 space-y-2">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-zinc-700 dark:text-zinc-300">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{service.price}</span>
                  <Link href={`/agendar?service=${service.id}`} className="px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                    Agendar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Guarantee Banner */}
        <div className="bg-zinc-900 dark:bg-zinc-900 text-white rounded-3xl p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between shadow-xl">
          <div className="md:w-2/3 mb-6 md:mb-0 md:pr-8">
            <h3 className="text-2xl font-bold mb-3">Garantía de Satisfacción Total</h3>
            <p className="text-zinc-400">Todos nuestros servicios cuentan con garantía sobre mano de obra y repuestos. Tu seguridad y la de tu familia es nuestra máxima prioridad.</p>
          </div>
          <div className="md:w-1/3 flex justify-center md:justify-end">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-4xl">🏅</span>
            </div>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
