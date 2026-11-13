import StudioBootstrap from "@/components/StudioBootstrap";

// The page contains no user information, so vinext can serve its pre-rendered
// HTML as a static asset without running authenticated SSR in the Worker.
// All user/project/payment-plan reads occur through /api/studio/bootstrap.
export const dynamic = "force-static";

export default function StudioPage() {
  return <StudioBootstrap />;
}
