// Long-polling Telegram bot for local dev (no public webhook needed).
//   TELEGRAM_BOT_TOKEN=xxx npm run bot
import { config } from "../src/lib/config";
import { handleUpdate } from "../src/lib/bot-handler";

async function main() {
  if (!config.telegramToken) {
    console.error("Set TELEGRAM_BOT_TOKEN in your environment first.");
    process.exit(1);
  }
  console.log("🤖 Receipts bot polling… (Ctrl-C to stop)");
  let offset = 0;
  // Drop any webhook so polling works.
  await fetch(`https://api.telegram.org/bot${config.telegramToken}/deleteWebhook`).catch(() => {});

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${config.telegramToken}/getUpdates?timeout=30&offset=${offset}`,
      );
      const json = await res.json();
      for (const update of json.result ?? []) {
        offset = update.update_id + 1;
        handleUpdate(update).catch((e) => console.error("handler error", e));
      }
    } catch (e) {
      console.error("poll error", e);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

main();
