"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";

type Unit = { code: string; price: string; area: string; floor: string; status: string; project: string };
type Plan = { id: string; name: string; downPaymentPct: string; maintenancePct: string; months: number; startOffsetMonths: number };
type Project = { id: string; slug: string; name: string; paymentPlans: Plan[] };
type Shape = { unitCode: string; d: string };
type Floor = { id: string; name: string; floor: string | null; viewBox: string; shapes: Shape[] };
type History = { id: string; unitCode: string; issuedAt: string; status: string; project: { name: string } };
function unavailable(status: string): boolean {
  return ["booked","sold","reserved","unavailable","مباع","محجوز"].includes(status.trim().toLowerCase());
}
function nicePrice(value: string) {
  const x = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(x) && x > 0 ? x.toLocaleString("en-EG") + " EGP" : value || "—";
}
export default function Studio({ projects, email }: { projects: Project[]; email: string }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [units, setUnits] = useState<Unit[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selected, setSelected] = useState("");
  const [chosenPlans, setChosenPlans] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<History[]>([]);
  const project = projects.find(p => p.id === projectId);
  const unit = units.find(value => value.code === selected);
  const floor = floors.find(f => f.floor === unit?.floor) || floors.find(f => !f.floor) || floors[0];
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
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : "Inventory request failed"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);
  useEffect(() => {
    fetch("/api/offers", { cache: "no-store" }).then(r => r.ok ? r.json() : null)
      .then(result => { if (result?.offers) setHistory(result.offers); }).catch(() => {});
  }, []);
  function selectUnit(code: string) {
    const match = units.find(u => u.code === code);
    if (!match || unavailable(match.status)) return;
    setSelected(code);
  }
  async function issueOffer() {
    if (!unit || !chosenPlans.length || generating) return;
    setGenerating(true); setError("");
    try {
      const response = await fetch("/api/offers", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, unitCode: unit.code, planIds: chosenPlans }) });
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
      const r = await fetch("/api/offers", { cache: "no-store" });
      if (r.ok) setHistory((await r.json()).offers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate proposal");
    } finally { setGenerating(false); }
  }
  const toggle = (id: string, checked: boolean) => setChosenPlans(ids => checked ? [...ids, id] : ids.filter(x => x !== id));
  return <div className="shell"><Sidebar active="studio" email={email} /><main className="main">
    <header className="header-line"><div><div className="eyebrow">OFFER STUDIO / LIVE INVENTORY</div><h1>Build a property offer</h1><p className="muted">Pick a project, inspect a unit and include one or more financial scenarios.</p></div>
      <div style={{ minWidth: 230 }}><label className="fieldlabel">ACTIVE PROJECT
        <select className="field" value={projectId} onChange={e => setProjectId(e.target.value)}>
          {projects.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select></label></div>
    </header>
    {error && <div className="notice" style={{marginBottom:18}}>{error}</div>}
    <div className="metrics">
      <div className="metric"><div className="eyebrow">LIVE INVENTORY</div><strong>{loading ? "Loading…" : units.length}</strong><span className="muted">Units returned by the authorized Google account</span></div>
      <div className="metric"><div className="eyebrow">SELECTED PROPERTY</div><strong>{unit?.code || "—"}</strong><span className="muted">{unit?.area ? unit.area + " m²" : "Select a unit to continue"}</span></div>
      <div className="metric"><div className="eyebrow">LISTED UNIT PRICE</div><strong>{unit ? nicePrice(unit.price) : "—"}</strong><span className="muted">Fetched at selection, refreshed at PDF creation</span></div>
    </div>
    <div className="grid2">
      <div className="stack">
        <section className="panel">
          <div className="panelhead"><div><div className="eyebrow">ARCHITECTURAL MAP</div><h2 style={{marginTop:10}}>Interactive floor plan</h2></div><span className="pill">{floor?.name || "Not configured"}</span></div>
          {floor?.shapes?.length ? <svg className="floor-svg" viewBox={floor.viewBox} role="img" aria-label="Selectable floor map">
            {floor.shapes.map((shape, i) => {
              const known = units.find(value => value.code === shape.unitCode);
              const blocked = !known || unavailable(known.status);
              return <path key={i} d={shape.d} stroke="#314763" strokeWidth="2"
                fill={blocked ? "#d3d9e1" : shape.unitCode === selected ? "#c5a16a" : "#d8e8df"}
                style={{ cursor: blocked ? "not-allowed" : "pointer", transition: "fill 150ms" }}
                tabIndex={blocked ? -1 : 0} role="button" aria-label={"Unit " + shape.unitCode}
                onClick={() => selectUnit(shape.unitCode)}
                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") selectUnit(shape.unitCode); }}>
                <title>{shape.unitCode + (known ? " · " + nicePrice(known.price) : " · No matching inventory")}</title>
              </path>;
            })}
          </svg> : <div className="floor-blank"><div><div className="symbol">⌗</div><h2>Floor plan not mapped yet</h2><p className="muted">Upload a real SVG with IDs matching Unit Codes from the Sheet in Workspace Settings.</p></div></div>}
          <p className="muted">Gold = selected unit. Pale green = selectable. Grey = booked or unmatched. Shapes are matched by exact Unit Code.</p>
        </section>
        <section className="panel"><div className="panelhead"><div><div className="eyebrow">CURRENT INVENTORY</div><h2 style={{marginTop:10}}>Find your property</h2></div><span className="pill">{units.length} total</span></div>
          <input className="field" placeholder="Search Unit Code or floor..." value={search} onChange={e => setSearch(e.target.value)} style={{marginBottom:15}} />
          <div className="list">{visibleUnits.map(value => <button type="button" key={value.code} className={"unit" + (value.code === selected ? " active" : "")}
            disabled={unavailable(value.status)} onClick={() => selectUnit(value.code)}>
            <span><b>{value.code}</b><small>Floor {value.floor || "—"} · {value.area || "—"} sqm</small></span>
            <span style={{textAlign:"right"}}><b>{nicePrice(value.price)}</b><small>{value.status}</small></span>
          </button>)}
          {!visibleUnits.length && <p className="muted">{loading ? "Loading authorized inventory…" : "No matching live inventory. Confirm the Sheet connection in Settings."}</p>}</div>
          {units.length > 100 && <p className="muted">Showing the first 100 matches. Use search to narrow the results.</p>}
        </section>
      </div>
      <div className="stack">
        <section className="panel"><div className="eyebrow">PROPERTY SUMMARY</div><h2 style={{marginTop:12}}>{unit ? unit.code : "Select a unit"}</h2>
          {unit ? <>
            {([["Project", project?.name || "—"],["Unit Code",unit.code],["Floor",unit.floor || "—"],["Area",unit.area ? unit.area+" sqm":"—"],["Status",unit.status],["Price",nicePrice(unit.price)]] as [string,string][]).map(([label,value]) =>
              <div className="detailrow" key={label}><span>{label}</span><b>{value}</b></div>)}
          </> : <p className="muted">Current price, location and availability appear here once you select a unit.</p>}
        </section>
        <section className="panel"><div className="eyebrow">CUSTOM TERMS</div><h2 style={{marginTop:12}}>Payment plan options</h2><p className="muted">Each selected plan produces its own detailed payment schedule in the proposal PDF.</p>
          {project?.paymentPlans.map(plan => <label className="planrow" key={plan.id}>
            <input type="checkbox" checked={chosenPlans.includes(plan.id)} disabled={!unit || (chosenPlans.length >= 5 && !chosenPlans.includes(plan.id))}
              onChange={event => toggle(plan.id, event.target.checked)} />
            <span><b style={{fontSize:13}}>{plan.name}</b><small style={{display:"block",fontSize:11,marginTop:6,color:"#8390a2"}}>{plan.downPaymentPct}% down · {plan.months} months · {plan.maintenancePct}% maintenance</small></span>
          </label>)}
          {!project?.paymentPlans.length && <div className="notice">No plans yet. An administrator can add a plan (such as 10% down / 80 months) in Workspace Settings.</div>}
          <button className="btn gold" style={{width:"100%",marginTop:18}} disabled={!unit || chosenPlans.length===0 || generating} onClick={issueOffer}>
            {generating ? "Rendering proposal…" : "Generate premium PDF offer"}
          </button>
          <p className="muted" style={{fontSize:11}}>The server checks live price and availability again before producing the PDF.</p>
        </section>
        <section className="panel"><div className="panelhead"><div><div className="eyebrow">YOUR RECENT ACTIVITY</div><h2 style={{marginTop:10}}>Issued offers</h2></div></div>
          {history.length ? history.slice(0,6).map(item => <div className="pitem" key={item.id}><span><b>{item.unitCode}</b><small style={{display:"block",marginTop:5,color:"#8492a2"}}>{item.project.name}</small></span><span className="muted">{new Date(item.issuedAt).toLocaleDateString("en-GB")}</span></div>)
            : <p className="muted">The first issued offers will appear here after successful PDF generation.</p>}
          <div className="separator"/><Link href="/admin" style={{fontSize:12,color:"#aa8450"}}>Configure Sheets, plans and floor layouts</Link>
        </section>
      </div>
    </div>
  </main></div>;
}
