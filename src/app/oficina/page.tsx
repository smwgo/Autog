import { prisma } from "@/lib/auth";

export default async function OficinaDashboard() {
  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Panel de Oficina</h1>
          <p className="text-zinc-500 mt-1">Gestión administrativa, contable y operativa.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
            <span>📥</span> Exportar Contabilidad (ZIP)
          </button>
        </div>
      </div>

      {/* SRI Status */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span>🇪🇨</span> Estado SRI (Facturación Electrónica)
          </h3>
          <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-full">
            Conectado (Producción)
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 text-center">
            <p className="text-sm font-medium text-zinc-500">Pendientes</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">12</p>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 text-center">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Procesando</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">4</p>
          </div>
          <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 text-center">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">Autorizadas</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">842</p>
          </div>
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-center">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Rechazadas</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">2</p>
          </div>
          <div className="p-4 flex flex-col justify-center">
            <button className="w-full text-xs font-medium py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-lg transition-colors mb-2">
              Procesar Lote
            </button>
            <button className="w-full text-xs font-medium py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-lg transition-colors">
              Reintentar Errores
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Inventario Transfers */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><span>📦</span> Transferencias</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div>
                <p className="font-medium">PRINCIPAL → SUCURSAL</p>
                <p className="text-xs text-zinc-500">Solicitud #TR-042</p>
              </div>
              <span className="px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">PENDIENTE</span>
            </div>
            <div className="flex justify-between items-center text-sm p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <div>
                <p className="font-medium">SUCURSAL → PRINCIPAL</p>
                <p className="text-xs text-zinc-500">Solicitud #TR-041</p>
              </div>
              <span className="px-2 py-1 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">EN TRÁNSITO</span>
            </div>
            <button className="w-full mt-2 text-sm text-blue-600 font-medium hover:underline">Ver todas las transferencias</button>
          </div>
        </div>

        {/* Cuentas por Pagar (CxP) */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><span>🏢</span> Compras y CxP</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Órdenes Abiertas:</span>
              <span className="font-semibold text-zinc-900 dark:text-white">4</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Saldo por Pagar:</span>
              <span className="font-semibold text-red-600">$12,450.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Vencimiento Próx. 7 días:</span>
              <span className="font-semibold text-amber-600">$3,200.00</span>
            </div>
            <button className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
              Pagar Proveedores
            </button>
          </div>
        </div>

        {/* Caja y Bancos */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><span>💵</span> Cajas Activas</h3>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm text-green-800 dark:text-green-400">Caja PRINCIPAL</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs text-green-600 dark:text-green-500">Apertura: 08:00 AM</span>
                <span className="font-bold text-green-700 dark:text-green-300">$1,450.00</span>
              </div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/50 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-sm text-green-800 dark:text-green-400">Caja SUCURSAL</span>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs text-green-600 dark:text-green-500">Apertura: 08:30 AM</span>
                <span className="font-bold text-green-700 dark:text-green-300">$890.00</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
