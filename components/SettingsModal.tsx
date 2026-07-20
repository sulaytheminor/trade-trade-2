"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { PLATFORM_CONFIG } from "@/lib/config";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [rpc, setRpc] = useState(settings.rpcEndpoint);
  const [autoRefresh, setAutoRefresh] = useState(settings.autoRefreshSeconds);
  const [slippage, setSlippage] = useState(settings.defaultSlippageBps / 100);
  const [priorityFee, setPriorityFee] = useState(settings.priorityFeeLamports);

  function save() {
    updateSettings({
      rpcEndpoint: rpc,
      autoRefreshSeconds: autoRefresh,
      defaultSlippageBps: Math.round(slippage * 100),
      priorityFeeLamports: priorityFee
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="w-96 bg-panel border border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="mono text-sm">SETTINGS</span>
          <button onClick={onClose} className="text-muted hover:text-white mono text-sm">
            ✕
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <Field label="RPC ENDPOINT">
            <input
              value={rpc}
              onChange={(e) => setRpc(e.target.value)}
              className="w-full bg-black border border-border px-2 py-1.5 mono text-xs focus:outline-none focus:border-blue"
            />
          </Field>

          <Field label="AUTO REFRESH (SECONDS)">
            <input
              type="number"
              min={2}
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(Number(e.target.value))}
              className="w-full bg-black border border-border px-2 py-1.5 mono text-xs focus:outline-none focus:border-blue"
            />
          </Field>

          <Field label="DEFAULT SLIPPAGE (%)">
            <input
              type="number"
              step="0.1"
              min={0}
              value={slippage}
              onChange={(e) => setSlippage(Number(e.target.value))}
              className="w-full bg-black border border-border px-2 py-1.5 mono text-xs focus:outline-none focus:border-blue"
            />
          </Field>

          <Field label="PRIORITY FEE (LAMPORTS)">
            <input
              type="number"
              min={0}
              value={priorityFee}
              onChange={(e) => setPriorityFee(Number(e.target.value))}
              className="w-full bg-black border border-border px-2 py-1.5 mono text-xs focus:outline-none focus:border-blue"
            />
          </Field>

          <div className="border border-border p-3">
            <div className="text-xs mono text-muted mb-1">AUTO APPROVE TRANSACTIONS</div>
            <p className="text-[11px] text-muted">
              STMC Trading never bypasses wallet confirmations and has no in-app auto-approve
              switch. If your connected wallet (e.g. Phantom) offers a trusted-app or
              auto-approve option of its own, manage it from inside that wallet extension —
              it is entirely under the wallet&apos;s control, not this site&apos;s.
            </p>
          </div>

          <div className="flex justify-between mono text-xs border-t border-border pt-3">
            <span className="text-muted">PLATFORM FEE</span>
            <span>{(PLATFORM_CONFIG.defaultPlatformFeeBps / 100).toFixed(2)}%</span>
          </div>

          <button onClick={save} className="w-full py-2 bg-white text-black mono text-sm hover:bg-blue hover:text-white">
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] mono text-muted">{label}</span>
      {children}
    </label>
  );
}
