// Market snapshot + profile enrichment via DexScreener public API (no key).
// Market numbers are display-only (PRD: "Display only"). The profile (name,
// symbol, image, website, socials) is used to enrich on-chain metadata so the
// Team/Work/Pulse sections have links to work from even without a Helius key.
import { fetchWithTimeout } from "@/lib/config";
import type { MarketSnapshot } from "@/lib/types";

export interface DexProfile {
  name: string | null;
  symbol: string | null;
  image: string | null;
  links: { site?: string; github?: string; twitter?: string; telegram?: string };
}

export async function fetchBestPair(mint: string): Promise<any | null> {
  try {
    const res = await fetchWithTimeout(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { timeoutMs: 6000 });
    if (!res.ok) return null;
    const json = await res.json();
    // Only pairs where THIS mint is the base token, otherwise priceUsd/marketCap
    // describe the other side of the pair.
    const pairs: any[] = (json.pairs ?? []).filter(
      (p: any) => p.chainId === "solana" && p.baseToken?.address === mint,
    );
    if (pairs.length === 0) return null;

    // Prefer canonical quote tokens (SOL / USDC / USDT). Exotic-quote pairs are a
    // common source of spoofed liquidity and absurd prices, so they only win when
    // no canonical pair exists.
    const CANON = new Set(["SOL", "WSOL", "USDC", "USDT"]);
    const canonical = pairs.filter((p) => CANON.has((p.quoteToken?.symbol ?? "").toUpperCase()));
    const pool = canonical.length ? canonical : pairs;
    pool.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    return pool[0];
  } catch {
    return null;
  }
}

export function toMarket(p: any): MarketSnapshot {
  return {
    priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
    liquidityUsd: p.liquidity?.usd ?? null,
    marketCapUsd: p.marketCap ?? null,
    fdvUsd: p.fdv ?? null,
    volume24hUsd: p.volume?.h24 ?? null,
    priceChange24h: p.priceChange?.h24 ?? null,
    fromAthPct: null,
    dexUrl: p.url ?? null,
    pairCreatedAt: p.pairCreatedAt ? new Date(p.pairCreatedAt).toISOString() : null,
  };
}

export function toProfile(p: any): DexProfile {
  const links: DexProfile["links"] = {};
  const scan = (url?: string) => {
    if (!url || typeof url !== "string") return;
    if (/github\.com/i.test(url)) links.github ??= url;
    else if (/(twitter|x)\.com/i.test(url)) links.twitter ??= url;
    else if (/t\.me|telegram/i.test(url)) links.telegram ??= url;
    else if (/^https?:\/\//i.test(url)) links.site ??= url;
  };
  const info = p.info ?? {};
  for (const w of info.websites ?? []) scan(w?.url);
  for (const s of info.socials ?? []) scan(s?.url);
  return {
    name: p.baseToken?.name ?? null,
    symbol: p.baseToken?.symbol ?? null,
    image: info.imageUrl ?? null,
    links,
  };
}

/** Back-compat single-call used by the orchestrator when it doesn't reuse a pair. */
export async function collectMarket(mint: string): Promise<MarketSnapshot | null> {
  const p = await fetchBestPair(mint);
  return p ? toMarket(p) : null;
}
