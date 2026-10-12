import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma && (!(globalForPrisma.prisma as any).product || !(globalForPrisma.prisma as any).workshopService || !(globalForPrisma.prisma as any).vehicle)) {
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
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    return (client as any)[prop];
  },
});

export default prisma;
