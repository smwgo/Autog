"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface VehicleDraft {
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  vehicleType: string;
  imageUrl: string;
}

function comprimirImagen(file: File, maxSize = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Error al cargar la imagen.'));
    reader.readAsDataURL(file);
  });
}

export default function RegistroPage() {
  const [tipoFactura, setTipoFactura] = useState('persona');
  const [avatar, setAvatar] = useState('');
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [direccion, setDireccion] = useState('');
  const [vehiculos, setVehiculos] = useState<VehicleDraft[]>([
    { plate: '', brand: '', model: '', year: '', color: '', vehicleType: 'Auto', imageUrl: '' },
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
      { plate: '', brand: '', model: '', year: '', color: '', vehicleType: 'Auto', imageUrl: '' },
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
          color: v.color.trim() || null,
          vehicleType: v.vehicleType || 'Auto',
          imageUrl: v.imageUrl || null,
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
          avatar: avatar || null,
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
              {/* Foto de Perfil + Nombre y Apellido */}
              <div className="md:col-span-2 flex items-end gap-3.5">
                <div className="relative group shrink-0">
                  <label
                    title="Subir foto de perfil"
                    className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-colors active:scale-95"
                  >
                    {avatar ? (
                      <img src={avatar} alt="Foto de perfil" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-6 h-6 text-zinc-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const dataUrl = await comprimirImagen(file, 400);
                          setAvatar(dataUrl);
                        } catch {
                          setErrorMessage('No se pudo procesar la foto de perfil.');
                        }
                      }}
                    />
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      title="Quitar foto"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] font-bold shadow cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
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
                      <div className="sm:col-span-2 flex items-center gap-3">
                        <input
                          type="text"
                          value={v.color}
                          onChange={(e) => updateVehiculo(idx, 'color', e.target.value)}
                          placeholder="Color (ej. Blanco, Negro)"
                          className="appearance-none block flex-1 min-w-0 px-3.5 h-11 border border-zinc-200 dark:border-zinc-700 rounded-xl placeholder-zinc-400 focus:outline-none focus:border-blue-500 text-sm bg-white dark:bg-zinc-900 dark:text-white"
                        />
                        <div className="relative group shrink-0">
                          <label
                            title="Subir foto del vehículo"
                            className="relative w-12 h-11 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-colors active:scale-95"
                          >
                            {v.imageUrl ? (
                              <img src={v.imageUrl} alt={`Vehículo ${idx + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-5 h-5 text-zinc-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                              </svg>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const dataUrl = await comprimirImagen(file, 720);
                                  updateVehiculo(idx, 'imageUrl', dataUrl);
                                } catch {
                                  setErrorMessage('No se pudo procesar la foto del vehículo.');
                                }
                              }}
                            />
                          </label>
                          {v.imageUrl && (
                            <button
                              type="button"
                              onClick={() => updateVehiculo(idx, 'imageUrl', '')}
                              title="Quitar foto"
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] font-bold shadow cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
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
