import Link from "next/link";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { VehicleSearch } from "@/components/VehicleSearch";
import { ServicesOverview } from "@/components/ServicesOverview";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow">
        <Hero />
        <section id="buscar-repuestos" className="py-16 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Encuentra productos compatibles
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              Selecciona tu vehículo y te mostraremos exactamente lo que necesitas.
            </p>
          </div>
          <VehicleSearch />
        </section>
        
        <ServicesOverview />
      </main>
      <Footer />
    </div>
  );
}
