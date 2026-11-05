"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Studio from "@/components/Studio";
import { useLanguage } from "@/components/LanguageProvider";

type Bootstrap = {
  projects: Parameters<typeof Studio>[0]["projects"];
  email: string;
};
const RETRY_DELAYS_MS = [0, 400, 1200] as const;

// Retry only transient Worker failures. Never retry unauthorized access,
// cache personal project data publicly or expose OAuth/Drive credentials.
export default function StudioBootstrap() {
  const router = useRouter();
  const { language } = useLanguage();
  const [retryKey, setRetryKey] = useState(0);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
        if (attempt > 0) {
          await new Promise<void>(resolve => {
            window.setTimeout(resolve, RETRY_DELAYS_MS[attempt]);
          });
        }
        if (controller.signal.aborted) return;
        try {
          const response = await fetch("/api/studio/bootstrap", {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal
          });
          if (response.status === 401) {
            router.replace("/");
            return;
          }
          if (!response.ok) {
            if ([429, 500, 502, 503, 504].includes(response.status) &&
                attempt + 1 < RETRY_DELAYS_MS.length) continue;
            throw new Error("Workspace request failed");
          }
          const payload: unknown = await response.json();
          if (!payload || typeof payload !== "object" ||
              !("projects" in payload) ||
              !Array.isArray(payload.projects) ||
              !("email" in payload) ||
              typeof payload.email !== "string") {
            throw new Error("Invalid workspace data");
          }
          if (!controller.signal.aborted) setBootstrap(payload as Bootstrap);
          return;
        } catch {
          if (controller.signal.aborted) return;
          if (attempt + 1 === RETRY_DELAYS_MS.length) {
            setError(language === "ar"
              ? "تعذر تحميل المشاريع. تأكد من الاتصال وحاول مرة أخرى."
              : "Unable to load projects. Check your connection and try again.");
          }
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [language, retryKey, router]);

  if (bootstrap) return <Studio projects={bootstrap.projects} email={bootstrap.email} />;
  return <main className="main" role="status" aria-live="polite">
    <div className="panel" style={{ maxWidth: 680, margin: "56px auto" }}>
      <h1>{language === "ar" ? "استوديو عروض الوحدات" : "Property Offer Studio"}</h1>
      {error ? <>
        <p className="notice" role="alert">{error}</p>
        <button type="button" className="btn gold" onClick={() => {
          setError("");
          setRetryKey(key => key + 1);
        }}>{language === "ar" ? "إعادة المحاولة" : "Retry"}</button>
      </> : <p className="muted">{
        language === "ar" ? "جاري تحميل المشاريع وأنظمة السداد..." :
          "Loading your projects and payment plans..."
      }</p>}
    </div>
  </main>;
}
