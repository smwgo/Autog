export default function GerenciaDashboard() {
  return (
    <div className="h-full min-h-screen bg-[#efefef] p-0">
      <div className="h-full bg-[#f4f4f4] border-l border-r border-zinc-300 p-4 md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-bold uppercase tracking-[0.18em] text-zinc-700">GERENCIA</p>
            <h1 className="mt-1 text-[52px] font-black leading-[0.9] tracking-[-0.06em] text-zinc-900">Panel de control</h1>
          </div>

          <button className="mt-2 inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-[16px] font-medium text-blue-600 shadow-sm">
            Consolidado
            <span className="ml-2 text-zinc-500">▼</span>
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[14px] border border-red-200 bg-red-50 p-4 text-red-700">
            <h3 className="text-[20px] font-black leading-tight">Inventario crítico</h3>
            <p className="mt-2 text-[18px] leading-tight">12 productos por debajo del stock mínimo.</p>
          </div>

          <div className="rounded-[14px] border border-yellow-200 bg-yellow-50 p-4 text-yellow-700">
            <h3 className="text-[20px] font-black leading-tight">Cuentas en mora</h3>
            <p className="mt-2 text-[18px] leading-tight">3 clientes superaron los 30 días de crédito.</p>
          </div>

          <div className="rounded-[14px] border border-blue-200 bg-blue-50 p-4 text-blue-700">
            <h3 className="text-[20px] font-black leading-tight">Servicios atrasados</h3>
            <p className="mt-2 text-[18px] leading-tight">5 vehículos en taller esperan repuestos.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[14px] border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-[16px] text-zinc-500">Ventas netas</p>
            <p className="mt-3 text-[42px] font-black leading-none text-zinc-900">$124,500</p>
            <div className="mt-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-[16px] font-semibold text-blue-700">+14% vs mes anterior</div>
          </div>

          <div className="rounded-[14px] border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-[16px] text-zinc-500">Utilidad bruta</p>
            <p className="mt-3 text-[42px] font-black leading-none text-zinc-900">$45,200</p>
            <div className="mt-4 inline-block rounded-full bg-green-100 px-3 py-1 text-[16px] font-semibold text-green-700">+8% vs mes anterior</div>
          </div>

          <div className="rounded-[14px] border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-[16px] text-zinc-500">Órdenes taller</p>
            <p className="mt-3 text-[42px] font-black leading-none text-zinc-900">142</p>
            <div className="mt-4 inline-block rounded-full bg-yellow-100 px-3 py-1 text-[16px] font-semibold text-yellow-700">110 cerradas · 32 abiertas</div>
          </div>

          <div className="rounded-[14px] border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-[16px] text-zinc-500">Cuentas por cobrar</p>
            <p className="mt-3 text-[42px] font-black leading-none text-zinc-900">$18,400</p>
            <div className="mt-4 inline-block rounded-full bg-red-100 px-3 py-1 text-[16px] font-semibold text-red-700">Mora: $4,200</div>
          </div>
        </div>
      </div>
    </div>
  );
}
