"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";
import { ClienteMobileNav } from "@/components/ClienteMobileNav";

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  notifications: {
    reminders: boolean;
    repairs: boolean;
    promos: boolean;
  };
}

export default function MiPerfilPage() {
  const [activeTab, setActiveTab] = useState('personales'); // personales, seguridad, notificaciones
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Campos editables del perfil activo
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notifReminders, setNotifReminders] = useState(true);
  const [notifRepairs, setNotifRepairs] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);

  // Campos de seguridad
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Modal para crear nuevo perfil de cliente en Neon DB (POST)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTaxId, setNewTaxId] = useState('XAXX010101000');
  const [newAddress, setNewAddress] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const applyProfileToForm = (p: ClientProfile) => {
    setSelectedProfileId(p.id);
    setName(p.name || '');
    setTaxId(p.taxId || '');
    setEmail(p.email || '');
    setPhone(p.phone || '');
    setAddress(p.address || '');
    setNotifReminders(p.notifications?.reminders ?? true);
    setNotifRepairs(p.notifications?.repairs ?? true);
    setNotifPromos(p.notifications?.promos ?? false);
  };

  const fetchProfiles = useCallback(async (keepId?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/cliente/perfil', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.perfiles) && data.perfiles.length > 0) {
        setProfiles(data.perfiles);
        const target =
          data.perfiles.find((p: ClientProfile) => p.id === (keepId || selectedProfileId)) ||
          data.perfiles[0];
        applyProfileToForm(target);
      }
    } catch (err) {
      console.error('Error cargando perfil desde base de datos:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // GUARDAR CAMBIOS EN NEON DB (PUT /api/cliente/perfil)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) return;

    if (activeTab === 'seguridad') {
      if (!newPass || newPass !== confirmPass) {
        showToast('Las contraseñas nuevas no coinciden.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/cliente/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProfileId,
          name,
          taxId,
          email,
          phone,
          address,
          notifications: {
            reminders: notifReminders,
            repairs: notifRepairs,
            promos: notifPromos,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar en base de datos');
      }
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      showToast('Cambios guardados con éxito');
      await fetchProfiles(selectedProfileId);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // CREAR NUEVO PERFIL EN NEON DB (POST /api/cliente/perfil)
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/cliente/perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim(),
          taxId: newTaxId.trim(),
          address: newAddress.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al crear perfil en base de datos');
      }
      setIsNewModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewAddress('');
      showToast(`Perfil de ${data.perfil.name} creado.`);
      await fetchProfiles(data.perfil.id);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ELIMINAR PERFIL ACTUAL DE NEON DB (DELETE /api/cliente/perfil)
  const handleDeleteProfile = async () => {
    if (!selectedProfileId || profiles.length <= 1) {
      showToast('Debes conservar al menos un perfil activo.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/cliente/perfil?id=${encodeURIComponent(selectedProfileId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar perfil');
      }
      showToast('Perfil eliminado.');
      const nextProfile = profiles.find((p) => p.id !== selectedProfileId);
      await fetchProfiles(nextProfile?.id);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-5xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6 flex justify-between items-center">
          <Link href="/cliente" className="text-sm font-medium text-zinc-600 hover:text-zinc-500 flex items-center gap-1 w-fit">
            &larr; Volver a Portal de Cliente
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Perfiles ({profiles.length})</span>
          </div>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/cliente"
                title="Volver a Portal de Cliente"
                className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="w-12 h-12 rounded-xl bg-zinc-500 bg-opacity-10 flex items-center justify-center text-2xl shrink-0">
                ⚙️
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Mi Perfil
              </h1>
            </div>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
              Actualiza tus datos de contacto y preferencias.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {profiles.length > 0 && (
              <select
                value={selectedProfileId}
                onChange={(e) => {
                  const found = profiles.find((p) => p.id === e.target.value);
                  if (found) applyProfileToForm(found);
                }}
                className="px-3.5 py-2.5 min-h-[44px] rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-base sm:text-xs font-bold text-zinc-800 dark:text-zinc-200 flex-1 sm:flex-initial"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    👤 {p.name} ({p.taxId || 'Sin RFC'})
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="cursor-pointer min-h-[44px] h-11 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 text-white text-base sm:text-xs font-bold transition-colors flex items-center justify-center flex-1 sm:flex-initial"
            >
              + Nuevo Perfil
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500">
            Cargando perfil...
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8">
            
            {/* Sidebar / Tabs */}
            <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
              <button 
                onClick={() => setActiveTab('personales')}
                className={`cursor-pointer min-h-[44px] text-left px-5 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap text-base sm:text-sm flex items-center ${activeTab === 'personales' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
              >
                👤 Datos Personales
              </button>
              <button 
                onClick={() => setActiveTab('seguridad')}
                className={`cursor-pointer min-h-[44px] text-left px-5 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap text-base sm:text-sm flex items-center ${activeTab === 'seguridad' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
              >
                🔒 Seguridad
              </button>
              <button 
                onClick={() => setActiveTab('notificaciones')}
                className={`cursor-pointer min-h-[44px] text-left px-5 py-3.5 rounded-2xl font-bold transition-all whitespace-nowrap text-base sm:text-sm flex items-center ${activeTab === 'notificaciones' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
              >
                🔔 Notificaciones
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden p-6 md:p-10 relative">
                
                {/* Toast de éxito guardando */}
                <div className={`z-20 absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-emerald-500/20 transition-all duration-300 text-sm ${toastMsg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                  {toastMsg}
                </div>

                {activeTab === 'personales' && (
                  <form onSubmit={handleSave} className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Datos Personales</h2>
                    
                    <div className="flex items-center justify-between gap-6 mb-8">
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700">
                          👤
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 dark:text-white text-lg">{name || 'Cliente'}</p>
                          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">ID: {selectedProfileId}</p>
                        </div>
                      </div>
                      {profiles.length > 1 && (
                        <button
                          type="button"
                          onClick={handleDeleteProfile}
                          disabled={isSaving}
                          className="cursor-pointer min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center justify-center"
                        >
                          🗑️ Eliminar Perfil
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Nombre Completo</label>
                        <input 
                          type="text" 
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-3.5 min-h-[44px] rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white font-medium text-base sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">RFC / Documento</label>
                        <input 
                          type="text" 
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          className="w-full px-4 py-3.5 min-h-[44px] rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white font-medium text-base sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Correo Electrónico</label>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3.5 min-h-[44px] rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white font-medium text-base sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Teléfono Móvil</label>
                        <input 
                          type="tel" 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-3.5 min-h-[44px] rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white font-medium text-base sm:text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Dirección de Facturación</label>
                        <input 
                          type="text" 
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-4 py-3.5 min-h-[44px] rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white font-medium text-base sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="cursor-pointer min-h-[44px] h-12 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-8 rounded-2xl font-bold transition-colors shadow-lg disabled:opacity-50 text-base sm:text-sm flex items-center justify-center w-full sm:w-auto"
                      >
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === 'seguridad' && (
                  <form onSubmit={handleSave} className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Seguridad y Contraseña</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Contraseña Actual</label>
                        <input 
                          type="password" 
                          value={currentPass}
                          onChange={(e) => setCurrentPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3.5 min-h-[44px] rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white text-base sm:text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Nueva Contraseña</label>
                          <input 
                            type="password" 
                            value={newPass}
                            onChange={(e) => setNewPass(e.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            className="w-full px-4 py-3.5 min-h-[44px] rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white text-base sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">Confirmar Contraseña</label>
                          <input 
                            type="password" 
                            value={confirmPass}
                            onChange={(e) => setConfirmPass(e.target.value)}
                            placeholder="Repite la nueva contraseña"
                            className="w-full px-4 py-3.5 min-h-[44px] rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all dark:text-white text-base sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="cursor-pointer min-h-[44px] h-12 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-8 rounded-2xl font-bold transition-colors shadow-lg disabled:opacity-50 text-base sm:text-sm flex items-center justify-center w-full sm:w-auto"
                      >
                        {isSaving ? 'Actualizando...' : 'Actualizar Contraseña'}
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === 'notificaciones' && (
                  <form onSubmit={handleSave} className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Preferencias de Notificación</h2>
                    
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 min-h-[48px] rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-base">Recordatorios de Servicio</h4>
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Recibe alertas cuando tu auto necesite mantenimiento.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifReminders}
                          onChange={(e) => setNotifReminders(e.target.checked)}
                          className="w-5 h-5 accent-zinc-900 dark:accent-white shrink-0 ml-3"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 min-h-[48px] rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-base">Estado de Reparaciones</h4>
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Actualizaciones en tiempo real por SMS sobre trabajos en curso.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifRepairs}
                          onChange={(e) => setNotifRepairs(e.target.checked)}
                          className="w-5 h-5 accent-zinc-900 dark:accent-white shrink-0 ml-3"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 min-h-[48px] rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-base">Promociones y Ofertas</h4>
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Descuentos exclusivos en repuestos y mano de obra.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifPromos}
                          onChange={(e) => setNotifPromos(e.target.checked)}
                          className="w-5 h-5 accent-zinc-900 dark:accent-white shrink-0 ml-3"
                        />
                      </label>
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="cursor-pointer min-h-[44px] h-12 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-8 rounded-2xl font-bold transition-colors shadow-lg disabled:opacity-50 text-base sm:text-sm flex items-center justify-center w-full sm:w-auto"
                      >
                        {isSaving ? 'Guardando...' : 'Guardar Preferencias'}
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
          </div>
        )}

      </main>

      {/* ======================================================== */}
      {/* MODAL: NUEVO PERFIL EN NEON DB (POST)                    */}
      {/* ======================================================== */}
      {isNewModalOpen && (
        <div
          onClick={() => setIsNewModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border-t sm:border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="cursor-pointer absolute top-4 right-4 sm:top-5 sm:right-5 w-11 h-11 sm:w-8 sm:h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold text-base sm:text-sm"
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Crear Nuevo Perfil de Cliente
            </h3>
            <form onSubmit={handleCreateProfile} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    RFC / Documento
                  </label>
                  <input
                    type="text"
                    value={newTaxId}
                    onChange={(e) => setNewTaxId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-600 dark:text-zinc-400 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-base sm:text-sm min-h-[44px] text-zinc-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold text-base sm:text-sm flex items-center justify-center text-zinc-700 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="cursor-pointer flex-1 min-h-[44px] h-11 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-base sm:text-sm flex items-center justify-center"
                >
                  {isSaving ? 'Guardando...' : 'Crear Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Navegación móvil fija */}
      <ClienteMobileNav />
    </div>
  );
}
