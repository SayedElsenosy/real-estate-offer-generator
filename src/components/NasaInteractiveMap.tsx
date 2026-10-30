"use client";

import { memo,useEffect,useMemo,useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { unitKey } from "@/lib/unit-code";
import type { NasaFloorData } from "@/lib/nasa-floor-source";

type LiveUnit={code:string;floor:string;status:string;area:string;price:string};
type State="available"|"reserved"|"closed"|"unlisted";
const colors:Record<State,{fill:string;en:string;ar:string}>={
  available:{fill:"#31a676",en:"Available",ar:"متاحة"},
  reserved:{fill:"#eab450",en:"Reserved",ar:"محجوزة"},
  closed:{fill:"#91a0b5",en:"Not available",ar:"غير متاحة"},
  unlisted:{fill:"#e45f70",en:"Not in live sheet",ar:"غير موجودة في الشيت"}
};
function stateOf(raw:string):State{
  const s=raw.normalize("NFKC").trim().toLowerCase().replace(/[\s_-]+/g,"");
  if(["available","avail","forsale","متاح","متاحة","متوفر","متوفرة"].includes(s))return "available";
  if(["reserved","booked","booking","محجوز","محجوزة"].includes(s))return "reserved";
  return "closed";
}
function money(raw:string){const n=Number(String(raw||"").replace(/[,\s]/g,""));return Number.isFinite(n)&&n>0?n.toLocaleString("en-EG")+" EGP":"—";}
const labels:Record<string,[string,string]>={
  "-1":["Basement","البدروم"],"0":["Ground","الأرضي"],"1":["First","الأول"],
  "2":["Second","الثاني"],"3":["Third","الثالث"],"4":["Fourth","الرابع"],"5":["Fifth","الخامس"]
};

export const NasaInteractiveMap=memo(function NasaInteractiveMap({
  floor,inventory,selected,onSelect
}:{floor:string;inventory:LiveUnit[];selected:string;onSelect:(unit:string)=>void}){
  const {language}=useLanguage();
  const t=(en:string,ar:string)=>language==="ar"?ar:en;
  const [model,setModel]=useState<NasaFloorData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [zoom,setZoom]=useState(1);
  const [search,setSearch]=useState("");
  const [filter,setFilter]=useState<State|"all">("all");
  useEffect(()=>{
    let active=true;
    const abort=new AbortController();
    setLoading(true);setError("");setModel(null);setZoom(1);setSearch("");setFilter("all");
    void fetch("/api/nasa-plan?floor="+encodeURIComponent(floor),{signal:abort.signal})
      .then(async response=>{
        if(!response.ok)throw Error("NASA floor map could not be loaded ("+response.status+")");
        return response.json() as Promise<NasaFloorData>;
      })
      .then(data=>{if(active){setModel(data);setLoading(false);}})
      .catch(e=>{if(active){setError(e instanceof Error?e.message:"Could not load NASA drawing");setLoading(false);}});
    return ()=>{active=false;abort.abort();};
  },[floor]);
  const units=useMemo(()=>{
    if(!model)return [];
    const byCode=new Map<string,LiveUnit[]>();
    for(const unit of inventory){
      const key=unitKey(unit.code);
      byCode.set(key,[...(byCode.get(key)||[]),unit]);
    }
    return model.units.map(shape=>{
      // A composite, renamed or duplicate sheet code never gets assigned to
      // a nearby drawing polygon by guesswork.
      const candidates=(byCode.get(unitKey(shape.code))||[]).filter(unit=>{
        const floorText=String(unit.floor||"").trim().toLowerCase();
        const num:Record<string,string>={"-1":"basement","0":"ground","1":"first",
          "2":"second","3":"third","4":"fourth","5":"fifth"};
        return !floorText||floorText===num[floor]||floorText===floor||
          (floor==="0"&&floorText.startsWith("ground"))||
          (floor==="-1"&&floorText.startsWith("basement"));
      });
      const live=candidates.length===1?candidates[0]:null;
      return {shape,live,status:live?stateOf(live.status):"unlisted" as State};
    });
  },[model,inventory,floor]);
  const byId=unitKey(selected);
  const chosen=units.find(x=>unitKey(x.shape.code)===byId);
  const query=unitKey(search);
  const shown=units.filter(x=>(!query||unitKey(x.shape.code).includes(query))&&(filter==="all"||x.status===filter));
  const counts=units.reduce((a,x)=>(a[x.status]++,a),
    {available:0,reserved:0,closed:0,unlisted:0} as Record<State,number>);
  const title=labels[floor]||["Floor","الدور"];
  return <section className="panel" style={{marginBottom:20}}>
    <div style={{display:"flex",gap:14,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",marginBottom:15}}>
      <div>
        <div className="eyebrow">{t("NASA / SVG FLOOR PLAN","ناسا / مخطط SVG")}</div>
        <h2 style={{margin:"8px 0"}}>{t("Interactive plan — ","المخطط التفاعلي — ")}{t(title[0],title[1])}</h2>
        <p className="muted">{t("Click a colored unit outline to view its live inventory details.","اضغط على حدود الوحدة الملونة لعرض بياناتها المباشرة من الشيت.")}</p>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:7}}>
        <button type="button" className="btn soft" onClick={()=>setZoom(z=>Math.max(1,z-0.25))}>−</button>
        <strong style={{minWidth:52,textAlign:"center"}}>{Math.round(zoom*100)}%</strong>
        <button type="button" className="btn soft" onClick={()=>setZoom(z=>Math.min(4,z+0.25))}>+</button>
        <button type="button" className="btn soft" onClick={()=>setZoom(1)}>{t("Reset","إعادة الضبط")}</button>
      </div>
    </div>
    <div className="notice" style={{marginBottom:14,background:"#fff8e9",borderColor:"#f1dcaa"}}>
      {t("Engineering notice: all 668 outlines were approximately traced from PDF images, not CAD. Orange outlines require extra review. Only the live sheet supplies sale prices, availability and official areas.","تنبيه هندسي: جميع حدود الوحدات الـ668 مرسومة تقريبياً من صور PDF وليست CAD أصلي. الحدود البرتقالية تحتاج مراجعة إضافية. الأسعار والحالات والمساحات المعتمدة تأتي فقط من الشيت.")}
    </div>
    {loading&&<div className="panel">{t("Loading NASA floor plan…","جارٍ تحميل مخطط ناسا…")}</div>}
    {error&&<div className="notice" role="alert">{error}</div>}
    {model&&<>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:14}}>
        <input className="field" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={t("Search unit code","ابحث بكود الوحدة")} style={{width:235,maxWidth:"100%"}}/>
        <button type="button" onClick={()=>setFilter("all")} style={{padding:"7px 11px",borderRadius:99,border:"1px solid #cbd5e1",background:filter==="all"?"#e6edf5":"white",cursor:"pointer"}}>
          {t("All","الكل")} ({units.length})
        </button>
        {(Object.keys(colors) as State[]).map(state=><button type="button" key={state}
          onClick={()=>setFilter(v=>v===state?"all":state)}
          style={{padding:"7px 11px",borderRadius:99,border:filter===state?"2px solid #243953":"1px solid #cbd5e1",background:"white",cursor:"pointer",display:"inline-flex",gap:7,alignItems:"center"}}>
          <span style={{width:10,height:10,borderRadius:"50%",background:colors[state].fill}}/>
          {t(colors[state].en,colors[state].ar)} ({counts[state]})
        </button>)}
      </div>
      <div style={{overflow:"auto",maxHeight:"75vh",border:"1px solid #d9e0e8",borderRadius:14,background:"white"}}>
        <svg viewBox={model.viewBox} style={{display:"block",width:zoom*100+"%",minWidth:720,height:"auto"}} role="img"
          aria-label={t("NASA interactive floor plan","مخطط ناسا التفاعلي")}>
          <image href={model.image} x="0" y="0" width="792" height="612" preserveAspectRatio="none"/>
          {units.map(({shape,status})=>{
            const active=unitKey(selected)===unitKey(shape.code);
            const visible=(!query||unitKey(shape.code).includes(query))&&(filter==="all"||filter===status);
            return <path key={shape.code} d={shape.d} role="button" tabIndex={0}
              fill={active?"#d7a24c":colors[status].fill}
              fillOpacity={active?0.75:visible?0.38:0.08}
              stroke={active?"#a56d16":shape.review?"#bb7326":"#243852"}
              strokeWidth={active?2.0:shape.review?1.0:0.70}
              strokeLinejoin="round" style={{cursor:"pointer",outline:"none"}}
              onClick={()=>onSelect(shape.code)}
              onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(shape.code);}}}>
              <title>{shape.code} — {t(colors[status].en,colors[status].ar)}{shape.review?" · "+t("Review","مراجعة"):""}</title>
            </path>;
          })}
        </svg>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12,marginTop:16}}>
        <div style={{borderRadius:12,background:"#f1f5f9",padding:16}}>
          <strong>{t("Shapes","حدود الوحدات")}: {model.units.length}</strong>
          <p className="muted">{t("Live sheet matches","وحدات مطابقة في الشيت")}: {units.filter(x=>x.live).length}</p>
          <p className="muted">{t("Outlines flagged for review","حدود تحتاج مراجعة")}: {model.units.filter(x=>x.review).length}</p>
          {search&&<p>{t("Search results","نتائج البحث")}: {shown.length}</p>}
          {query&&shown.slice(0,12).map(x=><button type="button" key={x.shape.code}
            style={{border:"1px solid #cbd5e1",borderRadius:6,padding:"4px 6px",margin:3,background:"white",cursor:"pointer"}}
            onClick={()=>onSelect(x.shape.code)}>{x.shape.code}</button>)}
        </div>
        <div style={{border:"1px solid #dce3eb",borderRadius:12,padding:16}}>
          {chosen?<div>
            <div className="between"><strong>{t("Selected unit","الوحدة المختارة")}</strong>
              <button className="btn soft" onClick={()=>onSelect("")}>{t("Close","إغلاق")}</button>
            </div>
            <h2 dir="ltr">{chosen.shape.code}</h2>
            <p>{t("Status","الحالة")}: <strong>{t(colors[chosen.status].en,colors[chosen.status].ar)}</strong></p>
            <p>{t("Area from live sheet","المساحة من الشيت")}: {chosen.live?.area?chosen.live.area+" m²":"—"}</p>
            <p>{t("Current price","السعر الحالي")}: <strong>{money(chosen.live?.price||"")}</strong></p>
            {chosen.shape.review&&<p className="muted">{t("Unit outline needs visual engineering review.","حدود الوحدة تحتاج مراجعة هندسية بصرية.")}</p>}
            {!chosen.live&&<p className="muted">{t("No matching code/floor in the connected NASA inventory; no price or availability has been inferred.","لا يوجد كود ودور مطابقان في مخزون ناسا؛ لم يتم تخمين أي سعر أو حالة.")}</p>}
          </div>:<p className="muted">{t("Choose a unit on the drawing to see its information.","اختر وحدة من المخطط لمشاهدة تفاصيلها.")}</p>}
        </div>
      </div>
    </>}
  </section>;
});
