"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import bs58 from "bs58";
import { PLATFORM_CONFIG } from "@/lib/config";
import { buildAdminLoginMessage, isAuthorizedAdmin } from "@/lib/admin-auth";

interface FeeStats {
  feeWalletBalanceSol: number;
  totalIncomingLamports24h: number;
  totalIncomingLamports7d: number;
  totalIncomingLamports30d: number;
  txCount: number;
}

export default function AdminPage() {
  const { connection } = useConnection();
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [stats, setStats] = useState<FeeStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const isAdminWallet = publicKey?.toBase58() === PLATFORM_CONFIG.adminWalletAddress;

  const handleVerify = useCallback(async () => {
    if (!publicKey || !signMessage) return;
    setAuthorizing(true);
    setAuthError(null);
    try {
      const message = buildAdminLoginMessage(Date.now());
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signatureBytes);

      if (isAuthorizedAdmin(publicKey.toBase58(), message, signatureBase58)) {
        setAuthorized(true);
      } else {
        setAuthError("Signature did not verify against the admin wallet.");
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Signature request was rejected.");
    } finally {
      setAuthorizing(false);
    }
  }, [publicKey, signMessage]);

  useEffect(() => {
    if (!authorized) return;
    let cancelled = false;
    setLoadingStats(true);

    const load = async () => {
      const feeWallet = new PublicKey(PLATFORM_CONFIG.feeWalletAddress);
      const balanceLamports = await connection.getBalance(feeWallet);

      const sigs = await connection.getSignaturesForAddress(feeWallet, { limit: 200 });
      const now = Date.now() / 1000;
      const day = 86400;

      let sum24 = 0;
      let sum7 = 0;
      let sum30 = 0;

      // Pull parsed tx details in small batches to sum real inbound
      // lamports to the fee wallet. This reads genuine on-chain
      // history — there is no synthetic "fees collected" counter.
      const batchSize = 20;
      for (let i = 0; i < sigs.length; i += batchSize) {
        if (cancelled) return;
        const batch = sigs.slice(i, i + batchSize);
        const parsedTxs: (ParsedTransactionWithMeta | null)[] = await connection.getParsedTransactions(
          batch.map((s) => s.signature),
          { maxSupportedTransactionVersion: 0 }
        );

        parsedTxs.forEach((tx, idx) => {
          if (!tx || !tx.meta || tx.meta.err) return;
          const blockTime = batch[idx].blockTime ?? 0;
          const accountKeys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
          const feeWalletIndex = accountKeys.indexOf(PLATFORM_CONFIG.feeWalletAddress);
          if (feeWalletIndex === -1) return;

          const pre = tx.meta.preBalances[feeWalletIndex] ?? 0;
          const post = tx.meta.postBalances[feeWalletIndex] ?? 0;
          const delta = post - pre;
          if (delta <= 0) return;

          const age = now - blockTime;
          if (age <= day) sum24 += delta;
          if (age <= day * 7) sum7 += delta;
          if (age <= day * 30) sum30 += delta;
        });
      }

      if (cancelled) return;
      setStats({
        feeWalletBalanceSol: balanceLamports / LAMPORTS_PER_SOL,
        totalIncomingLamports24h: sum24,
        totalIncomingLamports7d: sum7,
        totalIncomingLamports30d: sum30,
        txCount: sigs.length
      });
      setLoadingStats(false);
    };

    load().catch(() => {
      if (!cancelled) setLoadingStats(false);
    });

    return () => {
      cancelled = true;
    };
  }, [authorized, connection]);

  if (!connected) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="border border-border p-6 flex flex-col items-center gap-3">
          <span className="mono text-sm text-muted">Admin access requires a wallet connection.</span>
          <button
            onClick={() => setVisible(true)}
            className="px-4 py-2 bg-white text-black mono text-xs hover:bg-blue hover:text-white"
          >
            CONNECT WALLET
          </button>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="border border-border p-6 flex flex-col items-center gap-3 max-w-sm text-center">
          <span className="mono text-sm">STMC ADMIN</span>
          <p className="text-xs text-muted">
            Sign a message with the admin wallet to prove ownership. This never requests a
            seed phrase or private key — only your wallet&apos;s standard message-signing flow.
          </p>
          {!isAdminWallet && (
            <p className="text-xs text-red">
              Connected wallet is not the configured admin wallet.
            </p>
          )}
          <button
            onClick={handleVerify}
            disabled={!isAdminWallet || authorizing}
            className="px-4 py-2 bg-blue text-white mono text-xs disabled:opacity-40"
          >
            {authorizing ? "SIGNING…" : "SIGN TO VERIFY"}
          </button>
          {authError && <p className="text-xs text-red">{authError}</p>}
        </div>
      </div>
    );
  }

  const lamportsToSol = (l: number) => (l / LAMPORTS_PER_SOL).toFixed(4);

  return (
    <div className="min-h-screen bg-black p-6 flex flex-col gap-4">
      <h1 className="mono text-lg">STMC ADMIN — FEE DASHBOARD</h1>
      {loadingStats && <div className="mono text-xs text-muted">Scanning fee wallet transaction history…</div>}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="FEE WALLET BALANCE" value={`${stats.feeWalletBalanceSol.toFixed(4)} SOL`} />
          <StatCard label="INCOMING (24H)" value={`${lamportsToSol(stats.totalIncomingLamports24h)} SOL`} />
          <StatCard label="INCOMING (7D)" value={`${lamportsToSol(stats.totalIncomingLamports7d)} SOL`} />
          <StatCard label="INCOMING (30D)" value={`${lamportsToSol(stats.totalIncomingLamports30d)} SOL`} />
          <StatCard label="TXS SCANNED" value={String(stats.txCount)} />
          <StatCard label="PLATFORM FEE RATE" value={`${(PLATFORM_CONFIG.defaultPlatformFeeBps / 100).toFixed(2)}%`} />
        </div>
      )}
      <p className="mono text-[11px] text-muted border-t border-border pt-3">
        Figures reflect the last 200 signatures on this RPC only (a public RPC caps history
        depth). For complete, long-term accounting, pair this page with an indexer or a
        dedicated RPC provider that retains full transaction history.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border p-3">
      <div className="mono text-[10px] text-muted">{label}</div>
      <div className="mono text-lg">{value}</div>
    </div>
  );
}
