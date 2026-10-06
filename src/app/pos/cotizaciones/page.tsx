import { prisma } from "@/lib/auth";

export default async function PosQuotesPage() {
  return (
    <div className="p-6 h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Cotizaciones</h1>
          <p className="text-zinc-500 text-sm mt-1">Gestión de presupuestos y conversión a Órdenes de Trabajo.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + Nueva Cotización
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex gap-4">
          <input 
            type="text" 
            placeholder="Buscar cotización por cliente o placa..." 
            className="flex-1 h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select className="h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Todos los Estados</option>
            <option value="DRAFT">Borrador</option>
            <option value="SENT">Enviada</option>
            <option value="APPROVED">Aprobada</option>
            <option value="CONVERTED">En Taller (Orden Trabajo)</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-zinc-500 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Cliente / Vehículo</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Vigencia</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Mock row */}
              <tr className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-6 py-4 font-mono text-zinc-500">COT-0892</td>
                <td className="px-6 py-4">
                  <p className="font-semibold">Luis Alvarez</p>
                  <p className="text-xs text-zinc-500">Honda Civic (XYZ-789)</p>
                </td>
                <td className="px-6 py-4 font-bold text-blue-600">$450.00</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    APROBADA
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500">12 Oct 2026</td>
                <td className="px-6 py-4 text-right flex justify-end gap-3">
                  <button className="text-blue-600 hover:underline font-medium">Imprimir PDF</button>
                  <button className="text-amber-600 hover:underline font-medium">Crear Orden Trabajo</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
