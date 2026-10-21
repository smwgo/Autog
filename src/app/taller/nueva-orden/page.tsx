"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";
import ModalNuevaOrdenTrabajo from "@/components/taller/ModalNuevaOrdenTrabajo";

function NuevaOrdenContent() {
  const searchParams = useSearchParams();
  const placa = searchParams.get("placa") || "";
  const cliente = searchParams.get("cliente") || "";

  return (
    <div className="flex flex-col min-h-screen bg-zinc-100/60 dark:bg-[#070709] text-zinc-900 dark:text-white font-sans pb-28 md:pb-12 selection:bg-blue-500/30">
      <Header />

      <main className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-7">
        <ModalNuevaOrdenTrabajo
          isOpen={true}
          isPageMode={true}
          placaInicial={placa}
          clienteInicial={cliente}
          onClose={() => {}}
          onOrdenCreada={(orden) => {
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("taller_orden_activa_id", String(orden.id));
              } catch {}
            }
          }}
          mostrarToast={() => {}}
        />
      </main>

      <TallerMobileNav />
    </div>
  );
}

export default function NuevaOrdenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] flex items-center justify-center text-zinc-500 text-sm">
          Cargando nueva orden de trabajo...
        </div>
      }
    >
      <NuevaOrdenContent />
    </Suspense>
  );
}
