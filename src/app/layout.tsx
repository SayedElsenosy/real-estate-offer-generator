import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";
export const metadata: Metadata = {
  title: "Offer Atelier | إنشاء عروض أسعار عقارية",
  description: "عروض أسعار عقارية احترافية من المخزون المباشر. / Real estate proposals from live inventory."
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ar" dir="rtl"><body><LanguageProvider>{children}</LanguageProvider></body></html>;
}
