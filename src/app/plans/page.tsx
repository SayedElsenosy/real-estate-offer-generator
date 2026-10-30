import { redirect } from "next/navigation";
import { currentUser } from "@/lib/guards";
import { hasSharedAccess } from "@/lib/shared-access";
import { db } from "@/lib/db";
import ArchitecturalPlan from "@/components/ArchitecturalPlan";
export const dynamic = "force-dynamic";
export default async function PlansPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  const projects = await db().project.findMany({
    select: { id: true, name: true }, orderBy: { name: "asc" }
  });
  return <ArchitecturalPlan
    email={(await hasSharedAccess()) ? "Private link access" : (user.email || "")}
    projects={projects}/>;
}
