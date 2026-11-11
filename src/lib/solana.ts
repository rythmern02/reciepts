// Real Solana reads. Uses @solana/web3.js for parsed calls and raw JSON-RPC
// for DAS (Helius) metadata + enhanced history. Everything is bounded and
// times out so no single call blows the <10s budget.

import { Connection, PublicKey } from "@solana/web3.js";
import { config, fetchWithTimeout } from "./config";

export function getConnection(): Connection {
  return new Connection(config.rpcUrl, { commitment: "confirmed" });
}

/** JSON-RPC call. Standard Solana methods take a params array; Helius DAS
 *  methods (getAsset, getAssetsByAuthority…) take a params object. */
async function rpc<T>(method: string, params: unknown[] | Record<string, unknown>, timeoutMs = 7000): Promise<T | null> {
  // Retry once on a 429, the public RPC rate-limits specific calls.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(config.rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "receipts", method, params }),
        timeoutMs,
      });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 700 + attempt * 500));
        continue;
      }
      if (!res.ok) return null;
      const json = await res.json();
      if (json.error?.code === 429) {
        await new Promise((r) => setTimeout(r, 700 + attempt * 500));
        continue;
      }
      return (json.result ?? null) as T | null;
    } catch {
      return null;
    }
  }
  return null;
}

// ── Known launchpad program ids / authorities (extensible, one adapter each) ──
const LAUNCHPADS: { match: (m: TokenMeta) => boolean; name: string }[] = [
  { name: "Pump.fun", match: (m) => m.address.toLowerCase().endsWith("pump") },
  { name: "Pump.fun", match: (m) => m.updateAuthority === "TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM" },
  { name: "Bonk.fun", match: (m) => m.address.toLowerCase().endsWith("bonk") },
  { name: "MetaDAO", match: (m) => (m.updateAuthority ?? "").startsWith("meta") },
  { name: "Moonshot", match: (m) => m.updateAuthority === "G1ddqS4W21EaGLbDibRv42utNk1XvGRiDQSPVTC4w4ck" },
];

export interface TokenMeta {
  address: string;
  name: string | null;
  symbol: string | null;
  image: string | null;
  decimals: number | null;
  updateAuthority: string | null;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  launchpad: string | null;
  description: string | null;
  /** External links pulled from on-chain/offchain metadata (site, repo, x). */
  links: { site?: string; github?: string; twitter?: string; telegram?: string };
  supply: number | null;
}

/** DAS getAsset (Helius) gives name/symbol/image/links in one call. */
async function dasAsset(mint: string): Promise<Partial<TokenMeta> | null> {
  if (!config.hasHelius) return null;
  const r = await rpc<any>("getAsset", { id: mint });
  if (!r) return null;
  const content = r.content ?? {};
  const meta = content.metadata ?? {};
  const links = content.links ?? {};
  const files = content.files ?? [];
  const auth = (r.authorities ?? [])[0]?.address ?? null;
  const token = r.token_info ?? {};
  return {
    name: meta.name ?? null,
    symbol: meta.symbol ?? null,
    image: links.image ?? files[0]?.uri ?? null,
    decimals: token.decimals ?? null,
    updateAuthority: auth,
    mintAuthority: token.mint_authority ?? null,
    freezeAuthority: token.freeze_authority ?? null,
    supply: token.supply ? Number(token.supply) / Math.pow(10, token.decimals ?? 0) : null,
    description: meta.description ?? null,
    links: extractLinks(meta, content.json_uri),
  };
}

function extractLinks(meta: any, _jsonUri?: string): TokenMeta["links"] {
  const out: TokenMeta["links"] = {};
  const scan = (v: unknown) => {
    if (typeof v !== "string") return;
    if (/github\.com/i.test(v)) out.github ??= v;
    else if (/(twitter|x)\.com/i.test(v)) out.twitter ??= v;
    else if (/t\.me|telegram/i.test(v)) out.telegram ??= v;
    else if (/^https?:\/\//i.test(v)) out.site ??= v;
  };
  if (meta?.external_url) scan(meta.external_url);
  for (const a of meta?.attributes ?? []) scan(a?.value);
  for (const k of Object.keys(meta ?? {})) scan(meta[k]);
  return out;
}

/** Fallback metadata via Jupiter token API (no key, works for listed tokens). */
async function jupMeta(mint: string): Promise<Partial<TokenMeta> | null> {
  try {
    const res = await fetchWithTimeout(`https://tokens.jup.ag/token/${mint}`, { timeoutMs: 5000 });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || (!j.symbol && !j.name)) return null;
    return {
      name: j.name ?? null,
      symbol: j.symbol ?? null,
      image: j.logoURI ?? null,
      decimals: j.decimals ?? null,
    };
  } catch {
    return null;
  }
}

/** Parsed mint account, authorities + supply + decimals, always available on any RPC. */
async function parsedMint(mint: string): Promise<Partial<TokenMeta> | null> {
  const r = await rpc<any>("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
  const info = r?.value?.data?.parsed?.info;
  if (!info) return null;
  return {
    decimals: info.decimals ?? null,
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
    supply: info.supply ? Number(info.supply) / Math.pow(10, info.decimals ?? 0) : null,
  };
}

export async function getTokenMeta(mint: string): Promise<TokenMeta> {
  const [das, parsed] = await Promise.all([dasAsset(mint), parsedMint(mint)]);
  let base: Partial<TokenMeta> = { ...(parsed ?? {}), ...(das ?? {}) };
  if (!base.symbol && !base.name) {
    const jup = await jupMeta(mint);
    base = { ...base, ...(jup ?? {}) };
  }
  const meta: TokenMeta = {
    address: mint,
    name: base.name ?? null,
    symbol: base.symbol ?? null,
    image: base.image ?? null,
    decimals: base.decimals ?? null,
    updateAuthority: base.updateAuthority ?? null,
    mintAuthority: base.mintAuthority ?? null,
    freezeAuthority: base.freezeAuthority ?? null,
    launchpad: null,
    description: base.description ?? null,
    links: base.links ?? {},
    supply: base.supply ?? null,
  };
  for (const lp of LAUNCHPADS) {
    if (lp.match(meta)) {
      meta.launchpad = lp.name;
      break;
    }
  }
  return meta;
}

export interface DeployerInfo {
  address: string | null;
  createdAt: string | null;
  createTx: string | null;
  /** Other fungible tokens this deployer holds authority over (Helius DAS). */
  earlierLaunches: number | null;
  /** How many of those still have a market with ≥ $1K liquidity. */
  stillTradingCount: number | null;
  earlierMints: string[];
  /** True when the deployer had more candidate tokens than we checked. */
  launchesCapped: boolean;
}

/** Deployer = fee payer of the mint's very first transaction. */
export async function getDeployer(mint: string): Promise<DeployerInfo> {
  // 1. Helius: read the mint's history oldest-first. One call returns the
  //    creation transaction and its fee payer, however busy the token is.
  let origin = config.hasHelius ? await heliusOrigin(mint) : null;

  // 2. Fallback: page backwards with plain RPC. We ONLY trust the result when we
  //    reach the end of history; otherwise the deployer stays unresolved rather
  //    than publishing a wrong origin.
  if (!origin) origin = await pagedOrigin(mint);
  if (!origin?.payer) {
    return { address: null, createdAt: null, createTx: null, earlierLaunches: null, stillTradingCount: null, earlierMints: [], launchesCapped: false };
  }

  const launches = config.hasHelius ? await deployerLaunches(origin.payer, mint, origin.createdAt) : null;
  return {
    address: origin.payer,
    createdAt: origin.createdAt,
    createTx: origin.signature,
    earlierLaunches: launches ? launches.mints.length : null,
    stillTradingCount: launches ? launches.stillTrading : null,
    earlierMints: launches?.mints ?? [],
    launchesCapped: launches?.capped ?? false,
  };
}

interface Origin {
  payer: string | null;
  createdAt: string | null;
  signature: string;
}

async function heliusOrigin(mint: string): Promise<Origin | null> {
  try {
    const url = `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${config.heliusKey}&sort-order=asc&limit=1`;
    const res = await fetchWithTimeout(url, { timeoutMs: 7000 });
    if (!res.ok) return null;
    const [first] = (await res.json()) as any[];
    if (!first?.signature) return null;
    return {
      payer: first.feePayer ?? null,
      createdAt: first.timestamp ? new Date(first.timestamp * 1000).toISOString() : null,
      signature: first.signature,
    };
  } catch {
    return null;
  }
}

async function pagedOrigin(mint: string): Promise<Origin | null> {
  let before: string | undefined;
  let oldest: { signature: string; blockTime?: number | null } | null = null;
  let reachedEnd = false;
  const maxPages = config.hasHelius ? 10 : 2;
  for (let i = 0; i < maxPages; i++) {
    const sigs = await rpc<any[]>("getSignaturesForAddress", [mint, { limit: 1000, before }]);
    if (!sigs || sigs.length === 0) {
      reachedEnd = true;
      break;
    }
    const last = sigs[sigs.length - 1];
    oldest = last;
    if (sigs.length < 1000) {
      reachedEnd = true;
      break;
    }
    before = last.signature as string;
  }
  if (!oldest || !reachedEnd) return null;
  const tx = await rpc<any>("getTransaction", [oldest.signature, { maxSupportedTransactionVersion: 0, encoding: "jsonParsed" }]);
  const payer =
    tx?.transaction?.message?.accountKeys?.find((k: any) => k.signer)?.pubkey ??
    tx?.transaction?.message?.accountKeys?.[0]?.pubkey ??
    null;
  return {
    payer,
    createdAt: oldest.blockTime ? new Date(oldest.blockTime * 1000).toISOString() : null,
    signature: oldest.signature,
  };
}

/** Tokens this deployer holds authority over (Helius DAS), and how many of
 *  them still have a live market (DexScreener batch lookup). */
async function deployerLaunches(
  deployer: string,
  excludeMint: string,
  thisCreatedAt: string | null,
): Promise<{ mints: string[]; stillTrading: number | null; capped: boolean } | null> {
  const r = await rpc<any>("getAssetsByAuthority", { authorityAddress: deployer, page: 1, limit: 100 });
  if (!r?.items) return null;
  const candidates: string[] = r.items
    .filter((a: any) => /Fungible/i.test(a.interface ?? "") && a.id !== excludeMint)
    .map((a: any) => a.id as string);

  // Anyone can name a well-known wallet as the authority of a junk token, so
  // authority alone proves nothing. A token only counts as an earlier launch
  // when this wallet paid for its creation transaction, before this token.
  const MAX_CHECK = 20;
  const capped = candidates.length > MAX_CHECK;
  const mints: string[] = [];
  for (let i = 0; i < Math.min(candidates.length, MAX_CHECK); i += 10) {
    const batch = candidates.slice(i, i + 10);
    const origins = await Promise.all(batch.map((m) => heliusOrigin(m)));
    origins.forEach((o, j) => {
      const createdBefore = !thisCreatedAt || !o?.createdAt || o.createdAt < thisCreatedAt;
      if (o?.payer === deployer && createdBefore) mints.push(batch[j]);
    });
  }
  if (mints.length === 0) return { mints, stillTrading: 0, capped };

  // DexScreener accepts up to 30 addresses per call.
  const live = new Set<string>();
  try {
    for (let i = 0; i < Math.min(mints.length, 90); i += 30) {
      const chunk = mints.slice(i, i + 30).join(",");
      const res = await fetchWithTimeout(`https://api.dexscreener.com/latest/dex/tokens/${chunk}`, { timeoutMs: 6000 });
      if (!res.ok) continue;
      const json = await res.json();
      for (const p of json.pairs ?? []) {
        if (p.chainId === "solana" && (p.liquidity?.usd ?? 0) >= 1000) live.add(p.baseToken?.address);
      }
    }
  } catch {
    return { mints, stillTrading: null, capped };
  }
  return { mints, stillTrading: mints.filter((m) => live.has(m)).length, capped };
}

export interface Holder {
  address: string;
  amount: number;
  pct: number;
}

export async function getTopHolders(mint: string, supply: number | null): Promise<Holder[]> {
  const r = await rpc<any>("getTokenLargestAccounts", [mint]);
  const vals = r?.value ?? [];
  const total = supply && supply > 0 ? supply : vals.reduce((s: number, v: any) => s + (v.uiAmount ?? 0), 0);
  return vals.slice(0, 10).map((v: any) => ({
    address: v.address,
    amount: v.uiAmount ?? 0,
    pct: total > 0 ? (v.uiAmount ?? 0) / total : 0,
  }));
}

/** SOL balance of a wallet in lamports → SOL. */
export async function getSolBalance(wallet: string): Promise<number | null> {
  const r = await rpc<any>("getBalance", [wallet]);
  if (r?.value == null) return null;
  return r.value / 1e9;
}

/** Count sells (token outflows) by a wallet over recent signatures (bounded). */
export async function countRecentSells(wallet: string, mint: string, days = 90): Promise<number | null> {
  if (!config.heliusKey) return null;
  try {
    const url = `https://api.helius.xyz/v0/addresses/${wallet}/transactions?api-key=${config.heliusKey}&type=SWAP&limit=100`;
    const res = await fetchWithTimeout(url, { timeoutMs: 6000 });
    if (!res.ok) return null;
    const txs = (await res.json()) as any[];
    const cutoff = Date.now() / 1000 - days * 86400;
    let sells = 0;
    for (const t of txs) {
      if ((t.timestamp ?? 0) < cutoff) continue;
      for (const tt of t.tokenTransfers ?? []) {
        if (tt.mint === mint && tt.fromUserAccount === wallet) sells++;
      }
    }
    return sells;
  } catch {
    return null;
  }
}

export function isValidMint(address: string): boolean {
  try {
    new PublicKey(address);
    return address.length >= 32 && address.length <= 44;
  } catch {
    return false;
  }
}
