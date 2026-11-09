"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { OficinaMobileNav } from "@/components/OficinaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useCallback, useEffect, useState } from "react";

type Appointment = {
  id: string;
  date?: string | null;
  timeSlot?: string | null;
  clientName?: string | null;
  vehicle?: string | null;
  plate?: string | null;
  serviceName?: string | null;
  tech?: string | null;
  bay?: string | null;
  status?: string | null;
};

type Employee = {
  name?: string | null;
  role?: string | null;
  department?: string | null;
  status?: string | null;
};

const BAY_OPTIONS = ["Bahía 1", "Bahía 2", "Bahía 3", "Elevador Principal"];

function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getTimeSortValue(value?: string | null) {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return hour * 60 + Number(match[2]);
}

export default function CitasAgenda() {
  const [today] = useState(getTodayDate);
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [techFilter, setTechFilter] = useState("TODOS");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    timeSlot: "09:00 AM",
    clientName: "",
    vehicle: "",
    plate: "",
    serviceName: "",
    tech: "Sin Asignar",
    bay: "Por definir",
    status: "Confirmada",
  });

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError("");
    }
    try {
      const [agendaResult, employeeResult] = await Promise.allSettled([
        fetch("/api/oficina/agenda"),
        fetch("/api/gerencia/personal"),
      ]);
      if (agendaResult.status === "rejected") throw agendaResult.reason;

      const response = agendaResult.value;
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo cargar la agenda.");
      }
      const data: unknown = await response.json();
      const nextAppointments = Array.isArray(data) ? (data as Appointment[]) : [];
      setAppointments(nextAppointments);

      const appointmentTechnicians = nextAppointments
        .map((appointment) => appointment.tech?.trim())
        .filter((name): name is string => Boolean(name) && name !== "Sin Asignar");

      if (employeeResult.status === "fulfilled" && employeeResult.value.ok) {
        const employeeData: unknown = await employeeResult.value.json();
        const staffTechnicians = Array.isArray(employeeData)
          ? (employeeData as Employee[])
              .filter((employee) => {
                if (employee.status === "Inactivo") return false;
                const department = (employee.department || "").toLowerCase();
                const role = (employee.role || "").toLowerCase();
                return department.includes("taller") || /t[eé]cnico|mec[aá]nico/.test(role);
              })
              .map((employee) => employee.name?.trim())
              .filter((name): name is string => Boolean(name))
          : [];
        setTechnicians([...new Set([...staffTechnicians, ...appointmentTechnicians])].sort((a, b) => a.localeCompare(b, "es")));
      } else {
        console.error(
          "No se pudo cargar el personal del taller.",
          employeeResult.status === "rejected" ? employeeResult.reason : employeeResult.value.statusText
        );
        setTechnicians([...new Set(appointmentTechnicians)].sort((a, b) => a.localeCompare(b, "es")));
      }
    } catch (loadError) {
      console.error("Error al cargar la agenda:", loadError);
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la agenda.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return loadData(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const openNew = () => {
    setEditingItem(null);
    setForm({
      timeSlot: "10:00 AM",
      clientName: "",
      vehicle: "",
      plate: "",
      serviceName: "",
      tech: "Sin Asignar",
      bay: "Por definir",
      status: "Confirmada",
    });
    setModalOpen(true);
  };

  const openEdit = (row: Appointment) => {
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
    setError("");
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = { ...(editingItem ? { id: editingItem.id } : {}), ...form, date: selectedDate };
      const res = await fetch("/api/oficina/agenda", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudo guardar la cita.");
      setModalOpen(false);
      await loadData();
    } catch (saveError) {
      console.error("Error al guardar la cita:", saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la cita.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartWork = async (row: Appointment) => {
    try {
      const res = await fetch("/api/oficina/agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status: "En Curso" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudo iniciar el trabajo.");
      await loadData();
    } catch (startError) {
      console.error("Error al iniciar el trabajo:", startError);
      setError(startError instanceof Error ? startError.message : "No se pudo iniciar el trabajo.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta cita de la agenda?")) return;
    try {
      const res = await fetch(`/api/oficina/agenda?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "No se pudo eliminar la cita.");
      await loadData();
    } catch (deleteError) {
      console.error("Error al eliminar la cita:", deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la cita.");
    }
  };

  const appointmentsForDate = appointments.filter((appointment) => {
    const appointmentDate = appointment.date?.trim() || "";
    if (appointmentDate.toLowerCase() === "hoy") return selectedDate === today;
    return appointmentDate.slice(0, 10) === selectedDate;
  });
  const filtered = appointmentsForDate
    .filter((appointment) => techFilter === "TODOS" || (appointment.tech || "Sin Asignar") === techFilter)
    .sort((a, b) => getTimeSortValue(a.timeSlot) - getTimeSortValue(b.timeSlot));
  const waitingCount = appointmentsForDate.filter((appointment) =>
    appointment.status === "Esperando" || appointment.status === "Solicitada"
  ).length;
  const occupiedBays = new Set(
    appointmentsForDate
      .filter((appointment) => appointment.status === "En Curso" && appointment.bay && appointment.bay !== "Por definir")
      .map((appointment) => appointment.bay)
  ).size;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-[#07090e] font-sans pb-24 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/oficina"
              title="Volver a Oficina"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-[#0d121c] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 shadow-sm transition-all flex items-center justify-center shrink-0 active:scale-95 group"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Agenda de citas
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="h-11 px-4 rounded-xl bg-white dark:bg-[#0d121c] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold text-xs sm:text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7v5h-5M4 17v-5h5m11-1a8 8 0 00-14.9-3M4 13a8 8 0 0014.9 3" />
              </svg>
              <span>{loading ? "Actualizando..." : "Actualizar"}</span>
            </button>
            <button
              type="button"
              onClick={openNew}
              className="h-11 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-xs sm:text-sm hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              <span>Nueva cita</span>
            </button>
          </div>
        </div>

        <CollapsibleMetrics className="w-full">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-[#0d121c] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path strokeLinecap="round" d="M16 3v4M8 3v4M3 11h18" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{loading ? "..." : appointmentsForDate.length}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Citas</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#0d121c] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-amber-500">{loading ? "..." : waitingCount}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Espera</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#0d121c] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13l2-6h14l2 6v6h-3v-2H6v2H3v-6Zm2 0h14M7 17h.01M17 17h.01" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{loading ? "..." : Math.max(0, BAY_OPTIONS.length - occupiedBays)} <span className="text-sm font-semibold text-zinc-500">/ {BAY_OPTIONS.length}</span></p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Bahías</p>
              </div>
            </div>
            <div className="bg-white dark:bg-[#0d121c] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="9" cy="8" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.6V20" /></svg>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{loading ? "..." : technicians.length}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Técnicos</p>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
            <label className="relative">
              <span className="sr-only">Fecha de la agenda</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0d121c] px-3.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 shadow-sm outline-none focus:border-emerald-500"
              />
            </label>
            <label>
              <span className="sr-only">Filtrar por técnico</span>
              <select
                value={techFilter}
                onChange={(event) => setTechFilter(event.target.value)}
                className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0d121c] px-3.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 shadow-sm outline-none focus:border-emerald-500"
              >
                <option value="TODOS">Todos los técnicos</option>
                {technicians.map((technician) => <option key={technician} value={technician}>{technician}</option>)}
                <option value="Sin Asignar">Sin asignar</option>
              </select>
            </label>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        <div>
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="bg-white dark:bg-[#0d121c] rounded-2xl p-6 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800">
              Cargando agenda...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white dark:bg-[#0d121c] rounded-2xl p-8 text-center border border-zinc-200 dark:border-zinc-800">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="2" /><path strokeLinecap="round" d="M16 3v4M8 3v4M3 11h18" /></svg>
              </div>
              <button onClick={openNew} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Agendar cita
              </button>
            </div>
          ) : (
            filtered.map((row) => (
              <div key={row.id} className="bg-white dark:bg-[#0d121c] rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-extrabold">
                    {row.timeSlot || "Hora pendiente"}
                  </span>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    row.status === 'En Curso' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                    row.status === 'Esperando' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                    row.status === 'Confirmada' || row.status === 'Programada' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {row.status || "Sin estado"}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-base text-zinc-900 dark:text-white">{row.clientName || "Cliente"}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{row.vehicle || "Vehículo"}{row.plate ? ` · ${row.plate}` : ""}</p>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-2">{row.serviceName || "Servicio pendiente"}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                  <div>
                    <span className={`font-bold ${row.tech === 'Sin Asignar' ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400'}`}>
                      {row.tech || "Sin Asignar"}
                    </span>
                    <span className="text-zinc-400 ml-2">• {row.bay || "Por definir"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {row.status !== "En Curso" && (
                      <button
                        onClick={() => handleStartWork(row)}
                        className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold active:scale-95"
                      >
                        Iniciar
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(row)}
                      className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold active:scale-95"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="px-3 py-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold active:scale-95"
                      title="Eliminar cita"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block bg-white dark:bg-[#0d121c] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-zinc-50/70 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-bold border-b border-zinc-200/80 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-4 font-medium w-32">Hora</th>
                  <th className="px-5 py-4 font-medium">Cliente / vehículo</th>
                  <th className="px-5 py-4 font-medium">Servicio solicitado</th>
                  <th className="px-5 py-4 font-medium">Asignación</th>
                  <th className="px-5 py-4 font-medium">Estado</th>
                  <th className="px-5 py-4 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Cargando agenda...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center">
                      <button onClick={openNew} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                        Agendar cita
                      </button>
                    </td>
                  </tr>
                ) : filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">{row.timeSlot}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{row.clientName || "Cliente"}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{row.vehicle || "Vehículo"}{row.plate ? ` · ${row.plate}` : ""}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">{row.serviceName || "Servicio pendiente"}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${row.tech === 'Sin Asignar' ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400'}`}>
                            {row.tech || "Sin Asignar"}
                          </span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{row.bay || "Por definir"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        row.status === 'En Curso' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                        row.status === 'Esperando' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        row.status === 'Confirmada' || row.status === 'Programada' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        row.status === 'Solicitada' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' :
                        'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {row.status || "Sin estado"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
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
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-[#0d121c] rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto pb-8 sm:pb-6">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
                {editingItem ? "Editar cita" : "Agendar nueva cita"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar formulario"
                className="w-9 h-9 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Fecha</label>
                <input
                  required
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Hora</label>
                  <input
                    required
                    type="text"
                    value={form.timeSlot}
                    onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                    placeholder="09:30 AM"
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-emerald-500"
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
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-emerald-500"
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
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-emerald-500"
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
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-emerald-500"
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
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Técnico Asignado</label>
                  <select
                    value={form.tech}
                    onChange={(e) => setForm({ ...form, tech: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-emerald-500"
                  >
                    {form.tech !== "Sin Asignar" && !technicians.includes(form.tech) && (
                      <option value={form.tech}>{form.tech}</option>
                    )}
                    {technicians.map((technician) => <option key={technician} value={technician}>{technician}</option>)}
                    <option value="Sin Asignar">Sin asignar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Bahía</label>
                  <select
                    value={form.bay}
                    onChange={(e) => setForm({ ...form, bay: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm outline-none focus:border-emerald-500"
                  >
                    {BAY_OPTIONS.map((bay) => <option key={bay} value={bay}>{bay}</option>)}
                    <option value="Por definir">Por definir</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <OficinaMobileNav />
    </div>
  );
}
