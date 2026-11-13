import { readFileSync, existsSync } from "node:fs";
const expected={"-1":18,"0":282,"1":259,"2":67,"3":35,"4":37,"5":37,"6":37};
const allCodes=new Set();
let total=0,outlined=0,unresolved=0,review=0;
for(const [floor,count] of Object.entries(expected)){
  const file=`src/data/cairo-svg-floor-${floor}.json`;
  const bg=`public/cairo-cad/floor-${floor}.svg`;
  if(!existsSync(file)||!existsSync(bg))throw Error("Missing CAD data or background on floor "+floor);
  const data=JSON.parse(readFileSync(file,"utf8"));
  const svg=readFileSync(bg,"utf8");
  if(!/^<svg\b/.test(svg)||!svg.includes('viewBox="0 0 214 155"')||/<script|<foreignObject/i.test(svg))
    throw Error("Unsafe or unaligned engineering SVG "+bg);
  if(data.units.length!==count)throw Error("Unexpected unit count "+floor);
  for(const unit of data.units){
    const key=unit.code.normalize("NFKC").trim().toUpperCase();
    if(allCodes.has(key))throw Error("Duplicate unit across floors "+key);
    allCodes.add(key);
    if(unit.d){
      if(!/^M[0-9.,L-]+Z$/.test(unit.d))throw Error("Invalid unit path "+key);
      outlined++;
      if(unit.status==="REVIEW")review++;
    }else{
      if(unit.status!=="UNRESOLVED"||!Number.isFinite(unit.x)||!Number.isFinite(unit.y))
        throw Error("Unresolved unit has no valid CAD anchor: "+key);
      unresolved++;
    }
    total++;
  }
}
if(total!==772||outlined!==749||unresolved!==23||review!==23)
  throw Error("Cairo CAD coverage or flagged-unit count regressed.");
console.log(`Cairo CAD overlays PASS: ${total} unit codes, ${outlined} SVG boundaries (${review} review notices), ${unresolved} location markers, 8 CAD drawings.`);
