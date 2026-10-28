import { redirect } from "next/navigation";
import { auth, authReady } from "@/auth";
import ArchitecturalPlan from "@/components/ArchitecturalPlan";
export const dynamic = "force-dynamic";
export default async function PlansPage() {
  if (!authReady) redirect("/");
  const session = await auth();
  if (!session?.user?.email) redirect("/");
  return <ArchitecturalPlan email={session.user.email}/>;
}
