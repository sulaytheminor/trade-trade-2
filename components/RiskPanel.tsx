"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { DexPair } from "@/lib/dexscreener";
import { assessPairRisk, RiskAssessment, RISK_COLORS } from "@/lib/risk";
import { getMintAuthorityInfo, getHolderConcentration, MintAuthorityInfo, HolderConcentration } from "@/lib/onchain";

export function RiskPanel({ pair }: { pair: DexPair | null }) {
  const { connection } = useConnection();
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [mintInfo, setMintInfo] = useState<MintAuthorityInfo | null>(null);
  const [holders, setHolders] = useState<HolderConcentration | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pair) {
      setAssessment(null);
      setMintInfo(null);
      setHolders(null);
      return;
    }
    setAssessment(assessPairRisk(pair));

    let cancelled = false;
    setLoading(true);
    Promise.all([
      getMintAuthorityInfo(connection, pair.baseToken.address).catch(() => null),
      getHolderConcentration(connection, pair.baseToken.address).catch(() => null)
    ]).then(([mint, hold]) => {
      if (cancelled) return;
      setMintInfo(mint);
      setHolders(hold);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pair, connection]);

  if (!pair) return null;
  if (!assessment) return null;

  // Layer on-chain findings onto the base heuristic score, honestly
  // rather than double-counting silently.
  let adjustedScore = assessment.score;
  const extraWarnings = [...assessment.warnings];
  if (mintInfo?.mintAuthority) {
    extraWarnings.push({ message: "Mint authority is still active — supply can be increased.", weight: 20 });
    adjustedScore = Math.min(100, adjustedScore + 20);
  }
  if (mintInfo?.freezeAuthority) {
    extraWarnings.push({ message: "Freeze authority is still active — token accounts can be frozen.", weight: 15 });
    adjustedScore = Math.min(100, adjustedScore + 15);
  }
  if (holders && holders.top10Percent > 50) {
    extraWarnings.push({
      message: `Top 10 wallets own ${holders.top10Percent.toFixed(0)}% of supply.`,
      weight: 20
    });
    adjustedScore = Math.min(100, adjustedScore + 20);
  }
  const level = adjustedScore >= 60 ? "HIGH" : adjustedScore >= 30 ? "MEDIUM" : "LOW";

  return (
    <div className="border border-border bg-panel p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="mono text-xs text-muted">AI RISK ANALYSIS</span>
        <span className={`mono text-xs font-semibold ${RISK_COLORS[level]}`}>
          {level} RISK — {adjustedScore}/100
        </span>
      </div>
      {loading && <div className="text-xs text-muted mono">Checking on-chain mint/holder data…</div>}
      <ul className="flex flex-col gap-1">
        {extraWarnings.map((w, i) => (
          <li key={i} className="text-xs text-muted mono">
            • {w.message}
          </li>
        ))}
        {extraWarnings.length === 0 && (
          <li className="text-xs text-muted mono">No elevated risk signals detected in available data.</li>
        )}
      </ul>
      <p className="text-[10px] text-muted italic border-t border-border pt-2">{assessment.disclaimer}</p>
    </div>
  );
}
