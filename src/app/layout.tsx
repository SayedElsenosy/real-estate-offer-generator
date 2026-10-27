import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Offer Atelier | Real Estate Property Offers",
  description: "A premium real estate offer generator powered by private Google Sheets inventory."
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
