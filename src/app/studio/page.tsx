import { redirect } from "next/navigation";
import { auth, authReady } from "@/auth";
import { db } from "@/lib/db";
import Studio from "@/components/Studio";
export const dynamic = "force-dynamic";
export default async function StudioPage() {
  if (!authReady) redirect("/");
  const session = await auth();
  if (!session?.user?.email) redirect("/");
  const projects = await db().project.findMany({ include: { paymentPlans: true }, orderBy: { name: "asc" } });
  return <Studio projects={JSON.parse(JSON.stringify(projects))} email={session.user.email} />;
}
