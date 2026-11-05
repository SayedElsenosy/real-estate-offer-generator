"use client";
import {useEffect,useState} from "react";
import {useLanguage} from "@/components/LanguageProvider";
type Location={phase:1|2;building:number;brochureType:number;
  brochurePage:number|null;status:"matched"|"needs-review"|"out-of-scope";reason?:string};
export function VidaBrochurePreview({code,floor}:{code:string;floor:string}){
 const [value,setValue]=useState<Location|null>(null);
 const [pending,setPending]=useState(false);
 const [error,setError]=useState("");
 const {language}=useLanguage(),ar=language==="ar";
 useEffect(()=>{
  const controller=new AbortController();setValue(null);setError("");
  if(!code||!floor)return;
  setPending(true);
  const p=new URLSearchParams({unitCode:code,unitFloor:floor});
  void fetch("/api/vida/lookup?"+p,{credentials:"same-origin",cache:"no-store",signal:controller.signal})
    .then(async r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();})
    .then(x=>{if(!controller.signal.aborted)setValue(x.location||null);})
    .catch(()=>{if(!controller.signal.aborted)setError(ar?"تعذر التحقق من البروشور":"Could not verify brochure reference");})
    .finally(()=>{if(!controller.signal.aborted)setPending(false);});
  return ()=>controller.abort();
 },[code,floor]);
 if(!code)return null;
 return <section style={{marginTop:14}}>
  <div className="eyebrow">VIDA • {ar?"الرسم الأصلي للوحدة":"ORIGINAL BROCHURE PLAN"}</div>
  {pending&&<p className="muted">{ar?"جاري مطابقة الوحدة بالمخطط…":"Matching selected unit to brochure…"}</p>}
  {error&&<p role="alert">{error}</p>}
  {value?.status==="matched"&&value.brochurePage
   ? <>
     <p className="muted">{ar?"المبنى":"Building"} {value.building}
      {" · "}{ar?"النوع الهندسي":"Type"} {value.brochureType}
      {" · "}{ar?"صفحة البروشور":"Brochure page"} {value.brochurePage}</p>
     <img alt={ar?"الرسم الأصلي المقتطع من بروشور فيدا":"Original cropped Vida architectural plan"}
      src={"/api/vida/artwork?phase="+value.phase+"&page="+value.brochurePage}
      style={{maxWidth:"100%",maxHeight:430,objectFit:"contain",borderRadius:9}}/>
   </>
   :value&&<p className="notice">{ar?"الرسمة تحتاج مراجعة: ":"Brochure needs review: "}
     {value.reason}</p>}
 </section>;
}
