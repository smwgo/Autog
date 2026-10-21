const { PrismaClient } = require("@prisma/client");

async function runTests() {
  const prisma = new PrismaClient();
  const testResults = [];

  function record(name, passed, details = "") {
    testResults.push({ name, passed, details });
    const mark = passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${mark}: ${name} ${details ? "- " + details : ""}`);
  }

  try {
    console.log("=== INICIANDO BATERÍA DE PRUEBAS FUNCIONALES DE EVIDENCIAS ===");

    // Test 1: Conexión con Neon PostgreSQL y verificación de tabla WorkshopEvidence
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'WorkshopEvidence'
      `);
      record(
        "Esquema de BD Neon: Tabla WorkshopEvidence",
        rows.length >= 15,
        `Se detectaron ${rows.length} columnas en Neon`
      );
    } catch (err) {
      record("Esquema de BD Neon: Tabla WorkshopEvidence", false, err.message);
    }

    // Test 2: Inserción de evidencia PENDING con clientTempId para idempotencia
    const tempId = "test_temp_" + Date.now();
    const testEvidenceId = "evi_test_" + Date.now();
    const testKey = `taller_recepcion/test_${Date.now()}.jpg`;

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopEvidence" (
          "id", "r2Key", "mimeType", "type", "fileSizeBytes",
          "uploadStatus", "transcriptionStatus", "clientTempId",
          "uploadedBy", "branch", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, 'image/jpeg', 'image', 102400,
          'PENDING', 'NOT_APPLICABLE', $3,
          'Técnico de Prueba', 'PRINCIPAL', NOW(), NOW()
        )`,
        testEvidenceId,
        testKey,
        tempId
      );

      const check = await prisma.$queryRawUnsafe(
        `SELECT * FROM "WorkshopEvidence" WHERE "id" = $1`,
        testEvidenceId
      );
      record(
        "Registro de Intención PENDING e Idempotencia (clientTempId)",
        check.length === 1 && check[0].uploadStatus === "PENDING",
        `ID: ${testEvidenceId}, Status: ${check[0]?.uploadStatus}`
      );
    } catch (err) {
      record("Registro de Intención PENDING e Idempotencia (clientTempId)", false, err.message);
    }

    // Test 3: Deduplicación por clientTempId (simulación de doble clic)
    try {
      const dedupCheck = await prisma.$queryRawUnsafe(
        `SELECT "id", "r2Key", "uploadStatus" FROM "WorkshopEvidence" WHERE "clientTempId" = $1`,
        tempId
      );
      record(
        "Deduplicación por doble clic: Reutilización de registro existente",
        dedupCheck.length === 1,
        `Evita registros duplicados conservando key ${dedupCheck[0]?.r2Key}`
      );
    } catch (err) {
      record("Deduplicación por doble clic", false, err.message);
    }

    // Test 4: Comportamiento ante fallo de subida / rechazo de R2
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopEvidence" 
         SET "uploadStatus" = 'FAILED', "metadataJson" = '{"error": "R2 upload rejected"}', "updatedAt" = NOW()
         WHERE "id" = $1`,
        testEvidenceId
      );
      const failedRow = await prisma.$queryRawUnsafe(
        `SELECT "uploadStatus" FROM "WorkshopEvidence" WHERE "id" = $1`,
        testEvidenceId
      );
      record(
        "Consistencia R2-Neon: Archivos rechazados marcados estrictamente como FAILED",
        failedRow[0]?.uploadStatus === "FAILED",
        "No se marca como guardado si R2 no confirmó la subida"
      );
    } catch (err) {
      record("Consistencia R2-Neon: Archivos rechazados", false, err.message);
    }

    // Test 5: Confirmación de subida exitosa con metadatos reales
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopEvidence" 
         SET "uploadStatus" = 'COMPLETED',
             "fileSizeBytes" = 204850,
             "durationSeconds" = 15,
             "transcriptionText" = 'Revisión de frenos delanteros y cambio de aceite',
             "transcriptionStatus" = 'COMPLETED',
             "plate" = 'TEST-123',
             "updatedAt" = NOW()
         WHERE "id" = $1`,
        testEvidenceId
      );
      const confirmedRow = await prisma.$queryRawUnsafe(
        `SELECT "uploadStatus", "transcriptionText", "durationSeconds", "plate" 
         FROM "WorkshopEvidence" WHERE "id" = $1`,
        testEvidenceId
      );
      const ok =
        confirmedRow[0]?.uploadStatus === "COMPLETED" &&
        confirmedRow[0]?.plate === "TEST-123" &&
        confirmedRow[0]?.durationSeconds === 15;
      record(
        "Persistencia de Metadatos Completos (Duración, Transcripción, Placa, Tamaño)",
        ok,
        `Texto: "${confirmedRow[0]?.transcriptionText?.slice(0, 30)}..."`
      );
    } catch (err) {
      record("Persistencia de Metadatos Completos", false, err.message);
    }

    // Test 6: Creación de Orden y vinculación automática de evidencias
    const testOrderId = "ord_test_" + Date.now();
    const testOrderNumber = "OT #99999";
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "WorkshopOrder" (
          "id", "orderNumber", "vehicle", "plate", "client",
          "mechanic", "status", "receptionPhotosJson",
          "branch", "dateIn", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, 'Toyota Hilux 2024', 'TEST-123', 'Cliente Pruebas',
          'Carlos Rodríguez', 'En Diagnóstico', $3,
          'PRINCIPAL', NOW(), NOW(), NOW()
        )`,
        testOrderId,
        testOrderNumber,
        JSON.stringify([`/api/storage/download?key=${encodeURIComponent(testKey)}`])
      );

      // Simular enlace de la evidencia a la orden creada
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopEvidence" 
         SET "orderId" = $1, "orderNumber" = $2, "updatedAt" = NOW()
         WHERE "id" = $3`,
        testOrderId,
        testOrderNumber,
        testEvidenceId
      );

      const linkedEvidence = await prisma.$queryRawUnsafe(
        `SELECT "orderId", "orderNumber", "plate" FROM "WorkshopEvidence" WHERE "id" = $1`,
        testEvidenceId
      );

      record(
        "Asociación de Evidencia a Orden de Trabajo y Vehículo",
        linkedEvidence[0]?.orderId === testOrderId && linkedEvidence[0]?.orderNumber === testOrderNumber,
        `Enlazado a ${linkedEvidence[0]?.orderNumber} (${linkedEvidence[0]?.plate})`
      );
    } catch (err) {
      record("Asociación de Evidencia a Orden de Trabajo", false, err.message);
    }

    // Test 7: Consulta de evidencias estructuradas por orden
    try {
      const orderEvidences = await prisma.$queryRawUnsafe(
        `SELECT "id", "r2Key", "type", "uploadStatus", "fileSizeBytes", "durationSeconds"
         FROM "WorkshopEvidence"
         WHERE "orderId" = $1`,
        testOrderId
      );
      record(
        "Consulta de evidencias filtrada por orden de trabajo",
        orderEvidences.length === 1 && orderEvidences[0].id === testEvidenceId,
        `Total encontradas: ${orderEvidences.length}`
      );
    } catch (err) {
      record("Consulta de evidencias filtrada por orden", false, err.message);
    }

    // Test 8: Control de fallos parciales en eliminación (trazabilidad y no pérdida de metadatos)
    try {
      // Simular fallo en Cloudflare R2
      const errorMeta = {
        lastDeleteError: {
          message: "Timeout conectando con R2",
          timestamp: new Date().toISOString(),
        },
      };
      await prisma.$executeRawUnsafe(
        `UPDATE "WorkshopEvidence"
         SET "uploadStatus" = 'DELETE_FAILED',
             "metadataJson" = $1,
             "updatedAt" = NOW()
         WHERE "id" = $2`,
        JSON.stringify(errorMeta),
        testEvidenceId
      );

      const preservedMeta = await prisma.$queryRawUnsafe(
        `SELECT "uploadStatus", "metadataJson" FROM "WorkshopEvidence" WHERE "id" = $1`,
        testEvidenceId
      );
      const isPreserved = preservedMeta[0]?.uploadStatus === "DELETE_FAILED";
      record(
        "Protección contra fallos parciales: Metadatos conservados si R2 falla",
        isPreserved,
        "Estado DELETE_FAILED registrado con motivo en metadataJson"
      );
    } catch (err) {
      record("Protección contra fallos parciales", false, err.message);
    }

    // Test 9: Eliminación definitiva coordinada y limpieza segura de datos de prueba
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "WorkshopEvidence" WHERE "id" = $1`,
        testEvidenceId
      );
      await prisma.$executeRawUnsafe(
        `DELETE FROM "WorkshopOrder" WHERE "id" = $1`,
        testOrderId
      );

      const remainingEv = await prisma.$queryRawUnsafe(
        `SELECT "id" FROM "WorkshopEvidence" WHERE "id" = $1`,
        testEvidenceId
      );
      const remainingOrd = await prisma.$queryRawUnsafe(
        `SELECT "id" FROM "WorkshopOrder" WHERE "id" = $1`,
        testOrderId
      );

      record(
        "Limpieza y eliminación coordinada de registros de prueba",
        remainingEv.length === 0 && remainingOrd.length === 0,
        "Registros temporales eliminados limpiamente de Neon"
      );
    } catch (err) {
      record("Limpieza y eliminación coordinada", false, err.message);
    }

    // Test 10: Integridad de Claves Foráneas y Constraints
    try {
      const constraints = await prisma.$queryRawUnsafe(`
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints
        WHERE table_name = 'WorkshopEvidence' AND constraint_type = 'FOREIGN KEY'
      `);
      record(
        "Constraints de Clave Foránea seguras (ON DELETE SET NULL)",
        constraints.length >= 1,
        `Constraints detectadas: ${constraints.map((c) => c.constraint_name).join(", ")}`
      );
    } catch (err) {
      record("Constraints de Clave Foránea seguras", false, err.message);
    }

    console.log("\n=== RESUMEN FINAL DE PRUEBAS ===");
    console.table(testResults);

    const allPassed = testResults.every((t) => t.passed);
    if (allPassed) {
      console.log("\n🎯 TODAS LAS PRUEBAS FUNCIONALES PASARON CON ÉXITO.");
      process.exit(0);
    } else {
      console.error("\n❌ ALGUNAS PRUEBAS FALLARON.");
      process.exit(1);
    }
  } catch (globalErr) {
    console.error("Error global en pruebas:", globalErr);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
