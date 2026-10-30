import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Cloudflare Workers keep modules alive between requests but isolate async I/O
// to the originating request context. Reusing a global Prisma/Neon connection
// across requests can hang or raise "different request context" errors.
// Construct clients lazily inside the request that performs the database I/O.
export function db(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString })
  });
}
