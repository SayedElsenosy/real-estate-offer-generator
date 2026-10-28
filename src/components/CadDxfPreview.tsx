"use client";
import { useMemo, useState } from "react";
import { unitKey } from "@/lib/unit-code";

export type CadLabel = {code:string;floor:string;x:number;y:number};
type Segment={d:string};
type CadPreview={labels:CadLabel[];lines:Segment[]};
const floorOf:Record<string,string>={BA:"-1",GR:"0",FR:"1","2ND":"2","3RD":"3","4TH":"4","5TH":"5","6TH":"6"};
const CODE=/\b[A-Z]\/(?:BA|GR|FR|2ND|3RD|4TH|5TH|6TH)\/[A-Z0-9]+\/[0-9]{1,3}(?:-?[A-Z])?\b/gi;
type Pair={code:number;value:string};
function parsePairs(input:string):Pair[]{
  const rows=input.replace(/\r/g,"").split("\n");const out:Pair[]=[];
  for(let i=0;i+1<rows.length;i+=2){const code=Number(rows[i].trim());if(Number.isInteger(code))out.push({code,value:rows[i+1].trim()});}
  return out;
}
function field(p:Pair[],n:number){return p.find(v=>v.code===n)?.value||"";}
function num(p:Pair[],n:number){return Number(field(p,n));}
function extractEntities(pairs:Pair[]){
  const entities:Pair[][]=[];let active=false;let part:Pair[]=[];
  for(let i=0;i<pairs.length;i++){
    const p=pairs[i];
    if(p.code===0&&p.value==="SECTION"&&pairs[i+1]?.value==="ENTITIES"){active=true; i++;continue;}
    if(active&&p.code===0&&p.value==="ENDSEC")break;
    if(!active)continue;
    if(p.code===0){if(part.length)entities.push(part);part=[p];}else part.push(p);
  }
  if(part.length)entities.push(part);
  return entities;
}
export function parseCadDxf(source:string):CadPreview {
  if(source.length>50_000_000)throw Error("DXF exceeds the supported 50 MB limit.");
  const pairs=parsePairs(source);
  if(!pairs.some(p=>p.code===2&&p.value==="ENTITIES"))throw Error("No DXF ENTITIES section.");
  const labels:CadLabel[]=[];const lines:Segment[]=[];
  let currentText="";let textX=0,textY=0;
  const collectText=(entity:Pair[])=>{
    const type=entity[0].value;
    const raw=entity.filter(p=>p.code===1||p.code===3).map(p=>p.value).join(" ");
    const x=num(entity,10),y=num(entity,20);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    for(const match of raw.matchAll(CODE)){
      const code=match[0].toUpperCase();
      const fl=floorOf[code.split("/")[1]];if(fl)labels.push({code,floor:fl,x,y});
    }
  };
  for(const e of extractEntities(pairs)){
    const type=e[0]?.value;
    if(type==="TEXT"||type==="MTEXT"){collectText(e);continue;}
    if(type==="LINE"){
      const x=num(e,10),y=num(e,20),x2=num(e,11),y2=num(e,21);
      if([x,y,x2,y2].every(Number.isFinite))lines.push({d:`M${x} ${-y}L${x2} ${-y2}`});
    }else if(type==="LWPOLYLINE"){
      const pts:{x:number;y:number}[]=[];let x:number|undefined;
      for(const p of e){if(p.code===10)x=Number(p.value);if(p.code===20&&x!==undefined){pts.push({x,y:Number(p.value)});x=undefined;}}
      if(pts.length>1&&pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))){
        lines.push({d:pts.map((p,i)=>(i?"L":"M")+p.x+" "+(-p.y)).join("")+(Number(field(e,70))&1?"Z":"")});
      }
    }
  }
  if(!labels.length)throw Error("No recognizable unit codes found in DXF.");
  return {labels,lines};
}
export function CadDxfPreview({floor,inventory,selected,onSelect}:{floor:string;inventory:{code:string;floor:string;status:string}[];selected:string;onSelect:(code:string)=>void}){
  const [cad,setCad]=useState<CadPreview|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [zoom,setZoom]=useState(1);
  const labels=useMemo(()=>cad?.labels.filter(v=>v.floor===floor)||[],[cad,floor]);
  const bounds=useMemo(()=>{
    if(!labels.length)return null;
    const xs=labels.map(v=>v.x),ys=labels.map(v=>v.y);
    return {left:Math.min(...xs)-15,right:Math.max(...xs)+15,
      top:-(Math.max(...ys)+15),bottom:-(Math.min(...ys)-15)};
  },[labels]);
  const matched=useMemo(()=>{
    const m=new Map<string,{status:string}[]>();
    for(const u of inventory.filter(u=>u.floor===floor)){const k=unitKey(u.code);m.set(k,[...(m.get(k)||[]),u]);}
    return new Map([...m].filter(([,items])=>items.length===1).map(([key,items])=>[key,items[0]]));
  },[inventory,floor]);
  const color=(code:string)=>{
    const unit=matched.get(unitKey(code));
    if(!unit)return "#df5260";
    const s=unit.status.normalize("NFKC").toLowerCase().replace(/[\s_-]/g,"");
    if(["available","avail","forsale","متاح","متاحة","متوفر","متوفرة"].includes(s))return "#45ad78";
    if(["reserved","booked","محجوز","محجوزة"].includes(s))return "#f0b95f";
    return "#8e99aa";
  };
  async function upload(file:File){
    setBusy(true);setError("");
    try{
      if(file.size>50_000_000)throw Error("DXF is over 50 MB.");
      const result=parseCadDxf(await file.text());
      setCad(result);
    }catch(e){setError(e instanceof Error?e.message:String(e));setCad(null);}
    finally{setBusy(false);}
  }
  return <section className="panel" style={{marginTop:20}}>
    <h2>Original engineering DXF preview / معاينة المخطط الهندسي</h2>
    <p className="muted">Preview only: colored code markers are not approved unit boundaries. Source DXF is processed locally in the browser; it is not uploaded or saved.</p>
    <label className="fieldlabel">Engineering DXF
      <input className="field" type="file" accept=".dxf" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);}}/>
    </label>
    {error&&<p className="notice">{error}</p>}
    {cad&&<p className="muted">{labels.length} CAD code labels on floor {floor}. Geometry remains unapproved.</p>}
    {bounds&&cad&&<><div className="actionline" style={{marginTop:12}}>
      <button className="btn soft" onClick={()=>setZoom(v=>Math.max(1,v/1.25))}>−</button>
      <span>{Math.round(zoom*100)}%</span>
      <button className="btn soft" onClick={()=>setZoom(v=>Math.min(5,v*1.25))}>+</button>
      <button className="btn soft" onClick={()=>setZoom(1)}>Reset</button>
    </div><div style={{maxHeight:650,overflow:"auto",marginTop:12,background:"#f8fafc"}}>
      <svg viewBox={`${bounds.left} ${bounds.top} ${bounds.right-bounds.left} ${bounds.bottom-bounds.top}`}
        style={{display:"block",width:`${zoom*100}%`,minWidth:650,height:"auto"}}>
        <g fill="none" stroke="#64748b" strokeWidth=".13" opacity=".7">
          {cad.lines.map((line,i)=><path key={i} d={line.d}/>)}
        </g>
        {labels.map((label,i)=><g key={i} transform={`translate(${label.x} ${-label.y})`} role="button" tabIndex={0}
          onClick={()=>onSelect(label.code)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(label.code);}}}
          style={{cursor:"pointer"}}>
          <circle r={selected===label.code?2.6:1.65} fill={color(label.code)} stroke="#fff" strokeWidth=".3"/>
          <title>{label.code} — {matched.get(unitKey(label.code))?.status||"Sold Out (not in Sheet1)"}</title>
        </g>)}
      </svg>
    </div></>}
  </section>;
}
