"use client";
import {useEffect,useState} from "react";
import {useLanguage} from "@/components/LanguageProvider";
import {getVidaSiteBuilding,vidaHotspotPoints} from "@/lib/vida-site-map";
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
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(215px,1fr))",gap:12,marginTop:12}}>
       <div>
         <strong>{ar?"مكان المبنى المحدد":"Selected building on full site"}</strong>
         <svg viewBox="0 0 1000 962" style={{display:"block",width:"100%",borderRadius:10,marginTop:8}}>
           <image href="/api/vida/artwork?phase=1&page=site" x={0} y={0} width={1000} height={962}/>
           {getVidaSiteBuilding(value.building)&&<polygon
             points={vidaHotspotPoints(getVidaSiteBuilding(value.building)!)}
             fill="#eeae33" fillOpacity={.22} stroke="#c46f12" strokeWidth={7}/>}
         </svg>
       </div>
       <div>
         <strong>{ar?"التوزيع الأصلي داخل الدور":"Original floor/unit layout inset"}</strong>
         <img alt={ar?"التوزيع الأصلي للوحدات في الدور":"Original architectural floor locator inset"}
           src={"/api/vida/artwork?phase="+value.phase+"&page=loc-"+value.brochurePage}
           style={{display:"block",width:"100%",marginTop:8,borderRadius:10}}/>
         <small className="muted">{ar?
           "التظليل في البروشور قد يشمل أكثر من شقة بنفس التصميم؛ تحديد الشقة منفردة يحتاج مراجعة هندسية.":
           "Original shading can cover multiple identical apartments; single-unit outline is pending engineering verification."}</small>
       </div>
       <div>
         <strong>{ar?"الرسم الأصلي للشقة":"Original apartment drawing"}</strong>
         <img alt={ar?"الرسم الأصلي المقتطع من بروشور فيدا":"Original cropped Vida architectural plan"}
           src={"/api/vida/artwork?phase="+value.phase+"&page="+value.brochurePage}
           style={{display:"block",width:"100%",marginTop:8,borderRadius:10}}/>
       </div>
     </div>
   </>
   :value&&<p className="notice">{ar?"الرسمة تحتاج مراجعة: ":"Brochure needs review: "}
     {value.reason}</p>}
 </section>;
}
