// On-chain reads consolidated for Team / Money / Wallet sections.
import {
  getDeployer,
  getTopHolders,
  getSolBalance,
  countRecentSells,
  type TokenMeta,
  type DeployerInfo,
  type Holder,
} from "@/lib/solana";
import type { ClaimState } from "@/lib/types";

export interface OnchainData {
  deployer: DeployerInfo;
  holders: Holder[];
  topHolderPct: number | null;
  mintAuthorityRevoked: boolean | null;
  freezeAuthorityRevoked: boolean | null;
  /** Treasury is only resolvable when the founder has linked+verified a wallet. */
  treasurySol: number | null;
  teamWalletSells: number | null;
  teamWalletLinked: boolean;
}

export async function collectOnchain(meta: TokenMeta, claim: ClaimState | null): Promise<OnchainData> {
  const [deployer, holders] = await Promise.all([
    getDeployer(meta.address),
    getTopHolders(meta.address, meta.supply),
  ]);

  const topHolderPct = holders.length ? holders[0].pct : null;

  let treasurySol: number | null = null;
  let teamWalletSells: number | null = null;
  const teamWalletLinked = Boolean(claim?.wallet?.verified && claim.wallet.address);
  if (teamWalletLinked && claim?.wallet?.address) {
    [treasurySol, teamWalletSells] = await Promise.all([
      getSolBalance(claim.wallet.address),
      countRecentSells(claim.wallet.address, meta.address, 90),
    ]);
  }

  return {
    deployer,
    holders,
    topHolderPct,
    mintAuthorityRevoked: meta.mintAuthority == null ? true : false,
    freezeAuthorityRevoked: meta.freezeAuthority == null ? true : false,
    treasurySol,
    teamWalletSells,
    teamWalletLinked,
  };
}
