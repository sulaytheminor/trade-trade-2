import { DexPair } from "./dexscreener";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskWarning {
  message: string;
  weight: number;
}

export interface RiskAssessment {
  score: number; // 0-100, higher = riskier
  level: RiskLevel;
  warnings: RiskWarning[];
  disclaimer: string;
}

const DISCLAIMER =
  "This is an automated, informational estimate based on public market data. " +
  "It is not financial advice, it does not guarantee any token is safe, and it " +
  "cannot detect every scam pattern. Always do your own research.";

/**
 * Deterministic, explainable heuristic scoring over real market data
 * (liquidity, age, volume, price swings). This is NOT a machine-learning
 * model and does not have access to on-chain holder distribution, mint/
 * freeze authority, or contract bytecode from DexScreener data alone —
 * those checks require an RPC/Birdeye holder-data call and should be
 * layered on top of this function using getMintAndFreezeAuthority()
 * and a holder-concentration lookup before this score is treated as
 * complete.
 */
export function assessPairRisk(pair: DexPair): RiskAssessment {
  const warnings: RiskWarning[] = [];
  let score = 0;

  const liquidityUsd = pair.liquidity?.usd ?? 0;
  if (liquidityUsd < 1000) {
    warnings.push({ message: "Liquidity is under $1,000 — extremely thin.", weight: 30 });
    score += 30;
  } else if (liquidityUsd < 10000) {
    warnings.push({ message: "Liquidity is under $10,000 — thin, expect high price impact.", weight: 18 });
    score += 18;
  } else if (liquidityUsd < 50000) {
    warnings.push({ message: "Liquidity is under $50,000.", weight: 8 });
    score += 8;
  }

  const ageMs = pair.pairCreatedAt ? Date.now() - pair.pairCreatedAt : null;
  if (ageMs !== null) {
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 6) {
      warnings.push({ message: `Pair was created ${Math.max(1, Math.round(ageHours))}h ago — very new.`, weight: 22 });
      score += 22;
    } else if (ageHours < 24) {
      warnings.push({ message: "Pair is less than 24 hours old.", weight: 12 });
      score += 12;
    } else if (ageHours < 168) {
      warnings.push({ message: "Pair is less than a week old.", weight: 5 });
      score += 5;
    }
  } else {
    warnings.push({ message: "Pair creation time unavailable.", weight: 4 });
    score += 4;
  }

  const vol24 = pair.volume?.h24 ?? 0;
  if (liquidityUsd > 0) {
    const turnover = vol24 / liquidityUsd;
    if (turnover > 20) {
      warnings.push({ message: "24h volume is over 20x current liquidity — unusually high turnover.", weight: 15 });
      score += 15;
    }
  }
  if (vol24 < 500) {
    warnings.push({ message: "24h trading volume is under $500 — very low activity.", weight: 10 });
    score += 10;
  }

  const change1h = pair.priceChange?.h1 ?? 0;
  if (Math.abs(change1h) > 40) {
    warnings.push({ message: `Price moved ${change1h.toFixed(1)}% in the last hour.`, weight: 15 });
    score += 15;
  }

  const txns1h = pair.txns?.h1;
  if (txns1h) {
    const total = txns1h.buys + txns1h.sells;
    if (total > 0) {
      const sellRatio = txns1h.sells / total;
      if (sellRatio > 0.85) {
        warnings.push({ message: "Over 85% of recent transactions are sells.", weight: 12 });
        score += 12;
      }
    }
  }

  score = Math.min(100, score);
  const level: RiskLevel = score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

  return { score, level, warnings, disclaimer: DISCLAIMER };
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: "text-green",
  MEDIUM: "text-orange",
  HIGH: "text-red"
};
