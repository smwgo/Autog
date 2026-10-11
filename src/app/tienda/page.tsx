"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface Product {
  id: string;
  name: string;
  code?: string;
  sku?: string;
  brand?: string | null;
  category: string;
  description?: string | null;
  price: number | string;
  stock?: number;
  photoUrl?: string | null;
}

export default function TiendaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal de Solicitud Web hacia POS
  const [productoSeleccionado, setProductoSeleccionado] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [solicitudExitosa, setSolicitudExitosa] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/productos");
        const data = await res.json();
        if (res.ok && data.success && data.productos?.length > 0) {
          setProducts(data.productos);
        } else {
          // Si no hay productos en inventario aún, mostrar catálogo referencial
          setProducts([
            {
              id: "1",
              name: "Filtro de Aceite Sintético Premium",
              code: "FLT-AC-001",
              brand: "Bosch",
              category: "Filtros",
              description: "Filtro de aceite de alto rendimiento para motores a gasolina y diésel.",
              price: 15.99,
              stock: 10,
            },
            {
              id: "2",
              name: "Pastillas de Freno Delanteras (Set de 4)",
              code: "FRN-PAS-022",
              brand: "Brembo",
              category: "Frenos",
              description: "Pastillas de freno cerámicas para una frenada silenciosa y eficiente.",
              price: 45.5,
              stock: 8,
            },
            {
              id: "3",
              name: "Batería 12V 75Ah Libre de Mantenimiento",
              code: "BAT-12V-75",
              brand: "Moura",
              category: "Eléctrico",
              description: "Batería de larga duración con excelente capacidad de arranque en frío.",
              price: 120.0,
              stock: 5,
            },
            {
              id: "4",
              name: "Aceite 5W-30 Sintético Full 4L",
              code: "LUB-5W30-4L",
              brand: "Mobil 1",
              category: "Lubricantes",
              description: "Protección avanzada para motores de última generación.",
              price: 38.0,
              stock: 14,
            },
          ]);
        }
      } catch (e) {
        console.error("Error al cargar productos de tienda:", e);
      } finally {
        setCargando(false);
      }
    }
    load();
  }, []);

  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoSeleccionado) return;
    setEnviando(true);

    try {
      const priceNum =
        typeof productoSeleccionado.price === "number"
          ? productoSeleccionado.price
          : parseFloat(productoSeleccionado.price) || 0;

      const payload = {
        type: "TIENDA",
        customerName: customerName.trim() || "Cliente Tienda Web",
        customerPhone: customerPhone.trim() || "",
        customerEmail: customerEmail.trim() || "",
        vehicleInfo: vehicleInfo.trim() || "",
        itemsSummary: `${productoSeleccionado.name} (Cant: 1)`,
        itemsJson: [
          {
            id: productoSeleccionado.id,
            code: productoSeleccionado.code || productoSeleccionado.sku || "PROD",
            name: productoSeleccionado.name,
            brand: productoSeleccionado.brand || "",
            price: priceNum,
            quantity: 1,
            category: productoSeleccionado.category,
          },
        ],
        totalEstimated: priceNum,
        notes: notes.trim(),
      };

      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al enviar solicitud a Neon");
      }

      setSolicitudExitosa(data.solicitud);
    } catch (err: any) {
      alert("Error al procesar la solicitud: " + err.message);
    } finally {
      setEnviando(false);
    }
  };

  const cerrarModal = () => {
    setProductoSeleccionado(null);
    setSolicitudExitosa(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setVehicleInfo("");
    setNotes("");
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
              Tienda de Repuestos y Accesorios
            </h1>
            <p className="text-base text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Solicita tus productos online y recíbelos despachados en tienda o a domicilio.
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="py-20 text-center text-zinc-400">
            <div className="inline-block animate-spin text-3xl mb-3">⚙️</div>
            <p>Cargando catálogo...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              No hay productos disponibles
            </h2>
            <p className="text-zinc-500">Estamos actualizando nuestro inventario. Vuelve pronto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const priceNum =
                typeof product.price === "number" ? product.price : parseFloat(product.price) || 0;

              return (
                <div
                  key={product.id}
                  className="group flex flex-col bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="relative h-44 w-full bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center p-4">
                    <span className="text-5xl">📦</span>
                    {product.brand && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                        {product.brand}
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        {product.category}
                      </span>
                      {product.code && (
                        <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                          {product.code}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-500">
                        ${priceNum.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setProductoSeleccionado(product)}
                        className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                      >
                        Comprar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Solicitud Web */}
      {productoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800">
            {solicitudExitosa ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 text-3xl flex items-center justify-center mx-auto">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                  ¡Pedido Enviado a Tienda!
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Tu orden ya se encuentra en nuestro sistema de punto de venta (POS) para ser despachada inmediatamente.
                </p>
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-left text-xs font-mono space-y-1">
                  <div><strong>Nº Orden:</strong> {solicitudExitosa.requestNumber}</div>
                  <div><strong>Producto:</strong> {solicitudExitosa.itemsSummary}</div>
                  <div><strong>Total Estimado:</strong> ${Number(solicitudExitosa.totalEstimated).toFixed(2)}</div>
                  <div><strong>Estado:</strong> {solicitudExitosa.status}</div>
                </div>
                <button
                  onClick={cerrarModal}
                  className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 rounded-lg font-bold text-sm transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnviarSolicitud} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛒</span>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                      Solicitud de Compra
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="text-zinc-400 hover:text-zinc-600 text-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg text-xs space-y-1">
                  <div className="font-bold text-zinc-900 dark:text-white text-sm">
                    {productoSeleccionado.name}
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Precio: ${typeof productoSeleccionado.price === "number" ? productoSeleccionado.price.toFixed(2) : parseFloat(productoSeleccionado.price).toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Tu Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Mendoza"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. +58 412 9876543"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Vehículo / Modelo (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Toyota Corolla 2020"
                    value={vehicleInfo}
                    onChange={(e) => setVehicleInfo(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Dirección o Notas de Entrega (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Retiro en tienda o entrega en..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="flex-1 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={enviando}
                    className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold transition-all shadow-md shadow-blue-500/20"
                  >
                    {enviando ? "Enviando..." : "Confirmar Pedido"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
