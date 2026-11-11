"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { useShare } from "./share-modal";

const LINKS = [
  { href: "/", label: "Look up" },
  { href: "/graveyard", label: "Graveyard" },
  { href: "/watch", label: "Watchlist" },
  { href: "/claim", label: "For founders" },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      {/* mark: a tiny receipt with a torn edge */}
      <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden>
        <path
          d="M1 1h16v18l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6L1 19z"
          fill="#f2efe7"
        />
        <rect x="4" y="5" width="10" height="1.6" fill="#151515" />
        <rect x="4" y="8.4" width="7" height="1.6" fill="#151515" />
        <rect x="4" y="11.8" width="9" height="1.6" fill="#151515" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight">Receipts</span>
    </span>
  );
}

export function SiteNav() {
  const path = usePathname();
  const { openShare } = useShare();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [path]);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled ? "border-b border-[var(--color-line)] bg-[#0a0a0a]/80 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="Receipts home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative rounded-full px-3.5 py-1.5 text-[14px] transition-colors",
                  active ? "text-white" : "text-[var(--color-muted)] hover:text-white",
                )}
              >
                {l.label}
                {active && <span className="absolute inset-x-3.5 -bottom-[17px] h-px bg-white" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] px-3 py-1.5 sm:flex">
            <span className="live-dot" />
            <span className="mono text-[11px] uppercase tracking-[0.12em] text-[var(--color-muted)]">Mainnet</span>
          </span>
          <button
            onClick={() => openShare()}
            className="btn btn-line !h-9 !px-3 inline-flex items-center gap-1.5 text-[13px] font-medium"
            title="Share web link"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span>Share</span>
          </button>
          <Link href="/" className="btn btn-white !h-9 hidden sm:inline-flex">
            Pull a receipt
          </Link>
          <button
            className="btn btn-line !h-9 !px-3 md:hidden"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[var(--color-line)] bg-[#0a0a0a] px-5 py-3 md:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="block py-3 text-lg text-[var(--color-ink)]">
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              openShare();
            }}
            className="flex w-full items-center justify-between border-t border-[var(--color-line)] py-3 text-lg text-[var(--color-signal)]"
          >
            <span>Share web link</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
        </nav>
      )}
    </header>
  );
}
