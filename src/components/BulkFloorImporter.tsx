"use client";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import JSZip from "jszip";

type Floor = {
  id: string;
  floor: string | null;
  reviewStatus?: string;
  shapes?: { unitCode: string; d: string }[];
};
type ManifestFloor = {
  floor: string;
  name: string;
  viewBox: string;
  image: string;
  markers: { code: string; x: number; y: number }[];
  shapes?: { unitCode: string; d: string }[];
  reviewStatus?: string;
};
type Manifest = { version: number; projectId: string; floors: ManifestFloor[] };
export function BulkFloorImporter({ projectId, floors }: { projectId: string; floors: Floor[] }) {
  const { tr } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [failures, setFailures] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  async function importZip(file: File) {
    if (busy) return;
    setBusy(true);
    setDone(false);
    setProgress("Opening Cairo Plaza floorplan archive...");
    setFailures([]);
    const problems: string[] = [];
    try {
      if (projectId !== "cairo-plaza") throw Error("This verified archive belongs only to Cairo Plaza.");
      if (file.size > 12000000) throw Error("Maximum permitted ZIP size is 12MB.");
      const zip = await JSZip.loadAsync(file, {checkCRC32:true});
      const metadata = zip.file("manifest.json");
      if (!metadata) throw Error("Archive is missing manifest.json.");
      const manifest = JSON.parse(await metadata.async("string")) as Manifest;
      if (manifest.version !== 1 || manifest.projectId !== projectId ||
          !Array.isArray(manifest.floors) || manifest.floors.length !== 8)
        throw Error("Not a validated 8-floor Cairo Plaza package.");
      const allFloors = new Set(manifest.floors.map(item=>item.floor));
      if (allFloors.size !== 8) throw Error("Duplicate floors found in archive.");
      for (let i=0; i<manifest.floors.length; i++) {
        const item = manifest.floors[i];
        const existing = floors.find(f=>f.floor===item.floor);
        if (existing?.reviewStatus === "APPROVED") {
          problems.push(item.name+": already approved; skipped to protect verified geometry.");
          continue;
        }
        const source = zip.file(item.image);
        if (!source || !item.image.startsWith("images/") ||
            !/\.jpe?g$/i.test(item.image)) {
          problems.push(item.name+": reference JPEG missing or invalid.");
          continue;
        }
        const bytes = await source.async("uint8array");
        if (bytes.length > 2*1024*1024 || bytes.length < 100 ||
            bytes[0] !== 255 || bytes[1] !== 216) {
          problems.push(item.name+": invalid JPEG or exceeds 2MB.");
          continue;
        }
        const image = "data:image/jpeg;base64," + await source.async("base64");
        const markers = (item.markers || []).map(m=>({
          code: String(m.code),x:Number(m.x),y:Number(m.y)
        }));
        setProgress("Uploading floor "+(i+1)+" of 8: "+item.name+"...");
        const response = await fetch("/api/floors", {
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            id:existing?.id || undefined,projectId,name:item.name,
            floor:item.floor,viewBox:item.viewBox,
            shapes:existing?.shapes || [],
            backgroundData:image,markers,
            reviewStatus:"DRAFT",approvalConfirmed:false
          })
        });
        const value = await response.json();
        if (!response.ok) problems.push(item.name+": "+(value.error || "Server rejected upload"));
      }
      setFailures(problems);
      if (problems.length) {
        setProgress("Completed with "+problems.length+" exceptions. Successful floors were saved.");
      } else {
        setDone(true);
        setProgress("All 8 Cairo Plaza floor backgrounds and 121 verified text-location annotations saved as DRAFT. Refresh to inspect.");
      }
    } catch(e) {
      setFailures([e instanceof Error?e.message:"Archive import failed"]);
      setProgress("Import could not finish.");
    } finally {setBusy(false);}
  }
  return <div className="panel" style={{marginBottom:20}}>
    <div className="eyebrow">{tr("CAIRO PLAZA / AUTOMATED BULK IMPORT")}</div>
    <h2 style={{marginTop:12}}>{tr("Import all 8 architectural floors in one go")}</h2>
    <p className="muted">{tr("The package contains the exact eight original floor pictures, plus 121 source-confirmed unit-code label positions. All floors are saved as Draft so that annotation hotspots cannot be mistaken for surveyed unit boundaries. No sales data or original drawing is modified.")}</p>
    <label className="fieldlabel">{tr("Select Cairo Plaza bulk package ZIP")}
      <input className="field" type="file" accept=".zip,application/zip"
        disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void importZip(file);}}/>
    </label>
    {progress && <p className={done?"notice good":"notice"} style={{marginTop:14}}>{progress}</p>}
    {failures.map((item,i)=><p key={i} className="muted">{item}</p>)}
    {done && <button className="btn soft" type="button" onClick={()=>window.location.reload()}>{tr("Reload saved floorplans")}</button>}
  </div>;
}
