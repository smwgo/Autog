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

  // Paso actual (1: Datos del usuario, 2: Accesos a la aplicación)
  const [paso, setPaso] = useState<1 | 2>(1);
  const [cargando, setCargando] = useState(Boolean(editId));
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Paso 1: Datos del Usuario
  const [tipoPerfil, setTipoPerfil] = useState<"Operador" | "Administrador">("Operador");
  const [identificacion, setIdentificacion] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [pinCode, setPinCode] = useState("1234");
  const [role, setRole] = useState("Especialista");
  const [branch, setBranch] = useState("Sede Principal");
  const [status, setStatus] = useState("Activo");

  // Paso 2: Accesos a Paneles (Oficina, POS, Taller / Garaje)
  const [accessOficina, setAccessOficina] = useState<boolean>(false);
  const [accessPos, setAccessPos] = useState<boolean>(false);
  const [accessTaller, setAccessTaller] = useState<boolean>(true);

  useEffect(() => {
    if (!editId) {
      setPinCode(String(Math.floor(1000 + Math.random() * 9000)));
      return;
    }

    const cargarUsuario = async () => {
      try {
        setCargando(true);
        const res = await fetch("/api/gerencia/usuarios", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          const u = data.find((item: any) => item.id === editId);
          if (u) {
            setTipoPerfil(
              u.role?.toLowerCase().includes("admin") ? "Administrador" : "Operador"
            );
            setIdentificacion(u.identification || "");
            setNombre(u.name || "");
            setTelefono(u.phone || "");
            setEmail(u.email || "");
            setPinCode(u.pinCode || "1234");
            setRole(u.role || "Especialista");
            setBranch(u.branch || "Sede Principal");
            setStatus(u.status || "Activo");
            setAccessOficina(Boolean(u.accessOficina));
            setAccessPos(Boolean(u.accessPos));
            setAccessTaller(Boolean(u.accessTaller));
          }
        }
      } catch (err) {
        console.error("Error al cargar datos del usuario:", err);
      } finally {
        setCargando(false);
      }
    };

    cargarUsuario();
  }, [editId]);

  const handleSiguiente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      setErrorMsg("Completa el nombre completo y el correo electrónico del usuario.");
      return;
    }
    setErrorMsg(null);
    setPaso(2);
  };

  const handleSubmitFinal = async () => {
    try {
      setGuardando(true);
      setErrorMsg(null);

      const payload: any = {
        id: editId || undefined,
        identification: identificacion.trim() || undefined,
        name: nombre.trim(),
        email: email.trim().toLowerCase(),
        phone: telefono.trim() || undefined,
        pinCode: pinCode.trim() || "1234",
        role:
          role.trim() ||
          (tipoPerfil === "Administrador" ? "Administrador" : "Operador"),
        branch: branch.trim() || "Sede Principal",
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
      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar la información del usuario.");
      }

      router.push("/gerencia/usuarios");
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white font-sans selection:bg-blue-600 selection:text-white pb-24 md:pb-0">
      <Header />

      <main className="flex-grow flex items-start sm:items-center justify-center p-3 sm:p-6 md:p-12 relative overflow-y-auto pb-12 sm:pb-8">
        {/* Glow de fondo ambiental sutil en celeste/azul idéntico a Nuevo Cliente en POS */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[800px] h-[250px] sm:h-[450px] bg-blue-600/15 blur-[100px] sm:blur-[140px] pointer-events-none rounded-full" />

        {/* Card Contenedor Estilo Onboarding */}
        <div className="relative w-full max-w-4xl lg:max-w-5xl bg-zinc-900/95 border border-zinc-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-12 shadow-2xl backdrop-blur-xl my-2 sm:my-auto">
          {/* Header Superior */}
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              {paso === 1 ? (
                <Link
                  href="/gerencia/usuarios"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 transition-all"
                  title="Volver a Usuarios"
                  aria-label="Volver"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setPaso(1)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
                  title="Volver al paso anterior"
                  aria-label="Volver al paso anterior"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              )}
              <h1 className="text-base sm:text-xl font-medium text-white tracking-tight">
                {editId
                  ? paso === 1
                    ? "Editar Usuario"
                    : "Editar Accesos a Paneles"
                  : paso === 1
                  ? "Registro de Usuario"
                  : "Accesos a la Aplicación"}
              </h1>
            </div>

            <Link
              href="/gerencia/usuarios"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 active:scale-95 transition-all"
              title="Cerrar y volver a Usuarios"
            >
              ✕
            </Link>
          </div>

          {/* Barra de Progreso por Pasos */}
          <div className="flex items-center gap-3 mb-5 sm:mb-8">
            <div className="flex-1 flex gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-blue-600 transition-all duration-300" />
              <div
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  paso === 2 ? "bg-blue-600" : "bg-zinc-800"
                }`}
              />
            </div>
            <span className="text-xs font-mono text-zinc-400 shrink-0 font-medium">
              {paso} de 2
            </span>
          </div>

          {/* Mensaje de error si ocurre */}
          {errorMsg && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs sm:text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {cargando ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">Cargando datos del usuario...</p>
            </div>
          ) : (
            <>
              {/* PASO 1: DATOS DEL USUARIO */}
              {paso === 1 && (
                <form onSubmit={handleSiguiente} className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-200 mb-2.5 sm:mb-3">
                      Perfil
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setTipoPerfil("Operador");
                          if (role === "Administrador") setRole("Especialista");
                        }}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          tipoPerfil === "Operador"
                            ? "bg-blue-500/10 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                            : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                            tipoPerfil === "Operador"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-white/[0.05] text-zinc-400"
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="font-medium text-xs sm:text-sm text-white">Operador / Técnico</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTipoPerfil("Administrador");
                          setRole("Administrador");
                          setAccessOficina(true);
                          setAccessPos(true);
                          setAccessTaller(true);
                        }}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-left flex items-center gap-2.5 sm:gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          tipoPerfil === "Administrador"
                            ? "bg-blue-500/10 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                            : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                            tipoPerfil === "Administrador"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-white/[0.05] text-zinc-400"
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        </div>
                        <span className="font-medium text-xs sm:text-sm text-white">Administrador</span>
                      </button>
                    </div>
                  </div>

                  {/* Campos de Entrada */}
                  <div className="space-y-3.5 sm:space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Cédula / Identificación
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0912345678"
                          value={identificacion}
                          onChange={(e) => setIdentificacion(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          WhatsApp
                        </label>
                        <input
                          type="tel"
                          inputMode="tel"
                          placeholder="0991234567"
                          value={telefono}
                          onChange={(e) => setTelefono(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                        Nombres y Apellidos *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Carlos Rodríguez"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Correo Electrónico *
                        </label>
                        <input
                          required
                          type="email"
                          placeholder="usuario@autog.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          PIN / Clave de Acceso *
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="4821"
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Cargo / Rol
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Jefe de Taller, Cajera POS, Contabilidad..."
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Sucursal
                        </label>
                        <input
                          type="text"
                          placeholder="Sede Principal"
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-950/60 text-base sm:text-sm text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Barra Inferior */}
                  <div className="pt-5 sm:pt-6 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
                    <span className="text-xs text-zinc-500 text-center sm:text-left">
                      {editId ? "Paso 1: Modifica los datos del usuario" : "Paso 1: Datos principales del usuario"}
                    </span>

                    <button
                      type="submit"
                      className="w-full sm:w-auto h-12 px-7 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
                    >
                      <span>Continuar</span>
                      <span>&rarr;</span>
                    </button>
                  </div>
                </form>
              )}

              {/* PASO 2: ACCESOS A LOS PANELES DE LA APLICACIÓN (OFICINA, POS, TALLER/GARAJE) */}
              {paso === 2 && (
                <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-zinc-200 mb-2.5 sm:mb-3">
                      Selecciona a qué paneles de la aplicación tendrá acceso este usuario:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      {/* Panel Oficina */}
                      <button
                        type="button"
                        onClick={() => setAccessOficina(!accessOficina)}
                        className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          accessOficina
                            ? "bg-blue-500/15 border-blue-500 text-white shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                            : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors shrink-0 ${
                              accessOficina
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-white/[0.05] text-zinc-400"
                            }`}
                          >
                            🏢
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              accessOficina
                                ? "bg-blue-600 text-white"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {accessOficina ? "✓ Activo" : "Sin acceso"}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base text-white">Oficina</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Compras, proveedores, facturación y contabilidad
                          </p>
                        </div>
                      </button>

                      {/* Panel POS */}
                      <button
                        type="button"
                        onClick={() => setAccessPos(!accessPos)}
                        className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          accessPos
                            ? "bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                            : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors shrink-0 ${
                              accessPos
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-white/[0.05] text-zinc-400"
                            }`}
                          >
                            🛒
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              accessPos
                                ? "bg-emerald-600 text-white"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {accessPos ? "✓ Activo" : "Sin acceso"}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base text-white">POS</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Punto de venta, caja, despacho y clientes
                          </p>
                        </div>
                      </button>

                      {/* Panel Taller / Garaje */}
                      <button
                        type="button"
                        onClick={() => setAccessTaller(!accessTaller)}
                        className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          accessTaller
                            ? "bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30"
                            : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20 text-zinc-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors shrink-0 ${
                              accessTaller
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-white/[0.05] text-zinc-400"
                            }`}
                          >
                            🔧
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              accessTaller
                                ? "bg-amber-600 text-white"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {accessTaller ? "✓ Activo" : "Sin acceso"}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base text-white">Taller / Garaje</p>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Recepción, inspección, lubricentro y órdenes
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Estado de Cuenta y Resumen */}
                  <div className="space-y-3.5 sm:space-y-4 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-950/60 border border-zinc-800/80 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Estado del Usuario
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full h-11 sm:h-12 px-3 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white outline-none focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="Activo">Activo (Con acceso habilitado)</option>
                          <option value="Suspendido">Suspendido (Acceso bloqueado)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                          Resumen de Credenciales
                        </label>
                        <div className="h-11 sm:h-12 px-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs">
                          <span className="text-zinc-300 truncate">{email || "Sin correo"}</span>
                          <span className="font-mono font-bold text-blue-400 shrink-0 ml-2">
                            PIN: {pinCode}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Barra Inferior */}
                  <div className="pt-5 sm:pt-6 border-t border-zinc-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => setPaso(1)}
                      className="w-full sm:w-auto h-11 sm:h-12 px-5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/50 text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span>&larr;</span>
                      <span>Atrás</span>
                    </button>

                    <button
                      type="button"
                      disabled={guardando}
                      onClick={handleSubmitFinal}
                      className="w-full sm:w-auto h-12 px-7 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {guardando ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <span>{editId ? "Guardar Cambios" : "Finalizar y Guardar"}</span>
                          <span>✓</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
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
