"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { TallerMobileNav } from "@/components/TallerMobileNav";
import ModalNuevaOrdenTrabajo from "@/components/taller/ModalNuevaOrdenTrabajo";

function NuevaOrdenContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const placa = searchParams.get("placa") || "";
  const cliente = searchParams.get("cliente") || "";
  const editId = searchParams.get("editId") || "";
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "err" } | null>(null);

  const mostrarToast = (msg: string, tipo: "ok" | "err" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-100/60 dark:bg-[#070709] text-zinc-900 dark:text-white font-sans pb-28 md:pb-12 selection:bg-blue-500/30">
      <Header />

      {toast && (
        <div
          className={`fixed top-20 right-4 z-[80] px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm font-semibold animate-fade-in ${
            toast.tipo === "err"
              ? "bg-rose-600 text-white border-rose-500"
              : "bg-emerald-600 text-white border-emerald-500"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <main className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-7">
        <ModalNuevaOrdenTrabajo
          isOpen={true}
          isPageMode={true}
          placaInicial={placa}
          clienteInicial={cliente}
          editOrderId={editId}
          onClose={() => {
            router.push("/taller");
          }}
          onOrdenCreada={(orden) => {
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("taller_orden_activa_id", String(orden.id));
              } catch {}
            }
          }}
          mostrarToast={mostrarToast}
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
          Cargando orden de trabajo...
        </div>
      }
    >
      <NuevaOrdenContent />
    </Suspense>
  );
}
