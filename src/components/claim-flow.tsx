"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import bs58 from "bs58";
import { clsx } from "clsx";

type Method = "wallet" | "dns" | "github" | "x";
type Verified = Record<Method, boolean>;
type Verify = (m: Method, p: Record<string, unknown>) => Promise<void>;

interface Challenge {
  nonce: string;
  message: string;
  instructions: Record<Method, string>;
}

const field =
  "w-full rounded-xl border border-[var(--color-line-2)] bg-[var(--color-bg)] px-3.5 py-2.5 text-[14px] outline-none focus:border-white/40";

export function ClaimFlow({ address, ticker, slug }: { address: string; ticker: string | null; slug: string }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [verified, setVerified] = useState<Verified>({ wallet: false, dns: false, github: false, x: false });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/claim/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokenAddress: address }),
    })
      .then((r) => r.json())
      .then(setChallenge)
      .catch(() => setMsg({ ok: false, text: "Could not start a claim challenge." }));
  }, [address]);

  const verify: Verify = async (method, payload) => {
    if (!challenge) return;
    setMsg(null);
    const res = await fetch("/api/claim/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokenAddress: address, method, nonce: challenge.nonce, ...payload }),
    });
    const json = await res.json();
    if (json.ok) {
      setVerified((v) => ({ ...v, [method]: true }));
      setMsg({ ok: true, text: `${method === "x" ? "X" : method[0].toUpperCase() + method.slice(1)} verified.` });
    } else setMsg({ ok: false, text: json.error || `${method} could not be verified.` });
  };

  if (!challenge) return <div className="shimmer mt-10 h-72 rounded-2xl" />;
  const count = Object.values(verified).filter(Boolean).length;

  return (
    <div className="mt-10">
      <div className="rounded-2xl bg-[var(--color-bg-1)] p-5">
        <p className="label">Your proof nonce</p>
        <p className="mono mt-2 break-all text-[14px]">{challenge.nonce}</p>
        <p className="mt-2 text-[12.5px] text-[var(--color-faint)]">Single-use and tied to this token. Use it in any of the methods below.</p>
      </div>

      {msg && (
        <p role="status" className="mt-4 text-[14px]" style={{ color: msg.ok ? "var(--color-signal)" : "var(--color-red)" }}>
          {msg.text}
        </p>
      )}

      <div className="mt-6 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
        <WalletStep n={1} verified={verified.wallet} message={challenge.message} onVerify={verify} />
        <DnsStep n={2} verified={verified.dns} nonce={challenge.nonce} onVerify={verify} />
        <ProofStep n={3} method="github" title="GitHub" desc="Create a public gist under your account containing the nonce, then paste its URL." handleHint="github handle" urlHint="https://gist.github.com/you/…" verified={verified.github} onVerify={verify} />
        <ProofStep n={4} method="x" title="X" desc="Post the nonce from the project account, then paste the post URL. X often blocks automated reads. If so, use another method." handleHint="handle, without @" urlHint="https://x.com/you/status/…" verified={verified.x} onVerify={verify} />
      </div>

      {count > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-signal)]/30 p-5">
          <p className="text-[15px]">
            {ticker ? `$${ticker}` : "Your receipt"} now carries {count} verified line{count === 1 ? "" : "s"}.
          </p>
          <Link href={`/t/${slug}`} className="btn btn-white">
            See the updated receipt →
          </Link>
        </div>
      )}
    </div>
  );
}

function Step({ n, title, desc, verified, children }: { n: number; title: string; desc: string; verified: boolean; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 py-7 sm:grid-cols-[48px_1fr]">
      <span className={clsx("mono pt-1 text-[12px]", verified ? "text-[var(--color-signal)]" : "text-[var(--color-faint)]")}>
        {verified ? "✓" : `0${n}`}
      </span>
      <div>
        <div className="flex items-center gap-3">
          <h3 className="text-[19px] font-medium">{title}</h3>
          {verified && <span className="pill text-[var(--color-signal)]">Verified</span>}
        </div>
        <p className="mt-1 max-w-lg text-[14px] text-[var(--color-muted)]">{desc}</p>
        {!verified && <div className="mt-4">{children}</div>}
      </div>
    </section>
  );
}

function WalletStep({ n, verified, message, onVerify }: { n: number; verified: boolean; message: string; onVerify: Verify }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function sign() {
    setErr(null);
    const provider = (window as unknown as { solana?: any; phantom?: { solana?: any } }).phantom?.solana ?? (window as any).solana;
    if (!provider) {
      setErr("No Solana wallet detected. Install Phantom or Solflare, then reload.");
      return;
    }
    try {
      setBusy(true);
      await provider.connect();
      const addr = provider.publicKey.toString();
      const { signature } = await provider.signMessage(new TextEncoder().encode(message), "utf8");
      await onVerify("wallet", { address: addr, signature: bs58.encode(signature) });
    } catch (e) {
      setErr((e as Error).message ?? "Signing was cancelled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Step n={n} title="Team wallet" desc="Sign one message from the wallet that holds the treasury. No transaction, no fee." verified={verified}>
      <p className="mono rounded-xl bg-[var(--color-bg-1)] p-3 text-[12px] leading-relaxed text-[var(--color-muted)]">{message}</p>
      <button onClick={sign} disabled={busy} className="btn btn-white mt-3">
        {busy ? "Waiting for wallet…" : "Connect & sign"}
      </button>
      {err && <p className="mt-2 text-[13px] text-[var(--color-red)]">{err}</p>}
    </Step>
  );
}

function DnsStep({ n, verified, nonce, onVerify }: { n: number; verified: boolean; nonce: string; onVerify: Verify }) {
  const [host, setHost] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Step n={n} title="Domain" desc="Add this TXT record at your DNS provider (on the root or _receipts subdomain). Propagation can take a few minutes." verified={verified}>
      <p className="mono rounded-xl bg-[var(--color-bg-1)] p-3 text-[12.5px]">
        TXT&nbsp;&nbsp;receipts-verification={nonce}
      </p>
      <div className="mt-3 flex gap-2">
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="yourproject.com" className={field} />
        <button
          onClick={async () => {
            setBusy(true);
            await onVerify("dns", { host });
            setBusy(false);
          }}
          disabled={!host || busy}
          className="btn btn-white !h-[42px]"
        >
          {busy ? "Checking…" : "Verify"}
        </button>
      </div>
    </Step>
  );
}

function ProofStep({
  n,
  method,
  title,
  desc,
  handleHint,
  urlHint,
  verified,
  onVerify,
}: {
  n: number;
  method: "github" | "x";
  title: string;
  desc: string;
  handleHint: string;
  urlHint: string;
  verified: boolean;
  onVerify: Verify;
}) {
  const [handle, setHandle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Step n={n} title={title} desc={desc} verified={verified}>
      <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
        <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={handleHint} className={field} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={urlHint} className={field} />
      </div>
      <button
        onClick={async () => {
          setBusy(true);
          await onVerify(method, { handle, proofUrl: url });
          setBusy(false);
        }}
        disabled={!handle || !url || busy}
        className="btn btn-white mt-3"
      >
        {busy ? "Checking…" : "Verify"}
      </button>
    </Step>
  );
}
