#!/usr/bin/env node
// Non-sensitive smoke checks, run only after deploying Cloudflare staging.
// No credentials, cookies, response payloads or personal information are logged.
const origin = "https://real-estate-offer-generator.sayedelsenosy65.workers.dev";
const probes = [
  {path:"/api/migration-health", name:"worker health", expected:200, match:body=>body.cloudflareMigration===true},
  {path:"/api/auth/providers", name:"Google auth provider registered", expected:200, match:body=>Boolean(body.google?.signinUrl)},
  {path:"/api/auth/session", name:"unauthenticated auth session", expected:200},
  {path:"/", name:"home page", expected:200},
  {path:"/api/offers", name:"quote history remains disabled", expected:410},
  {path:"/api/inventory?projectId=cairo-plaza", name:"inventory rejects anonymous users", expected:401},
];
let failures=0;
for(const probe of probes){
  try{
    const response=await fetch(new URL(probe.path,origin),{redirect:"manual",headers:{"Cache-Control":"no-cache"},signal:AbortSignal.timeout(20000)});
    let body=null;
    if(probe.match){try{body=await response.json();}catch{}}
    const ok=response.status===probe.expected&&(!probe.match||probe.match(body??{}));
    console.log((ok?"PASS":"FAIL")+": "+probe.name+" (HTTP "+response.status+")");
    if(!ok)failures++;
  }catch(e){failures++;console.error("FAIL: "+probe.name+" (request error: "+(e?.name||"unknown")+")");}
}
if(failures)process.exitCode=1;
