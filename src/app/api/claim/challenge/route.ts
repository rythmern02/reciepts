import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.tokenAddress) return NextResponse.json({ error: "Missing tokenAddress." }, { status: 400 });
  const challenge = await store.createChallenge(body.tokenAddress);
  return NextResponse.json({
    ...challenge,
    instructions: {
      wallet: "Sign the message below with the team wallet.",
      dns: `Add a DNS TXT record on your domain:  receipts-verification=${challenge.nonce}`,
      github: "Publish a public gist or repo file under your account containing the nonce, then paste its URL.",
      x: "Post the nonce from your project X account, then paste the post URL.",
    },
  });
}
