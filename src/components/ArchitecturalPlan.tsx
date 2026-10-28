"use client";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useLanguage } from "@/components/LanguageProvider";
import { unitKey } from "@/lib/unit-code";

type Unit = { code:string; floor:string; status:string; area:string; price:string };
type Shape = {unitCode:string; d:string};
type Floor = {id:string; name:string; floor:string|null; viewBox:string; shapes:Shape[]; backgroundData?:string|null; reviewStatus:string; sourceFileSha256?:string|null};
type LiveResponse = {units?:Unit[]; floorPlans?:Floor[]; error?:string};
const DWG_SHA = "9c9aac1fcf2b330fbbb5e3555b86300b922ac1a33037e4ea51510ece82792c6a";
type State = "available"|"reserved"|"closed"|"soldout";
function stateOf(status:string): State {
  const s=status.normalize("NFKC").toLowerCase().replace(/[\s_-]+/g,"");
  if (["available","avail","forsale","متاح","متاحة","متوفر","متوفرة"].includes(s)) return "available";
  if (["reserved","booked","booking","محجوز","محجوزة"].includes(s)) return "reserved";
  return "closed";
}
const palette:Record<State,string>={available:"#45ad78",reserved:"#f0b95f",closed:"#8e99aa",soldout:"#df5260"};
const labels:Record<State,string>={available:"Available / متاحة",reserved:"Reserved / محجوزة",closed:"Closed / مقفولة",soldout:"Sold Out / غير موجودة بالشيت"};
function indexInventory(units:Unit[], floor:string|null) {
  const matches=new Map<string,Unit[]>();
  for(const u of units.filter(u=>u.floor===floor)){
    const key=unitKey(u.code);
    matches.set(key,[...(matches.get(key)||[]),u]);
  }
  return new Map([...matches].filter(([,v])=>v.length===1).map(([k,v])=>[k,v[0]]));
}
export default function ArchitecturalPlan({email}:{email:string}) {
  const {tr}=useLanguage();
  const [data,setData]=useState<LiveResponse|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [floorId,setFloorId]=useState("");
  const [selected,setSelected]=useState("");
  const [search,setSearch]=useState("");
  const [zoom,setZoom]=useState(1);
  const [show,setShow]=useState<State[]>(["available","reserved","closed","soldout"]);
  const load=()=>{
    setLoading(true);setError("");
    fetch("/api/inventory?projectId=cairo-plaza",{cache:"no-store"})
      .then(async response=>{const payload=await response.json() as LiveResponse;
        if(!response.ok||payload.error) throw Error(payload.error||"Cannot access current inventory.");
        setData(payload);
      }).catch(e=>{setData(null);setError(e instanceof Error?e.message:String(e));})
      .finally(()=>setLoading(false));
  };
  useEffect(()=>{load();},[]);
  const floors=useMemo(()=> (data?.floorPlans||[]).filter(f=>
    f.sourceFileSha256===DWG_SHA && f.reviewStatus==="APPROVED" && f.shapes?.length>0)
    .sort((a,b)=>Number(a.floor)-Number(b.floor)),[data]);
  const floor=floors.find(f=>f.id===floorId)||floors[0];
  const inventory=useMemo(()=>indexInventory(data?.units||[],floor?.floor??null),[data,floor]);
  const entries=useMemo(()=> (floor?.shapes||[]).map(shape=>{
    const unit=inventory.get(unitKey(shape.unitCode));
    return {shape,unit,status:unit?stateOf(unit.status):"soldout" as State};
  }),[floor,inventory]);
  const visible=entries.filter(e=>show.includes(e.status)&&unitKey(e.shape.unitCode).includes(unitKey(search)));
  const chosen=entries.find(e=>unitKey(e.shape.unitCode)===unitKey(selected));
  function toggle(s:State){setShow(prev=>prev.includes(s)?prev.filter(v=>v!==s):[...prev,s]);}
  const vb=(floor?.viewBox||"0 0 1000 1000").trim().split(/\s+/).map(Number);
  return <div className="shell"><Sidebar active="plans" email={email}/><main className="main">
    <header className="header-line"><div><div className="eyebrow">CAIRO PLAZA / ENGINEERING CAD</div>
      <h1>{tr("Interactive architectural plan")}</h1>
      <p className="muted">DWG/DXF only · Live Sheet1 colors · Quotation PDF downloads remain available in Offer Studio.</p></div>
      <button className="btn soft" onClick={load} disabled={loading}>{loading?"Loading...":"Refresh live inventory"}</button>
    </header>
    {error && <div className="notice" role="alert">Unable to verify Sheet1: {error}. Colors are withheld rather than incorrectly marking every unit Sold Out.</div>}
    <div className="panel">
      <div className="between" style={{gap:12,flexWrap:"wrap"}}>
        <label className="fieldlabel">Floor
          <select className="field" value={floor?.id||""} onChange={e=>{setFloorId(e.target.value);setSelected("");setZoom(1);}}>
            {floors.map(f=><option key={f.id} value={f.id}>{f.name} ({f.floor})</option>)}
          </select>
        </label>
        <label className="fieldlabel">Unit code
          <input className="field" placeholder="Search exact CAD code" value={search} onChange={e=>setSearch(e.target.value)}/>
        </label>
        <div className="actionline"><button className="btn soft" onClick={()=>setZoom(v=>Math.max(1,v/1.25))}>−</button>
          <span>{Math.round(zoom*100)}%</span><button className="btn soft" onClick={()=>setZoom(v=>Math.min(4,v*1.25))}>+</button>
          <button className="btn soft" onClick={()=>setZoom(1)}>Reset</button></div>
      </div>
      <div className="actionline" style={{marginTop:15,flexWrap:"wrap"}}>
        {(["available","reserved","closed","soldout"] as State[]).map(status=>
          <label key={status} style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:12}}>
            <input type="checkbox" checked={show.includes(status)} onChange={()=>toggle(status)}/>
            <span style={{display:"inline-block",width:12,height:12,borderRadius:3,background:palette[status]}}/>
            {labels[status]} ({entries.filter(e=>e.status===status).length})
          </label>)}
      </div>
      {floor&& !error ? <div style={{overflow:"auto",maxHeight:"75vh",marginTop:20,border:"1px solid #4a5768",borderRadius:12}}>
        <svg viewBox={floor.viewBox} style={{width:(zoom*100)+"%",height:"auto",display:"block",minWidth:600}} role="group" aria-label={"Verified CAD floor "+floor.name}>
          {floor.backgroundData && <image href={floor.backgroundData} x={vb[0]} y={vb[1]} width={vb[2]} height={vb[3]} preserveAspectRatio="none"/>}
          {visible.map(({shape,unit,status})=><path key={shape.unitCode} d={shape.d}
            fill={palette[status]} fillOpacity={selected===shape.unitCode?.8:.52}
            stroke={selected===shape.unitCode?"#ffffff":"#314259"} strokeWidth={selected===shape.unitCode?3:1.5}
            role="button" tabIndex={0} aria-label={shape.unitCode+" "+labels[status]}
            style={{cursor:"pointer",outline:"none"}}
            onClick={()=>setSelected(shape.unitCode)}
            onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelected(shape.unitCode);}}}>
            <title>{shape.unitCode} — {unit?.status||"Sold Out (not listed in Sheet1)"}</title>
          </path>)}
        </svg>
      </div> : <div className="floor-blank" style={{marginTop:20}}>
        <div><div className="symbol">⌗</div><h2>{loading?"Loading live floorplans…":error?"Inventory unavailable":"CAD boundaries awaiting architectural verification"}</h2>
          <p className="muted">Only source-verified, approved DWG unit outlines can be published here. Legacy PDF-derived polygons are never shown.</p></div>
      </div>}
      {floor && !error && <p className="muted">{entries.length} verified CAD shapes on this floor · {visible.length} displayed. Sheet status is refreshed on page load and with Refresh.</p>}
      {chosen && !error && <div className="notice" style={{marginTop:15}}>
        <strong>{chosen.shape.unitCode}</strong> · {chosen.unit?.status||"Sold Out — missing from Sheet1"}
        {chosen.unit && <> · {chosen.unit.area} m² · {chosen.unit.price} EGP</>}
        <p style={{marginTop:6}}>Availability and pricing are controlled exclusively by the live inventory. Drawing-only units are never offerable.</p>
      </div>}
    </div>
  </main></div>;
}
