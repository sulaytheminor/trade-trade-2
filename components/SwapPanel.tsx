"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { DexPair } from "@/lib/dexscreener";
import { getQuote, buildSwapTransaction, JupiterQuoteResponse } from "@/lib/jupiter";
import { PLATFORM_CONFIG } from "@/lib/config";
import { useAppStore } from "@/store/useAppStore";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const SOL_DECIMALS = 9;

type Side = "BUY" | "SELL";
type OrderType = "MARKET" | "LIMIT";

interface RecentTrade {
  signature: string;
  side: Side;
  amountIn: string;
  amountOut: string;
  timestamp: number;
}

export function SwapPanel({ pair }: { pair: DexPair | null }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const settings = useAppStore((s) => s.settings);

  const [side, setSide] = useState<Side>("BUY");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);

  const baseMint = pair?.baseToken.address ?? null;
  const inputMint = side === "BUY" ? SOL_MINT : baseMint;
  const outputMint = side === "BUY" ? baseMint : SOL_MINT;

  useEffect(() => {
    if (!publicKey) {
      setSolBalance(null);
      return;
    }
    let cancelled = false;
    connection.getBalance(publicKey).then((lamports) => {
      if (!cancelled) setSolBalance(lamports / LAMPORTS_PER_SOL);
    });
    return () => {
      cancelled = true;
    };
  }, [publicKey, connection, recentTrades]);

  useEffect(() => {
    setQuote(null);
    if (!pair || !inputMint || !outputMint || !amount || Number(amount) <= 0) return;
    if (orderType === "LIMIT") return; // limit orders don't get a live-execution quote

    let cancelled = false;
    setQuoting(true);
    const decimals = side === "BUY" ? SOL_DECIMALS : 6; // real decimals fetched below when available
    const amountRaw = String(Math.floor(Number(amount) * 10 ** decimals));

    const t = setTimeout(async () => {
      try {
        const q = await getQuote({
          inputMint,
          outputMint,
          amount: amountRaw,
          slippageBps: settings.defaultSlippageBps,
          platformFeeBps: PLATFORM_CONFIG.defaultPlatformFeeBps
        });
        if (!cancelled) setQuote(q);
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pair, inputMint, outputMint, amount, orderType, settings.defaultSlippageBps, side]);

  async function handleSubmit() {
    if (orderType === "LIMIT") {
      setStatus(
        "Limit orders require a resting-order/keeper backend to execute once the trigger price is hit — this build only wires up live market swaps end-to-end. Wire a limit-order service before enabling this in production."
      );
      return;
    }
    if (!connected || !publicKey || !signTransaction) {
      setStatus("Connect a wallet first.");
      return;
    }
    if (!quote) {
      setStatus("No quote available yet.");
      return;
    }

    setSubmitting(true);
    setStatus("Building transaction…");
    try {
      const swap = await buildSwapTransaction({
        quote,
        userPublicKey: publicKey.toBase58()
        // feeAccount intentionally omitted here: it must be a real
        // token account owned by PLATFORM_CONFIG.feeWalletAddress
        // for this specific output mint, created once via Jupiter's
        // Referral Dashboard. Wire that mapping in before relying on
        // fee collection in production — see lib/jupiter.ts.
      });

      const txBuf = Buffer.from(swap.swapTransaction, "base64");
      const tx = VersionedTransaction.deserialize(txBuf);

      setStatus("Waiting for wallet approval…");
      const signedTx = await signTransaction(tx);

      setStatus("Submitting…");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3
      });

      setStatus(`Confirming ${signature.slice(0, 8)}…`);
      await connection.confirmTransaction(
        { signature, blockhash: tx.message.recentBlockhash, lastValidBlockHeight: swap.lastValidBlockHeight },
        "confirmed"
      );

      setStatus(`Confirmed: ${signature}`);
      setRecentTrades((prev) => [
        {
          signature,
          side,
          amountIn: quote.inAmount,
          amountOut: quote.outAmount,
          timestamp: Date.now()
        },
        ...prev
      ].slice(0, 20));
      setAmount("");
      setQuote(null);
    } catch (err) {
      setStatus(err instanceof Error ? `Failed: ${err.message}` : "Transaction failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const priceImpact = quote ? Number(quote.priceImpactPct) * 100 : null;
  const estimatedOutput = quote ? quote.outAmount : null;

  return (
    <div className="w-80 border-l border-border bg-panel flex flex-col overflow-y-auto">
      <div className="grid grid-cols-2 border-b border-border">
        <button
          onClick={() => setSide("BUY")}
          className={`py-2 mono text-sm ${side === "BUY" ? "bg-blue text-white" : "text-muted hover:text-white"}`}
        >
          BUY
        </button>
        <button
          onClick={() => setSide("SELL")}
          className={`py-2 mono text-sm ${side === "SELL" ? "bg-red text-white" : "text-muted hover:text-white"}`}
        >
          SELL
        </button>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setOrderType("MARKET")}
          className={`flex-1 py-1.5 text-xs mono ${orderType === "MARKET" ? "text-white border-b-2 border-blue" : "text-muted"}`}
        >
          MARKET
        </button>
        <button
          onClick={() => setOrderType("LIMIT")}
          className={`flex-1 py-1.5 text-xs mono ${orderType === "LIMIT" ? "text-white border-b-2 border-blue" : "text-muted"}`}
        >
          LIMIT
        </button>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {!pair && <div className="text-xs text-muted">Select a token to trade.</div>}

        <div>
          <label className="text-xs text-muted mono">AMOUNT ({side === "BUY" ? "SOL" : pair?.baseToken.symbol ?? "TOKEN"})</label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full mt-1 bg-black border border-border px-2 py-2 mono text-sm focus:outline-none focus:border-blue"
          />
        </div>

        {orderType === "LIMIT" && (
          <div>
            <label className="text-xs text-muted mono">LIMIT PRICE (USD)</label>
            <input
              type="number"
              min="0"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="0.00"
              className="w-full mt-1 bg-black border border-border px-2 py-2 mono text-sm focus:outline-none focus:border-blue"
            />
          </div>
        )}

        <div className="flex flex-col gap-1 text-xs mono border border-border p-2">
          <Row label="SLIPPAGE" value={`${(settings.defaultSlippageBps / 100).toFixed(2)}%`} />
          <Row
            label="EST. OUTPUT"
            value={quoting ? "…" : estimatedOutput ? estimatedOutput : "—"}
          />
          <Row
            label="PRICE IMPACT"
            value={priceImpact !== null ? `${priceImpact.toFixed(3)}%` : "—"}
            valueClass={priceImpact !== null && priceImpact > 5 ? "text-red" : ""}
          />
          <Row label="PLATFORM FEE" value={`${(PLATFORM_CONFIG.defaultPlatformFeeBps / 100).toFixed(2)}%`} />
          <Row label="WALLET BALANCE" value={solBalance !== null ? `${solBalance.toFixed(4)} SOL` : "—"} />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !pair}
          className={`w-full py-2.5 mono text-sm font-semibold disabled:opacity-40 ${
            side === "BUY" ? "bg-blue hover:bg-blue-dim" : "bg-red hover:bg-red-dim"
          }`}
        >
          {submitting ? "PROCESSING…" : `${side} ${pair?.baseToken.symbol ?? ""}`}
        </button>

        {status && <div className="text-xs mono text-muted break-all">{status}</div>}
      </div>

      <div className="border-t border-border p-3">
        <div className="text-xs mono text-muted mb-2">RECENT TRADES</div>
        {recentTrades.length === 0 && <div className="text-xs text-muted">No trades yet this session.</div>}
        {recentTrades.map((t) => (
          <div key={t.signature} className="flex justify-between text-xs mono py-1 border-b border-border/50">
            <span className={t.side === "BUY" ? "text-blue" : "text-red"}>{t.side}</span>
            <a
              href={`https://solscan.io/tx/${t.signature}`}
              target="_blank"
              rel="noreferrer"
              className="text-muted hover:text-white"
            >
              {t.signature.slice(0, 6)}…
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
