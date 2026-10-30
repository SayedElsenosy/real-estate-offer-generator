"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type LiveInventoryUnit = {code:string;price:string;area:string;floor:string;status:string;project:string};
export type LiveFloorPlan = {id:string;name:string;floor:string|null;viewBox:string;
  shapes:{unitCode:string;d:string}[];backgroundData?:string|null;reviewStatus:string};
type Result = {units:LiveInventoryUnit[];floorPlans:LiveFloorPlan[];lastReadAt:number};
const POLL_MS = 10000;

// Poll live Google data while the page is visible. Avoid re-downloading JSON
// or invalidating React state when the ETag has not changed.
export function useLiveInventory(projectId:string,includeFloors=false) {
  const [data,setData]=useState<Result>({units:[],floorPlans:[],lastReadAt:0});
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState("");
  const etag=useRef("");
  const controller=useRef<AbortController|null>(null);
  const inFlight=useRef(false);

  const refresh=useCallback(async () => {
    if(!projectId||inFlight.current||typeof document==="undefined"||document.visibilityState==="hidden")return;
    inFlight.current=true;
    setRefreshing(true);
    const ac=new AbortController();controller.current=ac;
    try{
      const query=new URLSearchParams({projectId,includeFloors:includeFloors?"1":"0"});
      const response=await fetch("/api/inventory?"+query,{
        cache:"no-store",signal:ac.signal,headers:etag.current?{"If-None-Match":etag.current}:{}
      });
      if(response.status===304){setError("");return;}
      const payload=await response.json() as {error?:string;units?:LiveInventoryUnit[];
        floorPlans?:LiveFloorPlan[];lastReadAt?:number};
      if(!response.ok||payload.error)throw Error(payload.error||"Could not refresh inventory");
      if(ac.signal.aborted)return;
      etag.current=response.headers.get("ETag")||"";
      setData({
        units:payload.units||[],floorPlans:payload.floorPlans||[],
        lastReadAt:payload.lastReadAt||Date.now()
      });
      setError("");
    }catch(err){
      if(!ac.signal.aborted)setError(err instanceof Error?err.message:"Could not refresh inventory");
    }finally{
      inFlight.current=false;
      if(!ac.signal.aborted){setLoading(false);setRefreshing(false);}
    }
  },[projectId,includeFloors]);

  useEffect(()=>{
    controller.current?.abort();inFlight.current=false;etag.current="";
    setData({units:[],floorPlans:[],lastReadAt:0});
    setError("");setLoading(true);setRefreshing(false);
    void refresh();
    const timer=setInterval(()=>void refresh(),POLL_MS);
    const onVisible=()=>{if(document.visibilityState==="visible")void refresh();};
    const onFocus=()=>void refresh();
    window.addEventListener("focus",onFocus);
    document.addEventListener("visibilitychange",onVisible);
    return ()=>{
      clearInterval(timer);controller.current?.abort();inFlight.current=false;
      window.removeEventListener("focus",onFocus);
      document.removeEventListener("visibilitychange",onVisible);
    };
  },[refresh]);
  return {...data,loading,refreshing,error,refresh};
}
