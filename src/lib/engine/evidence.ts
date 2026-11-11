import type { EvidenceLevel, Section } from "@/lib/types";

/** The headline is an evidence level, not a rating. Strong/Partial/Thin describe
 * how much of the card could be verified from a real source. */
export function computeEvidence(sections: Section[]): {
  level: EvidenceLevel;
  sourced: number;
  total: number;
} {
  let sourced = 0;
  let total = 0;
  for (const s of sections) {
    for (const l of s.lines) {
      total++;
      if (l.source && (l.status === "verified" || l.status === "found")) sourced++;
    }
  }
  const ratio = total > 0 ? sourced / total : 0;

  // Team or Work must carry real evidence for "strong", a card can't be strong
  // on market data alone.
  const teamOrWorkSourced = sections
    .filter((s) => s.key === "team" || s.key === "work")
    .some((s) => s.lines.some((l) => l.source && (l.status === "found" || l.status === "verified")));

  let level: EvidenceLevel;
  if (ratio >= 0.7 && teamOrWorkSourced) level = "strong";
  else if (ratio >= 0.4) level = "partial";
  else level = "thin";

  return { level, sourced, total };
}
