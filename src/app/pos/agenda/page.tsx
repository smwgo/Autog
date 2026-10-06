import { prisma } from "@/lib/auth";

export default async function PosAgendaPage() {
  const appointments = await prisma.appointment.findMany({
    include: {
      client: true,
      vehicle: true,
    },
    orderBy: { date: 'asc' },
    take: 20
  });

  return (
    <div className="p-6 h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
      <div className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Agenda Diaria y Recepción</h1>
          <p className="text-zinc-500 text-sm mt-1">Control de citas, llegadas y órdenes de trabajo del día.</p>
        </div>
        <div className="flex gap-2">
          <select className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none">
            <option>Hoy</option>
            <option>Mañana</option>
            <option>Esta semana</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + Nueva Cita
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 shrink-0 overflow-x-auto pb-2">
        {/* Status Filters */}
        <button className="px-4 py-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full text-xs font-bold hover:bg-zinc-300 transition-colors shrink-0">Todas</button>
        <button className="px-4 py-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-bold shrink-0">Confirmadas (3)</button>
        <button className="px-4 py-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-bold shrink-0 animate-pulse">En Camino (1)</button>
        <button className="px-4 py-1.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-xs font-bold shrink-0">Recibidos (2)</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Mocking the cards since the DB might be empty */}
        
        {/* Card: Cliente en Camino */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border-2 border-amber-400 dark:border-amber-500 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-amber-400 text-amber-950 text-[10px] font-black rounded-bl-lg uppercase tracking-wider">
            En Camino
          </div>
          <p className="text-xs text-zinc-500 font-bold mb-2">09:30 AM</p>
          <h3 className="font-bold text-lg leading-tight">María Gonzalez</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">Toyota RAV4 (XYZ-789)</p>
          <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-xs mb-4">
            <span className="font-semibold block mb-1">Servicio:</span>
            Mantenimiento 40,000km + Cambio pastillas
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors">
              Marcar Recibido
            </button>
          </div>
        </div>

        {/* Card: Confirmado */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden hover:border-blue-400 transition-colors">
          <div className="absolute top-0 right-0 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[10px] font-black rounded-bl-lg uppercase tracking-wider">
            Confirmado
          </div>
          <p className="text-xs text-zinc-500 font-bold mb-2">10:00 AM</p>
          <h3 className="font-bold text-lg leading-tight">Carlos Ruiz</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">Nissan Sentra (DEF-456)</p>
          <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-xs mb-4">
            <span className="font-semibold block mb-1">Servicio:</span>
            Revisión de suspensión (Ruido al frenar)
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold uppercase transition-colors">
              Avisar en camino
            </button>
            <button className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl text-xs font-bold transition-colors">
              Editar
            </button>
          </div>
        </div>

        {/* Card: En Taller */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-[10px] font-black rounded-bl-lg uppercase tracking-wider">
            En Taller
          </div>
          <p className="text-xs text-zinc-500 font-bold mb-2">08:00 AM (Ingreso)</p>
          <h3 className="font-bold text-lg leading-tight">Empresa Logística SA</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">Hino Dutro (GHI-123)</p>
          <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg text-xs mb-4">
            <span className="font-semibold block mb-1">Orden #OT-1042</span>
            Alineación pesada
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl text-xs font-bold transition-colors hover:bg-zinc-50">
              Ver Orden
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
