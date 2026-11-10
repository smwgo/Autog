"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { GerenciaMobileNav } from "@/components/GerenciaMobileNav";
import { useEffect, useState, useRef } from "react";

export default function ConfiguracionSistema() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState({
    razonSocial: "",
    nombreComercial: "",
    ruc: "",
    telefono: "",
    correo: "",
    direccion: "",
    logoUrl: "",
    iva: 15,
    moneda: "Dólares (USD)",
    obligadoContabilidad: false,
    regimenTributario: "General",
    estabSecuencial: "001",
    ptoEmiSecuencial: "001",
    secuencialFactura: 1,
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
    alertasStockBajo: true,
    umbralStockBajo: 5,
    alertaDestinoWhatsapp: "",
    alertaDestinoCorreo: "",
    recordatoriosClientes: true,
    resumenDiarioCaja: true,
  });

  const [sucursal, setSucursal] = useState({
    id: "",
    name: "",
    address: "",
    phone: "",
    status: "Activa",
  });

  const [firmaData, setFirmaData] = useState({
    archivoNombre: "",
    archivoTamano: "",
    archivoBase64: "",
    tieneArchivo: false,
    fechaCarga: "",
    fechaExpiracion: "",
    entidadEmisora: "",
    ambienteSri: "2", // 1 = Pruebas, 2 = Producción
    tipoEmision: "1",
    claveFirma: "",
    estado: "Pendiente",
  });
  const [mostrarClave, setMostrarClave] = useState(false);
  const [validandoFirma, setValidandoFirma] = useState(false);
  const [validacionMensaje, setValidacionMensaje] = useState("");
  const [validacionError, setValidacionError] = useState("");
  const [probandoSri, setProbandoSri] = useState(false);
  const [sriStatusMsg, setSriStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  const handleTestSri = async () => {
    setProbandoSri(true);
    setSriStatusMsg(null);
    try {
      const res = await fetch("/api/gerencia/configuracion/test-sri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ambiente: firmaData.ambienteSri }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSriStatusMsg({ text: `🟢 ${json.mensaje}`, error: false });
      } else {
        setSriStatusMsg({ text: `🔴 ${json.error || "No se pudo conectar con el SRI"}`, error: true });
      }
    } catch (e: any) {
      setSriStatusMsg({ text: `🔴 Error de red: ${e.message}`, error: true });
    } finally {
      setProbandoSri(false);
    }
  };

  const [mostrarSmtpPass, setMostrarSmtpPass] = useState(false);
  const [probandoSmtp, setProbandoSmtp] = useState(false);
  const [correoPruebaDestino, setCorreoPruebaDestino] = useState("");
  const [smtpStatusMsg, setSmtpStatusMsg] = useState<{ text: string; error: boolean } | null>(null);

  const handleTestSmtp = async () => {
    if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
      setSmtpStatusMsg({ text: "Debes ingresar el Servidor SMTP, Usuario y Contraseña antes de probar.", error: true });
      return;
    }
    const destino = correoPruebaDestino.trim() || config.correo || config.smtpUser;
    if (!destino || !destino.includes("@")) {
      setSmtpStatusMsg({ text: "Ingresa un correo destinatario para recibir el mensaje de prueba.", error: true });
      return;
    }

    setProbandoSmtp(true);
    setSmtpStatusMsg(null);
    try {
      const res = await fetch("/api/gerencia/configuracion/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: config.smtpHost,
          port: config.smtpPort,
          user: config.smtpUser,
          pass: config.smtpPass,
          from: config.smtpFrom || `"${config.nombreComercial || config.razonSocial || 'Facturación'}" <${config.smtpUser}>`,
          to: destino,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSmtpStatusMsg({ text: `🟢 ${json.mensaje}`, error: false });
      } else {
        setSmtpStatusMsg({ text: `🔴 ${json.error || "Fallo de conexión SMTP"}`, error: true });
      }
    } catch (e: any) {
      setSmtpStatusMsg({ text: `🔴 Error de red: ${e.message}`, error: true });
    } finally {
      setProbandoSmtp(false);
    }
  };

  const diasRestantes = (() => {
    if (!firmaData.fechaExpiracion) return 0;
    const diff = new Date(firmaData.fechaExpiracion).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setConfig((prev) => ({
        ...prev,
        logoUrl: String(reader.result || ""),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(",")[1] || "";
      setFirmaData((prev) => ({
        ...prev,
        archivoNombre: file.name,
        archivoTamano: `${(file.size / 1024).toFixed(1)} KB`,
        archivoBase64: base64Data,
        tieneArchivo: true,
        fechaCarga: new Date().toISOString().split("T")[0],
      }));
      setValidacionError("");
      setValidacionMensaje("Archivo cargado. Haz clic en 'Probar' para verificar con la contraseña.");
    };
    reader.readAsDataURL(file);
  };

  const handleValidarFirma = async () => {
    setValidacionError("");
    setValidacionMensaje("");

    if (!firmaData.archivoBase64 && !firmaData.tieneArchivo) {
      setValidacionError("Primero debes seleccionar el archivo .p12");
      return;
    }

    if (!firmaData.claveFirma || firmaData.claveFirma.trim() === "") {
      setValidacionError("Ingresa la contraseña de la firma");
      return;
    }

    setValidandoFirma(true);
    try {
      const res = await fetch("/api/gerencia/configuracion/validar-firma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p12Base64: firmaData.archivoBase64,
          password: firmaData.claveFirma,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setValidacionError(json.error || "Error al validar la firma");
        setFirmaData((prev) => ({ ...prev, estado: "Invalida" }));
      } else {
        setFirmaData((prev) => ({
          ...prev,
          entidadEmisora: json.entidadEmisora || prev.entidadEmisora,
          fechaExpiracion: json.fechaExpiracion || prev.fechaExpiracion,
          fechaCarga: json.fechaCarga || prev.fechaCarga,
          estado: json.estado || "Activa",
        }));
        setValidacionMensaje(`✅ Firma verificada: Emitida por ${json.entidadEmisora} (${json.diasRestantes} días restantes)`);
      }
    } catch {
      setValidacionError("Error de comunicación al validar el certificado");
    } finally {
      setValidandoFirma(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gerencia/configuracion");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig({
            razonSocial: data.config.razonSocial || "",
            nombreComercial: data.config.nombreComercial || "",
            ruc: data.config.ruc || "",
            telefono: data.config.telefono || "",
            correo: data.config.correo || "",
            direccion: data.config.direccion || "",
            logoUrl: data.config.logoUrl || "",
            iva: Number(data.config.iva ?? 15),
            moneda: data.config.moneda || "Dólares (USD)",
            obligadoContabilidad: Boolean(data.config.obligadoContabilidad),
            regimenTributario: data.config.regimenTributario || "General",
            estabSecuencial: data.config.estabSecuencial || "001",
            ptoEmiSecuencial: data.config.ptoEmiSecuencial || "001",
            secuencialFactura: Number(data.config.secuencialFactura ?? 1),
            smtpHost: data.config.smtpHost || "",
            smtpPort: Number(data.config.smtpPort ?? 587),
            smtpUser: data.config.smtpUser || "",
            smtpPass: data.config.smtpPass || "",
            smtpFrom: data.config.smtpFrom || "",
            alertasStockBajo: Boolean(data.config.alertasStockBajo ?? true),
            umbralStockBajo: Number(data.config.umbralStockBajo ?? 5),
            alertaDestinoWhatsapp: data.config.alertaDestinoWhatsapp || "",
            alertaDestinoCorreo: data.config.alertaDestinoCorreo || "",
            recordatoriosClientes: Boolean(data.config.recordatoriosClientes ?? true),
            resumenDiarioCaja: Boolean(data.config.resumenDiarioCaja ?? true),
          });
          if (data.config.firmaElectronica) {
            setFirmaData({
              archivoNombre: data.config.firmaElectronica.archivoNombre || "",
              archivoTamano: data.config.firmaElectronica.archivoTamano || "",
              archivoBase64: "",
              tieneArchivo: Boolean(data.config.firmaElectronica.tieneArchivo),
              fechaCarga: data.config.firmaElectronica.fechaCarga || "",
              fechaExpiracion: data.config.firmaElectronica.fechaExpiracion || "",
              entidadEmisora: data.config.firmaElectronica.entidadEmisora || "",
              ambienteSri: data.config.firmaElectronica.ambienteSri || "2",
              tipoEmision: data.config.firmaElectronica.tipoEmision || "1",
              claveFirma: data.config.firmaElectronica.claveFirma || "",
              estado: data.config.firmaElectronica.estado || "Pendiente",
            });
          }
        }
        if (data.branches && data.branches.length > 0) {
          const b = data.branches[0];
          setSucursal({
            id: b.id || "",
            name: b.name || "",
            address: b.address || "",
            phone: b.phone || "",
            status: b.status || "Activa",
          });
        }
      }
    } catch (err) {
      console.error("Error loading config:", err);
    } finally {
      setLoading(false);
    }
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
        setTimeout(() => setSavedBanner(""), 3500);
      } else {
        alert("Error al guardar en base de datos");
      }
    } catch (err) {
      console.error("Error saving config:", err);
      alert("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSucursal = async () => {
    await handleSaveConfig();
  };

  const handleDownloadBackup = () => {
    const dump = `-- AutoG Backup\n-- Generated at ${new Date().toISOString()}\n-- Company: ${config.razonSocial} (${config.ruc})\nSELECT * FROM "CompanyConfig";\n`;
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

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
        <Header />
        <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex items-center justify-center">
          <div className="text-center py-24 text-zinc-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3" />
            <p className="text-xs sm:text-sm">Cargando configuración...</p>
          </div>
        </main>
        <GerenciaMobileNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Encabezado */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/gerencia"
              title="Volver a Gerencia"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Configuración
            </h1>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {savedBanner && (
              <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2 rounded-xl animate-in fade-in">
                ✓ {savedBanner}
              </span>
            )}
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="w-full sm:w-auto h-11 sm:h-10 px-6 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
          {/* Navegación lateral */}
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

          {/* Área de contenido */}
          <div className="flex-grow">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 p-5 sm:p-8 shadow-sm">
              
              {/* 1. Empresa */}
              {activeTab === 'general' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
                    Empresa
                  </h2>
                  
                  {/* Logo Corporativo */}
                  <div className="mb-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                      {config.logoUrl ? (
                        <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-2xl text-zinc-400">🏢</span>
                      )}
                    </div>
                    <div className="flex-grow text-center sm:text-left">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">Logo</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Visible en proformas, órdenes y facturas (PNG, JPG)</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs active:scale-95 transition-all"
                      >
                        {config.logoUrl ? "Cambiar" : "Subir"}
                      </button>
                      {config.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setConfig({ ...config, logoUrl: "" })}
                          className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-all"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Razón Social</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={config.razonSocial}
                        onChange={(e) => setConfig({ ...config, razonSocial: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Comercial</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={config.nombreComercial}
                        onChange={(e) => setConfig({ ...config, nombreComercial: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">RUC</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={config.ruc}
                        onChange={(e) => setConfig({ ...config, ruc: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">WhatsApp</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={config.telefono}
                        onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Correo</label>
                      <input
                        type="email"
                        autoComplete="off"
                        value={config.correo}
                        onChange={(e) => setConfig({ ...config, correo: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Dirección</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={config.direccion}
                        onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Sucursales (Sin cambios adicionales según punto 3 descartado) */}
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
                        autoComplete="off"
                        value={sucursal.name}
                        onChange={(e) => setSucursal({ ...sucursal, name: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">WhatsApp</label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={sucursal.phone}
                        onChange={(e) => setSucursal({ ...sucursal, phone: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Dirección
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={sucursal.address}
                        onChange={(e) => setSucursal({ ...sucursal, address: e.target.value })}
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

              {/* 3. Facturación / SRI */}
              {activeTab === 'impuestos' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
                    SRI
                  </h2>

                  {/* Parámetros fiscales */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">IVA (%)</label>
                      <input
                        type="number"
                        value={config.iva}
                        onChange={(e) => setConfig({ ...config, iva: Number(e.target.value) })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Moneda</label>
                      <select
                        value={config.moneda}
                        onChange={(e) => setConfig({ ...config, moneda: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-medium"
                      >
                        <option>Dólares (USD)</option>
                        <option>Euros (EUR)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Régimen</label>
                      <select
                        value={config.regimenTributario}
                        onChange={(e) => setConfig({ ...config, regimenTributario: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-medium"
                      >
                        <option value="General">General</option>
                        <option value="RIMPE Emprendedor">RIMPE Emprendedor</option>
                        <option value="RIMPE Negocio Popular">RIMPE Negocio Popular</option>
                      </select>
                    </div>
                  </div>

                  {/* Contabilidad y Secuenciales */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 items-center">
                    <div className="md:col-span-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.obligadoContabilidad}
                          onChange={(e) => setConfig({ ...config, obligadoContabilidad: e.target.checked })}
                          className="w-4 h-4 accent-blue-600 rounded"
                        />
                        <span className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          Contabilidad obligada
                        </span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Estab.</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={config.estabSecuencial}
                        onChange={(e) => setConfig({ ...config, estabSecuencial: e.target.value })}
                        className="w-full h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs sm:text-sm font-mono outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Pto. Emisión</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={config.ptoEmiSecuencial}
                        onChange={(e) => setConfig({ ...config, ptoEmiSecuencial: e.target.value })}
                        className="w-full h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs sm:text-sm font-mono outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Sig. Factura</label>
                      <input
                        type="number"
                        min={1}
                        value={config.secuencialFactura}
                        onChange={(e) => setConfig({ ...config, secuencialFactura: Number(e.target.value) })}
                        className="w-full h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs sm:text-sm font-mono outline-none focus:border-blue-500 text-center"
                      />
                    </div>
                  </div>

                  {/* Tarjeta de Firma Electrónica */}
                  <div>
                    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🔐</span>
                          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                            Firma
                          </h3>
                        </div>
                        {firmaData.fechaExpiracion ? (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            diasRestantes > 30 
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                              : diasRestantes > 0
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60"
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                            {diasRestantes > 0 ? `${diasRestantes} días` : "Vencida"}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800">
                            No cargada
                          </span>
                        )}
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
                              autoComplete="off"
                              value={firmaData.claveFirma}
                              onChange={(e) => setFirmaData({ ...firmaData, claveFirma: e.target.value })}
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
                          <input
                            type="text"
                            readOnly
                            value={firmaData.entidadEmisora}
                            className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 text-xs sm:text-sm outline-none text-zinc-700 dark:text-zinc-300 font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                            Expiración
                          </label>
                          <input
                            type="text"
                            readOnly
                            value={firmaData.fechaExpiracion}
                            className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3 text-xs sm:text-sm outline-none text-zinc-700 dark:text-zinc-300 font-medium"
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

                      {/* Estado de conexión SRI */}
                      {sriStatusMsg && (
                        <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                          sriStatusMsg.error
                            ? "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                            : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                        }`}>
                          {sriStatusMsg.text}
                        </div>
                      )}

                      {/* Botón Probar Firma y Probar Conexión SRI */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={handleValidarFirma}
                          disabled={validandoFirma}
                          className="h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          <span>⚡</span>
                          <span>{validandoFirma ? "Verificando..." : "Validar Firma .p12"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleTestSri}
                          disabled={probandoSri}
                          className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
                        >
                          <span>🌐</span>
                          <span>{probandoSri ? "Conectando al SRI..." : "Probar Conexión SRI"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta de Servidor de Correo (SMTP para Facturas SRI) */}
                  <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📧</span>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                            Servidor de Correo (SMTP para Envío de Facturas y RIDE)
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Envía automáticamente las facturas autorizadas (PDF y XML) al correo de tus clientes
                          </p>
                        </div>
                      </div>
                      {config.smtpHost && config.smtpUser ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200">
                          Configurado
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800">
                          Sin configurar
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Servidor SMTP (Host)
                        </label>
                        <input
                          type="text"
                          value={config.smtpHost}
                          onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                          placeholder="smtp.gmail.com o mail.tudominio.com"
                          className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Puerto
                        </label>
                        <input
                          type="number"
                          value={config.smtpPort}
                          onChange={(e) => setConfig({ ...config, smtpPort: Number(e.target.value) })}
                          placeholder="587 o 465"
                          className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Usuario / Correo Remitente
                        </label>
                        <input
                          type="email"
                          value={config.smtpUser}
                          onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                          placeholder="facturacion@mitaller.com"
                          className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                          Contraseña de Aplicación / Password
                        </label>
                        <div className="relative">
                          <input
                            type={mostrarSmtpPass ? "text" : "password"}
                            autoComplete="off"
                            value={config.smtpPass}
                            onChange={(e) => setConfig({ ...config, smtpPass: e.target.value })}
                            placeholder="••••••••••••••••"
                            className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent pl-3.5 pr-10 text-base sm:text-sm outline-none focus:border-blue-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarSmtpPass(!mostrarSmtpPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm cursor-pointer"
                            title={mostrarSmtpPass ? "Ocultar" : "Ver"}
                          >
                            {mostrarSmtpPass ? "🙈" : "👁️"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Nombre Visible del Remitente (Opcional)
                      </label>
                      <input
                        type="text"
                        value={config.smtpFrom}
                        onChange={(e) => setConfig({ ...config, smtpFrom: e.target.value })}
                        placeholder={`"${config.nombreComercial || config.razonSocial || 'Mi Taller'}" <${config.smtpUser || 'facturacion@mitaller.com'}>`}
                        className="w-full h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent px-3.5 text-base sm:text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Mensaje de prueba SMTP */}
                    {smtpStatusMsg && (
                      <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                        smtpStatusMsg.error
                          ? "bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                          : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                      }`}>
                        {smtpStatusMsg.text}
                      </div>
                    )}

                    {/* Fila de prueba SMTP */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex-grow w-full sm:w-auto">
                        <input
                          type="email"
                          value={correoPruebaDestino}
                          onChange={(e) => setCorreoPruebaDestino(e.target.value)}
                          placeholder="correo-para-recibir-prueba@ejemplo.com"
                          className="w-full h-10 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-xs sm:text-sm outline-none focus:border-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleTestSmtp}
                        disabled={probandoSmtp}
                        className="w-full sm:w-auto h-10 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm shrink-0"
                      >
                        <span>📨</span>
                        <span>{probandoSmtp ? "Enviando prueba..." : "Probar Envío de Correo"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Alertas */}
              {activeTab === 'notificaciones' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-5 sm:mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 sm:pb-4">
                    Alertas
                  </h2>

                  {/* Destinatarios */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60">
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        WhatsApp de alertas
                      </label>
                      <input
                        type="text"
                        autoComplete="off"
                        value={config.alertaDestinoWhatsapp}
                        onChange={(e) => setConfig({ ...config, alertaDestinoWhatsapp: e.target.value })}
                        className="w-full h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs sm:text-sm outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Correo de alertas
                      </label>
                      <input
                        type="email"
                        autoComplete="off"
                        value={config.alertaDestinoCorreo}
                        onChange={(e) => setConfig({ ...config, alertaDestinoCorreo: e.target.value })}
                        className="w-full h-10 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs sm:text-sm outline-none focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Switches de alertas */}
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white block">Stock Bajo</span>
                        <span className="text-xs text-zinc-500">Notificar cuando un insumo llegue a su límite</span>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                          <span className="text-xs text-zinc-500">Mín:</span>
                          <input
                            type="number"
                            min={1}
                            value={config.umbralStockBajo}
                            onChange={(e) => setConfig({ ...config, umbralStockBajo: Number(e.target.value) })}
                            className="w-12 h-7 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-center text-xs font-semibold outline-none"
                          />
                        </div>
                        <input
                          type="checkbox"
                          checked={config.alertasStockBajo}
                          onChange={(e) => setConfig({ ...config, alertasStockBajo: e.target.checked })}
                          className="w-5 h-5 accent-blue-600 flex-shrink-0 cursor-pointer"
                        />
                      </div>
                    </div>

                    <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                      <div>
                        <span className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white block">Recordatorios</span>
                        <span className="text-xs text-zinc-500">Avisos automáticos de mantenimientos y citas</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.recordatoriosClientes}
                        onChange={(e) => setConfig({ ...config, recordatoriosClientes: e.target.checked })}
                        className="w-5 h-5 accent-blue-600 flex-shrink-0"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                      <div>
                        <span className="font-medium text-sm sm:text-base text-zinc-900 dark:text-white block">Cierre Diario</span>
                        <span className="text-xs text-zinc-500">Resumen financiero enviado al finalizar la jornada</span>
                      </div>
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

              {/* 5. Seguridad (Sin cambios según punto 5 descartado) */}
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
