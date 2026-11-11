// ───────────────────────────────────────────────────────────────
// Receipts, core domain types
// A Receipt is one object shown on three surfaces (web, Telegram, OG card).
// Every Line carries a status + a source link + the time it was read.
// ───────────────────────────────────────────────────────────────

/** The only four statuses allowed (PRD: "Four statuses only"), plus Pulse states. */
export type LineStatus =
  | "verified" // the founder proved control
  | "found" // public evidence exists
  | "not_found" // looked, nothing there
  | "disputed"; // a counter-source is under review

/** Pulse is a derived rhythm, shown separately from line status. */
export type PulseState = "shipping" | "steady" | "slowing" | "quiet" | "unknown";

/** Evidence level is a headline about how much can be verified, never a rating. */
export type EvidenceLevel = "strong" | "partial" | "thin";

export type SectionKey = "team" | "work" | "pulse" | "money" | "wallet";

export interface SourceRef {
  /** Where this line can be checked. On-chain tx, repo, page, or signed claim. */
  url: string;
  /** Short human label for the source, e.g. "Solscan", "GitHub", "DexScreener". */
  label: string;
  /** Kind of evidence, used for iconography + the "no source, no line" rule. */
  kind: "onchain" | "repo" | "page" | "market" | "claim" | "dns";
}

export interface Line {
  /** Left column label, e.g. "Verified", "Found", "Not found". Derived from status. */
  label: string;
  status: LineStatus;
  /** The sentence. Must cite a source unless status is not_found. */
  text: string;
  source?: SourceRef;
  /** ISO timestamp, the time this fact was read. */
  readAt: string;
  /** Disputes attached to this specific line. */
  disputed?: boolean;
}

export interface Section {
  key: SectionKey;
  title: string;
  /** One-line AI/rule summary that only uses sourced facts below. */
  summary: string;
  lines: Line[];
  /** 0..1, share of this section's checks that returned a real source. */
  confidence: number;
}

export interface MarketSnapshot {
  priceUsd: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  volume24hUsd: number | null;
  priceChange24h: number | null;
  /** All-time-high drawdown, when derivable. e.g. -0.998 = 99.8% below high. */
  fromAthPct: number | null;
  dexUrl: string | null;
  pairCreatedAt: string | null;
}

export interface PulseWeek {
  /** ISO date of the Monday that starts this week. */
  weekStart: string;
  commits: number;
  contributors: number;
  releases: number;
  active: boolean;
}

export interface Pulse {
  state: PulseState;
  /** e.g. "9 of the last 12 weeks had commits or releases". */
  activeWeeks: number;
  totalWeeks: number;
  weeks: PulseWeek[];
  /** Flagged when a single burst of identical commits inflates the count. */
  burstFlag: boolean;
}

export interface ClaimState {
  claimed: boolean;
  /** Methods the founder has verified. */
  github?: { handle: string; verified: boolean; proofUrl?: string };
  x?: { handle: string; verified: boolean; proofUrl?: string };
  domain?: { host: string; verified: boolean };
  wallet?: { address: string; verified: boolean };
  claimedAt?: string;
}

export interface TokenRef {
  address: string;
  ticker: string | null;
  name: string | null;
  image: string | null;
  launchpad: string | null;
  decimals: number | null;
}

export interface ChangeLogEntry {
  at: string;
  kind: "built" | "refreshed" | "disputed" | "claimed" | "response";
  note: string;
  by?: string;
}

export interface Receipt {
  /** URL slug, the permanent link. Uses ticker when safe, else short address. */
  slug: string;
  token: TokenRef;
  evidence: {
    level: EvidenceLevel;
    /** "14 of 17 checks sourced". */
    sourced: number;
    total: number;
  };
  sections: Section[];
  pulse: Pulse;
  market: MarketSnapshot | null;
  claim: ClaimState;
  /** True when this Receipt is frozen in the graveyard (failed token). */
  graveyard?: { frozen: boolean; frozenAt: string; reason: string };
  changeLog: ChangeLogEntry[];
  updatedAt: string;
  /** How long the build took, in ms, surfaced for the "<10s" promise. */
  buildMs: number;
  /** Whether this was served from cache. */
  cached: boolean;
}

export interface Dispute {
  id: string;
  tokenAddress: string;
  sectionKey: SectionKey;
  lineLabel: string;
  counterSourceUrl: string;
  note: string;
  status: "open" | "reviewed" | "rejected";
  createdAt: string;
}

export interface WatchEntry {
  tokenAddress: string;
  /** Telegram chat id, or a web session id. */
  subscriber: string;
  channel: "telegram" | "web";
  addedAt: string;
  /** Snapshot used to detect changes on next refresh. */
  lastPulseState: PulseState;
  lastTreasuryUsd: number | null;
}

export const STATUS_LABEL: Record<LineStatus, string> = {
  verified: "Verified",
  found: "Found",
  not_found: "Not found",
  disputed: "Disputed",
};

export const SECTION_TITLES: Record<SectionKey, string> = {
  team: "Team",
  work: "Work",
  pulse: "Pulse",
  money: "Money",
  wallet: "Wallet",
};

export const SECTION_QUESTION: Record<SectionKey, string> = {
  team: "Are these real people with a track record?",
  work: "Does a product exist?",
  pulse: "Are they still building?",
  money: "Where did the raise go?",
  wallet: "Any standard red flags?",
};
