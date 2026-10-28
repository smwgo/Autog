import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

let cachedProducts: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 1000; // 1 segundo para reflejar cambios reales de inmediato

function calcularEstado(stock: number, minStock: number = 5): string {
  if (stock <= 0) return "Agotado";
  if (stock <= minStock) return "Bajo Stock";
  return "En Stock";
}

// GET: Consultar productos de Neon (con caché reguladora)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";
    const categoria = searchParams.get("categoria") || "";

    if (id) {
      const prod = await prisma.product.findUnique({
        where: { id },
      });
      if (!prod) {
        return NextResponse.json(
          { success: false, error: "Producto no encontrado" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, producto: prod });
    }

    let products = cachedProducts;
    const now = Date.now();

    if (!products || now - lastCacheTime > CACHE_TTL_MS) {
      products = await prisma.product.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
      cachedProducts = products;
      lastCacheTime = now;
    }

    // Extraer todas las categorías únicas disponibles en Neon
    const categoriesSet = new Set<string>();
    products.forEach((p) => {
      if (p.category) categoriesSet.add(p.category);
    });
    const categories = Array.from(categoriesSet);

    // Filtrar en memoria por búsqueda y categoría
    const filtrados = products.filter((p) => {
      const matchSearch =
        !busqueda ||
        p.name.toLowerCase().includes(busqueda) ||
        p.code.toLowerCase().includes(busqueda) ||
        (p.brand && p.brand.toLowerCase().includes(busqueda));

      const matchCategory = !categoria || p.category === categoria;

      return matchSearch && matchCategory;
    });

    const totalProductos = products.length;
    const totalEnStock = products.filter((p) => p.status === "En Stock").length;
    const totalBajoStock = products.filter((p) => p.status === "Bajo Stock").length;
    const totalAgotados = products.filter((p) => p.status === "Agotado").length;

    return NextResponse.json(
      {
        success: true,
        productos: filtrados,
        categories,
        stats: {
          totalProductos,
          totalEnStock,
          totalBajoStock,
          totalAgotados,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Error al obtener productos de Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al conectar con la base de datos" },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo producto en Neon
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, brand, category = "General", price, costPrice, stock = 0, minStock = 5, location, imageUrl } = body;
    const rawCode = (code || "").toString().trim();
    const codigoLimpio = rawCode
      ? rawCode.toUpperCase()
      : `PRD-${Date.now().toString().slice(-6)}`;

    const nombreLimpio = (name || "").toString().trim() || "Producto General";

    // Validar código único solo si fue provisto explícitamente o asegurar que el auto-generado sea único
    let finalCode = codigoLimpio;
    const existe = await prisma.product.findUnique({
      where: { code: finalCode },
    });

    if (existe) {
      if (rawCode) {
        return NextResponse.json(
          { success: false, error: `Ya existe un producto con el código ${finalCode}.` },
          { status: 409 }
        );
      } else {
        finalCode = `PRD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      }
    }

    const numStock = parseInt(stock?.toString() || "0", 10) || 0;
    const numMinStock = parseInt(minStock?.toString() || "5", 10) || 5;
    const numPrice = parseFloat(price?.toString() || "0") || 0;
    const numCostPrice = costPrice !== undefined && costPrice !== null && costPrice !== ""
      ? parseFloat(costPrice.toString())
      : null;
    const status = calcularEstado(numStock, numMinStock);

    const nuevoProducto = await prisma.product.create({
      data: {
        code: finalCode,
        name: nombreLimpio,
        brand: brand?.trim() || null,
        category: category?.trim() || "General",
        price: numPrice,
        costPrice: numCostPrice,
        stock: numStock,
        minStock: numMinStock,
        location: location?.trim() || null,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        status,
      },
    });

    cachedProducts = null;
    lastCacheTime = 0;

    return NextResponse.json({ success: true, producto: nuevoProducto }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear producto en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar producto en Neon" },
      { status: 500 }
    );
  }
}

// PUT: Actualizar producto en Neon
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, code, name, brand, category, price, costPrice, stock, minStock = 5, location, imageUrl } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de producto requerido" }, { status: 400 });
    }

    const numStock = parseInt(stock.toString(), 10) || 0;
    const numMinStock = parseInt(minStock?.toString() || "5", 10) || 5;
    const numPrice = parseFloat(price.toString()) || 0;
    const numCostPrice = costPrice !== undefined && costPrice !== null && costPrice !== ""
      ? parseFloat(costPrice.toString())
      : undefined;
    const status = calcularEstado(numStock, numMinStock);

    const actualizado = await prisma.product.update({
      where: { id },
      data: {
        code: code ? code.trim().toUpperCase() : undefined,
        name: name ? name.trim() : undefined,
        brand: brand !== undefined ? brand.trim() : undefined,
        category: category ? category.trim() : undefined,
        price: numPrice,
        costPrice: numCostPrice,
        stock: numStock,
        minStock: numMinStock,
        location: location !== undefined ? location.trim() : undefined,
        imageUrl: imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : undefined,
        status,
      },
    });

    cachedProducts = null;
    lastCacheTime = 0;

    return NextResponse.json({ success: true, producto: actualizado });
  } catch (error: any) {
    console.error("Error al actualizar producto en Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar producto en Neon" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar producto de Neon
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de producto requerido" }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      cachedProducts = null;
      lastCacheTime = 0;
      return NextResponse.json({ success: true, message: "El producto ya había sido eliminado." });
    }

    // Limpieza en transacción de registros dependientes para asegurar borrado completo
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`DELETE FROM "InventoryMovement" WHERE "productId" = $1`, id).catch(() => {});
      await tx.$executeRawUnsafe(`DELETE FROM "PhysicalCountItem" WHERE "productId" = $1`, id).catch(() => {});
      await tx.$executeRawUnsafe(`DELETE FROM "StockTransferItem" WHERE "productId" = $1`, id).catch(() => {});
      await tx.$executeRawUnsafe(`DELETE FROM "BranchStock" WHERE "productId" = $1`, id).catch(() => {});
      await tx.$executeRawUnsafe(`DELETE FROM "ProductLot" WHERE "productId" = $1`, id).catch(() => {});
      await tx.product.delete({
        where: { id },
      });
    });

    cachedProducts = null;
    lastCacheTime = 0;

    return NextResponse.json(
      { success: true, message: "Producto eliminado correctamente." },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Error al eliminar producto de Neon:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar producto de Neon" },
      { status: 500 }
    );
  }
}
