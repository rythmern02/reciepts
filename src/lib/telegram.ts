// Telegram Bot API helpers + Receipt → text card renderer.
import { config } from "./config";
import type { Receipt } from "./types";
import { STATUS_LABEL } from "./types";
import { PULSE_LABEL } from "./engine/pulse";

const API = (method: string) => `https://api.telegram.org/bot${config.telegramToken}/${method}`;

export async function sendTelegram(chatId: string, text: string, extra: Record<string, unknown> = {}): Promise<boolean> {
  if (!config.telegramToken) return false;
  try {
    const res = await fetch(API("sendMessage"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: false, ...extra }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function answerCallback(id: string, text?: string): Promise<void> {
  if (!config.telegramToken) return;
  await fetch(API("answerCallbackQuery"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text }),
  }).catch(() => {});
}

const EVIDENCE_EMOJI = { strong: "🟢", partial: "🟡", thin: "🔴" } as const;
const STATUS_EMOJI: Record<string, string> = { verified: "✅", found: "🔎", not_found: "⚪️", disputed: "⚠️" };

export function renderReceiptText(r: Receipt): string {
  const title = `${r.token.ticker ? "$" + r.token.ticker : "Token"} · ${r.token.name ?? "Unknown"}`;
  const head = `${EVIDENCE_EMOJI[r.evidence.level]} <b>${title}</b>\nEvidence: <b>${r.evidence.level.toUpperCase()}</b> (${r.evidence.sourced} of ${r.evidence.total} checks sourced)`;
  const sections = r.sections
    .map((s) => {
      const lines = s.lines
        .slice(0, 3)
        .map((l) => `  ${STATUS_EMOJI[l.status]} ${STATUS_LABEL[l.status]}: ${l.text}`)
        .join("\n");
      return `<b>${s.title.toUpperCase()}</b>\n${lines}`;
    })
    .join("\n\n");
  const pulse = `\n<b>PULSE</b>  ${PULSE_LABEL[r.pulse.state]}: ${r.pulse.activeWeeks}/${r.pulse.totalWeeks} weeks active`;
  const link = `\n\n🔗 ${config.baseUrl}/t/${r.slug}`;
  const notice = `\n<i>Not investment advice. Every line links to its source.</i>`;
  return `${head}\n\n${sections}${pulse}${link}${notice}`;
}

export function watchKeyboard(address: string) {
  return {
    inline_keyboard: [
      [
        { text: "👁 Watch", callback_data: `watch:${address.slice(0, 40)}` },
        { text: "🔗 Open", url: `${config.baseUrl}/t/${address}` },
      ],
    ],
  };
}
