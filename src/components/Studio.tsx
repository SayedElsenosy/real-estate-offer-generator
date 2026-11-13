"use client";
import { useEffect, useMemo, useState } from "react";
import { useLiveInventory } from "@/hooks/useLiveInventory";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { unitKey } from "@/lib/unit-code";
import { useLanguage } from "@/components/LanguageProvider";
import { calculateSchedule, type PaymentTerms } from "@/lib/payment";
import { calculateVidaWorkbookSchedule, isVidaWorkbookPlanId } from "@/lib/vida-payments";
import { UnitSourceDetails } from "@/components/UnitSourceDetails";
import { VidaBrochurePreview } from "@/components/VidaBrochurePreview";
import type { CairoFoodPricing } from "@/lib/cairo-food-pricing";

type Unit = { code: string; price: string; area: string; floor: string; status: string; project: string; type?: string; foodPricing?:CairoFoodPricing };
type Plan = { id: string; name: string; discountPct?:string; secondDownPaymentPct?:string; secondDownOffsetMonths?:number; quarterlyEndAtTerm?:boolean; ordinaryInstallmentRebate?:string; downPaymentPct: string; maintenancePct: string; months: number; startOffsetMonths: number; installmentIntervalMonths?: number; deliveryMonths?: number|null; deliveryCollectionPct?: string; deliveryCollectionEnabled?: boolean };
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
  const [projectId, setProjectId] = useState(projects.find(p=>p.id==="cairo-plaza")?.id || projects[0]?.id || "");
  const {units,loading,refreshing,error,refresh,lastReadAt} = useLiveInventory(projectId);
  const [floorNumber, setFloorNumber] = useState("");
  const [selected, setSelected] = useState("");
  const [chosenPlans, setChosenPlans] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [offerError,setOfferError] = useState("");
  const [search, setSearch] = useState("");
  const [inventoryFloor,setInventoryFloor]=useState("");
  const [minArea,setMinArea]=useState("");
  const [maxArea,setMaxArea]=useState("");
  const [minPrice,setMinPrice]=useState("");
  const [maxPrice,setMaxPrice]=useState("");
  const [inventorySort,setInventorySort]=useState<"code"|"area-asc"|"area-desc"|"price-asc"|"price-desc">("code");
  const [offerLanguage,setOfferLanguage]=useState<"ar"|"en">("ar");
  useEffect(()=>{
    // Deep-link from an explicitly selected Vida building/floor/unit in plans.
    const qs=new URLSearchParams(window.location.search);
    if(qs.get("projectId")!=="vida"||!projects.some(p=>p.id==="vida"))return;
    const code=qs.get("unitCode")||"";
    const floor=qs.get("unitFloor")||"";
    if(!/^\d{1,2}[AB]?[-_ ]T?\d{2,3}$/i.test(code)||floor.length>80)return;
    setProjectId("vida");setSelected(code);setFloorNumber(floor);setSearch(code);
  },[]);
  const project = projects.find(p => p.id === projectId);
  const unit = units.find(value => value.code === selected && value.floor === floorNumber);
  const selectedPlans=project?.paymentPlans.filter(plan=>chosenPlans.includes(plan.id))||[];
  const schedules=useMemo(()=>{
    if(!unit||!selectedPlans.length)return {rows:[] as ReturnType<typeof calculateSchedule>[],error:""};
    try{
      const date=new Date();
      return {rows:selectedPlans.map(plan=>projectId==="vida" && isVidaWorkbookPlanId(plan.id)
        ? calculateVidaWorkbookSchedule(unit.price,plan.id,date)
        : calculateSchedule(unit.price,{
        name:plan.name,downPaymentPct:plan.downPaymentPct,months:plan.months,
        maintenancePct:plan.maintenancePct,startOffsetMonths:plan.startOffsetMonths,
        installmentIntervalMonths:plan.installmentIntervalMonths===3?3:1,
        discountPct:plan.discountPct||"0",secondDownPaymentPct:plan.secondDownPaymentPct||"0",
        secondDownOffsetMonths:plan.secondDownOffsetMonths||0,quarterlyEndAtTerm:!!plan.quarterlyEndAtTerm,
        ordinaryInstallmentRebate:plan.ordinaryInstallmentRebate||"0",
        deliveryMonths:plan.deliveryMonths??undefined,
        deliveryCollectionEnabled:plan.deliveryCollectionEnabled,
        deliveryCollectionPct:plan.deliveryCollectionPct
      },date)),error:""};
    }catch(err){return {rows:[] as ReturnType<typeof calculateSchedule>[],
      error:err instanceof Error?err.message:"Invalid payment plan"};}
  },[unit,selectedPlans.map(p=>p.id+":"+p.months+":"+p.deliveryMonths+":"+p.installmentIntervalMonths+":"+p.discountPct+":"+p.secondDownPaymentPct).join("|")]);
  const availableFloors=useMemo(()=>[...new Set(units.map(u=>u.floor))].filter(Boolean)
    .sort((a,b)=>Number(a)-Number(b)||a.localeCompare(b,undefined,{numeric:true})),[units]);
  // Filter ALL rows returned from the project's read-only inventory, not
  // merely the first 100. Sorting never changes the XLSX or pricing source.
  const visibleUnits=useMemo(()=>{
    const num=(s:string)=>Number(String(s).replace(/[,\s]/g,""));
    const lowArea=minArea.trim()?num(minArea):null;
    const highArea=maxArea.trim()?num(maxArea):null;
    const lowPrice=minPrice.trim()?num(minPrice):null;
    const highPrice=maxPrice.trim()?num(maxPrice):null;
    const lower=search.trim().toLocaleLowerCase();
    const list=units.filter(item=>{
      if(!(item.code+" "+item.floor+" "+(item.type||"")).toLocaleLowerCase().includes(lower))return false;
      if(inventoryFloor&&item.floor!==inventoryFloor)return false;
      const area=num(item.area),price=num(item.price);
      if(lowArea!==null&&(!Number.isFinite(area)||area<lowArea))return false;
      if(highArea!==null&&(!Number.isFinite(area)||area>highArea))return false;
      if(lowPrice!==null&&(!Number.isFinite(price)||price<lowPrice))return false;
      if(highPrice!==null&&(!Number.isFinite(price)||price>highPrice))return false;
      return true;
    });
    return list.sort((a,b)=>{
      const compareCode=()=>a.code.localeCompare(b.code,undefined,{numeric:true});
      if(inventorySort==="code")return compareCode();
      const field=inventorySort.startsWith("area")?"area":"price";
      const direction=inventorySort.endsWith("desc")?-1:1;
      const delta=(num(a[field])-num(b[field]))*direction;
      return Number.isFinite(delta)&&delta!==0?delta:compareCode();
    });
  },[units,search,inventoryFloor,minArea,maxArea,minPrice,maxPrice,inventorySort]);
  function clearInventoryFilters(){
    setSearch("");setInventoryFloor("");setMinArea("");setMaxArea("");
    setMinPrice("");setMaxPrice("");setInventorySort("code");
  }
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
    if(schedules.error){setOfferError(schedules.error);return;}
    setGenerating(true); setOfferError("");
    try {
      const response = await fetch("/api/offers", { method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ projectId, unitCode: unit.code, unitFloor: unit.floor, planIds: chosenPlans,language:offerLanguage }) });
      if (!response.ok) {
          const message = await response.json().catch(() => null);
          throw new Error(message?.error || "The server could not prepare the offer. Please try again.");
      }
        const { offer } = await response.json();
        const bytes = offerLanguage === "ar"
          ? await (await import("@/lib/arabic-pdf")).createArabicOfferPdf(offer)
          : await (await import("@/lib/workers-pdf")).createPropertyOfferPdf(offer);
        const objectURL = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
      const element = document.createElement("a");
      element.href = objectURL;
      element.download = (offerLanguage==="ar"?"Arabic-Offer-":"Property-Offer-") + unit.code.replace(/[^a-z0-9_-]/gi, "_") + ".pdf";
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
        <select className="field" value={projectId} onChange={e => {setProjectId(e.target.value);setSelected("");setFloorNumber("");setChosenPlans([]);clearInventoryFilters();}}>
          {projects.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select></label></div>
    </header>
    {(error||offerError) && <div className="notice" role="alert" style={{marginBottom:18}}>{error||offerError}</div>}
    <div className="muted" style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:8}}>
      <span>{tr("Auto-refresh every 10 seconds while this tab is open")}</span>
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginBottom:12}}>
            <label className="fieldlabel" style={{gridColumn:"1 / -1"}}>{tr("Search unit code, floor or type")}
              <input className="field" placeholder={tr("Search units…")} value={search}
                onChange={e=>setSearch(e.target.value)} />
            </label>
            <label className="fieldlabel">{tr("Floor")}
              <select className="field" value={inventoryFloor} onChange={e=>setInventoryFloor(e.target.value)}>
                <option value="">{tr("All floors")}</option>
                {availableFloors.map(value=><option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="fieldlabel">{tr("Min area (m²)")}
              <input className="field" type="number" inputMode="decimal" min="0" step="any"
                value={minArea} onChange={e=>setMinArea(e.target.value)} />
            </label>
            <label className="fieldlabel">{tr("Max area (m²)")}
              <input className="field" type="number" inputMode="decimal" min="0" step="any"
                value={maxArea} onChange={e=>setMaxArea(e.target.value)} />
            </label>
            <label className="fieldlabel">{tr("Min price (EGP)")}
              <input className="field" type="number" inputMode="numeric" min="0" step="any"
                value={minPrice} onChange={e=>setMinPrice(e.target.value)} />
            </label>
            <label className="fieldlabel">{tr("Max price (EGP)")}
              <input className="field" type="number" inputMode="numeric" min="0" step="any"
                value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} />
            </label>
            <label className="fieldlabel">{tr("Sort by")}
              <select className="field" value={inventorySort} onChange={e=>setInventorySort(e.target.value as typeof inventorySort)}>
                <option value="code">{tr("Unit code")}</option>
                <option value="area-asc">{tr("Area: smallest first")}</option>
                <option value="area-desc">{tr("Area: largest first")}</option>
                <option value="price-asc">{tr("Price: lowest first")}</option>
                <option value="price-desc">{tr("Price: highest first")}</option>
              </select>
            </label>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:9,marginBottom:12,flexWrap:"wrap"}}>
            <span className="muted">{tr("Showing")} <b>{visibleUnits.length}</b> / {units.length} {tr("units from the live sheet")}</span>
            <button type="button" className="btn soft" style={{padding:"7px 12px"}}
              onClick={clearInventoryFilters}>{tr("Reset filters")}</button>
          </div>
          <div className="list">{visibleUnits.map(value => <button type="button" key={value.code+"::"+value.floor} className={"unit" + (value.code === selected && value.floor === floorNumber ? " active" : "")}
            disabled={!isAvailable(value.status)} onClick={() => selectUnit(value.code, value.floor)}>
            <span><b>{value.code}</b><small>{tr("Floor")} {value.floor || "—"} · {value.area || "—"} m²{value.type?.trim() ? " · "+value.type.trim() : ""}</small></span>
            <span style={{textAlign:"right"}}><b>{nicePrice(value.price)}</b><small>{tr(value.status)}</small></span>
          </button>)}
          {!visibleUnits.length && <p className="muted">{tr(loading ? "Loading authorized inventory…" : "No matching live inventory. Confirm the Sheet connection in Settings.")}</p>}</div>
          <p className="muted" style={{fontSize:12,marginTop:10}}>{tr("Every matching unit is listed above, including reserved and unavailable properties. You can scroll through the full result.")}</p>
        </section>
      </div>
      <div className="stack">
        <section className="panel"><div className="eyebrow">{tr("PROPERTY SUMMARY")}</div><h2 style={{marginTop:12}}>{unit ? unit.code : tr("Select a unit")}</h2>
          {unit ? <>
            {([["Project", project?.name || "—"],["Unit Code",unit.code],["Unit Type",unit.type?.trim() || "—"],["Floor",unit.floor || "—"],["Area",unit.area ? unit.area+" sqm":"—"],["Status",tr(unit.status)],["Price",nicePrice(unit.price)]] as [string,string][]).map(([label,value]) =>
              <div className="detailrow" key={label}><span>{tr(label)}</span><b>{value}</b></div>)}
            {unit.foodPricing&&<>
              <div className="detailrow"><span>{tr("Indoor area")}</span><b>{unit.foodPricing.indoorAreaSqm} m²</b></div>
              <div className="detailrow"><span>{tr("Indoor price per sqm")}</span><b>{nicePrice(unit.foodPricing.indoorRateEgp)}</b></div>
              <div className="detailrow"><span>{tr("Outdoor area")}</span><b>{unit.foodPricing.outdoorAreaSqm} m²</b></div>
              <div className="detailrow"><span>{tr("Outdoor price per sqm")}</span><b>{nicePrice(unit.foodPricing.outdoorRateEgp)}</b></div>
            </>}
            <UnitSourceDetails projectId={projectId} code={unit.code} floor={unit.floor}/>
            {projectId==="vida"&&<VidaBrochurePreview code={unit.code} floor={unit.floor}/>}
          </> : <p className="muted">{tr("Current price, location and availability appear here once you select a unit.")}</p>}
        </section>
        <section className="panel"><div className="eyebrow">{tr("CUSTOM TERMS")}</div><h2 style={{marginTop:12}}>{tr("Payment plan options")}</h2><p className="muted">{tr("Each selected plan produces its own detailed payment schedule in the proposal PDF.")}</p>
          {project?.paymentPlans.map(plan => <label className="planrow" key={plan.id}>
            <input type="checkbox" checked={chosenPlans.includes(plan.id)} disabled={!unit || (chosenPlans.length >= 5 && !chosenPlans.includes(plan.id))}
              onChange={event => toggle(plan.id, event.target.checked)} />
            <span><b style={{fontSize:13}}>{plan.name}</b><small style={{display:"block",fontSize:11,marginTop:6,color:"#8390a2"}}>{plan.downPaymentPct}% {tr("Down payment %")}{Number(plan.secondDownPaymentPct)>0?" + "+plan.secondDownPaymentPct+"% "+tr("Second down payment %"):""}{Number(plan.discountPct)>0?" · "+plan.discountPct+"% "+tr("Plan discount %"):""} · {plan.months} {tr("months")} · {tr(plan.installmentIntervalMonths===3?"Quarterly installments":"Monthly payments")} · {plan.maintenancePct}% {tr("Maintenance %")}{plan.deliveryMonths ? " · "+tr("Delivery after")+" "+plan.deliveryMonths+" "+tr("months") : ""}{plan.deliveryCollectionEnabled ? " · "+plan.deliveryCollectionPct+"% "+tr("Paid by delivery") : ""}</small></span>
          </label>)}
          {!project?.paymentPlans.length && <div className="notice">{tr("No plans yet. An administrator can add a plan (such as 10% down / 80 months) in Workspace Settings.")}</div>}
          {unit && selectedPlans.length>0 && <div style={{marginTop:18}}>
            <h3 style={{marginBottom:8}}>{tr("Live payment schedule preview")}</h3>
            {schedules.error&&<div className="notice" role="alert">{schedules.error}</div>}
            {selectedPlans.some(p=>Number(p.maintenancePct)>0)&&
              <p className="muted">{tr("Maintenance deposit appears at the end of each plan without a due date.")}</p>}
            {schedules.rows.map((schedule,i)=><div key={selectedPlans[i].id}
              style={{marginBottom:16,border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:12,background:"#f6f8fb"}}>
                <strong>{schedule.name}</strong>
                <div className="muted" style={{fontSize:12,marginTop:6}}>
                  {tr("Collected before delivery")}: {nicePrice(schedule.preDeliveryTotal)} ·
                  {tr("Balance after delivery")}: {nicePrice(schedule.postDeliveryTotal)}
                </div>
                <div className="muted" style={{fontSize:12,marginTop:5}}>
                  {schedule.deliveryMonths>0?tr("Delivery after")+" "+schedule.deliveryMonths+" "+tr("months"):""}
                  {" · "}{tr("Total including maintenance")}: {nicePrice(schedule.totalIncludingMaintenance)}
                </div>
              </div>
              <div style={{overflow:"auto",maxHeight:440}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead style={{position:"sticky",top:0,background:"#eaf0f5"}}>
                    <tr><th style={{padding:8,textAlign:"start"}}>#</th>
                      <th style={{padding:8,textAlign:"start"}}>{tr("Payment type")}</th>
                      <th style={{padding:8,textAlign:"start"}}>{tr("Due date")}</th>
                      <th style={{padding:8,textAlign:"end"}}>{tr("Amount (EGP)")}</th></tr>
                  </thead>
                  <tbody>{schedule.rows.map((row,j)=><tr key={row.type+row.due+j} style={{borderBottom:"1px solid #edf0f4"}}>
                    <td style={{padding:8}}>{row.number??"—"}</td>
                    <td style={{padding:8}}>{tr(row.type==="DOWN_PAYMENT"?"Down payment":row.type==="SECOND_DOWN_PAYMENT"?"Second down payment":row.type==="MAINTENANCE"?"Maintenance":"Installment")}</td>
                    <td style={{padding:8}}>{row.due||"—"}</td>
                    <td style={{padding:8,textAlign:"end"}}>{nicePrice(row.amount)}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </div>)}
          </div>}
          <label className="fieldlabel" style={{marginTop:16,display:"block"}}>
            {tr("PDF offer language")}
            <select className="field" value={offerLanguage} onChange={event=>setOfferLanguage(event.target.value as "ar"|"en")}>
              <option value="ar">{tr("Arabic PDF")}</option>
              <option value="en">{tr("English PDF")}</option>
            </select>
          </label>
          <button className="btn gold" style={{width:"100%",marginTop:18}} disabled={!unit || !isAvailable(unit.status) || !!error || !!schedules.error || loading || chosenPlans.length===0 || generating} onClick={issueOffer}>
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
