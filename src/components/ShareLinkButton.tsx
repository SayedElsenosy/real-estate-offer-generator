"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

export function ShareLinkButton() {
  const {tr}=useLanguage();
  const [loading,setLoading] = useState(false);
  const [link,setLink] = useState("");
  const [error,setError] = useState("");
  const [copied,setCopied] = useState(false);
  async function getLink() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/access/owner-link", {
        method:"POST", credentials:"same-origin", cache:"no-store",
        headers:{"Content-Type":"application/json"}
      });
      if (!response.ok) throw new Error(tr("Unable to create private access link. Sign in with the administrator account."));
      const data = await response.json() as {link:string};
      if (!data.link.startsWith(location.origin+"/access#key=")) throw new Error("Invalid private access link.");
      setLink(data.link);
      try {
        await navigator.clipboard.writeText(data.link);
        setCopied(true);
      } catch {
        // Browser clipboard may not be available; show a selectable field.
        setCopied(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tr("An unexpected error occurred"));
    } finally {
      setLoading(false);
    }
  }
  return <div style={{display:"grid",gap:8,maxWidth:560}}>
    <button type="button" className="btn outline" disabled={loading} onClick={getLink}>
      {loading?tr("Preparing private link…"):copied?tr("Private link copied"):tr("Copy private access link")}
    </button>
    {link ? <input aria-label="Private access link" readOnly dir="ltr" value={link}
      onFocus={event=>event.currentTarget.select()}
      style={{width:"100%",border:"1px solid #dbe0e8",borderRadius:8,padding:10,fontSize:12}}/> : null}
    {link ? <small>{tr("Only share this link with authorized people. They can access offers, live inventory and floor plans but not admin settings.")}</small> : null}
    {error ? <small role="alert" style={{color:"#ad3535"}}>{error}</small> : null}
  </div>;
}
