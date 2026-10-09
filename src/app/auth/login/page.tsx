"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  const handleDevLogin = async (role: string) => {
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      username: `dev_${role.toLowerCase()}`,
      password: "dev", // The password doesn't matter for the backdoor
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      // Si el rol es cliente, enviarlo a sus vehículos
      if (role === 'CLIENTE') {
        window.location.href = '/portal/vehiculos';
      } else {
        window.location.href = `/${role.toLowerCase()}`;
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8 border border-zinc-100 dark:border-zinc-800 relative">
        <Link href="/" aria-label="Volver al inicio" className="absolute top-8 left-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </Link>
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold tracking-tighter text-blue-600 dark:text-blue-500 mb-2 block">
            AutoPro
          </Link>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white">Acceso al Sistema</h2>
          <p className="text-sm text-zinc-500 mt-2">Introduce tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Usuario o Correo
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="ej: admin / admin@autopro.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-4 text-zinc-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-zinc-600 dark:text-zinc-400">
                Recordar sesión
              </label>
            </div>
            <Link href="/auth/recovery" className="text-sm font-medium text-blue-600 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 transition-all flex justify-center items-center"
          >
            {loading ? "Iniciando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-center text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
            Accesos Rápidos (Desarrollo)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <button type="button" onClick={() => handleDevLogin('GERENCIA')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">📊</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Gerencia</span>
            </button>
            <button type="button" onClick={() => handleDevLogin('OFICINA')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🏢</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Oficina</span>
            </button>
            <button type="button" onClick={() => handleDevLogin('TALLER')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🔧</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Taller</span>
            </button>
            <button type="button" onClick={() => handleDevLogin('POS')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🛒</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">POS</span>
            </button>
            <button type="button" onClick={() => handleDevLogin('CLIENTE')} className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group col-span-2 md:col-span-1">
              <span className="text-lg mb-1 group-hover:scale-110 transition-transform">🚗</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Cliente</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
