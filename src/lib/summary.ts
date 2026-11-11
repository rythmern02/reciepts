// Compact, client-safe view of a Receipt, what the 3D receipt and the tape print.
import type { Receipt, LineStatus, EvidenceLevel, SectionKey, PulseState } from "./types";

export interface ReceiptSummary {
  slug: string;
  address: string;
  ticker: string | null;
  name: string | null;
  image: string | null;
  level: EvidenceLevel;
  sourced: number;
  total: number;
  pulse: PulseState;
  marketCap: number | null;
  sections: { key: SectionKey; title: string; status: LineStatus }[];
  updatedAt: string;
}

/** The strongest status any line in the section reached. */
function sectionStatus(statuses: LineStatus[]): LineStatus {
  if (statuses.includes("disputed")) return "disputed";
  if (statuses.includes("verified")) return "verified";
  if (statuses.includes("found")) return "found";
  return "not_found";
}

export function summarize(r: Receipt): ReceiptSummary {
  return {
    slug: r.slug,
    address: r.token.address,
    ticker: r.token.ticker ? r.token.ticker.replace(/^\$+/, "") : null,
    name: r.token.name,
    image: r.token.image,
    level: r.evidence.level,
    sourced: r.evidence.sourced,
    total: r.evidence.total,
    pulse: r.pulse.state,
    marketCap: r.market?.marketCapUsd ?? null,
    sections: r.sections.map((s) => ({
      key: s.key,
      title: s.title,
      status: sectionStatus(s.lines.map((l) => (l.disputed ? "disputed" : l.status))),
    })),
    updatedAt: r.updatedAt,
  };
}
