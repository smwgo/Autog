"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";

function NuevoUsuarioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [totalUsuariosExistentes, setTotalUsuariosExistentes] = useState<number>(0);
  const limiteAlcanzado = !editId && totalUsuariosExistentes >= 14;

  // Datos del Usuario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [pinCode, setPinCode] = useState("1234");
  const [role, setRole] = useState("POS");
  const [branch, setBranch] = useState("Principal");
  const [status, setStatus] = useState("Activo");

  // Accesos a Paneles calculados automáticamente según el Rol
  const [accessOficina, setAccessOficina] = useState<boolean>(false);
  const [accessPos, setAccessPos] = useState<boolean>(true);
  const [accessTaller, setAccessTaller] = useState<boolean>(false);

  const handleSelectPanel = (panelId: string) => {
    setRole(panelId);
    if (panelId === "Oficina") {
      setAccessOficina(true);
      setAccessPos(false);
      setAccessTaller(false);
    } else if (panelId === "POS") {
      setAccessOficina(false);
      setAccessPos(true);
      setAccessTaller(false);
    } else if (panelId === "Taller") {
      setAccessOficina(false);
      setAccessPos(false);
      setAccessTaller(true);
    } else if (panelId === "Presupuesto" || panelId === "Propuesta") {
      setAccessOficina(true);
      setAccessTaller(true);
      setAccessPos(false);
    } else if (panelId === "Gerencia") {
      setAccessOficina(true);
      setAccessPos(true);
      setAccessTaller(true);
    } else {
      setAccessOficina(false);
      setAccessPos(false);
      setAccessTaller(false);
    }
  };

  useEffect(() => {
    const verificarLimiteYCargar = async () => {
      try {
        if (!editId) {
          setPinCode(String(Math.floor(1000 + Math.random() * 9000)));
        }
        setCargando(true);
        const res = await fetch("/api/gerencia/usuarios", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setTotalUsuariosExistentes(data.filter((item: any) => !item.isProtected).length);
          if (editId) {
            const u = data.find((item: any) => item.id === editId);
            if (u) {
              setNombre(u.name || "");
              const uEmail = u.email || "";
              setEmail(uEmail.toLowerCase().endsWith("@gmail.com") ? uEmail.replace(/@gmail\.com$/i, "") : uEmail);
              setPinCode(u.pinCode || "1234");
              setRole(u.role || "Taller");
              setBranch(u.branch || "Principal");
              setStatus(u.status || "Activo");
              setAccessOficina(Boolean(u.accessOficina));
              setAccessPos(Boolean(u.accessPos));
              setAccessTaller(Boolean(u.accessTaller));
            }
          }
        }
      } catch (err) {
        console.error("Error al cargar datos del usuario:", err);
      } finally {
        setCargando(false);
      }
    };

    verificarLimiteYCargar();
  }, [editId]);

  const handleBranchChange = (newBranch: string) => {
    setBranch(newBranch);
    if (newBranch.toLowerCase().includes("sucursal")) {
      // En Sucursal solo se permite POS o Taller
      if (role !== "POS" && role !== "Taller") {
        handleSelectPanel("Taller");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nombre.trim();
    let rawEmail = email.trim().toLowerCase();

    if (!cleanName || !rawEmail) {
      setErrorMsg("Completa el nombre y correo del usuario.");
      return;
    }

    const isSucursal = branch.toLowerCase().includes("sucursal");
    if (isSucursal && role !== "POS" && role !== "Taller") {
      setErrorMsg("En Sucursal únicamente se permite acceso a POS o Taller.");
      return;
    }

    if (!editId && totalUsuariosExistentes >= 14) {
      setErrorMsg("Límite máximo alcanzado: solo se permite un máximo de 14 usuarios entre ambas sedes.");
      return;
    }

    const finalEmail = rawEmail.includes("@") ? rawEmail : `${rawEmail}@gmail.com`;

    try {
      setGuardando(true);
      setErrorMsg(null);

      const payload: any = {
        id: editId || undefined,
        name: cleanName,
        email: finalEmail,
        pinCode: pinCode.trim() || "1234",
        role: role.trim() || "Taller",
        branch: branch.trim() || "Principal",
        status,
        accessOficina,
        accessPos,
        accessTaller,
      };

      const res = await fetch("/api/gerencia/usuarios", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "No se pudo guardar la información del usuario.");
        setGuardando(false);
        return;
      }

      router.push("/gerencia/usuarios?guardado=1");
    } catch (err: any) {
      console.error("Error al guardar usuario:", err);
      setErrorMsg("Error de conexión al guardar usuario.");
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex items-center justify-center">
        <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl my-2 sm:my-auto text-zinc-900 dark:text-white">
          {/* Cabecera */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/80 mb-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Link
                href="/gerencia/usuarios"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-95 transition-all"
                title="Volver"
                aria-label="Volver"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  {editId ? "Editar Usuario" : "Nuevo Usuario"}
                </h1>
                {!editId && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      limiteAlcanzado
                        ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800"
                        : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    {totalUsuariosExistentes} / 14 usuarios
                  </span>
                )}
              </div>
            </div>

            <Link
              href="/gerencia/usuarios"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              title="Cerrar"
            >
              ✕
            </Link>
          </div>

          {/* Banner de Límite Alcanzado (Máx 14) */}
          {limiteAlcanzado && (
            <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <p className="font-bold">Límite de 14 usuarios alcanzado ({totalUsuariosExistentes}/14)</p>
                <p className="mt-0.5 opacity-90 text-xs leading-relaxed">
                  Solo se permite un máximo de 14 usuarios en total (Sede Principal + Sucursal). Para crear un usuario nuevo, debes eliminar o editar uno existente.
                </p>
              </div>
            </div>
          )}

          {/* Mensaje de error si ocurre */}
          {errorMsg && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {cargando ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">Cargando...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
              {/* Campos de Entrada */}
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Nombre *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Nombre completo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>Correo *</span>
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">@gmail.com por defecto</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        required
                        type="text"
                        placeholder="ej. taller"
                        value={email}
                        onChange={(e) => {
                          let val = e.target.value.trim().toLowerCase();
                          if (val.endsWith("@gmail.com")) {
                            val = val.replace(/@gmail\.com$/, "");
                          }
                          setEmail(val);
                        }}
                        className="w-full h-11 sm:h-12 pl-3.5 sm:pl-4 pr-24 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
                      />
                      <div className="absolute right-2 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 select-none pointer-events-none">
                        @gmail.com
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      PIN *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="4821"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>Acceso *</span>
                      {branch.toLowerCase().includes("sucursal") && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">POS o Taller</span>
                      )}
                    </label>
                    <select
                      value={role === "Presupuesto" ? "Propuesta" : role}
                      onChange={(e) => handleSelectPanel(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3 sm:px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-colors font-medium cursor-pointer"
                    >
                      <option value="POS">🛒 POS</option>
                      {!branch.toLowerCase().includes("sucursal") && <option value="Oficina">🏢 Oficina</option>}
                      <option value="Taller">🔧 Taller</option>
                      {!branch.toLowerCase().includes("sucursal") && <option value="Propuesta">📋 Propuesta</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Sucursal
                    </label>
                    <select
                      value={branch.toLowerCase().includes("sucursal") ? "Sucursal" : "Principal"}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3 sm:px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="Principal">Principal</option>
                      <option value="Sucursal">Sucursal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Estado
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full h-11 sm:h-12 px-3 sm:px-3.5 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 text-base sm:text-sm text-zinc-900 dark:text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Suspendido">Suspendido</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="pt-5 sm:pt-6 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-end gap-3 sm:gap-4">
                <button
                  type="submit"
                  disabled={guardando || limiteAlcanzado}
                  className={`w-full sm:w-auto h-11 sm:h-12 px-7 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg ${
                    limiteAlcanzado
                      ? "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed shadow-none"
                      : "bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-blue-600/25 cursor-pointer disabled:opacity-50"
                  }`}
                >
                  {guardando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : limiteAlcanzado ? (
                    <span>Límite 14/14 Alcanzado</span>
                  ) : (
                    <span>Guardar</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <GerenciaMobileNav />
    </div>
  );
}

export default function NuevoUsuarioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NuevoUsuarioContent />
    </Suspense>
  );
}
