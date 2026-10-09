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
          <Link href="/tienda" className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors">Tienda</Link>
          <Link href="/servicios" className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors">Servicios</Link>
          <Link href="/promociones" className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors">Promociones</Link>
          <Link href="/contacto" className="hover:text-blue-600 dark:hover:text-blue-500 transition-colors">Contacto</Link>
        </nav>
        <div className="flex items-center gap-5 text-zinc-600 dark:text-zinc-300">
          <button aria-label="Toggle Theme" className="hover:text-blue-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
          </button>
          
          <button aria-label="Notificaciones" className="hover:text-blue-600 transition-colors relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </button>
          <Link href="/login" aria-label="Iniciar Sesión" className="hover:text-blue-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
