import { NextRequest, NextResponse } from "next/server";
import { resolveInput, getOrBuildReceipt } from "@/lib/engine/build-receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  const force = req.nextUrl.searchParams.get("force") === "1";
  if (!q) return NextResponse.json({ error: "Missing ?q=" }, { status: 400 });

  const resolved = await resolveInput(q);
  if (!resolved.address) {
    return NextResponse.json({ error: resolved.error ?? "Could not resolve token." }, { status: 404 });
  }
  try {
    const receipt = await getOrBuildReceipt(resolved.address, { force });
    return NextResponse.json({ receipt });
  } catch (e) {
    return NextResponse.json({ error: `Build failed: ${(e as Error).message}` }, { status: 500 });
  }
}
