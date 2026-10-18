"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useState } from "react";

export default function GestionPersonal() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Mecánico Senior",
    department: "TALLER",
    location: "Sede Principal",
    status: "Activo",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gerencia/personal");
      if (res.ok) {
        const data = await res.json();
        setEmployees(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNew = () => {
    setEditingItem(null);
    setForm({
      name: "",
      email: "",
      role: "Mecánico Automotriz",
      department: "TALLER",
      location: "Sede Principal",
      status: "Activo",
    });
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingItem(row);
    setForm({
      name: row.name || "",
      email: row.email || "",
      role: row.role || "",
      department: row.department || "TALLER",
      location: row.location || "Sede Principal",
      status: row.status || "Activo",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = editingItem ? { id: editingItem.id, ...form } : form;
      const res = await fetch("/api/gerencia/personal", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setModalOpen(false);
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este empleado de Neon DB?")) return;
    await fetch(`/api/gerencia/personal?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const filtered = employees.filter((emp) => {
    if (deptFilter === "Taller" && emp.department !== "TALLER") return false;
    if (deptFilter === "Ventas / POS" && emp.department !== "POS") return false;
    if (deptFilter === "Administración" && emp.department !== "OFICINA" && emp.department !== "GERENCIA") return false;
    if (search && !`${emp.name} ${emp.email} ${emp.role} ${emp.location}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = employees.filter((e) => e.status === "Activo").length;
  const inactiveCount = employees.length - activeCount;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col">
        {/* Breadcrumb & Header */}
        <div className="order-1 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 mb-1.5 sm:mb-2">
              <Link href="/gerencia" className="hover:text-blue-600 transition-colors">Gerencia</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Gestión de Personal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Directorio de Empleados
            </h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={openNew}
              className="w-full sm:w-auto h-11 sm:h-10 px-4 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Nuevo Empleado
            </button>
          </div>
        </div>

        {/* Resumen Cards: 2x2 on mobile */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 sm:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-lg sm:text-xl flex-shrink-0">
                👥
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{employees.length}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Total</h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg sm:text-xl flex-shrink-0">
                ✅
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{activeCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Activos</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-lg sm:text-xl flex-shrink-0">
                ⏸️
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">{inactiveCount}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Vacaciones</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-lg sm:text-xl flex-shrink-0">
                🏢
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">2</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Sucursales</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Filtros de Tabla */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-t-3xl border border-zinc-100 dark:border-zinc-800 p-3.5 sm:p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 mb-4 sm:mb-0 shadow-sm">
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {["Todos", "Taller", "Ventas / POS", "Administración"].map((tab) => (
              <button
                key={tab}
                onClick={() => setDeptFilter(tab)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  deptFilter === tab
                    ? "bg-purple-600 text-white"
                    : "bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empleado..." 
              className="w-full h-11 sm:h-10 pl-10 pr-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-base sm:text-sm outline-none focus:border-purple-500"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3.5 sm:top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Tablas / Listados */}
        <div className="order-4">
          {/* Vista Móvil (Tarjetas de Empleados para Android / iOS) */}
          <div className="md:hidden bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 sm:border-x sm:border-b rounded-2xl sm:rounded-b-2xl divide-y divide-zinc-100 dark:divide-zinc-800 shadow-sm">
          {loading ? (
            <div className="p-6 text-center text-sm text-zinc-500">Cargando personal desde Neon DB...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">No se encontraron empleados</div>
          ) : (
            filtered.map((row) => (
              <div key={row.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center font-bold text-purple-600 dark:text-purple-300 flex-shrink-0">
                      {(row.name || "E").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{row.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{row.email}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${row.status === 'Activo' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'}`}>
                    {row.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                  <div>
                    <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-md font-medium mr-2">
                      {row.role}
                    </span>
                    <span>📍 {row.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(row)}
                      className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold active:scale-95"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold active:scale-95"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vista Desktop (Tabla de Personal) */}
        <div className="hidden md:block bg-white dark:bg-zinc-900 border-x border-b border-zinc-100 dark:border-zinc-800 rounded-b-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Empleado</th>
                  <th className="px-6 py-4 font-medium">Rol</th>
                  <th className="px-6 py-4 font-medium">Ubicación</th>
                  <th className="px-6 py-4 font-medium">Último Acceso</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando personal desde Neon DB...</td>
                  </tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500">
                          {(row.name || "E").charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.name}</p>
                          <p className="text-xs text-zinc-500">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-lg text-xs font-medium">
                        {row.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">{row.location}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{row.lastLogin}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${row.status === 'Activo' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          className="p-2 text-zinc-400 hover:text-purple-600 transition-colors"
                          title="Editar Empleado"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                          title="Eliminar Empleado"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm text-zinc-500">
            <span>Mostrando {filtered.length} de {employees.length} empleados en Neon DB</span>
          </div>
        </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto pb-8 sm:pb-6">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingItem ? "Editar Empleado" : "Registrar Nuevo Empleado"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Nombre Completo</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Carlos Ruiz"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Correo Corporativo</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="carlos@autopro.com"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Cargo / Rol</label>
                  <input
                    required
                    type="text"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Mecánico Senior"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Departamento</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option value="TALLER">Taller</option>
                    <option value="POS">Ventas / POS</option>
                    <option value="OFICINA">Oficina</option>
                    <option value="GERENCIA">Gerencia</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Ubicación</label>
                  <select
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option>Sede Principal</option>
                    <option>Sucursal Norte</option>
                    <option>Ambas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                  >
                    <option>Activo</option>
                    <option>Vacaciones</option>
                    <option>Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar en Neon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <GerenciaMobileNav />
    </div>
  );
}
