"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { ConfirmedSignatureInfo } from "@solana/web3.js";

type Tab = "positions" | "trades" | "transactions" | "wallet";

export function BottomPanel() {
  const [tab, setTab] = useState<Tab>("transactions");
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [signatures, setSignatures] = useState<ConfirmedSignatureInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey || (tab !== "transactions" && tab !== "wallet")) return;
    let cancelled = false;
    setLoading(true);
    connection
      .getSignaturesForAddress(publicKey, { limit: 25 })
      .then((sigs) => {
        if (!cancelled) setSignatures(sigs);
      })
      .catch(() => {
        if (!cancelled) setSignatures([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey, connection, tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "positions", label: "OPEN POSITIONS" },
    { key: "trades", label: "TRADE HISTORY" },
    { key: "transactions", label: "TRANSACTION HISTORY" },
    { key: "wallet", label: "WALLET HISTORY" }
  ];

  return (
    <div className="h-56 border-t border-border bg-panel flex flex-col">
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs mono ${tab === t.key ? "text-white border-b-2 border-blue" : "text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {!publicKey && <div className="text-xs text-muted mono">Connect a wallet to view this data.</div>}

        {publicKey && tab === "positions" && (
          <div className="text-xs text-muted mono">
            Open-position tracking requires indexing your fills against live prices over time —
            this session view only has data for trades you make on this page (see Trade History).
          </div>
        )}

        {publicKey && tab === "trades" && (
          <div className="text-xs text-muted mono">Swap fills executed in this session appear in the Buy/Sell panel&apos;s Recent Trades list.</div>
        )}

        {publicKey && (tab === "transactions" || tab === "wallet") && (
          <>
            {loading && <div className="text-xs text-muted mono">Loading…</div>}
            {!loading && signatures.length === 0 && (
              <div className="text-xs text-muted mono">No recent on-chain activity found.</div>
            )}
            <table className="w-full text-xs mono">
              <tbody>
                {signatures.map((s) => (
                  <tr key={s.signature} className="border-b border-border/50">
                    <td className="py-1 pr-3">
                      <a
                        href={`https://solscan.io/tx/${s.signature}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue hover:underline"
                      >
                        {s.signature.slice(0, 10)}…
                      </a>
                    </td>
                    <td className="py-1 pr-3 text-muted">
                      {s.blockTime ? new Date(s.blockTime * 1000).toLocaleString() : "—"}
                    </td>
                    <td className={`py-1 ${s.err ? "text-red" : "text-green"}`}>
                      {s.err ? "FAILED" : "SUCCESS"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
