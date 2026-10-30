import { auth, authReady, isAdmin } from "@/auth";
import { db } from "@/lib/db";
import { hasSharedAccess, sharedOwnerEmail } from "@/lib/shared-access";

// Check a valid private-link cookie first. The shared flow does not require
// running Auth.js or its Prisma session adapter on every 10-second inventory
// poll, substantially reducing CPU use on Cloudflare Workers Free.
export async function currentUserWithAccess() {
  if (await hasSharedAccess()) {
    const email = sharedOwnerEmail();
    if (email) {
      const user = await db().user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } }
      });
      if (user) return { user, shared: true };
    }
  }
  if (authReady) {
    const session = await auth();
    if (session?.user?.email) {
      const user = await db().user.findUnique({
        where: { email: session.user.email }
      });
      if (user) return { user, shared: false };
    }
  }
  return null;
}

export async function currentUser() {
  const access = await currentUserWithAccess();
  return access?.user ?? null;
}

export async function currentAdmin() {
  // Never elevate a private-link holder to admin: only a genuine Google
  // OAuth database session qualifies for configuration writes.
  if (!authReady) return null;
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) return null;
  return db().user.findUnique({ where: { email: session.user.email } });
}
