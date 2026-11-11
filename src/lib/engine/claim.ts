// Founder claim verification. Identity links must be SELF-PUBLISHED (PRD rule 5):
// a signed wallet message, a DNS TXT record on the project domain, or a proof
// file the founder published under their own GitHub/X account. We never unmask
// an anonymous founder.

import nacl from "tweetnacl";
import bs58 from "bs58";
import { promises as dns } from "dns";
import { fetchWithTimeout } from "@/lib/config";

/** Verify an ed25519 signature over the challenge message by the wallet. */
export function verifyWalletSignature(address: string, message: string, signatureB58: string): boolean {
  try {
    const pub = bs58.decode(address);
    const sig = bs58.decode(signatureB58);
    const msg = new TextEncoder().encode(message);
    return nacl.sign.detached.verify(msg, sig, pub);
  } catch {
    return false;
  }
}

/** Verify a DNS TXT record on the domain contains the nonce.
 *  Founder adds: TXT  receipts-verification=<nonce> */
export async function verifyDnsTxt(host: string, nonce: string): Promise<boolean> {
  const clean = host.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const candidates = [clean, `_receipts.${clean}`];
  for (const name of candidates) {
    try {
      const records = await dns.resolveTxt(name);
      const flat = records.map((r) => r.join("")).join(" ");
      if (flat.includes(nonce)) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

/** Verify a GitHub proof: a public gist or repo file under the founder's account
 *  that contains the nonce. We confirm both ownership (path) and content (nonce). */
export async function verifyGithubProof(handle: string, proofUrl: string, nonce: string): Promise<boolean> {
  try {
    const u = new URL(proofUrl);
    const ownedByHandle =
      new RegExp(`(^|\\.|/)${handle.toLowerCase()}(/|$)`).test(u.pathname.toLowerCase()) ||
      u.hostname.toLowerCase().startsWith(handle.toLowerCase());
    if (!/github/i.test(u.hostname) || !ownedByHandle) return false;
    // Prefer raw content.
    const rawUrl = proofUrl
      .replace("github.com", "raw.githubusercontent.com")
      .replace("/blob/", "/");
    for (const target of [rawUrl, proofUrl]) {
      const res = await fetchWithTimeout(target, { timeoutMs: 6000, headers: { "user-agent": "receipts" } });
      if (res.ok) {
        const text = await res.text();
        if (text.includes(nonce)) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** Best-effort X proof: a post under the founder's handle containing the nonce.
 *  X frequently blocks automated reads; when it does we return false (unverified)
 *  rather than guessing. */
export async function verifyXProof(handle: string, proofUrl: string, nonce: string): Promise<boolean> {
  try {
    const u = new URL(proofUrl);
    if (!/(x|twitter)\.com$/i.test(u.hostname)) return false;
    if (!u.pathname.toLowerCase().startsWith(`/${handle.toLowerCase()}`)) return false;
    const res = await fetchWithTimeout(proofUrl, { timeoutMs: 6000, headers: { "user-agent": "receipts" } });
    if (!res.ok) return false;
    const text = await res.text();
    return text.includes(nonce);
  } catch {
    return false;
  }
}
