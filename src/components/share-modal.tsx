"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";

interface ShareOptions {
  url?: string;
  title?: string;
  text?: string;
}

interface ShareContextValue {
  isOpen: boolean;
  options: ShareOptions;
  openShare: (options?: ShareOptions) => void;
  closeShare: () => void;
}

const ShareContext = createContext<ShareContextValue>({
  isOpen: false,
  options: {},
  openShare: () => {},
  closeShare: () => {},
});

export function useShare() {
  return useContext(ShareContext);
}

export function ShareProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ShareOptions>({});

  const openShare = useCallback((opts?: ShareOptions) => {
    setOptions(opts || {});
    setIsOpen(true);
  }, []);

  const closeShare = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Listen for ?share=1 or #share in URL on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("share") === "1" || params.get("share") === "true" || window.location.hash === "#share") {
        openShare();
      }
    }
  }, [openShare]);

  return (
    <ShareContext.Provider value={{ isOpen, options, openShare, closeShare }}>
      {children}
      <ShareModal isOpen={isOpen} onClose={closeShare} options={options} />
    </ShareContext.Provider>
  );
}

export function ShareModal({
  isOpen,
  onClose,
  options,
}: {
  isOpen: boolean;
  onClose: () => void;
  options: ShareOptions;
}) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"banner" | "qr">("banner");
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Compute active URL & sharing copy
  const defaultUrl = typeof window !== "undefined" ? window.location.origin : "https://receipts.xyz";
  const shareUrl = options.url || (typeof window !== "undefined" ? window.location.href.split("?")[0].split("#")[0] : defaultUrl);
  const shareTitle = options.title || "Receipts · every Solana token has a receipt";
  const shareText =
    options.text ||
    "Don't trust. Check the receipt. Audit any Solana token in under 10 seconds: team, work, pulse, money, wallet.";

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanNativeShare(true);
    }
  }, []);

  // Generate QR code when modal opens or url changes
  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        margin: 1.5,
        width: 320,
        color: {
          dark: "#151515",
          light: "#f2efe7",
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }
  }, [isOpen, shareUrl]);

  // Handle ESC key to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy link:", shareUrl);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    }
  };

  // Social share links
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.12 }}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--color-line-2)] bg-[#101010] p-6 shadow-2xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top ambient glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-44 w-80 -translate-x-1/2 rounded-full bg-[var(--color-signal)]/10 blur-3xl" />

            {/* Header */}
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--color-line-2)] bg-[#181818] shadow-inner">
                  {/* Receipts mini torn logo mark */}
                  <svg width="18" height="22" viewBox="0 0 18 22" aria-hidden>
                    <path
                      d="M1 1h16v18l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6L1 19z"
                      fill="#f2efe7"
                    />
                    <rect x="4" y="5" width="10" height="1.6" fill="#151515" />
                    <rect x="4" y="8.4" width="7" height="1.6" fill="#151515" />
                    <rect x="4" y="11.8" width="9" height="1.6" fill="#151515" />
                  </svg>
                </div>
                <div>
                  <h3 id="share-modal-title" className="text-[20px] font-semibold tracking-tight text-white">
                    Share Receipts
                  </h3>
                  <p className="text-[13px] text-[var(--color-muted)]">
                    Audit any Solana token · Evidence over opinions
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] bg-[#181818] text-[var(--color-muted)] transition-colors hover:border-white/30 hover:text-white"
                aria-label="Close modal"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* View Switcher: Banner Card vs QR Code */}
            <div className="mt-5 flex items-center justify-between border-b border-[var(--color-line)] pb-3">
              <div className="flex gap-1.5 rounded-full border border-[var(--color-line)] bg-[#0d0d0d] p-1">
                <button
                  onClick={() => setActiveTab("banner")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                    activeTab === "banner"
                      ? "bg-white text-black shadow-sm"
                      : "text-[var(--color-muted)] hover:text-white"
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Share Banner
                </button>
                <button
                  onClick={() => setActiveTab("qr")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                    activeTab === "qr"
                      ? "bg-white text-black shadow-sm"
                      : "text-[var(--color-muted)] hover:text-white"
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  QR Code
                </button>
              </div>

              <span className="mono text-[11px] uppercase tracking-wider text-[var(--color-faint)]">
                Solana Mainnet
              </span>
            </div>

            {/* Main Preview Container */}
            <div className="mt-4">
              {activeTab === "banner" ? (
                <div className="group relative overflow-hidden rounded-2xl border border-[var(--color-line-2)] bg-[#0a0a0a]">
                  {/* Banner image preview */}
                  <div className="relative aspect-[1200/630] w-full overflow-hidden bg-[#0d0d0d]">
                    <Image
                      src="/banner.png"
                      alt="Receipts Share Banner"
                      fill
                      sizes="(max-width: 640px) 100vw, 600px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      priority
                    />
                  </div>

                  {/* Banner footer strip */}
                  <div className="flex items-center justify-between border-t border-[var(--color-line)] bg-[#141414] px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[var(--color-signal)]" />
                      <span className="mono text-[12px] font-semibold text-white">receipts.xyz</span>
                      <span className="text-[12px] text-[var(--color-faint)]">· One-page token audit</span>
                    </div>
                    <a
                      href="/banner.png"
                      download="receipts-banner.png"
                      className="mono flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-white"
                      title="Download Banner Image"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--color-line-2)] bg-[#0d0d0d] p-6 text-center">
                  <div className="relative rounded-2xl bg-[#f2efe7] p-3 shadow-lg">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="Scan QR code to open link"
                        className="h-48 w-48 rounded-xl object-contain"
                      />
                    ) : (
                      <div className="flex h-48 w-48 items-center justify-center text-black">
                        Loading QR...
                      </div>
                    )}
                    {/* Tiny centered badge */}
                    <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-[#0a0a0a] shadow-md">
                      <svg width="14" height="17" viewBox="0 0 18 22" aria-hidden>
                        <path
                          d="M1 1h16v18l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6L1 19z"
                          fill="#f2efe7"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-3 text-[14px] font-medium text-white">Scan with phone camera</p>
                  <p className="text-[12px] text-[var(--color-muted)]">Opens this receipt link directly</p>
                </div>
              )}
            </div>

            {/* Quick Copy Link Bar */}
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--color-line-2)] bg-[#0c0c0c] p-1.5 pl-3.5">
              <span className="mono truncate text-[13px] text-[var(--color-muted)]">
                {shareUrl}
              </span>
              <button
                onClick={handleCopy}
                className={`btn ml-auto !h-9 shrink-0 !px-4 text-[13px] font-medium transition-all ${
                  copied
                    ? "!bg-[var(--color-signal)] !text-[#0a0a0a]"
                    : "btn-white"
                }`}
              >
                {copied ? (
                  <span className="flex items-center gap-1.5 font-bold">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy link
                  </span>
                )}
              </button>
            </div>

            {/* Social Share Grid */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {/* X / Twitter */}
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[#151515] py-2.5 text-[13px] font-medium text-white transition-all hover:border-white/30 hover:bg-[#1f1f1f]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Post on 𝕏
              </a>

              {/* Telegram */}
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[#151515] py-2.5 text-[13px] font-medium text-white transition-all hover:border-[#229ed9]/50 hover:bg-[#1a2530]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#229ed9]">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
                Telegram
              </a>

              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[#151515] py-2.5 text-[13px] font-medium text-white transition-all hover:border-[#25d366]/50 hover:bg-[#16271c]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#25d366]">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.47 3.52 1.36 5.06L2 22l5.22-1.37c1.47.8 3.14 1.22 4.82 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 17.58h-.01c-1.52 0-3-.41-4.29-1.18l-.31-.18-3.19.84.85-3.11-.2-.32a8.04 8.04 0 01-1.23-4.28c0-4.44 3.61-8.05 8.06-8.05 2.15 0 4.17.84 5.69 2.36a8.01 8.01 0 012.36 5.69c0 4.45-3.62 8.06-8.06 8.06z" />
                </svg>
                WhatsApp
              </a>

              {/* Reddit */}
              <a
                href={redditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--color-line)] bg-[#151515] py-2.5 text-[13px] font-medium text-white transition-all hover:border-[#ff4500]/50 hover:bg-[#281814]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#ff4500]">
                  <path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2zm5.01 4.75a1.25 1.25 0 0 1 1.25 1.25c0 .69-.56 1.25-1.25 1.25-.17 0-.33-.03-.48-.1l-1.4 2.8c.03.1.05.21.05.32 0 2.21-2.69 4-6 4s-6-1.79-6-4c0-.11.02-.22.05-.32l-1.4-2.8a1.23 1.23 0 0 1-.48.1 1.25 1.25 0 1 1 1.25-1.25c0 .28-.09.53-.25.74l1.45 2.91C6.27 11.27 7.03 11 8 10.84l1.23-3.69-.02-.01 2.32-.46.77 1.76c.46-.28 1-.44 1.58-.44h.01l.73-1.45a1.24 1.24 0 0 1 .39.19z" />
                </svg>
                Reddit
              </a>
            </div>

            {/* Native device share on mobile if supported */}
            {canNativeShare && (
              <button
                onClick={handleNativeShare}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-line-2)] bg-[#181818] py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#222]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                More share options (Native app share)
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
