import Link from "next/link";
import { FooterWordmark } from "./footer-wordmark";

const COLS: { title: string; links: [string, string, boolean?][] }[] = [
  {
    title: "Product",
    links: [
      ["Look up a token", "/"],
      ["Graveyard", "/graveyard"],
      ["Watchlist", "/watch"],
      ["Share Receipts", "/?share=1"],
    ],
  },
  {
    title: "Founders",
    links: [
      ["Claim a receipt", "/claim"],
      ["Evidence rules", "/#rules"],
      ["Telegram bot", "/#telegram"],
    ],
  },
  {
    title: "Developers",
    links: [
      ["JSON API", "/api/receipt?q=JUP", true],
      ["Live stream API", "/api/receipt/stream?q=JUP", true],
      ["Card image", "/t/jup/opengraph-image", true],
      ["Share banner", "/banner.png", true],
    ],
  },
  {
    title: "Sources",
    links: [
      ["Solana RPC", "https://solana.com/docs/rpc", true],
      ["DexScreener", "https://dexscreener.com", true],
      ["GitHub API", "https://docs.github.com/en/rest", true],
    ],
  },
];

const CHIPS = ["Solana Mainnet", "Zero custom programs", "Verification never sold", "Not investment advice"];

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-40 overflow-hidden border-t border-[var(--color-line)]">
      <div className="mx-auto max-w-6xl px-5">
        {/* columns */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 py-20 md:grid-cols-4">
          {COLS.map((c) => (
            <div key={c.title}>
              <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-faint)]">{c.title}</p>
              <ul className="mt-7 space-y-4">
                {c.links.map(([label, href, external]) => (
                  <li key={label}>
                    {external ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="serif text-[22px] leading-none text-[var(--color-muted)] transition-colors hover:text-white"
                      >
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className="serif text-[22px] leading-none text-[var(--color-muted)] transition-colors hover:text-white">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* bottom bar */}
        <div className="flex flex-col gap-5 border-t border-[var(--color-line)] py-7 md:flex-row md:items-center md:justify-between">
          <p className="mono shrink-0 text-[11px] uppercase tracking-[0.28em] text-[var(--color-faint)] md:whitespace-nowrap">
            © {new Date().getFullYear()} Receipts · Every line has a source
          </p>
          <ul className="flex flex-wrap gap-2 md:justify-end">
            {CHIPS.map((c) => (
              <li
                key={c}
                className="mono rounded-full border border-[var(--color-line-2)] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.18em] text-[var(--color-faint)]"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* giant wordmark */}
      <div className="border-t border-[var(--color-line)]">
        <FooterWordmark />
      </div>
    </footer>
  );
}
