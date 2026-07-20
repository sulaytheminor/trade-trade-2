import { Connection, PublicKey } from "@solana/web3.js";

export interface MintAuthorityInfo {
  mintAuthority: string | null;
  freezeAuthority: string | null;
  supply: string;
  decimals: number;
}

/**
 * Reads REAL on-chain mint data via getParsedAccountInfo. If
 * mintAuthority is null, minting is disabled (good sign). If
 * freezeAuthority is null, tokens can't be frozen by the creator
 * (good sign). Both being non-null is a genuine red flag worth
 * surfacing, not a guess.
 */
export async function getMintAuthorityInfo(
  connection: Connection,
  mintAddress: string
): Promise<MintAuthorityInfo | null> {
  const pubkey = new PublicKey(mintAddress);
  const info = await connection.getParsedAccountInfo(pubkey);
  const data = info.value?.data;
  if (!data || typeof data !== "object" || !("parsed" in data)) return null;

  const parsed = (data as { parsed: { info?: Record<string, unknown> } }).parsed;
  const mintInfo = parsed.info;
  if (!mintInfo) return null;

  return {
    mintAuthority: (mintInfo.mintAuthority as string | null) ?? null,
    freezeAuthority: (mintInfo.freezeAuthority as string | null) ?? null,
    supply: String(mintInfo.supply ?? "0"),
    decimals: Number(mintInfo.decimals ?? 0)
  };
}

export interface HolderConcentration {
  topHolderPercent: number;
  top10Percent: number;
  holderCount: number;
}

/**
 * Reads REAL top token-holder distribution via getTokenLargestAccounts.
 * Note: this RPC method only returns the top 20 accounts, which is
 * standard practice for this kind of check but is not the complete
 * holder set for tokens with many thousands of holders.
 */
export async function getHolderConcentration(
  connection: Connection,
  mintAddress: string
): Promise<HolderConcentration | null> {
  const pubkey = new PublicKey(mintAddress);
  const largest = await connection.getTokenLargestAccounts(pubkey);
  const supplyInfo = await connection.getTokenSupply(pubkey);

  const totalSupply = Number(supplyInfo.value.uiAmount ?? 0);
  if (totalSupply === 0 || largest.value.length === 0) return null;

  const amounts = largest.value.map((a) => Number(a.uiAmount ?? 0));
  const top1 = amounts[0] ?? 0;
  const top10Sum = amounts.slice(0, 10).reduce((sum, v) => sum + v, 0);

  return {
    topHolderPercent: (top1 / totalSupply) * 100,
    top10Percent: (top10Sum / totalSupply) * 100,
    holderCount: largest.value.length
  };
}
