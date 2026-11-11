"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Section, SectionKey } from "@/lib/types";
import { useShare } from "./share-modal";

export function subscriberId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("receipts:sub");
  if (!id) {
    id = `web_${crypto.randomUUID()}`;
    localStorage.setItem("receipts:sub", id);
  }
  return id;
}

export function ReceiptActions({ address, slug, sections }: { address: string; slug: string; sections: Section[] }) {
  const router = useRouter();
  const { openShare } = useShare();
  const [watching, setWatching] = useState(false);
  const [copied, setCopied] = useState<"link" | "image" | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [busy, setBusy] = useState<"watch" | "refresh" | null>(null);

  useEffect(() => {
    fetch(`/api/watch?subscriber=${subscriberId()}`)
      .then((r) => r.json())
      .then((j) => setWatching((j.watches ?? []).some((w: { tokenAddress: string }) => w.tokenAddress === address)))
      .catch(() => {});
  }, [address]);

  async function toggleWatch() {
    setBusy("watch");
    const sub = subscriberId();
    if (watching) {
      await fetch(`/api/watch?address=${address}&subscriber=${sub}`, { method: "DELETE" });
      setWatching(false);
    } else {
      await fetch("/api/watch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokenAddress: address, subscriber: sub, channel: "web" }),
      });
      setWatching(true);
    }
    setBusy(null);
  }

  async function copy(kind: "link" | "image") {
    const url = `${window.location.origin}/t/${slug}${kind === "image" ? "/opengraph-image" : ""}`;
    try {
      if (kind === "image" && "ClipboardItem" in window) {
        const blob = await fetch(url).then((r) => r.blob());
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(url);
      }
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  async function refresh() {
    setBusy("refresh");
    await fetch(`/api/receipt?q=${address}&force=1`);
    router.refresh();
    setBusy(null);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            const url = typeof window !== "undefined" ? `${window.location.origin}/t/${slug}` : `https://receipts.xyz/t/${slug}`;
            openShare({
              url,
              title: `$${slug.toUpperCase()} Receipt · Solana Evidence Card`,
              text: `Check the public evidence for $${slug.toUpperCase()} on Solana: team, work, pulse, money, wallet. Every line links to its source:`,
            });
          }}
          className="btn btn-white col-span-2 !h-11 inline-flex items-center justify-center gap-2"
        >
          <svg
            width="15"
            height="15"
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
          Share receipt link
        </button>
        <button onClick={() => copy("image")} className="btn btn-line">
          {copied === "image" ? "Copied ✓" : "Copy card"}
        </button>
        <button onClick={toggleWatch} disabled={busy === "watch"} className="btn btn-line" aria-pressed={watching}>
          {watching ? "● Watching" : "Watch"}
        </button>
        <button onClick={refresh} disabled={busy === "refresh"} className="btn btn-line">
          {busy === "refresh" ? "Re-reading…" : "Refresh"}
        </button>
        <button onClick={() => setDisputeOpen(true)} className="btn btn-line">
          Dispute a line
        </button>
      </div>

      <AnimatePresence>
        {disputeOpen && (
          <DisputeDialog address={address} sections={sections} onClose={() => setDisputeOpen(false)} onDone={() => router.refresh()} />
        )}
      </AnimatePresence>
    </>
  );
}

function DisputeDialog({
  address,
  sections,
  onClose,
  onDone,
}: {
  address: string;
  sections: Section[];
  onClose: () => void;
  onDone: () => void;
}) {
  const options = sections.flatMap((s) => s.lines.map((l) => ({ key: s.key, label: l.label, text: l.text })));
  const [pick, setPick] = useState(0);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    const opt = options[pick];
    setStatus("sending");
    const res = await fetch("/api/dispute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokenAddress: address, sectionKey: opt.key as SectionKey, lineLabel: opt.label, counterSourceUrl: url, note }),
    });
    if (res.ok) {
      setStatus("done");
      setTimeout(() => {
        onDone();
        onClose();
      }, 900);
    } else setStatus("error");
  }

  const field = "mt-2 w-full rounded-xl border border-[var(--color-line-2)] bg-[var(--color-bg)] px-3.5 py-2.5 text-[14px] outline-none focus:border-white/40";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-title"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ ease: [0.2, 0.8, 0.2, 1] }}
        className="w-full max-w-lg rounded-3xl border border-[var(--color-line-2)] bg-[var(--color-bg-1)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="dispute-title" className="serif text-[30px]">Dispute a line</h3>
        <p className="mt-1 text-[14px] text-[var(--color-muted)]">
          Point to a counter-source. The line shows <span className="text-[var(--color-amber)]">Disputed</span> until it&apos;s reviewed.
        </p>

        <label className="label mt-6 block">Which line</label>
        <select value={pick} onChange={(e) => setPick(Number(e.target.value))} className={field}>
          {options.map((o, i) => (
            <option key={i} value={i}>
              [{o.key}] {o.text.slice(0, 64)}
            </option>
          ))}
        </select>

        <label className="label mt-5 block">Counter-source URL</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (tx, repo, article)" className={field} />

        <label className="label mt-5 block">Note · optional</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${field} resize-none`} />

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn btn-line">
            Cancel
          </button>
          <button onClick={submit} disabled={!url || status === "sending"} className="btn btn-white">
            {status === "sending" ? "Submitting…" : status === "done" ? "Submitted ✓" : status === "error" ? "Failed, retry" : "Submit dispute"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
