"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import type { ReceiptSummary } from "@/lib/summary";
import type { PrinterState } from "./three/printer-scene";

const PrinterScene = dynamic(() => import("./three/printer-scene"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

type StageKey = "resolve" | "meta" | "market" | "chain" | "repo" | "site" | "write";
const STAGES: { id: StageKey; label: string; source: string }[] = [
  { id: "resolve", label: "Resolve the token", source: "address / ticker" },
  { id: "meta", label: "Read mint & authorities", source: "Solana RPC" },
  { id: "market", label: "Read market", source: "DexScreener" },
  { id: "chain", label: "Read holders & deployer", source: "Solana RPC" },
  { id: "repo", label: "Check the repository", source: "GitHub" },
  { id: "site", label: "Check the live product", source: "HTTP" },
  { id: "write", label: "Write the receipt", source: "evidence rules" },
];

interface StageInfo {
  detail?: string;
  ms?: number;
}

const EXAMPLES = ["JUP", "BONK", "WIF", "JTO"];

export function Hero({ initial }: { initial: ReceiptSummary | null }) {
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<"idle" | "working" | "done" | "error">("idle");
  const [stages, setStages] = useState<Partial<Record<StageKey, StageInfo>>>({});
  const [summary, setSummary] = useState<ReceiptSummary | null>(initial);
  const [printer, setPrinter] = useState<PrinterState>(initial ? "printing" : "idle");
  const [printKey, setPrintKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cached, setCached] = useState(false);
  const es = useRef<EventSource | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search from anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      es.current?.close();
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const run = useCallback(
    (value: string) => {
      const query = value.trim();
      if (!query || phase === "working") return;
      es.current?.close();
      setPhase("working");
      setPrinter("working");
      setStages({});
      setError(null);
      setCached(false);
      const t0 = Date.now();
      setElapsed(0);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => setElapsed((Date.now() - t0) / 1000), 80);

      const src = new EventSource(`/api/receipt/stream?q=${encodeURIComponent(query)}`);
      es.current = src;
      src.addEventListener("stage", (ev) => {
        const d = JSON.parse((ev as MessageEvent).data) as { id: StageKey | "cache"; detail?: string; ms?: number };
        if (d.id === "cache") {
          setCached(true);
          setStages((s) => {
            const all: Partial<Record<StageKey, StageInfo>> = { ...s };
            for (const st of STAGES) all[st.id] = all[st.id] ?? { detail: "cached", ms: d.ms };
            return all;
          });
          return;
        }
        setStages((s) => ({ ...s, [d.id]: { detail: d.detail, ms: d.ms } }));
      });
      src.addEventListener("done", (ev) => {
        const d = JSON.parse((ev as MessageEvent).data) as { summary: ReceiptSummary };
        src.close();
        if (timer.current) clearInterval(timer.current);
        setSummary(d.summary);
        setPhase("done");
        setPrinter("printing");
        setPrintKey((k) => k + 1);
      });
      src.addEventListener("error", (ev) => {
        const raw = (ev as MessageEvent).data;
        src.close();
        if (timer.current) clearInterval(timer.current);
        setPhase("error");
        setPrinter("printed");
        setError(raw ? (JSON.parse(raw).message as string) : "Connection dropped. Try again.");
      });
    },
    [phase],
  );

  const showProgress = phase !== "idle";

  return (
    <section className="relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 px-5 pt-10 md:pt-16 lg:grid-cols-[1.08fr_1fr] lg:gap-4">
      {/* ── Left: copy + action ── */}
      <div className="relative z-10 lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] px-3 py-1.5">
            <span className="live-dot" />
            <span className="label !text-[var(--color-muted)]">Built for the Solana RFS</span>
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05, ease: [0.2, 0.8, 0.2, 1] }}
          className="serif mt-7 text-[56px] leading-[0.95] sm:text-[76px] lg:text-[88px]"
        >
          Every token
          <br />
          <span className="italic text-[var(--color-muted)]">has a receipt.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="mt-6 max-w-[30rem] text-[17px] leading-relaxed text-[var(--color-muted)]"
        >
          Paste a Solana token. In under ten seconds you get one card: who the team is, what they shipped, whether
          they&apos;re still shipping, and where the money went. Every line links to its source.
        </motion.p>

        {/* search */}
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          onSubmit={(e) => {
            e.preventDefault();
            run(q);
          }}
          className="mt-9"
        >
          <label htmlFor="token" className="label">
            Token address or ticker
          </label>
          <div className="mt-2.5 flex items-center gap-2 rounded-full border border-[var(--color-line-2)] bg-[var(--color-bg-1)] p-1.5 pl-5 transition-colors focus-within:border-white/40">
            <input
              id="token"
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. JUPyiwrYJF…  or  $BONK"
              autoComplete="off"
              spellCheck={false}
              className="mono min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            />
            <span className="kbd hidden sm:inline">/</span>
            <button type="submit" disabled={phase === "working"} className="btn btn-white !h-11 !px-5">
              {phase === "working" ? <span className="mono tabular-nums">{elapsed.toFixed(1)}s</span> : "Pull receipt →"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[13px] text-[var(--color-faint)]">Try</span>
            {EXAMPLES.map((ex) => (
              <button
                type="button"
                key={ex}
                onClick={() => {
                  setQ(ex);
                  run(ex);
                }}
                className="mono rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[12px] text-[var(--color-muted)] transition-colors hover:border-white/30 hover:text-white"
              >
                ${ex}
              </button>
            ))}
          </div>
        </motion.form>

        {/* live progress, what's actually happening */}
        <AnimatePresence>
          {showProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-bg-1)]">
                <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-2.5">
                  <span className="label">
                    {phase === "working" ? "Reading public sources" : phase === "done" ? (cached ? "Served from cache" : "Receipt written") : "Stopped"}
                  </span>
                  <span className="mono text-[12px] tabular-nums text-[var(--color-muted)]">{elapsed.toFixed(1)}s</span>
                </div>
                <ol className="divide-y divide-[var(--color-line)]">
                  {STAGES.map((st) => {
                    const info = stages[st.id];
                    const state = info ? "done" : phase === "working" ? "running" : phase === "error" ? "skipped" : "done";
                    return (
                      <li key={st.id} className="flex items-center gap-3 px-4 py-2">
                        <StageDot state={state} />
                        <span className={clsx("text-[13px]", state === "running" ? "text-[var(--color-muted)]" : "text-[var(--color-ink)]")}>
                          {st.label}
                        </span>
                        <span className="mono ml-auto truncate pl-3 text-right text-[11.5px] text-[var(--color-faint)]">
                          {info?.detail ?? st.source}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {phase === "error" && error && (
                  <p className="border-t border-[var(--color-line)] px-4 py-3 text-[13px] text-[var(--color-red)]">{error}</p>
                )}
                {phase === "done" && summary && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] px-4 py-3">
                    <Link href={`/t/${summary.slug}`} className="btn btn-white !h-9">
                      Open full receipt →
                    </Link>
                    <span className="text-[13px] text-[var(--color-faint)]">
                      {summary.sourced} of {summary.total} lines sourced
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right: the live printer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.2 }}
        className="relative h-[520px] sm:h-[620px] lg:sticky lg:top-16 lg:h-[calc(100vh-5rem)] lg:max-h-[760px] lg:min-h-[600px]"
      >
        <div className="absolute inset-0">
          <PrinterScene
            summary={summary}
            state={printer}
            printKey={printKey}
            onPrinted={() => setPrinter("printed")}
          />
        </div>
        <div className="pointer-events-none absolute left-0 top-4 flex items-center gap-2">
          <span className="label">Live printer</span>
        </div>
        <div className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-2 text-[12px] text-[var(--color-faint)] sm:flex">
          <span className="kbd">drag</span> to tilt the receipt
        </div>
        {summary && phase !== "working" && (
          <Link
            href={`/t/${summary.slug}`}
            className="absolute bottom-12 right-2 hidden items-center gap-2 rounded-full border border-[var(--color-line-2)] bg-[#0a0a0a]/70 px-3.5 py-2 text-[13px] backdrop-blur transition-colors hover:border-white/40 sm:inline-flex"
          >
            <span className="mono">{summary.ticker ? `$${summary.ticker}` : "Receipt"}</span>
            <span className="text-[var(--color-faint)]">open →</span>
          </Link>
        )}
      </motion.div>
    </section>
  );
}

function StageDot({ state }: { state: "done" | "running" | "skipped" }) {
  if (state === "done")
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-label="done" className="shrink-0">
        <circle cx="7" cy="7" r="7" fill="#3ddc97" opacity="0.16" />
        <path d="M4 7.2l2 2 4-4.4" stroke="#3ddc97" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (state === "running")
    return (
      <span className="relative h-3.5 w-3.5 shrink-0" aria-label="running">
        <span className="absolute inset-0 animate-spin rounded-full border-[1.5px] border-white/15 border-t-white/70" />
      </span>
    );
  return <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--color-line-2)]" aria-label="skipped" />;
}
