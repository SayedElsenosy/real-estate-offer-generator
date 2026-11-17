"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";

type SourceField={column:number;label:string;value:string};
type Data={code:string;floor:string;type:string;fields:SourceField[]};

export function UnitSourceDetails({
 projectId, code, floor
}:{projectId:string;code:string;floor?:string}) {
 const {language}=useLanguage();
 const t=(en:string,ar:string)=>language==="ar"?ar:en;
 const [data,setData]=useState<Data|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const [refreshKey,setRefreshKey]=useState(0);

 useEffect(()=>{
   setData(null);setError("");
   if(!projectId||!code){setLoading(false);return;}
   const controller=new AbortController();
   setLoading(true);
   void (async()=>{
     try {
       const query=new URLSearchParams({projectId,unitCode:code,unitFloor:floor||""});
       const res=await fetch("/api/unit-details?"+query,{
         cache:"no-store",credentials:"same-origin",signal:controller.signal
       });
       if(!res.ok)throw Error("Unable to fetch source details (HTTP "+res.status+")");
       const payload=await res.json() as Data;
       if(!Array.isArray(payload.fields)||payload.code!==code)
         throw Error("Unexpected unit details response");
       if(!controller.signal.aborted)setData(payload);
     }catch(err){
       if(!controller.signal.aborted)setError(err instanceof Error?err.message:"Unable to read details");
     }finally{if(!controller.signal.aborted)setLoading(false);}
   })();
   return ()=>controller.abort();
 },[projectId,code,floor,refreshKey]);

 if(!code)return null;
 const duplicateCounts=new Map<string,number>();
 for(const f of data?.fields||[]){
   const label=f.label.toLowerCase();duplicateCounts.set(label,(duplicateCounts.get(label)||0)+1);
 }
 return <section style={{marginTop:14,borderTop:"1px solid #dce3eb",paddingTop:14}}>
   <div className="between" style={{gap:10,flexWrap:"wrap",alignItems:"center"}}>
     <strong>{t("All unit details from this project's sheet","كل تفاصيل الوحدة من شيت المشروع")}</strong>
     <button type="button" className="btn soft" onClick={()=>setRefreshKey(v=>v+1)}
       disabled={loading}>{t("Refresh details","تحديث التفاصيل")}</button>
   </div>
   {loading&&<p className="muted">{t("Loading unit source fields…","جاري تحميل بيانات الوحدة من الشيت…")}</p>}
   {error&&<p role="alert" className="muted">{t("Details unavailable. Try refreshing.","تعذر تحميل التفاصيل. حاول التحديث.")}</p>}
   {data&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(205px,1fr))",gap:10,marginTop:12}}>
     {data.fields.map(field=><div key={field.column}
       style={{border:"1px solid #e0e7ee",borderRadius:9,padding:"10px 12px",minWidth:0,overflowWrap:"anywhere"}}>
       <small className="muted">{field.label}
         {(duplicateCounts.get(field.label.toLowerCase())||0)>1? " · "+field.column:""}
       </small>
       <div style={{fontWeight:650,marginTop:4}} dir="auto">{field.value||"—"}</div>
     </div>)}
   </div>}
   {data?.fields.length===0&&<p className="muted">{t("No additional source columns are available.","لا توجد أعمدة إضافية متاحة في الشيت.")}</p>}
 </section>;
}
