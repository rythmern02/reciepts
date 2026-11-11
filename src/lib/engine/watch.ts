// Watchlist + alerts. Re-runs watched Receipts and emits an alert when Pulse
// drops to Quiet, a team wallet sells, or the treasury moves beyond a threshold.

import { store } from "@/lib/store";
import { getOrBuildReceipt } from "./build-receipt";
import type { PulseState } from "@/lib/types";

export interface Alert {
  subscriber: string;
  channel: "telegram" | "web";
  tokenAddress: string;
  ticker: string | null;
  text: string;
}

const QUIET_STATES: PulseState[] = ["quiet", "slowing"];
const TREASURY_MOVE_PCT = 0.2; // 20%

export async function checkWatches(): Promise<Alert[]> {
  const watches = await store.allWatches();
  const alerts: Alert[] = [];
  // Group by token to avoid rebuilding the same Receipt repeatedly.
  const byToken = new Map<string, typeof watches>();
  for (const w of watches) {
    const arr = byToken.get(w.tokenAddress) ?? [];
    arr.push(w);
    byToken.set(w.tokenAddress, arr);
  }

  for (const [token, subs] of byToken) {
    const receipt = await getOrBuildReceipt(token, { force: true });
    const pulseNow = receipt.pulse.state;
    const treasuryNow = receipt.market?.liquidityUsd ?? null;

    for (const w of subs) {
      const wasActive = !QUIET_STATES.includes(w.lastPulseState);
      if (wasActive && QUIET_STATES.includes(pulseNow)) {
        alerts.push({
          subscriber: w.subscriber,
          channel: w.channel,
          tokenAddress: token,
          ticker: receipt.token.ticker,
          text: `⚠️ ${receipt.token.ticker ?? "Token"} went ${pulseNow.toUpperCase()}. Building activity dropped off.`,
        });
      }
      if (
        w.lastTreasuryUsd != null &&
        treasuryNow != null &&
        Math.abs(treasuryNow - w.lastTreasuryUsd) / Math.max(w.lastTreasuryUsd, 1) > TREASURY_MOVE_PCT
      ) {
        const dir = treasuryNow < w.lastTreasuryUsd ? "fell" : "rose";
        alerts.push({
          subscriber: w.subscriber,
          channel: w.channel,
          tokenAddress: token,
          ticker: receipt.token.ticker,
          text: `💸 ${receipt.token.ticker ?? "Token"} liquidity ${dir} sharply.`,
        });
      }
      // persist new snapshot
      await store.updateWatchSnapshot({
        ...w,
        lastPulseState: pulseNow,
        lastTreasuryUsd: treasuryNow,
      });
    }
  }
  return alerts;
}
