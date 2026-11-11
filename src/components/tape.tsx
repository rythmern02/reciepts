import Link from "next/link";
import type { ReceiptSummary } from "@/lib/summary";

const LEVEL_COLOR = { strong: "#178a5c", partial: "#b8720b", thin: "#c8352b" } as const;

/** A strip of receipt paper scrolling past with every token pulled recently. */
export function Tape({ items }: { items: ReceiptSummary[] }) {
  if (items.length === 0) return null;
  const loop = [...items, ...items, ...items, ...items].slice(0, Math.max(8, items.length * 2));
  const doubled = [...loop, ...loop];
  return (
    <section aria-label="Recently pulled receipts" className="relative mt-10 -rotate-[1.2deg]">
      <div className="paper overflow-hidden py-4 [--zz:7px]">
        <div className="marquee flex w-max items-center">
          {doubled.map((s, i) => (
            <Link
              key={`${s.slug}-${i}`}
              href={`/t/${s.slug}`}
              className="mono flex items-center gap-3 whitespace-nowrap px-6 text-[13px] text-[var(--color-paper-ink)] hover:underline"
            >
              <span className="font-bold">{s.ticker ? `$${s.ticker}` : s.address.slice(0, 6)}</span>
              <span
                className="rounded-[3px] border-[1.5px] px-1.5 py-[1px] text-[11px] font-bold uppercase tracking-wider"
                style={{ color: LEVEL_COLOR[s.level], borderColor: LEVEL_COLOR[s.level] }}
              >
                {s.level}
              </span>
              <span className="text-[var(--color-paper-faint)]">
                {s.sourced}/{s.total} sourced
              </span>
              <span className="text-[var(--color-paper-faint)]">✶</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
