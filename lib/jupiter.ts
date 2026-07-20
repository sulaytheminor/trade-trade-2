import { PLATFORM_CONFIG } from "./config";

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: unknown[];
  contextSlot?: number;
  timeTaken?: number;
}

export interface JupiterSwapResponse {
  swapTransaction: string; // base64-encoded versioned transaction
  lastValidBlockHeight: number;
}

interface GetQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string; // integer string, in the input token's smallest unit
  slippageBps: number;
  platformFeeBps?: number;
}

/**
 * Fetch a real swap quote from Jupiter. No mock data — this hits
 * Jupiter's public v6 quote endpoint directly.
 */
export async function getQuote(params: GetQuoteParams): Promise<JupiterQuoteResponse> {
  const url = new URL(PLATFORM_CONFIG.jupiter.quoteApi);
  url.searchParams.set("inputMint", params.inputMint);
  url.searchParams.set("outputMint", params.outputMint);
  url.searchParams.set("amount", params.amount);
  url.searchParams.set("slippageBps", String(params.slippageBps));
  if (params.platformFeeBps) {
    url.searchParams.set("platformFeeBps", String(params.platformFeeBps));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jupiter quote failed: ${res.status} ${body}`);
  }
  return res.json();
}

interface BuildSwapParams {
  quote: JupiterQuoteResponse;
  userPublicKey: string;
  /**
   * Token account (owned by PLATFORM_CONFIG.feeWalletAddress) that
   * receives the platform fee for the OUTPUT mint of this swap.
   *
   * IMPORTANT / REAL CONSTRAINT: Jupiter requires this account to
   * already exist for each mint you collect fees on — it is not
   * created automatically. Set it up once per mint via Jupiter's
   * Referral Dashboard (referral.jup.ag), then store the mapping
   * (mint -> fee token account) wherever this function is called
   * from. If no fee account is supplied for a given mint, this
   * function omits feeAccount and the swap executes fee-free
   * rather than silently failing.
   */
  feeAccount?: string;
  priorityFeeLamports?: number;
}

/**
 * Ask Jupiter to build the actual swap transaction for a given
 * quote. Returns a base64 transaction that must be deserialized,
 * signed by the connected wallet, and sent — this function does
 * NOT sign or submit anything itself.
 */
export async function buildSwapTransaction(
  params: BuildSwapParams
): Promise<JupiterSwapResponse> {
  const body: Record<string, unknown> = {
    quoteResponse: params.quote,
    userPublicKey: params.userPublicKey,
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: params.priorityFeeLamports ?? "auto"
  };

  if (params.feeAccount) {
    body.feeAccount = params.feeAccount;
  }

  const res = await fetch(PLATFORM_CONFIG.jupiter.swapApi, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Jupiter swap build failed: ${res.status} ${errBody}`);
  }

  return res.json();
}
