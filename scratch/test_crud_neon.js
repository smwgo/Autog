const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCrud() {
  console.log("=== INICIANDO AUDITORÍA CRUD CONTRA NEON ===");
  try {
    // 1. READ
    console.log("1. Probando READ en Neon...");
    const initialServices = await prisma.workshopService.findMany();
    console.log(`   -> Éxito: ${initialServices.length} servicios leídos en Neon.`);

    // 2. CREATE
    const testCode = "TEST-NEON-" + Math.floor(1000 + Math.random() * 9000);
    console.log(`2. Probando CREATE en Neon con código ${testCode}...`);
    const created = await prisma.workshopService.create({
      data: {
        code: testCode,
        name: "Servicio de Prueba Neon CRUD",
        category: "Diagnóstico",
        price: 29.99,
        estimatedMinutes: 25,
        description: "Servicio temporal para verificar conexión real a Neon.",
        requiresBay: false,
        active: true
      }
    });
    console.log(`   -> Éxito: Servicio creado con ID: ${created.id}`);

    // 3. UPDATE
    console.log("3. Probando UPDATE en Neon...");
    const updated = await prisma.workshopService.update({
      where: { id: created.id },
      data: {
        name: "Servicio de Prueba Neon CRUD (Actualizado)",
        price: 35.00
      }
    });
    console.log(`   -> Éxito: Actualizado nombre a "${updated.name}" y precio a $${updated.price}`);

    // 4. DELETE
    console.log("4. Probando DELETE en Neon...");
    await prisma.workshopService.delete({
      where: { id: created.id }
    });
    console.log(`   -> Éxito: Servicio de prueba eliminado correctamente.`);

    console.log("=== CONCLUSIÓN: LA BASE DE DATOS NEON ADMITE EL CRUD COMPLETO AL 100% ===");
  } catch (err) {
    console.error("ERROR EN CRUD NEON:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testCrud();
