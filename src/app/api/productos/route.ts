import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

let cachedProducts: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10000; // 10s en memoria, invalidado inmediatamente en POST/PUT/DELETE

function calcularEstado(stock: number, minStock: number = 5): string {
  if (stock <= 0) return "Agotado";
  if (stock <= minStock) return "Bajo Stock";
  return "En Stock";
}

function normalizarTipo(tipo: unknown): string {
  if (Array.isArray(tipo)) {
    return tipo.map((modulo) => String(modulo).trim()).filter(Boolean).join(", ") || "Todos";
  }
  return typeof tipo === "string" && tipo.trim() ? tipo.trim() : "Todos";
}

// GET: Consultar productos de Neon (con caché reguladora)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const busqueda = searchParams.get("busqueda")?.trim().toLowerCase() || "";
    const categoria = searchParams.get("categoria") || "";
    const modulo = (searchParams.get("modulo") || searchParams.get("tipo") || "").trim().toLowerCase();
    const sede = (searchParams.get("sede") || "PRINCIPAL").trim().toUpperCase();

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
      const stockPrincipal = Number(prod.stock || 0);
      const stockSucursal = Number(prod.stockNorte || 0);
      const stock =
        sede === "SUCURSAL"
          ? stockSucursal
          : sede === "AMBOS" || sede === "AMBAS"
            ? stockPrincipal + stockSucursal
            : stockPrincipal;
      return NextResponse.json({
        success: true,
        producto: {
          ...prod,
          stock,
          status: calcularEstado(stock, prod.minStock),
          tipo: prod.tipo || "Todos",
        },
      });
    }

    const now = Date.now();
    const products =
      cachedProducts && now - lastCacheTime < CACHE_TTL_MS
        ? cachedProducts
        : await prisma.product.findMany({
            orderBy: {
              createdAt: "desc",
            },
          });
    if (!cachedProducts || now - lastCacheTime >= CACHE_TTL_MS) {
      cachedProducts = products;
      lastCacheTime = now;
    }

    // Extraer todas las categorías únicas disponibles en Neon
    const categoriesSet = new Set<string>();
    products.forEach((p) => {
      if (p.category && (sede !== "SUCURSAL" || Number(p.stockNorte || 0) > 0)) {
        categoriesSet.add(p.category);
      }
    });
    const categories = Array.from(categoriesSet);

    // Filtrar en memoria por búsqueda, categoría y módulo/tipo
    const filtrados = products.filter((p) => {
      const matchSearch =
        !busqueda ||
        p.name.toLowerCase().includes(busqueda) ||
        p.code.toLowerCase().includes(busqueda) ||
        (p.brand && p.brand.toLowerCase().includes(busqueda)) ||
        p.category.toLowerCase().includes(busqueda) ||
        (p.subCategory && p.subCategory.toLowerCase().includes(busqueda)) ||
        (p.presentation && p.presentation.toLowerCase().includes(busqueda));

      const matchCategory = !categoria || p.category === categoria;

      const prodTipo = (p.tipo || "Todos").toLowerCase();
      const matchModulo =
        !modulo ||
        (modulo === "tienda"
          ? prodTipo.includes("tienda")
          : prodTipo === "todos" ||
            prodTipo.includes("todos") ||
            prodTipo.includes(modulo));
      const matchSucursalStock = sede !== "SUCURSAL" || Number(p.stockNorte || 0) > 0;

      return matchSearch && matchCategory && matchModulo && matchSucursalStock;
    });

    const productosConTipo = filtrados.map((p) => {
      const stockPrincipal = Number(p.stock || 0);
      const stockSucursal = Number(p.stockNorte || 0);
      const stock =
        sede === "SUCURSAL"
          ? stockSucursal
          : sede === "AMBOS" || sede === "AMBAS"
            ? stockPrincipal + stockSucursal
            : stockPrincipal;

      return {
        ...p,
        stock,
        status: calcularEstado(stock, p.minStock),
        tipo: p.tipo || "Todos",
      };
    });

    const totalProductos = productosConTipo.length;
    const totalEnStock = productosConTipo.filter((p) => p.status === "En Stock").length;
    const totalBajoStock = productosConTipo.filter((p) => p.status === "Bajo Stock").length;
    const totalAgotados = productosConTipo.filter((p) => p.status === "Agotado").length;

    return NextResponse.json(
      {
        success: true,
        productos: productosConTipo,
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
    console.error("Error al obtener productos de base de datos:", error);
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
    const { code, name, brand, category = "General", subCategory, presentation, tipo = "Todos", price, costPrice, stock = 0, minStock = 5, location, imageUrl } = body;
    const branch = String(body.branch || "PRINCIPAL").toUpperCase();
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
    const stockPrincipal = branch === "SUCURSAL" ? 0 : numStock;
    const stockSucursal = branch === "SUCURSAL" ? numStock : 0;
    const status = calcularEstado(stockPrincipal, numMinStock);
    const finalTipo = normalizarTipo(tipo);

    const nuevoProducto = await prisma.product.create({
      data: {
        code: finalCode,
        name: nombreLimpio,
        brand: brand?.trim() || null,
        category: category?.trim() || "General",
        subCategory: subCategory?.trim() || null,
        presentation: presentation?.trim() || null,
        tipo: finalTipo,
        price: numPrice,
        costPrice: numCostPrice,
        stock: stockPrincipal,
        stockNorte: stockSucursal,
        minStock: numMinStock,
        location: location?.trim() || null,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        status,
      },
    });

    cachedProducts = null;
    lastCacheTime = 0;

    void createAuditLog({
      module: "CATALOGO",
      action: `Producto creado ${nuevoProducto.code}`,
      entityName: "Product",
      entityId: nuevoProducto.id,
      details: `${nuevoProducto.name} | Precio: $${Number(nuevoProducto.price).toFixed(2)} | Stock: ${nuevoProducto.stock}/${nuevoProducto.stockNorte}`,
      level: "INFO",
    });

    return NextResponse.json({ success: true, producto: { ...nuevoProducto, tipo: finalTipo } }, { status: 201 });
  } catch (error: any) {
    console.error("Error al crear producto en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar producto en base de datos" },
      { status: 500 }
    );
  }
}

// PUT: Actualizar producto en Neon
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, code, name, brand, category, subCategory, presentation, tipo, price, costPrice, stock, minStock = 5, location, imageUrl } = body;
    const branch = String(body.branch || "PRINCIPAL").toUpperCase();

    if (!id) {
      return NextResponse.json({ success: false, error: "ID de producto requerido" }, { status: 400 });
    }

    const numStock = parseInt(stock.toString(), 10) || 0;
    const numMinStock = parseInt(minStock?.toString() || "5", 10) || 5;
    const numPrice = parseFloat(price.toString()) || 0;
    const numCostPrice = costPrice !== undefined && costPrice !== null && costPrice !== ""
      ? parseFloat(costPrice.toString())
      : undefined;
    const stockData = branch === "SUCURSAL"
      ? { stockNorte: numStock }
      : { stock: numStock };
    const currentProduct = await prisma.product.findUnique({
      where: { id },
      select: { stock: true },
    });
    if (!currentProduct) {
      return NextResponse.json({ success: false, error: "Producto no encontrado" }, { status: 404 });
    }
    const status = calcularEstado(
      branch === "SUCURSAL" ? Number(currentProduct.stock) : numStock,
      numMinStock
    );
    const finalTipo = tipo !== undefined ? normalizarTipo(tipo) : undefined;
    const finalCategory = category !== undefined ? (String(category).trim() || "General") : undefined;
    const actualizado = await prisma.product.update({
      where: { id },
      data: {
        code: code ? code.trim().toUpperCase() : undefined,
        name: name ? name.trim() : undefined,
        brand: brand !== undefined ? brand.trim() : undefined,
        category: finalCategory,
        subCategory: subCategory !== undefined ? (String(subCategory).trim() || null) : undefined,
        presentation: presentation !== undefined ? (String(presentation).trim() || null) : undefined,
        tipo: finalTipo,
        price: numPrice,
        costPrice: numCostPrice,
        ...stockData,
        minStock: numMinStock,
        location: location !== undefined ? location.trim() : undefined,
        imageUrl: imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : undefined,
        status,
      },
    });

    cachedProducts = null;
    lastCacheTime = 0;

    void createAuditLog({
      module: "CATALOGO",
      action: `Producto actualizado ${actualizado.code}`,
      entityName: "Product",
      entityId: actualizado.id,
      details: `${actualizado.name} | Precio: $${Number(actualizado.price).toFixed(2)} | Stock: ${actualizado.stock}/${actualizado.stockNorte}`,
      level: "INFO",
    });

    return NextResponse.json({
      success: true,
      producto: {
        ...actualizado,
        category: finalCategory ?? actualizado.category,
        tipo: finalTipo ?? actualizado.tipo,
      },
    });
  } catch (error: any) {
    console.error("Error al actualizar producto en base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar producto en base de datos" },
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

    // Desvincular ítems de venta y limpiar tablas auxiliares si existieran sin abortar transacción
    await Promise.allSettled([
      prisma.saleItem.updateMany({ where: { productId: id }, data: { productId: null } }),
      prisma.$executeRawUnsafe(`DELETE FROM "InventoryMovement" WHERE "productId" = $1`, id),
      prisma.$executeRawUnsafe(`DELETE FROM "PhysicalCountItem" WHERE "productId" = $1`, id),
      prisma.$executeRawUnsafe(`DELETE FROM "StockTransferItem" WHERE "productId" = $1`, id),
      prisma.$executeRawUnsafe(`DELETE FROM "BranchStock" WHERE "productId" = $1`, id),
      prisma.$executeRawUnsafe(`DELETE FROM "ProductLot" WHERE "productId" = $1`, id),
    ]);

    await prisma.product.delete({
      where: { id },
    });

    cachedProducts = null;
    lastCacheTime = 0;

    void createAuditLog({
      module: "CATALOGO",
      action: `Producto eliminado ${existing.code}`,
      entityName: "Product",
      entityId: id,
      details: existing.name,
      level: "ADVERTENCIA",
    });

    return NextResponse.json(
      { success: true, message: "Producto eliminado correctamente." },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("Error al eliminar producto de base de datos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al eliminar producto de base de datos" },
      { status: 500 }
    );
  }
}
