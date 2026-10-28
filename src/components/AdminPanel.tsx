"use client";
import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { FloorPlanEditor } from "@/components/FloorPlanEditor";
import { useLanguage } from "@/components/LanguageProvider";
import { ShareLinkButton } from "@/components/ShareLinkButton";

type Plan = { id: string; name: string; downPaymentPct: string; maintenancePct: string; months: number; startOffsetMonths: number; deliveryMonths: number | null; deliveryCollectionEnabled: boolean; deliveryCollectionPct: string };
type Shape = { unitCode: string; d: string };
type Floor = { id: string; name: string; floor: string | null; viewBox: string; shapes: Shape[] };
type Project = {
  id: string; name: string; spreadsheetId: string | null; sheetRange: string;
  companyName: string; logoUrl: string | null; paymentPlans: Plan[]; floorPlans: Floor[];
};
const blankPlan = { id: "", name: "", downPaymentPct: "10", maintenancePct: "8", months: "80", startOffsetMonths: "1", deliveryMonths: "", deliveryCollectionEnabled: false, deliveryCollectionPct: "0" };
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
  const [id, setId] = useState(items.find(p=>p.id==="cairo-plaza")?.id || items[0]?.id || "");
  const [plan, setPlan] = useState(blankPlan);
  const [floor, setFloor] = useState(blankFloor);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const project = items.find(p => p.id === id);
  function changeProject(key: "spreadsheetId" | "sheetRange" | "companyName" | "logoUrl", value: string) {
    setItems(old => old.map(p => p.id === id ? { ...p, [key]: value } : p));
  }
  async function readCompanyLogo(file:File) {
    setNotice("");
    if(!["image/png","image/jpeg"].includes(file.type) || file.size>6_000_000){
      setNotice(tr("Choose a PNG or JPEG logo under 6 MB."));return;
    }
    const objectUrl=URL.createObjectURL(file);
    try{
      const image=new Image();
      image.src=objectUrl;
      await image.decode();
      if(!image.naturalWidth||!image.naturalHeight)throw Error("Invalid image.");
      const factor=Math.min(1,500/Math.max(image.naturalWidth,image.naturalHeight));
      const canvas=document.createElement("canvas");
      canvas.width=Math.max(1,Math.round(image.naturalWidth*factor));
      canvas.height=Math.max(1,Math.round(image.naturalHeight*factor));
      const ctx=canvas.getContext("2d");if(!ctx)throw Error("Image processing is unavailable.");
      ctx.drawImage(image,0,0,canvas.width,canvas.height);
      let encoded=canvas.toDataURL(file.type,0.88);
      if(encoded.length>350000) encoded=canvas.toDataURL("image/jpeg",0.78);
      if(encoded.length>350000)throw Error("Logo remains too large. Choose a smaller picture.");
      changeProject("logoUrl",encoded);
      setNotice(tr("Logo prepared. Save project settings to keep it permanently."));
    }catch(e){setNotice(e instanceof Error?e.message:tr("Logo could not be loaded"));}
    finally{URL.revokeObjectURL(objectUrl);}
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
    <details className="panel" style={{marginBottom:20}}>
      <summary style={{cursor:"pointer",fontWeight:700}}>{tr("Private access link for other devices")}</summary>
      <p className="muted" style={{marginTop:12}}>{tr("Share the private link to open the studio and floor plans on another device without Google sign-in. The link does not grant administrator rights.")}</p>
      <ShareLinkButton />
    </details>
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
          <label className="fieldlabel">{tr("Upload company logo (PNG or JPEG)")}
            <input className="field" type="file" accept="image/png,image/jpeg"
              onChange={e=>{const file=e.target.files?.[0];if(file)void readCompanyLogo(file);}}/>
          </label>
          {project.logoUrl?.startsWith("data:image/") && <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <img src={project.logoUrl} alt={tr("Company logo preview")}
              style={{maxWidth:120,maxHeight:80,objectFit:"contain",border:"1px solid #e2e8f0",padding:6,borderRadius:8}}/>
            <span className="muted">{tr("Uploaded logo will be embedded directly into PDF offers.")}</span>
          </div>}
          <label className="fieldlabel">{tr("Or use a permanent HTTPS logo URL")}
            <input className="field" placeholder={tr("Image URL (not a temporary Facebook link)")}
              value={project.logoUrl?.startsWith("data:image/")?"":project.logoUrl||""}
              onChange={e=>changeProject("logoUrl",e.target.value)}/>
          </label>
          <p className="muted">{tr("Temporary Facebook photo URLs expire. Upload the original logo once and save settings to keep it available in every offer.")}</p>
          <button className="btn" onClick={saveProject} disabled={busy}>{tr("Save project settings")}</button>
        </div>
        <div className="notice" style={{marginTop:18}}>{tr("Cairo Plaza: Excel Sheet1 (column A code, G area, E floor, L status, M total price). The other projects use their verified live sheet layouts.")}</div>
      </section>
      {id === "cairo-plaza"
        ? <section className="panel">
            <div className="eyebrow">{tr("OFFICIAL ARCHITECTURAL REFERENCE")}</div>
            <h2 style={{marginTop:12}}>{tr("Cairo Plaza — Engineering DWG")}</h2>
            <p className="muted">{tr("The engineering DWG is the only accepted source. Previous PDF-based floor backgrounds and draft polygons have been retired from the live application. The DWG geometry must be converted and checked before publishing new interactive floor plans.")}</p>
            <div className="notice">{tr("Awaiting verified DWG layer and unit-boundary extraction. Inventory and quotation calculations remain available; no inaccurate map is shown.")}</div>
          </section>
        : <FloorPlanEditor key={id} projectId={id} floors={project.floorPlans} />}

    </div><div className="stack">
      <section className="panel"><div className="eyebrow">{tr("FINANCIAL CONFIGURATION")}</div><h2 style={{marginTop:12}}>{tr("Payment plan manager")}</h2>
        <p className="muted">{tr("Define reusable payment structures, then select multiple scenarios when issuing an offer.")}</p>
        {project.paymentPlans.map(p=><div className="unit" key={p.id}>
          <span><b>{p.name}</b><small>{p.downPaymentPct}% {tr("Down payment %")} · {p.months} {tr("Total term including down payment (months)")} · {tr("Monthly payments")} · {tr("First payment is the down payment")}{p.deliveryMonths ? " · "+tr("Delivery after")+" "+p.deliveryMonths+" "+tr("months") : ""}</small></span>
          <div className="actionline">
            <button className="btn soft" type="button" disabled={busy}
              onClick={()=>setPlan({id:p.id,name:p.name,downPaymentPct:p.downPaymentPct,months:String(p.months),maintenancePct:p.maintenancePct,startOffsetMonths:String(p.startOffsetMonths),deliveryMonths:p.deliveryMonths ? String(p.deliveryMonths) : "",deliveryCollectionEnabled:p.deliveryCollectionEnabled,deliveryCollectionPct:p.deliveryCollectionPct})}>
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
          </div>
          <p className="notice">{tr("All installments are monthly. The down payment is the first payment and counts within the full term.")}</p>
          <label className="fieldlabel">{tr("Delivery after (months)")}
            <input className="field" type="number" min="1" max={Math.max(1,Number(plan.months)-1)} step="1"
              value={plan.deliveryMonths}
              onChange={e=>setPlan({...plan,deliveryMonths:e.target.value})}/>
          </label>
          <label className="fieldlabel" style={{display:"flex",alignItems:"center",gap:9}}>
            <input type="checkbox" checked={plan.deliveryCollectionEnabled}
              onChange={e=>setPlan({...plan,deliveryCollectionEnabled:e.target.checked})}/>
            {tr("Split installments before and after delivery")}
          </label>
          {plan.deliveryCollectionEnabled && <>
            <label className="fieldlabel">{tr("Target paid by delivery (% of unit price, includes down payment)")}
              <input className="field" type="number" min={plan.downPaymentPct} max="100" step="0.01"
                value={plan.deliveryCollectionPct}
                onChange={e=>setPlan({...plan,deliveryCollectionPct:e.target.value})}/>
            </label>
          </>}
          <p className="muted">{tr("The delivery percentage is spread across the monthly payments before delivery, not billed as a separate delivery installment. The remaining balance is spread over the months after delivery.")}</p>
          <div className="actionline"><button className="btn" disabled={busy||!plan.name} onClick={savePlan}>{tr(plan.id?"Update payment plan":"Add payment plan")}</button><button className="btn soft" onClick={()=>setPlan(blankPlan)}>{tr("New plan")}</button></div>
        </div>
      </section>
      <section className="panel"><div className="eyebrow">{tr("SECURITY RULES")}</div><h2 style={{marginTop:12}}>{tr("Authorized-only processing")}</h2>
        <div className="pitem"><span>Google OAuth</span><b>{tr("Read-only Sheets")}</b></div>
        <div className="pitem"><span>{tr("Administrative changes")}</span><b>{tr("Allowlisted admins")}</b></div>
        <div className="pitem"><span>{tr("Unit prices")}</span><b>{tr("Verified live")}</b></div>
        <div className="pitem"><span>{tr("Issued offers")}</span><b>{tr("Not saved")}</b></div>
        <p className="muted">{tr("Company branding is loaded from the project settings. Public Facebook CDN logos and configured trusted logo hosts can be embedded in PDFs.")}</p>
      </section>
    </div></div>}
  </main></div>;
}
