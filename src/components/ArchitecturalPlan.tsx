"use client";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { unitKey } from "@/lib/unit-code";

import { cairoBgGzip } from "@/data/cairo-bg-gzip";

type Project = { id: string; name: string };
type Unit = { code: string; floor: string; status: string; area: string; price: string };
type Shape = { unitCode: string; d: string };
type Floor = { id: string; name: string; floor: string | null; viewBox: string; shapes: Shape[]; backgroundData?: string | null; reviewStatus: string; sourceFileSha256?: string | null };
type Result = { units?: Unit[]; floorPlans?: Floor[]; error?: string };
const DWG_SHA = "9c9aac1fcf2b330fbbb5e3555b86300b922ac1a33037e4ea51510ece82792c6a";
const floorOptions = [["-1","Basement / البدروم"],["0","Ground / الأرضي"],["1","First / الأول"],["2","Second / الثاني"],["3","Third / الثالث"],["4","Fourth / الرابع"],["5","Fifth / الخامس"],["6","Sixth / السادس"]];
const palette = { available:"#45ad78", reserved:"#f0b95f", closed:"#8e99aa", soldout:"#df5260" };
type State = keyof typeof palette;
function statusOf(value: string):State {
  const s=value.normalize("NFKC").trim().toLowerCase().replace(/[\s_-]+/g,"");
  if(["available","avail","forsale","متاح","متاحة","متوفر","متوفرة"].includes(s))return "available";
  if(["reserved","booked","booking","محجوز","محجوزة"].includes(s))return "reserved";
  return "closed";
}
export default function ArchitecturalPlan({email,projects}:{email:string;projects:Project[]}) {
  const [projectId,setProjectId]=useState(projects.find(p=>p.id==="cairo-plaza")?.id||projects[0]?.id||"");
  const [result,setResult]=useState<Result|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [revision,setRevision]=useState(0);
  const [floorNumber,setFloorNumber]=useState("0");
  const [selected,setSelected]=useState("");
  const [search,setSearch]=useState("");
  const [zoom,setZoom]=useState(1);
  const [enabled,setEnabled]=useState<State[]>(["available","reserved","closed","soldout"]);
  const [cadBackground,setCadBackground]=useState<string|null>(null);
  const [cadZoom,setCadZoom]=useState(1);
  useEffect(()=>{
    let alive=true; let url:string|undefined;
    setCadBackground(null);
    const encoded=cairoBgGzip[floorNumber];
    if(!encoded || typeof DecompressionStream==="undefined") return;
    void (async()=>{
      try {
        const binary=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
        const svg=await new Response(new Blob([binary]).stream().pipeThrough(new DecompressionStream("gzip"))).blob();
        if(!alive)return;
        url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));
        setCadBackground(url);
      }catch { if(alive)setCadBackground(null); }
    })();
    return ()=>{alive=false;if(url)URL.revokeObjectURL(url);};
  },[floorNumber]);
  const project=projects.find(p=>p.id===projectId);
  const selectedCadAnchor = (cairoCad.labelsByFloor[floorNumber as keyof typeof cairoCad.labelsByFloor] || []).find(anchor=>unitKey(anchor.code)===unitKey(selected));
  useEffect(()=>{
    if(!projectId){setLoading(false);return;}
    let stopped=false;
    let controller:AbortController|null=null;
    const refresh=async()=>{
      controller?.abort();
      controller=new AbortController();
      try{
        const response=await fetch("/api/inventory?projectId="+encodeURIComponent(projectId),{cache:"no-store",signal:controller.signal});
        const data=await response.json() as Result;
        if(!response.ok||data.error)throw Error(data.error||"Inventory not available");
        if(!stopped){setResult(data);setError("");}
      }catch(e){
        if(!stopped&&(e as Error).name!=="AbortError"){
          setResult(null);setError(e instanceof Error?e.message:String(e));
        }
      }finally{if(!stopped)setLoading(false);}
    };
    setResult(null);setError("");setLoading(true);
    void refresh();
    const timer=setInterval(()=>{void refresh();},60000);
    return ()=>{stopped=true;controller?.abort();clearInterval(timer);};
  },[projectId,revision]);
  const floors=useMemo(()=> (result?.floorPlans||[]).filter(f=>
    f.reviewStatus==="APPROVED" && f.shapes?.length &&
    (projectId!=="cairo-plaza"||f.sourceFileSha256===DWG_SHA))
      .sort((a,b)=>Number(a.floor)-Number(b.floor)),[result,projectId]);
  const floor=floors.find(f=>f.floor===floorNumber);
  const matches=useMemo(()=>{
    const grouped=new Map<string,Unit[]>();
    for(const unit of result?.units||[]){
      // CAD floors are numeric while live Excel uses labels such as Ground/First.
      // Match exact normalized codes across the project, and require uniqueness.
      // Never mark a matched unit sold-out just because the floor formats differ.
      const k=unitKey(unit.code);
      grouped.set(k,[...(grouped.get(k)||[]),unit]);
    }
    return new Map([...grouped].filter(([,v])=>v.length===1).map(([k,v])=>[k,v[0]]));
  },[result]);
  const entries=(floor?.shapes||[]).map(shape=>{
    const unit=matches.get(unitKey(shape.unitCode));
    return {shape,unit,state:unit?statusOf(unit.status):"soldout" as State};
  });
  const visible=entries.filter(e=>enabled.includes(e.state)&&unitKey(e.shape.unitCode).includes(unitKey(search)));
  const choice=entries.find(e=>unitKey(e.shape.unitCode)===unitKey(selected));
  const vb=(floor?.viewBox||"0 0 1000 1000").split(/\s+/).map(Number);
  const selectedLiveUnit=selectedCadAnchor?matches.get(unitKey(selectedCadAnchor.code)):undefined;
  const selectedState=selectedLiveUnit?statusOf(selectedLiveUnit.status):"soldout";
  const money=(value:string)=>{const price=Number(value.replace(/[,\s]/g,""));return Number.isFinite(price)&&price>0?price.toLocaleString("en-EG")+" EGP":value;};
  return <div className="shell"><Sidebar active="plans" email={email} shared={email==="Private link access"}/><main className="main">
    <header className="header-line"><div>
      <div className="eyebrow">ENGINEERING / ARCHITECTURAL PLANS</div>
      <h1>المخططات التفاعلية</h1>
      <p className="muted">اختار المشروع والدور، ثم استعرض الوحدات حسب حالة المخزون الحالية. تحميل عرض السعر PDF ما زال متاحًا من صفحة العروض.</p>
    </div><button type="button" className="btn soft" disabled={loading||!projectId} onClick={()=>setRevision(v=>v+1)}>{loading?"جاري التحديث...":"تحديث حالة الوحدات"}</button></header>
    <div className="panel" style={{marginBottom:16}}>
      <div className="between" style={{flexWrap:"wrap",gap:16}}>
        <label className="fieldlabel" style={{minWidth:230,flex:1}}>المشروع / Project
          <select className="field" value={projectId} onChange={e=>{setProjectId(e.target.value);setFloorNumber("0");setSelected("");setSearch("");setZoom(1);setCadZoom(1);}}>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="fieldlabel" style={{minWidth:200,flex:1}}>الدور / Floor
          <select className="field" value={floorNumber} onChange={e=>{setFloorNumber(e.target.value);setSelected("");setZoom(1);setCadZoom(1);}}>
            {projectId==="cairo-plaza" ? floorOptions.map(([value,label])=><option key={value} value={value}>{label}</option>) :
              (result?.floorPlans||[]).map(f=><option key={f.id} value={f.floor||""}>{f.name}</option>)}
          </select>
        </label>
      </div>
      <p className="muted" style={{marginTop:12}}>{project?.name||"No project selected"} · {loading?"Loading inventory...":error?"Inventory unavailable":(result?.units?.length||0)+" inventory units"}</p>
      {error&&<div className="notice" role="alert">تعذر قراءة المخزون: {error}. مش هنعتبر أي وحدة Sold Out قبل التأكد من حالة الشيت.</div>}
    </div>
    {projectId==="cairo-plaza" && result && !error &&
      <CairoPlazaInteractiveMap floor={floorNumber} inventory={result.units||[]}
        selected={selected} onSelect={setSelected}/>}
    {projectId==="cairo-plaza" && !error && !result && <div className="panel">جاري تحميل بيانات مخزون كايرو بلازا لعرض ألوان الوحدات.</div>}
    {floor && result && !error ? <section className="panel" style={{marginTop:20}}>
      <h2>حدود الوحدات المعتمدة — {floor.name}</h2>
      <div className="between" style={{gap:12,flexWrap:"wrap"}}>
        <input className="field" style={{maxWidth:250}} placeholder="بحث بكود الوحدة" value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="actionline"><button className="btn soft" onClick={()=>setZoom(x=>Math.max(1,x/1.25))}>−</button><span>{Math.round(zoom*100)}%</span><button className="btn soft" onClick={()=>setZoom(x=>Math.min(4,x*1.25))}>+</button></div>
      </div>
      <div className="actionline" style={{marginTop:12,flexWrap:"wrap"}}>
        {(["available","reserved","closed","soldout"] as State[]).map(s=><label key={s} style={{display:"inline-flex",alignItems:"center",gap:6}}>
          <input type="checkbox" checked={enabled.includes(s)} onChange={()=>setEnabled(v=>v.includes(s)?v.filter(x=>x!==s):[...v,s])}/>
          <span style={{width:12,height:12,background:palette[s],display:"inline-block"}}/>{s} ({entries.filter(e=>e.state===s).length})
        </label>)}
      </div>
      <div style={{overflow:"auto",maxHeight:"75vh",marginTop:16}}>
        <svg viewBox={floor.viewBox} style={{width:zoom*100+"%",height:"auto",minWidth:600,display:"block"}}>
          {floor.backgroundData&&<image href={floor.backgroundData} x={vb[0]} y={vb[1]} width={vb[2]} height={vb[3]} preserveAspectRatio="none"/>}
          {visible.map(({shape,unit,state})=><path key={shape.unitCode} d={shape.d} fill={palette[state]} fillOpacity={0.48} stroke="#263b55" strokeWidth={2} role="button" tabIndex={0} style={{cursor:"pointer"}} onClick={()=>setSelected(shape.unitCode)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setSelected(shape.unitCode);}}><title>{shape.unitCode} — {unit?.status||"Sold Out"}</title></path>)}
        </svg>
      </div>
      {choice&&<p className="notice">{choice.shape.unitCode}: {choice.unit?.status||"Sold Out"} {choice.unit?.area||""} {choice.unit?.price||""}</p>}
    </section> : projectId!=="cairo-plaza" && !loading && !error && <div className="panel">
      <h2>مفيش مخطط منشور للمشروع ده حاليًا</h2>
      <p className="muted">المشروع محدد بشكل صحيح، لكن لازم يتضاف له مخطط هندسي معتمد من إعدادات النظام قبل عرضه.</p>
    </div>}
    
  </main></div>;
}
