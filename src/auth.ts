import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import type { Adapter } from "next-auth/adapters";

// Auth.js is initialized once per Worker isolate, but a Prisma/Neon client
// cannot safely be reused across Cloudflare request contexts. Preserve every
// PrismaAdapter method while creating the real client only when the method
// is invoked by an actual request.
function scopedAdapter(): Adapter {
  const methods = PrismaAdapter({} as ReturnType<typeof db>);
  return Object.fromEntries(
    Object.keys(methods).map((key) => [key, (...args: unknown[]) => {
      const current = PrismaAdapter(db()) as unknown as Record<string, (...input: unknown[]) => unknown>;
      const operation = current[key];
      if (typeof operation !== "function") throw new Error("Auth adapter method unavailable");
      return operation(...args);
    }])
  ) as Adapter;
}


export const authReady = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.DATABASE_URL &&
  (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)
);

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(email.toLowerCase());
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
  adapter: authReady ? scopedAdapter() : undefined,
  session: {
    strategy: authReady ? "database" : "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  providers: authReady ? [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly",
          access_type: "offline",
          prompt: "consent"
        }
      }
    })
  ] : [],
  pages: { signIn: "/" }
});
