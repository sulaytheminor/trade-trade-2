"use client";

import { useEffect, useState } from "react";
import { DexPair, searchTokens } from "@/lib/dexscreener";
import { useAppStore } from "@/store/useAppStore";

type Tab = "watchlist" | "trending" | "new" | "gainers" | "losers";

// Seed queries against DexScreener's real search index. There is no
// single "trending Solana" endpoint on the free API, so trending/new/
// movers are derived from real search results across popular quote
// pairs, sorted client-side by the relevant real field.
const SEED_QUERY = "SOL";

export function LeftSidebar() {
  const [tab, setTab] = useState<Tab>("trending");
  const [pairs, setPairs] = useState<DexPair[]>([]);
  const [loading, setLoading] = useState(false);
  const watchlist = useAppStore((s) => s.watchlist);
  const setSelectedPair = useAppStore((s) => s.setSelectedPair);
  const toggleWatchlist = useAppStore((s) => s.toggleWatchlist);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchTokens(SEED_QUERY)
      .then((res) => {
        if (!cancelled) setPairs(res);
      })
      .catch(() => {
        if (!cancelled) setPairs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = (() => {
    switch (tab) {
      case "trending":
        return [...pairs].sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0));
      case "new":
        return [...pairs].sort((a, b) => (b.pairCreatedAt ?? 0) - (a.pairCreatedAt ?? 0));
      case "gainers":
        return [...pairs].sort(
          (a, b) => (b.priceChange?.h24 ?? -Infinity) - (a.priceChange?.h24 ?? -Infinity)
        );
      case "losers":
        return [...pairs].sort(
          (a, b) => (a.priceChange?.h24 ?? Infinity) - (b.priceChange?.h24 ?? Infinity)
        );
      case "watchlist":
        return pairs.filter((p) => watchlist.includes(p.pairAddress));
      default:
        return pairs;
    }
  })();

  const tabs: { key: Tab; label: string }[] = [
    { key: "watchlist", label: "WATCHLIST" },
    { key: "trending", label: "TRENDING" },
    { key: "new", label: "NEWEST" },
    { key: "gainers", label: "GAINERS" },
    { key: "losers", label: "LOSERS" }
  ];

  return (
    <aside className="w-72 border-r border-border bg-panel flex flex-col">
      <div className="grid grid-cols-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs mono text-left border-b border-border ${
              tab === t.key ? "bg-blue text-white" : "text-muted hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="px-3 py-2 text-xs text-muted">Loading…</div>}
        {!loading && sorted.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted">No results.</div>
        )}
        {sorted.map((p) => {
          const change = p.priceChange?.h24 ?? 0;
          return (
            <div
              key={p.pairAddress}
              className="flex items-center justify-between px-3 py-2 border-b border-border hover:bg-border/40 cursor-pointer"
              onClick={() => setSelectedPair(p)}
            >
              <div className="flex flex-col">
                <span className="mono text-sm">{p.baseToken.symbol}</span>
                <span className="mono text-[10px] text-muted">
                  ${p.priceUsd ? Number(p.priceUsd).toPrecision(4) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`mono text-xs ${change >= 0 ? "text-green" : "text-red"}`}>
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(1)}%
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWatchlist(p.pairAddress);
                  }}
                  className="mono text-xs text-muted hover:text-white"
                >
                  {watchlist.includes(p.pairAddress) ? "★" : "☆"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
