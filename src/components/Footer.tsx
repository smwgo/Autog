import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-400 py-12 px-6 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <span className="text-2xl font-bold tracking-tighter text-white mb-4 block">AutoPro</span>
          <p className="text-sm leading-relaxed mb-4">
            Aplicación privada para gestión y ventas de la empresa automotriz. 
            Manejo integral de sucursales, inventario y servicios.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Ubicaciones</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <p className="font-medium text-zinc-300">Sede Principal</p>
              <p>Av. Central 1234, Centro</p>
            </li>
            <li className="pt-2">
              <p className="font-medium text-zinc-300">Sucursal Norte</p>
              <p>Av. Industrial 567, Norte</p>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Enlaces</h4>
          <ul className="space-y-2 text-sm flex flex-col">
            <Link href="/tienda" className="hover:text-white transition-colors">Tienda</Link>
            <Link href="/servicios" className="hover:text-white transition-colors">Servicios</Link>
            <Link href="/portal" className="hover:text-white transition-colors">Portal de Cliente</Link>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Contacto</h4>
          <ul className="space-y-2 text-sm flex flex-col">
            <a href="https://wa.me/1234567890" target="_blank" rel="noreferrer" className="hover:text-green-400 transition-colors flex items-center gap-2">
               WhatsApp
            </a>
            <a href="mailto:info@autopro.com" className="hover:text-white transition-colors">info@autopro.com</a>
            <Link href="/auth/login" className="mt-4 text-blue-500 hover:text-blue-400 transition-colors block">Acceso Administrativo</Link>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm">
        <p>&copy; {new Date().getFullYear()} AutoPro. Todos los derechos reservados.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <Link href="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
          <Link href="/terminos" className="hover:text-white transition-colors">Términos</Link>
        </div>
      </div>
    </footer>
  );
}
