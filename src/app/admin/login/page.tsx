import { redirect } from "next/navigation";
import { auth, authReady, isAdmin, signIn } from "@/auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administrator sign in | Offer Atelier",
  robots: { index: false, follow: false }
};

export default async function AdminLoginPage() {
  const session = authReady ? await auth() : null;
  if (session?.user?.email && isAdmin(session.user.email)) redirect("/admin");

  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f6f8fb"}}>
    <section className="panel" style={{width:"100%",maxWidth:480,textAlign:"center"}}>
      <div className="eyebrow">OFFER ATELIER / OWNER ONLY</div>
      <h1 style={{marginTop:12}}>Administrator sign in</h1>
      <p className="muted">دخول الإدارة مخصص لصاحب حساب Google المرتبط بالمشروع فقط.</p>
      {authReady
        ? <form action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/admin" });
        }}>
          <button className="btn gold" type="submit">Continue with Google</button>
        </form>
        : <p role="alert">Google administrator login is not configured.</p>}
    </section>
  </main>;
}
