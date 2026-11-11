import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { handleUpdate } from "@/lib/bot-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Telegram webhook. Set it with:
 *  curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<BASE>/api/telegram" */
export async function POST(req: NextRequest) {
  if (!config.telegramToken) return NextResponse.json({ ok: false, error: "No bot token set." });
  const update = await req.json().catch(() => null);
  if (update) await handleUpdate(update);
  return NextResponse.json({ ok: true });
}
