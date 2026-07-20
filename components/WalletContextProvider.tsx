"use client";

import { ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { useAppStore } from "@/store/useAppStore";
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletContextProviderProps {
  children: ReactNode;
}

export function WalletContextProvider({ children }: WalletContextProviderProps) {
  const rpcEndpoint = useAppStore((s) => s.settings.rpcEndpoint);

  // Only official, audited wallet-adapter packages. Phantom and
  // Solflare are registered explicitly; Backpack and any other
  // Wallet Standard-compliant extension (which Backpack is)
  // auto-register themselves and appear in the modal without
  // needing an explicit adapter here. No custom connection logic,
  // no auto-approve toggle implemented here — any "auto approve"
  // behavior is entirely up to the wallet extension itself (e.g.
  // Phantom's own trusted-app setting).
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={rpcEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
