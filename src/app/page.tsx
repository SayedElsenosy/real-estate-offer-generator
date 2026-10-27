import Link from "next/link";
import { auth, authReady, signIn, signOut } from "@/auth";
import { Sidebar } from "@/components/Sidebar";
export const dynamic = "force-dynamic";
export default async function Home() {
  const session = authReady ? await auth() : null;
  return <div className="shell"><Sidebar active="home" email={session?.user?.email} /><main className="main">
    <div className="header-line"><div><div className="eyebrow">OFFER MANAGEMENT PLATFORM / 2026</div><h1>Make every offer exceptional.</h1><p className="muted">Live inventory. Interactive floor locations. Flexible financial schedules. A premium proposal in minutes.</p></div><div className="pill"><span className="dot" /> Independent workspace</div></div>
    <div className="metrics">
      <div className="metric"><div className="eyebrow">PROJECT PORTFOLIO</div><strong>05</strong><p className="muted">Cairo Plaza, Kawn, Nasa, Aqmar and Vida</p></div>
      <div className="metric"><div className="eyebrow">DATA CONNECTION</div><strong>Google Drive + Sheets</strong><p className="muted">Read-only private inventory</p></div>
      <div className="metric"><div className="eyebrow">PROPOSAL DELIVERY</div><strong>Multi-page PDF</strong><p className="muted">Details, highlighted floor map, payment tables</p></div>
    </div>
    <div className="grid2">
      <section className="stack">
        <div className="info-card"><div className="eyebrow">PROPERTY OFFER STUDIO</div><h2>A smarter way to present each property.</h2><p>From a single project overview to individual unit location and a precise installment table — all in one place.</p>
          {session ? <div className="actionline"><Link className="btn gold" href="/studio">Open Offer Studio</Link><form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button className="btn outline">Sign out</button></form></div> :
           authReady ? <form action={async () => { "use server"; await signIn("google", { redirectTo: "/studio" }); }}><button className="btn gold">Continue with Google</button></form> :
           <div className="notice">Google OAuth and Neon environment credentials have not been configured on this deployment. The application will enable sign-in after these are supplied in Vercel.</div>}
        </div>
        <div className="panel"><div className="eyebrow">SOURCE OF TRUTH</div><h2 style={{marginTop:12}}>Always work with current inventory</h2><p className="muted">We request read-only access to Sheets and Drive (for Cairo Plaza's original Excel file). No public sharing or publish-to-web is necessary. Every issued proposal preserves a snapshot of its terms.</p></div>
      </section>
      <section className="panel"><div className="eyebrow">DEVELOPMENT COLLECTION</div><h2 style={{marginTop:12}}>Project portfolio</h2>
        {["Cairo Plaza", "Kawn", "Nasa", "Aqmar", "Vida"].map((name, i) => <div className="pitem" key={name}><span><b>{name}</b><small style={{display:"block", color:"#8090a3", marginTop:5}}>PROJECT {String(i+1).padStart(2,"0")}</small></span><span className="pill">Configure inventory</span></div>)}
      </section>
    </div>
  </main></div>;
}
