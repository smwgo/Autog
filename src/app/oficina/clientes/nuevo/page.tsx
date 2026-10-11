"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";

export default function NuevoClientePage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Propietario / Empresa
    tipoCliente: "Personal",
    identificacion: "",
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    esVip: false,

    // Vehículo
    placa: "",
    marca: "",
    modelo: "",
    anio: new Date().getFullYear().toString(),
    color: "",
    kilometraje: "",
    vin: "",
    combustible: "Gasolina",

    // Observaciones iniciales
    notas: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.identificacion.trim() || !formData.nombre.trim() || !formData.telefono.trim()) {
      alert("Por favor completa los campos obligatorios: Identificación, Nombre y Teléfono.");
      return;
    }

    setGuardando(true);

    // Simular guardado
    setTimeout(() => {
      setGuardando(false);
      setMensajeExito(true);
      setTimeout(() => {
        router.push("/oficina/clientes");
      }, 1200);
    }, 600);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-5xl mx-auto w-full">
        {/* Breadcrumb & Volver */}
        <div className="mb-6">
          <Link 
            href="/oficina/clientes" 
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors w-fit"
          >
            &larr; Volver a Clientes
          </Link>
        </div>

        {/* Encabezado */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">👤</span>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Registrar Cliente
              </h1>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              Ficha de registro de cliente y primer vehículo automotriz.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/oficina/clientes"
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              Cancelar
            </Link>
            <button
              onClick={handleSubmit}
              disabled={guardando}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Guardar Cliente</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mensaje de éxito */}
        {mensajeExito && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-sm">¡Cliente registrado exitosamente!</p>
              <p className="text-xs opacity-90">Redirigiendo al listado de clientes...</p>
            </div>
          </div>
        )}

        {/* Formulario Principal */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Tarjeta 1: Información del Propietario / Empresa */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-lg">
                📋
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  1. Datos del Propietario o Empresa
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Información fiscal y canales de contacto.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Tipo de Cliente *
                </label>
                <select
                  name="tipoCliente"
                  value={formData.tipoCliente}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Personal">Persona Natural (Cédula)</option>
                  <option value="Empresa">Empresa / Flota (RUC)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  {formData.tipoCliente === "Empresa" ? "RUC *" : "Cédula / Identificación *"}
                </label>
                <input
                  type="text"
                  name="identificacion"
                  required
                  placeholder={formData.tipoCliente === "Empresa" ? "1790012345001" : "0912345678"}
                  value={formData.identificacion}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  {formData.tipoCliente === "Empresa" ? "Razón Social *" : "Nombres y Apellidos Completos *"}
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder={formData.tipoCliente === "Empresa" ? "Transportes Andinos S.A." : "Juan Carlos Pérez"}
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  name="telefono"
                  required
                  placeholder="0991234567"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="cliente@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Dirección Domiciliaria o de Entrega
                </label>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Av. Principal y Calle Secundaria, Ciudad"
                  value={formData.direccion}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="esVip"
                  checked={formData.esVip}
                  onChange={handleChange}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  ⭐ <span>Marcar como Cliente VIP (Tarifas preferenciales y atención prioritaria)</span>
                </span>
              </label>
            </div>
          </div>

          {/* Tarjeta 2: Datos del Vehículo Inicial */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg">
                🚗
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  2. Vehículo Asociado
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Ficha técnica del vehículo para taller y órdenes de servicio.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Placa de Identificación *
                </label>
                <input
                  type="text"
                  name="placa"
                  placeholder="ABC-1234"
                  value={formData.placa}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm font-bold uppercase tracking-wider outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Marca
                </label>
                <input
                  type="text"
                  name="marca"
                  placeholder="Toyota, Chevrolet, Kia..."
                  value={formData.marca}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Modelo
                </label>
                <input
                  type="text"
                  name="modelo"
                  placeholder="Hilux, D-Max, Sportage..."
                  value={formData.modelo}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Año de Fabricación
                </label>
                <input
                  type="number"
                  name="anio"
                  placeholder="2022"
                  value={formData.anio}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  placeholder="Blanco, Negro, Plata..."
                  value={formData.color}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Kilometraje Actual
                </label>
                <input
                  type="text"
                  name="kilometraje"
                  placeholder="45,000 km"
                  value={formData.kilometraje}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Tipo de Combustible
                </label>
                <select
                  name="combustible"
                  value={formData.combustible}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-sm outline-none focus:border-blue-500 font-medium"
                >
                  <option value="Gasolina">Gasolina</option>
                  <option value="Diésel">Diésel</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Eléctrico">Eléctrico</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Número de Chasis / VIN (Opcional)
                </label>
                <input
                  type="text"
                  name="vin"
                  placeholder="17 dígitos alfanuméricos..."
                  value={formData.vin}
                  onChange={handleChange}
                  className="w-full h-11 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm uppercase tracking-wider outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Notas Adicionales */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              3. Observaciones y Notas
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Historial de mantenimiento previo, requerimientos especiales del cliente o detalles adicionales.
            </p>
            <textarea
              name="notas"
              rows={3}
              placeholder="Ingresa notas relevantes para el equipo del taller o recepción..."
              value={formData.notas}
              onChange={handleChange}
              className="w-full p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500 resize-none"
            ></textarea>
          </div>

          {/* Botones al pie */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/oficina/clientes"
              className="px-6 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={guardando}
              className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Guardar Cliente</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
