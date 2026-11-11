import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import type { Dispute } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.tokenAddress || !body?.sectionKey || !body?.lineLabel || !body?.counterSourceUrl) {
    return NextResponse.json({ error: "A dispute needs a counter-source URL." }, { status: 400 });
  }
  try {
    new URL(body.counterSourceUrl);
  } catch {
    return NextResponse.json({ error: "Counter-source must be a valid URL." }, { status: 400 });
  }
  const dispute: Dispute = {
    id: `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    tokenAddress: body.tokenAddress,
    sectionKey: body.sectionKey,
    lineLabel: body.lineLabel,
    counterSourceUrl: body.counterSourceUrl,
    note: body.note ?? "",
    status: "open",
    createdAt: new Date().toISOString(),
  };
  await store.addDispute(dispute);
  return NextResponse.json({ ok: true, dispute });
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "Missing ?address=" }, { status: 400 });
  const disputes = await store.disputesFor(address);
  return NextResponse.json({ disputes });
}
