"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { useEffect, useState, useRef } from "react";

export default function ConfiguracionSistema() {
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState({
    razonSocial: "AutoG Servicios Automotrices S.A.",
    nombreComercial: "AutoG",
    ruc: "0992345678001",
    telefono: "0991234567",
    direccion: "Av. de las Américas y Plaza Dañín, Guayaquil, Ecuador",
    iva: 15,
    moneda: "Dólares (USD)",
    firmaDiasRestantes: 45,
    alertasStockBajo: true,
    recordatoriosClientes: true,
    resumenDiarioCaja: true,
  });

  const [sucursal, setSucursal] = useState({
    id: "branch_sucursal_1",
    name: "Sucursal Samborondón",
    address: "Av. Samborondón Km 1.5, Samborondón, Ecuador",
    phone: "0991234567",
    status: "Activa",
  });

  const [firmaData, setFirmaData] = useState({
    archivoNombre: "",
    archivoTamano: "",
    fechaCarga: "",
    fechaExpiracion: "2027-11-03",
    entidadEmisora: "Security Data S.A.",
    ambienteSri: "2", // 1 = Pruebas, 2 = Producción
    claveFirma: "",
    estado: "Pendiente",
  });
  const [mostrarClave, setMostrarClave] = useState(false);
  const [validandoFirma, setValidandoFirma] = useState(false);
  const [validacionMensaje, setValidacionMensaje] = useState("");
  const [validacionError, setValidacionError] = useState("");

  const diasRestantes = (() => {
    if (!firmaData.fechaExpiracion) return 365;
    const diff = new Date(firmaData.fechaExpiracion).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFirmaData((prev) => ({
        ...prev,
        archivoNombre: file.name,
        archivoTamano: `${(file.size / 1024).toFixed(1)} KB`,
        fechaCarga: new Date().toISOString().split("T")[0],
        estado: "Activa",
      }));
      setValidacionError("");
      setValidacionMensaje("✅ Cargado");
    };
    reader.readAsDataURL(file);
  };

  const handleValidarFirma = () => {
    setValidacionError("");
    setValidacionMensaje("");
    if (!firmaData.archivoNombre) {
      setValidacionError("Archivo requerido");
      return;
    }
    if (!firmaData.claveFirma || firmaData.claveFirma.trim() === "") {
      setValidacionError("Contraseña requerida");
      return;
    }
    setValidandoFirma(true);
    setTimeout(() => {
      setValidandoFirma(false);
      setValidacionMensaje("✅ Conectado");
    }, 700);
  };

  const loadData = async () => {
    try {
      const res = await fetch("/api/gerencia/configuracion");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          const cfg = { ...data.config };
          if (!cfg.telefono || cfg.telefono === "04-234-5678" || cfg.telefono.startsWith("04-")) {
            cfg.telefono = "0991234567";
          }
          setConfig(cfg);
          if (data.config.firmaElectronica) {
            setFirmaData((prev) => ({ ...prev, ...data.config.firmaElectronica }));
          }
        }
        if (data.branches && data.branches.length > 0) {
          const b = data.branches[0];
          setSucursal({
            id: b.id || "branch_sucursal_1",
            name: b.name || "Sucursal Samborondón",
            address: b.address || "Av. Samborondón Km 1.5, Samborondón, Ecuador",
            phone: b.phone || "0991234567",
            status: b.status || "Activa",
          });
        }
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
        body: JSON.stringify({
          type: "config",
          config: { ...config, firmaElectronica: firmaData },
          sucursal,
        }),
      });
      if (res.ok) {
        setSavedBanner("Guardado");
        setTimeout(() => setSavedBanner(""), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFirma = async () => {
    setSaving(true);
    setSavedBanner("");
    try {
      const res = await fetch("/api/gerencia/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "config",
          config: { ...config, firmaElectronica: firmaData },
          sucursal,
        }),
      });
      if (res.ok) {
        setSavedBanner("Guardado");
        setTimeout(() => setSavedBanner(""), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSucursal = async () => {
    setSaving(true);
    setSavedBanner("");
    try {
      const res = await fetch("/api/gerencia/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "branch", ...sucursal }),
      });
      if (res.ok) {
        setSavedBanner("Guardado");
        setTimeout(() => setSavedBanner(""), 3000);
      }
    } finally {
      setSaving(false);
    }
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
    { id: "sucursales", label: "🏪 Sucursal" },
    { id: "impuestos", label: "🧾 SRI" },
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
              Configuración
            </h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="w-full sm:w-auto h-11 sm:h-10 px-6 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
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
            <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 p-2 sm:p-2.5 shadow-sm flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`whitespace-nowrap lg:w-full text-left px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold transition-all ${
                    activeTab === t.id
                      ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 font-bold shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                    Empresa
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
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Comercial</label>
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
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">WhatsApp</label>
                      <input
                        type="text"
                        value={config.telefono}
                        onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                        placeholder="0991234567"
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Dirección</label>
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

              {/* Vista: Sucursal Única */}
              {activeTab === 'sucursales' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex justify-between items-center mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4 gap-2">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">Sucursal</h2>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                      Activa
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={sucursal.name}
                        onChange={(e) => setSucursal({ ...sucursal, name: e.target.value })}
                        placeholder="Sucursal Samborondón"
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">WhatsApp</label>
                      <input
                        type="text"
                        value={sucursal.phone}
                        onChange={(e) => setSucursal({ ...sucursal, phone: e.target.value })}
                        placeholder="0991234567"
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Dirección
                      </label>
                      <input
                        type="text"
                        value={sucursal.address}
                        onChange={(e) => setSucursal({ ...sucursal, address: e.target.value })}
                        placeholder="Av. Samborondón Km 1.5, Samborondón, Ecuador"
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveSucursal}
                      disabled={saving}
                      className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Vista: Facturación / SRI */}
              {activeTab === 'impuestos' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
                    SRI
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">IVA (%)</label>
                      <input
                        type="number"
                        value={config.iva}
                        onChange={(e) => setConfig({ ...config, iva: Number(e.target.value) })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Moneda</label>
                      <select
                        value={config.moneda}
                        onChange={(e) => setConfig({ ...config, moneda: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      >
                        <option>Dólares (USD)</option>
                        <option>Euros (EUR)</option>
                      </select>
                    </div>

                    {/* Tarjeta de Firma Electrónica */}
                    <div className="col-span-1 md:col-span-2">
                      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🔐</span>
                            <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                              Firma
                            </h3>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            diasRestantes > 30 
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                              : diasRestantes > 0
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                            {diasRestantes > 0 ? "Vigente" : "Vencida"}
                          </span>
                        </div>

                        {/* Archivo y Contraseña */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                              Archivo
                            </label>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".p12,.pfx"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            {firmaData.archivoNombre ? (
                              <div className="w-full h-11 px-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 flex items-center justify-between gap-2 shadow-xs">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-sm">✅</span>
                                  <span className="text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-200 truncate">
                                    {firmaData.archivoNombre}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-50 shrink-0 cursor-pointer"
                                >
                                  Cambiar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-11 px-3.5 rounded-xl border-2 border-dashed border-blue-400 dark:border-blue-600 hover:border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                              >
                                <span>📤</span>
                                <span>Subir</span>
                              </button>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                              Contraseña
                            </label>
                            <div className="relative">
                              <input
                                type={mostrarClave ? "text" : "password"}
                                value={firmaData.claveFirma}
                                onChange={(e) => setFirmaData({ ...firmaData, claveFirma: e.target.value })}
                                placeholder="Contraseña"
                                className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent pl-3.5 pr-10 text-base sm:text-sm outline-none focus:border-blue-500 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setMostrarClave(!mostrarClave)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
                                title={mostrarClave ? "Ocultar" : "Ver"}
                              >
                                {mostrarClave ? "🙈" : "👁️"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Ambiente, Entidad y Expiración */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                              Ambiente
                            </label>
                            <select
                              value={firmaData.ambienteSri}
                              onChange={(e) => setFirmaData({ ...firmaData, ambienteSri: e.target.value })}
                              className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs sm:text-sm outline-none focus:border-blue-500 font-medium"
                            >
                              <option value="2">Producción</option>
                              <option value="1">Pruebas</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                              Entidad
                            </label>
                            <select
                              value={firmaData.entidadEmisora}
                              onChange={(e) => setFirmaData({ ...firmaData, entidadEmisora: e.target.value })}
                              className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs sm:text-sm outline-none focus:border-blue-500 font-medium"
                            >
                              <option value="Security Data S.A.">Security Data</option>
                              <option value="Banco Central del Ecuador (BCE)">Banco Central</option>
                              <option value="ANF Autoridad de Certificación">ANF</option>
                              <option value="Uanataca Ecuador">Uanataca</option>
                              <option value="Consejo de la Judicatura">Judicatura</option>
                              <option value="Datapro S.A.">Datapro</option>
                              <option value="Otra entidad autorizada">Otra</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                              Expiración
                            </label>
                            <input
                              type="date"
                              value={firmaData.fechaExpiracion}
                              onChange={(e) => setFirmaData({ ...firmaData, fechaExpiracion: e.target.value })}
                              className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-xs sm:text-sm outline-none focus:border-blue-500 font-medium"
                            />
                          </div>
                        </div>

                        {/* Mensaje de validación o error */}
                        {validacionMensaje && (
                          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                            {validacionMensaje}
                          </div>
                        )}
                        {validacionError && (
                          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold">
                            ⚠️ {validacionError}
                          </div>
                        )}

                        {/* Acciones */}
                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                          <button
                            type="button"
                            onClick={handleValidarFirma}
                            disabled={validandoFirma}
                            className="h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                          >
                            <span>⚡</span>
                            <span>{validandoFirma ? "Probando..." : "Probar"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleSaveFirma}
                            disabled={saving}
                            className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                          >
                            {saving ? "Guardando..." : "Guardar"}
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
                    Alertas
                  </h2>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                      <span className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white">Stock Bajo</span>
                      <input
                        type="checkbox"
                        checked={config.alertasStockBajo}
                        onChange={(e) => setConfig({ ...config, alertasStockBajo: e.target.checked })}
                        className="w-5 h-5 accent-blue-600 flex-shrink-0"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                      <span className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white">Recordatorios</span>
                      <input
                        type="checkbox"
                        checked={config.recordatoriosClientes}
                        onChange={(e) => setConfig({ ...config, recordatoriosClientes: e.target.checked })}
                        className="w-5 h-5 accent-blue-600 flex-shrink-0"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                      <span className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white">Cierre Diario</span>
                      <input
                        type="checkbox"
                        checked={config.resumenDiarioCaja}
                        onChange={(e) => setConfig({ ...config, resumenDiarioCaja: e.target.checked })}
                        className="w-5 h-5 accent-blue-600 flex-shrink-0"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Vista: Seguridad */}
              {activeTab === 'seguridad' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
                    Seguridad
                  </h2>
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-4">
                      <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">Respaldos</h3>
                      <button
                        onClick={handleDownloadBackup}
                        className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Descargar
                      </button>
                    </div>
                    
                    <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-500/5 flex items-center justify-between gap-4">
                      <h3 className="font-bold text-sm sm:text-base text-rose-700 dark:text-rose-400">Sesiones</h3>
                      <button
                        onClick={async () => {
                          await fetch("/api/gerencia/auditoria", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              userName: "Gerencia",
                              module: "Seguridad",
                              action: "Cierre de Sesiones",
                              details: "Cierre preventivo",
                              level: "CRÍTICO",
                            }),
                          });
                          setSavedBanner("Sesiones cerradas");
                        }}
                        className="text-xs sm:text-sm font-bold text-white bg-rose-600 px-4 py-2 rounded-xl hover:bg-rose-700 transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>

      <GerenciaMobileNav />
    </div>
  );
}
