import { redirect } from "next/navigation";
import { auth, authReady } from "@/auth";
import { db } from "@/lib/db";
import ArchitecturalPlan from "@/components/ArchitecturalPlan";
export const dynamic = "force-dynamic";
export default async function PlansPage() {
  if (!authReady) redirect("/");
  const session = await auth();
  if (!session?.user?.email) redirect("/");
  const projects = await db().project.findMany({
    select: { id: true, name: true }, orderBy: { name: "asc" }
  });
  return <ArchitecturalPlan email={session.user.email} projects={projects}/>;
}
