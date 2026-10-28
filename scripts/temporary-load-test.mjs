import {randomBytes} from "node:crypto";
import {spawn} from "node:child_process";

const origin="https://real-estate-offer-generator.sayedelsenosy65.workers.dev";
const url=origin+"/api/temporary-load-test";
const secret=randomBytes(40).toString("hex");
function wrangler(args,input=""){
  return new Promise((resolve,reject)=>{
    const child=spawn("npx",["wrangler",...args],{stdio:["pipe","pipe","pipe"]});
    let output="";
    for(const stream of [child.stdout,child.stderr])
      stream.on("data",chunk=>{output+=String(chunk).slice(0,2048);});
    child.on("error",reject);
    child.on("close",code=>code===0?resolve(output):reject(Error("wrangler command failed with exit code "+code+"; "+output.slice(-250))));
    child.stdin.end(input);
  });
}
const percentile=(arr,p)=>arr.length?arr[Math.min(arr.length-1,Math.ceil(p*arr.length)-1)]:null;
async function burst(count){
  const started=Date.now();
  const results=await Promise.all(Array.from({length:count},async ()=>{
    const start=performance.now();
    try{
      const resp=await fetch(url,{method:"POST",
        headers:{"Authorization":"Bearer "+secret},
        signal:AbortSignal.timeout(90000),cache:"no-store"});
      const bytes=await resp.arrayBuffer();
      const pdf=resp.ok && resp.headers.get("content-type")?.includes("application/pdf") &&
        new TextDecoder().decode(bytes.slice(0,5))==="%PDF-";
      return {status:resp.status,ms:Math.round(performance.now()-start),pdf,bytes:bytes.byteLength};
    }catch(err){
      return {status:0,ms:Math.round(performance.now()-start),pdf:false,
        error:err?.name||"network_error"};
    }
  }));
  const durations=results.map(r=>r.ms).sort((a,b)=>a-b);
  const successes=results.filter(r=>r.pdf);
  const failures=results.filter(r=>!r.pdf);
  const byStatus=Object.fromEntries([...new Set(results.map(r=>r.status))].map(
    status=>[String(status),results.filter(r=>r.status===status).length]));
  const payload={
    requested:count,success:successes.length,failed:failures.length,
    elapsedMs:Date.now()-started,latencyMs:{
      min:durations[0],median:percentile(durations,0.5),
      p90:percentile(durations,0.9),p95:percentile(durations,0.95),
      p99:percentile(durations,0.99),max:durations.at(-1)
    },
    statuses:byStatus,
    fileSize:successes.length?{min:Math.min(...successes.map(x=>x.bytes)),
      max:Math.max(...successes.map(x=>x.bytes))}:null,
    errorTypes:Object.fromEntries([...new Set(failures.map(r=>r.error).filter(Boolean))]
      .map(name=>[name,failures.filter(r=>r.error===name).length]))
  };
  console.log("OFFER LOAD TEST RESULT "+JSON.stringify(payload));
  return payload;
}
console.log("Starting temporary one-time, secret-protected Offer Atelier real pipeline test.");
let testResult=null;
try{
  await wrangler(["secret","put","OFFER_LOAD_TEST_SECRET"],secret+"\n");
  // A secret update creates a new Worker deployment; edge propagation can
  // lag several seconds. Recheck the single request before a 100-way burst.
  await new Promise(resolve=>setTimeout(resolve,12000));
  let single=await burst(1);
  for(let attempt=0;attempt<4&&single.success!==1&&single.statuses["404"];attempt++){
    await new Promise(resolve=>setTimeout(resolve,4000));
    single=await burst(1);
  }
  if(single.success!==1){
    console.log("Single real offer failed; 100-request burst intentionally skipped.");
    testResult={single,burst100:null};
  }else{
    const simultaneous=await burst(100);
    testResult={single,burst100:simultaneous};
  }
}finally{
  try{await wrangler(["secret","delete","OFFER_LOAD_TEST_SECRET"],"y\n");}
  catch(e){console.error("WARNING: Could not remove temporary test credential automatically. Redeploy without endpoint immediately.",String(e).slice(0,220));}
}
if(!testResult?.burst100 || testResult.burst100.failed>0){
  console.error("LOAD TEST FAILED: real 100-user concurrent offer generation not yet proven.");
  process.exitCode=1;
}else{
  console.log("LOAD TEST PASSED: 100 simultaneous full Google+Neon+PDF offers.");
}
