import Link from "next/link";
export function Sidebar({ email, active }: { email?: string | null; active: "home" | "studio" | "admin" }) {
  const items = [{ href: "/", text: "Overview", key: "home" }, { href: "/studio", text: "Offer Studio", key: "studio" }, { href: "/admin", text: "Workspace Settings", key: "admin" }] as const;
  return <aside className="sidebar">
    <Link href="/" className="brand">OFFER <em>ATELIER</em></Link>
    <div className="side-cap">REAL ESTATE PROPOSALS</div>
    <nav className="menu">{items.map(item => <Link key={item.key} href={item.href} className={active === item.key ? "active" : ""}>{item.text}</Link>)}</nav>
    <div className="sidebar-bottom">{email ? <><div className="side-cap">SIGNED IN</div><div>{email}</div></> : "Neon PostgreSQL + Vercel"}<p>Independent property offers platform</p></div>
  </aside>;
}
