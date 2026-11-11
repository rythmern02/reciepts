"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

const PARTS = [
  {
    key: "team",
    title: "Team",
    q: "Are these real people with a track record?",
    reads: ["Founder-claimed GitHub, X, domain", "Deployer wallet + its earlier launches", "Launchpad profile"],
    sample: [
      ["VERIFIED", "GitHub + domain claimed by founder"],
      ["FOUND", "Deployer has 1 earlier launch, still trading"],
      ["NOT FOUND", "No company registration linked"],
    ],
  },
  {
    key: "work",
    title: "Work",
    q: "Does a product exist?",
    reads: ["Public repository", "Live site reachability", "Releases"],
    sample: [
      ["FOUND", "Public repo, 312 commits, 4 contributors"],
      ["FOUND", "Live product at the linked domain"],
    ],
  },
  {
    key: "pulse",
    title: "Pulse",
    q: "Are they still building?",
    reads: ["Weekly activity, last 12 weeks", "Releases weigh more than commits", "Bursts of trivial commits are flagged"],
    sample: [["FOUND", "Shipping: 9 of last 12 weeks active"]],
  },
  {
    key: "money",
    title: "Money",
    q: "Where did the raise go?",
    reads: ["Treasury wallet balance", "Team-wallet sells, 90 days", "Market cap & liquidity"],
    sample: [
      ["VERIFIED", "Team wallets: no sells in 90 days"],
      ["FOUND", "Liquidity $1.7M on a SOL pair"],
    ],
  },
  {
    key: "wallet",
    title: "Wallet",
    q: "Any standard red flags?",
    reads: ["Mint & freeze authority", "Top-holder concentration", "Deployer history"],
    sample: [
      ["VERIFIED", "Mint authority revoked"],
      ["FOUND", "Top holder controls 4.1% of supply"],
    ],
  },
];

const TONE: Record<string, string> = {
  VERIFIED: "text-[#178a5c]",
  FOUND: "text-[var(--color-paper-ink)]",
  "NOT FOUND": "text-[var(--color-paper-faint)]",
};

export function Anatomy() {
  const [active, setActive] = useState(0);
  const part = PARTS[active];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
      <div role="tablist" aria-label="Receipt sections" className="flex flex-col">
        {PARTS.map((p, i) => (
          <button
            key={p.key}
            role="tab"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            className={clsx(
              "group flex items-baseline gap-5 border-t border-[var(--color-line)] py-5 text-left transition-colors last:border-b",
              i === active ? "text-white" : "text-[var(--color-faint)] hover:text-[var(--color-muted)]",
            )}
          >
            <span className="mono w-6 text-[12px]">0{i + 1}</span>
            <span className="serif text-[40px] leading-none sm:text-[48px]">{p.title}</span>
            <span
              className={clsx(
                "ml-auto hidden text-[13px] transition-opacity sm:block",
                i === active ? "opacity-100" : "opacity-0",
              )}
            >
              {p.q}
            </span>
          </button>
        ))}
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={part.key}
            initial={{ opacity: 0, y: -18, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: -1 }}
            exit={{ opacity: 0, y: 12, rotate: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="paper-shadow"
          >
            <div className="paper px-7 pb-9 pt-10 sm:px-9">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold uppercase tracking-[0.2em]">{part.title}</span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-paper-faint)]">section 0{active + 1} / 05</span>
              </div>
              <p className="mt-2 text-[13px] text-[var(--color-paper-faint)]">{part.q}</p>
              <hr className="rule my-5" />
              <ul className="space-y-3">
                {part.sample.map(([st, txt]) => (
                  <li key={txt} className="flex gap-4 text-[13.5px] leading-snug">
                    <span className={clsx("w-[84px] shrink-0 text-[11.5px] font-bold tracking-wider", TONE[st])}>{st}</span>
                    <span>{txt}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-[var(--color-paper-faint)] underline underline-offset-2">source</span>
                  </li>
                ))}
              </ul>
              <hr className="rule my-5" />
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-paper-faint)]">Reads from</p>
              <ul className="mt-2 space-y-1.5 text-[13px]">
                {part.reads.map((r) => (
                  <li key={r}>· {r}</li>
                ))}
              </ul>
              <p className="mt-6 text-[10.5px] uppercase tracking-[0.14em] text-[var(--color-paper-faint)]">
                Example lines. Shows the format, not a real token
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
