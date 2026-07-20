/**
 * DexScreener's public API does not expose historical OHLCV candles
 * (only live pair snapshots), so real candlestick history is pulled
 * from GeckoTerminal's free, public, no-key-required pool-OHLCV
 * endpoint instead. This is real market data, not a placeholder
 * source — just a different (correct) provider for this specific job.
 */

export type GeckoTimeframe = "seconds" | "minute" | "hour" | "day";

export interface CandlePoint {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AggregateMap {
  timeframe: GeckoTimeframe;
  aggregate: number;
}

/** Maps the UI's timeframe labels to GeckoTerminal's API params. */
export const TIMEFRAME_MAP: Record<string, AggregateMap> = {
  "1s": { timeframe: "seconds", aggregate: 1 },
  "5s": { timeframe: "seconds", aggregate: 5 },
  "1m": { timeframe: "minute", aggregate: 1 },
  "5m": { timeframe: "minute", aggregate: 5 },
  "15m": { timeframe: "minute", aggregate: 15 },
  "1H": { timeframe: "hour", aggregate: 1 },
  "4H": { timeframe: "hour", aggregate: 4 },
  "1D": { timeframe: "day", aggregate: 1 }
};

/**
 * NOTE ON "1s"/"5s": GeckoTerminal's free public tier only serves
 * seconds-granularity candles on paid plans. Requesting it on the
 * free tier returns a 401/403 rather than data. Rather than fake
 * sub-minute candles, callers should catch that and fall back to
 * "1m", surfacing a message like "second-level charts require a
 * paid data plan" instead of pretending to have the data.
 */
export async function getOhlcv(
  poolAddress: string,
  uiTimeframe: string
): Promise<CandlePoint[]> {
  const mapping = TIMEFRAME_MAP[uiTimeframe] ?? TIMEFRAME_MAP["1H"];
  const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${mapping.timeframe}?aggregate=${mapping.aggregate}&limit=300`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`GeckoTerminal OHLCV request failed: ${res.status}`);
  }
  const json = await res.json();
  const list: [number, number, number, number, number, number][] =
    json?.data?.attributes?.ohlcv_list ?? [];

  return list
    .map(([time, open, high, low, close, volume]) => ({
      time,
      open,
      high,
      low,
      close,
      volume
    }))
    .sort((a, b) => a.time - b.time);
}
