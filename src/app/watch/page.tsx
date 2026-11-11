"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Receipt, WatchEntry } from "@/lib/types";
import { PULSE_LABEL } from "@/lib/engine/pulse";
import { EvidenceBadge } from "@/components/primitives";
import { subscriberId } from "@/components/receipt-actions";
import { timeAgo } from "@/lib/format";

type Row = WatchEntry & { receipt: Receipt | null };

export default function WatchPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  async function load() {
    const res = await fetch(`/api/watch?subscriber=${subscriberId()}`);
    const json = await res.json();
    setRows(json.watches ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(address: string) {
    await fetch(`/api/watch?address=${address}&subscriber=${subscriberId()}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pt-16">
      <p className="label">Watchlist</p>
      <h1 className="serif mt-4 text-[56px] leading-[0.98] sm:text-[72px]">
        Still building? <span className="italic text-[var(--color-muted)]">You&apos;ll know.</span>
      </h1>
      <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-[var(--color-muted)]">
        Watched tokens are re-read on a schedule. If Pulse drops to Quiet or liquidity moves sharply, you get an alert in
        Telegram, and it&apos;s flagged here.
      </p>

      <div className="mt-12">
        {rows === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="shimmer h-[76px] rounded-2xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-line-2)] p-10 text-center">
            <p className="serif text-[30px]">Nothing watched yet.</p>
            <p className="mt-2 text-[14.5px] text-[var(--color-muted)]">Open any receipt and press Watch.</p>
            <Link href="/" className="btn btn-white mt-6">
              Find a token
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {rows.map((row) => {
              const r = row.receipt;
              const pulse = r?.pulse.state ?? "unknown";
              const warn = pulse === "quiet" || pulse === "slowing";
              return (
                <li key={row.tokenAddress} className="flex items-center gap-4 py-4">
                  <Link href={`/t/${r?.slug ?? row.tokenAddress}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[var(--color-bg-2)]">
                      {r?.token.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.token.image} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r?.token.ticker ? `$${r.token.ticker}` : row.tokenAddress.slice(0, 8)}</p>
                      <p className="text-[13px]" style={{ color: warn ? "var(--color-amber)" : "var(--color-faint)" }}>
                        Pulse {PULSE_LABEL[pulse]} · watching since {timeAgo(row.addedAt)}
                      </p>
                    </div>
                  </Link>
                  {r && (
                    <span className="hidden sm:block">
                      <EvidenceBadge level={r.evidence.level} sourced={r.evidence.sourced} total={r.evidence.total} />
                    </span>
                  )}
                  <button onClick={() => remove(row.tokenAddress)} className="btn btn-line !h-9 text-[13px]">
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
