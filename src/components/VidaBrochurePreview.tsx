"use client";
import {useEffect,useState} from "react";
import {loadVidaBrochureImages,type VidaBrochureImages} from "@/lib/vida-assets-client";
import type {VidaBrochureMatch} from "@/lib/vida-brochure";
import {useLanguage} from "@/components/LanguageProvider";

export default function VidaBrochurePreview({code,floor}:{code:string;floor:string}){
 const {language}=useLanguage();
 const tr=(en:string,ar:string)=>language==="ar"?ar:en;
 const [data,setData]=useState<{match:VidaBrochureMatch;images:VidaBrochureImages}|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 useEffect(()=>{
   setData(null);setError("");
   if(!code||!floor)return;
   const controller=new AbortController();
   setLoading(true);
   void(async()=>{
     try{
       const q=new URLSearchParams({code,floor});
       const response=await fetch("/api/vida/selection?"+q.toString(),{
         credentials:"same-origin",cache:"no-store",signal:controller.signal});
       if(!response.ok)throw Error(tr("Unit source lookup failed","تعذر قراءة بيانات الوحدة من المصدر"));
       const payload=await response.json() as {match:VidaBrochureMatch|null};
       if(!payload.match){if(!controller.signal.aborted)setError(tr(
         "No verified Phase 1/2 brochure drawing matches this unit.",
         "لا توجد رسمة موثقة لهذه الوحدة في بروشور المرحلتين الأولى أو الثانية."));return;}
       const images=await loadVidaBrochureImages(payload.match);
       if(!controller.signal.aborted)setData({match:payload.match,images});
     }catch(e){
       if(!controller.signal.aborted)setError(e instanceof Error?e.message:tr("Source unavailable","المصدر غير متاح"));
     }finally{if(!controller.signal.aborted)setLoading(false);}
   })();
   return ()=>controller.abort();
 },[code,floor,language]);
 if(!code)return null;
 return <section style={{marginTop:16,paddingTop:12,borderTop:"1px solid #dfe6ed"}}>
   <h3 style={{margin:"0 0 7px"}}>{tr("Original Vida brochure drawings","رسومات Vida الأصلية من البروشور")}</h3>
   {loading?<p className="muted">{tr("Loading original drawings…","جاري تحميل الرسومات الأصلية…")}</p>:null}
   {error?<p className="muted" role="status">{error}</p>:null}
   {data?<>
     <p className="muted">{tr("Phase","المرحلة")} {data.match.phase} · {tr("Building","المبنى")} {data.match.building}{data.match.wing||""}
        · Type {data.match.brochureType} · {tr("Floor page","صفحة الدور")} {data.match.floorPage}</p>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
       <figure style={{margin:0}}>
         <img src={data.images.building} alt={tr("Original numbered masterplan building crop","قصاصة موقع المبنى من الماستر بلان الأصلي")}
           style={{width:"100%",maxHeight:330,objectFit:"contain",background:"#fff",borderRadius:9,border:"1px solid #e0e8ef"}}/>
         <figcaption className="muted">{tr("Original numbered masterplan","الماستر بلان الأصلي")}</figcaption>
       </figure>
       <figure style={{margin:0}}>
         <img src={data.images.floor} alt={tr("Original floor brochure crop","قصاصة المخطط الأصلي للدور")}
           style={{width:"100%",maxHeight:330,objectFit:"contain",background:"#fff",borderRadius:9,border:"1px solid #e0e8ef"}}/>
         <figcaption className="muted">{tr("Original floor drawing","رسم الدور الأصلي")} · {data.match.floorPage}</figcaption>
       </figure>
       {data.images.unit?<figure style={{margin:0}}>
         <img src={data.images.unit} alt={tr("Cropped original unit-type plan","الرسم الأصلي المقصوص لنوع الوحدة")}
           style={{width:"100%",maxHeight:330,objectFit:"contain",background:"#fff",borderRadius:9,border:"1px solid #e0e8ef"}}/>
         <figcaption className="muted">{tr("Brochure reference","مرجع البروشور")} · {data.match.unitPage}</figcaption>
       </figure>:null}
     </div>
     <p className="muted" style={{marginTop:12}}>{tr(data.match.notice,
       data.match.exactUnitPlan?"الرسمة مطابقة لكود الوحدة والحرف والمبنى في البروشور.":
        "القصاصات أصلية؛ رسم الوحدة استرشادي لنوعها ولم يتم تأكيد الاتجاه أو النسخة المعكوسة.")}</p>
   </>:null}
 </section>;
}
