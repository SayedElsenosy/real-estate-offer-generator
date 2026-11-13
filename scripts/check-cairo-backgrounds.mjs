import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const source=readFileSync("src/data/cairo-bg-gzip.ts","utf8");
const labels=JSON.parse(readFileSync("src/data/cairo-plaza-labels.json","utf8"));
const expected=["-1","0","1","2","3","4","5","6"];
const entries=Object.fromEntries(
  [...source.matchAll(/"(-?\d+)":"([A-Za-z0-9+/=]+)"/g)].map(m=>[m[1],m[2]])
);
const expectedSource="855b5b71af07fcadfda33b5a9d15dba2738b008d85ed28009d8c456088740fbb";
if(labels.sourceSha256!==expectedSource) throw Error("CAD source hash mismatch");
if(Object.keys(entries).length!==expected.length)throw Error("Incorrect number of Cairo Plaza floor backgrounds");
for(const floor of expected){
  const payload=entries[floor];
  if(!payload)throw Error("Missing floor "+floor);
  const svg=gunzipSync(Buffer.from(payload,"base64")).toString("utf8");
  if(!svg.startsWith("<svg")||!svg.endsWith("</svg>")||
     !svg.includes('viewBox="0 0 214 155"')||
     /<script|<foreignObject|<image|xlink:href|onload\s*=/i.test(svg))
    throw Error("Invalid engineering CAD reference for floor "+floor);
  if(!labels.labelsByFloor[floor]?.length)throw Error("Missing CAD unit anchors for floor "+floor);
  console.log("PASS CAD floor "+floor+" ("+labels.labelsByFloor[floor].length+" source labels)");
}
console.log("PASS all eight CAD backgrounds and label anchors from the source DXF");
