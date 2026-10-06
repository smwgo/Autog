import { prisma } from "@/lib/auth";

export default async function UsuariosPage() {
  const users = await prisma.user.findMany({
    include: {
      permissions: true
    },
    orderBy: { location: 'asc' }
  });

  const countPrincipal = users.filter(u => u.location === "PRINCIPAL").length;
  const countSucursal = users.filter(u => u.location === "SUCURSAL").length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Gestión de Usuarios</h1>
          <p className="text-zinc-500 mt-1">Control de accesos operativos de PRINCIPAL y SUCURSAL.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          + Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-medium text-zinc-500">Cupos PRINCIPAL</h3>
            <p className="text-2xl font-bold mt-1"><span className="text-blue-600">{countPrincipal}</span> / 7</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl">
            📍
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-medium text-zinc-500">Cupos SUCURSAL</h3>
            <p className="text-2xl font-bold mt-1"><span className="text-green-600">{countSucursal}</span> / 7</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-xl">
            🏪
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex gap-4">
          <input 
            type="text" 
            placeholder="Buscar por nombre, email o rol..." 
            className="flex-1 h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select className="h-10 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Todas las sedes</option>
            <option value="PRINCIPAL">PRINCIPAL</option>
            <option value="SUCURSAL">SUCURSAL</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-zinc-500 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Sede</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Permisos Clave</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.location === "PRINCIPAL" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" : 
                      user.location === "SUCURSAL" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : 
                      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                    }`}>
                      {user.location}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{user.role}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 text-xs">
                      {user.permissions?.canEdit && <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded" title="Puede Editar">✏️</span>}
                      {user.permissions?.canManageInventory && <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded" title="Gestiona Inventario">📦</span>}
                      {user.permissions?.canManageCrossLocation && <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800" title="Acceso a otra sede">⚠️ Multi-Sede</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Bloqueado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:underline mr-3">Editar</button>
                    <button className="text-red-600 hover:underline">
                      {user.isActive ? "Bloquear" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    No se encontraron usuarios. Agrega el administrador base desde la base de datos o consola.
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
