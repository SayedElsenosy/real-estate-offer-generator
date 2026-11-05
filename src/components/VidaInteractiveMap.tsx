"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useLanguage} from "@/components/LanguageProvider";
import {UnitSourceDetails} from "@/components/UnitSourceDetails";
import {VidaSitePicker} from "@/components/VidaSitePicker";

type Unit={code:string;floor:string;area:string;price:string;status:string;type?:string};
type Location={phase:1|2;building:number;wing:string;floor:string;
  unitCode:string;brochureType:number;brochurePage:number|null;masterPage:number;
  sheetArea:number|null;brochureArea:number|null;status:string;reason?:string};
const phaseBuildings:Record<1|2,number[]>={
  1:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18],
  2:[19,20,21,22,23,24,25,26,27,28,29,30,31]
};
function codeParts(code:string){
 const m=/^(\d{1,2})([AB])?\s*[-_ ]\s*(T?\d{2,3})$/i.exec(code.trim());
 return m?{building:Number(m[1]),wing:m[2]||"",position:m[3]}:null;
}
const natural=(a:string,b:string)=>a.localeCompare(b,undefined,{numeric:true});
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

 const countByBuilding=useMemo(()=>{
   const counts=new Map<number,number>();
   for(const u of units){
     const no=codeParts(u.code)?.building;
     if(no)counts.set(no,(counts.get(no)||0)+1);
   }
   return counts;
 },[units]);
 const buildingUnits=useMemo(()=>units.filter(u=>codeParts(u.code)?.building===building),[units,building]);
 const floors=useMemo(()=>[...new Set(buildingUnits.map(u=>u.floor))].sort(natural),[buildingUnits]);
 const shown=useMemo(()=>buildingUnits.filter(u=>!floor||u.floor===floor)
   .sort((a,b)=>natural(a.code,b.code)),[buildingUnits,floor]);
 const buildingPhase:1|2|3=building<=18?1:building<=31?2:3;
 const selectedUnitKey=selected?.code+"|"+selected?.floor;
 useEffect(()=>{setFloor("");setSelected(null);setLocation(null);setError("");},[building]);
 useEffect(()=>{
   if(!selected){setLocation(null);setLoading(false);return;}
   const controller=new AbortController();
   setLoading(true);setError("");setLocation(null);
   const q=new URLSearchParams({unitCode:selected.code,unitFloor:selected.floor});
   void fetch("/api/vida/lookup?"+q,{
     cache:"no-store",signal:controller.signal,credentials:"same-origin"
   }).then(async r=>{
     if(!r.ok)throw Error("HTTP "+r.status);
     return r.json();
   }).then(data=>{if(!controller.signal.aborted)setLocation(data.location||null);})
   .catch(()=>{if(!controller.signal.aborted)setError(t("Could not verify original drawing.","تعذر التحقق من الرسمة الأصلية."));})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
   return ()=>controller.abort();
 },[selectedUnitKey]);

 function chooseBuilding(no:number){
   setBuilding(no);
   if(no<=31)setPhase(no<=18?1:2);
 }
 const studioLink=selected?"/studio?"+new URLSearchParams({
   projectId:"vida",unitCode:selected.code,unitFloor:selected.floor
 }):"/studio";
 const artwork=(page:string|number,numberedPhase:number)=>
   "/api/vida/artwork?phase="+numberedPhase+"&page="+page;
 return <section className="stack" aria-label={t("Vida interactive full-site masterplan","المخطط التفاعلي الكامل لمشروع فيدا")}>
   <section className="panel">
     <div className="eyebrow">VIDA / ORIGINAL FULL MASTERPLAN</div>
     <h2>{t("Choose a building directly on the masterplan","اختار المبنى من صورة الماستر بلان")}</h2>
     <p className="muted">{t(
       "Tap any numbered building, then choose its floor and unit from the connected live inventory.",
       "اضغط على أي مبنى مرقم في الصورة، وبعدها اختار الدور والوحدة من المخزون المباشر."
     )}</p>
     <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"14px 0"}}>
       {([1,2] as const).map(p=><button key={p} type="button"
         className={"btn "+(buildingPhase===p?"gold":"soft")}
         onClick={()=>{setPhase(p);chooseBuilding(phaseBuildings[p][0]);}}>
         {t("Phase","المرحلة")} {p}
       </button>)}
     </div>
     <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,330px),1fr))",gap:17,alignItems:"start"}}>
       <VidaSitePicker
         selectedBuilding={building} selectedPhase={phase}
         onSelectBuilding={chooseBuilding} language={language}
         availableByBuilding={countByBuilding}/>
       <div style={{minWidth:0}}>
         <h3>{t("Building","المبنى")} {building}</h3>
         <p className="muted">{t("Phase","المرحلة")} {buildingPhase} · {buildingUnits.length} {t("units","وحدة")}</p>
         {buildingPhase===3&&<div className="notice" role="status">
           {t("Phase 3 buildings 32–42 appear on the original masterplan, but their approved unit brochures have not been supplied. No floor position will be invented.",
             "مباني المرحلة الثالثة من 32 إلى 42 موجودة بالصورة، لكن مخططاتها التفصيلية المعتمدة لم تصل. مش هنحدد مكان وحدة بالتخمين.")}
         </div>}
         <h3 style={{marginTop:18}}>{t("Choose floor","اختار الدور")}</h3>
         <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:9}}>
           <button type="button" className={"btn "+(!floor?"gold":"soft")}
             onClick={()=>{setFloor("");setSelected(null);}}>{t("All floors","كل الأدوار")}</button>
           {floors.map(name=><button type="button" key={name}
             className={"btn "+(floor===name?"gold":"soft")}
             onClick={()=>{setFloor(name);setSelected(null);}}>{name}</button>)}
         </div>
         <h3 style={{marginTop:18}}>{t("Units on selected floor","وحدات الدور المحدد")} ({shown.length})</h3>
         <div style={{maxHeight:325,overflowY:"auto",display:"grid",gap:7,marginTop:10}}>
           {shown.map(u=><button type="button" key={u.code+"|"+u.floor}
             aria-pressed={selected?.code===u.code&&selected.floor===u.floor}
             className={"unit"+(selected?.code===u.code&&selected.floor===u.floor?" active":"")}
             style={{textAlign:"start",padding:"11px 12px"}}
             onClick={()=>{setSelected(u);setLocation(null);}}>
             <span><b>{u.code}</b><small>{u.floor} · {u.type||"—"} · {u.area||"—"} m²</small></span>
             <span><small>{u.status}</small></span>
           </button>)}
           {!shown.length&&<p className="muted">{t("No live-sheet units were found for this building and floor.",
             "مفيش وحدات ظاهرة في الشيت الحالي للمبنى والدور المحددين.")}</p>}
         </div>
       </div>
     </div>
   </section>
   {selected&&<section className="panel">
     <div className="eyebrow">{t("Selected unit","الوحدة المختارة")}: {selected.code}</div>
     <h2>{t("Unit position inside the building","مكان الوحدة داخل المبنى")}</h2>
     {loading&&<p className="muted">{t("Checking the original brochure…","جاري التحقق من البروشور الأصلي…")}</p>}
     {error&&<p role="alert">{error}</p>}
     {location?.status==="matched"&&location.brochurePage
       ?<>
         <p className="muted">{t("Phase","المرحلة")} {location.phase}
           {" · "}{t("Building","مبنى")} {location.building}
           {" · "}{t("Floor","دور")} {selected.floor}
           {" · "}{t("Architectural Type","النوع المعماري")} {location.brochureType}</p>
         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:15,alignItems:"start"}}>
           <div>
             <strong>{t("Original floor-location inset","التوزيع الأصلي للوحدات على الدور")}</strong>
             <img src={artwork("loc-"+location.brochurePage,location.phase)}
               alt={t("Original shaded unit-layout diagram from Vida brochure",
                 "رسم توزيع الوحدات المظلل من البروشور الأصلي")}
               style={{display:"block",maxWidth:"100%",width:"100%",marginTop:10,border:"1px solid #e2e8f0",borderRadius:10}}/>
             <small className="muted">{t(
               "The brochure sometimes shades multiple identical apartments. Exact single-unit outlines remain pending engineering confirmation.",
               "البروشور أحيانًا بيظلل أكثر من شقة متطابقة؛ تحديد حدود الشقة الواحدة بالضبط يحتاج تأكيد هندسي."
             )}</small>
           </div>
           <div>
             <strong>{t("Original apartment plan (no redrawing)","رسم الشقة الأصلي بدون إعادة رسم")}</strong>
             <img src={artwork(location.brochurePage,location.phase)}
               alt={t("Original Vida plan page","صفحة الرسم الأصلي من بروشور فيدا")}
               style={{display:"block",maxWidth:"100%",width:"100%",marginTop:10,border:"1px solid #e2e8f0",borderRadius:10}}/>
           </div>
         </div>
         <div style={{marginTop:15}}><Link className="btn gold" href={studioLink}>
           {t("Create offer with masterplan and original unit drawing",
              "إصدار أوفر بالمخطط العام ورسم الوحدة الأصلي")}</Link></div>
       </>
       :location&&<div className="notice" role="status">
         {t("This unit's exact brochure drawing needs review: ",
           "الرسمة الخاصة بالوحدة محتاجة مراجعة: ")}{location.reason||"Not mapped"}
       </div>}
     <UnitSourceDetails projectId="vida" code={selected.code} floor={selected.floor}/>
   </section>}
 </section>;
}
