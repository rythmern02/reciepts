// Normalise: every finding becomes a record, a Line with a status, a source
// link and the time it was read. This is where the "no source, no line" and
// "four statuses only" rules are enforced.

import type { Line, Section, LineStatus, ClaimState } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import type { TokenMeta } from "@/lib/solana";
import type { RepoData } from "./collectors/repo";
import type { SiteData } from "./collectors/site";
import type { OnchainData } from "./collectors/onchain";
import type { MarketSnapshot, Pulse } from "@/lib/types";
import { PULSE_LABEL } from "./pulse";
import { config } from "@/lib/config";
import {
  shortAddr,
  fmtUsd,
  fmtNum,
  fmtPct,
  solscanAccount,
  solscanTx,
  solscanToken,
} from "@/lib/format";

const now = () => new Date().toISOString();

function line(status: LineStatus, text: string, source?: Line["source"]): Line {
  return { label: STATUS_LABEL[status], status, text, source, readAt: now() };
}

function section(key: Section["key"], title: string, lines: Line[]): Section {
  const checkable = lines.length;
  const sourced = lines.filter((l) => l.source && (l.status === "found" || l.status === "verified")).length;
  return { key, title, summary: "", lines, confidence: checkable ? sourced / checkable : 0 };
}

export interface NormaliseInput {
  meta: TokenMeta;
  repo: RepoData | null;
  site: SiteData | null;
  onchain: OnchainData;
  market: MarketSnapshot | null;
  pulse: Pulse;
  claim: ClaimState | null;
}

export function normalise(input: NormaliseInput): Section[] {
  const { meta, repo, site, onchain, market, pulse, claim } = input;
  return [
    buildTeam(meta, onchain, claim),
    buildWork(meta, repo, site),
    buildPulse(pulse, repo),
    buildMoney(market, onchain, claim),
    buildWallet(meta, onchain),
  ];
}

function buildTeam(meta: TokenMeta, oc: OnchainData, claim: ClaimState | null): Section {
  const lines: Line[] = [];

  // Founder claim
  if (claim?.claimed) {
    const methods = [
      claim.github?.verified && "GitHub",
      claim.x?.verified && "X",
      claim.domain?.verified && "domain",
      claim.wallet?.verified && "wallet",
    ].filter(Boolean);
    if (methods.length) {
      lines.push(
        line("verified", `${methods.join(" + ")} claimed by the founder`, {
          url: claim.github?.proofUrl || claim.x?.proofUrl || `/t/${meta.symbol ?? meta.address}`,
          label: "Signed claim",
          kind: "claim",
        }),
      );
    }
  } else {
    lines.push(line("not_found", "No founder claim linked yet"));
  }

  // Deployer
  if (oc.deployer.address) {
    const date = oc.deployer.createdAt ? new Date(oc.deployer.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "unknown date";
    lines.push(
      line("found", `Deployed by ${shortAddr(oc.deployer.address)} on ${date}`, {
        url: oc.deployer.createTx ? solscanTx(oc.deployer.createTx) : solscanAccount(oc.deployer.address),
        label: "Solscan",
        kind: "onchain",
      }),
    );
    if (oc.deployer.earlierLaunches != null) {
      lines.push(
        line(oc.deployer.earlierLaunches > 0 ? "found" : "not_found", launchHistoryText(oc), {
          url: solscanAccount(oc.deployer.address),
          label: "Solscan",
          kind: "onchain",
        }),
      );
    } else {
      lines.push(
        line(
          "not_found",
          config.hasHelius ? "Deployer launch history could not be read" : "Deployer launch history not indexed (connect a Helius key)",
        ),
      );
    }
  } else {
    lines.push(
      line(
        "not_found",
        config.hasHelius ? "Deployer could not be resolved from chain history" : "Deployer not resolvable on this RPC. Connect a Helius key for indexed history",
      ),
    );
  }

  // Company registration, never inferred.
  lines.push(line("not_found", "No company registration linked"));

  return section("team", "Team", lines);
}

function buildWork(meta: TokenMeta, repo: RepoData | null, site: SiteData | null): Section {
  const lines: Line[] = [];

  if (repo?.found) {
    const parts = [`Public repo`];
    if (repo.totalCommits != null) parts.push(`${fmtNum(repo.totalCommits)} commits`);
    if (repo.contributors != null) parts.push(`${repo.contributors} contributor${repo.contributors === 1 ? "" : "s"}`);
    lines.push(line("found", parts.join(", "), { url: repo.url, label: "GitHub", kind: "repo" }));
    if (repo.ageDays != null) {
      const months = Math.floor(repo.ageDays / 30);
      lines.push(line("found", `Repository is ${months >= 1 ? `${months} month${months === 1 ? "" : "s"}` : `${repo.ageDays} days`} old`, { url: repo.url, label: "GitHub", kind: "repo" }));
    }
    if (repo.latestRelease) {
      const d = new Date(repo.latestRelease.at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      lines.push(line("found", `${fmtNum(repo.releases)} releases, latest ${repo.latestRelease.tag} on ${d}`, { url: repo.latestRelease.url, label: "GitHub", kind: "repo" }));
    }
  } else if (repo && !repo.found) {
    lines.push(line("not_found", `Linked repo github.com/${repo.owner}/${repo.repo} is private or missing`));
  } else {
    lines.push(line("not_found", "No public repository linked in token metadata"));
  }

  if (site?.found) {
    lines.push(line("found", `Live product at ${site.host}`, { url: site.url, label: site.host, kind: "page" }));
  } else if (site && !site.found) {
    lines.push(line("not_found", `Linked site ${site.host} did not respond`));
  } else {
    lines.push(line("not_found", "No live site linked in token metadata"));
  }

  return section("work", "Work", lines);
}

function buildPulse(pulse: Pulse, repo: RepoData | null): Section {
  const lines: Line[] = [];
  if (pulse.state === "unknown") {
    lines.push(line("not_found", "No repository to measure building activity"));
    return section("pulse", "Pulse", lines);
  }
  lines.push(
    line("found", `${PULSE_LABEL[pulse.state]}: ${pulse.activeWeeks} of the last ${pulse.totalWeeks} weeks had commits or releases`, repo ? { url: `${repo.url}/graphs/commit-activity`, label: "GitHub", kind: "repo" } : undefined),
  );
  if (pulse.burstFlag) {
    lines.push(line("found", "Activity is concentrated in a single burst, flagged as not steady", repo ? { url: `${repo.url}/commits`, label: "GitHub", kind: "repo" } : undefined));
  }
  return section("pulse", "Pulse", lines);
}

function buildMoney(market: MarketSnapshot | null, oc: OnchainData, claim: ClaimState | null): Section {
  const lines: Line[] = [];

  if (market) {
    const parts: string[] = [];
    if (market.marketCapUsd) parts.push(`Market cap ${fmtUsd(market.marketCapUsd)}`);
    if (market.liquidityUsd) parts.push(`liquidity ${fmtUsd(market.liquidityUsd)}`);
    if (parts.length) {
      lines.push(line("found", parts.join(", "), market.dexUrl ? { url: market.dexUrl, label: "DexScreener", kind: "market" } : undefined));
    }
    if (market.volume24hUsd != null) {
      lines.push(line("found", `24h volume ${fmtUsd(market.volume24hUsd)}`, market.dexUrl ? { url: market.dexUrl, label: "DexScreener", kind: "market" } : undefined));
    }
  } else {
    lines.push(line("not_found", "No liquid market found for this token"));
  }

  if (oc.teamWalletLinked) {
    lines.push(line("verified", `Treasury wallet holds ${oc.treasurySol?.toFixed(2) ?? "?"} SOL`, claim?.wallet?.address ? { url: solscanAccount(claim.wallet.address), label: "Solscan", kind: "onchain" } : undefined));
    if (oc.teamWalletSells != null) {
      lines.push(line(oc.teamWalletSells === 0 ? "verified" : "found", oc.teamWalletSells === 0 ? "Team wallets: no sells in 90 days" : `Team wallets: ${oc.teamWalletSells} sells in 90 days`, claim?.wallet?.address ? { url: solscanAccount(claim.wallet.address), label: "Solscan", kind: "onchain" } : undefined));
    }
  } else {
    lines.push(line("not_found", "Treasury and team wallets not linked. Founder claim required"));
  }

  return section("money", "Money", lines);
}

function buildWallet(meta: TokenMeta, oc: OnchainData): Section {
  const lines: Line[] = [];

  lines.push(
    line(
      oc.mintAuthorityRevoked ? "verified" : "found",
      oc.mintAuthorityRevoked ? "Mint authority revoked, supply is fixed" : "Mint authority still active, more supply can be minted",
      { url: solscanToken(meta.address), label: "Solscan", kind: "onchain" },
    ),
  );
  lines.push(
    line(
      oc.freezeAuthorityRevoked ? "verified" : "found",
      oc.freezeAuthorityRevoked ? "Freeze authority revoked, balances cannot be frozen" : "Freeze authority still active, balances can be frozen",
      { url: solscanToken(meta.address), label: "Solscan", kind: "onchain" },
    ),
  );
  if (oc.topHolderPct != null) {
    lines.push(
      line("found", `Top holder controls ${fmtPct(oc.topHolderPct)} of supply`, {
        url: `${solscanToken(meta.address)}#holders`,
        label: "Solscan",
        kind: "onchain",
      }),
    );
  }
  if (oc.deployer.address) {
    lines.push(
      line(
        "found",
        oc.deployer.earlierLaunches != null
          ? `Deployer ${shortAddr(oc.deployer.address)}: ${launchHistoryText(oc, true)}`
          : `Deployer: ${shortAddr(oc.deployer.address)}`,
        { url: solscanAccount(oc.deployer.address), label: "Solscan", kind: "onchain" },
      ),
    );
  }
  return section("wallet", "Wallet", lines);
}

/** "2 earlier launches, 1 still trading": counted, never judged. */
function launchHistoryText(oc: OnchainData, short = false): string {
  const n = oc.deployer.earlierLaunches ?? 0;
  if (n === 0) return short ? "no earlier launches" : "No earlier launches found for this deployer";
  const atLeast = oc.deployer.launchesCapped ? "at least " : "";
  const head = short
    ? `${atLeast}${n} earlier launch${n === 1 ? "" : "es"}`
    : `Deployer created ${atLeast}${n} earlier token${n === 1 ? "" : "s"}`;
  const live = oc.deployer.stillTradingCount;
  return live == null ? head : `${head}, ${live} still trading`;
}
