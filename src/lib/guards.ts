import { auth, authReady, isAdmin } from "@/auth";
import { db } from "@/lib/db";
import { hasSharedAccess, sharedOwnerEmail } from "@/lib/shared-access";

export async function currentUser() {
  if (authReady) {
    const session = await auth();
    if (session?.user?.email) {
      return db().user.findUnique({ where: { email: session.user.email } });
    }
  }
  // Holders of the private link can *use* the owner's existing Drive/Sheets
  // OAuth grant through server-side code. Credentials are never sent to clients.
  if (!(await hasSharedAccess())) return null;
  const email = sharedOwnerEmail();
  if (!email) return null;
  return db().user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } }
  });
}

export async function currentAdmin() {
  // Never elevate a private-link holder to admin: only a genuine Google
  // OAuth database session qualifies for configuration writes.
  if (!authReady) return null;
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) return null;
  return db().user.findUnique({ where: { email: session.user.email } });
}
