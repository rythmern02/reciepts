import Link from "next/link";
import { store } from "@/lib/store";
import { summarize } from "@/lib/summary";
import { Hero } from "@/components/hero";
import { Tape } from "@/components/tape";
import { Anatomy } from "@/components/anatomy";
import { InView } from "@/components/in-view";

export const dynamic = "force-dynamic";

export default async function Home() {
  const live = await store.listReceipts({ graveyard: false });
  const summaries = live.slice(0, 12).map(summarize);

  return (
    <div>
      <Hero initial={summaries[0] ?? null} />

      <Tape items={summaries} />

      {/* How it works */}
      <section className="mx-auto mt-32 max-w-6xl px-5">
        <InView>
          <p className="label">How it works</p>
          <h2 className="serif mt-4 max-w-2xl text-[44px] leading-[1.02] sm:text-[56px]">
            Six tabs of research, <span className="italic text-[var(--color-muted)]">one sheet of paper.</span>
          </h2>
        </InView>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-3">
          {[
            ["01", "Paste", "A mint address, a $ticker, or a receipt link. From the site, or straight into the Telegram bot."],
            ["02", "We read", "The chain, the market, the repository and the live site, in parallel. You watch each source come back."],
            ["03", "Share", "One card with a permanent link. Paste it in X or Telegram and the card is the preview image."],
          ].map(([n, t, d], i) => (
            <InView key={n} delay={i * 0.08} className="bg-[var(--color-bg)] p-8">
              <span className="mono text-[12px] text-[var(--color-faint)]">{n}</span>
              <h3 className="mt-10 text-[22px] font-medium tracking-tight">{t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-muted)]">{d}</p>
            </InView>
          ))}
        </div>
      </section>

      {/* Anatomy */}
      <section className="mx-auto mt-36 max-w-6xl px-5">
        <InView>
          <p className="label">Anatomy of a receipt</p>
          <h2 className="serif mt-4 max-w-2xl text-[44px] leading-[1.02] sm:text-[56px]">
            Five questions traders ask <span className="italic text-[var(--color-muted)]">before every buy.</span>
          </h2>
        </InView>
        <div className="mt-14">
          <Anatomy />
        </div>
      </section>

      {/* Rules */}
      <section id="rules" className="mx-auto mt-36 max-w-6xl scroll-mt-24 px-5">
        <InView>
          <p className="label">Evidence rules</p>
          <h2 className="serif mt-4 max-w-3xl text-[44px] leading-[1.02] sm:text-[56px]">
            Four statuses. <span className="italic text-[var(--color-muted)]">No opinions.</span>
          </h2>
        </InView>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Verified", "#3ddc97", "The founder proved control with a signed wallet message, a DNS record, or a proof under their own account."],
            ["Found", "#ededed", "Public evidence exists, and the line links straight to it with the time it was read."],
            ["Not found", "#6b6b6b", "We looked and nothing was there. It's a gap, never an accusation."],
            ["Disputed", "#f5a524", "Someone flagged the line with a counter-source. It stays marked until reviewed."],
          ].map(([t, c, d], i) => (
            <InView key={t} delay={i * 0.06} className="rounded-2xl border border-[var(--color-line)] p-6">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: c }} />
                <span className="mono text-[12px] uppercase tracking-[0.12em]" style={{ color: c }}>
                  {t}
                </span>
              </span>
              <p className="mt-5 text-[14.5px] leading-relaxed text-[var(--color-muted)]">{d}</p>
            </InView>
          ))}
        </div>
        <InView className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["The headline is evidence, not a rating.", "Strong, Partial and Thin say how much could be checked. Never buy or sell."],
            ["Activity is measured to be hard to fake.", "Releases and distinct weeks count. A burst of trivial commits is flagged."],
            ["Verification is never sold.", "Founders can't pay for a status. A paid badge would make every badge worthless."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-[var(--color-bg-1)] p-6">
              <p className="text-[15px] font-medium">{t}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-faint)]">{d}</p>
            </div>
          ))}
        </InView>
      </section>

      {/* Audiences */}
      <section className="mx-auto mt-36 max-w-6xl px-5">
        <InView>
          <p className="label">Pick your way in</p>
          <h2 className="serif mt-4 text-[44px] leading-[1.02] sm:text-[56px]">
            Built for three moments.
          </h2>
        </InView>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            ["Trader", "You have a minute before the buy.", "Paste the token, read the card, follow the sources.", "/#token", "Look up a token"],
            ["Founder", "You're launching and want to stand apart.", "Claim your receipt and lines move from Found to Verified.", "/claim", "Claim a receipt"],
            ["Holder", "You bought. Are they still building?", "Watch a token and get told when Pulse goes quiet.", "/watch", "Open watchlist"],
          ].map(([who, moment, what, href, cta], i) => (
            <InView key={who} delay={i * 0.08}>
              <Link
                href={href}
                className="surface surface-hover group flex h-full flex-col rounded-2xl p-7"
              >
                <span className="label">{who}</span>
                <p className="serif mt-8 text-[30px] leading-[1.1]">{moment}</p>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--color-muted)]">{what}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-10 text-[14px] font-medium">
                  {cta}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </InView>
          ))}
        </div>
      </section>

      {/* Telegram */}
      <section id="telegram" className="mx-auto mt-36 max-w-6xl scroll-mt-24 px-5">
        <InView className="grid items-center gap-10 rounded-3xl border border-[var(--color-line)] bg-[var(--color-bg-1)] p-8 md:grid-cols-2 md:p-12">
          <div>
            <p className="label">Telegram</p>
            <h2 className="serif mt-4 text-[40px] leading-[1.05]">Where traders already are.</h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--color-muted)]">
              Drop a token address in any chat with the bot and it replies with the card. Tap Watch and you&apos;ll get
              an alert when the team goes quiet or the treasury moves.
            </p>
          </div>
          <div className="mono space-y-3 text-[13px]">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-[#0a0a0a]">
              JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
            </div>
            <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md border border-[var(--color-line)] bg-[var(--color-bg-2)] px-4 py-3 leading-relaxed text-[var(--color-muted)]">
              <span className="text-white">$JUP · Jupiter</span>
              <br />
              Evidence: PARTIAL (5 of 11 sourced)
              <br />
              WALLET ✓ Mint authority revoked
              <br />
              WORK ● Live product at jup.ag
              <br />
              <span className="text-[var(--color-faint)]">receipts.xyz/t/jup</span>
            </div>
            <p className="pt-1 text-[11px] text-[var(--color-faint)]">
              Run it yourself: set TELEGRAM_BOT_TOKEN, then <span className="text-[var(--color-muted)]">npm run bot</span>
            </p>
          </div>
        </InView>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto mt-36 max-w-6xl px-5 text-center">
        <InView>
          <h2 className="serif text-[52px] leading-[1] sm:text-[80px]">
            Don&apos;t trust. <span className="italic text-[var(--color-muted)]">Check the receipt.</span>
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/#token" className="btn btn-white !h-12 !px-7 text-[15px]">
              Pull a receipt
            </Link>
            <Link href="/graveyard" className="btn btn-line !h-12 !px-7 text-[15px]">
              Visit the graveyard
            </Link>
          </div>
        </InView>
      </section>
    </div>
  );
}
