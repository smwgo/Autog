import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicMobileNav } from "@/components/PublicMobileNav";
import Link from "next/link";

export default function TerminosPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-16 sm:pt-24 pb-24 md:pb-16 px-4 sm:px-6 md:px-12 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500 inline-flex items-center gap-1 mb-4">
            &larr; Volver al Inicio
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
            Términos y Condiciones de Servicio
          </h1>
          <p className="text-sm text-zinc-500">
            Última actualización: {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-10 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6 text-sm sm:text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2">
              1. Aceptación de los términos
            </h2>
            <p>
              Al acceder y utilizar la plataforma Auto/G, aceptas cumplir con los presentes Términos y Condiciones. Si no estás de acuerdo con alguno de ellos, te solicitamos no utilizar nuestros servicios.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2">
              2. Servicios del taller y repuestos
            </h2>
            <p>
              Todos los trabajos de taller mecánico, diagnósticos y reparaciones son realizados por personal calificado. Los repuestos comercializados cuentan con garantía directa contra defectos de fábrica según las especificaciones del fabricante.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2">
              3. Presupuestos y cotizaciones
            </h2>
            <p>
              Las proformas y cotizaciones emitidas a través del sistema tienen una vigencia estándar de 15 días calendario, sujeta a disponibilidad de stock en bodega o fluctuaciones de mercado.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2">
              4. Consultas y soporte
            </h2>
            <p>
              Para cualquier consulta sobre estos términos, contáctanos a través de nuestra{" "}
              <Link href="/contacto" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                página de contacto
              </Link>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
      <PublicMobileNav />
    </div>
  );
}
