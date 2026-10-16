import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";

async function ensureAgendaTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClientAppointment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "appointmentNumber" TEXT NOT NULL UNIQUE,
      "vehicle" TEXT NOT NULL,
      "plate" TEXT NOT NULL,
      "clientName" TEXT NOT NULL DEFAULT 'Juan Pérez',
      "clientPhone" TEXT,
      "serviceName" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "timeSlot" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'Confirmada',
      "notes" TEXT,
      "tech" TEXT DEFAULT 'Carlos Ruiz',
      "bay" TEXT DEFAULT 'Bahía 1',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`ALTER TABLE "ClientAppointment" ADD COLUMN IF NOT EXISTS "tech" TEXT DEFAULT 'Carlos Ruiz';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "ClientAppointment" ADD COLUMN IF NOT EXISTS "bay" TEXT DEFAULT 'Bahía 1';`);
}

export async function GET() {
  try {
    const appointments = await withRetry(async () => {
      await ensureAgendaTable();

      const countRes: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as cnt FROM "ClientAppointment"`);
      if (!countRes[0] || countRes[0].cnt === 0) {
        const seeds = [
          { id: "ag_1", appointmentNumber: "CIT-1001", timeSlot: "08:00 AM", clientName: "Fernando López", vehicle: "PCE-1234 (Toyota)", plate: "PCE-1234", serviceName: "Mantenimiento 50k KM", tech: "Carlos Ruiz", bay: "Bahía 1", status: "En Curso", date: "Hoy" },
          { id: "ag_2", appointmentNumber: "CIT-1002", timeSlot: "09:30 AM", clientName: "Andrea Suárez", vehicle: "UBT-1122 (Ford)", plate: "UBT-1122", serviceName: "Cambio de Pastillas de Freno", tech: "José Mendoza", bay: "Bahía 2", status: "Esperando", date: "Hoy" },
          { id: "ag_3", appointmentNumber: "CIT-1003", timeSlot: "10:00 AM", clientName: "Logística Express", vehicle: "GBA-5678 (Hino)", plate: "GBA-5678", serviceName: "Revisión Preventiva Flota", tech: "Mario Cedeño", bay: "Elevador Principal", status: "Confirmada", date: "Hoy" },
          { id: "ag_4", appointmentNumber: "CIT-1004", timeSlot: "11:30 AM", clientName: "Daniela Alvarado", vehicle: "GSD-9012 (Chevrolet)", plate: "GSD-9012", serviceName: "Diagnóstico Computarizado", tech: "Carlos Ruiz", bay: "Bahía 1", status: "Confirmada", date: "Hoy" },
          { id: "ag_5", appointmentNumber: "CIT-1005", timeSlot: "02:00 PM", clientName: "Roberto Gómez", vehicle: "PBZ-8899 (Kia)", plate: "PBZ-8899", serviceName: "Cambio de Aceite y Filtros", tech: "Sin Asignar", bay: "Por definir", status: "Solicitada", date: "Hoy" },
          { id: "ag_6", appointmentNumber: "CIT-1006", timeSlot: "04:00 PM", clientName: "María Torres", vehicle: "GTC-5544 (Nissan)", plate: "GTC-5544", serviceName: "Alineación y Balanceo", tech: "Sin Asignar", bay: "Por definir", status: "Reprogramada", date: "Hoy" },
        ];
        for (const s of seeds) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "ClientAppointment" ("id", "appointmentNumber", "vehicle", "plate", "clientName", "serviceName", "date", "timeSlot", "status", "tech", "bay", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
             ON CONFLICT ("appointmentNumber") DO NOTHING`,
            s.id, s.appointmentNumber, s.vehicle, s.plate, s.clientName, s.serviceName, s.date, s.timeSlot, s.status, s.tech, s.bay
          );
        }
      }

      await prisma.$executeRawUnsafe(`UPDATE "ClientAppointment" SET "tech" = 'Carlos Ruiz' WHERE "tech" IS NULL`);
      await prisma.$executeRawUnsafe(`UPDATE "ClientAppointment" SET "bay" = 'Bahía 1' WHERE "bay" IS NULL`);

      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "ClientAppointment" ORDER BY "createdAt" ASC`);
      return rows;
    });

    return NextResponse.json(appointments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al cargar agenda" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await withRetry(async () => {
      await ensureAgendaTable();
      const id = `ag_${Date.now()}`;
      const appointmentNumber = `CIT-${Math.floor(1000 + Math.random() * 9000)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "ClientAppointment" ("id", "appointmentNumber", "vehicle", "plate", "clientName", "clientPhone", "serviceName", "date", "timeSlot", "status", "tech", "bay", "notes", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)`,
        id,
        appointmentNumber,
        body.vehicle || "Vehículo",
        body.plate || "S/P",
        body.clientName || "Cliente",
        body.clientPhone || "",
        body.serviceName || "Mantenimiento General",
        body.date || "Hoy",
        body.timeSlot || "10:00 AM",
        body.status || "Confirmada",
        body.tech || "Sin Asignar",
        body.bay || "Por definir",
        body.notes || ""
      );
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "ClientAppointment" WHERE "id" = $1`, id);
      return rows[0];
    });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al agendar cita" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    const updated = await withRetry(async () => {
      await ensureAgendaTable();
      await prisma.$executeRawUnsafe(
        `UPDATE "ClientAppointment"
         SET "clientName" = COALESCE($2, "clientName"),
             "vehicle" = COALESCE($3, "vehicle"),
             "plate" = COALESCE($4, "plate"),
             "serviceName" = COALESCE($5, "serviceName"),
             "date" = COALESCE($6, "date"),
             "timeSlot" = COALESCE($7, "timeSlot"),
             "status" = COALESCE($8, "status"),
             "tech" = COALESCE($9, "tech"),
             "bay" = COALESCE($10, "bay"),
             "notes" = COALESCE($11, "notes"),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = $1`,
        id,
        body.clientName ?? null,
        body.vehicle ?? null,
        body.plate ?? null,
        body.serviceName ?? null,
        body.date ?? null,
        body.timeSlot ?? null,
        body.status ?? null,
        body.tech ?? null,
        body.bay ?? null,
        body.notes ?? null
      );
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "ClientAppointment" WHERE "id" = $1`, id);
      return rows[0];
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar cita" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await withRetry(async () => {
      await prisma.$executeRawUnsafe(`DELETE FROM "ClientAppointment" WHERE "id" = $1`, id);
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar cita" }, { status: 500 });
  }
}
