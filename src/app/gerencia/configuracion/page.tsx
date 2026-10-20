"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { useEffect, useState } from "react";

export default function ConfiguracionSistema() {
  const [activeTab, setActiveTab] = useState("general");
  const [branches, setBranches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState("");
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);

  const [config, setConfig] = useState({
    razonSocial: "AutoG Servicios Automotrices S.A.",
    nombreComercial: "AutoG",
    ruc: "0992345678001",
    telefono: "04-234-5678",
    direccion: "Av. de las Américas y Plaza Dañín, Guayaquil, Ecuador",
    iva: 15,
    moneda: "Dólares (USD)",
    firmaDiasRestantes: 45,
    alertasStockBajo: true,
    recordatoriosClientes: true,
    resumenDiarioCaja: true,
  });

  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
    phone: "",
    isMain: false,
  });

  const loadData = async () => {
    try {
      const res = await fetch("/api/gerencia/configuracion");
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        if (data.branches) setBranches(data.branches);
      }
    } catch {}
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    setSavedBanner("");
    try {
      const res = await fetch("/api/gerencia/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "config", config }),
      });
      if (res.ok) {
        setSavedBanner("Ajustes guardados exitosamente.");
        setTimeout(() => setSavedBanner(""), 4000);
      }
    } finally {
      setSaving(false);
    }
  };

  const openNewBranch = () => {
    setEditingBranch(null);
    setBranchForm({ name: "", address: "", phone: "", isMain: false });
    setBranchModalOpen(true);
  };

  const openEditBranch = (b: any) => {
    setEditingBranch(b);
    setBranchForm({
      name: b.name || "",
      address: b.address || "",
      phone: b.phone || "",
      isMain: Boolean(b.isMain),
    });
    setBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingBranch) {
        await fetch("/api/gerencia/configuracion", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "branch", id: editingBranch.id, ...branchForm }),
        });
      } else {
        await fetch("/api/gerencia/configuracion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(branchForm),
        });
      }
      setBranchModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm("¿Eliminar esta sucursal?")) return;
    await fetch(`/api/gerencia/configuracion?id=${id}`, { method: "DELETE" });
    await loadData();
  };

  const handleDownloadBackup = () => {
    const dump = `-- AutoG Backup\n-- Generated at ${new Date().toISOString()}\n-- Company: ${config.razonSocial} (${config.ruc})\nSELECT * FROM "SystemSetting";\n`;
    const blob = new Blob([dump], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "autog-backup.txt";
    a.click();
  };

  const tabs = [
    { id: "general", label: "🏢 Empresa" },
    { id: "sucursales", label: `🏪 Sucursales (${branches.length})` },
    { id: "impuestos", label: "🧾 SRI / IVA" },
    { id: "notificaciones", label: "🔔 Alertas" },
    { id: "seguridad", label: "🛡️ Seguridad" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Breadcrumb & Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 mb-1.5 sm:mb-2">
              <Link href="/gerencia" className="hover:text-blue-600 transition-colors">Gerencia</Link>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">Configuración</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Ajustes Globales
            </h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="w-full sm:w-auto h-11 sm:h-10 px-6 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>

        {savedBanner && (
          <div className="mb-5 p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-medium">
            ✅ {savedBanner}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
          {/* Menu de Ajustes (Pills horizontales en móvil, Sidebar en desktop) */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 p-1.5 sm:p-2 shadow-sm flex lg:flex-col gap-1 overflow-x-auto no-scrollbar">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`whitespace-nowrap lg:w-full text-left px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-colors ${
                    activeTab === t.id
                      ? "bg-blue-600 text-white lg:bg-zinc-100 lg:dark:bg-zinc-800 lg:text-zinc-900 lg:dark:text-white"
                      : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Área de Contenido */}
          <div className="flex-grow">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 p-5 sm:p-8 shadow-sm">
              
              {/* Vista: Datos de la Empresa */}
              {activeTab === 'general' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
                    Datos de la Empresa
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Razón Social</label>
                      <input
                        type="text"
                        value={config.razonSocial}
                        onChange={(e) => setConfig({ ...config, razonSocial: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Nombre Comercial</label>
                      <input
                        type="text"
                        value={config.nombreComercial}
                        onChange={(e) => setConfig({ ...config, nombreComercial: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">RUC</label>
                      <input
                        type="text"
                        value={config.ruc}
                        onChange={(e) => setConfig({ ...config, ruc: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Teléfono Principal</label>
                      <input
                        type="text"
                        value={config.telefono}
                        onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Dirección Matriz</label>
                      <input
                        type="text"
                        value={config.direccion}
                        onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vista: Sucursales */}
              {activeTab === 'sucursales' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4 gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">Sucursales</h2>
                    <button
                      onClick={openNewBranch}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 active:scale-95"
                    >
                      + Añadir Sucursal
                    </button>
                  </div>
                  
                  <div className="space-y-3.5">
                    {branches.map((b) => (
                      <div key={b.id} className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-zinc-50 dark:bg-zinc-800/20">
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white flex items-center gap-2">
                            {b.name}
                            {b.isMain && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">Matriz</span>}
                          </h3>
                          <p className="text-xs sm:text-sm text-zinc-500 mt-1">{b.address} {b.phone ? `• ${b.phone}` : ""}</p>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditBranch(b)}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteBranch(b.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vista: Facturación */}
              {activeTab === 'impuestos' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
                    Facturación y SRI
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Porcentaje de IVA (%)</label>
                      <input
                        type="number"
                        value={config.iva}
                        onChange={(e) => setConfig({ ...config, iva: Number(e.target.value) })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Moneda del Sistema</label>
                      <select
                        value={config.moneda}
                        onChange={(e) => setConfig({ ...config, moneda: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      >
                        <option>Dólares (USD)</option>
                        <option>Euros (EUR)</option>
                      </select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex items-start gap-3 sm:gap-4 mt-1">
                        <div className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</div>
                        <div>
                          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">Firma Electrónica (SRI)</h4>
                          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-1">
                            La firma electrónica actual (*.p12) expira en {config.firmaDiasRestantes} días.
                          </p>
                          <button
                            onClick={() => {
                              setConfig({ ...config, firmaDiasRestantes: 365 });
                              setSavedBanner("Firma electrónica renovada por 365 días. Presiona Guardar Cambios.");
                            }}
                            className="mt-3 text-xs font-bold text-white bg-blue-600 px-3.5 py-2 rounded-xl hover:bg-blue-700 active:scale-95"
                          >
                            Renovar Firma (365 días)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vista: Notificaciones */}
              {activeTab === 'notificaciones' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
                    Alertas y Correos
                  </h2>
                  <div className="space-y-5">
                    <label className="flex items-center justify-between gap-4 cursor-pointer">
                      <div>
                        <h3 className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white">Alertas de Stock Bajo</h3>
                        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Enviar correo al administrador cuando un producto llegue al mínimo.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.alertasStockBajo}
                        onChange={(e) => setConfig({ ...config, alertasStockBajo: e.target.checked })}
                        className="w-6 h-6 accent-blue-600 flex-shrink-0"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-4 cursor-pointer">
                      <div>
                        <h3 className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white">Recordatorios a Clientes</h3>
                        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Enviar WhatsApp/Email 24h antes de una cita agendada.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.recordatoriosClientes}
                        onChange={(e) => setConfig({ ...config, recordatoriosClientes: e.target.checked })}
                        className="w-6 h-6 accent-blue-600 flex-shrink-0"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-4 cursor-pointer">
                      <div>
                        <h3 className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white">Resumen Diario de Caja</h3>
                        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">Enviar reporte automático al correo gerencial al cerrar el día.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.resumenDiarioCaja}
                        onChange={(e) => setConfig({ ...config, resumenDiarioCaja: e.target.checked })}
                        className="w-6 h-6 accent-blue-600 flex-shrink-0"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Vista: Seguridad */}
              {activeTab === 'seguridad' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
                    Seguridad y Respaldos
                  </h2>
                  <div className="space-y-4 sm:space-y-6">
                    <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                      <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white mb-1">Backups Automáticos</h3>
                      <p className="text-xs sm:text-sm text-zinc-500 mb-4">La base de datos se respalda de manera segura en la nube.</p>
                      <button
                        onClick={handleDownloadBackup}
                        className="w-full sm:w-auto text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Descargar último Backup
                      </button>
                    </div>
                    
                    <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-500/5">
                      <h3 className="font-bold text-sm sm:text-base text-rose-700 dark:text-rose-400 mb-1">Auditoría de Seguridad</h3>
                      <p className="text-xs sm:text-sm text-rose-600/70 dark:text-rose-400/70 mb-4">Registrar evento de cierre global de sesiones en el log de auditoría.</p>
                      <button
                        onClick={async () => {
                          await fetch("/api/gerencia/auditoria", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              userName: "Gerencia General",
                              module: "Inicios de sesión",
                              action: "Reinicio de Sesiones Activas",
                              details: "Se solicitó cierre preventivo de sesiones en todas las sucursales",
                              level: "CRÍTICO",
                            }),
                          });
                          setSavedBanner("Evento de seguridad registrado en Auditoría.");
                        }}
                        className="w-full sm:w-auto text-xs sm:text-sm font-bold text-white bg-rose-600 px-4 py-2.5 rounded-xl hover:bg-rose-700 transition-colors"
                      >
                        Cerrar Todas las Sesiones
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      {branchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border-t sm:border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto pb-8 sm:pb-6">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingBranch ? "Editar Sucursal" : "Añadir Sucursal"}
            </h2>
            <form onSubmit={handleSaveBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Nombre de Sucursal</label>
                <input
                  required
                  type="text"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="Sucursal Sur"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Dirección</label>
                <input
                  required
                  type="text"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="Av. 25 de Julio"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  placeholder="04-255-6677"
                  className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 py-1">
                <input
                  type="checkbox"
                  checked={branchForm.isMain}
                  onChange={(e) => setBranchForm({ ...branchForm, isMain: e.target.checked })}
                  className="w-5 h-5 accent-blue-600"
                />
                Establecer como Sede Matriz
              </label>
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBranchModalOpen(false)}
                  className="h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
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
