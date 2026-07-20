# STMC Trading

A Solana trading terminal: live token search/prices (DexScreener), real
candlestick charts (GeckoTerminal OHLCV), real swap execution (Jupiter v6),
wallet-native connect/disconnect (Phantom, Solflare, and any Wallet
Standard-compliant wallet like Backpack), a rule-based token risk panel
backed by real on-chain mint/holder data, and a wallet-signature-gated
admin fee dashboard.

## Before you point this at real user funds

This repo wires up real integrations end-to-end, but it has **not**
been security-audited, and a few things need your explicit setup before
they behave the way the spec describes:

1. **Platform fee collection.** Jupiter only routes a fee to
   `feeWalletAddress` (see `lib/config.ts`) if you've created a
   fee token account for each mint you collect on, via Jupiter's
   [Referral Dashboard](https://referral.jup.ag). Until you do that
   and wire the mint → fee-account mapping into `SwapPanel.tsx`'s
   call to `buildSwapTransaction`, swaps execute **without** a
   platform fee rather than silently failing.
2. **RPC endpoint.** The default is the public
   `api.mainnet-beta.solana.com` endpoint, which rate-limits hard
   under real usage. Use a paid RPC provider (Helius, Triton, QuickNode,
   etc.) in Settings before launch.
3. **Limit orders.** The UI has a Limit tab, but real limit-order
   execution needs a resting-order/keeper service watching prices and
   firing the swap when triggered — that backend isn't included here.
   The UI says so if you try to submit one.
4. **"Open Positions" / full trade history.** True position tracking
   needs an indexer correlating your fills against historical prices
   over time. This build shows session-only trade history and raw
   on-chain transaction history; add an indexer (or a service like
   Helius' enhanced transactions API) for real P&L tracking.
5. **Risk panel.** It's an explainable, rule-based scorer over real
   liquidity/age/volume/mint-authority/holder-concentration data —
   not a machine-learning model, and it cannot catch every scam
   pattern. Treat it as one input, not a safety guarantee, and say
   so to your users (the UI already does).
6. **Audit before launch.** Any code that moves real user funds
   should get an independent security review, not just a working
   demo, before you put it in front of real users.

## Setup

```bash
rm -f package-lock.json   # if you have an old one from before this fix
npm install
npm run build
npm run dev   # local dev
```

`react`, `react-dom`, `@types/react`, and `@types/react-dom` are pinned
to exact React 18 versions, and `package.json` has an `overrides` block
forcing every nested dependency (including the Solana wallet-adapter
packages) onto those same exact versions. This is what actually fixes
Netlify "type incompatibility" build errors in `WalletContextProvider.tsx`
— without it, npm can hoist a second, newer copy of `@types/react`
somewhere in the tree, and `ReactNode`/`children` types stop lining up
between that copy and the one Next.js is using, even though the
top-level `devDependencies` entry already says 18.x. If you had an old
`package-lock.json` committed, delete it and let npm regenerate one
from this `package.json` — a stale lockfile can keep the old,
mismatched resolution around even after `package.json` is fixed.

Deploy to Netlify with the included `netlify.toml`
(`@netlify/plugin-nextjs`). No environment variables are required for
the integrations used here — DexScreener, GeckoTerminal, and Jupiter's
v6 endpoints are all public. Add your own RPC provider URL as a
default in `lib/config.ts` if you don't want users to have to change
it in Settings.

## Admin dashboard

Visit `/admin`. Connect the wallet configured as `adminWalletAddress`
in `lib/config.ts`, and sign the login message when prompted — no
password exists anywhere in this app. Anyone connecting a different
wallet is refused access before any stats are fetched.
