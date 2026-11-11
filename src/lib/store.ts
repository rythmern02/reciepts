// A real, durable store backed by JSON on disk. The interface is deliberately
// narrow so it can be swapped for Postgres in production without touching callers.

import { promises as fs } from "fs";
import path from "path";
import type { Receipt, Dispute, WatchEntry, ClaimState } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");

interface DbShape {
  receipts: Record<string, Receipt>; // keyed by token address
  slugs: Record<string, string>; // slug -> token address
  disputes: Dispute[];
  watchlist: WatchEntry[];
  claims: Record<string, ClaimState>; // keyed by token address
  challenges: Record<string, { token: string; nonce: string; createdAt: string }>;
}

const EMPTY: DbShape = {
  receipts: {},
  slugs: {},
  disputes: [],
  watchlist: [],
  claims: {},
  challenges: {},
};

let cache: DbShape | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function load(): Promise<DbShape> {
  if (cache) return cache;
  await ensureDir();
  let loaded: DbShape;
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "db.json"), "utf8");
    loaded = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    loaded = structuredClone(EMPTY);
  }
  cache = loaded;
  return loaded;
}

function persist(): Promise<void> {
  // Serialise writes so concurrent requests never corrupt the file.
  writeQueue = writeQueue.then(async () => {
    if (!cache) return;
    await ensureDir();
    const tmp = path.join(DATA_DIR, `db.${process.pid}.tmp`);
    await fs.writeFile(tmp, JSON.stringify(cache, null, 2));
    await fs.rename(tmp, path.join(DATA_DIR, "db.json"));
  });
  return writeQueue;
}

export const store = {
  // ── Receipts (cache) ──
  async getReceiptByAddress(address: string): Promise<Receipt | null> {
    const db = await load();
    return db.receipts[address] ?? null;
  },
  async getReceiptBySlug(slug: string): Promise<Receipt | null> {
    const db = await load();
    const addr = db.slugs[slug.toLowerCase()];
    if (!addr) {
      // allow raw address as slug
      return db.receipts[slug] ?? null;
    }
    return db.receipts[addr] ?? null;
  },
  async saveReceipt(r: Receipt): Promise<void> {
    const db = await load();
    db.receipts[r.token.address] = r;
    db.slugs[r.slug.toLowerCase()] = r.token.address;
    await persist();
  },
  async listReceipts(filter?: { graveyard?: boolean }): Promise<Receipt[]> {
    const db = await load();
    let list = Object.values(db.receipts);
    if (filter?.graveyard !== undefined) {
      list = list.filter((r) => Boolean(r.graveyard?.frozen) === filter.graveyard);
    }
    return list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  },

  // ── Disputes ──
  async addDispute(d: Dispute): Promise<void> {
    const db = await load();
    db.disputes.push(d);
    // reflect on the cached receipt line immediately
    const r = db.receipts[d.tokenAddress];
    if (r) {
      const sec = r.sections.find((s) => s.key === d.sectionKey);
      const line = sec?.lines.find((l) => l.label === d.lineLabel);
      if (line) line.disputed = true;
      r.changeLog.unshift({
        at: d.createdAt,
        kind: "disputed",
        note: `${d.sectionKey}/${d.lineLabel} disputed`,
      });
    }
    await persist();
  },
  async disputesFor(address: string): Promise<Dispute[]> {
    const db = await load();
    return db.disputes.filter((d) => d.tokenAddress === address);
  },

  // ── Watchlist ──
  async addWatch(w: WatchEntry): Promise<void> {
    const db = await load();
    const exists = db.watchlist.find(
      (x) => x.tokenAddress === w.tokenAddress && x.subscriber === w.subscriber,
    );
    if (!exists) db.watchlist.push(w);
    await persist();
  },
  async removeWatch(address: string, subscriber: string): Promise<void> {
    const db = await load();
    db.watchlist = db.watchlist.filter(
      (x) => !(x.tokenAddress === address && x.subscriber === subscriber),
    );
    await persist();
  },
  async watchesFor(subscriber: string): Promise<WatchEntry[]> {
    const db = await load();
    return db.watchlist.filter((x) => x.subscriber === subscriber);
  },
  async allWatches(): Promise<WatchEntry[]> {
    const db = await load();
    return db.watchlist;
  },
  async updateWatchSnapshot(w: WatchEntry): Promise<void> {
    const db = await load();
    const found = db.watchlist.find(
      (x) => x.tokenAddress === w.tokenAddress && x.subscriber === w.subscriber,
    );
    if (found) {
      found.lastPulseState = w.lastPulseState;
      found.lastTreasuryUsd = w.lastTreasuryUsd;
    }
    await persist();
  },

  // ── Claims ──
  async getClaim(address: string): Promise<ClaimState | null> {
    const db = await load();
    return db.claims[address] ?? null;
  },
  async saveClaim(address: string, claim: ClaimState): Promise<void> {
    const db = await load();
    db.claims[address] = claim;
    const r = db.receipts[address];
    if (r) {
      r.claim = claim;
      r.changeLog.unshift({
        at: new Date().toISOString(),
        kind: "claimed",
        note: "Founder claim updated",
      });
    }
    await persist();
  },

  // ── Claim challenges (nonce the founder signs / publishes) ──
  async createChallenge(token: string): Promise<{ nonce: string; message: string }> {
    const db = await load();
    const nonce = `receipts-${token.slice(0, 6)}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    db.challenges[nonce] = { token, nonce, createdAt: new Date().toISOString() };
    await persist();
    const message = `I control the project behind Solana token ${token}. Proof nonce: ${nonce} (receipts.xyz)`;
    return { nonce, message };
  },
  async getChallenge(nonce: string) {
    const db = await load();
    return db.challenges[nonce] ?? null;
  },
};
