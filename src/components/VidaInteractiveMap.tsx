"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useLanguage} from "@/components/LanguageProvider";
import {UnitSourceDetails} from "@/components/UnitSourceDetails";

type Unit={code:string;floor:string;area:string;price:string;status:string;type?:string};
type Location={phase:1|2;building:number;wing:string;floor:string;
  unitCode:string;brochureType:number;brochurePage:number|null;masterPage:number;
  sheetArea:number|null;brochureArea:number|null;status:string;reason?:string};

const phaseBuildings:Record<1|2,number[]>={
  1:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
  2:[19,20,21,22,23,24,25,26,27,28,29,30,31]
};
function codeParts(code:string){
 const m=/^(\d{1,2})([AB])?\s*[-_ ]\s*(T?\d{2,3})$/i.exec(code);
 return m?{building:Number(m[1]),wing:m[2]||"",position:m[3]}:null;
}
function available(value:string){
 return ["available","avail","forsale","متاح","متاحة"].includes(value.toLowerCase().replace(/\s/g,""));
}
export function VidaInteractiveMap({units}:{units:Unit[]}){
 const {language}=useLanguage();
 const t=(en:string,ar:string)=>language==="ar"?ar:en;
 const [phase,setPhase]=useState<1|2>(1);
 const [building,setBuilding]=useState(1);
 const [floor,setFloor]=useState("");
 const [selected,setSelected]=useState<Unit|null>(null);
 const [location,setLocation]=useState<Location|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const buildings=useMemo(()=>phaseBuildings[phase],[phase]);
 const buildingUnits=useMemo(()=>units.filter(u=>codeParts(u.code)?.building===building),[units,building]);
 const floors=useMemo(()=>[...new Set(buildingUnits.map(u=>u.floor))].sort(),[buildingUnits]);
 const shown=useMemo(()=>buildingUnits.filter(u=>!floor||u.floor===floor)
   .sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true})),[buildingUnits,floor]);
 useEffect(()=>{setFloor("");setSelected(null);setLocation(null);setError("");},[building]);
 useEffect(()=>{
   if(!selected){setLocation(null);return;}
   const controller=new AbortController();setLoading(true);setError("");setLocation(null);
   const q=new URLSearchParams({unitCode:selected.code,unitFloor:selected.floor});
   void fetch("/api/vida/lookup?"+q,{cache:"no-store",signal:controller.signal,
     credentials:"same-origin"}).then(async r=>{
     if(!r.ok)throw Error("HTTP "+r.status);
     return r.json();
   }).then(data=>{if(!controller.signal.aborted)setLocation(data.location||null);})
   .catch(()=>{if(!controller.signal.aborted)setError(t("Could not verify original drawing.","تعذر التحقق من الرسمة الأصلية."));})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
   return ()=>controller.abort();
 },[selected?.code,selected?.floor]);
 const artwork=(p:number)=>"/api/vida/artwork?phase="+phase+"&page="+p;
 const studioLink=selected?"/studio?"+new URLSearchParams({
  projectId:"vida",unitCode:selected.code,unitFloor:selected.floor
 }):"/studio";
 return <section className="stack" aria-label={t("Vida architectural masterplan","المخطط المعماري لفيدا")}>
   <div className="panel">
     <div className="eyebrow">VIDA • ORIGINAL BROCHURE</div>
     <h2>{t("Select phase, building, floor, then unit","اختار المرحلة ثم المبنى ثم الدور ثم الوحدة")}</h2>
     <p className="muted">{t("These are the exact original brochure pictures. No floor layout is drawn by the website.",
       "دي صور مقصوصة من البروشور الأصلي؛ الموقع لا يعيد رسم الوحدات.")}</p>
     <div style={{display:"flex",gap:9,margin:"16px 0",flexWrap:"wrap"}}>
       {([1,2] as const).map(p=><button className={"btn "+(phase===p?"gold":"soft")}
         type="button" key={p} onClick={()=>{setPhase(p);setBuilding(phaseBuildings[p][0]);}}>
         {t("Phase","المرحلة")} {p}</button>)}
     </div>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:18}}>
       <div>
         <img src={"/api/vida/artwork?phase="+phase+"&page=master"} alt={t("Original Vida phase coding plan","ترقيم مباني فيدا الأصلي")}
           style={{width:"100%",maxHeight:520,objectFit:"contain",borderRadius:12,border:"1px solid #dce3eb"}}/>
         <small className="muted">{t("Source","المصدر")}: Vida Phase 0{phase} • PDF page 8</small>
       </div>
       <div>
         <h3>{t("Buildings","المباني")} — {t("Phase","المرحلة")} {phase}</h3>
         <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:10}}>
          {buildings.map(no=><button type="button" key={no}
            onClick={()=>setBuilding(no)}
            className={"btn "+(building===no?"gold":"soft")}
            style={{padding:"7px 13px",minWidth:43}}>{no}</button>)}
         </div>
         <label className="fieldlabel" style={{display:"block",marginTop:18}}>
           {t("Floor","الدور")}
           <select className="field" value={floor}
             onChange={e=>{setFloor(e.target.value);setSelected(null);}}>
             <option value="">{t("All floors","كل الأدوار")}</option>
             {floors.map(x=><option key={x} value={x}>{x}</option>)}
           </select>
         </label>
         <h3 style={{marginTop:18}}>{t("Live sheet units","وحدات الشيت المباشر")} ({shown.length})</h3>
         <div style={{maxHeight:275,overflowY:"auto",display:"grid",gap:7,marginTop:10}}>
           {shown.map(u=><button type="button" className={"unit"+(selected?.code===u.code&&selected.floor===u.floor?" active":"")}
             style={{textAlign:"start"}} key={u.code+u.floor} onClick={()=>setSelected(u)}>
             <span><b>{u.code}</b><small>{u.floor} • {u.type||"Apartment"} • {u.area||"—"} m²</small></span>
             <span><small>{u.status}</small></span>
           </button>)}
           {!shown.length&&<p className="muted">{t("No units returned by the current inventory for this building.",
             "لا توجد وحدات في المخزون الحالي لهذا المبنى.")}</p>}
         </div>
       </div>
     </div>
   </div>
   {selected&&<div className="panel">
     <div className="eyebrow">{t("Selected unit","الوحدة المحددة")}: {selected.code}</div>
     <h2>{t("Original unit drawing","الرسمة الأصلية للوحدة")}</h2>
     {loading&&<p className="muted">{t("Checking brochure match…","جاري مطابقة البروشور…")}</p>}
     {error&&<p role="alert">{error}</p>}
     {location?.status==="matched"&&location.brochurePage
       ?<>
        <p className="muted">{t("Building","المبنى")} {location.building}
          {" · "}{t("Type","النوع")} {location.brochureType}
          {" · "}{t("Brochure page","صفحة البروشور")} {location.brochurePage}</p>
        <img src={artwork(location.brochurePage)}
          alt={t("Exact Vida brochure floor plan for ","الرسم الأصلي من بروشور فيدا للوحدة ")+selected.code}
          style={{maxWidth:"100%",maxHeight:550,objectFit:"contain",border:"1px solid #e2e8f0",borderRadius:12}}/>
        <div style={{marginTop:12}}><Link className="btn gold" href={studioLink}>
           {t("Create offer for this unit","إصدار أوفر للوحدة")}</Link></div>
       </>
       :location&&<p role="status" className="notice">{t("Drawing awaiting verification: ","الرسمة تحتاج مراجعة: ")}
         {location.reason||"No verified source page"}</p>}
     <UnitSourceDetails projectId="vida" code={selected.code} floor={selected.floor}/>
   </div>}
 </section>;
}
