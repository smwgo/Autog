"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicMobileNav } from "@/components/PublicMobileNav";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

interface ServiceOption {
  id: string;
  code?: string;
  title: string;
}

function BookingForm() {
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get("service");
  const promoParam = searchParams.get("promo");
  
  const [servicesList, setServicesList] = useState<ServiceOption[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    brand: "",
    model: "",
    year: "",
    plate: "",
    serviceId: "",
    date: "",
    time: "",
    notes: promoParam ? `Promoción aplicada: ${promoParam}` : "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/servicios-taller?activos=true");
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.servicios)) {
          const mapped: ServiceOption[] = data.servicios.map((s: any) => ({
            id: s.id,
            code: s.code,
            title: s.name,
          }));
          setServicesList(mapped);
          if (serviceParam && mapped.some((m) => m.id === serviceParam || m.code === serviceParam)) {
            setFormData((prev) => ({ ...prev, serviceId: serviceParam }));
          }
        }
      } catch (e) {
        console.error("Error al cargar servicios para agenda:", e);
      }
    }
    fetchServices();
  }, [serviceParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const servicioTitulo = servicesList.find(s => s.id === formData.serviceId || s.code === formData.serviceId)?.title || "Servicio General de Taller";
      const vehicleDesc = [formData.brand, formData.model, formData.year, formData.plate ? `Placa: ${formData.plate}` : ""].filter(Boolean).join(" ");
      const fechaHora = formData.date ? `Fecha: ${formData.date} ${formData.time || ""}` : "";

      await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "LANDING",
          customerName: formData.name || "Cliente Landing",
          customerPhone: formData.phone || null,
          customerEmail: formData.email || null,
          vehicleInfo: vehicleDesc || null,
          itemsSummary: `Servicio Landing: ${servicioTitulo}`,
          notes: `${fechaHora} - ${formData.notes || ""}`.trim(),
          totalEstimated: 0,
        }),
      });
    } catch (err) {
      console.error("Error al registrar solicitud en Neon DB:", err);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-10 md:p-16 shadow-xl border border-zinc-200 dark:border-zinc-800 text-center max-w-2xl mx-auto">
        <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">¡Cita Agendada con Éxito!</h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-lg">
          Hemos recibido tu solicitud, {formData.name || 'cliente'}. Te hemos enviado un correo de confirmación con los detalles de tu cita para el <strong>{formData.date}</strong> a las <strong>{formData.time}</strong>.
        </p>
        <Link href="/" className="inline-block bg-blue-600 text-white px-8 py-4 rounded-full font-semibold hover:bg-blue-700 transition-colors">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-8 md:p-12 shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-4xl mx-auto">
      <div className="mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center">
          <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
          Tus Datos Personales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Nombre Completo *</label>
            <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="Ej. Juan Pérez" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Correo Electrónico *</label>
            <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="juan@ejemplo.com" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Teléfono *</label>
            <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="Ej. 0991234567" />
          </div>
        </div>
      </div>

      <div className="mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center">
          <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
          Datos del Vehículo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Marca *</label>
            <input required type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="Ej. Toyota" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Modelo *</label>
            <input required type="text" name="model" value={formData.model} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="Ej. Corolla" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Año *</label>
            <input required type="number" name="year" value={formData.year} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="Ej. 2018" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Placa</label>
            <input type="text" name="plate" value={formData.plate} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="Ej. ABC-1234" />
          </div>
        </div>
      </div>

      <div className="mb-8 sm:mb-10">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center">
          <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
          Detalles de la Cita
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Servicio Requerido *</label>
            <select required name="serviceId" value={formData.serviceId} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100">
              <option value="" disabled>Seleccione un servicio de taller...</option>
              {servicesList.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Fecha Deseada *</label>
            <input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Hora Preferida *</label>
            <input required type="time" name="time" value={formData.time} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Comentarios Adicionales</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="Describa cualquier problema específico o solicitud..." />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-10 h-12 rounded-xl sm:rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center text-base sm:text-sm cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Procesando...
            </>
          ) : (
            'Confirmar Cita'
          )}
        </button>
      </div>
    </form>
  );
}

export default function AgendarPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-16 sm:pt-24 pb-24 md:pb-20 px-4 sm:px-6 md:px-12 w-full">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3 sm:mb-4">
            Agenda tu Servicio
          </h1>
          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
            Completa el formulario a continuación y reserva un espacio en nuestro taller. Te confirmaremos a la brevedad.
          </p>
        </div>
        
        <Suspense fallback={<div className="text-center py-20">Cargando formulario...</div>}>
          <BookingForm />
        </Suspense>
      </main>
      <Footer />
      <PublicMobileNav />
    </div>
  );
}
