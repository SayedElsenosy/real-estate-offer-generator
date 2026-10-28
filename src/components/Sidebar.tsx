"use client";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function Sidebar({ email, active }: { email?: string | null; active: "home" | "studio" | "admin" }) {
  const {language,setLanguage,tr}=useLanguage();
  const items = [{ href: "/", text: "Overview", key: "home" }, { href: "/studio", text: "Offer Studio", key: "studio" }, { href: "/admin", text: "Workspace Settings", key: "admin" }] as const;
  return <aside className="sidebar">
    <Link href="/" className="brand" dir="ltr">OFFER <em>ATELIER</em></Link>
    <div className="side-cap">{tr("REAL ESTATE PROPOSALS")}</div>
    <nav className="menu">{items.map(item => <Link key={item.key} href={item.href} className={active === item.key ? "active" : ""}>{tr(item.text)}</Link>)}</nav>
    <button type="button" className="lang-toggle" aria-label={language==="ar"?"Switch to English":"التحويل إلى العربية"} onClick={()=>setLanguage(language==="ar"?"en":"ar")}>
      <span>🌐</span> {language==="ar"?"English":"العربية"}
    </button>
    <div className="sidebar-bottom">{email ? <><div className="side-cap">{tr("SIGNED IN")}</div><div dir="ltr">{email}</div></> : "Neon PostgreSQL + Vercel"}<p>{tr("Independent property offers platform")}</p></div>
  </aside>;
}
