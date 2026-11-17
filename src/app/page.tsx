import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  title: "Property Offer Studio | Offer Atelier"
};

/**
 * Opening the public domain is an explicit public-entry invitation.
 * Do not reveal the permanent /access#key token in a redirect, page,
 * response header, HTML or browser history. A route handler creates the
 * same restricted, signed shared-access cookie server-side.
 */
export default function Home() {
  redirect("/public-entry");
}
