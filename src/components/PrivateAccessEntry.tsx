"use client";

import { useEffect, useState } from "react";

export function PrivateAccessEntry() {
  const [state,setState] = useState<"checking" | "ready" | "error">("checking");
  useEffect(() => {
    const controller = new AbortController();
    async function enter() {
      // Fragment identifiers are never sent to the server or included in
      // ordinary navigation/request logs. Remove it from browser history
      // before making the verification request.
      const fragment = new URLSearchParams(location.hash.slice(1));
      const token = fragment.get("key");
      history.replaceState(null, "", "/access");
      if (!token) {setState("error"); return;}
      try {
        const response = await fetch("/api/access", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({token}), cache:"no-store",
          credentials:"same-origin", referrerPolicy:"no-referrer", signal:controller.signal
        });
        if (!response.ok) { setState("error"); return; }
        setState("ready");
        location.replace("/studio");
      } catch (error) {
        if (!controller.signal.aborted) setState("error");
      }
    }
    enter();
    return ()=>controller.abort();
  },[]);
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:28,textAlign:"center",background:"#f6f8fb",color:"#152945"}}>
    <div style={{maxWidth:490,padding:32,borderRadius:22,background:"white",boxShadow:"0 8px 30px #10203010"}}>
      <h1>OFFER ATELIER</h1>
      <h2>{state==="checking"?"جاري فتح الرابط الخاص":state==="ready"?"تم تفعيل الدخول":"الرابط غير صالح أو تم إلغاؤه"}</h2>
      <p>{state==="checking"?"بنجهز الاستوديو على الجهاز ده.":state==="error"?"افتح رابط الدخول الخاص الكامل الذي تم مشاركته معك.":"جاري فتح استوديو عروض الأسعار..."}</p>
    </div>
  </main>;
}
