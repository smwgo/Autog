"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from "@/components/Header";

// Datos de prueba para el catálogo de productos
const CATALOG = [
  { id: 'PROD-001', name: 'Aceite Sintético 5W-30', brand: 'Mobil 1', category: 'Lubricantes', price: 15.50, stock: 24, location: 'Pasillo 2, Estante A', status: 'En Stock' },
  { id: 'PROD-002', name: 'Filtro de Aceite', brand: 'Bosch', category: 'Filtros', price: 8.00, stock: 45, location: 'Pasillo 3, Estante B', status: 'En Stock' },
  { id: 'PROD-003', name: 'Pastillas de Freno (Delanteras)', brand: 'Brembo', category: 'Frenos', price: 45.00, stock: 4, location: 'Pasillo 1, Estante C', status: 'Bajo Stock' },
  { id: 'PROD-004', name: 'Batería 12V 65Ah', brand: 'LTH', category: 'Eléctrico', price: 110.00, stock: 0, location: 'Bodega Principal', status: 'Agotado' },
  { id: 'PROD-005', name: 'Líquido de Frenos DOT 4', brand: 'Motul', category: 'Fluidos', price: 12.00, stock: 18, location: 'Pasillo 2, Estante B', status: 'En Stock' },
  { id: 'PROD-006', name: 'Bujía Iridium', brand: 'NGK', category: 'Ignición', price: 14.50, stock: 60, location: 'Caja Registradora', status: 'En Stock' },
  { id: 'PROD-007', name: 'Amortiguador Trasero', brand: 'Monroe', category: 'Suspensión', price: 65.00, stock: 2, location: 'Bodega Principal', status: 'Bajo Stock' },
  { id: 'PROD-008', name: 'Kit de Embrague', brand: 'Luk', category: 'Transmisión', price: 180.00, stock: 5, location: 'Pasillo 4, Estante A', status: 'En Stock' },
];

export default function CatalogoPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const filteredCatalog = CATALOG.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(CATALOG.map(item => item.category)));

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'En Stock': return 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30';
      case 'Bajo Stock': return 'text-amber-700 bg-amber-100 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30';
      case 'Agotado': return 'text-rose-700 bg-rose-100 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30';
      default: return 'text-zinc-700 bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      
      <main className="flex-grow p-6 md:p-12 max-w-7xl mx-auto w-full">
        {/* Navigation / Breadcrumb */}
        <div className="mb-6">
          <Link href="/pos" className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center gap-1 w-fit">
            &larr; Volver a Punto de Venta
          </Link>
        </div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-blue-500 bg-opacity-10 flex items-center justify-center text-2xl">
                📦
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Catálogo de Productos
              </h1>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Búsqueda de inventario, precios y existencias en tiempo real.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500 text-zinc-700 dark:text-zinc-300 px-5 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
              <span>⬇️</span> Exportar
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2">
              <span>+</span> Nuevo Producto
            </button>
          </div>
        </div>

        {/* Filters / Search */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <input 
              type="text" 
              placeholder="Buscar por código, nombre o marca..." 
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 top-4 text-zinc-400 text-xl">🔍</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <button 
              onClick={() => setSelectedCategory('')}
              className={`px-5 py-3.5 rounded-2xl font-bold whitespace-nowrap transition-colors ${selectedCategory === '' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-3.5 rounded-2xl font-bold whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Ubicación</th>
                  <th className="px-6 py-5 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredCatalog.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="font-bold text-zinc-900 dark:text-white mb-1">{item.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          {item.id}
                        </span>
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {item.brand}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-zinc-900 dark:text-white">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {item.stock} <span className="text-sm font-normal text-zinc-500">uds.</span>
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                      <span className="text-zinc-400">📍</span> {item.location}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 px-4 py-2 rounded-xl transition-colors">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                
                {filteredCatalog.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <span className="text-4xl mb-4 block">📦</span>
                      <p className="text-zinc-900 dark:text-white font-bold text-lg mb-1">No se encontraron productos</p>
                      <p className="text-zinc-500 dark:text-zinc-400">Verifica tu búsqueda o selecciona otra categoría.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
