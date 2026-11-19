import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatShortDate(d: Date | string | null | undefined): string {
  const date = d ? new Date(d) : new Date();
  if (isNaN(date.getTime())) {
    return new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  }
  return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

export async function GET() {
  try {
    const unified = await withRetry(async () => {
      const [manualTxs, sales, orders, invoices, cashMovements] = await Promise.all([
        prisma.financialTransaction.findMany({
          orderBy: { createdAt: "desc" },
        }),
        prisma.sale.findMany({
          where: { status: { notIn: ["Anulada", "ANULADA", "anulada"] } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.workshopOrder.findMany({
          orderBy: { createdAt: "desc" },
        }),
        prisma.clientInvoice.findMany({
          where: { status: { in: ["Autorizado", "Pagada"] } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.cashMovement.findMany({
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const existingRefs = new Set<string>();
      const results: any[] = [];

      for (const tx of manualTxs) {
        if (tx.reference) existingRefs.add(tx.reference.trim().toUpperCase());
        results.push({
          ...tx,
          sourceType: "MANUAL",
        });
      }

      const normalizeOrderRef = (val?: string | null) =>
        String(val || "")
          .trim()
          .toUpperCase()
          .replace(/^(OT|ORD)[-\s#]*/gi, "")
          .replace(/^(OT|ORD)[-\s#]*/gi, "")
          .replace(/#+/g, "")
          .trim();

      const billedOrderNumbers = new Set<string>();
      const billedSaleIds = new Set<string>();
      for (const s of sales) {
        billedSaleIds.add(s.id);
        const ref = (s.saleNumber || `VENTA-${s.id.slice(-4)}`).trim();
        if (s.sourceOrderNumber) {
          const norm = normalizeOrderRef(s.sourceOrderNumber);
          if (norm) billedOrderNumbers.add(norm);
        }
        if (existingRefs.has(ref.toUpperCase())) continue;
        existingRefs.add(ref.toUpperCase());

        results.push({
          id: `sale:${s.id}`,
          dateLabel: formatShortDate(s.createdAt),
          description: `Venta POS ${ref}${s.customerName ? ` — ${s.customerName}` : ""}`,
          category: "Ventas",
          reference: ref,
          amount: Number(s.total || 0),
          isIncome: true,
          method: s.paymentMethod || "Efectivo",
          createdAt: s.createdAt,
          sourceType: "POS",
        });
      }

      for (const o of orders) {
        const st = (o.status || "").toLowerCase();
        const isPaidOrDone =
          st.includes("finaliz") ||
          st.includes("entregad") ||
          st.includes("pagad") ||
          st.includes("facturad") ||
          st.includes("cobrad");
        if (!isPaidOrDone) continue;

        const ordRef = (o.orderNumber || "").trim();
        const normOrdRef = normalizeOrderRef(ordRef);
        if (ordRef && (existingRefs.has(ordRef.toUpperCase()) || (normOrdRef && billedOrderNumbers.has(normOrdRef)))) {
          continue;
        }

        let amount = Number(o.totalCost || 0);
        if (o.itemsJson || o.servicesJson) {
          try {
            const rawItems = typeof o.itemsJson === "string" ? JSON.parse(o.itemsJson) : (o.itemsJson || []);
            const rawSrvs = typeof o.servicesJson === "string" ? JSON.parse(o.servicesJson) : (o.servicesJson || []);
            const partsOnly = (Array.isArray(rawItems) ? rawItems : []).filter(
              (it: any) => it && typeof it === "object" && it.type !== "SERVICE"
            );
            const extraSrvs = (Array.isArray(rawItems) ? rawItems : []).filter(
              (it: any) => it && typeof it === "object" && it.type === "SERVICE"
            );
            const seenIds = new Set<string>();
            const seenNames = new Set<string>();
            const uniqueSrvs: any[] = [];
            const rawSrvsArr = Array.isArray(rawSrvs) ? rawSrvs : [];
            for (const sv of [
              ...rawSrvsArr.filter((s: any) => s && typeof s === "object"),
              ...extraSrvs,
              ...rawSrvsArr.filter((s: any) => typeof s === "string"),
            ]) {
              if (!sv) continue;
              const obj = typeof sv === "string" ? { name: sv, price: 0, qty: 1 } : sv;
              const idKey = String(obj.id || "").trim().toLowerCase();
              const nameKey = String(obj.name || obj.description || "").trim().toLowerCase().replace(/^\d+x\s+/i, "");
              if (!idKey && !nameKey) continue;
              if (idKey && seenIds.has(idKey)) continue;
              if (nameKey && seenNames.has(nameKey)) continue;
              if (idKey) seenIds.add(idKey);
              if (nameKey) seenNames.add(nameKey);
              uniqueSrvs.push(obj);
            }
            const sumParts = partsOnly.reduce(
              (acc: number, it: any) => acc + Number(it.price || 0) * Math.max(1, Number(it.qty || 1)),
              0
            );
            const sumSrvs = uniqueSrvs.reduce(
              (acc: number, sv: any) => acc + Number(sv.price || 0) * Math.max(1, Number(sv.qty || 1)),
              0
            );
            const subtotal = sumParts + sumSrvs;
            if (subtotal > 0) {
              const disc = Number(o.quoteDiscount ?? 0);
              const tax = o.quoteTaxRate !== null && o.quoteTaxRate !== undefined ? Number(o.quoteTaxRate) : 15;
              const base = Math.max(0, subtotal - (subtotal * disc) / 100);
              amount = Number((base * (1 + tax / 100)).toFixed(2));
            }
          } catch {}
        }
        if (amount <= 0) continue;

        if (ordRef) existingRefs.add(ordRef.toUpperCase());
        results.push({
          id: `order:${o.id}`,
          dateLabel: formatShortDate(o.completedAt || o.updatedAt || o.createdAt),
          description: `Orden de Taller ${ordRef}${o.client ? ` — ${o.client}` : ""}`,
          category: "Ventas",
          reference: ordRef || `OT-${o.id.slice(-4)}`,
          amount: Number(amount.toFixed(2)),
          isIncome: true,
          method: (o as any).paymentMethod || "Efectivo",
          createdAt: o.completedAt || o.updatedAt || o.createdAt,
          sourceType: "TALLER",
        });
      }

      for (const inv of invoices) {
        if (inv.saleId && billedSaleIds.has(inv.saleId)) continue;
        const invRef = (inv.invoiceNumber || "").trim();
        if (invRef && existingRefs.has(invRef.toUpperCase())) continue;
        const amount = Number(inv.amount || 0);
        if (amount <= 0) continue;
        if (invRef) existingRefs.add(invRef.toUpperCase());

        results.push({
          id: `invoice:${inv.id}`,
          dateLabel: formatShortDate(inv.createdAt),
          description: `Factura Electrónica ${invRef}`,
          category: "Ventas",
          reference: invRef || `FAC-${inv.id.slice(-4)}`,
          amount: Number(amount.toFixed(2)),
          isIncome: true,
          method: "Transferencia",
          createdAt: inv.createdAt,
          sourceType: "FACTURA",
        });
      }

      for (const m of cashMovements) {
        const t = (m.type || "").toUpperCase();
        if (t !== "GASTO" && t !== "RETIRO" && t !== "INGRESO" && t !== "VENTA") continue;
        const amount = Number(m.amount || 0);
        if (amount <= 0) continue;
        const isIncome = t === "INGRESO" || t === "VENTA";
        const ref = `CAJA-${m.id.slice(-5).toUpperCase()}`;
        if (existingRefs.has(ref)) continue;

        results.push({
          id: `cash:${m.id}`,
          dateLabel: formatShortDate(m.createdAt),
          description: m.reason || (isIncome ? "Ingreso en Caja" : "Egreso de Caja"),
          category: isIncome ? "Ventas" : "Operativos",
          reference: ref,
          amount: Number(amount.toFixed(2)),
          isIncome,
          method: "Efectivo",
          createdAt: m.createdAt,
          sourceType: "CAJA",
        });
      }

      return results.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    });

    return NextResponse.json(unified);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener finanzas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await withRetry(async () => {
      const isIncome = body.isIncome !== undefined ? Boolean(body.isIncome) : body.category === "Ventas";
      return await prisma.financialTransaction.create({
        data: {
          dateLabel: body.dateLabel || new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }),
          description: body.description || "Movimiento Financiero",
          category: body.category || "Ventas",
          reference: body.reference || `REF-${Math.floor(100 + Math.random() * 900)}`,
          amount: Number(body.amount || 0),
          isIncome,
          method: body.method || "Transferencia",
        },
      });
    });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear transacción" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const updated = await withRetry(async () => {
      if (typeof id === "string" && id.startsWith("sale:")) {
        const rawId = id.replace(/^sale:/, "");
        return await prisma.sale.update({
          where: { id: rawId },
          data: {
            total: body.amount !== undefined ? Number(body.amount) : undefined,
            paymentMethod: body.method !== undefined ? body.method : undefined,
            saleNumber: body.reference !== undefined ? body.reference : undefined,
          },
        });
      }
      if (typeof id === "string" && id.startsWith("cash:")) {
        const rawId = id.replace(/^cash:/, "");
        return await prisma.cashMovement.update({
          where: { id: rawId },
          data: {
            amount: body.amount !== undefined ? Number(body.amount) : undefined,
            reason: body.description !== undefined ? body.description : undefined,
          },
        });
      }
      return await prisma.financialTransaction.update({
        where: { id },
        data: {
          dateLabel: body.dateLabel !== undefined ? body.dateLabel : undefined,
          description: body.description !== undefined ? body.description : undefined,
          category: body.category !== undefined ? body.category : undefined,
          reference: body.reference !== undefined ? body.reference : undefined,
          amount: body.amount !== undefined ? Number(body.amount) : undefined,
          isIncome: body.isIncome !== undefined ? Boolean(body.isIncome) : undefined,
          method: body.method !== undefined ? body.method : undefined,
        },
      });
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar transacción" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      if (id.startsWith("sale:")) {
        const rawId = id.replace(/^sale:/, "");
        await prisma.sale.delete({ where: { id: rawId } });
        return;
      }
      if (id.startsWith("cash:")) {
        const rawId = id.replace(/^cash:/, "");
        await prisma.cashMovement.delete({ where: { id: rawId } });
        return;
      }
      if (id.startsWith("invoice:")) {
        const rawId = id.replace(/^invoice:/, "");
        await prisma.clientInvoice.delete({ where: { id: rawId } });
        return;
      }
      await prisma.financialTransaction.delete({ where: { id } });
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar transacción" }, { status: 500 });
  }
}

