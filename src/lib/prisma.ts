import "server-only";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  neonCircuitOpenUntil?: number;
  mirrorDb?: Record<string, any[]>;
};

const MIRROR_FILE_PATH = path.join(process.cwd(), "prisma", "neon-local-mirror.json");
const CIRCUIT_BREAKER_TTL_MS = 300000; // 5 minutos para evitar bloqueos continuos cuando Neon no responde

const MODEL_DEFAULTS: Record<string, () => Record<string, any>> = {
  workshopOrder: () => ({
    mechanic: "Carlos Rodríguez",
    status: "En Diagnóstico",
    progress: 25,
    fuelLevel: "1/2",
    generalCondition: "Bueno",
    receptionInventoryJson: "[]",
    inspectionFindingsJson: "[]",
    inspectionChecklistJson: "{}",
    itemsJson: "[]",
    receptionPhotosJson: "[]",
    evidencePhotosJson: "[]",
    voiceNotesJson: "[]",
    dateIn: new Date().toISOString(),
    durationMinutes: 0,
    estimatedOut: "24 Horas",
    quoteStatus: "Borrador",
    quoteTaxRate: 15,
    quoteDiscount: 0,
    quoteDiscountType: "PERCENT",
    assignedTechniciansJson: "[]",
    internalChatJson: "[]",
    technicianHoursJson: "[]",
    statusColor: "amber",
    trackingPin: "4821",
    customStatusesJson: "[]",
    statusHistoryJson: "[]",
    deliveryChecklistJson: "{}",
    deliveryStatus: "Pendiente de Firma",
    paymentsJson: "[]",
    stockDeducted: false,
    branch: "PRINCIPAL",
  }),
  workshopService: () => ({
    category: "Mantenimiento Rápido",
    specialty: "taller",
    price: 25,
    estimatedMinutes: 30,
    requiresBay: true,
    active: true,
  }),
  product: () => ({
    category: "General",
    price: 0,
    stock: 10,
    stockNorte: 10,
    minStock: 5,
    status: "En Stock",
  }),
  customer: () => ({
    type: "Personal",
    vip: false,
    branch: "PRINCIPAL",
    assignedToSucursal: false,
    lastVisit: new Date().toISOString(),
  }),
  vehicle: () => ({
    vehicleType: "Auto",
    photosJson: "[]",
    fuelType: "Gasolina",
  }),
  employee: () => ({
    department: "TALLER",
    location: "Sede Principal",
    lastLogin: "Hoy",
    status: "Activo",
  }),
  clientQuote: () => ({
    clientName: "Juan Pérez",
    status: "Pendiente",
    itemsJson: "[]",
    subtotal: 0,
    total: 0,
  }),
  clientAppointment: () => ({
    clientName: "Juan Pérez",
    status: "Programada",
    tech: "Carlos Ruiz",
    bay: "Bahía 1",
  }),
  posPromotion: () => ({
    discountType: "PERCENT",
    discountValue: 10,
    minPurchase: 0,
    category: "General",
    active: true,
    usesCount: 0,
  }),
  systemSetting: () => ({
    configJson: "{}",
  }),
};

function generateCuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function getInitialSeedMirror(): Record<string, any[]> {
  return {
    customer: [],
    vehicle: [],
    workshopOrder: [],
    employee: [],
    workshopService: [],
    product: [],
    systemSetting: [],
    clientQuote: [],
    clientAppointment: [],
    posPromotion: [],
    workshopHistory: [],
    workshopEvidence: [],
    orderRequest: [],
    user: [],
    cashRegister: [],
    sale: [],
    clientInvoice: [],
    auditLog: [],
  };
}

let lastMirrorMtime = 0;

function loadMirrorDb(): Record<string, any[]> {
  try {
    if (fs.existsSync(MIRROR_FILE_PATH)) {
      const stat = fs.statSync(MIRROR_FILE_PATH);
      if (!globalForPrisma.mirrorDb || stat.mtimeMs !== lastMirrorMtime) {
        const raw = fs.readFileSync(MIRROR_FILE_PATH, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          globalForPrisma.mirrorDb = parsed;
          lastMirrorMtime = stat.mtimeMs;
          return parsed;
        }
      } else {
        return globalForPrisma.mirrorDb;
      }
    }
  } catch {}
  if (globalForPrisma.mirrorDb) {
    return globalForPrisma.mirrorDb;
  }
  const initial = getInitialSeedMirror();
  globalForPrisma.mirrorDb = initial;
  saveMirrorDb(initial);
  return initial;
}

function saveMirrorDb(db?: Record<string, any[]>) {
  const target = db || globalForPrisma.mirrorDb;
  if (!target) return;
  try {
    const dir = path.dirname(MIRROR_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const raw = JSON.stringify(target, null, 2);
    fs.writeFileSync(MIRROR_FILE_PATH, raw, "utf8");
    const stat = fs.statSync(MIRROR_FILE_PATH);
    lastMirrorMtime = stat.mtimeMs;
  } catch {}
}

function isNeonConnectionOrQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err || "");
  const code = String(err.code || err.errorCode || "");
  return (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1008" ||
    code === "P1017" ||
    code === "53000" ||
    err.name === "PrismaClientInitializationError" ||
    msg.includes("Can't reach database server") ||
    msg.includes("exceeded the quota") ||
    msg.includes("Timed out fetching a new connection") ||
    msg.includes("Connection closed") ||
    msg.includes("Server has closed the connection")
  );
}

function matchesWhere(row: any, where: any): boolean {
  if (!where || typeof where !== "object") return true;

  for (const [key, cond] of Object.entries(where)) {
    if (cond === undefined) continue;

    if (key === "AND") {
      const arr = Array.isArray(cond) ? cond : [cond];
      if (!arr.every((c) => matchesWhere(row, c))) return false;
      continue;
    }
    if (key === "OR") {
      const arr = Array.isArray(cond) ? cond : [cond];
      if (!arr.some((c) => matchesWhere(row, c))) return false;
      continue;
    }
    if (key === "NOT") {
      const arr = Array.isArray(cond) ? cond : [cond];
      if (arr.some((c) => matchesWhere(row, c))) return false;
      continue;
    }

    const val = row[key];

    if (cond === null) {
      if (val !== null && val !== undefined) return false;
      continue;
    }

    if (typeof cond === "object" && !(cond instanceof Date) && !Array.isArray(cond)) {
      const modeInsensitive = (cond as any).mode === "insensitive";
      const norm = (v: any) =>
        modeInsensitive && typeof v === "string" ? v.toLowerCase() : v;

      if ("equals" in cond && cond.equals !== undefined) {
        if (norm(val) !== norm((cond as any).equals)) return false;
      }
      if ("not" in cond && (cond as any).not !== undefined) {
        if (norm(val) === norm((cond as any).not)) return false;
      }
      if ("in" in cond && Array.isArray((cond as any).in)) {
        const list = (cond as any).in.map(norm);
        if (!list.includes(norm(val))) return false;
      }
      if ("notIn" in cond && Array.isArray((cond as any).notIn)) {
        const list = (cond as any).notIn.map(norm);
        if (list.includes(norm(val))) return false;
      }
      if ("contains" in cond && (cond as any).contains !== undefined) {
        const hay = String(val ?? "");
        const needle = String((cond as any).contains ?? "");
        const match = modeInsensitive
          ? hay.toLowerCase().includes(needle.toLowerCase())
          : hay.includes(needle);
        if (!match) return false;
      }
      if ("startsWith" in cond && (cond as any).startsWith !== undefined) {
        const hay = String(val ?? "");
        const needle = String((cond as any).startsWith ?? "");
        const match = modeInsensitive
          ? hay.toLowerCase().startsWith(needle.toLowerCase())
          : hay.startsWith(needle);
        if (!match) return false;
      }
      if ("gt" in cond && !(val > (cond as any).gt)) return false;
      if ("gte" in cond && !(val >= (cond as any).gte)) return false;
      if ("lt" in cond && !(val < (cond as any).lt)) return false;
      if ("lte" in cond && !(val <= (cond as any).lte)) return false;
      continue;
    }

    if (val !== cond) return false;
  }

  return true;
}

function applyOrderBy(rows: any[], orderBy: any): any[] {
  if (!orderBy) return rows;
  const rules = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const rule of rules) {
      if (!rule || typeof rule !== "object") continue;
      for (const [field, dir] of Object.entries(rule)) {
        const av = a[field];
        const bv = b[field];
        if (av === bv) continue;
        const cmp = av > bv ? 1 : -1;
        return String(dir).toLowerCase() === "desc" ? -cmp : cmp;
      }
    }
    return 0;
  });
}

function attachRelationsAndSelect(
  modelName: string,
  row: any,
  args: any,
  db: Record<string, any[]>
): any {
  if (!row) return row;
  let result = { ...row };

  const include = args?.include;
  if (include && typeof include === "object") {
    if (modelName === "customer") {
      if (include.vehicles) {
        let vehs = (db.vehicle || []).filter((v) => v.customerId === row.id);
        if (typeof include.vehicles === "object" && include.vehicles.orderBy) {
          vehs = applyOrderBy(vehs, include.vehicles.orderBy);
        }
        result.vehicles = vehs;
      }
      if (include.workshopOrders) {
        let ords = (db.workshopOrder || []).filter((o) => o.customerId === row.id);
        if (typeof include.workshopOrders === "object") {
          if (include.workshopOrders.orderBy) {
            ords = applyOrderBy(ords, include.workshopOrders.orderBy);
          }
          if (include.workshopOrders.take) {
            ords = ords.slice(0, include.workshopOrders.take);
          }
        }
        result.workshopOrders = ords;
      }
    } else if (modelName === "vehicle") {
      if (include.customer) {
        result.customer = (db.customer || []).find((c) => c.id === row.customerId) || null;
      }
    } else if (modelName === "workshopOrder") {
      if (include.customer) {
        const cust = (db.customer || []).find((c) => c.id === row.customerId) || null;
        result.customer = cust
          ? attachRelationsAndSelect("customer", cust, include.customer, db)
          : null;
      }
      if (include.vehicleRef) {
        result.vehicleRef = (db.vehicle || []).find((v) => v.id === row.vehicleId) || null;
      }
      if (include.evidences) {
        result.evidences = (db.workshopEvidence || []).filter((e) => e.orderId === row.id);
      }
    }
  }

  const select = args?.select;
  if (select && typeof select === "object") {
    const picked: Record<string, any> = {};
    for (const [k, v] of Object.entries(select)) {
      if (v) picked[k] = result[k];
    }
    return picked;
  }

  return result;
}

function executeMirrorOperation(modelName: string, method: string, args: any = {}): any {
  const db = loadMirrorDb();
  if (!db[modelName]) {
    db[modelName] = [];
  }
  const table = db[modelName];

  switch (method) {
    case "findMany": {
      let rows = table.filter((r) => matchesWhere(r, args?.where));
      if (args?.orderBy) rows = applyOrderBy(rows, args.orderBy);
      if (typeof args?.skip === "number" && args.skip > 0) rows = rows.slice(args.skip);
      if (typeof args?.take === "number" && args.take >= 0) rows = rows.slice(0, args.take);
      return rows.map((r) => attachRelationsAndSelect(modelName, r, args, db));
    }

    case "findUnique":
    case "findFirst": {
      let rows = table.filter((r) => matchesWhere(r, args?.where));
      if (args?.orderBy) rows = applyOrderBy(rows, args.orderBy);
      const found = rows[0] || null;
      return found ? attachRelationsAndSelect(modelName, found, args, db) : null;
    }

    case "count": {
      const rows = table.filter((r) => matchesWhere(r, args?.where));
      return rows.length;
    }

    case "create": {
      const nowIso = new Date().toISOString();
      const defaults = MODEL_DEFAULTS[modelName]?.() || {};
      const rawData = { ...(args?.data || {}) };

      // Handle nested relations (e.g., customer.create with vehicles.create)
      const nestedVehicles = rawData.vehicles?.create;
      delete rawData.vehicles;
      delete rawData.customer;
      delete rawData.vehicleRef;
      delete rawData.evidences;

      const newRecord: Record<string, any> = {
        id: rawData.id || generateCuid(),
        ...defaults,
        ...rawData,
        createdAt: rawData.createdAt || nowIso,
        updatedAt: rawData.updatedAt || nowIso,
      };

      table.push(newRecord);

      if (modelName === "customer" && nestedVehicles) {
        const vehList = Array.isArray(nestedVehicles) ? nestedVehicles : [nestedVehicles];
        for (const vData of vehList) {
          executeMirrorOperation("vehicle", "create", {
            data: { ...vData, customerId: newRecord.id },
          });
        }
      }

      saveMirrorDb(db);
      return attachRelationsAndSelect(modelName, newRecord, args, db);
    }

    case "update": {
      const idx = table.findIndex((r) => matchesWhere(r, args?.where));
      if (idx === -1) {
        // If updating a record not yet in mirror, create it gracefully
        return executeMirrorOperation(modelName, "create", {
          data: { ...(args?.where || {}), ...(args?.data || {}) },
          include: args?.include,
          select: args?.select,
        });
      }
      const existing = table[idx];
      const rawData = { ...(args?.data || {}) };
      const updated: Record<string, any> = { ...existing };

      for (const [k, v] of Object.entries(rawData)) {
        if (v === undefined) continue;
        if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
          if ("increment" in v) {
            updated[k] = Number(existing[k] || 0) + Number((v as any).increment || 0);
            continue;
          }
          if ("decrement" in v) {
            updated[k] = Number(existing[k] || 0) - Number((v as any).decrement || 0);
            continue;
          }
        }
        updated[k] = v;
      }
      updated.updatedAt = new Date().toISOString();
      table[idx] = updated;
      saveMirrorDb(db);
      return attachRelationsAndSelect(modelName, updated, args, db);
    }

    case "updateMany": {
      let count = 0;
      const nowIso = new Date().toISOString();
      for (let i = 0; i < table.length; i++) {
        if (matchesWhere(table[i], args?.where)) {
          table[i] = {
            ...table[i],
            ...(args?.data || {}),
            updatedAt: nowIso,
          };
          count++;
        }
      }
      if (count > 0) saveMirrorDb(db);
      return { count };
    }

    case "upsert": {
      const idx = table.findIndex((r) => matchesWhere(r, args?.where));
      if (idx !== -1) {
        return executeMirrorOperation(modelName, "update", {
          where: args.where,
          data: args.update || {},
          include: args.include,
          select: args.select,
        });
      }
      return executeMirrorOperation(modelName, "create", {
        data: { ...(args?.where || {}), ...(args?.create || {}) },
        include: args.include,
        select: args.select,
      });
    }

    case "delete": {
      const idx = table.findIndex((r) => matchesWhere(r, args?.where));
      if (idx === -1) return null;
      const [removed] = table.splice(idx, 1);
      saveMirrorDb(db);
      return removed;
    }

    case "deleteMany": {
      const before = table.length;
      db[modelName] = table.filter((r) => !matchesWhere(r, args?.where));
      const count = before - db[modelName].length;
      if (count > 0) saveMirrorDb(db);
      return { count };
    }

    default:
      return null;
  }
}

function sqlTableToModelName(tableName: string): string {
  if (!tableName) return "";
  return tableName.charAt(0).toLowerCase() + tableName.slice(1);
}

function executeMirrorRawQuery(queryOrStrings: any, params: any[] = []): any[] {
  const sql = typeof queryOrStrings === "string" ? queryOrStrings : Array.isArray(queryOrStrings) ? queryOrStrings.join("?") : "";
  if (!sql) return [];
  const db = loadMirrorDb();

  const fromMatch = sql.match(/FROM\s+"?([A-Za-z0-9_]+)"?/i);
  if (!fromMatch) return [];
  const modelName = sqlTableToModelName(fromMatch[1]);
  const rows = [...(db[modelName] || [])];

  const distinctMatch = sql.match(/SELECT\s+DISTINCT\s+"?([A-Za-z0-9_]+)"?/i);
  if (distinctMatch) {
    const col = distinctMatch[1];
    const seen = new Set();
    const result: any[] = [];
    for (const r of rows) {
      const val = r[col];
      if (val !== undefined && val !== null && !seen.has(val)) {
        seen.add(val);
        result.push({ [col]: val });
      }
    }
    return result;
  }

  // Filter by $1 if WHERE "id" = $1 or UPPER("plate") = $1
  if (params.length > 0 && params[0] !== undefined) {
    const p1 = String(params[0]);
    if (/WHERE\s+"?id"?\s*=\s*\$1/i.test(sql)) {
      return rows.filter((r) => String(r.id) === p1);
    }
    if (/WHERE\s+UPPER\("?plate"?\)\s*=\s*\$1/i.test(sql)) {
      return rows.filter((r) => String(r.plate || "").toUpperCase() === p1.toUpperCase());
    }
  }

  if (modelName === "workshopOrder" && /NOT\s+IN/i.test(sql)) {
    const excluded = new Set([
      "Entregado",
      "ENTREGADO",
      "05 Entregada",
      "Entregada",
      "Finalizado",
      "FINALIZADO",
      "Terminado",
      "TERMINADO",
      "Historial",
      "HISTORIAL",
      "Cancelado",
      "CANCELADO",
    ]);
    return rows
      .filter((r) => !excluded.has(String(r.status || "")))
      .sort((a, b) => (String(a.updatedAt || "") < String(b.updatedAt || "") ? 1 : -1));
  }

  if (modelName === "workshopService" && /"active"\s*=\s*true/i.test(sql)) {
    return rows.filter((r) => r.active !== false);
  }

  if (modelName === "employee" && /"status"\s*=\s*'Activo'/i.test(sql)) {
    return rows.filter((r) => (r.status || "Activo") === "Activo");
  }

  return rows;
}

function executeMirrorRawExecute(queryOrStrings: any, params: any[] = []): number {
  const sql = typeof queryOrStrings === "string" ? queryOrStrings : Array.isArray(queryOrStrings) ? queryOrStrings.join("?") : "";
  if (!sql) return 0;
  const db = loadMirrorDb();

  // Handle INSERT INTO "WorkshopOrder" (...) VALUES ($1, $2, ...)
  if (/INSERT\s+INTO\s+"?WorkshopOrder"?/i.test(sql)) {
    const colsMatch = sql.match(/INSERT\s+INTO\s+"?WorkshopOrder"?\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)/i);
    if (colsMatch) {
      const cols = colsMatch[1]
        .split(",")
        .map((c) => c.replace(/["\s\r\n]/g, ""))
        .filter(Boolean);
      const valTokens = colsMatch[2]
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      const nowIso = new Date().toISOString();
      const record: Record<string, any> = {
        ...MODEL_DEFAULTS.workshopOrder(),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      cols.forEach((col, i) => {
        const tok = valTokens[i] || "";
        const pMatch = tok.match(/^\$(\d+)$/);
        if (pMatch) {
          const pIdx = parseInt(pMatch[1], 10) - 1;
          record[col] = params[pIdx];
        } else if (/^NOW\(\)$/i.test(tok)) {
          record[col] = nowIso;
        } else if (/^'[\s\S]*'$/.test(tok)) {
          record[col] = tok.slice(1, -1);
        } else if (!isNaN(Number(tok))) {
          record[col] = Number(tok);
        }
      });

      if (!db.workshopOrder) db.workshopOrder = [];
      db.workshopOrder.unshift(record);
      saveMirrorDb(db);
      return 1;
    }
  }

  // Handle UPDATE "Table" SET ... WHERE "id" = $N
  const updateMatch = sql.match(/UPDATE\s+"?([A-Za-z0-9_]+)"?\s+SET\s+([\s\S]*?)\s+WHERE\s+([\s\S]+)$/i);
  if (updateMatch) {
    const modelName = sqlTableToModelName(updateMatch[1]);
    const setPart = updateMatch[2];
    const wherePart = updateMatch[3];
    const table = db[modelName] || [];

    const whereParamMatch = wherePart.match(/\$(\d+)/);
    if (whereParamMatch) {
      const targetVal = params[parseInt(whereParamMatch[1], 10) - 1];
      const idx = table.findIndex((r) => r.id === targetVal || r.orderNumber === targetVal || r.plate === targetVal);
      if (idx !== -1) {
        const updated = { ...table[idx], updatedAt: new Date().toISOString() };
        const assignments = setPart.split(",");
        for (const assign of assignments) {
          const m = assign.match(/"?([A-Za-z0-9_]+)"?\s*=\s*(?:COALESCE\([^,]+,\s*)?\$(\d+)/i);
          if (m) {
            const col = m[1];
            const val = params[parseInt(m[2], 10) - 1];
            if (val !== undefined) updated[col] = val;
          }
        }
        table[idx] = updated;
        saveMirrorDb(db);
        return 1;
      }
    }
  }

  return 0;
}

function syncNeonResultToMirror(modelName: string, method: string, result: any, args: any) {
  if (!result) return;
  try {
    const db = loadMirrorDb();
    if (!db[modelName]) db[modelName] = [];
    const table = db[modelName];

    const upsertRow = (row: any) => {
      if (!row || typeof row !== "object" || !row.id) return;
      const idx = table.findIndex((r) => r.id === row.id);
      if (idx !== -1) {
        table[idx] = { ...table[idx], ...row };
      } else {
        table.push({ ...row });
      }
    };

    if (method === "findMany" && Array.isArray(result)) {
      result.forEach(upsertRow);
    } else if (
      (method === "findUnique" ||
        method === "findFirst" ||
        method === "create" ||
        method === "update" ||
        method === "upsert") &&
      typeof result === "object"
    ) {
      upsertRow(result);
      saveMirrorDb(db);
    } else if (method === "delete" && args?.where) {
      const idx = table.findIndex((r) => matchesWhere(r, args.where));
      if (idx !== -1) {
        table.splice(idx, 1);
        saveMirrorDb(db);
      }
    }
  } catch {}
}

function getRawPrisma(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    (!(globalForPrisma.prisma as any).product ||
      !(globalForPrisma.prisma as any).workshopService ||
      !(globalForPrisma.prisma as any).vehicle)
  ) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch {}
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    try {
      Object.keys(require.cache).forEach((key) => {
        if (key.includes("prisma")) {
          delete require.cache[key];
        }
      });
    } catch {}

    const { PrismaClient: FreshClient } = require("@prisma/client");
    globalForPrisma.prisma = new FreshClient({
      log: ["error"],
    });
  }

  return globalForPrisma.prisma as PrismaClient;
}

function createModelProxy(modelName: string) {
  return new Proxy(
    {},
    {
      get(_target, methodProp) {
        const method = String(methodProp);
        return async (args?: any) => {
          const now = Date.now();
          const circuitOpen =
            globalForPrisma.neonCircuitOpenUntil && now < globalForPrisma.neonCircuitOpenUntil;

          if (!circuitOpen) {
            try {
              const rawClient = getRawPrisma() as any;
              if (rawClient[modelName] && typeof rawClient[modelName][method] === "function") {
                const res = await rawClient[modelName][method](args);
                syncNeonResultToMirror(modelName, method, res, args);
                return res;
              }
            } catch (err: any) {
              globalForPrisma.neonCircuitOpenUntil = Date.now() + CIRCUIT_BREAKER_TTL_MS;
              return executeMirrorOperation(modelName, method, args);
            }
          }

          return executeMirrorOperation(modelName, method, args);
        };
      },
    }
  );
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const key = String(prop);

    if (key === "$transaction") {
      return async (fnOrArray: any, options?: any) => {
        if (Array.isArray(fnOrArray)) {
          return Promise.all(fnOrArray);
        }
        if (typeof fnOrArray === "function") {
          const now = Date.now();
          const circuitOpen =
            globalForPrisma.neonCircuitOpenUntil && now < globalForPrisma.neonCircuitOpenUntil;
          if (!circuitOpen) {
            try {
              const rawClient = getRawPrisma();
              return await rawClient.$transaction(fnOrArray, options);
            } catch (err: any) {
              if (isNeonConnectionOrQuotaError(err)) {
                globalForPrisma.neonCircuitOpenUntil = Date.now() + CIRCUIT_BREAKER_TTL_MS;
                return await fnOrArray(prisma);
              }
              throw err;
            }
          }
          return await fnOrArray(prisma);
        }
        return null;
      };
    }

    if (key === "$executeRawUnsafe" || key === "$executeRaw") {
      return async (...args: any[]) => {
        const now = Date.now();
        if (globalForPrisma.neonCircuitOpenUntil && now < globalForPrisma.neonCircuitOpenUntil) {
          return executeMirrorRawExecute(args[0], args.slice(1));
        }
        try {
          const rawClient = getRawPrisma() as any;
          return await rawClient[key](...args);
        } catch (err: any) {
          if (isNeonConnectionOrQuotaError(err)) {
            globalForPrisma.neonCircuitOpenUntil = Date.now() + CIRCUIT_BREAKER_TTL_MS;
            return executeMirrorRawExecute(args[0], args.slice(1));
          }
          throw err;
        }
      };
    }

    if (key === "$queryRawUnsafe" || key === "$queryRaw") {
      return async (...args: any[]) => {
        const now = Date.now();
        if (globalForPrisma.neonCircuitOpenUntil && now < globalForPrisma.neonCircuitOpenUntil) {
          return executeMirrorRawQuery(args[0], args.slice(1));
        }
        try {
          const rawClient = getRawPrisma() as any;
          return await rawClient[key](...args);
        } catch (err: any) {
          if (isNeonConnectionOrQuotaError(err)) {
            globalForPrisma.neonCircuitOpenUntil = Date.now() + CIRCUIT_BREAKER_TTL_MS;
            return executeMirrorRawQuery(args[0], args.slice(1));
          }
          throw err;
        }
      };
    }

    if (key === "$connect" || key === "$disconnect") {
      return async () => {
        try {
          const rawClient = getRawPrisma() as any;
          await rawClient[key]();
        } catch {}
      };
    }

    if (key.startsWith("$") || key === "then") {
      return undefined;
    }

    return createModelProxy(key);
  },
});

export async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 300): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (isNeonConnectionOrQuotaError(err)) {
        globalForPrisma.neonCircuitOpenUntil = Date.now() + CIRCUIT_BREAKER_TTL_MS;
        try {
          return await fn();
        } catch (innerErr) {
          lastError = innerErr;
          break;
        }
      }
      if (i < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}

export default prisma;
