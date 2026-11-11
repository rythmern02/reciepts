"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";

const SAMPLES = [
  { label: "$JUP", q: "JLP" },
  { label: "$WIF", q: "WIF" },
  { label: "$BONK", q: "BONK" },
];

export function SearchBar({ large = false }: { large?: boolean }) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  async function run(query: string) {
    const value = query.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    setElapsed(0);
    const t0 = Date.now();
    timer.current = setInterval(() => setElapsed((Date.now() - t0) / 1000), 100);
    try {
      const res = await fetch(`/api/receipt?q=${encodeURIComponent(value)}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || "Could not build a Receipt.");
        setLoading(false);
      } else {
        router.push(`/t/${json.receipt.slug}`);
      }
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    } finally {
      if (timer.current) clearInterval(timer.current);
    }
  }

  return (
    <div className="w-full">
      <div
        className={clsx(
          "glass glass-hover flex items-center gap-3 rounded-2xl px-4",
          large ? "py-3" : "py-2.5",
        )}
      >
        <span className="text-[var(--color-faint)] mono text-sm">▦</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(q)}
          placeholder="Paste a Solana token address, $ticker, or receipt link…"
          className={clsx(
            "flex-1 bg-transparent outline-none placeholder:text-[var(--color-faint)]",
            large ? "text-base md:text-lg" : "text-sm",
          )}
          spellCheck={false}
          autoFocus={large}
        />
        <button
          onClick={() => run(q)}
          disabled={loading}
          className="btn btn-primary whitespace-nowrap disabled:opacity-60"
        >
          {loading ? (
            <span className="mono tabular-nums">{elapsed.toFixed(1)}s</span>
          ) : (
            <>Pull receipts</>
          )}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[var(--color-faint)]">Try</span>
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              setQ(s.q);
              run(s.q);
            }}
            className="rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1 text-[var(--color-muted)] transition-colors hover:border-violet-500/50 hover:text-white"
          >
            {s.label}
          </button>
        ))}
        {loading && (
          <span className="mono ml-auto text-xs text-[var(--color-faint)]">
            {elapsed < 2 ? "checking cache…" : "running 4 collectors in parallel…"}
          </span>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}
    </div>
  );
}
