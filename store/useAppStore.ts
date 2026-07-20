import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PLATFORM_CONFIG } from "@/lib/config";
import { DexPair } from "@/lib/dexscreener";

export interface AppSettings {
  rpcEndpoint: string;
  autoRefreshSeconds: number;
  defaultSlippageBps: number;
  priorityFeeLamports: number;
  autoApproveEnabled: boolean; // reflects wallet-native setting only, never bypasses it here
}

interface AppState {
  selectedPair: DexPair | null;
  watchlist: string[]; // pair addresses
  settings: AppSettings;
  setSelectedPair: (pair: DexPair | null) => void;
  toggleWatchlist: (pairAddress: string) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      selectedPair: null,
      watchlist: [],
      settings: {
        rpcEndpoint: PLATFORM_CONFIG.defaultRpcEndpoint,
        autoRefreshSeconds: 10,
        defaultSlippageBps: PLATFORM_CONFIG.defaultSlippageBps,
        priorityFeeLamports: 0,
        autoApproveEnabled: false
      },
      setSelectedPair: (pair) => set({ selectedPair: pair }),
      toggleWatchlist: (pairAddress) => {
        const current = get().watchlist;
        set({
          watchlist: current.includes(pairAddress)
            ? current.filter((a) => a !== pairAddress)
            : [...current, pairAddress]
        });
      },
      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } }))
    }),
    { name: "stmc-app-store" }
  )
);
