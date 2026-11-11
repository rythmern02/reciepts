import Link from "next/link";
import { store } from "@/lib/store";
import { EvidenceBadge } from "@/components/primitives";
import { fmtUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Graveyard() {
  const frozen = await store.listReceipts({ graveyard: true });

  return (
    <div className="mx-auto max-w-6xl px-5 pt-16">
      <p className="label">The graveyard</p>
      <h1 className="serif mt-4 max-w-3xl text-[56px] leading-[0.98] sm:text-[80px]">
        Receipts, <span className="italic text-[var(--color-muted)]">frozen at the raise.</span>
      </h1>
      <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-[var(--color-muted)]">
        Startup tokens that failed slowly. Each receipt is frozen at the date of its raise and shows which signals were
        already visible at the time. Entries are hand-reviewed. A receipt never calls a live project a failure.
      </p>

      {frozen.length === 0 ? (
        <div className="mt-16 grid gap-6 md:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-dashed border-[var(--color-line-2)] p-8">
            <p className="label">Empty on this instance</p>
            <p className="serif mt-4 text-[30px] leading-tight">No frozen receipts yet.</p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--color-muted)]">
              An operator freezes a reviewed failure with its reason and raise date. Until then this page stays honest
              and empty.
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--color-bg-1)] p-8">
            <p className="label">Operator API</p>
            <pre className="mono mt-4 overflow-x-auto whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--color-muted)]">{`POST /api/graveyard
{
  "tokenAddress": "<mint>",
  "reason": "Team went quiet 3 weeks after the raise",
  "frozenAt": "2026-03-14T00:00:00Z"
}`}</pre>
          </div>
        </div>
      ) : (
        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {frozen.map((r) => (
            <Link key={r.slug} href={`/t/${r.slug}`} className="surface surface-hover rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 overflow-hidden rounded-xl bg-[var(--color-bg-2)] grayscale">
                    {r.token.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.token.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div>
                    <p className="font-medium">{r.token.ticker ? `$${r.token.ticker}` : "Unknown"}</p>
                    <p className="text-[13px] text-[var(--color-faint)]">{r.token.name}</p>
                  </div>
                </div>
                <EvidenceBadge level={r.evidence.level} sourced={r.evidence.sourced} total={r.evidence.total} />
              </div>
              <p className="mt-5 text-[14.5px] text-[var(--color-muted)]">{r.graveyard?.reason}</p>
              {r.market && <p className="mono mt-3 text-[12px] text-[var(--color-faint)]">liquidity at freeze {fmtUsd(r.market.liquidityUsd)}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
