import { NextResponse } from "next/server";
import { checkWatches } from "@/lib/engine/watch";
import { sendTelegram } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Scheduled refresh: re-run watched Receipts and dispatch alerts.
 *  Point a cron (Vercel Cron / external) at /api/cron/refresh. */
export async function GET() {
  const alerts = await checkWatches();
  let delivered = 0;
  for (const a of alerts) {
    if (a.channel === "telegram") {
      const ok = await sendTelegram(a.subscriber, a.text);
      if (ok) delivered++;
    }
  }
  return NextResponse.json({ checked: true, alerts: alerts.length, delivered });
}
