"use client";
import {useMemo,useState} from "react";
import {useLanguage} from "@/components/LanguageProvider";
import VidaBrochurePreview from "@/components/VidaBrochurePreview";

type VidaUnit={code:string;floor:string;area:string;price:string;status:string;type?:string};
const key=(u:VidaUnit):string=>{
 const match=u.code.trim().match(/^(\d{1,2})([AB])?[-\s]/i);
 return match?String(Number(match[1]))+(match[2]||"").toUpperCase():"";
};
const sortBuildings=(a:string,b:string)=>{
 const n=Number.parseInt(a,10)-Number.parseInt(b,10);
 return n||a.localeCompare(b);
};
const statusAvailable=(s:string)=>["available","avail","forsale","متاح","متاحة","متوفر","متوفرة"].includes(
 s.normalize("NFKC").toLowerCase().replace(/\s+/g,"")
);
const money=(value:string)=>Number(value.replace(/[,\s]/g,"")).toLocaleString("en-EG",{maximumFractionDigits:2});

export function VidaProjectBrowser({units,onChoose,selectedCode,selectedFloor}:{
 units:VidaUnit[];
 onChoose?:(code:string,floor:string)=>void;
 selectedCode?:string;
 selectedFloor?:string;
}){
 const {language}=useLanguage();
 const tr=(en:string,ar:string)=>language==="ar"?ar:en;
 const [buildingValue,setBuildingValue]=useState("");
 const [floorValue,setFloorValue]=useState("");
 const [localCode,setLocalCode]=useState("");
 const [localFloor,setLocalFloor]=useState("");
 const buildings=useMemo(()=>[...new Set(units.map(key).filter(Boolean))].sort(sortBuildings),[units]);
 const building=buildings.includes(buildingValue)?buildingValue:buildings[0]||"";
 const inBuilding=units.filter(u=>key(u)===building);
 const floors=[...new Set(inBuilding.map(u=>u.floor).filter(Boolean))];
 const floor=floors.includes(floorValue)?floorValue:floors[0]||"";
 const matching=inBuilding.filter(u=>u.floor===floor);
 const activeCode=selectedCode||localCode;
 const activeFloor=selectedFloor||localFloor;
 return <section className="panel" style={{marginBottom:20}}>
   <div className="eyebrow">VIDA · PHASE 01 & 02</div>
   <h2>{tr("Browse buildings, floors and exact unit codes","اختار المبنى والدور وكود الوحدة")}</h2>
   <p className="muted">{tr("Unit prices and availability come from the live Vida sheet. Building/floor drawings are cropped directly from the original brochures.",
     "السعر والحالة من شيت Vida المباشر، والرسومات قصاصات أصلية من البروشور بدون إعادة رسم.")}</p>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12,margin:"14px 0"}}>
     <label className="fieldlabel">{tr("Building","المبنى")}
       <select className="field" value={building} onChange={e=>{setBuildingValue(e.target.value);setFloorValue("");setLocalCode("");}}>
         {buildings.map(b=><option key={b} value={b}>{tr("Building","مبنى")} {b} · {Number.parseInt(b,10)<=18?"Phase 01":Number.parseInt(b,10)<=31?"Phase 02":"Phase 03"}</option>)}
       </select>
     </label>
     <label className="fieldlabel">{tr("Floor","الدور")}
       <select className="field" value={floor} onChange={e=>{setFloorValue(e.target.value);setLocalCode("");}}>
         {floors.map(x=><option key={x} value={x}>{x}</option>)}
       </select>
     </label>
   </div>
   <div className="list">
     {matching.map(u=><button type="button" className={"unit"+(activeCode===u.code?" active":"")} key={u.code+"::"+u.floor}
       onClick={()=>{setLocalCode(u.code);setLocalFloor(u.floor);onChoose?.(u.code,u.floor);}}>
       <span><b>{u.code}</b><small>{u.type||tr("Unit","وحدة")} · {u.area} m² · {tr(u.status,u.status)}</small></span>
       <span><b>{money(u.price)} EGP</b><small>{statusAvailable(u.status)?tr("Available","متاحة"):tr("Unavailable","غير متاحة")}</small></span>
     </button>)}
     {!matching.length?<p className="muted">{tr("No units in the chosen building/floor","لا توجد وحدات في المبنى والدور المختارين")}</p>:null}
   </div>
   {activeCode&&activeFloor?<VidaBrochurePreview code={activeCode} floor={activeFloor}/>:null}
 </section>;
}
