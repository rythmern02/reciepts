import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { getOrBuildReceipt } from "@/lib/engine/build-receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const receipts = await store.listReceipts({ graveyard: true });
  return NextResponse.json({ receipts });
}

/** Freeze a Receipt into the graveyard at the date of its raise. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.tokenAddress || !body?.reason) {
    return NextResponse.json({ error: "Missing tokenAddress or reason." }, { status: 400 });
  }
  const receipt = await getOrBuildReceipt(body.tokenAddress, { force: true });
  receipt.graveyard = {
    frozen: true,
    frozenAt: body.frozenAt ?? new Date().toISOString(),
    reason: body.reason,
  };
  await store.saveReceipt(receipt);
  return NextResponse.json({ ok: true, receipt });
}
