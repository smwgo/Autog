import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PublicMobileNav } from "@/components/PublicMobileNav";
import Link from "next/link";

export default function PrivacidadPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-16 sm:pt-24 pb-24 md:pb-16 px-4 sm:px-6 md:px-12 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500 inline-flex items-center gap-1 mb-4">
            &larr; Volver al Inicio
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
            Política de Privacidad
          </h1>
          <p className="text-sm text-zinc-500">
            Última actualización: {new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-10 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6 text-sm sm:text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2">
              1. Información que recopilamos
            </h2>
            <p>
              En Auto/G recopilamos información personal que nos proporcionas directamente al registrarte, agendar un servicio, solicitar repuestos o contactar a nuestro equipo (como nombre, teléfono, correo electrónico, datos de facturación y placa o modelo del vehículo).
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2">
              2. Uso de la información
            </h2>
            <p>
              Utilizamos tus datos exclusivamente para gestionar las órdenes de trabajo del taller, emitir comprobantes autorizados, coordinar la entrega o retiro de repuestos y brindarte soporte técnico personalizado sobre el mantenimiento de tu vehículo.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2">
              3. Protección y seguridad
            </h2>
            <p>
              Tus contraseñas se almacenan mediante algoritmos de cifrado unidireccional y las conexiones a nuestra base de datos se ejecutan a través de protocolos seguros con cifrado TLS/SSL.
            </p>
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2">
              4. Contacto y derechos
            </h2>
            <p>
              Puedes solicitar en cualquier momento la actualización o eliminación de tus datos personales comunicándote a través de nuestra{" "}
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
