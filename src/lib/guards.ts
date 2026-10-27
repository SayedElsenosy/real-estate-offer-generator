import { auth, authReady, isAdmin } from "@/auth";
import { db } from "@/lib/db";

export async function currentUser() {
  if (!authReady) return null;
  const session = await auth();
  if (!session?.user?.email) return null;
  return db().user.findUnique({ where: { email: session.user.email } });
}
export async function currentAdmin() {
  const user = await currentUser();
  return user && isAdmin(user.email) ? user : null;
}
