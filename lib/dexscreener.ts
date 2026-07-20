import { PLATFORM_CONFIG } from "./config";

export interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  priceNative: string;
  txns?: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  volume?: { h24?: number; h1?: number; m5?: number };
  priceChange?: { h24?: number; h1?: number; m5?: number };
  liquidity?: { usd?: number; base?: number; quote?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string }[];
    socials?: { platform: string; handle: string }[];
  };
}

interface DexScreenerResponse {
  schemaVersion: string;
  pairs: DexPair[] | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`DexScreener request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Search for real tokens/pairs by name, symbol, or address. */
export async function searchTokens(query: string): Promise<DexPair[]> {
  const data = await fetchJson<DexScreenerResponse>(
    `${PLATFORM_CONFIG.dexscreener.searchApi}?q=${encodeURIComponent(query)}`
  );
  const pairs = data.pairs ?? [];
  return pairs.filter((p) => p.chainId === "solana");
}

/** Get all live pairs for a specific token mint address. */
export async function getPairsForToken(mintAddress: string): Promise<DexPair[]> {
  const data = await fetchJson<DexScreenerResponse>(
    `${PLATFORM_CONFIG.dexscreener.tokenApi}/${mintAddress}`
  );
  const pairs = data.pairs ?? [];
  return pairs.filter((p) => p.chainId === "solana");
}

/** Get a single pair's live data by pair address. */
export async function getPair(pairAddress: string): Promise<DexPair | null> {
  const data = await fetchJson<DexScreenerResponse>(
    `${PLATFORM_CONFIG.dexscreener.pairsApi}/${pairAddress}`
  );
  return data.pairs?.[0] ?? null;
}

/** Pick the highest-liquidity pair as the "primary" market for a token. */
export function primaryPair(pairs: DexPair[]): DexPair | null {
  if (pairs.length === 0) return null;
  return [...pairs].sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
  )[0];
}
