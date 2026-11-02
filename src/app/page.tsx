import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = {
  robots: { index: false, follow: false },
  title: "Property Offer Studio | Offer Atelier"
};

/**
 * The public root is an entry point to the SAME existing shared link.
 * Read the key from the Worker secret at request time: never commit it to Git,
 * embed it into the browser bundle, or invent a replacement access key.
 * The user deliberately made the root URL a public invitation URL.
 */
export default function Home() {
  const token = process.env.SHARED_ACCESS_TOKEN;
  if (!token || !/^[A-Za-z0-9_-]{40,128}$/.test(token)) {
    return <main style={{ padding: 32 }}>
      <h1>Property Offer Studio</h1>
      <p>The public access link is not configured.</p>
      <a href="/admin">Administrator sign in</a>
    </main>;
  }
  redirect("/access#key=" + encodeURIComponent(token));
}
