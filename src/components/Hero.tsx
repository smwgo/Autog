import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-zinc-900 text-white">
      {/* Background Image Placeholder or Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-black opacity-90 z-0"></div>
      
      <div className="relative z-10 container mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl">
          Todo para tu vehículo <br className="hidden md:block"/> en un solo lugar
        </h1>
        <p className="text-lg md:text-xl text-zinc-300 mb-10 max-w-2xl">
          Encuentra repuestos exactos, agenda servicios de mantenimiento y gestiona el historial de tu auto fácilmente.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mt-8">
          <Link href="#buscar-repuestos" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-all group">
            <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚙️</span>
            <span className="text-sm font-medium">Comprar Repuestos</span>
          </Link>
          <Link href="/agendar" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-all group">
            <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📅</span>
            <span className="text-sm font-medium">Agendar Servicio</span>
          </Link>
          <Link href="/cotizacion" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-all group">
            <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">📄</span>
            <span className="text-sm font-medium">Solicitar Cotización</span>
          </Link>
          <Link href="/portal/vehiculos/nuevo" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 transition-all group">
            <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">🚗</span>
            <span className="text-sm font-medium">Registrar Vehículo</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
