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
  fuelType: string;
  mileage: string;
  imageUrl: string;
}

const emptyVehicle = (): VehicleDraft => ({
  plate: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  vehicleType: 'Auto',
  fuelType: 'Gasolina',
  mileage: '',
  imageUrl: '',
});

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

const inputCls =
  'w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors';
const labelCls = 'block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5';

const IconUser = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);
const IconBuilding = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);
const IconTruck = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);
const IconCamera = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

function PhotoPicker({
  value,
  onChange,
  onRemove,
  icon,
  title,
  onError,
  maxSize,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  onRemove: () => void;
  icon: React.ReactNode;
  title: string;
  onError: (msg: string) => void;
  maxSize: number;
}) {
  return (
    <div className="relative group shrink-0">
      <label
        title={title}
        className={`relative w-[88px] h-[88px] rounded-2xl flex items-center justify-center overflow-hidden cursor-pointer transition-all active:scale-95 ${
          value
            ? 'border border-zinc-300 dark:border-zinc-700'
            : 'border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/60 hover:border-blue-500'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            if (!file.type.startsWith('image/')) {
              onError('Selecciona un archivo de imagen válido.');
              return;
            }
            try {
              onChange(await comprimirImagen(file, maxSize));
            } catch {
              onError('No se pudo procesar la imagen.');
            }
          }}
        />
        {value ? (
          <>
            <img src={value} alt={title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <IconCamera />
            </div>
          </>
        ) : (
          <div className="text-zinc-400 dark:text-zinc-500 group-hover:text-blue-500 transition-colors">{icon}</div>
        )}
      </label>
      {value && (
        <button
          type="button"
          onClick={onRemove}
          title="Eliminar foto"
          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer active:scale-90 z-10"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function OptionCard({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center gap-3 p-3 sm:p-4 min-h-[56px] rounded-2xl border text-left transition-all cursor-pointer active:scale-[0.98] ${
        active
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-zinc-900 dark:text-white'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      <span
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
          active ? 'bg-blue-600/15 text-blue-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
        }`}
      >
        {icon}
      </span>
      <span className="text-sm font-bold">{label}</span>
    </button>
  );
}

export default function RegistroPage() {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [tipoFactura, setTipoFactura] = useState<'persona' | 'empresa'>('persona');
  const [avatar, setAvatar] = useState('');
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [direccion, setDireccion] = useState('');
  const [conVehiculo, setConVehiculo] = useState(true);
  const [vehiculos, setVehiculos] = useState<VehicleDraft[]>([emptyVehicle()]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const router = useRouter();
  const esEmpresa = tipoFactura === 'empresa';

  const updateVehiculo = (idx: number, field: keyof VehicleDraft, value: string) => {
    setVehiculos((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: field === 'plate' ? value.toUpperCase() : value } : v))
    );
  };

  const addVehiculo = () => setVehiculos((prev) => (prev.length >= 10 ? prev : [...prev, emptyVehicle()]));
  const removeVehiculo = (idx: number) =>
    setVehiculos((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const validarPaso1 = (): string | null => {
    if (nombre.trim().length < 2) return esEmpresa ? 'Ingresa la razón social.' : 'Ingresa tus nombres y apellidos.';
    const ced = cedula.replace(/\D/g, '');
    if (esEmpresa ? ced.length !== 13 : ced.length !== 10 && ced.length !== 13)
      return esEmpresa ? 'El RUC debe tener 13 dígitos.' : 'La cédula debe tener 10 dígitos.';
    const wa = whatsapp.replace(/\D/g, '').replace(/^0+/, '');
    if (wa.length !== 9) return 'Ingresa un WhatsApp válido (9 dígitos después de +593).';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Ingresa un correo electrónico válido.';
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    return null;
  };

  const continuar = () => {
    const err = validarPaso1();
    setErrorMessage(err);
    if (!err) setPaso(2);
  };

  const handleRegister = async () => {
    setErrorMessage(null);
    const err1 = validarPaso1();
    if (err1) {
      setErrorMessage(err1);
      setPaso(1);
      return;
    }
    setLoading(true);

    try {
      const vehiculosValidos = conVehiculo
        ? vehiculos
            .filter((v) => v.plate.trim() || v.brand.trim() || v.model.trim())
            .map((v) => ({
              plate: v.plate.trim().toUpperCase(),
              brand: v.brand.trim(),
              model: v.model.trim(),
              year: v.year.trim() || null,
              color: v.color.trim() || null,
              vehicleType: v.vehicleType || 'Auto',
              fuelType: v.fuelType || 'Gasolina',
              mileage: v.mileage.replace(/\D/g, '') || null,
              imageUrl: v.imageUrl || null,
            }))
        : [];

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
          cedula: cedula.replace(/\D/g, ''),
          whatsapp: `+593${whatsapp.replace(/\D/g, '').replace(/^0+/, '')}`,
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

      try {
        const pendingReqStr = sessionStorage.getItem('autoG_pendingRequest');
        if (pendingReqStr) {
          const req = JSON.parse(pendingReqStr);
          sessionStorage.removeItem('autoG_pendingRequest');
          if (req.isService) {
            alert(`¡Cuenta creada con éxito! Tu servicio para ${req.productName} ha sido procesado.`);
            router.push('/cliente/citas');
          } else {
            alert(`¡Cuenta creada con éxito! Tu repuesto ${req.productName} fue agregado a cotizaciones.`);
            router.push('/cliente/cotizaciones');
          }
          return;
        }
      } catch {
        // continuar con flujo estándar
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
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 font-sans">
      <div className="w-full sm:mx-auto sm:max-w-2xl">
        <div className="bg-white dark:bg-zinc-900 py-5 sm:py-7 px-4 sm:px-8 shadow-xl shadow-zinc-200/50 dark:shadow-none rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800">
          {/* Encabezado */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => (paso === 2 ? setPaso(1) : router.push('/'))}
                title="Volver"
                className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors active:scale-95 shrink-0 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white truncate">Crea tu cuenta</h1>
            </div>
            <Link
              href="/"
              title="Cerrar"
              className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors active:scale-95 shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Link>
          </div>

          {/* Progreso */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 h-1.5 rounded-full bg-blue-600" />
            <div className={`flex-1 h-1.5 rounded-full transition-colors ${paso === 2 ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            <span className="text-xs font-mono text-zinc-500 shrink-0 ml-1">{paso} de 2</span>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (paso === 1) continuar();
              else handleRegister();
            }}
            className="space-y-5"
          >
            {paso === 1 ? (
              <>
                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-2.5">Tipo</p>
                  <div className="flex gap-3">
                    <OptionCard active={!esEmpresa} onClick={() => setTipoFactura('persona')} icon={<IconUser className="w-5 h-5" />} label="Persona" />
                    <OptionCard active={esEmpresa} onClick={() => setTipoFactura('empresa')} icon={<IconBuilding className="w-5 h-5" />} label="Empresa" />
                  </div>
                </div>

                {/* Foto + Nombre */}
                <div className="flex items-center gap-4">
                  <PhotoPicker
                    value={avatar}
                    onChange={setAvatar}
                    onRemove={() => setAvatar('')}
                    icon={esEmpresa ? <IconBuilding /> : <IconUser />}
                    title={esEmpresa ? 'Subir logo' : 'Subir foto'}
                    onError={setErrorMessage}
                    maxSize={400}
                  />
                  <div className="flex-1 min-w-0">
                    <label htmlFor="nombre" className={labelCls}>
                      {esEmpresa ? 'Razón Social' : 'Nombres y Apellidos'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="nombre"
                      type="text"
                      autoCapitalize="words"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder={esEmpresa ? 'Ej. Transportes ABC S.A.' : 'Ej. Juan Pérez'}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label htmlFor="cedula" className={labelCls}>{esEmpresa ? 'RUC' : 'Cédula'} <span className="text-rose-500">*</span></label>
                    <input
                      id="cedula"
                      type="text"
                      inputMode="numeric"
                      maxLength={13}
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                      placeholder={esEmpresa ? '0912345678001' : '0912345678'}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div>
                    <label htmlFor="whatsapp" className={labelCls}>WhatsApp <span className="text-rose-500">*</span></label>
                    <div className="flex h-11 sm:h-12 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 focus-within:border-blue-500 transition-colors overflow-hidden">
                      <span className="flex items-center px-3 sm:px-3.5 border-r border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-base sm:text-sm font-mono font-semibold text-zinc-600 dark:text-zinc-400 select-none shrink-0">
                        +593
                      </span>
                      <input
                        id="whatsapp"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                        placeholder="991234567"
                        className="flex-1 min-w-0 h-full px-3 sm:px-3.5 bg-transparent text-base sm:text-sm font-mono text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className={labelCls}>Correo Electrónico <span className="text-rose-500">*</span></label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cliente@ejemplo.com"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="direccion" className={labelCls}>Dirección</label>
                    <input
                      id="direccion"
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Av. Principal y Secundaria"
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="password" className={labelCls}>Contraseña <span className="text-rose-500">*</span></label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={inputCls}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-2.5">Vehículo</p>
                  <div className="flex gap-3">
                    <OptionCard active={conVehiculo} onClick={() => setConVehiculo(true)} icon={<IconTruck className="w-5 h-5" />} label="Vehículo" />
                    <OptionCard
                      active={!conVehiculo}
                      onClick={() => setConVehiculo(false)}
                      icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      }
                      label="Omitir"
                    />
                  </div>
                </div>

                {conVehiculo && (
                  <div className="space-y-4">
                    {vehiculos.map((v, idx) => (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-4"
                      >
                        {vehiculos.length > 1 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Vehículo #{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeVehiculo(idx)}
                              className="text-xs font-semibold text-rose-500 hover:text-rose-600 cursor-pointer"
                            >
                              Quitar
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <PhotoPicker
                            value={v.imageUrl}
                            onChange={(url) => updateVehiculo(idx, 'imageUrl', url)}
                            onRemove={() => updateVehiculo(idx, 'imageUrl', '')}
                            icon={<IconTruck />}
                            title="Subir foto del vehículo"
                            onError={setErrorMessage}
                            maxSize={720}
                          />
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 min-w-0">
                            <div>
                              <label className={labelCls}>Placa del Vehículo</label>
                              <input
                                type="text"
                                autoCapitalize="characters"
                                value={v.plate}
                                onChange={(e) => updateVehiculo(idx, 'plate', e.target.value)}
                                placeholder="ABC-1234"
                                className={`${inputCls} font-mono uppercase font-bold`}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Marca</label>
                              <input
                                type="text"
                                autoCapitalize="words"
                                value={v.brand}
                                onChange={(e) => updateVehiculo(idx, 'brand', e.target.value)}
                                placeholder="Toyota, Chevrolet, Hyundai..."
                                className={inputCls}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                          <div>
                            <label className={labelCls}>Modelo</label>
                            <input
                              type="text"
                              autoCapitalize="words"
                              value={v.model}
                              onChange={(e) => updateVehiculo(idx, 'model', e.target.value)}
                              placeholder="Hilux, D-Max, Tucson..."
                              className={inputCls}
                            />
                          </div>
                          <div className="grid grid-cols-2 sm:col-span-2 gap-3 sm:gap-4">
                            <div>
                              <label className={labelCls}>Año</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="1950"
                                max="2035"
                                value={v.year}
                                onChange={(e) => updateVehiculo(idx, 'year', e.target.value)}
                                placeholder="2024"
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Combustible</label>
                              <select
                                value={v.fuelType}
                                onChange={(e) => updateVehiculo(idx, 'fuelType', e.target.value)}
                                className={`${inputCls} cursor-pointer`}
                              >
                                <option value="Gasolina">Gasolina</option>
                                <option value="Diésel">Diésel</option>
                                <option value="Híbrido">Híbrido</option>
                                <option value="Eléctrico">Eléctrico</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                          <div>
                            <label className={labelCls}>Tipo</label>
                            <select
                              value={v.vehicleType}
                              onChange={(e) => updateVehiculo(idx, 'vehicleType', e.target.value)}
                              className={`${inputCls} cursor-pointer`}
                            >
                              <option value="Auto">Auto</option>
                              <option value="SUV">SUV</option>
                              <option value="Camioneta">Camioneta</option>
                              <option value="Moto">Moto</option>
                              <option value="Furgoneta">Furgoneta</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Color</label>
                            <input
                              type="text"
                              autoCapitalize="words"
                              value={v.color}
                              onChange={(e) => updateVehiculo(idx, 'color', e.target.value)}
                              placeholder="Ej. Blanco, Negro, Plata..."
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Kilometraje</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={v.mileage}
                              onChange={(e) => updateVehiculo(idx, 'mileage', e.target.value)}
                              placeholder="Ej. 45,000 km"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {vehiculos.length < 10 && (
                      <button
                        type="button"
                        onClick={addVehiculo}
                        className="w-full h-11 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-colors cursor-pointer"
                      >
                        + Agregar otro vehículo
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Barra inferior */}
            <div className="pt-5 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
              {paso === 1 ? (
                <p className="text-xs text-zinc-500">
                  ¿Ya tienes cuenta?{' '}
                  <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
                    Inicia sesión
                  </Link>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="w-full sm:w-auto h-11 sm:h-12 px-5 rounded-xl border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  ← Atrás
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto h-11 sm:h-12 px-7 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {paso === 1 ? 'Continuar →' : loading ? 'Creando cuenta...' : 'Crear cuenta ✓'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
