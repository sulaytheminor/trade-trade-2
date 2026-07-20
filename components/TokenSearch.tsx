"use client";

import { useEffect, useRef, useState } from "react";
import { DexPair, searchTokens } from "@/lib/dexscreener";
import { useAppStore } from "@/store/useAppStore";

export function TokenSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DexPair[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setSelectedPair = useAppStore((s) => s.setSelectedPair);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const pairs = await searchTokens(query.trim());
        setResults(pairs.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search token name, symbol, or mint address..."
        className="w-full bg-panel border border-border px-3 py-2 text-sm mono placeholder:text-muted focus:outline-none focus:border-blue"
      />
      {open && (query.trim().length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-panel border border-border z-50 max-h-80 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-muted">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted">No live Solana pairs found.</div>
          )}
          {results.map((r) => (
            <button
              key={r.pairAddress}
              onMouseDown={() => {
                setSelectedPair(r);
                setQuery("");
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-border"
            >
              <span className="mono text-sm">
                {r.baseToken.symbol}
                <span className="text-muted">/{r.quoteToken.symbol}</span>
              </span>
              <span className="mono text-xs text-muted">
                {r.priceUsd ? `$${Number(r.priceUsd).toPrecision(6)}` : "—"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
