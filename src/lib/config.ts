// Central runtime config. Everything degrades gracefully when keys are absent.

export const config = {
  get rpcUrl(): string {
    if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
    if (process.env.HELIUS_API_KEY)
      return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
    return "https://api.mainnet-beta.solana.com";
  },
  get heliusKey(): string | null {
    return process.env.HELIUS_API_KEY || null;
  },
  get hasHelius(): boolean {
    return Boolean(process.env.HELIUS_API_KEY) || /helius/.test(process.env.SOLANA_RPC_URL || "");
  },
  get githubToken(): string | null {
    return process.env.GITHUB_TOKEN || null;
  },
  get anthropicKey(): string | null {
    return process.env.ANTHROPIC_API_KEY || null;
  },
  get telegramToken(): string | null {
    return process.env.TELEGRAM_BOT_TOKEN || null;
  },
  get baseUrl(): string {
    return (
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    );
  },
  /** Cache TTLs. Cached Receipt served in <2s, fresh in <10s (PRD). */
  cache: {
    receiptTtlMs: 1000 * 60 * 10, // 10 min for hot tokens
    marketTtlMs: 1000 * 60 * 2,
  },
};

/** Fetch with a hard timeout so a single slow source never blocks the <10s budget. */
export async function fetchWithTimeout(
  url: string,
  opts: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 7000, ...rest } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
