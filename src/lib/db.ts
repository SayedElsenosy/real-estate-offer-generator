import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

const cache = globalThis as unknown as { offerPrisma?: PrismaClient };
export function db(): PrismaClient {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!cache.offerPrisma) {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
    cache.offerPrisma = new PrismaClient({ adapter });
  }
  return cache.offerPrisma;
}
