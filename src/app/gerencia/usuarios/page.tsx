"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";

interface AppUserRecord {
  id: string;
  identification?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  username?: string | null;
  pinCode: string;
  role: string;
  branch: string;
  accessOficina: boolean;
  accessPos: boolean;
  accessTaller: boolean;
  status: string;
  lastAccess: string;
  createdAt: string;
}

function obtenerAccesoUnico(row: AppUserRecord): string {
  const roleUpper = (row.role || "").toUpperCase();
  if (roleUpper === "PRESUPUESTO" || roleUpper === "PRESUPUESTOS" || roleUpper === "PROPUESTA" || roleUpper === "PROPUESTAS") return "Propuesta";
  if (roleUpper === "OFICINA") return "Oficina";
  if (roleUpper === "TALLER") return "Taller";
  if (roleUpper === "POS") return "POS";
  if (roleUpper === "CLIENTE") return "Cliente";

  if (row.accessPos) return "POS";
  if (row.accessTaller) return "Taller";
  if (row.accessOficina) return "Oficina";
  return row.role || "Sin rol";
}

interface SeccionUsuariosGrupoProps {
  titulo: string;
  icono: string;
  color: "blue" | "amber";
  lista: AppUserRecord[];
  cargando: boolean;
  eliminandoId: string | null;
  totalUsuarios: number;
  onSolicitarEliminar: (id: string, name: string) => void;
}

function SeccionUsuariosGrupo({
  titulo,
  icono,
  color,
  lista,
  cargando,
  eliminandoId,
  totalUsuarios,
  onSolicitarEliminar,
}: SeccionUsuariosGrupoProps) {
  return (
    <div className="space-y-3.5">
      {/* Encabezado del Grupo */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              color === "blue" ? "bg-blue-500" : "bg-amber-500"
            }`}
          />
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>
              {icono} {titulo}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                color === "blue"
                  ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                  : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
              }`}
            >
              {lista.length} {lista.length === 1 ? "usuario" : "usuarios"}
            </span>
          </h2>
        </div>
      </div>

      {cargando && lista.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm">Cargando usuarios...</p>
        </div>
      ) : lista.length === 0 ? (
        <div className="p-7 text-center bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3 ${
              color === "blue"
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600"
                : "bg-amber-50 dark:bg-amber-500/10 text-amber-600"
            }`}
          >
            {icono}
          </div>
          {totalUsuarios >= 14 ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold cursor-not-allowed">
              🔒 Límite de 14 usuarios alcanzado
            </span>
          ) : (
            <Link
              href="/gerencia/usuarios/nuevo"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                color === "blue"
                  ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                  : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
              }`}
            >
              <span>+</span> Registrar en {titulo}
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Vista Móvil (Tarjetas con Número de Fila y 1 Acceso Único) */}
          <div className="md:hidden space-y-3">
            {lista.map((row, idx) => {
              const esAdmin = row.role?.toLowerCase().includes("admin");
              const acceso = obtenerAccesoUnico(row);

              return (
                <div
                  key={row.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${
                            esAdmin
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                          }`}
                        >
                          {row.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="absolute -top-1.5 -left-1.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-1 leading-tight shadow-2xs">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {row.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                          PIN: {row.pinCode}
                        </p>
                      </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/gerencia/usuarios/nuevo?id=${row.id}`}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-blue-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-500/10 active:scale-95 transition-all shadow-xs cursor-pointer"
                        title="Editar en Formulario"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </Link>
                      <button
                        onClick={() => onSolicitarEliminar(row.id, row.name)}
                        disabled={eliminandoId === row.id}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Datos secundarios */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium px-1">
                      {row.email}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-zinc-900 dark:text-zinc-200">
                        {acceso}
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                        {row.branch}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vista Tabla Desktop con Columna # y 1 Acceso Único por Correo */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                    <th className="w-14 px-4 py-4 font-semibold text-center text-zinc-400 dark:text-zinc-500">
                      #
                    </th>
                    <th className="px-6 py-4 font-medium">Usuario</th>
                    <th className="px-6 py-4 font-medium">Correo Electrónico</th>
                    <th className="px-6 py-4 font-medium">Acceso</th>
                    <th className="px-6 py-4 font-medium">Sucursal</th>
                    <th className="px-6 py-4 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {lista.map((row, idx) => {
                    const esAdmin = row.role?.toLowerCase().includes("admin");
                    const acceso = obtenerAccesoUnico(row);

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors"
                      >
                        <td className="w-14 px-4 py-4 text-center font-bold text-xs text-zinc-400 dark:text-zinc-500">
                          {idx + 1}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                                esAdmin
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                              }`}
                            >
                              {row.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                PIN: {row.pinCode}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs text-zinc-900 dark:text-zinc-200 font-medium">
                            {row.email}
                          </span>
                        </td>

                        {/* Acceso: solo texto */}
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-xs">
                          <span className="font-medium text-zinc-900 dark:text-zinc-200">
                            {acceso}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-xs">
                          <span className="font-medium text-zinc-900 dark:text-zinc-200">{row.branch}</span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/gerencia/usuarios/nuevo?id=${row.id}`}
                              className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors inline-flex items-center justify-center"
                              title="Editar Datos y Accesos"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </Link>

                            <button
                              onClick={() => onSolicitarEliminar(row.id, row.name)}
                              disabled={eliminandoId === row.id}
                              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              title="Eliminar Usuario"
                            >
                              {eliminandoId === row.id ? (
                                <svg className="w-4 h-4 animate-spin text-rose-600" fill="none" viewBox="0 0 24 24">
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"
                                  ></path>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs sm:text-sm text-zinc-500">
              <span>
                {lista.length} {lista.length === 1 ? "usuario" : "usuarios"} en {titulo}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function GestionUsuarios() {
  const [todosUsuarios, setTodosUsuarios] = useState<AppUserRecord[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("todos");
  const [filtroMenuAbierto, setFiltroMenuAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [tabSucursal, setTabSucursal] = useState<"todas" | "principal" | "sucursal">("todas");

  // Eliminación y Toast idénticos a Clientes en POS
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const mostrarToast = (texto: string, tipo: "exito" | "error" = "exito") => {
    setToast({ tipo, texto });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const cargarUsuarios = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await fetch("/api/gerencia/usuarios", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar usuarios");
      }

      setTodosUsuarios(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con la base de datos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // Filtrado instantáneo en memoria
  const usuarios = useMemo(() => {
    return todosUsuarios.filter((u) => {
      const q = busqueda.trim().toLowerCase();
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.identification && u.identification.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.branch && u.branch.toLowerCase().includes(q)) ||
        (u.pinCode && u.pinCode.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const acceso = obtenerAccesoUnico(u).toLowerCase();
      if (filtro === "pos") return acceso === "pos";
      if (filtro === "oficina") return acceso === "oficina";
      if (filtro === "taller") return acceso === "taller";
      if (filtro === "propuesta" || filtro === "presupuesto") return acceso === "propuesta" || acceso === "presupuesto";
      if (filtro === "activo") return u.status === "Activo";
      if (filtro === "suspendido") return u.status !== "Activo";

      return true;
    });
  }, [todosUsuarios, busqueda, filtro]);

  // Separación nítida entre Sede Principal y Sucursal
  const usuariosPrincipal = useMemo(() => {
    return usuarios.filter((u) => !u.branch || !u.branch.toLowerCase().includes("sucursal"));
  }, [usuarios]);

  const usuariosSucursal = useMemo(() => {
    return usuarios.filter((u) => Boolean(u.branch && u.branch.toLowerCase().includes("sucursal")));
  }, [usuarios]);

  const stats = useMemo(() => {
    return {
      totalUsuarios: todosUsuarios.length,
      totalPrincipal: todosUsuarios.filter(
        (u) => !u.branch || !u.branch.toLowerCase().includes("sucursal")
      ).length,
      totalSucursal: todosUsuarios.filter(
        (u) => Boolean(u.branch && u.branch.toLowerCase().includes("sucursal"))
      ).length,
      totalPos: todosUsuarios.filter((u) => obtenerAccesoUnico(u) === "POS").length,
      totalOficina: todosUsuarios.filter((u) => obtenerAccesoUnico(u) === "Oficina").length,
      totalTaller: todosUsuarios.filter((u) => obtenerAccesoUnico(u) === "Taller").length,
      totalActivos: todosUsuarios.filter((u) => u.status === "Activo").length,
      totalSuspendidos: todosUsuarios.filter((u) => u.status !== "Activo").length,
    };
  }, [todosUsuarios]);

  const solicitarEliminar = (id: string, name: string) => {
    setUsuarioAEliminar({ id, name });
  };

  const confirmarEliminacion = async () => {
    if (!usuarioAEliminar) return;
    const { id, name } = usuarioAEliminar;

    try {
      setEliminandoId(id);
      const res = await fetch(`/api/gerencia/usuarios?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        mostrarToast(data.error || "No se pudo eliminar el usuario.", "error");
        return;
      }

      setUsuarioAEliminar(null);
      mostrarToast(`Usuario "${name}" eliminado correctamente.`, "exito");
      await cargarUsuarios();
    } catch (err: any) {
      mostrarToast("Error al eliminar usuario: " + err.message, "error");
    } finally {
      setEliminandoId(null);
    }
  };

  const labelFiltroActual =
    filtro === "oficina"
      ? "Oficina"
      : filtro === "pos"
      ? "POS"
      : filtro === "taller"
      ? "Taller / Garaje"
      : filtro === "propuesta" || filtro === "presupuesto"
      ? "Propuesta"
      : "Todos";

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full flex flex-col">
        {/* Header - Idéntico al estilo Clientes en POS */}
        <div className="order-1 mb-4 sm:mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/gerencia"
              title="Volver a Panel Gerencia"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg
                className="w-5 h-5 transition-transform group-hover:-translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
              Usuarios
            </h1>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20 shrink-0">
              {stats.totalUsuarios} / 14
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {stats.totalUsuarios >= 14 ? (
              <button
                type="button"
                onClick={() =>
                  mostrarToast(
                    "Has alcanzado el límite máximo de 14 usuarios permitidos entre ambas sedes.",
                    "error"
                  )
                }
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-not-allowed"
                title="Límite máximo de 14 usuarios alcanzado"
              >
                <span>🔒</span>
                <span>Límite 14/14</span>
              </button>
            ) : (
              <Link
                href="/gerencia/usuarios/nuevo"
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nuevo Usuario</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mensaje de Error si ocurre */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-rose-800 dark:text-rose-300 text-sm">
            <span>⚠️ {error}</span>
            <button
              onClick={() => cargarUsuarios()}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Resumen Cards Desplegable con accesos directos por Sede */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-2 sm:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-8">
            {/* Total Usuarios */}
            <div
              onClick={() => setTabSucursal("todas")}
              title="Ver todas las sedes"
              className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer shadow-sm flex items-center gap-3 sm:gap-4 backdrop-blur-sm ${
                tabSucursal === "todas"
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 ring-2 ring-blue-500/20"
                  : "bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 text-blue-500 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
                👥
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {cargando && stats.totalUsuarios === 0 ? "..." : `${stats.totalUsuarios} / 14`}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                  Total Usuarios (Máx 14)
                </h3>
              </div>
            </div>

            {/* Sede Principal */}
            <div
              onClick={() => setTabSucursal("principal")}
              title="Filtrar por Sede Principal"
              className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer shadow-sm flex items-center gap-3 sm:gap-4 backdrop-blur-sm ${
                tabSucursal === "principal"
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 ring-2 ring-blue-500/20"
                  : "bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
                🏢
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {cargando && stats.totalUsuarios === 0 ? "..." : stats.totalPrincipal}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                  Sede Principal
                </h3>
              </div>
            </div>

            {/* Sucursal */}
            <div
              onClick={() => setTabSucursal("sucursal")}
              title="Filtrar por Sucursal"
              className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer shadow-sm flex items-center gap-3 sm:gap-4 backdrop-blur-sm ${
                tabSucursal === "sucursal"
                  ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/50 ring-2 ring-amber-500/20"
                  : "bg-white dark:bg-zinc-900/80 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 text-amber-500 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                📍
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {cargando && stats.totalUsuarios === 0 ? "..." : stats.totalSucursal}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                  Sucursal
                </h3>
              </div>
            </div>

            {/* POS */}
            <div className="bg-white dark:bg-zinc-900/80 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4 backdrop-blur-sm">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                🛒
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                  {cargando && stats.totalUsuarios === 0 ? "..." : stats.totalPos}
                </p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium">
                  Usuarios POS
                </h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Filtros y Buscador */}
        <div className="order-2 sm:order-3 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-6">
          <div className="relative w-full flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 select-none">
              🔍
            </span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo, PIN..."
              className="w-full pl-10 pr-10 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-zinc-400 shadow-sm"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-48 shrink-0">
            <button
              type="button"
              onClick={() => setFiltroMenuAbierto(!filtroMenuAbierto)}
              className="w-full h-11 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-normal flex items-center justify-between transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <span>{labelFiltroActual}</span>
              <svg
                className={`w-4 h-4 text-zinc-400 transition-transform ${
                  filtroMenuAbierto ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {filtroMenuAbierto && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setFiltroMenuAbierto(false)}
                />
                <div className="absolute right-0 mt-1.5 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {[
                    { id: "todos", label: "Todos" },
                    { id: "pos", label: "POS" },
                    { id: "oficina", label: "Oficina" },
                    { id: "taller", label: "Taller / Garaje" },
                    { id: "propuesta", label: "Propuesta" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => {
                        setFiltro(opcion.id);
                        setFiltroMenuAbierto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-normal transition-colors flex items-center justify-between cursor-pointer ${
                        filtro === opcion.id
                          ? "bg-blue-50 dark:bg-blue-600/15 text-blue-600 dark:text-blue-400 font-normal"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opcion.label}</span>
                      {filtro === opcion.id && (
                        <svg
                          className="w-4 h-4 text-blue-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pestañas de Vista por Sede */}
        <div className="order-3 sm:order-4 mb-6 flex items-center gap-1.5 p-1 bg-zinc-200/60 dark:bg-zinc-900 rounded-2xl w-full sm:w-fit border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTabSucursal("todas")}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              tabSucursal === "todas"
                ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span>Todas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                tabSucursal === "todas"
                  ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                  : "bg-zinc-300/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {usuarios.length} / 14
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabSucursal("principal")}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              tabSucursal === "principal"
                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span>🏢 Sede Principal</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                tabSucursal === "principal"
                  ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                  : "bg-zinc-300/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {usuariosPrincipal.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabSucursal("sucursal")}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              tabSucursal === "sucursal"
                ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span>📍 Sucursal</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                tabSucursal === "sucursal"
                  ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "bg-zinc-300/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {usuariosSucursal.length}
            </span>
          </button>
        </div>

        {/* Tablas Separadas de Usuarios con Numeración (#) y 1 Acceso Único por Correo */}
        <div className="order-4 space-y-8">
          {/* Sección Sede Principal */}
          {(tabSucursal === "todas" || tabSucursal === "principal") && (
            <SeccionUsuariosGrupo
              titulo="Sede Principal"
              icono="🏢"
              color="blue"
              lista={usuariosPrincipal}
              cargando={cargando}
              eliminandoId={eliminandoId}
              totalUsuarios={stats.totalUsuarios}
              onSolicitarEliminar={solicitarEliminar}
            />
          )}

          {/* Separador visual elegante si se muestran ambas sedes */}
          {tabSucursal === "todas" && (
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-zinc-50 dark:bg-zinc-950 px-3 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Sedes Separadas
                </span>
              </div>
            </div>
          )}

          {/* Sección Sucursal */}
          {(tabSucursal === "todas" || tabSucursal === "sucursal") && (
            <SeccionUsuariosGrupo
              titulo="Sucursal"
              icono="📍"
              color="amber"
              lista={usuariosSucursal}
              cargando={cargando}
              eliminandoId={eliminandoId}
              totalUsuarios={stats.totalUsuarios}
              onSolicitarEliminar={solicitarEliminar}
            />
          )}
        </div>

        {/* Modal Flotante de Confirmación de Eliminación */}
        {usuarioAEliminar && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative text-center max-h-[90vh] overflow-y-auto">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-100 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center text-2xl sm:text-3xl mx-auto mb-3 sm:mb-4 border border-rose-200 dark:border-rose-900/40">
                🗑️
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-1.5 sm:mb-2">
                ¿Eliminar Usuario?
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-5 sm:mb-6">
                ¿Deseas eliminar a{" "}
                <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">
                  {usuarioAEliminar.name}
                </strong>{" "}
                y revocar su acceso?
              </p>
              <div className="flex gap-2.5 sm:gap-3">
                <button
                  type="button"
                  disabled={eliminandoId !== null}
                  onClick={() => setUsuarioAEliminar(null)}
                  className="flex-1 h-11 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 font-semibold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={eliminandoId !== null}
                  onClick={confirmarEliminacion}
                  className="flex-1 h-11 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {eliminandoId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    "Sí, Eliminar"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notificación Flotante (Toast adaptable a móvil) */}
        {toast && (
          <div className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:top-6 z-50 animate-in slide-in-from-top-3 duration-300">
            <div
              className={`flex items-center gap-2.5 sm:gap-3 px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-2xl border backdrop-blur-md ${
                toast.tipo === "exito"
                  ? "bg-zinc-900/95 text-white border-zinc-800 dark:bg-white/95 dark:text-zinc-900 dark:border-zinc-200 shadow-emerald-500/10"
                  : "bg-rose-600 text-white border-rose-500 shadow-rose-600/20"
              }`}
            >
              <span className="text-base sm:text-lg">
                {toast.tipo === "exito" ? "✅" : "⚠️"}
              </span>
              <span className="text-xs sm:text-sm font-semibold flex-1">{toast.texto}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-2 text-xs opacity-60 hover:opacity-100 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>

      <GerenciaMobileNav />
    </div>
  );
}
