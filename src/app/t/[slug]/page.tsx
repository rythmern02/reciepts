import Link from "next/link";
import type { Metadata } from "next";
import { store } from "@/lib/store";
import { getOrBuildReceipt, resolveInput } from "@/lib/engine/build-receipt";
import { ReceiptCard } from "@/components/receipt-card";
import { ReceiptActions } from "@/components/receipt-actions";
import { EvidenceBadge } from "@/components/primitives";
import { fmtUsd, timeAgo } from "@/lib/format";
import type { Receipt } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(slug: string): Promise<Receipt | null> {
  const cached = await store.getReceiptBySlug(slug);
  if (cached) return getOrBuildReceipt(cached.token.address);
  const r = await resolveInput(decodeURIComponent(slug));
  if (!r.address) return null;
  return getOrBuildReceipt(r.address);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await load(slug).catch(() => null);
  if (!r) return { title: "Receipt not found" };
  return {
    title: `${r.token.ticker ? "$" + r.token.ticker : "Receipt"} · ${r.evidence.level} evidence · Receipts`,
    description: `${r.evidence.sourced} of ${r.evidence.total} checks sourced. Team, work, pulse, money, wallet. Every line links to its source.`,
  };
}

export default async function ReceiptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let receipt: Receipt | null = null;
  let error: string | null = null;
  try {
    receipt = await load(slug);
  } catch (e) {
    error = (e as Error).message;
  }

  if (!receipt) {
    return (
      <div className="mx-auto max-w-xl px-5 py-36 text-center">
        <p className="label">404 · no receipt</p>
        <h1 className="serif mt-4 text-[52px] leading-none">Nothing printed here.</h1>
        <p className="mt-4 text-[var(--color-muted)]">{error ?? `"${decodeURIComponent(slug)}" didn't resolve to a Solana token.`}</p>
        <Link href="/" className="btn btn-white mt-8">
          ← Try another token
        </Link>
      </div>
    );
  }

  const m = receipt.market;
  const disputes = await store.disputesFor(receipt.token.address);

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-[var(--color-faint)]">
        <Link href="/" className="hover:text-white">
          Look up
        </Link>
        <span>/</span>
        <span className="mono text-[var(--color-muted)]">{receipt.token.ticker ? `$${receipt.token.ticker}` : receipt.slug}</span>
        {receipt.graveyard?.frozen && (
          <span className="ml-2 rounded-full border border-[var(--color-red)]/40 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-[var(--color-red)]">
            Graveyard · frozen {timeAgo(receipt.graveyard.frozenAt)}
          </span>
        )}
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,620px)_1fr] lg:gap-14">
        {/* the paper */}
        <div>
          <ReceiptCard receipt={receipt} />
        </div>

        {/* side panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-3">
            <EvidenceBadge level={receipt.evidence.level} sourced={receipt.evidence.sourced} total={receipt.evidence.total} />
            <span className="text-[12px] text-[var(--color-faint)]">updated {timeAgo(receipt.updatedAt)}</span>
          </div>
          <h2 className="serif mt-5 text-[40px] leading-[1.02]">
            {receipt.evidence.level === "strong"
              ? "Most of this checks out."
              : receipt.evidence.level === "partial"
                ? "Some of this can be checked."
                : "Very little can be checked."}
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--color-muted)]">
            {receipt.evidence.sourced} of {receipt.evidence.total} lines on this receipt link to a public source. That&apos;s
            how much is verifiable, not whether to buy.
          </p>

          <div className="mt-7">
            <ReceiptActions address={receipt.token.address} slug={receipt.slug} sections={receipt.sections} />
          </div>

          {m && (
            <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)]">
              {[
                ["Price", m.priceUsd != null ? `$${m.priceUsd < 0.01 ? m.priceUsd.toPrecision(3) : m.priceUsd.toFixed(4)}` : "n/a"],
                ["Market cap", fmtUsd(m.marketCapUsd)],
                ["Liquidity", fmtUsd(m.liquidityUsd)],
                [
                  "24h",
                  m.priceChange24h != null ? `${m.priceChange24h > 0 ? "+" : ""}${m.priceChange24h.toFixed(1)}%` : "n/a",
                ],
              ].map(([k, v]) => (
                <div key={k} className="bg-[var(--color-bg)] px-4 py-3.5">
                  <p className="label">{k}</p>
                  <p className="mono mt-1.5 text-[17px]">{v}</p>
                </div>
              ))}
              {m.dexUrl && (
                <a href={m.dexUrl} target="_blank" rel="noreferrer" className="col-span-2 bg-[var(--color-bg)] px-4 py-2.5 text-[12px] text-[var(--color-faint)] hover:text-white">
                  Market data via DexScreener · display only ↗
                </a>
              )}
            </div>
          )}

          {!receipt.claim.claimed && (
            <Link
              href={`/claim/${receipt.slug}`}
              className="surface surface-hover group mt-4 flex items-center justify-between rounded-2xl p-5"
            >
              <span>
                <span className="block text-[15px] font-medium">Is this your project?</span>
                <span className="block text-[13px] text-[var(--color-faint)]">Claim it and Found lines become Verified.</span>
              </span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          )}

          <div className="mt-8">
            <p className="label">Change log</p>
            <ol className="mt-3 space-y-2.5 border-l border-[var(--color-line)] pl-4">
              {receipt.changeLog.slice(0, 6).map((c, i) => (
                <li key={i} className="text-[13px]">
                  <span className="mono text-[var(--color-faint)]">{timeAgo(c.at)}</span>{" "}
                  <span className="text-[var(--color-muted)]">{c.note}</span>
                </li>
              ))}
            </ol>
            {disputes.length > 0 && (
              <p className="mt-4 text-[13px] text-[var(--color-amber)]">
                {disputes.length} open dispute{disputes.length === 1 ? "" : "s"} under review
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
