import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(name)=>readFileSync("src/"+name,"utf8");
const admin=read("components/AdminPanel.tsx");
const page=read("app/admin/page.tsx");
const lang=read("components/LanguageProvider.tsx");
const share=read("components/ShareLinkButton.tsx");
const home=read("app/page.tsx");
const shared=read("components/SharedLanding.tsx");
const sharedPage=read("app/shared/page.tsx");
const sidebar=read("components/Sidebar.tsx");
const entry=read("components/PrivateAccessEntry.tsx");
const linkApi=read("app/api/access/owner-link/route.ts");
assert.match(linkApi,/\/access#key=/,"Existing shared URL format and token must remain unchanged.");
assert.match(entry,/fragment\.get\("key"\)/,"Existing private-link fragment must still be accepted.");
assert.match(entry,/history\.replaceState\(null, "", "\/access"\)/,
  "Remove secret fragment from browser history before verifying access.");
assert.doesNotMatch(home,/hasSharedAccess\(|import.*shared-access|session \|\| shared/,
  "Root page must never use the shared-access cookie for authentication.");
assert.match(home,/const session = authReady \? await auth\(\) : null;/,
  "Main URL must use the owner's Google session only.");
assert.match(home,/session \? <form action=\{async \(\) => \{ "use server"; await signOut/,
  "Only direct Google sessions can see sign-out on the owner home.");
assert.match(sharedPage,/force-static/,"Shared landing must stay a lightweight static shell.");
assert.match(shared,/fetch\("\/api\/access"/,"Shared portal must verify its cookie.");
assert.match(shared,/data\.active/,"Shared portal must reject visitors without permission.");
assert.doesNotMatch(shared,/signOut|Sign out/,"Shared portal must not offer owner logout.");
assert.match(entry,/location\.replace\("\/shared"\)/,"Access links must enter shared portal.");
assert.match(sidebar,/href: shared \? "\/shared" : "\/"/,
  "Shared sidebar overview must not route users back to the owner homepage.");
assert.match(sidebar,/href=\{shared \? "\/shared" : "\/"\}/,
  "Shared brand link must not route users back to the owner homepage.");

assert.match(admin,/items\.find\(p=>p\.id==="cairo-plaza"\)\?\.id\s*\|\|\s*items\[0\]/);
assert.match(admin,/<details className="panel"/);
assert.match(admin,/<ShareLinkButton\s*\/>/);
assert.doesNotMatch(page,/ShareLinkButton|padding:"18px 28px"/);
assert.match(page,/return <AdminPanel/);
assert.match(lang,/useState<Language>\("en"\)/);
assert.doesNotMatch(lang,/localStorage\.getItem\("offer_atelier_language_v2"\)/);
assert.match(share,/useLanguage\(\)/);
console.log("PASS: Cairo Plaza default in Admin, private link within layout, English initial locale, bilingual sharing, independent owner and shared landing routes.");
