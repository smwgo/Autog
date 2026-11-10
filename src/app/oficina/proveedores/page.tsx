"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { OficinaMobileNav } from "@/components/OficinaMobileNav";
import { CollapsibleMetrics } from "@/components/CollapsibleMetrics";
import { useEffect, useState } from "react";

export default function ComprasProveedores() {
  const [tab, setTab] = useState<"proveedores" | "ordenes">("proveedores");
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    docType: "proveedor" | "orden";
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [payModal, setPayModal] = useState<{
    id: string;
    name: string;
    balance: number;
    amount: string;
  } | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const [receiveModal, setReceiveModal] = useState<{
    id: string;
    orderNumber: string;
  } | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);

  const [form, setForm] = useState({
    docType: "proveedor",
    name: "",
    ruc: "",
    contact: "",
    email: "",
    categories: "",
    balance: "",
    supplierName: "",
    expectedDate: "",
    total: "",
    status: "Solicitado",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/oficina/proveedores");
      if (res.ok) {
        const data = await res.json();
        setProveedores(data.proveedores || []);
        setOrdenes(data.ordenes || []);
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
      docType: tab === "proveedores" ? "proveedor" : "orden",
      name: "",
      ruc: "",
      contact: "",
      email: "",
      categories: "",
      balance: "",
      supplierName: "",
      expectedDate: "",
      total: "",
      status: "Solicitado",
    });
    setModalOpen(true);
  };

  const openEdit = (row: any, docType: "proveedor" | "orden") => {
    setEditingItem({ ...row, docType });
    let catsStr = "";
    try {
      const parsed = JSON.parse(row.categories || "[]");
      if (Array.isArray(parsed)) catsStr = parsed.join(", ");
      else catsStr = row.categories || "";
    } catch {
      catsStr = row.categories || "";
    }
    setForm({
      docType,
      name: row.name || "",
      ruc: row.ruc || "",
      contact: row.contact || "",
      email: row.email || "",
      categories: catsStr,
      balance: row.balance !== undefined && row.balance !== null ? String(row.balance) : "",
      supplierName: row.supplierName || "",
      expectedDate: row.expectedDate || "",
      total: row.total !== undefined && row.total !== null ? String(row.total) : "",
      status: row.status || "Solicitado",
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingItem ? "PUT" : "POST";
      const payload = editingItem ? { id: editingItem.id, ...form } : form;
      const res = await fetch("/api/oficina/proveedores", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Error al guardar en base de datos Neon.");
        return;
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error al conectar con la base de datos.");
    } finally {
      setSaving(false);
    }
  };

  const openPayModal = (sup: any) => {
    const bal = Number(sup.balance || 0);
    setPayModal({
      id: sup.id,
      name: sup.name,
      balance: bal,
      amount: bal > 0 ? bal.toFixed(2) : "0.00",
    });
  };

  const handleExecutePay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!payModal) return;
    const payAmount = Number(payModal.amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      alert("Ingresa un monto válido");
      return;
    }
    setIsPaying(true);
    try {
      const newBalance = Math.max(0, payModal.balance - payAmount);
      const res = await fetch("/api/oficina/proveedores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payModal.id, docType: "proveedor", balance: newBalance }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Error al liquidar saldo.");
        return;
      }
      setPayModal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error al liquidar saldo en Neon.");
    } finally {
      setIsPaying(false);
    }
  };

  const openReceiveModal = (po: any) => {
    setReceiveModal({ id: po.id, orderNumber: po.orderNumber });
  };

  const handleExecuteReceive = async () => {
    if (!receiveModal) return;
    setIsReceiving(true);
    try {
      const res = await fetch("/api/oficina/proveedores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: receiveModal.id, docType: "orden", status: "Recibido" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Error al actualizar estado.");
        return;
      }
      setReceiveModal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error al actualizar estado en Neon.");
    } finally {
      setIsReceiving(false);
    }
  };

  const confirmDelete = (id: string, docType: "proveedor" | "orden", name: string) => {
    setDeleteConfirm({ id, docType, name });
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/oficina/proveedores?id=${deleteConfirm.id}&docType=${deleteConfirm.docType}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Error al eliminar en Neon.");
        return;
      }
      setDeleteConfirm(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error al eliminar en Neon.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSuppliers = proveedores.filter((p) =>
    `${p.name} ${p.ruc} ${p.contact}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrders = ordenes.filter((o) =>
    `${o.orderNumber} ${o.supplierName} ${o.status}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalPayable = proveedores.reduce((acc, p) => acc + Number(p.balance || 0), 0);
  const transitOrders = ordenes.filter((o) => o.status === "En Tránsito" || o.status === "Solicitado").length;
  const totalPurchases = ordenes.reduce((acc, o) => acc + Number(o.total || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-24 md:pb-0">
      <Header />
      <main className="flex-grow p-4 sm:p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col">
        {/* Breadcrumb & Header */}
        <div className="order-1 mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/oficina"
              title="Volver a Oficina"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 transition-all shadow-sm active:scale-95 group shrink-0"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Proveedores
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {tab === 'proveedores' ? (
              <button
                onClick={openNew}
                className="w-full sm:w-auto h-11 px-4 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Nuevo Proveedor
              </button>
            ) : (
              <button
                onClick={openNew}
                className="w-full sm:w-auto h-11 px-4 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                Nueva Orden
              </button>
            )}
          </div>
        </div>

        {/* Resumen Cards */}
        <CollapsibleMetrics className="order-3 sm:order-2 mb-6 md:mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 text-lg sm:text-xl flex-shrink-0">
                🤝
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white">{proveedores.length}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Proveedores</h3>
              </div>
            </div>
            
            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-lg sm:text-xl flex-shrink-0">
                💵
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 truncate">${totalPayable.toFixed(2)}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Deuda</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 text-lg sm:text-xl flex-shrink-0">
                ⏳
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{transitOrders}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Tránsito</h3>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-lg sm:text-xl flex-shrink-0">
                📦
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white truncate">${totalPurchases.toFixed(2)}</p>
                <h3 className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm font-medium truncate">Compras</h3>
              </div>
            </div>
          </div>
        </CollapsibleMetrics>

        {/* Controles: Buscador a la izquierda expandido y Selector de Pestañas a la derecha */}
        <div className="order-2 sm:order-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-2.5 sm:p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4 shadow-sm">
          {/* Buscador a la izquierda más largo */}
          <div className="relative flex-1 min-w-[220px]">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'proveedores' ? "Buscar proveedor..." : "Buscar orden..."} 
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/70 focus:bg-white dark:focus:bg-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-xs"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 flex items-center justify-center text-zinc-500 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-zinc-100 text-[10px] font-bold absolute right-3 top-2.5 transition cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selector de Pestañas a la derecha */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl shrink-0 w-full md:w-auto">
            <button 
              onClick={() => setTab("proveedores")}
              className={`flex-1 md:flex-initial px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${tab === 'proveedores' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Proveedores ({proveedores.length})
            </button>
            <button 
              onClick={() => setTab("ordenes")}
              className={`flex-1 md:flex-initial px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${tab === 'ordenes' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Órdenes de Compra ({ordenes.length})
            </button>
          </div>
        </div>

        {/* Contenedor Principal */}
        <div className="order-4">
          {/* Vista Móvil (Tarjetas adaptadas a facturas) */}
          <div className="md:hidden space-y-3.5">
            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                Cargando...
              </div>
            ) : tab === "proveedores" ? (
              filteredSuppliers.map((row) => {
                let cats: string[] = [];
                try {
                  cats = JSON.parse(row.categories || "[]");
                } catch {
                  cats = [row.categories || "General"];
                }
                const bal = Number(row.balance || 0);
                return (
                  <div
                    key={row.id}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30">
                          🏢
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {row.name}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                            <span>RUC: {row.ruc}</span>
                          </p>
                        </div>
                      </div>

                      {/* Acciones Rápidas (Toque táctil >= 44px) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {bal > 0 && (
                          <button
                            type="button"
                            onClick={() => openPayModal(row)}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                            title="Pagar"
                            aria-label="Pagar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(row, "proveedor")}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-indigo-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 active:scale-95 transition-all cursor-pointer"
                          title="Editar Proveedor"
                          aria-label="Editar Proveedor"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(row.id, "proveedor", row.name)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                          title="Eliminar Proveedor"
                          aria-label="Eliminar Proveedor"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                      <span>👤 {row.contact}</span>
                      <span className="truncate max-w-[160px] text-zinc-400">{row.email}</span>
                    </div>

                    {/* Datos secundarios (Categorías y Saldo) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <div className="flex gap-1 flex-wrap">
                        {cats.slice(0, 2).map((c, idx) => (
                          <span key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-md text-[11px] font-medium border border-zinc-200 dark:border-zinc-700">
                            {c}
                          </span>
                        ))}
                      </div>

                      <span className={`ml-auto font-mono text-xs font-bold px-2.5 py-1 rounded-lg border ${
                        bal === 0
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700'
                          : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                      }`}>
                        Saldo: ${bal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              filteredOrders.map((row) => (
                <div
                  key={row.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30">
                        📦
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {row.supplierName}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                            row.status === 'Borrador' ? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20' :
                            row.status === 'Solicitado' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                            row.status === 'En Tránsito' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}>
                            {row.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">#{row.orderNumber}</span>
                          <span> • Entrega: {row.expectedDate}</span>
                        </p>
                      </div>
                    </div>

                    {/* Acciones Rápidas (Toque táctil >= 44px) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {row.status !== 'Recibido' && (
                        <button
                          type="button"
                          onClick={() => openReceiveModal(row)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer font-bold text-sm"
                          title="Recibir"
                          aria-label="Recibir"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(row, "orden")}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-indigo-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 active:scale-95 transition-all cursor-pointer"
                        title="Editar Orden"
                        aria-label="Editar Orden"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(row.id, "orden", `Orden #${row.orderNumber}`)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-600 bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                        title="Eliminar Orden"
                        aria-label="Eliminar Orden"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Datos secundarios (Total) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 font-bold font-mono text-xs">
                      💰 ${Number(row.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista Desktop (Tabla) */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider font-semibold">
                  {tab === 'proveedores' ? (
                    <tr>
                      <th className="py-3.5 px-4">Proveedor / RUC</th>
                      <th className="py-3.5 px-4">Contacto</th>
                      <th className="py-3.5 px-4">Categorías</th>
                      <th className="py-3.5 px-4 text-right">Saldo por Pagar</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-3.5 px-4"># Orden</th>
                      <th className="py-3.5 px-4">Proveedor</th>
                      <th className="py-3.5 px-4">Fecha Esperada</th>
                      <th className="py-3.5 px-4 text-right">Total</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      <th className="py-3.5 px-4 text-center">Acciones</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Cargando...</td>
                    </tr>
                  ) : tab === 'proveedores' ? (
                    filteredSuppliers.map((row) => {
                      let cats: string[] = [];
                      try {
                        cats = JSON.parse(row.categories || "[]");
                      } catch {
                        cats = [row.categories || "General"];
                      }
                      const bal = Number(row.balance || 0);
                      return (
                        <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.name}</p>
                            <p className="text-xs text-zinc-500 font-mono mt-0.5">{row.ruc}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="text-zinc-900 dark:text-zinc-300 font-medium">{row.contact}</p>
                            <p className="text-xs text-zinc-500">{row.email}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex gap-1 flex-wrap">
                              {cats.map((c, idx) => (
                                <span key={idx} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-0.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black">
                            <span className={bal === 0 ? 'text-zinc-400' : 'text-rose-600 dark:text-rose-400'}>
                              ${bal.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {bal > 0 && (
                                <button
                                  onClick={() => openPayModal(row)}
                                  className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all active:scale-95 flex items-center justify-center shadow-xs cursor-pointer"
                                  title="Pagar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </button>
                              )}
                              <button
                                onClick={() => openEdit(row, "proveedor")}
                                className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-all active:scale-95 flex items-center justify-center shadow-xs"
                                title="Editar Proveedor"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                              </button>
                              <button
                                onClick={() => confirmDelete(row.id, "proveedor", row.name)}
                                className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                                title="Eliminar Proveedor"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    filteredOrders.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono text-xs">#{row.orderNumber}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{row.supplierName}</p>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">{row.expectedDate}</td>
                        <td className="py-3.5 px-4 text-right font-black text-zinc-900 dark:text-zinc-100">
                          ${Number(row.total || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            row.status === 'Borrador' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800' :
                            row.status === 'Solicitado' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' :
                            row.status === 'En Tránsito' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' :
                            'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {row.status !== 'Recibido' && (
                              <button
                                onClick={() => openReceiveModal(row)}
                                className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all active:scale-95 flex items-center justify-center shadow-xs cursor-pointer"
                                title="Recibir"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                              </button>
                            )}
                            <button
                              onClick={() => openEdit(row, "orden")}
                              className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-all active:scale-95 flex items-center justify-center shadow-xs"
                              title="Editar Orden de Compra"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                            </button>
                            <button
                              onClick={() => confirmDelete(row.id, "orden", `Orden #${row.orderNumber}`)}
                              className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-xs"
                              title="Eliminar Orden"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs sm:text-sm text-zinc-500">
            <span>Mostrando {tab === 'proveedores' ? filteredSuppliers.length : filteredOrders.length} registros</span>
          </div>
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {editingItem ? "Editar" : form.docType === "proveedor" ? "Proveedor" : "Orden"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {form.docType === "proveedor" ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Proveedor</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Nombre o empresa"
                      className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">RUC</label>
                      <input
                        required
                        type="text"
                        value={form.ruc}
                        onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                        placeholder="1792345678001"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Saldo</label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.balance}
                        onChange={(e) => setForm({ ...form, balance: e.target.value })}
                        placeholder="0.00"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Contacto</label>
                      <input
                        required
                        type="text"
                        value={form.contact}
                        onChange={(e) => setForm({ ...form, contact: e.target.value })}
                        placeholder="Nombre contacto"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Correo</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="correo@ejemplo.com"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Categorías</label>
                    <input
                      type="text"
                      value={form.categories}
                      onChange={(e) => setForm({ ...form, categories: e.target.value })}
                      placeholder="Lubricantes, Filtros..."
                      className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Proveedor</label>
                    <input
                      required
                      type="text"
                      list="proveedores-datalist"
                      value={form.supplierName}
                      onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                      placeholder="Proveedor..."
                      className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                    />
                    <datalist id="proveedores-datalist">
                      {proveedores.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.ruc ? `RUC: ${p.ruc}` : ""}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Fecha</label>
                      <input
                        required
                        type="text"
                        value={form.expectedDate}
                        onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                        placeholder="DD/MM/AAAA"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Total</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={form.total}
                        onChange={(e) => setForm({ ...form, total: e.target.value })}
                        placeholder="0.00"
                        className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Estado</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-base sm:text-sm"
                    >
                      <option>Solicitado</option>
                      <option>En Tránsito</option>
                      <option>Recibido</option>
                      <option>Borrador</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Eliminar
              </h3>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {deleteConfirm.name}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-sm font-bold transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagar */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Pagar
              </h3>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-2">
                {payModal.name}
              </p>
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                ${payModal.balance.toFixed(2)}
              </span>
            </div>

            <form onSubmit={handleExecutePay} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Monto</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-400 font-mono text-sm font-semibold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={payModal.balance}
                    value={payModal.amount}
                    onChange={(e) => setPayModal({ ...payModal, amount: e.target.value })}
                    required
                    autoFocus
                    className="w-full h-11 pl-8 pr-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent text-base sm:text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPayModal(null)}
                  disabled={isPaying}
                  className="h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isPaying ? "Pagando..." : "Pagar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Recibir */}
      {receiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Recibir
              </h3>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                #{receiveModal.orderNumber}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReceiveModal(null)}
                disabled={isReceiving}
                className="h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300 disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteReceive}
                disabled={isReceiving}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isReceiving ? "Recibiendo..." : "Recibir"}
              </button>
            </div>
          </div>
        </div>
      )}

      <OficinaMobileNav />
    </div>
  );
}
