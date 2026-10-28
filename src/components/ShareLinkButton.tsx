"use client";

import { useState } from "react";

export function ShareLinkButton() {
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
      if (!response.ok) throw new Error("تعذر إصدار الرابط الخاص. تأكد من دخولك بحساب الإدارة.");
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
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }
  return <div style={{display:"grid",gap:8,maxWidth:560}}>
    <button type="button" className="btn outline" disabled={loading} onClick={getLink}>
      {loading?"جاري تجهيز الرابط":copied?"تم نسخ رابط الدخول الخاص":"نسخ رابط الدخول الخاص"}
    </button>
    {link ? <input aria-label="Private access link" readOnly dir="ltr" value={link}
      onFocus={event=>event.currentTarget.select()}
      style={{width:"100%",border:"1px solid #dbe0e8",borderRadius:8,padding:10,fontSize:12}}/> : null}
    {link ? <small>أي شخص معه الرابط يقدر يستخدم الاستوديو والمخزون وعروض PDF، من غير صلاحية الإدارة. شاركه فقط مع الأشخاص المصرح لهم.</small> : null}
    {error ? <small role="alert" style={{color:"#ad3535"}}>{error}</small> : null}
  </div>;
}
