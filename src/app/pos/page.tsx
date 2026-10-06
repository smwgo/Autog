"use client";

import { useState } from "react";

export default function PosPage() {
  const [cart, setCart] = useState([
    { id: 1, type: "PRODUCT", desc: "Aceite Sintético 5W-30", qty: 1, price: 45.00 },
    { id: 2, type: "SERVICE", desc: "Mano de Obra - Cambio Aceite", qty: 1, price: 15.00 },
  ]);

  const [client, setClient] = useState<{name: string, vehicle: string} | null>(null);

  const subtotal = cart.reduce((acc, item) => acc + (item.qty * item.price), 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  return (
    <div className="h-full flex flex-col md:flex-row">
      
      {/* Left Column: Search & Catalog */}
      <div className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="🔍 Buscar Cliente (CI/Nombre) o Vehículo (Placa)..." 
              className="flex-1 h-12 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button className="h-12 px-4 bg-zinc-200 dark:bg-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors">
              + Nuevo
            </button>
          </div>

          {/* Client Selected State */}
          {client ? (
             <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl flex justify-between items-center">
               <div>
                 <p className="font-bold text-sm text-blue-900 dark:text-blue-100">{client.name}</p>
                 <p className="text-xs text-blue-700 dark:text-blue-300">Vehículo: {client.vehicle}</p>
               </div>
               <div className="flex gap-2">
                 <button className="text-xs font-bold text-blue-600 bg-white dark:bg-zinc-800 px-2 py-1 rounded">Historial</button>
                 <button onClick={() => setClient(null)} className="text-xs text-red-500 hover:underline">Cambiar</button>
               </div>
             </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <button onClick={() => setClient({name: "Juan Pérez", vehicle: "Toyota Corolla (ABC-123)"})} className="px-3 py-1.5 text-xs font-medium bg-zinc-200 dark:bg-zinc-800 rounded-full hover:bg-zinc-300 transition-colors">
                Ej: Juan Pérez (ABC-123)
              </button>
            </div>
          )}
        </div>

        {/* Catalog / Categories */}
        <div className="p-4 flex gap-2 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full shrink-0">Todos</button>
          <button className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-sm font-medium rounded-full shrink-0 hover:bg-zinc-200">Lubricantes</button>
          <button className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-sm font-medium rounded-full shrink-0 hover:bg-zinc-200">Filtros</button>
          <button className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-sm font-medium rounded-full shrink-0 hover:bg-zinc-200">Servicios</button>
          <button className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-sm font-medium rounded-full shrink-0 hover:bg-zinc-200">Mano de Obra</button>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 gap-4 content-start">
          {[
            { id: 1, name: "Aceite 5W-30", price: 45, stock: 12 },
            { id: 2, name: "Filtro de Aceite TY", price: 12.5, stock: 8 },
            { id: 3, name: "Pastillas de Freno", price: 65, stock: 4 },
            { id: 4, name: "Alineación 3D", price: 25, stock: null },
            { id: 5, name: "Balanceo x4", price: 20, stock: null },
            { id: 6, name: "Diagnóstico Computarizado", price: 35, stock: null },
          ].map((item) => (
            <button key={item.id} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-blue-500 text-left transition-colors flex flex-col justify-between h-32 bg-white dark:bg-zinc-950">
              <span className="font-medium text-sm leading-tight">{item.name}</span>
              <div className="flex justify-between items-end mt-2">
                <span className="font-bold text-lg">${item.price.toFixed(2)}</span>
                {item.stock !== null && <span className="text-xs text-zinc-500">Stock: {item.stock}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Column: Cart & Checkout */}
      <div className="w-full md:w-96 flex flex-col bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shrink-0">
        
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex justify-between items-center">
          <h2 className="font-bold text-lg">Resumen de Venta</h2>
          <button className="text-xs font-bold text-red-500 hover:underline">Vaciar</button>
        </div>

        {/* Cart Items (Editable before invoice) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map((item) => (
            <div key={item.id} className="p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl relative group">
              <button className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold">×</button>
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium leading-tight pr-4">{item.desc}</span>
                <span className="font-bold text-sm">${(item.price * item.qty).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                  <button className="w-8 h-7 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm hover:bg-zinc-200">-</button>
                  <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                  <button className="w-8 h-7 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm hover:bg-zinc-200">+</button>
                </div>
                <button className="text-xs text-blue-600 hover:underline">Editar Precio</button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="text-center py-10 text-zinc-500 text-sm">
              Selecciona productos o servicios para comenzar
            </div>
          )}
        </div>

        {/* Totals & Actions */}
        <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Descuento</span>
              <span className="font-medium text-green-600">-$0.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">IVA (15%)</span>
              <span className="font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-500">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button className="py-2 border border-blue-600 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">
              Guardar Cotización
            </button>
            <button className="py-2 border border-amber-500 text-amber-600 rounded-xl text-sm font-bold hover:bg-amber-50 transition-colors">
              Orden Trabajo
            </button>
          </div>
          <button className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 shadow-md transition-all flex justify-between items-center px-6">
            <span>Cobrar y Facturar</span>
            <span>→</span>
          </button>
          <p className="text-[10px] text-center text-zinc-500 mt-2">
            Verifica que la venta sea correcta. Una vez facturado, se debe anular vía SRI.
          </p>
        </div>

      </div>
    </div>
  );
}
