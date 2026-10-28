import { cookies } from "next/headers";

const COOKIE_NAME = "offer_atelier_shared";
const SESSION_SECONDS = 365 * 24 * 60 * 60;
const encoder = new TextEncoder();

function keyText(): string | null {
  const token = process.env.SHARED_ACCESS_TOKEN;
  return token && token.length >= 40 ? token : null;
}

function base64url(data: Uint8Array): string {
  let raw = "";
  for (const byte of data) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signingKey() {
  const secret = keyText();
  if (!secret) return null;
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function hasSharedAccess(): Promise<boolean> {
  const key = await signingKey();
  if (!key) return false;
  const cookie = (await cookies()).get(COOKIE_NAME)?.value || "";
  const parts = cookie.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const expiry = Number(parts[1]);
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now() / 1000 ||
      expiry > Date.now() / 1000 + SESSION_SECONDS + 60) return false;
  if (!/^[A-Za-z0-9_-]{20,60}$/.test(parts[2]) ||
      !/^[A-Za-z0-9_-]{40,60}$/.test(parts[3])) return false;
  const signed = [parts[0], parts[1], parts[2]].join(".");
  try {
    const signature = parts[3].replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(signature), ch => ch.charCodeAt(0));
    return crypto.subtle.verify("HMAC", key, bytes, encoder.encode(signed));
  } catch {
    return false;
  }
}

export async function issueSharedAccessCookie(): Promise<void> {
  const key = await signingKey();
  if (!key) throw new Error("Private link access is not configured.");
  const expiration = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(24)));
  const contents = "v1." + expiration + "." + nonce;
  const signature = base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(contents))));
  (await cookies()).set(COOKIE_NAME, contents + "." + signature, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS
  });
}

export function verifySharedLink(token: unknown): boolean {
  // Do not compare user-controlled token strings with secret strings directly.
  // A SHA-256 digest is compared below in constant time by the verifier.
  return typeof token === "string" && /^[A-Za-z0-9_-]{40,128}$/.test(token) && Boolean(keyText());
}

export async function isValidSharedLink(token: unknown): Promise<boolean> {
  if (!verifySharedLink(token)) return false;
  const expected = encoder.encode(keyText()!);
  const actual = encoder.encode(token as string);
  // Both tokens are ASCII; constant-time comparison over equal-size arrays.
  const len = Math.max(expected.length, actual.length);
  let delta = expected.length ^ actual.length;
  for (let i = 0; i < len; i++) delta |= (expected[i] || 0) ^ (actual[i] || 0);
  return delta === 0;
}

export function sharedOwnerEmail(): string | null {
  const fromConfig = process.env.SHARED_ACCESS_OWNER_EMAIL || (process.env.ADMIN_EMAILS || "").split(",")[0];
  return fromConfig?.trim().toLowerCase() || null;
}
