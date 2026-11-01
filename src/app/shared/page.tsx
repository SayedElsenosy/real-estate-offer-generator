import SharedLanding from "@/components/SharedLanding";

// Shared visits use a separate, static entry point. No project data is
// included in HTML and an authorized shared cookie is checked by the client.
export const dynamic = "force-static";
export const metadata = {
  title: "Shared Offer Portal | Offer Atelier",
  robots: { index: false, follow: false }
};

export default function SharedPage() {
  return <SharedLanding />;
}
