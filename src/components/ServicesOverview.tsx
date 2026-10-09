import Link from "next/link";

export function ServicesOverview() {
  const services = [
    { id: 1, title: "Mantenimiento Preventivo", icon: "🛠️", desc: "Cambio de aceite, filtros y revisión de niveles." },
    { id: 2, title: "Alineación y Balanceo", icon: "⚖️", desc: "Ajuste láser preciso para el tren delantero y trasero." },
    { id: 3, title: "Frenos y Suspensión", icon: "🛑", desc: "Revisión y cambio de pastillas, discos y amortiguadores." },
    { id: 4, title: "Diagnóstico Computarizado", icon: "💻", desc: "Escaneo de sensores, motor y sistemas electrónicos." },
  ];

  return (
    <section id="servicios" className="py-20 px-6 md:px-12 bg-zinc-100 dark:bg-zinc-900/50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Servicios Especializados
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
              Nuestros talleres cuentan con tecnología de punta y mecánicos certificados para garantizar el mejor servicio para tu vehículo.
            </p>
          </div>
          <Link href="/servicios" className="mt-6 md:mt-0 px-6 py-3 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
            Ver todos los servicios
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <div key={service.id} className="bg-white dark:bg-zinc-950 p-6 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{service.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6">{service.desc}</p>
              <Link href={`/agendar?service=${service.id}`} className="text-blue-600 dark:text-blue-500 font-medium text-sm flex items-center gap-1 hover:underline">
                Agendar ahora <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
