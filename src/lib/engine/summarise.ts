// Summarise: writes the short text for each section from sourced facts ONLY.
// Rule (PRD): it summarises, it does not conclude. It may not infer who someone
// is, guess intent, or add a claim without a source. Deterministic by default;
// uses Claude when ANTHROPIC_API_KEY is set, with the same hard constraints.

import type { Section } from "@/lib/types";
import { config } from "@/lib/config";

export async function summarise(sections: Section[]): Promise<Section[]> {
  if (config.anthropicKey) {
    try {
      return await summariseWithClaude(sections);
    } catch {
      // fall through to deterministic
    }
  }
  return sections.map((s) => ({ ...s, summary: deterministicSummary(s) }));
}

function deterministicSummary(s: Section): string {
  const found = s.lines.filter((l) => l.status === "found" || l.status === "verified");
  const missing = s.lines.filter((l) => l.status === "not_found");
  if (found.length === 0) {
    return `Nothing public to show here: ${missing.length} check${missing.length === 1 ? "" : "s"} came back empty.`;
  }
  const head = found.map((l) => l.text.replace(/\.$/, "")).slice(0, 2).join("; ");
  const tail = missing.length ? ` ${missing.length} line${missing.length === 1 ? "" : "s"} still unverified.` : "";
  return `${head}.${tail}`;
}

async function summariseWithClaude(sections: Section[]): Promise<Section[]> {
  const facts = sections.map((s) => ({
    key: s.key,
    lines: s.lines.map((l) => ({ status: l.status, text: l.text, hasSource: Boolean(l.source) })),
  }));

  const prompt = `You summarise verification records for a Solana token "Receipt". STRICT RULES:
- Summarise ONLY the facts given. Never infer who someone is, guess intent, or add a claim with no source.
- One short sentence per section (max 18 words). Neutral. Never say scam, rug, fraud, or buy/sell.
- If a section has no found/verified facts, say plainly that nothing public was found.
Return JSON: {"team":"...","work":"...","pulse":"...","money":"...","wallet":"..."}.
Records:\n${JSON.stringify(facts)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.anthropicKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error("claude failed");
  const json = await res.json();
  const text = json.content?.[0]?.text ?? "{}";
  const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return sections.map((s) => ({ ...s, summary: parsed[s.key] || deterministicSummary(s) }));
}
