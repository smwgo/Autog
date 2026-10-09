"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para el catálogo del POS
const INVENTORY = [
  { id: 'PROD-001', name: 'Aceite Sintético 5W-30', brand: 'Mobil 1', price: 15.50, stock: 24, image: '🛢️' },
  { id: 'PROD-002', name: 'Filtro de Aceite', brand: 'Bosch', price: 8.00, stock: 45, image: '⚙️' },
  { id: 'PROD-003', name: 'Pastillas de Freno (Delanteras)', brand: 'Brembo', price: 45.00, stock: 12, image: '🛑' },
  { id: 'PROD-004', name: 'Batería 12V 65Ah', brand: 'LTH', price: 110.00, stock: 5, image: '🔋' },
  { id: 'PROD-005', name: 'Líquido de Frenos DOT 4', brand: 'Motul', price: 12.00, stock: 18, image: '🧪' },
  { id: 'PROD-006', name: 'Bujía Iridium', brand: 'NGK', price: 14.50, stock: 60, image: '⚡' },
  { id: 'PROD-007', name: 'Filtro de Aire', brand: 'K&N', price: 25.00, stock: 10, image: '💨' },
  { id: 'PROD-008', name: 'Líquido Limpiaparabrisas', brand: 'Prestone', price: 4.50, stock: 30, image: '💧' },
];

export default function NuevaVentaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<{product: any, qty: number}[]>([]);

  const filteredInventory = INVENTORY.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }).filter(item => item.qty > 0)); // Aunque la condición newQty > 0 evita que baje de 1
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
  const tax = subtotal * 0.16; // Asumiendo 16% IVA
  const total = subtotal + tax;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow flex flex-col md:flex-row p-4 md:p-6 gap-6 w-full max-w-[1600px] mx-auto h-[calc(100vh-80px)]">
        
        {/* Left Side: Product Catalog & Search */}
        <div className="flex-grow flex flex-col h-full bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Link href="/pos" className="text-emerald-600 hover:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl">
                &larr;
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛒</span>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Nueva Venta</h1>
              </div>
            </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder="Escanear código de barras o buscar producto..." 
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all dark:text-white text-lg font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <span className="absolute left-4 top-4 text-zinc-400 text-2xl">🔍</span>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-grow p-6 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredInventory.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 hover:shadow-lg transition-all text-left flex flex-col h-full group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-3xl bg-zinc-50 dark:bg-zinc-700 p-2 rounded-xl group-hover:scale-110 transition-transform">
                      {item.image}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">
                      {item.stock} en stock
                    </span>
                  </div>
                  <h3 className="font-bold text-zinc-900 dark:text-white leading-tight mb-1 flex-grow">
                    {item.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{item.brand} • {item.id}</p>
                  <div className="flex justify-between items-end w-full">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ${item.price.toFixed(2)}
                    </span>
                    <span className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      +
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Cart / Receipt */}
        <div className="w-full md:w-[400px] lg:w-[450px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden h-full">
          
          <div className="p-5 bg-zinc-900 dark:bg-zinc-950 text-white flex justify-between items-center">
            <div>
              <p className="text-xs text-zinc-400">Cliente (Opcional)</p>
              <p className="font-medium text-emerald-400 cursor-pointer hover:underline flex items-center gap-1">
                <span>👤</span> Consumidor Final
              </p>
            </div>
            <button className="text-zinc-400 hover:text-white">⋯</button>
          </div>

          <div className="flex-grow overflow-y-auto p-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 p-8 text-center space-y-4">
                <span className="text-6xl opacity-50">🛒</span>
                <p>El carrito está vacío. Busca o escanea productos para agregarlos a la orden.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {cart.map((item) => (
                  <li key={item.product.id} className="flex gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 group">
                    <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border border-zinc-100 dark:border-zinc-700">
                      {item.product.image}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight pr-2">
                          {item.product.name}
                        </h4>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          ✕
                        </button>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5">
                          <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-emerald-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">-</button>
                          <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                          <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-emerald-600 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">+</button>
                        </div>
                        <p className="font-bold text-zinc-900 dark:text-white">
                          ${(item.product.price * item.qty).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-6 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>IVA (16%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>Descuento</span>
                <span>$0.00</span>
              </div>
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex justify-between items-center mt-2">
                <span className="text-lg font-bold text-zinc-900 dark:text-white">Total a Pagar</span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">${total.toFixed(2)}</span>
              </div>
            </div>

            <button 
              disabled={cart.length === 0}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed text-white text-xl font-bold py-4 rounded-2xl transition-transform active:scale-95 shadow-lg shadow-emerald-500/20 disabled:shadow-none flex items-center justify-center gap-2"
            >
              <span>💳</span> Cobrar Ahora
            </button>
          </div>

        </div>

      </main>
    </div>
  );
}
