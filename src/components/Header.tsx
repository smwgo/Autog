import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-6 md:px-12">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tighter text-blue-600 dark:text-blue-500">AutoPro</span>
        </Link>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors">Inicio</Link>
          <Link href="#tienda" className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors">Tienda</Link>
          <Link href="#servicios" className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors">Servicios</Link>
          <Link href="/portal/vehiculos" className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors">Mi Vehículo</Link>
          <Link href="#promociones" className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors">Promociones</Link>
          <Link href="#contacto" className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors">Contacto</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/auth/login" className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-blue-600 transition-colors">
            Iniciar sesión
          </Link>
          <Link href="/agendar" className="hidden md:inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all">
            Agendar servicio
          </Link>
        </div>
      </div>
    </header>
  );
}
