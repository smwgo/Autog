import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnlineStatus } from "@/components/OnlineStatus";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const role = session.user.role;
  const location = session.user.location;

  // Let's create a generic dashboard that shows the layout
  // In a real app we could redirect to specific folders like /gerencia, /pos, etc.
  
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <OnlineStatus />
      
      <header className="flex justify-between items-center mb-8 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Panel Principal</h1>
          <p className="text-sm text-zinc-500">
            {session.user.name} | Sede: <span className="font-semibold text-blue-600 dark:text-blue-400">{location}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold tracking-wide">
            ROL: {role}
          </span>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="text-sm text-zinc-600 hover:text-red-600 transition-colors">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Render widgets based on permissions / role */}
        {(role === "GERENCIA" || role === "OFICINA") && (
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold text-lg mb-4">Administración General</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Visualiza ambas sedes y reportes consolidados.</p>
            <button className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors">
              Ir a Gerencia
            </button>
          </div>
        )}

        {(role === "GERENCIA" || role === "POS" || role === "CAJA") && (
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold text-lg mb-4">Punto de Venta (POS)</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Realiza ventas y cotizaciones en {location}.</p>
            <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
              Abrir POS
            </button>
          </div>
        )}

        {(role === "GERENCIA" || role === "TALLER") && (
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold text-lg mb-4">Garaje / Taller</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Gestiona órdenes de servicio e inspecciones.</p>
            <button className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors">
              Ir a Taller
            </button>
          </div>
        )}

        {(role === "GERENCIA" || session.user.permissions?.canManageInventory) && (
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold text-lg mb-4">Inventario</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Gestiona repuestos en {location}.</p>
            <button className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors">
              Ver Inventario
            </button>
          </div>
        )}

      </main>

      {role === "GERENCIA" && (
        <section className="mt-8 p-6 bg-zinc-900 text-white rounded-3xl shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Panel de Auditoría Reciente</h3>
          <p className="text-sm text-zinc-400 mb-4">Últimas acciones registradas en todas las sedes.</p>
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="text-xs uppercase text-zinc-500 border-b border-zinc-800">
                 <tr>
                   <th className="px-4 py-3">Usuario</th>
                   <th className="px-4 py-3">Acción</th>
                   <th className="px-4 py-3">Sede</th>
                   <th className="px-4 py-3">Fecha</th>
                 </tr>
               </thead>
               <tbody>
                 {/* Mocks for now, this would fetch from prisma.auditLog */}
                 <tr className="border-b border-zinc-800">
                   <td className="px-4 py-3">admin</td>
                   <td className="px-4 py-3 text-amber-400">Modificó precio de aceite</td>
                   <td className="px-4 py-3">PRINCIPAL</td>
                   <td className="px-4 py-3">Hace 2 min</td>
                 </tr>
                 <tr>
                   <td className="px-4 py-3">caja_norte</td>
                   <td className="px-4 py-3 text-green-400">Cierre de caja completado</td>
                   <td className="px-4 py-3">SUCURSAL</td>
                   <td className="px-4 py-3">Hace 15 min</td>
                 </tr>
               </tbody>
             </table>
          </div>
        </section>
      )}
    </div>
  );
}
