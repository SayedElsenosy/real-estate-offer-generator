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
  {path:"/api/offers", method:"POST", name:"quote generation rejects unauthenticated users", expected:401},
  {path:"/api/inventory?projectId=cairo-plaza", name:"inventory rejects anonymous users", expected:401},
];
let failures=0;
for(const probe of probes){
  try{
    const response=await fetch(new URL(probe.path,origin),{redirect:"manual",method:probe.method||"GET",body:probe.method==="POST"?"{}":undefined,headers:{"Cache-Control":"no-cache",...(probe.method==="POST"?{"Content-Type":"application/json"}:{})},signal:AbortSignal.timeout(20000)});
    let body=null;
    if(probe.match){try{body=await response.json();}catch{}}
    const ok=response.status===probe.expected&&(!probe.match||probe.match(body??{}));
    console.log((ok?"PASS":"FAIL")+": "+probe.name+" (HTTP "+response.status+")");
    if(!ok)failures++;
  }catch(e){failures++;console.error("FAIL: "+probe.name+" (request error: "+(e?.name||"unknown")+")");}
}
// Catch Worker cross-request promise/context failures that only show up with
// overlapping requests and that a sequential test can miss.
const concurrent = await Promise.allSettled(Array.from({length:5},async (_,i)=>{
  const path=i%2===0?"/":"/api/auth/session";
  const response=await fetch(new URL(path,origin),{signal:AbortSignal.timeout(20000)});
  return response.status;
}));
const concurrentOk=concurrent.every(r=>r.status==="fulfilled"&&r.value===200);
console.log((concurrentOk?"PASS":"FAIL")+": parallel home/session requests ("+concurrent.filter(r=>r.status==="fulfilled"&&r.value===200).length+"/5)");
if(!concurrentOk)failures++;
if(failures)process.exitCode=1;
