"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicMobileNav } from "@/components/PublicMobileNav";
import { useState } from "react";
import Link from "next/link";

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "LANDING",
          customerName: formData.name || "Cliente Landing",
          customerEmail: formData.email || null,
          itemsSummary: `Consulta de Repuesto / Contacto: ${formData.subject || "Cotización"}`,
          notes: formData.message || null,
        }),
      });
    } catch (err) {
      console.error("Error al enviar solicitud:", err);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-16 sm:pt-24 pb-24 md:pb-20 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto w-full">
        {/* Botón Regresar */}
        <div className="mb-6 flex items-center">
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
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-6">
            Ponte en Contacto
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Estamos aquí para ayudarte. Si tienes alguna duda, sugerencia o necesitas cotizar un servicio, no dudes en escribirnos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          
          {/* Contact Info */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Box 1: Address */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Visítanos</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Av. Principal 1234, Zona Industrial.<br />
                Ciudad, País, 10001
              </p>
            </div>

            {/* Box 2: Contact */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Llámanos o Escríbenos</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-1">
                <strong>Teléfono:</strong> +1 (555) 123-4567
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                <strong>Email:</strong> contacto@taller-autog.com
              </p>
            </div>

            {/* Box 3: Hours */}
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Horario de Atención</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-1">
                <strong>Lunes - Viernes:</strong> 08:00 AM - 06:00 PM
              </p>
              <p className="text-zinc-600 dark:text-zinc-400">
                <strong>Sábados:</strong> 09:00 AM - 02:00 PM
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-8 md:p-12 shadow-xl border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 sm:mb-8">Envíanos un Mensaje</h2>
            
            {isSubmitted ? (
              <div className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-6 rounded-2xl border border-green-200 dark:border-green-800 flex items-center">
                <svg className="w-8 h-8 mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <div>
                  <h4 className="font-bold text-lg mb-1">¡Mensaje enviado con éxito!</h4>
                  <p className="text-sm">Gracias por contactarnos. Nos comunicaremos contigo lo más pronto posible.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Tu Nombre *</label>
                    <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="Ej. Juan Pérez" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Tu Correo *</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="juan@ejemplo.com" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Asunto *</label>
                  <input required type="text" name="subject" value={formData.subject} onChange={handleChange} className="w-full px-4 h-11 sm:h-12 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100" placeholder="Ej. Cotización de servicio" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Mensaje *</label>
                  <textarea required name="message" value={formData.message} onChange={handleChange} rows={5} className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-base sm:text-sm text-zinc-900 dark:text-zinc-100 resize-none" placeholder="Escribe tu mensaje aquí..." />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-xl font-bold transition-all disabled:opacity-70 mt-2 flex items-center justify-center text-base sm:text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Enviando...
                    </>
                  ) : (
                    'Enviar Mensaje'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <PublicMobileNav />
    </div>
  );
}
