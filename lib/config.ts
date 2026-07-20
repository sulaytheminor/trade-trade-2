/**
 * Central platform configuration.
 * Change platform fee, fee wallet, admin wallet, and RPC endpoints here only.
 */

export const PLATFORM_CONFIG = {
  // Wallet that receives the platform fee cut of every swap.
  // Passed to Jupiter as the feeAccount owner (see lib/jupiter.ts).
  feeWalletAddress: "29rzSKdRC1aqNcCeyxc9PHbmPE6ru6qcQjjcMezhrEFF",

  // Wallet allowed to view the admin fee dashboard. Verified via
  // signature, never a password. See lib/admin-auth.ts.
  adminWalletAddress: "29rzSKdRC1aqNcCeyxc9PHbmPE6ru6qcQjjcMezhrEFF",

  // Platform fee in basis points. 50 bps = 0.50%.
  defaultPlatformFeeBps: 50,

  brand: {
    name: "STMC Trading",
    contactEmail: "stijnisclean@gmail.com"
  },

  // Public RPC default; users can override this in Settings.
  // A paid/private RPC is strongly recommended for real usage —
  // public endpoints rate-limit aggressively.
  defaultRpcEndpoint: "https://api.mainnet-beta.solana.com",

  defaultSlippageBps: 50, // 0.50%

  jupiter: {
    quoteApi: "https://quote-api.jup.ag/v6/quote",
    swapApi: "https://quote-api.jup.ag/v6/swap"
  },

  dexscreener: {
    tokenApi: "https://api.dexscreener.com/latest/dex/tokens",
    searchApi: "https://api.dexscreener.com/latest/dex/search",
    pairsApi: "https://api.dexscreener.com/latest/dex/pairs/solana"
  }
} as const;
