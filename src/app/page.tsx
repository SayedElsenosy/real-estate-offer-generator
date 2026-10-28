import Link from "next/link";
import { auth, authReady, signIn, signOut } from "@/auth";
import { Sidebar } from "@/components/Sidebar";
import { hasSharedAccess } from "@/lib/shared-access";
import { T } from "@/components/LanguageProvider";

export const dynamic = "force-dynamic";
export default async function Home() {
  const session = authReady ? await auth() : null;
  const shared = await hasSharedAccess();
  return <div className="shell"><Sidebar active="home" email={shared ? "Private link access" : session?.user?.email} shared={shared} /><main className="main">
    <div className="header-line"><div><div className="eyebrow"><T text="OFFER MANAGEMENT PLATFORM / 2026" /></div><h1><T text="Make every offer exceptional." /></h1><p className="muted"><T text="Live inventory. Interactive floor locations. Flexible financial schedules. A premium proposal in minutes." /></p></div><div className="pill"><span className="dot" /> <T text="Independent workspace" /></div></div>
    <div className="metrics">
      <div className="metric"><div className="eyebrow"><T text="PROJECT PORTFOLIO" /></div><strong>05</strong><p className="muted">Cairo Plaza, Kawn, Nasa, Aqmar, Vida</p></div>
      <div className="metric"><div className="eyebrow"><T text="DATA CONNECTION" /></div><strong>Google Drive + Sheets</strong><p className="muted"><T text="Read-only private inventory" /></p></div>
      <div className="metric"><div className="eyebrow"><T text="PROPOSAL DELIVERY" /></div><strong>PDF</strong><p className="muted"><T text="Details, highlighted floor map, payment tables" /></p></div>
    </div>
    <div className="grid2">
      <section className="stack">
        <div className="info-card"><div className="eyebrow"><T text="PROPERTY OFFER STUDIO" /></div><h2><T text="A smarter way to present each property." /></h2><p><T text="From a single project overview to individual unit location and a precise installment table — all in one place." /></p>
          {(session || shared) ? <div className="actionline"><Link className="btn gold" href="/studio"><T text="Open Offer Studio" /></Link>{session ? <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="btn outline"><T text="Sign out" /></button></form> : null}</div> :
           authReady ? <form action={async () => { "use server"; await signIn("google", { redirectTo: "/studio" }); }}><button className="btn gold"><T text="Continue with Google" /></button></form> :
           <div className="notice"><T text="Google OAuth and Neon environment credentials have not been configured on this deployment. The application will enable sign-in after these are configured on the current deployment." /></div>}
        </div>
        <div className="panel"><div className="eyebrow"><T text="SOURCE OF TRUTH" /></div><h2 style={{marginTop:12}}><T text="Always work with current inventory" /></h2><p className="muted"><T text="We request read-only access to Sheets and Drive (for Cairo Plaza's original Excel file). No public sharing or publish-to-web is necessary. Every issued proposal preserves a snapshot of its terms." /></p></div>
      </section>
      <section className="panel"><div className="eyebrow"><T text="DEVELOPMENT COLLECTION" /></div><h2 style={{marginTop:12}}><T text="Project portfolio" /></h2>
        {["Cairo Plaza", "Kawn", "Nasa", "Aqmar", "Vida"].map((name, i) => <div className="pitem" key={name}><span><b>{name}</b><small style={{display:"block", color:"#8090a3", marginTop:5}}>PROJECT {String(i+1).padStart(2,"0")}</small></span><span className="pill"><T text="Configure inventory" /></span></div>)}
      </section>
    </div>
  </main></div>;
}
