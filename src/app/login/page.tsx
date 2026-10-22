"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-6 sm:p-8 border border-zinc-100 dark:border-zinc-800 relative">
        <Link href="/" aria-label="Volver al inicio" className="absolute top-6 sm:top-8 left-6 sm:left-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -m-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </Link>
        <div className="text-center mb-8 mt-2">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">Acceso al Sistema</h2>
          <p className="text-sm text-zinc-500 mt-2">Introduce tus credenciales para continuar</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Usuario o Correo
            </label>
            <input
              type="text"
              disabled
              className="w-full h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 text-base sm:text-sm text-zinc-900 dark:text-white outline-none cursor-not-allowed opacity-70"
              placeholder="Deshabilitado temporalmente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              disabled
              className="w-full h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-4 text-base sm:text-sm text-zinc-900 dark:text-white outline-none cursor-not-allowed opacity-70"
              placeholder="••••••••"
            />
          </div>

          <button
            type="button"
            disabled
            className="w-full h-12 rounded-xl bg-blue-600/50 text-white font-semibold cursor-not-allowed flex justify-center items-center text-base sm:text-sm"
          >
            Ingresar (Mantenimiento)
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-center text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
            Accesos de Paneles
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mt-4">
            <Link href="/gerencia" className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group text-center">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">📊</span>
              <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Gerencia</span>
            </Link>
            <Link href="/oficina" className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group text-center">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🏢</span>
              <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Oficina</span>
            </Link>
            <Link href="/taller" className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group text-center">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🔧</span>
              <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Garaje/Taller</span>
            </Link>
            <Link href="/presupuestos" className="flex flex-col items-center justify-center p-3 rounded-xl border border-sky-300 dark:border-sky-700/60 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors group text-center shadow-xs">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">📋</span>
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300">Presupuestos</span>
            </Link>
            <Link href="/pos" className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group text-center">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🛒</span>
              <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">POS</span>
            </Link>
            <Link href="/cliente" className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group text-center">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">👤</span>
              <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">Cliente</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
