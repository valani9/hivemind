import { PrismaClient } from "@prisma/client";
import { neonConfig } from "@neondatabase/serverless";

// For serverless environments (Vercel), use Neon's websocket driver
if (process.env.VERCEL) {
  neonConfig.useSecureWebSocket = true;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    // Return a proxy that throws a clear error when any method is called
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error("DATABASE_URL is not set. Please configure your database connection.");
      },
    });
  }
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db as PrismaClient;
