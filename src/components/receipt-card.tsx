import type { Receipt, LineStatus } from "@/lib/types";
import { SECTION_QUESTION } from "@/lib/types";
import { Stamp, PulseBars } from "./primitives";
import { shortAddr, solscanToken } from "@/lib/format";

const TAG: Record<LineStatus, { t: string; c: string }> = {
  verified: { t: "VERIFIED", c: "#178a5c" },
  found: { t: "FOUND", c: "#151515" },
  not_found: { t: "NOT FOUND", c: "#8b877c" },
  disputed: { t: "DISPUTED", c: "#b8720b" },
};

/** The Receipt, printed on thermal paper. Every line carries its source. */
export function ReceiptCard({ receipt, animate = true }: { receipt: Receipt; animate?: boolean }) {
  const t = receipt.token;
  const read = new Date(receipt.updatedAt);
  return (
    <div className="paper-shadow">
      <article className={`paper px-6 pb-12 pt-12 sm:px-10 ${animate ? "print-in" : ""}`}>
        {/* header */}
        <header className="text-center">
          <p className="text-[26px] font-extrabold tracking-[0.32em]">RECEIPTS</p>
          <p className="mt-1 text-[10.5px] uppercase tracking-[0.22em] text-[var(--color-paper-faint)]">
            Evidence card · Solana mainnet
          </p>
          <p className="mt-1 text-[10.5px] text-[var(--color-paper-faint)]">
            {read.toISOString().replace("T", " ").slice(0, 19)} UTC · built in {(receipt.buildMs / 1000).toFixed(1)}s
            {receipt.cached ? " · cached" : ""}
          </p>
        </header>

        <hr className="rule my-6" />

        {/* token block + stamp */}
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[6px] bg-[var(--color-paper-2)] grayscale-[0.15]">
            {t.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold">{(t.ticker ?? "?").slice(0, 2)}</div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-[26px] font-extrabold leading-tight">{t.ticker ? `$${t.ticker}` : "Unknown token"}</h1>
            <p className="text-[13px] text-[var(--color-paper-faint)]">
              {t.name ?? "No name on chain"}
              {t.launchpad ? ` · ${t.launchpad}` : ""}
            </p>
            <a
              href={solscanToken(t.address)}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] underline decoration-dotted underline-offset-2 hover:decoration-solid"
            >
              {shortAddr(t.address, 6, 6)} ↗
            </a>
          </div>
          <div className="absolute -right-3 -top-5 hidden sm:block">
            <Stamp level={receipt.evidence.level} sourced={receipt.evidence.sourced} total={receipt.evidence.total} animate={animate} />
          </div>
        </div>
        <div className="mt-5 sm:hidden">
          <Stamp level={receipt.evidence.level} sourced={receipt.evidence.sourced} total={receipt.evidence.total} animate={animate} />
        </div>

        {/* sections */}
        {receipt.sections.map((s) => (
          <section key={s.key} className="mt-2">
            <hr className="rule my-6" />
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.24em]">{s.title}</h2>
              <span className="text-right text-[11px] text-[var(--color-paper-faint)]">{SECTION_QUESTION[s.key]}</span>
            </div>
            {s.summary && <p className="mt-2 text-[12.5px] leading-relaxed text-[#4a473f]">{s.summary}</p>}

            {s.key === "pulse" && (
              <div className="mt-4">
                <PulseBars pulse={receipt.pulse} onPaper />
              </div>
            )}

            <ul className="mt-4 space-y-2.5">
              {s.lines.map((l, i) => {
                const st = l.disputed ? "disputed" : l.status;
                return (
                  <li key={i} className="grid grid-cols-[86px_1fr_auto] items-baseline gap-3 text-[13px] leading-snug">
                    <span className="text-[10.5px] font-bold tracking-[0.1em]" style={{ color: TAG[st].c }}>
                      {TAG[st].t}
                    </span>
                    <span className={st === "not_found" ? "text-[#6e6a60]" : ""}>{l.text}</span>
                    {l.source ? (
                      <a
                        href={l.source.url}
                        target="_blank"
                        rel="noreferrer"
                        title={`Read ${new Date(l.readAt).toLocaleString()}`}
                        className="whitespace-nowrap text-[11px] underline decoration-dotted underline-offset-2 hover:decoration-solid"
                      >
                        {l.source.label} ↗
                      </a>
                    ) : (
                      <span className="text-[11px] text-[var(--color-paper-faint)]">no source</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <hr className="rule my-6" />

        {/* barcode + footer */}
        <Barcode seed={t.address} />
        <p className="mt-3 text-center text-[12px] font-semibold">receipts.xyz/t/{receipt.slug}</p>
        <p className="mt-3 text-center text-[10.5px] uppercase leading-relaxed tracking-[0.14em] text-[var(--color-paper-faint)]">
          Not investment advice · The headline is an evidence level, not a rating
          <br />
          Every line links to its source and the time it was read
        </p>
      </article>
    </div>
  );
}

function Barcode({ seed }: { seed: string }) {
  let h = 7;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; x < 300; i++) {
    h = (h * 31 + seed.charCodeAt(i % seed.length)) % 997;
    const w = 1 + (h % 4);
    if (h % 3 !== 0) bars.push({ x, w });
    x += w + 1 + (h % 3);
  }
  return (
    <svg viewBox="0 0 300 54" className="mx-auto h-14 w-full max-w-[300px]" aria-hidden>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={54} fill="#151515" />
      ))}
    </svg>
  );
}
