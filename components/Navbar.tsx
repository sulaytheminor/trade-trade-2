"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { TokenSearch } from "./TokenSearch";
import { SettingsModal } from "./SettingsModal";

export function Navbar() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <>
      <header className="w-full border-b border-border bg-black">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue" />
            <span className="mono font-semibold tracking-wider text-sm">STMC TRADING</span>
          </div>

          <div className="flex-1 max-w-xl mx-6">
            <TokenSearch />
          </div>

          <div className="flex items-center gap-2">
            {connected ? (
              <button
                onClick={() => disconnect()}
                className="px-3 py-2 text-xs mono border border-border hover:border-red hover:text-red"
              >
                {shortAddress} · DISCONNECT
              </button>
            ) : (
              <button
                onClick={() => setVisible(true)}
                className="px-3 py-2 text-xs mono bg-white text-black hover:bg-blue hover:text-white"
              >
                CONNECT WALLET
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-3 py-2 text-xs mono border border-border hover:border-white"
            >
              SETTINGS
            </button>
          </div>
        </div>
      </header>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
