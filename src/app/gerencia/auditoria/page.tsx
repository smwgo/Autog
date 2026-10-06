import { prisma } from "@/lib/auth";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { sede?: string; action?: string; q?: string };
}) {
  const where: any = {};
  
  if (searchParams.sede) where.location = searchParams.sede;
  if (searchParams.action) where.action = searchParams.action;
  
  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { name: true, username: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Registro de Auditoría</h1>
          <p className="text-zinc-500 mt-1">Historial completo e inalterable de operaciones.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2">
            <span>📄</span> Exportar CSV
          </button>
          <button className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2">
            <span>📊</span> Exportar Excel
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input 
            type="text" 
            placeholder="Buscar usuario o ID..." 
            className="h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select className="h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Todas las Sedes</option>
            <option value="PRINCIPAL">PRINCIPAL</option>
            <option value="SUCURSAL">SUCURSAL</option>
          </select>
          <select className="h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Todos los Módulos</option>
            <option value="INVENTARIO">Inventario</option>
            <option value="POS">Ventas POS</option>
            <option value="TALLER">Taller</option>
            <option value="AUTH">Autenticación</option>
          </select>
          <input 
            type="date" 
            className="h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-zinc-500 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3">Fecha / Hora</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Sede</th>
                <th className="px-4 py-3">Módulo / Acción</th>
                <th className="px-4 py-3">Detalle (ID)</th>
                <th className="px-4 py-3">Estado / IP</th>
                <th className="px-4 py-3">Comparativa</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {format(log.createdAt, "dd MMM yyyy, HH:mm", { locale: es })}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {log.user.name || log.user.username}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700">
                      {log.location}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">{log.action}</span>
                    <p className="text-xs text-zinc-500">{log.entityName}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-500">
                    {log.entityId}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className={log.syncStatus === "ONLINE" ? "text-green-600" : "text-amber-500"}>
                      {log.syncStatus}
                    </p>
                    <p className="text-zinc-400 mt-1">{log.ipAddress || "Local/Offline"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <button className="text-blue-600 hover:underline">Ver cambios JSON</button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No hay registros de auditoría que mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
