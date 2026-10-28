"use client";
import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { FloorPlanEditor } from "@/components/FloorPlanEditor";
import { BulkFloorImporter } from "@/components/BulkFloorImporter";
import { useLanguage } from "@/components/LanguageProvider";

type Plan = { id: string; name: string; downPaymentPct: string; maintenancePct: string; months: number; startOffsetMonths: number; installmentIntervalMonths: number; deliveryDate: string | null; deliveryCollectionEnabled: boolean; deliveryCollectionPct: string };
type Shape = { unitCode: string; d: string };
type Floor = { id: string; name: string; floor: string | null; viewBox: string; shapes: Shape[] };
type Project = {
  id: string; name: string; spreadsheetId: string | null; sheetRange: string;
  companyName: string; logoUrl: string | null; paymentPlans: Plan[]; floorPlans: Floor[];
};
const blankPlan = { id: "", name: "", downPaymentPct: "10", maintenancePct: "8", months: "80", startOffsetMonths: "1", installmentIntervalMonths: "1", deliveryDate: "", deliveryCollectionEnabled: false, deliveryCollectionPct: "0" };
const blankFloor = { id: "", name: "", floor: "", viewBox: "0 0 1000 700", shapes: [] as Shape[] };
function extractPaths(source: string): { viewBox: string; shapes: Shape[] } {
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  if (document.querySelector("parsererror") || document.documentElement.localName !== "svg") throw Error("Invalid SVG file.");
  const root = document.documentElement;
  const viewBox = root.getAttribute("viewBox") || "0 0 1000 700";
  const paths: Shape[] = [];
  for (const node of Array.from(root.querySelectorAll("path[id],polygon[id],rect[id],path[data-unit-code],polygon[data-unit-code],rect[data-unit-code]"))) {
    const code = (node.getAttribute("data-unit-code") || node.getAttribute("id") || "").trim();
    let d = node.getAttribute("d") || "";
    if (node.localName === "polygon") {
      const pairs = (node.getAttribute("points") || "").trim().split(/\s+/);
      if (pairs.length >= 3) d = "M " + pairs.join(" L ") + " Z";
    }
    if (node.localName === "rect") {
      const x = Number(node.getAttribute("x") || 0), y = Number(node.getAttribute("y") || 0),
        w = Number(node.getAttribute("width")), h = Number(node.getAttribute("height"));
      if (w>0 && h>0) d = "M " + x + " " + y + " H " + (x+w) + " V " + (y+h) + " H " + x + " Z";
    }
    if (code && d && /^[\d\s,.+\-eEmlhvcsqtazMLHVCSQTAZ]+$/.test(d)) paths.push({unitCode:code,d});
  }
  if (!paths.length) throw Error("SVG has no supported shapes with unit IDs. Each path/polygon/rect needs id=UnitCode.");
  return { viewBox, shapes: paths };
}
export default function AdminPanel({ email, projects }: { email: string; projects: Project[] }) {
  const { tr } = useLanguage();
  const [items, setItems] = useState(projects);
  const [id, setId] = useState(items[0]?.id || "");
  const [plan, setPlan] = useState(blankPlan);
  const [floor, setFloor] = useState(blankFloor);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const project = items.find(p => p.id === id);
  function changeProject(key: "spreadsheetId" | "sheetRange" | "companyName" | "logoUrl", value: string) {
    setItems(old => old.map(p => p.id === id ? { ...p, [key]: value } : p));
  }
  async function saveProject() {
    if (!project) return;
    setBusy(true); setNotice("");
    try {
      const r = await fetch("/api/projects", { method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, spreadsheetId: project.spreadsheetId || null, sheetRange: project.sheetRange,
          companyName: project.companyName, logoUrl: project.logoUrl || null }) });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setNotice(tr("Project configuration saved."));
    } catch (e) { setNotice(e instanceof Error ? tr(e.message) : tr("Save failed")); } finally { setBusy(false); }
  }
  async function savePlan() {
    setBusy(true); setNotice("");
    try {
      const r = await fetch("/api/plans", {method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ ...plan, id:plan.id || undefined, projectId:id })});
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      const saved = result.plan as Plan;
      setItems(old => old.map(p => p.id === id ? {
        ...p, paymentPlans: plan.id ? p.paymentPlans.map(x => x.id === saved.id ? saved : x) : [...p.paymentPlans, saved]
      } : p));
      setNotice(tr("Payment plan saved."));
      setPlan(blankPlan);
    } catch(e){setNotice(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}
  }
  async function deletePlan(planId: string) {
    if (!window.confirm(tr("Confirm deletion of this payment plan? This cannot be undone."))) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/plans", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId:id, id:planId })
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || tr("Could not delete plan"));
      setItems(old => old.map(p => p.id === id ? { ...p, paymentPlans:p.paymentPlans.filter(x => x.id !== planId) } : p));
      if (plan.id === planId) setPlan(blankPlan);
      setNotice(tr("Payment plan deleted."));
    } catch (error) { setNotice(error instanceof Error ? error.message : tr("Could not delete plan")); }
    finally { setBusy(false); }
  }
  async function readSvg(file: File) {
    try {
      const parsed = extractPaths(await file.text());
      setFloor(p => ({...p, viewBox:parsed.viewBox, shapes:parsed.shapes, name:p.name || file.name.replace(/\.svg$/i,"")}));
      setNotice(tr("SVG parsed into ") + parsed.shapes.length + tr(" selectable shapes. Check IDs and floor before saving. Nested SVG transforms are not supported."));
    } catch(e){setNotice(e instanceof Error?tr(e.message):tr("Unable to parse SVG"))}
  }
  async function saveFloor() {
    if (!floor.shapes.length) return setNotice(tr("Please import SVG geometry first."));
    setBusy(true);setNotice("");
    try {
      const r=await fetch("/api/floors",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...floor,id:floor.id||undefined,projectId:id,floor:floor.floor||null})});
      const result=await r.json();if(!r.ok)throw Error(result.error);
      setNotice(tr("Interactive floor map saved. Reload this page to see the new floor configuration."));setFloor(blankFloor);
    }catch(e){setNotice(e instanceof Error?tr(e.message):tr("SVG save failed"))}finally{setBusy(false)}
  }
  return <div className="shell"><Sidebar active="admin" email={email} /><main className="main">
    <div className="header-line"><div><div className="eyebrow">{tr("ADMINISTRATION / WORKSPACE SETTINGS")}</div><h1>{tr("Project configuration")}</h1><p className="muted">{tr("Connect each project's inventory and configure client-facing financial offers.")}</p></div><Link href="/studio" className="btn soft">{tr("Back to Offer Studio")}</Link></div>
    {notice && <div className={"notice" + ((notice.toLowerCase().includes("saved") || notice.startsWith("تم")) ? " good" : "")} style={{marginBottom:20}}>{notice}</div>}
    <div className="panel" style={{marginBottom:20}}><div className="between"><div><div className="eyebrow">{tr("ACTIVE PROJECT")}</div><h2 style={{marginTop:10,marginBottom:0}}>{project?.name || tr("No project")}</h2></div>
      <select className="field" style={{maxWidth:300}} value={id} onChange={e=>{setId(e.target.value);setPlan(blankPlan);setFloor(blankFloor);setNotice("");}}>
        {items.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
    {project && <div className="grid2"><div className="stack">
      <section className="panel"><div className="eyebrow">{tr("READ-ONLY INVENTORY SOURCE")}</div><h2 style={{marginTop:12}}>{tr("Google Drive / Google Sheets connection")}</h2>
        <p className="muted">{tr("Cairo Plaza reads the Excel file directly from Google Drive, using Sheet1. Other projects read native Google Sheets. Each account only needs Viewer/Reader access; no file is edited.")}</p>
        <div className="stack" style={{gap:13}}>
          <label className="fieldlabel">{tr("Google Drive file ID")}<input className="field" value={project.spreadsheetId || ""} placeholder="1AbCdEf..." onChange={e=>changeProject("spreadsheetId",e.target.value)}/></label>
          <label className="fieldlabel">{tr("Tab / range")}<input className="field" value={project.sheetRange} onChange={e=>changeProject("sheetRange",e.target.value)}/></label>
          <label className="fieldlabel">{tr("Company name on offers")}<input className="field" value={project.companyName} onChange={e=>changeProject("companyName",e.target.value)}/></label>
          <label className="fieldlabel">{tr("Company logo URL (HTTPS)")}<input className="field" value={project.logoUrl||""} onChange={e=>changeProject("logoUrl",e.target.value)}/></label>
          <button className="btn" onClick={saveProject} disabled={busy}>{tr("Save project settings")}</button>
        </div>
        <div className="notice" style={{marginTop:18}}>{tr("Cairo Plaza: Excel Sheet1 (column A code, G area, E floor, L status, M total price). The other projects use their verified live sheet layouts.")}</div>
      </section>
      {id === "cairo-plaza" && <BulkFloorImporter projectId={id} floors={project.floorPlans} />}
      <FloorPlanEditor key={id} projectId={id} floors={project.floorPlans} />

    </div><div className="stack">
      <section className="panel"><div className="eyebrow">{tr("FINANCIAL CONFIGURATION")}</div><h2 style={{marginTop:12}}>{tr("Payment plan manager")}</h2>
        <p className="muted">{tr("Define reusable payment structures, then select multiple scenarios when issuing an offer.")}</p>
        {project.paymentPlans.map(p=><div className="unit" key={p.id}>
          <span><b>{p.name}</b><small>{p.downPaymentPct}% {tr("Down payment %")} · {p.months} {tr("Total term including down payment (months)")} · {tr("Every")} {p.installmentIntervalMonths || 1} {tr("months")} · {tr("First payment is the down payment")}{p.deliveryDate ? " · " + tr("Delivery date") + ": " + p.deliveryDate : ""}</small></span>
          <div className="actionline">
            <button className="btn soft" type="button" disabled={busy}
              onClick={()=>setPlan({id:p.id,name:p.name,downPaymentPct:p.downPaymentPct,months:String(p.months),maintenancePct:p.maintenancePct,startOffsetMonths:String(p.startOffsetMonths),installmentIntervalMonths:String(p.installmentIntervalMonths || 1),deliveryDate:p.deliveryDate || "",deliveryCollectionEnabled:p.deliveryCollectionEnabled,deliveryCollectionPct:p.deliveryCollectionPct})}>
              {tr("Edit")}
            </button>
            <button className="btn danger" type="button" disabled={busy} onClick={()=>void deletePlan(p.id)}>{tr("Delete")}</button>
          </div>
        </div>)}
        <div className="separator"/>
        <div className="stack" style={{gap:13}}>
          <label className="fieldlabel">{tr("Plan name")}<input className="field" placeholder={tr("Plan name")} value={plan.name} onChange={e=>setPlan({...plan,name:e.target.value})}/></label>
          <div className="twofields">
            <label className="fieldlabel">{tr("Down payment %")}<input className="field" type="number" min="0" max="100" step="0.01" value={plan.downPaymentPct} onChange={e=>setPlan({...plan,downPaymentPct:e.target.value})}/></label>
            <label className="fieldlabel">{tr("Total term including down payment (months)")}<input className="field" type="number" min="1" max="360" value={plan.months} onChange={e=>setPlan({...plan,months:e.target.value})}/></label>
            <label className="fieldlabel">{tr("Maintenance %")}<input className="field" type="number" min="0" max="100" step="0.01" value={plan.maintenancePct} onChange={e=>setPlan({...plan,maintenancePct:e.target.value})}/></label>
            <label className="fieldlabel">{tr("Next payment after down payment (months)")}<input className="field" type="number" min="0" max="120" value={plan.startOffsetMonths} onChange={e=>setPlan({...plan,startOffsetMonths:e.target.value})}/></label>
            <label className="fieldlabel">{tr("Installment every (months)")}
              <input className="field" type="number" min="1" max="36" step="1" value={plan.installmentIntervalMonths}
                onChange={e=>setPlan(old=>{
                  const next=e.target.value;
                  return {...old,installmentIntervalMonths:next,
                    startOffsetMonths:old.startOffsetMonths===old.installmentIntervalMonths ? next : old.startOffsetMonths};
                })}/>
            </label>
          </div>
          <p className="muted">{tr("Installment frequency hint")} — {tr("Zero offset means automatic start after one payment interval")}</p>
          <p className="notice">{tr("Down payment counts as payment number 1 within the selected term.")}{" "}
            {Number(plan.months)>0 && Number(plan.installmentIntervalMonths)>0 && Number(plan.downPaymentPct)>=0
              ? tr("Estimated payment breakdown") + ": " +
                (Number(plan.downPaymentPct)>0 ? "1 " + tr("down payment") + " + " : "") +
                (Math.ceil(Number(plan.months)/Number(plan.installmentIntervalMonths))-
                  (Number(plan.downPaymentPct)>0 ? 1 : 0)) + " " + tr("future installments")
              : null}
          </p>
          <label className="fieldlabel">{tr("Delivery date")}<input className="field" type="date" value={plan.deliveryDate}
            onChange={e=>setPlan({...plan,deliveryDate:e.target.value})} /></label>
          <label className="fieldlabel" style={{display:"flex",alignItems:"center",gap:9}}>
            <input type="checkbox" checked={plan.deliveryCollectionEnabled}
              onChange={e=>setPlan({...plan,deliveryCollectionEnabled:e.target.checked,deliveryCollectionPct:e.target.checked?plan.deliveryCollectionPct:"0"})}/>
            {tr("Collect a percentage at delivery")}
          </label>
          {plan.deliveryCollectionEnabled && <label className="fieldlabel">{tr("Collection at delivery %")}
            <input className="field" type="number" min="0.01" max="100" step="0.01" value={plan.deliveryCollectionPct}
              onChange={e=>setPlan({...plan,deliveryCollectionPct:e.target.value})}/>
          </label>}
          <p className="muted">{tr("Delivery collection is optional. When enabled, it is deducted from the installment balance.")}</p>
          <div className="actionline"><button className="btn" disabled={busy||!plan.name} onClick={savePlan}>{tr(plan.id?"Update payment plan":"Add payment plan")}</button><button className="btn soft" onClick={()=>setPlan(blankPlan)}>{tr("New plan")}</button></div>
        </div>
      </section>
      <section className="panel"><div className="eyebrow">{tr("SECURITY RULES")}</div><h2 style={{marginTop:12}}>{tr("Authorized-only processing")}</h2>
        <div className="pitem"><span>Google OAuth</span><b>{tr("Read-only Sheets")}</b></div>
        <div className="pitem"><span>{tr("Administrative changes")}</span><b>{tr("Allowlisted admins")}</b></div>
        <div className="pitem"><span>{tr("Unit prices")}</span><b>{tr("Verified live")}</b></div>
        <div className="pitem"><span>{tr("Issued offers")}</span><b>{tr("Not saved")}</b></div>
        <p className="muted">{tr("Logos are embedded in PDFs only when their domain is explicitly listed in ALLOWED_LOGO_HOSTS.")}</p>
      </section>
    </div></div>}
  </main></div>;
}
