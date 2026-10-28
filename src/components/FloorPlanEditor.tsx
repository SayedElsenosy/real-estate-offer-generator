"use client";
import { useEffect, useState } from "react";

type Shape = { unitCode: string; d: string };
type Floor = {
  id: string; name: string; floor: string | null;
  viewBox: string; shapes: Shape[];
  markers?: {code:string;x:number;y:number}[];
  backgroundData?: string | null; reviewStatus?: string;
};
type InventoryUnit = { code: string; status: string };
const CODES = [
  { floor: "-1", label: "Basement", image: "01_basement_preview.png" },
  { floor: "0", label: "Ground", image: "02_ground_preview.png" },
  { floor: "1", label: "First", image: "03_first_preview.png" },
  { floor: "2", label: "Second", image: "04_second_preview.png" },
  { floor: "3", label: "Third", image: "05_third_preview.png" },
  { floor: "4", label: "Fourth", image: "06_fourth_preview.png" },
  { floor: "5", label: "Fifth", image: "07_fifth_preview.png" },
  { floor: "6", label: "Sixth", image: "08_sixth_preview.png" }
];
const empty: Floor = {
  id: "", name: "Cairo Plaza — Basement", floor: "-1",
  viewBox: "0 0 2267.72 1700.79", shapes: [],
  backgroundData: null, reviewStatus: "DRAFT"
};
function available(status: string) {
  return ["available","avail","forsale","متاح","متاحة"].includes(
    status.normalize("NFKC").toLowerCase().replace(/\s+/g,""));
}
export function FloorPlanEditor({ projectId, floors }: { projectId: string; floors: Floor[] }) {
  const [selected, setSelected] = useState<Floor>(() => floors.find(f => f.floor === "-1") || floors[0] || { ...empty });
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState<InventoryUnit[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [floorNumber, setFloorNumber] = useState(() => floors.find(f => f.floor === "-1")?.floor || floors[0]?.floor || "-1");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/inventory?projectId="+encodeURIComponent(projectId), { cache:"no-store" })
      .then(r => r.json()).then(v => { if (!cancelled) setInventory(v.units || []); })
      .catch(() => {});
    return () => { cancelled=true; };
  },[projectId]);
  function choose(value: string) {
    const found = floors.find(f => f.floor === value);
    const item = CODES.find(f => f.floor === value);
    setFloorNumber(value);
    setSelected(found || {
      ...empty, id: "", floor: value, name: (projectId === "cairo-plaza" ? "Cairo Plaza — " : "") + (item?.label || "Floor "+value)
    });
    setReviewed(false); setMessage(""); setSelectedCode("");
  }
  async function imageFile(file: File) {
    if (!["image/png","image/jpeg"].includes(file.type) || file.size > 2*1024*1024)
      return setMessage("Upload PNG or JPG image up to 2MB. Use the exact preview from your mapping package.");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelected(v => ({...v, backgroundData: reader.result as string, reviewStatus: "DRAFT"}));
        setReviewed(false);
        setMessage("Original artwork ready for review. The image is not yet an approved interactive unit map.");
      }
    };
    reader.readAsDataURL(file);
  }
  async function mappingFile(file: File) {
    try {
      const payload = JSON.parse(await file.text()) as {
        reviewStatus?: string;
        floorPlans?: {floor:string; viewBox:string; shapes:Shape[]; name:string}[];
      };
      const mapping = payload.floorPlans?.find(f => String(f.floor) === floorNumber);
      if (!mapping) throw Error("No mapping for floor "+floorNumber+" in JSON export.");
      const codes = new Set<string>();
      for (const shape of mapping.shapes) {
        if (!shape.unitCode || !shape.d || codes.has(shape.unitCode)) throw Error("Invalid or duplicate Unit Code in mapping.");
        codes.add(shape.unitCode);
      }
      setSelected(v => ({
        ...v, viewBox:mapping.viewBox, shapes:mapping.shapes.map(s => ({unitCode:s.unitCode,d:s.d})),
        reviewStatus:"DRAFT"
      }));
      setReviewed(false);
      setMessage(mapping.shapes.length+" polygons imported as DRAFT. Review every actual boundary on the reference image before approving.");
    } catch (e) { setMessage(e instanceof Error?e.message:"Mapping import failed"); }
  }
  async function save() {
    setSaving(true); setMessage("");
    try {
      const state = reviewed && selected.shapes.length ? "APPROVED" : "DRAFT";
      const res = await fetch("/api/floors", {
        method:"POST",headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          ...selected, id:selected.id || undefined,
          projectId, floor: selected.floor,
          reviewStatus:state, approvalConfirmed:reviewed
        })
      });
      const reply = await res.json();
      if (!res.ok) throw Error(reply.error || "Save failed");
      setSelected(v=>({...v,id:reply.floor.id,reviewStatus:reply.floor.reviewStatus}));
      setMessage("Saved "+reply.floor.reviewStatus+". "+reply.floor.shapeCount+" traced polygons. Refresh to load the latest floor.");
    } catch(e) { setMessage(e instanceof Error?e.message:"Save failed"); }
    finally { setSaving(false); }
  }
  const vb=selected.viewBox.trim().split(/\s+/).map(Number);
  const width=vb[2]||2267.72,height=vb[3]||1700.79;
  const unitByCode = new Map(inventory.map(u=>[u.code,u]));
  const hasImage=!!selected.backgroundData;
  return <section className="panel">
    <div className="eyebrow">ARCHITECTURAL FLOOR PLANS — REVIEW WORKFLOW</div>
    <h2 style={{marginTop:12}}>Original artwork & verified unit polygons</h2>
    <p className="muted">The archive importer above uploads all original floor images and source text-location markers automatically. These are not verified unit boundaries. Review exact polygons here before enabling selectable units.</p>
    <div className="stack" style={{gap:13}}>
      <label className="fieldlabel">Floor
        <select className="field" value={floorNumber} onChange={e=>choose(e.target.value)}>
          {CODES.map(c=><option key={c.floor} value={c.floor}>{c.label} / Floor {c.floor}</option>)}
        </select>
      </label>
      <div className="between"><span className="pill">{selected.reviewStatus==="APPROVED"?"APPROVED GEOMETRY":"DRAFT — NEEDS REVIEW"}</span><span className="muted">{selected.shapes.length} proposed boundaries / {(selected.markers || []).length} source labels / {(selected.markers || []).filter(m=>!selected.shapes.some(s=>s.unitCode===m.code)).length} untraced labels</span></div>
      <label className="fieldlabel">Floor title
        <input className="field" value={selected.name} onChange={e=>setSelected(p=>({...p,name:e.target.value}))}/>
      </label>
      <label className="fieldlabel">Original reference preview (PNG/JPG)
        <input className="field" type="file" accept="image/png,image/jpeg" onChange={e=>{const file=e.target.files?.[0];if(file)void imageFile(file);}}/>
      </label>
      <label className="fieldlabel">Reviewed unit polygons (JSON export from OPEN_PREVIEW.html)
        <input className="field" type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];if(file)void mappingFile(file);}}/>
      </label>
      <div className="floor-blank" style={{height:"auto",minHeight:250,padding:8,display:"block"}}>
        {hasImage || selected.shapes.length ?
          <svg viewBox={selected.viewBox} style={{width:"100%",height:"auto",display:"block"}} aria-label={"Reviewed map "+selected.name}>
            {hasImage && <image href={selected.backgroundData || ""} x={vb[0]||0} y={vb[1]||0} width={width} height={height} preserveAspectRatio="none"/>}
            {(selected.markers || []).map((m,i)=>{
              const u=unitByCode.get(m.code);
              const status=u?.status || "SOLD OUT";
              return <g key={"marker-"+i}><circle cx={m.x} cy={m.y} r={9} fill={u?"#c19b5d":"#e24848"} fillOpacity={.6} stroke="#fff" strokeWidth={2}><title>{m.code+" — "+status+" — PDF text location only"}</title></circle></g>;
            })}
            {selected.shapes.map((shape,i)=>{
              const u=unitByCode.get(shape.unitCode);
              const fill=!u?"#d94545":available(u.status)?"#9bc8a7":"#aeb8c6";
              return <path key={i} d={shape.d} fill={fill} fillOpacity={0.38} stroke="#b58b50" strokeWidth={4}
                onClick={()=>setSelectedCode(shape.unitCode)} style={{cursor:"pointer"}}>
                <title>{shape.unitCode+" — "+(u?.status||"SOLD OUT")}</title>
              </path>;
            })}
          </svg> : <div><div className="symbol">⌗</div><p className="muted">Upload the correct floor image from the SVG package to begin.</p></div>}
      </div>
      {selectedCode && <p className="notice">{selectedCode}: {unitByCode.get(selectedCode)?.status || "SOLD OUT — not listed in current inventory"}</p>}
      <div className="notice">RED: drawing-only, not in inventory = Sold Out. GREEN: available in live inventory. GREY: reserved. Original artwork is preserved below the approved overlays. Never use a text-label bounding box as a unit footprint.</div>
      <label style={{display:"flex",alignItems:"flex-start",gap:9,fontSize:12}}>
        <input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} disabled={!selected.shapes.length}/>
        <span>I manually verified every polygon against the original drawing and approve these exact unit boundaries for live selection.</span>
      </label>
      <div className="actionline"><button className="btn" onClick={save} disabled={saving||!selected.name||(selected.shapes.length===0&&!hasImage)}>
        {saving?"Saving…":reviewed?"Approve and publish":"Save draft for review"}</button>
        <button className="btn soft" onClick={()=>choose(floorNumber)}>Reset selection</button></div>
      {message && <p className="notice">{message}</p>}
    </div>
  </section>;
}
