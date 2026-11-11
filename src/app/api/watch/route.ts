import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { getOrBuildReceipt } from "@/lib/engine/build-receipt";
import type { WatchEntry } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const subscriber = req.nextUrl.searchParams.get("subscriber");
  if (!subscriber) return NextResponse.json({ error: "Missing ?subscriber=" }, { status: 400 });
  const watches = await store.watchesFor(subscriber);
  const receipts = await Promise.all(
    watches.map((w) => getOrBuildReceipt(w.tokenAddress).catch(() => null)),
  );
  return NextResponse.json({
    watches: watches.map((w, i) => ({ ...w, receipt: receipts[i] })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.tokenAddress || !body?.subscriber) {
    return NextResponse.json({ error: "Missing tokenAddress or subscriber." }, { status: 400 });
  }
  const receipt = await getOrBuildReceipt(body.tokenAddress).catch(() => null);
  const entry: WatchEntry = {
    tokenAddress: body.tokenAddress,
    subscriber: body.subscriber,
    channel: body.channel === "telegram" ? "telegram" : "web",
    addedAt: new Date().toISOString(),
    lastPulseState: receipt?.pulse.state ?? "unknown",
    lastTreasuryUsd: receipt?.market?.liquidityUsd ?? null,
  };
  await store.addWatch(entry);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const subscriber = req.nextUrl.searchParams.get("subscriber");
  if (!address || !subscriber) return NextResponse.json({ error: "Missing params." }, { status: 400 });
  await store.removeWatch(address, subscriber);
  return NextResponse.json({ ok: true });
}
