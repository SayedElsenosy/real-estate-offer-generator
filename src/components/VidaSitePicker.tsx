"use client";
import {vidaSiteBuildings,vidaHotspotPoints,VIDA_SITE_WIDTH,VIDA_SITE_HEIGHT} from "@/lib/vida-site-map";

type Props={
  selectedBuilding:number;
  selectedPhase:1|2;
  onSelectBuilding:(id:number)=>void;
  language:"ar"|"en";
  availableByBuilding?:ReadonlyMap<number,number>;
};
/** A clickable overlay on the FULL user-uploaded Vida masterplan. */
export function VidaSitePicker({selectedBuilding,selectedPhase,onSelectBuilding,language,availableByBuilding}:Props){
 const ar=language==="ar";
 return <div style={{width:"100%",maxWidth:770,margin:"0 auto"}}>
   <svg viewBox={`0 0 ${VIDA_SITE_WIDTH} ${VIDA_SITE_HEIGHT}`}
     role="group" aria-label={ar?"المخطط العام التفاعلي لجميع مباني فيدا":"Interactive Vida full-site masterplan with selectable buildings"}
     style={{display:"block",width:"100%",borderRadius:12,background:"#edf3ee",touchAction:"manipulation"}}>
     <image href="/api/vida/artwork?phase=1&page=site" x={0} y={0}
       width={VIDA_SITE_WIDTH} height={VIDA_SITE_HEIGHT}
       preserveAspectRatio="xMidYMid meet"/>
     {vidaSiteBuildings.map(s=>{
       const selected=s.id===selectedBuilding;
       const other=s.phase!==selectedPhase && s.phase!==3;
       const disabled=s.phase===3;
       const name=(ar?"مبنى ":"Building ")+s.id+" — "+(ar?"المرحلة ":"Phase ")+s.phase;
       const count=availableByBuilding?.get(s.id)||0;
       return <g key={s.id}>
         <polygon role="button" tabIndex={0} aria-label={name+(disabled?(ar?"، خارج نطاق البروشورات":" — brochure not provided"):"")}
           aria-pressed={selected}
           points={vidaHotspotPoints(s)}
           fill={selected?"#f1a521":other?"#94a3b8":disabled?"#64748b":"#24a56d"}
           fillOpacity={selected ? 0.30 : other ? 0.05 : disabled ? 0.09 : 0.055}
           stroke={selected?"#ca7517":other?"#7f8b98":disabled?"#8d929a":"#116b51"}
           strokeOpacity={selected ? 1 : other ? 0.24 : disabled ? 0.32 : 0.48}
           strokeWidth={selected?4:other?1.2:1.7}
           strokeDasharray={disabled?"5 5":undefined}
           style={{cursor:"pointer",outline:"none"}}
           onClick={()=>onSelectBuilding(s.id)}
           onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelectBuilding(s.id);}}}>
           <title>{name} · {count} {ar?"وحدة في المخزون":"inventory units"}</title>
         </polygon>
         {selected&&<>
           <ellipse cx={s.cx} cy={s.cy} rx={s.rx+7} ry={s.ry+7}
             fill="none" stroke="#fff" strokeWidth={6} opacity={.86} pointerEvents="none"/>
           <ellipse cx={s.cx} cy={s.cy} rx={s.rx+7} ry={s.ry+7}
             fill="none" stroke="#d17c0a" strokeWidth={4} pointerEvents="none"/>
         </>}
       </g>;
     })}
   </svg>
   <p className="muted" style={{marginTop:9,fontSize:12}}>
     {ar?"اضغط على المبنى من الصورة؛ التحديد البرتقالي يوضح المبنى المختار. حدود النقر تقريبية على الصورة الأصلية وليست حدودًا هندسية معتمدة.":"Tap a building on the original site photo. Orange marks the selected building. Interactive hotspots are visual references, not certified construction boundaries."}
   </p>
 </div>;
}
