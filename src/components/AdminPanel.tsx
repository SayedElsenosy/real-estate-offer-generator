"use client";
import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { FloorPlanEditor } from "@/components/FloorPlanEditor";
import { BulkFloorImporter } from "@/components/BulkFloorImporter";

type Plan = { id: string; name: string; downPaymentPct: string; maintenancePct: string; months: number; startOffsetMonths: number };
type Shape = { unitCode: string; d: string };
type Floor = { id: string; name: string; floor: string | null; viewBox: string; shapes: Shape[] };
type Project = {
  id: string; name: string; spreadsheetId: string | null; sheetRange: string;
  companyName: string; logoUrl: string | null; paymentPlans: Plan[]; floorPlans: Floor[];
};
const blankPlan = { id: "", name: "", downPaymentPct: "10", maintenancePct: "8", months: "80", startOffsetMonths: "1" };
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
      setNotice("Project configuration saved.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Save failed"); } finally { setBusy(false); }
  }
  async function savePlan() {
    setBusy(true); setNotice("");
    try {
      const r = await fetch("/api/plans", {method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ ...plan, id:plan.id || undefined, projectId:id })});
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      setNotice("Payment plan saved. Reload this page to view the refreshed list.");
      setPlan(blankPlan);
    } catch(e){setNotice(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}
  }
  async function readSvg(file: File) {
    try {
      const parsed = extractPaths(await file.text());
      setFloor(p => ({...p, viewBox:parsed.viewBox, shapes:parsed.shapes, name:p.name || file.name.replace(/\.svg$/i,"")}));
      setNotice("SVG parsed into " + parsed.shapes.length + " selectable shapes. Check IDs and floor before saving. Nested SVG transforms are not supported.");
    } catch(e){setNotice(e instanceof Error?e.message:"Unable to parse SVG")}
  }
  async function saveFloor() {
    if (!floor.shapes.length) return setNotice("Please import SVG geometry first.");
    setBusy(true);setNotice("");
    try {
      const r=await fetch("/api/floors",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...floor,id:floor.id||undefined,projectId:id,floor:floor.floor||null})});
      const result=await r.json();if(!r.ok)throw Error(result.error);
      setNotice("Interactive floor map saved. Reload this page to see the new floor configuration.");setFloor(blankFloor);
    }catch(e){setNotice(e instanceof Error?e.message:"SVG save failed")}finally{setBusy(false)}
  }
  return <div className="shell"><Sidebar active="admin" email={email} /><main className="main">
    <div className="header-line"><div><div className="eyebrow">ADMINISTRATION / WORKSPACE SETTINGS</div><h1>Project configuration</h1><p className="muted">Connect each project's inventory and configure client-facing financial offers.</p></div><Link href="/studio" className="btn soft">Back to Offer Studio</Link></div>
    {notice && <div className={"notice" + (notice.toLowerCase().includes("saved") ? " good" : "")} style={{marginBottom:20}}>{notice}</div>}
    <div className="panel" style={{marginBottom:20}}><div className="between"><div><div className="eyebrow">ACTIVE PROJECT</div><h2 style={{marginTop:10,marginBottom:0}}>{project?.name || "No project"}</h2></div>
      <select className="field" style={{maxWidth:300}} value={id} onChange={e=>{setId(e.target.value);setPlan(blankPlan);setFloor(blankFloor);setNotice("");}}>
        {items.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
    {project && <div className="grid2"><div className="stack">
      <section className="panel"><div className="eyebrow">READ-ONLY INVENTORY SOURCE</div><h2 style={{marginTop:12}}>Google Drive / Google Sheets connection</h2>
        <p className="muted">Cairo Plaza reads the Excel file directly from Google Drive, using Sheet1. Other projects read native Google Sheets. Each account only needs Viewer/Reader access; no file is edited.</p>
        <div className="stack" style={{gap:13}}>
          <label className="fieldlabel">Google Drive file ID<input className="field" value={project.spreadsheetId || ""} placeholder="1AbCdEf..." onChange={e=>changeProject("spreadsheetId",e.target.value)}/></label>
          <label className="fieldlabel">Tab / range<input className="field" value={project.sheetRange} onChange={e=>changeProject("sheetRange",e.target.value)}/></label>
          <label className="fieldlabel">Company name on offers<input className="field" value={project.companyName} onChange={e=>changeProject("companyName",e.target.value)}/></label>
          <label className="fieldlabel">Company logo URL (HTTPS)<input className="field" value={project.logoUrl||""} onChange={e=>changeProject("logoUrl",e.target.value)}/></label>
          <button className="btn" onClick={saveProject} disabled={busy}>Save project settings</button>
        </div>
        <div className="notice" style={{marginTop:18}}>Cairo Plaza: Excel Sheet1 (column A code, G area, E floor, L status, M total price). The other projects use their verified live sheet layouts.</div>
      </section>
      {id === "cairo-plaza" && <BulkFloorImporter projectId={id} floors={project.floorPlans} />}
      <FloorPlanEditor key={id} projectId={id} floors={project.floorPlans} />

    </div><div className="stack">
      <section className="panel"><div className="eyebrow">FINANCIAL CONFIGURATION</div><h2 style={{marginTop:12}}>Payment plan manager</h2>
        <p className="muted">Define reusable payment structures, then select multiple scenarios when issuing an offer.</p>
        {project.paymentPlans.map(p=><button type="button" className="unit" key={p.id} onClick={()=>setPlan({id:p.id,name:p.name,downPaymentPct:p.downPaymentPct,months:String(p.months),maintenancePct:p.maintenancePct,startOffsetMonths:String(p.startOffsetMonths)})}>
          <span><b>{p.name}</b><small>{p.downPaymentPct}% down · {p.months} installments</small></span><span className="muted">Edit</span>
        </button>)}
        <div className="separator"/>
        <div className="stack" style={{gap:13}}>
          <label className="fieldlabel">Plan name<input className="field" placeholder="10% down / 80 months" value={plan.name} onChange={e=>setPlan({...plan,name:e.target.value})}/></label>
          <div className="twofields">
            <label className="fieldlabel">Down payment %<input className="field" type="number" min="0" max="100" step="0.01" value={plan.downPaymentPct} onChange={e=>setPlan({...plan,downPaymentPct:e.target.value})}/></label>
            <label className="fieldlabel">Installment months<input className="field" type="number" min="1" max="360" value={plan.months} onChange={e=>setPlan({...plan,months:e.target.value})}/></label>
            <label className="fieldlabel">Maintenance %<input className="field" type="number" min="0" max="100" step="0.01" value={plan.maintenancePct} onChange={e=>setPlan({...plan,maintenancePct:e.target.value})}/></label>
            <label className="fieldlabel">First installment offset<input className="field" type="number" min="0" max="120" value={plan.startOffsetMonths} onChange={e=>setPlan({...plan,startOffsetMonths:e.target.value})}/></label>
          </div>
          <div className="actionline"><button className="btn" disabled={busy||!plan.name} onClick={savePlan}>{plan.id?"Update payment plan":"Add payment plan"}</button><button className="btn soft" onClick={()=>setPlan(blankPlan)}>New plan</button></div>
        </div>
      </section>
      <section className="panel"><div className="eyebrow">SECURITY RULES</div><h2 style={{marginTop:12}}>Authorized-only processing</h2>
        <div className="pitem"><span>Google OAuth</span><b>Read-only Sheets</b></div>
        <div className="pitem"><span>Administrative changes</span><b>Allowlisted admins</b></div>
        <div className="pitem"><span>Unit prices</span><b>Verified live</b></div>
        <div className="pitem"><span>Issued offers</span><b>Snapshot in Neon</b></div>
        <p className="muted">Logos are embedded in PDFs only when their domain is explicitly listed in ALLOWED_LOGO_HOSTS.</p>
      </section>
    </div></div>}
  </main></div>;
}
