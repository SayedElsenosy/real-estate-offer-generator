"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useLiveInventory } from "@/hooks/useLiveInventory";
import { Sidebar } from "@/components/Sidebar";
import { CairoPlazaInteractiveMap } from "@/components/CairoPlazaInteractiveMap";
import { unitKey } from "@/lib/unit-code";

type Project={id:string;name:string};
type Unit={code:string;floor:string;status:string;area:string;price:string};
type Shape={unitCode:string;d:string};
type Floor={id:string;name:string;floor:string|null;viewBox:string;shapes:Shape[];backgroundData?:string|null;reviewStatus:string};
type Result={units?:Unit[];floorPlans?:Floor[];error?:string};
const floorOptions:[string,string,string][]=[
  ["-1","Basement", "البدروم"],["0","Ground", "الأرضي"],["1","First", "الأول"],["2","Second", "الثاني"],
  ["3","Third", "الثالث"],["4","Fourth", "الرابع"],["5","Fifth", "الخامس"],["6","Sixth", "السادس"]
];
function stateOf(status:string):string{
  const s=status.normalize("NFKC").trim().toLowerCase().replace(/[\s_-]+/g,"");
  if(["available","avail","forsale","متاح","متاحة","متوفر","متوفرة"].includes(s))return "#32a56f";
  if(["reserved","booked","booking","محجوز","محجوزة"].includes(s))return "#efb954";
  return "#94a3b8";
}
export default function ArchitecturalPlan({email,projects}:{email:string;projects:Project[]}){
  const [projectId,setProjectId]=useState(projects.find(p=>p.id==="cairo-plaza")?.id||projects[0]?.id||"");
  const [floorNumber,setFloorNumber]=useState("0");
  const {language} = useLanguage();
  const t=(en:string,ar:string)=>language==="ar"?ar:en;
  const {units:liveUnits,floorPlans,loading,refreshing,error,refresh,lastReadAt} =
    useLiveInventory(projectId,projectId!=="cairo-plaza");
  const result:Result|null = loading||error ? null : {units:liveUnits,floorPlans};
  const [selected,setSelected]=useState("");
  const [zoom,setZoom]=useState(1);
  const current=projects.find(p=>p.id===projectId);
  const isCairo=projectId==="cairo-plaza";
  const approved=useMemo(()=> (result?.floorPlans||[]).filter(f=>
    f.reviewStatus==="APPROVED"&&Array.isArray(f.shapes)&&f.shapes.length>0
  ),[result]);
  const otherFloor=approved.find(f=>String(f.floor||"")===floorNumber)||approved[0];
  const units=useMemo(()=>{
    const m=new Map<string,Unit[]>();
    for(const unit of result?.units||[]){
      const key=unitKey(unit.code);m.set(key,[...(m.get(key)||[]),unit]);
    }
    return m;
  },[result]);
  const currentShape=otherFloor?.shapes.find(s=>unitKey(s.unitCode)===unitKey(selected));
  const currentStock=currentShape ? units.get(unitKey(currentShape.unitCode))?.[0]:undefined;
  const box=otherFloor?.viewBox.split(/\s+/).map(Number)||[0,0,1000,700];
  return <div className="shell">
    <Sidebar active="plans" email={email} shared={email==="Private link access"}/>
    <main className="main">
      <header className="header-line">
        <div>
          <div className="eyebrow">{t("ENGINEERING / ARCHITECTURAL PLANS","الهندسة / المخططات المعمارية")}</div>
          <h1>{t("Interactive floor plans","المخططات التفاعلية")}</h1>
          <p className="muted">{t("View engineering floorplans with live unit availability. Select a unit to see its price, area and status.","المخطط الهندسي في الخلفية، وحدود الوحدات فوقه مع حالتها من المخزون المباشر. اضغط على أي وحدة لمشاهدة تفاصيلها.")}</p>
        </div>
        <button type="button" className="btn soft" disabled={loading||refreshing||!projectId}
          onClick={()=>void refresh()}>{loading||refreshing?t("Refreshing…","جاري التحديث..."):t("Refresh inventory","تحديث المخزون")}</button>
      </header>
      <section className="panel" style={{marginBottom:16}}>
        <div className="between" style={{gap:14,flexWrap:"wrap"}}>
          <label className="fieldlabel" style={{minWidth:240,flex:1}}>{t("Project","المشروع")}
            <select className="field" value={projectId}
              onChange={e=>{setProjectId(e.target.value);setSelected("");setFloorNumber("0");setZoom(1);}}>
              {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="fieldlabel" style={{minWidth:230,flex:1}}>{t("Floor","الدور")}
            <select className="field" value={floorNumber}
              onChange={e=>{setFloorNumber(e.target.value);setSelected("");setZoom(1);}}>
              {isCairo?floorOptions.map(([value,label])=><option value={value} key={value}>{label}</option>):
                (approved.length?approved:result?.floorPlans||[]).map(f=>
                  <option key={f.id} value={f.floor||""}>{f.name}</option>)}
            </select>
          </label>
        </div>
        <p className="muted" style={{marginTop:12}}>
          {current?.name||"No project selected"} · {loading?t("Loading live inventory…","جاري تحميل المخزون…"):error?t("Inventory unavailable","المخزون غير متاح"):(result?.units?.length||0)+" "+t("inventory units","وحدة من المخزون")}
        </p>
        {error&&<div className="notice" role="alert">
          {t("Inventory could not be refreshed: ","تعذر قراءة المخزون: ")}{error}. {t("Status colors are disabled until the live source is available.","سيتم إيقاف تلوين الحالات لحين عودة المصدر المباشر.")}
        </div>}
      </section>
      {isCairo&&result&&!error&&
        <CairoPlazaInteractiveMap floor={floorNumber} inventory={result.units||[]}
          selected={selected} onSelect={setSelected}/>}
      {isCairo&&!result&&!error&&<section className="panel">{t("Loading inventory and floor plans…","جاري تحميل المخزون والمخططات…")}</section>}
      {!isCairo&&otherFloor&&result&&!error&&<section className="panel">
        <div className="between" style={{flexWrap:"wrap",gap:10}}>
          <h2>{t("Floor plan","مخطط")} {otherFloor.name}</h2>
          <div className="actionline">
            <button className="btn soft" onClick={()=>setZoom(v=>Math.max(1,v/1.25))}>−</button>
            <span>{Math.round(zoom*100)}%</span>
            <button className="btn soft" onClick={()=>setZoom(v=>Math.min(4,v*1.25))}>+</button>
          </div>
        </div>
        <div style={{overflow:"auto",maxHeight:"74vh",background:"#fff",borderRadius:12}}>
          <svg viewBox={otherFloor.viewBox}
            style={{display:"block",width:zoom*100+"%",minWidth:650}}>
            {otherFloor.backgroundData&&<image href={otherFloor.backgroundData}
              x={box[0]} y={box[1]} width={box[2]} height={box[3]} preserveAspectRatio="none"/>}
            {otherFloor.shapes.map(s=>{
              const matches=units.get(unitKey(s.unitCode))||[];
              const unit=matches.length===1?matches[0]:null;
              const color=unit?stateOf(unit.status):"#e35d70";
              return <path key={s.unitCode} d={s.d} fill={color} fillOpacity={selected===s.unitCode?0.8:0.42}
                stroke={selected===s.unitCode?"#c5923a":"#203852"} strokeWidth={2}
                role="button" tabIndex={0} style={{cursor:"pointer"}}
                onClick={()=>setSelected(s.unitCode)}
                onKeyDown={e=>{if(e.key==="Enter"){setSelected(s.unitCode);}}}>
                <title>{s.unitCode}</title>
              </path>;
            })}
          </svg>
        </div>
        {currentShape&&<div className="notice" style={{marginTop:10}}>
          <b>{currentShape.unitCode}</b> · {currentStock?.status||"{t("Not in inventory","غير موجودة بالمخزون")}"}
          {" · "}{currentStock?.area||"—"} {t("sqm","م²")} · {currentStock?.price||"—"} EGP
        </div>}
      </section>}
      {!isCairo&&!loading&&!error&&!otherFloor&&<section className="panel">
        <h2>{t("No approved unit outlines for this project yet","لا توجد حدود وحدات معتمدة لهذا المشروع حتى الآن")}</h2>
        <p>{t("An administrator can upload its engineering floorplan in settings.","يمكن إضافة المخطط الأصلي من إعدادات النظام.")}</p>
      </section>}
    </main>
  </div>;
}
