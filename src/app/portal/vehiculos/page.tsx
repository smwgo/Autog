import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";

export default async function VehiculosPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  // Fetch vehicles associated with this user
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  const vehicles = await prisma.vehicle.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { client: { email: user?.email || undefined } }
      ]
    },
    include: {
      services: {
        orderBy: { date: 'desc' },
        take: 1
      }
    }
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-6 py-12 md:py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">Mi Vehículo</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Gestiona tus vehículos, historiales de servicio y próximas citas.</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Registrar Vehículo
          </button>
        </div>

        {vehicles.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">No tienes vehículos registrados</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
              Agrega tu vehículo para llevar un control detallado de los mantenimientos, descargar tus comprobantes y agendar citas fácilmente.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-all shadow-sm">
              Agregar mi primer vehículo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                  <div className="absolute inset-0 bg-black/10 mix-blend-multiply"></div>
                  {vehicle.photoUrl ? (
                    <img src={vehicle.photoUrl} alt={vehicle.model} className="w-full h-full object-cover opacity-80 mix-blend-overlay" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-16 h-16 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                    </div>
                  )}
                  <div className="absolute -bottom-6 left-6 w-16 h-16 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border-2 border-white dark:border-zinc-800 flex items-center justify-center p-2">
                    {/* Car icon placeholder */}
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l4.01 4.01a6.002 6.002 0 008.485 0L19.5 8m0 0L21 9.5M19.5 8L18 9.5M3 8L1.5 9.5M3 8l1.5 1.5"></path></svg>
                  </div>
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold uppercase tracking-wider">
                    {vehicle.plate}
                  </div>
                </div>
                
                <div className="pt-10 p-6">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{vehicle.brand} {vehicle.model}</h3>
                  <p className="text-zinc-500 text-sm font-medium mt-1">{vehicle.year} • {vehicle.color || 'Sin color definido'} {vehicle.mileage ? `• ${vehicle.mileage} km` : ''}</p>
                  
                  <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Último Servicio</span>
                      <Link href={`/portal/vehiculos/${vehicle.id}/historial`} className="text-xs text-blue-600 hover:underline">Ver Historial Completo</Link>
                    </div>
                    
                    {vehicle.services && vehicle.services.length > 0 ? (
                      <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-white line-clamp-1">{vehicle.services[0].type || "Mantenimiento General"}</p>
                          <p className="text-xs text-zinc-500 mt-1">{new Date(vehicle.services[0].date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">Aún no hay servicios registrados para este vehículo.</p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <button className="py-2.5 px-4 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 transition-colors text-center">
                      Agendar Cita
                    </button>
                    <button className="py-2.5 px-4 rounded-xl text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:text-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors text-center">
                      Cotizar Repuestos
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
