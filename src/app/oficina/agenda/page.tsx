"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useEffect, useState } from "react";

export default function CitasAgenda() {
  const [currentDate] = useState("Agenda Operativa (Hoy)");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [techFilter, setTechFilter] = useState("Todos los Técnicos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    timeSlot: "09:00 AM",
    clientName: "",
    vehicle: "",
    plate: "",
    serviceName: "",
    tech: "Carlos Ruiz",
    bay: "Bahía 1",
    status: "Confirmada",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oficina/agenda");
      if (res.ok) {
        const data = await res.json();
        setAppointments(Array.isArray(data) ? data : []);
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
      timeSlot: "10:00 AM",
      clientName: "",
      vehicle: "",
      plate: "",
      serviceName: "",
      tech: "Carlos Ruiz",
      bay: "Bahía 1",
      status: "Confirmada",
    });
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditingItem(row);
    setForm({
      timeSlot: row.timeSlot || "09:00 AM",
      clientName: row.clientName || "",
      vehicle: row.vehicle || "",
      plate: row.plate || "",
      serviceName: row.serviceName || "",
      tech: row.tech || "Sin Asignar",
      bay: row.bay || "Por definir",
      status: row.status || "Confirmada",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = editingItem ? { id: editingItem.id, ...form } : form;
      const res = await fetch("/api/oficina/agenda", {
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

  const handleStartWork = async (row: any) => {
    await fetch("/api/oficina/agenda", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        status: "En Curso",
        tech: row.tech === "Sin Asignar" ? "Carlos Ruiz" : row.tech,
        bay: row.bay === "Por definir" ? "Bahía 1" : row.bay,
      }),
    });
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta cita de la agenda?")) return;
    await fetch(`/api/oficina/agenda?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const filtered = appointments.filter((a) =>
    techFilter === "Todos los Técnicos" ? true : a.tech === techFilter
  );

  const waitingCount = appointments.filter((a) => a.status === "Esperando" || a.status === "Solicitada").length;
  const occupiedBays = appointments.filter((a) => a.status === "En Curso").length;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
              <Link href="/oficina" className="hover:text-blue-600 transition-colors">Oficina</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Citas y Agenda</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Agenda Diaria
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="h-10 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              Actualizar Agenda
            </button>
            <button
              onClick={openNew}
              className="h-10 px-4 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Agendar Cita
            </button>
          </div>
        </div>

        {/* Resumen Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xl flex-shrink-0">
              📅
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{appointments.length}</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Citas Registradas</h3>
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4 border-amber-200 dark:border-amber-900/50">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-xl flex-shrink-0">
              ⏳
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{waitingCount}</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Vehículos en Espera</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-xl flex-shrink-0">
              🚖
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{Math.max(0, 6 - occupiedBays)} / 6</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Bahías Disponibles</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 text-xl flex-shrink-0">
              👨‍🔧
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">4</p>
              <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Técnicos Activos</h3>
            </div>
          </div>
        </div>

        {/* Día y Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{currentDate}</h2>
          </div>
          
          <div className="flex gap-2">
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-sm font-medium outline-none focus:border-emerald-500 text-zinc-600 dark:text-zinc-400 shadow-sm"
            >
              <option>Todos los Técnicos</option>
              <option>Carlos Ruiz</option>
              <option>José Mendoza</option>
              <option>Mario Cedeño</option>
              <option>Sin Asignar</option>
            </select>
          </div>
        </div>

        {/* Tabla de Citas (Formato Timeline) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium w-28">Hora</th>
                  <th className="px-6 py-4 font-medium">Cliente / Vehículo</th>
                  <th className="px-6 py-4 font-medium">Servicio Solicitado</th>
                  <th className="px-6 py-4 font-medium">Asignación</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando agenda desde Neon DB...</td>
                  </tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{row.timeSlot}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.clientName}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{row.vehicle} ({row.plate})</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">{row.serviceName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${row.tech === 'Sin Asignar' ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400'}`}>
                            {row.tech || "Sin Asignar"}
                          </span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{row.bay || "Por definir"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        row.status === 'En Curso' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                        row.status === 'Esperando' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                        row.status === 'Confirmada' || row.status === 'Programada' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' :
                        row.status === 'Solicitada' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800' :
                        'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.status !== "En Curso" && (
                          <button
                            onClick={() => handleStartWork(row)}
                            className="p-1.5 text-zinc-400 hover:text-emerald-600 transition-colors"
                            title="Iniciar Trabajo / Ingresar a Bahía"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(row)}
                          className="p-1.5 text-zinc-400 hover:text-blue-600 transition-colors"
                          title="Editar / Asignar Técnico"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
                          title="Eliminar Cita"
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
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingItem ? "Editar Cita y Asignación" : "Agendar Nueva Cita"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Hora</label>
                  <input
                    required
                    type="text"
                    value={form.timeSlot}
                    onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                    placeholder="09:30 AM"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option>Confirmada</option>
                    <option>En Curso</option>
                    <option>Esperando</option>
                    <option>Solicitada</option>
                    <option>Reprogramada</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Cliente</label>
                <input
                  required
                  type="text"
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="Nombre del cliente"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Vehículo</label>
                  <input
                    required
                    type="text"
                    value={form.vehicle}
                    onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                    placeholder="Ford F-150"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Placa</label>
                  <input
                    required
                    type="text"
                    value={form.plate}
                    onChange={(e) => setForm({ ...form, plate: e.target.value })}
                    placeholder="UBT-1122"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Servicio Solicitado</label>
                <input
                  required
                  type="text"
                  value={form.serviceName}
                  onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
                  placeholder="Mantenimiento 50k KM"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Técnico Asignado</label>
                  <select
                    value={form.tech}
                    onChange={(e) => setForm({ ...form, tech: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option>Carlos Ruiz</option>
                    <option>José Mendoza</option>
                    <option>Mario Cedeño</option>
                    <option>Sin Asignar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Bahía</label>
                  <select
                    value={form.bay}
                    onChange={(e) => setForm({ ...form, bay: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option>Bahía 1</option>
                    <option>Bahía 2</option>
                    <option>Bahía 3</option>
                    <option>Elevador Principal</option>
                    <option>Por definir</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar en Neon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
