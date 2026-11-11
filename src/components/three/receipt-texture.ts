// Paints a ReceiptSummary onto a canvas as thermal-printer paper.
// The 3D scene uses the canvas as a texture, so the strip shows real data.
import type { ReceiptSummary } from "@/lib/summary";
import type { LineStatus, EvidenceLevel } from "@/lib/types";

export const TEX_W = 600;
export const TEX_H = 1200;

const INK = "#161616";
const FAINT = "#8b877c";
const STAMP: Record<EvidenceLevel | "ready", string> = {
  strong: "#178a5c",
  partial: "#b8720b",
  thin: "#c8352b",
  ready: "#161616",
};
const GLYPH: Record<LineStatus, string> = {
  verified: "✓ VERIFIED",
  found: "● FOUND",
  not_found: "○ NOT FOUND",
  disputed: "! DISPUTED",
};

function monoFamily(): string {
  if (typeof document === "undefined") return "monospace";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim();
  return v ? `${v}, ui-monospace, Menlo, monospace` : "ui-monospace, Menlo, monospace";
}

/** Deterministic PRNG so the barcode/speckle is stable per token. */
function rng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function short(a: string) {
  return `${a.slice(0, 5)}…${a.slice(-5)}`;
}
function usd(n: number | null) {
  if (n == null) return "n/a";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function paintReceipt(canvas: HTMLCanvasElement, s: ReceiptSummary | null) {
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext("2d")!;
  const mono = monoFamily();
  const rand = rng(s?.address ?? "receipts");
  const PAD = 46;

  // paper
  ctx.fillStyle = "#f2efe7";
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  // thermal banding + speckle
  for (let y = 0; y < TEX_H; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,${0.012 + rand() * 0.012})`;
    ctx.fillRect(0, y, TEX_W, 1);
  }
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rand() * 0.06})`;
    ctx.fillRect(rand() * TEX_W, rand() * TEX_H, 1.2, 1.2);
  }

  const text = (t: string, x: number, y: number, size: number, opts: { weight?: number; color?: string; align?: CanvasTextAlign; spacing?: number } = {}) => {
    ctx.font = `${opts.weight ?? 500} ${size}px ${mono}`;
    ctx.fillStyle = opts.color ?? INK;
    ctx.textAlign = opts.align ?? "left";
    ctx.textBaseline = "alphabetic";
    // letterSpacing is supported in Chromium/Safari; harmless elsewhere.
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${opts.spacing ?? 0}px`;
    ctx.fillText(t, x, y);
    (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
  };
  const rule = (y: number) => {
    ctx.strokeStyle = "rgba(22,22,22,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(TEX_W - PAD, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const row = (label: string, value: string, y: number, valueColor = INK) => {
    text(label, PAD, y, 21, { color: FAINT, spacing: 2 });
    text(value, TEX_W - PAD, y, 23, { weight: 700, align: "right", color: valueColor });
  };

  // header
  text("RECEIPTS", TEX_W / 2, 92, 56, { weight: 800, align: "center", spacing: 10 });
  text("EVIDENCE CARD · SOLANA MAINNET", TEX_W / 2, 132, 17, { color: FAINT, align: "center", spacing: 3 });
  text(new Date(s?.updatedAt ?? Date.now()).toISOString().replace("T", " ").slice(0, 16) + " UTC", TEX_W / 2, 160, 16, { color: FAINT, align: "center" });
  rule(188);

  let y = 236;
  if (s) {
    row("TOKEN", s.ticker ? `$${s.ticker}`.slice(0, 16) : "UNKNOWN", y);
    row("NAME", (s.name ?? "n/a").slice(0, 18), (y += 42));
    row("MINT", short(s.address), (y += 42));
    row("MCAP", usd(s.marketCap), (y += 42));
  } else {
    row("TOKEN", "· · ·", y);
    row("NAME", "waiting", (y += 42));
    row("MINT", "paste above", (y += 42));
    row("MCAP", "n/a", (y += 42));
  }
  rule((y += 34));

  y += 52;
  const sections = s?.sections ?? [
    { key: "team", title: "Team", status: "not_found" as LineStatus },
    { key: "work", title: "Work", status: "not_found" as LineStatus },
    { key: "pulse", title: "Pulse", status: "not_found" as LineStatus },
    { key: "money", title: "Money", status: "not_found" as LineStatus },
    { key: "wallet", title: "Wallet", status: "not_found" as LineStatus },
  ];
  for (const sec of sections) {
    const color = sec.status === "verified" ? "#178a5c" : sec.status === "disputed" ? "#b8720b" : sec.status === "not_found" ? FAINT : INK;
    text(sec.title.toUpperCase(), PAD, y, 24, { weight: 700, spacing: 2 });
    text(s ? GLYPH[sec.status] : "· · ·", TEX_W - PAD, y, 21, { weight: 600, align: "right", color });
    y += 46;
  }
  rule((y += 2));

  y += 50;
  row("SOURCED", s ? `${s.sourced} / ${s.total}` : "n/a", y);
  row("PULSE", s ? s.pulse.toUpperCase() : "n/a", (y += 42));

  // stamp
  const level: EvidenceLevel | "ready" = s?.level ?? "ready";
  const cx = TEX_W / 2;
  const cy = y + 150;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.2);
  ctx.strokeStyle = STAMP[level];
  ctx.fillStyle = STAMP[level];
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-190, -70, 380, 140, 18);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-176, -56, 352, 112, 12);
  ctx.stroke();
  ctx.font = `800 64px ${mono}`;
  ctx.textAlign = "center";
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillText(level === "ready" ? "READY" : level.toUpperCase(), 0, 16);
  ctx.font = `600 16px ${mono}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "5px";
  ctx.fillText(level === "ready" ? "PASTE A TOKEN" : "EVIDENCE LEVEL", 0, 44);
  ctx.restore();
  // distress the stamp
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.3 + rand() * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx - 200 + rand() * 400, cy - 90 + rand() * 180, rand() * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // re-fill paper colour under the distress holes
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#f2efe7";
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.restore();

  y = cy + 120;
  rule(y);

  // barcode
  y += 30;
  let x = PAD + 10;
  ctx.fillStyle = INK;
  while (x < TEX_W - PAD - 10) {
    const w = 1.5 + Math.floor(rand() * 4) * 1.5;
    if (rand() > 0.35) ctx.fillRect(x, y, w, 88);
    x += w + 1.5 + rand() * 3;
  }
  text(s ? `receipts.xyz/t/${s.slug}` : "receipts.xyz", TEX_W / 2, y + 122, 18, { align: "center", color: INK, weight: 600 });
  text("NOT INVESTMENT ADVICE · EVERY LINE IS SOURCED", TEX_W / 2, y + 152, 13, { align: "center", color: FAINT, spacing: 1 });
}
