// Shared Telegram update handler, used by the webhook route and the polling
// bot script so both surfaces behave identically.

import { resolveInput, getOrBuildReceipt } from "./engine/build-receipt";
import { store } from "./store";
import { sendTelegram, answerCallback, renderReceiptText, watchKeyboard } from "./telegram";
import type { WatchEntry } from "./types";

export async function handleUpdate(update: any): Promise<void> {
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = String(cq.message?.chat?.id);
    const data: string = cq.data ?? "";
    if (data.startsWith("watch:")) {
      const addr = data.slice(6);
      const receipt = await getOrBuildReceipt(addr).catch(() => null);
      const entry: WatchEntry = {
        tokenAddress: addr,
        subscriber: chatId,
        channel: "telegram",
        addedAt: new Date().toISOString(),
        lastPulseState: receipt?.pulse.state ?? "unknown",
        lastTreasuryUsd: receipt?.market?.liquidityUsd ?? null,
      };
      await store.addWatch(entry);
      await answerCallback(cq.id, "Added to your watchlist ✅");
      await sendTelegram(chatId, `You'll get an alert if ${receipt?.token.ticker ?? "this token"} goes quiet or the treasury moves.`);
    }
    return;
  }

  const msg = update.message;
  if (!msg?.text) return;
  const chatId = String(msg.chat.id);
  const text: string = msg.text.trim();

  if (text.startsWith("/start")) {
    await sendTelegram(
      chatId,
      "👋 <b>Receipts</b>: paste any Solana token address or $ticker and I'll pull its evidence card: team, work, pulse, money, wallet. Every line links to its source.\n\nTry sending a token address.",
    );
    return;
  }

  if (text.startsWith("/watchlist")) {
    const watches = await store.watchesFor(chatId);
    if (!watches.length) {
      await sendTelegram(chatId, "Your watchlist is empty. Send a token, then tap 👁 Watch.");
    } else {
      const lines = watches.map((w) => `• ${w.tokenAddress.slice(0, 8)}… (${w.lastPulseState})`).join("\n");
      await sendTelegram(chatId, `<b>Your watchlist</b>\n${lines}`);
    }
    return;
  }

  const query = text.replace(/^\/receipt\s+/, "");
  const resolved = await resolveInput(query);
  if (!resolved.address) {
    await sendTelegram(chatId, `Couldn't resolve "${query}" to a Solana token. Send a mint address or a $ticker.`);
    return;
  }
  await sendTelegram(chatId, "⏳ Pulling receipts…");
  try {
    const receipt = await getOrBuildReceipt(resolved.address);
    await sendTelegram(chatId, renderReceiptText(receipt), { reply_markup: watchKeyboard(receipt.slug) });
  } catch (e) {
    await sendTelegram(chatId, `Build failed: ${(e as Error).message}`);
  }
}
