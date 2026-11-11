export function shortAddr(a?: string | null, lead = 4, tail = 4): string {
  if (!a) return "n/a";
  if (a.length <= lead + tail + 1) return a;
  return `${a.slice(0, lead)}…${a.slice(-tail)}`;
}

export function fmtUsd(n?: number | null): string {
  if (n == null) return "n/a";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toPrecision(2)}`;
}

export function fmtNum(n?: number | null): string {
  if (n == null) return "n/a";
  return new Intl.NumberFormat("en-US").format(n);
}

export function fmtPct(n?: number | null): string {
  if (n == null) return "n/a";
  return `${(n * 100).toFixed(1)}%`;
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return "n/a";
  const d = Date.now() - new Date(iso).getTime();
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function solscanToken(mint: string) {
  return `https://solscan.io/token/${mint}`;
}
export function solscanAccount(a: string) {
  return `https://solscan.io/account/${a}`;
}
export function solscanTx(sig: string) {
  return `https://solscan.io/tx/${sig}`;
}
