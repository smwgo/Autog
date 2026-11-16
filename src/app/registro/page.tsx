"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface VehicleDraft {
  plate: string;
  brand: string;
  model: string;
  year: string;
  vehicleType: string;
}

export default function RegistroPage() {
  const [tipoFactura, setTipoFactura] = useState('persona');
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [direccion, setDireccion] = useState('');
  const [vehiculos, setVehiculos] = useState<VehicleDraft[]>([
    { plate: '', brand: '', model: '', year: '', vehicleType: 'Auto' },
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();

  const updateVehiculo = (idx: number, field: keyof VehicleDraft, value: string) => {
    setVehiculos((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: field === 'plate' ? value.toUpperCase() : value } : v))
    );
  };

  const addVehiculo = () => {
    setVehiculos((prev) => [
      ...prev,
      { plate: '', brand: '', model: '', year: '', vehicleType: 'Auto' },
    ]);
  };

  const removeVehiculo = (idx: number) => {
    setVehiculos((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const vehiculosValidos = vehiculos
        .filter((v) => v.plate.trim() || v.brand.trim() || v.model.trim())
        .map((v) => ({
          plate: v.plate.trim().toUpperCase(),
          brand: v.brand.trim(),
          model: v.model.trim(),
          year: v.year.trim() || null,
          vehicleType: v.vehicleType || 'Auto',
        }));

      for (const v of vehiculosValidos) {
        if (!v.plate || !v.brand || !v.model) {
          throw new Error('Completa Placa, Marca y Modelo para cada vehículo ingresado.');
        }
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          whatsapp,
          email,
          password,
          tipoFactura,
          direccion,
          vehiculos: vehiculosValidos,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al crear la cuenta');
      }

      // Procesar posible solicitud pendiente guardada en la sesión
      try {
        const pendingReqStr = sessionStorage.getItem('autoG_pendingRequest');
        if (pendingReqStr) {
          const req = JSON.parse(pendingReqStr);
          if (req.isService) {
            alert(`¡Cuenta creada con éxito! Tu servicio para ${req.productName} ha sido procesado.`);
            sessionStorage.removeItem('autoG_pendingRequest');
            router.push('/cliente/citas');
          } else {
            alert(`¡Cuenta creada con éxito! Tu repuesto ${req.productName} fue agregado a cotizaciones.`);
            sessionStorage.removeItem('autoG_pendingRequest');
            router.push('/cliente/cotizaciones');
          }
          return;
        }
      } catch {
        // Fallback standard
      }

      alert('¡Cuenta creada exitosamente!');
      router.push('/cliente');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mb-4 flex items-center">
          <Link
            href="/"
            title="Volver al Inicio"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
        <Link href="/" className="flex justify-center items-center gap-2 mb-6 min-h-[44px]">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-2xl flex items-center gap-1.5">
            <span className="text-blue-600 dark:text-blue-500 font-black">Auto</span>
            <span className="text-zinc-400 dark:text-zinc-600 font-light px-0.5">/</span>
            <span className="text-zinc-900 dark:text-white font-black">G</span>
          </span>
        </Link>
        <h2 className="mt-4 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
          Crea tu cuenta
        </h2>
        <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
          O <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 py-1 inline-block">inicia sesión si ya tienes una</Link>
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-zinc-900 py-6 sm:py-8 px-4 shadow-xl shadow-zinc-200/50 dark:shadow-none rounded-2xl sm:rounded-3xl sm:px-10 border border-zinc-200 dark:border-zinc-800">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-5 sm:space-y-6" onSubmit={handleRegister}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Nombre y Apellido */}
              <div className="md:col-span-2">
                <label htmlFor="nombre" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Nombre y Apellido
                </label>
                <div className="mt-1">
                  <input
                    id="nombre"
                    name="nombre"
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="appearance-none block w-full px-4 h-11 sm:h-12 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm bg-zinc-50 dark:bg-zinc-800 dark:text-white transition-colors"
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <label htmlFor="whatsapp" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Número de WhatsApp
                </label>
                <div className="mt-1">
                  <input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="Ej. 0991234567"
                    className="appearance-none block w-full px-4 h-11 sm:h-12 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm bg-zinc-50 dark:bg-zinc-800 dark:text-white transition-colors"
                  />
                </div>
              </div>

              {/* Correo */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Correo Electrónico
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="juan@ejemplo.com"
                    className="appearance-none block w-full px-4 h-11 sm:h-12 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm bg-zinc-50 dark:bg-zinc-800 dark:text-white transition-colors"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="md:col-span-2">
                <label htmlFor="password" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="appearance-none block w-full px-4 h-11 sm:h-12 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm bg-zinc-50 dark:bg-zinc-800 dark:text-white transition-colors"
                  />
                </div>
              </div>

              {/* Tipo de Facturación */}
              <div className="md:col-span-2 border-t border-zinc-200 dark:border-zinc-800 pt-5 sm:pt-6 mt-1 sm:mt-2">
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">
                  ¿A nombre de quién deseas tu factura?
                </label>
                <div className="flex gap-3 sm:gap-4">
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border-2 cursor-pointer transition-all ${tipoFactura === 'persona' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                    <input type="radio" name="factura" value="persona" className="hidden" onChange={() => setTipoFactura('persona')} checked={tipoFactura === 'persona'} />
                    <span>👤 Persona</span>
                  </label>
                  <label className={`flex-1 flex items-center justify-center gap-2 p-3 min-h-[44px] rounded-xl border-2 cursor-pointer transition-all ${tipoFactura === 'empresa' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                    <input type="radio" name="factura" value="empresa" className="hidden" onChange={() => setTipoFactura('empresa')} checked={tipoFactura === 'empresa'} />
                    <span>🏢 Empresa</span>
                  </label>
                </div>
              </div>

              {/* Dirección */}
              <div className="md:col-span-2">
                <label htmlFor="direccion" className="block text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  Dirección de Facturación
                </label>
                <div className="mt-1">
                  <textarea
                    id="direccion"
                    name="direccion"
                    rows={2}
                    required
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Calle, número, sector y ciudad"
                    className="appearance-none block w-full px-4 py-3 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm bg-zinc-50 dark:bg-zinc-800 dark:text-white transition-colors"
                  ></textarea>
                </div>
              </div>

              {/* Registro de Vehículo(s) */}
              <div className="md:col-span-2 border-t border-zinc-200 dark:border-zinc-800 pt-5 sm:pt-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Registra tu vehículo
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Asocia tu auto desde ahora para agilizar tus citas y pedidos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVehiculo}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    + Agregar otro
                  </button>
                </div>

                {vehiculos.map((v, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                        Vehículo #{idx + 1}
                      </span>
                      {vehiculos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVehiculo(idx)}
                          className="text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={v.plate}
                        onChange={(e) => updateVehiculo(idx, 'plate', e.target.value)}
                        placeholder="Placa (ej. ABC-1234)"
                        className="appearance-none block w-full px-3.5 h-11 border border-zinc-200 dark:border-zinc-700 rounded-xl placeholder-zinc-400 focus:outline-none focus:border-blue-500 text-sm bg-white dark:bg-zinc-900 dark:text-white uppercase"
                      />
                      <select
                        value={v.vehicleType}
                        onChange={(e) => updateVehiculo(idx, 'vehicleType', e.target.value)}
                        className="block w-full px-3.5 h-11 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500 text-sm bg-white dark:bg-zinc-900 dark:text-white"
                      >
                        <option value="Auto">Auto</option>
                        <option value="SUV">SUV</option>
                        <option value="Camioneta">Camioneta</option>
                        <option value="Moto">Moto</option>
                        <option value="Furgoneta">Furgoneta</option>
                      </select>
                      <input
                        type="text"
                        value={v.brand}
                        onChange={(e) => updateVehiculo(idx, 'brand', e.target.value)}
                        placeholder="Marca (ej. Hyundai)"
                        className="appearance-none block w-full px-3.5 h-11 border border-zinc-200 dark:border-zinc-700 rounded-xl placeholder-zinc-400 focus:outline-none focus:border-blue-500 text-sm bg-white dark:bg-zinc-900 dark:text-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={v.model}
                          onChange={(e) => updateVehiculo(idx, 'model', e.target.value)}
                          placeholder="Modelo (ej. Accent)"
                          className="appearance-none block w-full px-3.5 h-11 border border-zinc-200 dark:border-zinc-700 rounded-xl placeholder-zinc-400 focus:outline-none focus:border-blue-500 text-sm bg-white dark:bg-zinc-900 dark:text-white"
                        />
                        <input
                          type="number"
                          value={v.year}
                          onChange={(e) => updateVehiculo(idx, 'year', e.target.value)}
                          placeholder="Año"
                          min="1950"
                          max="2035"
                          className="appearance-none block w-full px-3.5 h-11 border border-zinc-200 dark:border-zinc-700 rounded-xl placeholder-zinc-400 focus:outline-none focus:border-blue-500 text-sm bg-white dark:bg-zinc-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 sm:pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 sm:py-4 px-4 min-h-[48px] items-center border border-transparent rounded-2xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {loading ? 'Creando cuenta...' : 'Crear cuenta y Registrarse'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
