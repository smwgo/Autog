import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { prisma } from "@/lib/auth";
import Image from "next/image";
import Link from "next/link";

export default async function TiendaPage() {
  let products: any[] = [];
  
  // Temporarily commented out to prevent crashing without a database
  // try {
  //   products = await prisma.product.findMany({
  //     where: { status: "ACTIVE" }
  //   });
  // } catch (error) {
  //   console.error("Database connection failed", error);
  // }

  // Mock data for previewing the design
  products = [
    {
      id: "1",
      name: "Filtro de Aceite Sintético Premium",
      sku: "FLT-AC-001",
      brand: "Bosch",
      category: "Filtros",
      description: "Filtro de aceite de alto rendimiento para motores a gasolina y diésel.",
      price: 15.99,
      photoUrl: ""
    },
    {
      id: "2",
      name: "Pastillas de Freno Delanteras (Set de 4)",
      sku: "FRN-PAS-022",
      brand: "Brembo",
      category: "Frenos",
      description: "Pastillas de freno cerámicas para una frenada silenciosa y eficiente.",
      price: 45.50,
      photoUrl: ""
    },
    {
      id: "3",
      name: "Batería 12V 75Ah Libre de Mantenimiento",
      sku: "BAT-12V-75",
      brand: "Moura",
      category: "Eléctrico",
      description: "Batería de larga duración con excelente capacidad de arranque en frío.",
      price: 120.00,
      photoUrl: ""
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Header />
      <main className="flex-grow pt-24 pb-16 px-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-4">
            Nuestra Tienda
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Encuentra los mejores repuestos y accesorios para tu vehículo. Calidad garantizada y los mejores precios del mercado.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300 mb-2">No hay productos disponibles</h2>
            <p className="text-zinc-500 dark:text-zinc-500">Estamos actualizando nuestro inventario. Vuelve pronto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="group flex flex-col bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center p-4">
                  {product.photoUrl ? (
                    <Image 
                      src={product.photoUrl} 
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-zinc-400 dark:text-zinc-600 flex flex-col items-center">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <span className="text-sm font-medium">Sin imagen</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {product.brand}
                  </div>
                </div>
                
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{product.category}</span>
                    <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">SKU: {product.sku}</span>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xl font-black text-blue-600 dark:text-blue-500">
                      ${product.price.toFixed(2)}
                    </span>
                    <button className="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                      Comprar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
