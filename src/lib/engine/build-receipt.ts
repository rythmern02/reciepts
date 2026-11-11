// Orchestrator. Resolve → collect (4 in parallel) → normalise → summarise →
// render record. Cached Receipt in <2s, fresh in <10s.

import { config, fetchWithTimeout } from "@/lib/config";
import { getTokenMeta, isValidMint } from "@/lib/solana";
import { store } from "@/lib/store";
import type { Receipt, TokenRef } from "@/lib/types";
import { collectRepo } from "./collectors/repo";
import { collectSite } from "./collectors/site";
import { fetchBestPair, toMarket, toProfile } from "./collectors/market";
import { collectOnchain } from "./collectors/onchain";
import { computePulse } from "./pulse";
import { normalise } from "./normalise";
import { summarise } from "./summarise";
import { computeEvidence } from "./evidence";

export interface ResolveResult {
  address: string | null;
  error?: string;
}

/** Accepts a mint address, a slug, or a ticker (via DexScreener search). */
export async function resolveInput(raw: string): Promise<ResolveResult> {
  const input = raw.trim().replace(/^\$/, "");
  if (isValidMint(input)) return { address: input };

  // Known slug?
  const bySlug = await store.getReceiptBySlug(input.toLowerCase());
  if (bySlug) return { address: bySlug.token.address };

  // Ticker search on DexScreener.
  try {
    const res = await fetchWithTimeout(
      `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(input)}`,
      { timeoutMs: 6000 },
    );
    if (res.ok) {
      const json = await res.json();
      const pairs: any[] = (json.pairs ?? []).filter(
        (p: any) => p.chainId === "solana" && p.baseToken?.symbol?.toLowerCase() === input.toLowerCase(),
      );
      pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
      if (pairs[0]?.baseToken?.address) return { address: pairs[0].baseToken.address };
    }
  } catch {
    /* ignore */
  }
  return { address: null, error: `Could not resolve "${raw}" to a Solana token.` };
}

function makeSlug(token: TokenRef): string {
  const sym = token.ticker?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (sym && sym.length >= 2 && sym.length <= 12) return sym;
  return token.address.slice(0, 8).toLowerCase();
}

export type StageId = "cache" | "meta" | "market" | "chain" | "repo" | "site" | "write";
export type OnStage = (id: StageId, detail?: string) => void;

export async function getOrBuildReceipt(
  address: string,
  opts: { force?: boolean; onStage?: OnStage } = {},
): Promise<Receipt> {
  const cached = await store.getReceiptByAddress(address);
  if (cached && !opts.force) {
    const age = Date.now() - new Date(cached.updatedAt).getTime();
    if (cached.graveyard?.frozen || age < config.cache.receiptTtlMs) {
      opts.onStage?.("cache", "Served from cache");
      return { ...cached, cached: true };
    }
  }
  return buildReceipt(address, cached ?? null, opts.onStage);
}

/** Wrap a promise so a stage event fires the moment it settles. */
function tap<T>(p: Promise<T>, fn: (v: T) => void): Promise<T> {
  return p.then((v) => {
    try {
      fn(v);
    } catch {
      /* a listener must never break the build */
    }
    return v;
  });
}

export async function buildReceipt(
  address: string,
  previous: Receipt | null,
  onStage: OnStage = () => {},
): Promise<Receipt> {
  const t0 = Date.now();
  // Resolve metadata on-chain and from the market profile in parallel.
  const [meta, claim, pair] = await Promise.all([
    tap(getTokenMeta(address), (m) =>
      onStage("meta", m.mintAuthority == null ? "Mint authority revoked" : "Mint authority active"),
    ),
    store.getClaim(address),
    tap(fetchBestPair(address), (p) =>
      onStage(
        "market",
        p ? `${p.dexId} · $${Math.round(p.liquidity?.usd ?? 0).toLocaleString("en-US")} liquidity` : "No liquid market",
      ),
    ),
  ]);

  // Enrich on-chain metadata with the DexScreener profile (name, symbol, image,
  // website, github, socials) so collectors have links to work from even
  // without an indexed-history RPC key.
  const market = pair ? toMarket(pair) : null;
  if (pair) {
    const profile = toProfile(pair);
    meta.name ??= profile.name;
    meta.symbol ??= profile.symbol;
    meta.image ??= profile.image;
    meta.links = { ...profile.links, ...meta.links };
  }
  // Tickers are stored bare: some sources return "$WIF".
  if (meta.symbol) meta.symbol = meta.symbol.trim().replace(/^\$+/, "");

  // Collectors that depend on resolved links run now, in parallel.
  const [repo, site, onchain] = await Promise.all([
    tap(collectRepo(meta.links.github), (r) =>
      onStage("repo", r?.found ? `${r.owner}/${r.repo}` : meta.links.github ? "Repo not reachable" : "No repo linked"),
    ),
    tap(collectSite(meta.links.site), (s) =>
      onStage("site", s?.found ? `${s.host} · HTTP ${s.status}` : meta.links.site ? "Site did not respond" : "No site linked"),
    ),
    tap(collectOnchain(meta, claim), (o) =>
      onStage("chain", o.holders.length ? `${o.holders.length} top holders read` : "Authorities read"),
    ),
  ]);

  const pulse = computePulse(repo);
  let sections = normalise({ meta, repo, site, onchain, market, pulse, claim });
  sections = await summarise(sections);
  const evidence = computeEvidence(sections);

  const token: TokenRef = {
    address,
    ticker: meta.symbol,
    name: meta.name,
    image: meta.image,
    launchpad: meta.launchpad,
    decimals: meta.decimals,
  };

  const slug = previous?.slug ?? makeSlug(token);

  const receipt: Receipt = {
    slug,
    token,
    evidence,
    sections,
    pulse,
    market,
    claim: claim ?? { claimed: false },
    graveyard: previous?.graveyard,
    changeLog: [
      {
        at: new Date().toISOString(),
        kind: previous ? ("refreshed" as const) : ("built" as const),
        note: previous ? "Receipt refreshed" : "Receipt built",
      },
      ...(previous?.changeLog ?? []),
    ].slice(0, 25),
    updatedAt: new Date().toISOString(),
    buildMs: Date.now() - t0,
    cached: false,
  };

  await store.saveReceipt(receipt);
  onStage("write", `${evidence.sourced} of ${evidence.total} lines sourced`);
  return receipt;
}
