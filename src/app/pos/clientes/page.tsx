"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year?: number | null;
  color?: string | null;
  mileage?: number | null;
  fuelType?: string | null;
}

interface Customer {
  id: string;
  identification: string;
  name: string;
  type: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  vip: boolean;
  notes?: string | null;
  lastVisit?: string | null;
  createdAt: string;
  vehicles: Vehicle[];
}

export default function GestionClientes() {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalVehiculos: 0,
    totalVip: 0,
    totalNuevos: 0,
  });

  // Modal para ver/editar cliente
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Customer | null>(null);
  const [editando, setEditando] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  // Flotante de confirmación de eliminación y Toast
  const [clienteAEliminar, setClienteAEliminar] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const mostrarToast = (texto: string, tipo: "exito" | "error" = "exito") => {
    setToast({ tipo, texto });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Form de edición
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    type: "Personal",
    vip: false,
    notes: "",
  });

  const cargarClientes = useCallback(async () => {
    try {
      setCargando(true);
      setError(null);
      const params = new URLSearchParams();
      if (busqueda) params.set("busqueda", busqueda);
      if (filtro !== "todos") params.set("filtro", filtro);

      const res = await fetch(`/api/clientes?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al cargar clientes desde Neon");
      }

      setClientes(data.clientes || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con la base de datos.");
    } finally {
      setCargando(false);
    }
  }, [busqueda, filtro]);

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarClientes();
    }, 250);

    const onFocus = () => cargarClientes();
    window.addEventListener("focus", onFocus);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [cargarClientes]);

  const solicitarEliminar = (id: string, name: string) => {
    setClienteAEliminar({ id, name });
  };

  const confirmarEliminacion = async () => {
    if (!clienteAEliminar) return;
    const { id, name } = clienteAEliminar;

    try {
      setEliminandoId(id);
      const res = await fetch(`/api/clientes?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        mostrarToast(data.error || "No se pudo eliminar el cliente.", "error");
        return;
      }

      setClienteAEliminar(null);
      mostrarToast(`Cliente "${name}" eliminado correctamente.`, "exito");

      // Recargar lista
      await cargarClientes();
      if (clienteSeleccionado?.id === id) {
        setClienteSeleccionado(null);
      }
    } catch (err: any) {
      mostrarToast("Error al eliminar cliente: " + err.message, "error");
    } finally {
      setEliminandoId(null);
    }
  };

  const handleToggleVip = async (cliente: Customer) => {
    try {
      const res = await fetch("/api/clientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cliente.id,
          name: cliente.name,
          type: cliente.type,
          phone: cliente.phone,
          email: cliente.email,
          address: cliente.address,
          notes: cliente.notes,
          vip: !cliente.vip,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setClientes((prev) =>
          prev.map((c) => (c.id === cliente.id ? { ...c, vip: !cliente.vip } : c))
        );
        setStats((prev) => ({
          ...prev,
          totalVip: cliente.vip ? prev.totalVip - 1 : prev.totalVip + 1,
        }));
      }
    } catch (err) {
      console.error("Error al alternar estado VIP:", err);
    }
  };

  const abrirEdicion = (cliente: Customer) => {
    setClienteSeleccionado(cliente);
    setEditForm({
      name: cliente.name,
      phone: cliente.phone,
      email: cliente.email || "",
      address: cliente.address || "",
      type: cliente.type,
      vip: cliente.vip,
      notes: cliente.notes || "",
    });
    setEditando(true);
  };

  const guardarCambios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteSeleccionado) return;

    setGuardandoEdicion(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: clienteSeleccionado.id,
          ...editForm,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Error al actualizar cliente.");
        return;
      }

      setEditando(false);
      setClienteSeleccionado(null);
      await cargarClientes();
    } catch (err: any) {
      alert("Error al guardar: " + err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />

      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <Link href="/pos" className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium">
                <span>&larr;</span> POS
              </Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Clientes</span>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/pos"
                title="Volver a Panel POS"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Clientes
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                {stats.totalClientes}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/pos/clientes/nuevo"
              className="h-10 px-4 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 shadow-sm shadow-blue-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
              Nuevo Cliente
            </Link>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-xl flex-shrink-0">
              👥
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando && stats.totalClientes === 0 ? "..." : stats.totalClientes}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Clientes</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              🚗
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando && stats.totalVehiculos === 0 ? "..." : stats.totalVehiculos}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Vehículos</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              ⭐
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando && stats.totalVip === 0 ? "..." : stats.totalVip}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">VIP</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-xl flex-shrink-0">
              📅
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {cargando && stats.totalNuevos === 0 ? "..." : stats.totalNuevos}
              </p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Nuevos</h3>
            </div>
          </div>
        </div>

        {/* Mensaje de Error si ocurre */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-rose-800 dark:text-rose-300 text-sm">
            <span>⚠️ {error}</span>
            <button
              onClick={() => cargarClientes()}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Filtros de Tabla */}
        <div className="bg-white dark:bg-zinc-900 rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:flex-1 md:max-w-3xl">
            <input 
              type="text" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cédula, nombre o placa..." 
              className="w-full h-11 pl-11 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500 transition-colors shadow-sm"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            {busqueda && (
              <button 
                onClick={() => setBusqueda("")}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative w-full md:w-auto">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full md:w-auto appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-medium rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-blue-500 cursor-pointer shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
            >
              <option value="todos">Todos</option>
              <option value="persona">Persona</option>
              <option value="empresa">Empresa</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tabla de Clientes */}
        <div className="bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">WhatsApp</th>
                  <th className="px-6 py-4 font-medium">Vehículos</th>
                  <th className="px-6 py-4 font-medium">Registro / Visita</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {cargando && clientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm">Cargando clientes...</p>
                      </div>
                    </td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-zinc-500 dark:text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-3xl text-blue-600">
                          👥
                        </div>
                        <Link
                          href="/pos/clientes/nuevo"
                          className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-normal text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                          Registrar Cliente
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  clientes.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${row.type === 'Empresa' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'}`}>
                            {row.type === 'Empresa' ? '🏢' : row.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                {row.type === 'Empresa' ? 'Empresa' : 'Persona'}
                              </span>
                              {row.vip && (
                                <span title="Cliente VIP" className="text-xs">⭐</span>
                              )}
                            </div>
                            {row.identification && !row.identification.startsWith("CLI-") && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                                {row.type === 'Empresa' ? 'RUC' : 'Cédula'}: {row.identification}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {row.phone ? (
                          <div className="space-y-0.5">
                            <p className="text-zinc-900 dark:text-zinc-200 font-medium text-xs flex items-center gap-1.5">
                              <span className="text-emerald-500">📱</span> {row.phone}
                            </p>
                            {row.email && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.email}</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                              Sin WhatsApp
                            </span>
                            {row.email && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.email}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {row.vehicles && row.vehicles.length > 0 ? (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-sky-400 border border-blue-200 dark:border-blue-500/20 whitespace-nowrap">
                              {row.vehicles.length} {row.vehicles.length === 1 ? "vehículo" : "vehículos"}
                            </span>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {row.vehicles.map((v) => (
                                <span
                                  key={v.id}
                                  className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md text-xs font-medium inline-flex items-center gap-1 border border-zinc-200 dark:border-zinc-700/60"
                                >
                                  <span className="font-mono font-bold text-blue-600 dark:text-sky-400">{v.plate}</span>
                                  {(v.brand || v.model) && (
                                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                                      {[v.brand, v.model].filter(Boolean).join(" ")}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50 whitespace-nowrap">
                            0 vehículos
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 text-xs">
                        {new Date(row.createdAt).toLocaleDateString("es-EC", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Editar */}
                          <button 
                            onClick={() => abrirEdicion(row)}
                            className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Editar Datos"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>

                          {/* Eliminar */}
                          <button 
                            onClick={() => solicitarEliminar(row.id, row.name)}
                            disabled={eliminandoId === row.id}
                            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar Cliente"
                          >
                            {eliminandoId === row.id ? (
                              <svg className="w-4 h-4 animate-spin text-rose-600" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>{clientes.length} de {stats.totalClientes}</span>
          </div>
        </div>

        {/* Modal de Edición de Cliente */}
        {editando && clienteSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl relative">
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Editar Cliente
                  </h3>
                  <p className="text-xs text-zinc-500">ID: {clienteSeleccionado.identification}</p>
                </div>
                <button
                  onClick={() => setEditando(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={guardarCambios} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Nombres y Apellidos</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">WhatsApp</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Tipo de Cliente</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Empresa">Empresa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1">Notas / Observaciones</label>
                  <textarea
                    rows={2}
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm outline-none focus:border-blue-500 resize-none"
                  ></textarea>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="vip-check"
                    checked={editForm.vip}
                    onChange={(e) => setEditForm({ ...editForm, vip: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <label htmlFor="vip-check" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Cliente VIP ⭐
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setEditando(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardandoEdicion}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {guardandoEdicion ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal Flotante de Confirmación de Eliminación */}
        {clienteAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-center">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center text-3xl mx-auto mb-4 border border-rose-200 dark:border-rose-900/40">
                🗑️
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                ¿Eliminar Cliente?
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                ¿Deseas eliminar a <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{clienteAEliminar.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={eliminandoId !== null}
                  onClick={() => setClienteAEliminar(null)}
                  className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 font-semibold text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={eliminandoId !== null}
                  onClick={confirmarEliminacion}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
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

        {/* Notificación Flotante (Toast) */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-3 duration-300">
            <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md ${
              toast.tipo === 'exito'
                ? 'bg-zinc-900/95 text-white border-zinc-800 dark:bg-white/95 dark:text-zinc-900 dark:border-zinc-200 shadow-emerald-500/10'
                : 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20'
            }`}>
              <span className="text-lg">
                {toast.tipo === 'exito' ? '✅' : '⚠️'}
              </span>
              <span className="text-sm font-semibold">{toast.texto}</span>
              <button
                onClick={() => setToast(null)}
                className="ml-2 text-xs opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
