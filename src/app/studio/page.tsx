import { redirect } from "next/navigation";
import { currentUser } from "@/lib/guards";
import { hasSharedAccess } from "@/lib/shared-access";
import { db } from "@/lib/db";
import Studio from "@/components/Studio";
export const dynamic = "force-dynamic";
export default async function StudioPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  const projects = await db().project.findMany({ select: {id:true,slug:true,name:true,paymentPlans:true}, orderBy: { name: "asc" } });
  return <Studio projects={JSON.parse(JSON.stringify(projects))}
    email={(await hasSharedAccess()) ? "Private link access" : (user.email || "")} />;
}
