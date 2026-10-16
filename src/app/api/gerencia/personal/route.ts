import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

async function ensureEmployeeTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Employee" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "phone" TEXT,
      "role" TEXT NOT NULL,
      "department" TEXT NOT NULL DEFAULT 'TALLER',
      "location" TEXT NOT NULL DEFAULT 'Sede Principal',
      "lastLogin" TEXT NOT NULL DEFAULT 'Hoy',
      "status" TEXT NOT NULL DEFAULT 'Activo',
      "salary" DECIMAL(12,2),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function GET() {
  try {
    const employees = await withRetry(async () => {
      await ensureEmployeeTable();

      const countRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "Employee"`);
      if (!countRes[0] || countRes[0].cnt === 0) {
        const seeds = [
          { id: "emp_1", name: "Carlos Ruiz", email: "carlos@autopro.com", role: "Mecánico Senior", department: "TALLER", location: "Sucursal Norte", lastLogin: "Hoy, 08:30 AM", status: "Activo" },
          { id: "emp_2", name: "Ana Torres", email: "ana@autopro.com", role: "Cajera", department: "POS", location: "Sede Principal", lastLogin: "Hoy, 09:15 AM", status: "Activo" },
          { id: "emp_3", name: "Juan Pérez", email: "juan@autopro.com", role: "Gerente Sucursal", department: "GERENCIA", location: "Sucursal Norte", lastLogin: "Ayer", status: "Activo" },
          { id: "emp_4", name: "María Gómez", email: "maria@autopro.com", role: "Atención Cliente", department: "OFICINA", location: "Sede Principal", lastLogin: "Hace 2 días", status: "Vacaciones" },
          { id: "emp_5", name: "Luis Silva", email: "luis@autopro.com", role: "Supervisor", department: "GERENCIA", location: "Ambas", lastLogin: "Hoy, 07:45 AM", status: "Activo" },
        ];
        for (const s of seeds) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "Employee" ("id", "name", "email", "role", "department", "location", "lastLogin", "status", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
             ON CONFLICT ("email") DO NOTHING`,
            s.id, s.name, s.email, s.role, s.department, s.location, s.lastLogin, s.status
          );
        }
      }

      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Employee" ORDER BY "createdAt" DESC`);
      return rows;
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener personal" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await withRetry(async () => {
      await ensureEmployeeTable();
      const id = `emp_${Date.now()}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Employee" ("id", "name", "email", "phone", "role", "department", "location", "lastLogin", "status", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
        id,
        body.name || "Nuevo Empleado",
        body.email || `empleado${Math.floor(100 + Math.random() * 900)}@autopro.com`,
        body.phone || "",
        body.role || "Especialista",
        body.department || "TALLER",
        body.location || "Sede Principal",
        "Recién registrado",
        body.status || "Activo"
      );
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Employee" WHERE "id" = $1`, id);
      return rows[0];
    });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear empleado" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    const updated = await withRetry(async () => {
      await ensureEmployeeTable();
      await prisma.$executeRawUnsafe(
        `UPDATE "Employee"
         SET "name" = COALESCE($2, "name"),
             "email" = COALESCE($3, "email"),
             "role" = COALESCE($4, "role"),
             "department" = COALESCE($5, "department"),
             "location" = COALESCE($6, "location"),
             "status" = COALESCE($7, "status"),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1`,
        id,
        body.name ?? null,
        body.email ?? null,
        body.role ?? null,
        body.department ?? null,
        body.location ?? null,
        body.status ?? null
      );
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "Employee" WHERE "id" = $1`, id);
      return rows[0];
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar empleado" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      await prisma.$executeRawUnsafe(`DELETE FROM "Employee" WHERE "id" = $1`, id);
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar empleado" }, { status: 500 });
  }
}
