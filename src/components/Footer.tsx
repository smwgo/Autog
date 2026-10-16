import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-400 py-12 px-6 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-2xl flex items-center gap-1.5">
              <span className="text-blue-500 font-black">Auto</span>
              <span className="text-zinc-600 font-light px-0.5">/</span>
              <span className="text-white font-black">G</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed mb-4">
            Tu aliado en repuestos y servicios automotrices.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Ubicaciones</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <p className="font-medium text-zinc-300">Sede Principal</p>
              <p>Padre Aguirre y Olmedo</p>
            </li>
            <li className="pt-2">
              <p className="font-medium text-zinc-300">Sucursal Sur</p>
              <p>Av. Vicente Piedrahita y Pompeyo Garcia</p>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Enlaces</h4>
          <ul className="space-y-2 text-sm flex flex-col">
            <Link href="/promociones" className="hover:text-white transition-colors">Promociones</Link>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Contacto</h4>
          <ul className="space-y-2 text-sm flex flex-col">
            <Link href="/contacto" className="hover:text-white transition-colors">
              Página de Contacto
            </Link>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm gap-4">
        <p>&copy; {new Date().getFullYear()} Auto/G.</p>
        
        {/* Social Icons */}
        <div className="flex items-center gap-2 sm:gap-4">
          <a href="#" aria-label="Facebook" className="text-zinc-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/></svg>
          </a>
          <a href="#" aria-label="Instagram" className="text-zinc-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>
          <a href="#" aria-label="TikTok" className="text-zinc-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2-1.74 2.89 2.89 0 012.89-2.88 2.85 2.85 0 011.54.46v-3.6a6.3 6.3 0 00-1.54-.18 6.33 6.33 0 106.33 6.33V8.69a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.57-.12z"/></svg>
          </a>
          <a href="#" aria-label="WhatsApp" className="text-zinc-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"></path><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"></path></svg>
          </a>
        </div>

        <div className="flex gap-4">
          <Link href="/privacidad" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center py-2 px-1">Privacidad</Link>
          <Link href="/terminos" className="hover:text-white transition-colors min-h-[44px] inline-flex items-center py-2 px-1">Términos</Link>
        </div>
      </div>
    </footer>
  );
}
