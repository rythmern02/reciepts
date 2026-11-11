"use client";

import { useState, useEffect } from "react";
import { useShare } from "./share-modal";

export function TopBanner() {
  const { openShare } = useShare();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = sessionStorage.getItem("receipts:top_banner_dismissed");
      if (isDismissed) setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("receipts:top_banner_dismissed", "1");
    }
  };

  if (dismissed) return null;

  return (
    <div className="relative z-50 border-b border-[var(--color-line)] bg-gradient-to-r from-[#0d1410] via-[#0a0a0a] to-[#0d1410] px-4 py-2 text-center text-[13px] text-[var(--color-muted)] transition-all">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        {/* Left / Center content */}
        <div className="flex flex-1 items-center justify-center gap-2.5 sm:gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-[var(--color-signal)]/30 bg-[var(--color-signal)]/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-signal)]">
            <span className="live-dot !h-1.5 !w-1.5" />
            <span>Mainnet</span>
          </span>

          <span className="hidden text-white/90 md:inline font-medium">
            Every Solana token has a receipt. Look up any mint, team or pulse in under 10 seconds.
          </span>
          <span className="text-white/90 md:hidden font-medium text-[12px]">
            Every Solana token has a receipt.
          </span>

          {/* Trigger button */}
          <button
            onClick={() => openShare()}
            className="group ml-1 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11.5px] font-medium text-white backdrop-blur transition-all hover:border-white hover:bg-white hover:text-black cursor-pointer"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:scale-110"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span>Share web link</span>
          </button>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="rounded-full p-1 text-[var(--color-faint)] transition-colors hover:text-white"
          aria-label="Dismiss banner"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
