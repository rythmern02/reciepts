import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import {
  verifyWalletSignature,
  verifyDnsTxt,
  verifyGithubProof,
  verifyXProof,
} from "@/lib/engine/claim";
import type { ClaimState } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { tokenAddress, method, nonce } = body ?? {};
  if (!tokenAddress || !method || !nonce) {
    return NextResponse.json({ error: "Missing tokenAddress, method, or nonce." }, { status: 400 });
  }
  const challenge = await store.getChallenge(nonce);
  if (!challenge || challenge.token !== tokenAddress) {
    return NextResponse.json({ error: "Invalid or expired challenge." }, { status: 400 });
  }

  const message = `I control the project behind Solana token ${tokenAddress}. Proof nonce: ${nonce} (receipts.xyz)`;
  const existing: ClaimState = (await store.getClaim(tokenAddress)) ?? { claimed: false };
  let verified = false;

  if (method === "wallet") {
    verified = verifyWalletSignature(body.address, message, body.signature);
    if (verified) existing.wallet = { address: body.address, verified: true };
  } else if (method === "dns") {
    verified = await verifyDnsTxt(body.host, nonce);
    if (verified) existing.domain = { host: body.host, verified: true };
  } else if (method === "github") {
    verified = await verifyGithubProof(body.handle, body.proofUrl, nonce);
    if (verified) existing.github = { handle: body.handle, verified: true, proofUrl: body.proofUrl };
  } else if (method === "x") {
    verified = await verifyXProof(body.handle, body.proofUrl, nonce);
    if (verified) existing.x = { handle: body.handle, verified: true, proofUrl: body.proofUrl };
  } else {
    return NextResponse.json({ error: "Unknown method." }, { status: 400 });
  }

  if (!verified) {
    return NextResponse.json({ ok: false, error: `${method} proof could not be verified. Check the nonce and try again.` }, { status: 200 });
  }

  existing.claimed = true;
  existing.claimedAt = existing.claimedAt ?? new Date().toISOString();
  await store.saveClaim(tokenAddress, existing);
  return NextResponse.json({ ok: true, claim: existing });
}
