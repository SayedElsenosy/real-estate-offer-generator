import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, authReady, isAdmin } from "@/auth";
import { db } from "@/lib/db";
import AdminPanel from "@/components/AdminPanel";
import { CAIRO_PLAZA_PROJECT_ID, hasAuthoritativeCairoDwgSource } from "@/lib/cairo-architectural-source";
import { T } from "@/components/LanguageProvider";
import { ShareLinkButton } from "@/components/ShareLinkButton";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  if (!authReady) redirect("/");
  const session = await auth();
  if (!session?.user?.email) redirect("/");
  if (!isAdmin(session.user.email)) return <main style={{padding:40}}><h1><T text="Administrator access required" /></h1><p><T text="Only authorized administrators can configure inventory sources and payment plans." /></p><Link href="/studio"><T text="Back to Studio" /></Link></main>;
  const projects = await db().project.findMany({ include: { paymentPlans: true, floorPlans: true }, orderBy: { name: "asc" } });
  const safeProjects = projects.map(project => project.id === CAIRO_PLAZA_PROJECT_ID
    ? {...project, floorPlans: project.floorPlans.map(f => hasAuthoritativeCairoDwgSource(f) ? f
        : {...f, shapes: [], markers: [], backgroundData: null, reviewStatus: "DRAFT"})}
    : project);
  return <><div style={{padding:"18px 28px",background:"#f6f8fb",color:"#172b47"}}><strong>رابط الدخول الخاص من أي جهاز</strong><p>يمكن مشاركة الرابط للدخول إلى الاستوديو والمخططات بدون حساب Google، ولا يمنح صلاحية الإدارة.</p><ShareLinkButton /></div><AdminPanel email={session.user.email} projects={JSON.parse(JSON.stringify(safeProjects))} /></>;
}
