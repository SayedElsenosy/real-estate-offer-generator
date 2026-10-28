"use client";

import { useMemo, useState } from "react";
import { unitKey } from "@/lib/unit-code";
import basement from "@/data/cairo-svg-floor--1.json";
import ground from "@/data/cairo-svg-floor-0.json";
import first from "@/data/cairo-svg-floor-1.json";
import second from "@/data/cairo-svg-floor-2.json";
import third from "@/data/cairo-svg-floor-3.json";
import fourth from "@/data/cairo-svg-floor-4.json";
import fifth from "@/data/cairo-svg-floor-5.json";
import sixth from "@/data/cairo-svg-floor-6.json";

type Shape = {code:string;d?:string;x?:number;y?:number;status:"EXTRACTED"|"REVIEW"|"UNRESOLVED";printed?:number|null;area?:number|null;ratio?:number|null;reason?:string};
type FloorData = {floor:string;name:string;units:Shape[]};
type LiveUnit = {code:string;floor:string;status:string;area:string;price:string;project?:string};
const data:Record<string,FloorData> = {
  "-1":basement,"0":ground,"1":first,"2":second,"3":third,
  "4":fourth,"5":fifth,"6":sixth
} as unknown as Record<string,FloorData>;
const colors = {
  available:{fill:"#32a56f",name:"متاحة"},
  reserved:{fill:"#efb954",name:"محجوزة"},
  closed:{fill:"#94a3b8",name:"غير متاحة"},
  soldout:{fill:"#e35d70",name:"غير موجودة في المخزون"}
} as const;
type SaleStatus=keyof typeof colors;
function stateOf(value:string):SaleStatus{
  const text=value.normalize("NFKC").trim().toLowerCase().replace(/[\s_\-]+/g,"");
  if(["available","avail","forsale","متاح","متاحة","متوفر","متوفرة"].includes(text))return "available";
  if(["reserved","booked","booking","محجوز","محجوزة"].includes(text))return "reserved";
  return "closed";
}
function amount(value?:string){const n=Number(String(value||"").replace(/[,\s]/g,""));return Number.isFinite(n)&&n>0?n.toLocaleString("en-EG")+" EGP":"—";}
export function CairoPlazaInteractiveMap({floor,inventory,selected,onSelect}:{
  floor:string;inventory:LiveUnit[];selected:string;onSelect:(code:string)=>void;
}){
  const [zoom,setZoom]=useState(1);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState<SaleStatus|"all">("all");
  const model=data[floor]||data["0"];
  const units=useMemo(()=>{
    const unique=new Map<string,LiveUnit[]>();
    for(const u of inventory){
      // Match each unit by code within the current floor. Never borrow
      // status/price from another floor for duplicate codes.
      const key=unitKey(u.code);
      unique.set(key,[...(unique.get(key)||[]),u]);
    }
    return model.units.map(shape=>{
      const candidates=(unique.get(unitKey(shape.code))||[]).filter(u=>{
        // Source floor codes are BA/GR/FR/...; the external sheet may use
        // descriptive floor names. The code is the primary unique match.
        const otherFloor=String(u.floor||"").trim().toLowerCase();
        return !otherFloor || !/^(\-?\d+)$/.test(otherFloor) ||
          Number(otherFloor)===Number(floor);
      });
      const live=candidates.length===1?candidates[0]:undefined;
      const sale:SaleStatus=live?stateOf(live.status):"soldout";
      return {shape,live,sale};
    });
  },[inventory,model,floor]);
  const chosen=units.find(x=>unitKey(x.shape.code)===unitKey(selected));
  const query=unitKey(search);
  const filtered=units.filter(item=>(!query||unitKey(item.shape.code).includes(query))&&(filter==="all"||item.sale===filter));
  const counts=units.reduce((acc,item)=>(acc[item.sale]++,acc),{available:0,reserved:0,closed:0,soldout:0} as Record<SaleStatus,number>);
  const selectedStroke="#d09d43";
  return <section className="panel" style={{marginBottom:20}}>
    <div style={{display:"flex",gap:16,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
      <div>
        <div className="eyebrow">CAIRO PLAZA / ENGINEERING FLOORPLAN</div>
        <h2 style={{margin:"8px 0"}}>المخطط المعماري — {model.name}</h2>
        <p className="muted" style={{margin:0}}>اضغط على حدود أي وحدة لعرض تفاصيلها من المخزون الحي. جميع الوحدات معروضة كمضلعات، بدون نقاط منفصلة.</p>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button type="button" className="btn soft" onClick={()=>setZoom(v=>Math.max(1,Math.round((v-0.25)*100)/100))} aria-label="تصغير المخطط">−</button>
        <strong style={{minWidth:50,textAlign:"center"}}>{Math.round(zoom*100)}%</strong>
        <button type="button" className="btn soft" onClick={()=>setZoom(v=>Math.min(3,Math.round((v+0.25)*100)/100))} aria-label="تكبير المخطط">+</button>
        <button type="button" className="btn soft" onClick={()=>setZoom(1)}>إعادة الضبط</button>
      </div>
    </div>
    <div style={{display:"flex",gap:9,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
      <input className="field" style={{width:260,maxWidth:"100%"}} placeholder="ابحث بكود الوحدة" value={search} onChange={e=>setSearch(e.target.value)}/>
      <button type="button" onClick={()=>setFilter("all")} style={{padding:"7px 12px",borderRadius:99,border:"1px solid #d4dce6",background:filter==="all"?"#e1ebf5":"white",cursor:"pointer"}}>كل الوحدات ({units.length})</button>
      {(Object.keys(colors) as SaleStatus[]).map(status=>
        <button type="button" key={status} onClick={()=>setFilter(filter===status?"all":status)}
          style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 10px",borderRadius:99,border:filter===status?"2px solid #1b2e49":"1px solid #d4dce6",background:"#fff",cursor:"pointer"}}>
          <span style={{width:10,height:10,borderRadius:"50%",background:colors[status].fill}}/>
          {colors[status].name} ({counts[status]})
        </button>)}
    </div>
    <div style={{border:"1px solid #dbe3eb",borderRadius:14,background:"white",overflow:"auto",maxHeight:"75vh",position:"relative"}}>
      <svg viewBox="0 0 214 155" role="img" aria-label={"مخطط كايرو بلازا " + model.name}
        style={{display:"block",width:(zoom*100)+"%",minWidth:680,height:"auto",touchAction:"pan-x pan-y"}}>
        <image href={"/cairo-cad/floor-"+floor+".svg"} x={0} y={0} width={214} height={155} preserveAspectRatio="none"/>
        {units.map(({shape,sale})=>{
          const isSelected=chosen?.shape.code===shape.code;
          const visible=(!query||unitKey(shape.code).includes(query))&&(filter==="all"||sale===filter);
          if(!shape.d)return null; // Validation ensures 772/772 source units have polygons.
          return <path key={shape.code} d={shape.d} role="button" tabIndex={0}
            fill={isSelected?selectedStroke:colors[sale].fill}
            fillOpacity={isSelected?0.78:visible?0.38:0.08}
            stroke={isSelected?"#aa6c17":shape.status==="REVIEW"?"#785b2b":"#12263e"}
            strokeWidth={isSelected?0.8:shape.status==="REVIEW"?0.33:0.20}
            strokeLinejoin="round" style={{cursor:"pointer",outline:"none"}}
            onClick={()=>onSelect(shape.code)}
            onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(shape.code);}}}>
              <title>{shape.code} — {colors[sale].name}{shape.status==="REVIEW"?" (حدود قيد الاعتماد الهندسي)":""}</title>
          </path>;
        })}
      </svg>
    </div>
    <div style={{fontSize:12,color:"#64748b",marginTop:9}}>
      الخريطة أصلها مخطط CAD الهندسي. الحدود المستخرجة مرجعية حتى المراجعة البصرية النهائية؛ مساحات البيع والأسعار وحالات التوفر تأتي من جدول المخزون، وليس من مساحة المضلع.
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12,marginTop:16}}>
      <div style={{background:"#f1f5f9",borderRadius:14,padding:16}}>
        <strong>الوحدات: {model.units.length}</strong>
        <p style={{margin:"8px 0 0",color:"#64748b"}}>بحدود SVG قابلة للضغط: {model.units.filter(s=>!!s.d).length} • بدون علامات: 0</p>
        {search&&<p style={{fontSize:13,marginTop:8}}>نتائج البحث: {filtered.length}</p>}
        {query&&filtered.length>0&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:10}}>
          {filtered.slice(0,12).map(({shape})=><button type="button" key={shape.code}
            style={{border:"1px solid #cbd5e1",background:"white",borderRadius:6,padding:"5px 7px",cursor:"pointer",fontSize:11}}
            onClick={()=>onSelect(shape.code)}>{shape.code}</button>)}
        </div>}
      </div>
      <div style={{border:"1px solid #dbe3eb",borderRadius:14,padding:16,background:"#fff"}}>
        {chosen?<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
            <div className="eyebrow">تفاصيل الوحدة المختارة</div>
            <button type="button" className="btn soft" onClick={()=>onSelect("")}>إغلاق ×</button>
          </div>
          <h2 dir="ltr" style={{margin:"10px 0",textAlign:"right"}}>{chosen.shape.code}</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><small className="muted">الدور</small><div>{model.name}</div></div>
            <div><small className="muted">الحالة</small><div style={{fontWeight:600,color:colors[chosen.sale].fill}}>{chosen.live?.status||colors[chosen.sale].name}</div></div>
            <div><small className="muted">المساحة من الشيت</small><div>{chosen.live?.area?chosen.live.area+" م²":"—"}</div></div>
            <div><small className="muted">السعر الحالي</small><div dir="ltr" style={{textAlign:"right",fontWeight:700}}>{amount(chosen.live?.price)}</div></div>
          </div>
          <p style={{margin:"12px 0 0",fontSize:12,color:"#64748b"}}>
            {chosen.shape.status==="UNRESOLVED"?"حدود هذه الوحدة تحتاج استكمال المراجعة الهندسية.":
             chosen.shape.status==="REVIEW"?"المضلع ظاهر للتفاعل؛ مساحته أو فاصل الجدران يحتاج اعتمادًا هندسيًا نهائيًا.":"حدود الوحدة مستخرجة من ملف SVG الهندسي."}
          </p>
        </div>:<div style={{color:"#64748b"}}><h3>تفاصيل الوحدة</h3>اضغط على أي وحدة في المخطط لعرض كودها وسعرها ومساحتها وحالتها الحالية.</div>}
      </div>
    </div>
  </section>;
}
