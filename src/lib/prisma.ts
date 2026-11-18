import "server-only";
import { PrismaClient } from "@prisma/client";

// Asegurar conexión a la base de datos real Neon en toda la aplicación
// Validar variables DATABASE_URL / DIRECT_URL desde entorno sin credenciales embebidas
if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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

function getRawPrisma(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    (!(globalForPrisma.prisma as any).product ||
      !(globalForPrisma.prisma as any).workshopService ||
      !(globalForPrisma.prisma as any).vehicle ||
      !(globalForPrisma.prisma as any).companyConfig ||
      !(globalForPrisma.prisma as any).managementTask)
  ) {
    try {
      globalForPrisma.prisma.$disconnect();
    } catch {}
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    if (process.env.NODE_ENV !== "production") {
      try {
        Object.keys(require.cache).forEach((key) => {
          if (key.includes("prisma")) {
            delete require.cache[key];
          }
        });
      } catch {}
    }

    const { PrismaClient: FreshClient } = require("@prisma/client");
    globalForPrisma.prisma = new FreshClient({
      log: ["error"],
    });
  }

  return globalForPrisma.prisma as PrismaClient;
}

export function getNeonPrismaClient(): PrismaClient {
  return getRawPrisma();
}

async function runDirectNeon<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [400, 1200];
  let lastErr: any;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (!isNeonConnectionOrQuotaError(err) || attempt === delays.length) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}

function createModelProxy(modelName: string) {
  return new Proxy(
    {},
    {
      get(_target, methodProp) {
        const method = String(methodProp);
        return async (args?: any) => {
          return runDirectNeon(async () => {
            const rawClient = getRawPrisma() as any;
            if (!rawClient[modelName] || typeof rawClient[modelName][method] !== "function") {
              throw new Error(`Método Prisma inválido: ${modelName}.${method}`);
            }
            return await rawClient[modelName][method](args);
          });
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
        if (Array.isArray(fnOrArray) || typeof fnOrArray === "function") {
          return runDirectNeon(async () => {
            const rawClient = getRawPrisma();
            return await rawClient.$transaction(fnOrArray, options);
          });
        }
        return null;
      };
    }

    if (key === "$executeRawUnsafe" || key === "$executeRaw") {
      return async (...args: any[]) => {
        return runDirectNeon(async () => {
          const rawClient = getRawPrisma() as any;
          return await rawClient[key](...args);
        });
      };
    }

    if (key === "$queryRawUnsafe" || key === "$queryRaw") {
      return async (...args: any[]) => {
        return runDirectNeon(async () => {
          const rawClient = getRawPrisma() as any;
          return await rawClient[key](...args);
        });
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
      if (i < retries) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
}

export default prisma;
