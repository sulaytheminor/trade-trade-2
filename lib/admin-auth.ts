import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { PLATFORM_CONFIG } from "./config";

export const ADMIN_AUTH_MESSAGE_PREFIX = "STMC Trading admin login\nTimestamp: ";

/** Builds the exact message the connected wallet must sign. */
export function buildAdminLoginMessage(timestamp: number): string {
  return `${ADMIN_AUTH_MESSAGE_PREFIX}${timestamp}`;
}

/**
 * Verifies that `signature` is a real ed25519 signature over
 * `message`, produced by the private key matching `publicKey`.
 * This never sees or requests a private key or seed phrase — it
 * only checks a signature the wallet already produced via its own
 * official signMessage() flow.
 */
export function verifySignature(
  message: string,
  signatureBase58: string,
  publicKeyBase58: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signatureBase58);
    const publicKeyBytes = new PublicKey(publicKeyBase58).toBytes();
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

/** Only the configured admin wallet passes, and only within a 5-minute signed window. */
export function isAuthorizedAdmin(
  publicKeyBase58: string,
  message: string,
  signatureBase58: string
): boolean {
  if (publicKeyBase58 !== PLATFORM_CONFIG.adminWalletAddress) return false;

  const match = message.match(/Timestamp: (\d+)$/);
  if (!match) return false;
  const timestamp = Number(match[1]);
  const ageMs = Date.now() - timestamp;
  if (ageMs < 0 || ageMs > 5 * 60 * 1000) return false;

  return verifySignature(message, signatureBase58, publicKeyBase58);
}
