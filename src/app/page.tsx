import Link from "next/link";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { VehicleSearch } from "@/components/VehicleSearch";
import { Footer } from "@/components/Footer";
import { PublicMobileNav } from "@/components/PublicMobileNav";

export default function Home() {
  return (
    <div className="flex flex-col min-h-dvh bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pb-20 md:pb-0">
        <Hero />
        <section id="buscar-repuestos" className="py-8 sm:py-16 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto">
          <VehicleSearch />
        </section>
      </main>
      <Footer />
      <PublicMobileNav />
    </div>
  );
}
