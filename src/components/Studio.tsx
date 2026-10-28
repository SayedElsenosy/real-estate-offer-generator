"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { unitKey } from "@/lib/unit-code";
import { useLanguage } from "@/components/LanguageProvider";

type Unit = { code: string; price: string; area: string; floor: string; status: string; project: string };
type Plan = { id: string; name: string; downPaymentPct: string; maintenancePct: string; months: number; startOffsetMonths: number; deliveryDate?: string | null; deliveryCollectionPct?: string; deliveryCollectionEnabled?: boolean };
type Project = { id: string; slug: string; name: string; paymentPlans: Plan[] };
type Shape = { unitCode: string; d: string };
type Floor = { id: string; name: string; floor: string | null; viewBox: string; shapes: Shape[]; markers?: {code:string;x:number;y:number}[]; backgroundData?: string | null; reviewStatus?: string };
function isAvailable(status: string): boolean {
  const normalized = String(status).normalize("NFKC").trim().toLowerCase().replace(/\s+/g,"");
  return ["available","avail","forsale","متاح","متاحة","متوفر","متوفرة"].includes(normalized);
}
function nicePrice(value: string) {
  const x = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(x) && x > 0 ? x.toLocaleString("en-EG") + " EGP" : value || "—";
}
export default function Studio({ projects, email }: { projects: Project[]; email: string }) {
  const { tr } = useLanguage();
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [units, setUnits] = useState<Unit[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [floorNumber, setFloorNumber] = useState("");
  const [selected, setSelected] = useState("");
  const [chosenPlans, setChosenPlans] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const project = projects.find(p => p.id === projectId);
  const unit = units.find(value => value.code === selected && value.floor === floorNumber);
  const floor = floors.find(f => f.floor === (unit?.floor ?? floorNumber)) || floors[0];
  const vb = floor?.viewBox?.trim().split(/\s+/).map(Number) || [0,0,1000,700];
  const visibleUnits = useMemo(() => units.filter(item =>
    (item.code + " " + item.floor).toLowerCase().includes(search.toLowerCase())).slice(0, 100), [units, search]);
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true); setError(""); setUnits([]); setSelected(""); setChosenPlans([]); setFloors([]);
    fetch("/api/inventory?projectId=" + encodeURIComponent(projectId), { cache: "no-store" })
      .then(async r => { const response = await r.json(); if (!cancelled) {
        setUnits(response.units || []); setFloors(response.floorPlans || []);
        if (response.error) setError(response.error);
      } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? tr(err.message) : tr("Inventory request failed")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);
  function selectUnit(code: string, floorCode?: string) {
    const candidates = units.filter(u => unitKey(u.code) === unitKey(code) && (floorCode === undefined || u.floor === floorCode));
    const exact = candidates.find(u => u.code === code);
    const match = exact || (candidates.length === 1 ? candidates[0] : undefined);
    if (!match || !isAvailable(match.status)) return;
    setSelected(match.code);
    setFloorNumber(match.floor);
  }
  async function issueOffer() {
    if (!unit || !chosenPlans.length || generating) return;
    setGenerating(true); setError("");
    try {
      const response = await fetch("/api/offers", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, unitCode: unit.code, unitFloor: unit.floor, planIds: chosenPlans }) });
      if (!response.ok) {
        const message = await response.json();
        throw new Error(message.error || "PDF generation failed");
      }
      const objectURL = URL.createObjectURL(await response.blob());
      const element = document.createElement("a");
      element.href = objectURL;
      element.download = "Property-Offer-" + unit.code.replace(/[^a-z0-9_-]/gi, "_") + ".pdf";
      element.click();
      setTimeout(() => URL.revokeObjectURL(objectURL), 3000);
    } catch (err) {
      setError(err instanceof Error ? tr(err.message) : tr("Could not generate proposal"));
    } finally { setGenerating(false); }
  }
  const toggle = (id: string, checked: boolean) => setChosenPlans(ids => checked ? [...ids, id] : ids.filter(x => x !== id));
  return <div className="shell"><Sidebar active="studio" email={email} /><main className="main">
    <header className="header-line"><div><div className="eyebrow">{tr("OFFER STUDIO / LIVE INVENTORY")}</div><h1>{tr("Build a property offer")}</h1><p className="muted">{tr("Pick a project, inspect a unit and include one or more financial scenarios.")}</p></div>
      <div style={{ minWidth: 230 }}><label className="fieldlabel">{tr("ACTIVE PROJECT")}
        <select className="field" value={projectId} onChange={e => setProjectId(e.target.value)}>
          {projects.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select></label></div>
    </header>
    {error && <div className="notice" style={{marginBottom:18}}>{error}</div>}
    <div className="metrics">
      <div className="metric"><div className="eyebrow">{tr("LIVE INVENTORY")}</div><strong>{loading ? tr("Loading…") : units.length}</strong><span className="muted">{tr("Units returned by the authorized Google account")}</span></div>
      <div className="metric"><div className="eyebrow">{tr("SELECTED PROPERTY")}</div><strong>{unit?.code || "—"}</strong><span className="muted">{unit?.area ? unit.area + " m²" : tr("Select a unit to continue")}</span></div>
      <div className="metric"><div className="eyebrow">{tr("LISTED UNIT PRICE")}</div><strong>{unit ? nicePrice(unit.price) : "—"}</strong><span className="muted">{tr("Fetched at selection, refreshed at PDF creation")}</span></div>
    </div>
    <div className="grid2">
      <div className="stack">
        <section className="panel"><div className="panelhead"><div><div className="eyebrow">{tr("CURRENT INVENTORY")}</div><h2 style={{marginTop:10}}>{tr("Find your property")}</h2></div><span className="pill">{units.length} {tr("total")}</span></div>
          <input className="field" placeholder={tr("Search Unit Code or floor...")} value={search} onChange={e => setSearch(e.target.value)} style={{marginBottom:15}} />
          <div className="list">{visibleUnits.map(value => <button type="button" key={value.code+"::"+value.floor} className={"unit" + (value.code === selected ? " active" : "")}
            disabled={!isAvailable(value.status)} onClick={() => selectUnit(value.code, value.floor)}>
            <span><b>{value.code}</b><small>{tr("Floor")} {value.floor || "—"} · {value.area || "—"} m²</small></span>
            <span style={{textAlign:"right"}}><b>{nicePrice(value.price)}</b><small>{tr(value.status)}</small></span>
          </button>)}
          {!visibleUnits.length && <p className="muted">{tr(loading ? "Loading authorized inventory…" : "No matching live inventory. Confirm the Sheet connection in Settings.")}</p>}</div>
          {units.length > 100 && <p className="muted">{tr("Showing the first 100 matches. Use search to narrow the results.")}</p>}
        </section>
        <section className="panel">
          <div className="panelhead">
            <div><div className="eyebrow">{tr("ARCHITECTURAL MAP")}</div><h2 style={{marginTop:10}}>{tr("Interactive floor plan")}</h2></div>
            <span className="pill">{tr(floor?.reviewStatus === "APPROVED" ? "Verified shapes" : "Review mode")}</span>
          </div>
          {floors.length > 0 && <label className="fieldlabel" style={{display:"block",marginBottom:14}}>
            {tr("SHOW FLOOR")}
            <select className="field" value={floor?.floor || ""} onChange={e=>{setFloorNumber(e.target.value);setSelected("");}}>
              {floors.map(f=><option value={f.floor || ""} key={f.id}>{f.name} — {tr("Floor")} {f.floor}</option>)}
            </select>
          </label>}
          {floor && (floor.backgroundData || floor.shapes.length) ?
            <svg className="floor-svg" viewBox={floor.viewBox} role="img" aria-label={tr("ARCHITECTURAL MAP")}>
              {floor.backgroundData && <image href={floor.backgroundData} x={vb[0]} y={vb[1]} width={vb[2]} height={vb[3]} preserveAspectRatio="none"/>}
              {(floor.markers || []).map((m,i)=>{
                const candidates=units.filter(value=>value.floor===floor.floor&&unitKey(value.code)===unitKey(m.code));
                const u=candidates.length===1?candidates[0]:undefined;
                const status=u?.status || "SOLD OUT";
                return <circle key={"source-label-"+i} cx={m.x} cy={m.y} r={9}
                  fill={u?"#c2a064":"#e34545"} fillOpacity={.72}
                  stroke="#ffffff" strokeWidth={2} aria-label={m.code+" "+status}>
                    <title>{m.code+" · "+status+" · label location (not unit boundary)"}</title>
                  </circle>;
              })}
              {floor.shapes.map((shape,i)=>{
                const candidates=units.filter(value=>value.floor===floor.floor&&unitKey(value.code)===unitKey(shape.unitCode));
                const known=candidates.length===1?candidates[0]:undefined;
                const blocked = !known || !isAvailable(known.status);
                const approved = floor.reviewStatus === "APPROVED";
                return <path key={i} d={shape.d}
                  fill={!known?"#efaaaa":blocked?"#d3d9e1":unitKey(shape.unitCode)===unitKey(selected)?"#c5a16a":"#d8e8df"}
                  stroke={approved?"#32465d":"#1b78b9"} strokeWidth={approved?3:2.5}
                  strokeDasharray={approved?undefined:"8 5"}
                  fillOpacity={approved?.42:.16}
                  style={{cursor:approved&&!blocked?"pointer":"default",pointerEvents:approved?"auto":"none"}}
                  tabIndex={approved&&!blocked?0:-1} role="img"
                  aria-label={"Unit "+shape.unitCode+" "+(known?.status||"Sold Out")+(approved?" approved":" draft")}
                  onClick={approved?()=>selectUnit(shape.unitCode, floor.floor || undefined):undefined}
                  onKeyDown={approved?(e)=>{if(e.key==="Enter"||e.key===" ")selectUnit(shape.unitCode, floor.floor || undefined);}:undefined}>
                  <title>{shape.unitCode+" · "+(known?.status||"SOLD OUT")+(approved?"":" · PROPOSED OUTLINE (NOT SELECTABLE)")}</title>
                </path>;
              })}            </svg> :
            <div className="floor-blank"><div><div className="symbol">⌗</div><h2>{tr("Floor plan not published")}</h2>
              <p className="muted">{tr("The original architectural image and reviewed unit boundaries will appear here after a floor is saved in Workspace Settings.")}</p>
            </div></div>}
          {floor?.reviewStatus !== "APPROVED" && floor?.backgroundData && <p className="notice">{tr("Draft review: proposed boundaries are shown as dashed blue lines alongside source code-label markers. Red = SOLD OUT if absent from live inventory. These outlines are NOT selectable until approved.")}</p>}
          <p className="muted">{tr("Gold: selected. Green: available. Grey: reserved. Red: SOLD OUT if the drawn unit is absent from current inventory. Only approved outlines are interactive.")}</p>
        </section>
      </div>
      <div className="stack">
        <section className="panel"><div className="eyebrow">{tr("PROPERTY SUMMARY")}</div><h2 style={{marginTop:12}}>{unit ? unit.code : tr("Select a unit")}</h2>
          {unit ? <>
            {([["Project", project?.name || "—"],["Unit Code",unit.code],["Floor",unit.floor || "—"],["Area",unit.area ? unit.area+" sqm":"—"],["Status",tr(unit.status)],["Price",nicePrice(unit.price)]] as [string,string][]).map(([label,value]) =>
              <div className="detailrow" key={label}><span>{tr(label)}</span><b>{value}</b></div>)}
          </> : <p className="muted">{tr("Current price, location and availability appear here once you select a unit.")}</p>}
        </section>
        <section className="panel"><div className="eyebrow">{tr("CUSTOM TERMS")}</div><h2 style={{marginTop:12}}>{tr("Payment plan options")}</h2><p className="muted">{tr("Each selected plan produces its own detailed payment schedule in the proposal PDF.")}</p>
          {project?.paymentPlans.map(plan => <label className="planrow" key={plan.id}>
            <input type="checkbox" checked={chosenPlans.includes(plan.id)} disabled={!unit || (chosenPlans.length >= 5 && !chosenPlans.includes(plan.id))}
              onChange={event => toggle(plan.id, event.target.checked)} />
            <span><b style={{fontSize:13}}>{plan.name}</b><small style={{display:"block",fontSize:11,marginTop:6,color:"#8390a2"}}>{plan.downPaymentPct}% {tr("Down payment %")} · {plan.months} {tr("Installment months")} · {plan.maintenancePct}% {tr("Maintenance %")}{plan.deliveryDate ? " · " + tr("Delivery date") + ": " + plan.deliveryDate : ""}{plan.deliveryCollectionEnabled ? " · " + plan.deliveryCollectionPct + "% " + tr("Collection at delivery %") : ""}</small></span>
          </label>)}
          {!project?.paymentPlans.length && <div className="notice">{tr("No plans yet. An administrator can add a plan (such as 10% down / 80 months) in Workspace Settings.")}</div>}
          <button className="btn gold" style={{width:"100%",marginTop:18}} disabled={!unit || chosenPlans.length===0 || generating} onClick={issueOffer}>
            {tr(generating ? "Rendering proposal…" : "Generate premium PDF offer")}
          </button>
          <p className="muted" style={{fontSize:11}}>{tr("The server checks live price and availability again before producing the PDF.")}</p>
        </section>
        <section className="panel">
          <div className="eyebrow">{tr("PROPOSAL DELIVERY")}</div>
          <p className="muted">{tr("We request read-only access to Sheets and Drive (for Cairo Plaza's original Excel file). No public sharing or publish-to-web is necessary. Every issued proposal preserves a snapshot of its terms.")}</p>
          <Link href="/admin" style={{fontSize:12,color:"#aa8450"}}>{tr("Configure Sheets, plans and floor layouts")}</Link>
        </section>
      </div>
    </div>
  </main></div>;
}
