"use client";
import { useMemo, useState } from "react";
import { useLiveInventory } from "@/hooks/useLiveInventory";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { unitKey } from "@/lib/unit-code";
import { useLanguage } from "@/components/LanguageProvider";

type Unit = { code: string; price: string; area: string; floor: string; status: string; project: string };
type Plan = { id: string; name: string; downPaymentPct: string; maintenancePct: string; months: number; startOffsetMonths: number; installmentIntervalMonths?: number; deliveryDate?: string | null; deliveryCollectionPct?: string; deliveryCollectionEnabled?: boolean };
type Project = { id: string; slug: string; name: string; paymentPlans: Plan[] };
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
  const {units,loading,refreshing,error,refresh,lastReadAt} = useLiveInventory(projectId);
  const [floorNumber, setFloorNumber] = useState("");
  const [selected, setSelected] = useState("");
  const [chosenPlans, setChosenPlans] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [offerError,setOfferError] = useState("");
  const [search, setSearch] = useState("");
  const project = projects.find(p => p.id === projectId);
  const unit = units.find(value => value.code === selected && value.floor === floorNumber);
  const visibleUnits = useMemo(() => units.filter(item =>
    (item.code + " " + item.floor).toLowerCase().includes(search.toLowerCase())).slice(0, 100), [units, search]);
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
    setGenerating(true); setOfferError("");
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
      setOfferError(err instanceof Error ? tr(err.message) : tr("Could not generate proposal"));
    } finally { setGenerating(false); }
  }
  const toggle = (id: string, checked: boolean) => setChosenPlans(ids => checked ? [...ids, id] : ids.filter(x => x !== id));
  return <div className="shell"><Sidebar active="studio" email={email} shared={email==="Private link access"} /><main className="main">
    <header className="header-line"><div><div className="eyebrow">{tr("OFFER STUDIO / LIVE INVENTORY")}</div><h1>{tr("Build a property offer")}</h1><p className="muted">{tr("Pick a project, inspect a unit and include one or more financial scenarios.")}</p></div>
      <div style={{ minWidth: 230 }}><label className="fieldlabel">{tr("ACTIVE PROJECT")}
        <select className="field" value={projectId} onChange={e => {setProjectId(e.target.value);setSelected("");setFloorNumber("");setChosenPlans([]);}}>
          {projects.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select></label></div>
    </header>
    {(error||offerError) && <div className="notice" role="alert" style={{marginBottom:18}}>{error||offerError}</div>}
    <div className="muted" style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:8}}>
      <span>{tr("Auto-refresh every 3 seconds while this tab is open")}</span>
      <span>{refreshing?tr("Checking for changes…"):lastReadAt?tr("Inventory synchronized"):""}</span>
      <button type="button" className="btn soft" style={{padding:"5px 12px"}} onClick={()=>void refresh()} disabled={refreshing}>
        {tr("Refresh now")}
      </button>
    </div>
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
            <span><b style={{fontSize:13}}>{plan.name}</b><small style={{display:"block",fontSize:11,marginTop:6,color:"#8390a2"}}>{plan.downPaymentPct}% {tr("Down payment %")} · {plan.months} {tr("Total term including down payment (months)")} · {tr("Every")} {plan.installmentIntervalMonths || 1} {tr("months")} · {plan.maintenancePct}% {tr("Maintenance %")}{plan.deliveryDate ? " · " + tr("Delivery date") + ": " + plan.deliveryDate : ""}{plan.deliveryCollectionEnabled ? " · " + plan.deliveryCollectionPct + "% " + tr("Collection at delivery %") : ""}</small></span>
          </label>)}
          {!project?.paymentPlans.length && <div className="notice">{tr("No plans yet. An administrator can add a plan (such as 10% down / 80 months) in Workspace Settings.")}</div>}
          <button className="btn gold" style={{width:"100%",marginTop:18}} disabled={!unit || !!error || loading || chosenPlans.length===0 || generating} onClick={issueOffer}>
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
