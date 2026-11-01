"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useLanguage } from "@/components/LanguageProvider";

/**
 * The shared landing is a static, non-sensitive shell. Permission checks and
 * project data stay on authenticated APIs to avoid the Workers Free 10ms CPU
 * limit on every navigation. The shared cookie never authenticates /.
 */
export default function SharedLanding() {
  const router = useRouter();
  const { tr, language } = useLanguage();
  const [access, setAccess] = useState<"checking" | "allowed" | "error">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/access", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) throw new Error("Access check failed");
        const data: { active?: boolean } = await response.json();
        if (controller.signal.aborted) return;
        if (!data.active) {
          router.replace("/access");
          return;
        }
        setAccess("allowed");
      } catch {
        if (!controller.signal.aborted) setAccess("error");
      }
    })();
    return () => controller.abort();
  }, [router, attempt]);

  if (access !== "allowed") {
    return <main className="main" role="status" aria-live="polite">
      <div className="panel" style={{ maxWidth: 620, margin: "56px auto" }}>
        <h1>{language === "ar" ? "بوابة عروض الوحدات" : "Property Offer Portal"}</h1>
        {access === "error" ? <>
          <p role="alert">{language === "ar" ? "تعذر التحقق من صلاحية الرابط المشترك." : "Could not verify shared access."}</p>
          <button className="btn gold" type="button" onClick={() => { setAccess("checking"); setAttempt(v => v + 1); }}>
            {language === "ar" ? "إعادة المحاولة" : "Retry"}
          </button>
        </> : <p className="muted">{language === "ar" ? "جاري التحقق من صلاحية الدخول..." : "Verifying shared access..."}</p>}
      </div>
    </main>;
  }

  return <div className="shell">
    <Sidebar active="home" email="Private link access" shared />
    <main className="main">
      <div className="info-card">
        <div className="eyebrow">{tr("PROPERTY OFFER STUDIO")}</div>
        <h2>{tr("A smarter way to present each property.")}</h2>
        <p>{tr("From a single project overview to individual unit location and a precise installment table — all in one place.")}</p>
        <div className="actionline">
          <Link className="btn gold" href="/studio">{tr("Open Offer Studio")}</Link>
        </div>
      </div>
    </main>
  </div>;
}
