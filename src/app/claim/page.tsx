"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  ["Wallet", "Sign one message from the team wallet. Links the treasury and team-wallet sells."],
  ["Domain", "Add a DNS TXT record to the project domain."],
  ["GitHub", "Publish the proof nonce in a gist under your account."],
  ["X", "Post the nonce from the project account."],
];

export default function ClaimLanding() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/receipt?q=${encodeURIComponent(q.trim())}`);
    const json = await res.json();
    if (!res.ok || json.error) {
      setError(json.error || "Could not resolve that token.");
      setLoading(false);
    } else router.push(`/claim/${json.receipt.slug}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pt-16">
      <div className="grid gap-14 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="label">For founders</p>
          <h1 className="serif mt-4 text-[56px] leading-[0.98] sm:text-[80px]">
            Prove it&apos;s you. <span className="italic text-[var(--color-muted)]">Free, forever.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-[var(--color-muted)]">
            Claiming turns Found lines into Verified ones and shows a Claimed mark on your receipt. It costs nothing:
            verification is never sold. We never unmask an anonymous founder; you choose what to link.
          </p>

          <form onSubmit={go} className="mt-10 max-w-lg">
            <label htmlFor="claim-token" className="label">
              Your token
            </label>
            <div className="mt-2.5 flex items-center gap-2 rounded-full border border-[var(--color-line-2)] bg-[var(--color-bg-1)] p-1.5 pl-5 focus-within:border-white/40">
              <input
                id="claim-token"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Mint address or $ticker"
                spellCheck={false}
                className="mono min-w-0 flex-1 bg-transparent text-[15px] outline-none"
              />
              <button type="submit" disabled={loading} className="btn btn-white !h-11">
                {loading ? "Finding…" : "Start claim →"}
              </button>
            </div>
            {error && <p className="mt-3 text-[14px] text-[var(--color-red)]">{error}</p>}
          </form>
        </div>

        <ol className="self-end border-t border-[var(--color-line)]">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="flex gap-5 border-b border-[var(--color-line)] py-5">
              <span className="mono pt-1 text-[12px] text-[var(--color-faint)]">0{i + 1}</span>
              <div>
                <p className="text-[17px] font-medium">{t}</p>
                <p className="mt-1 text-[14px] text-[var(--color-muted)]">{d}</p>
              </div>
            </li>
          ))}
          <li className="pt-4 text-[13px] text-[var(--color-faint)]">Do any one, or all four. Each adds a Verified line.</li>
        </ol>
      </div>
    </div>
  );
}
