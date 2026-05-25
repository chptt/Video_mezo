/**
 * lib/access.ts
 * Access control logic — verifies wallet ownership and on-chain access expiry.
 *
 * Privacy-First Architecture Note:
 * This MVP simulates privacy-preserving access control using:
 *   - On-chain access expiry timestamps
 *   - Server-side verification before decryption
 *   - Wallet-gated decryption (only the buyer's address can request decryption)
 */

import { checkAccessOnChain } from "./mezo";

export interface AccessCheckResult {
  hasAccess: boolean;
  expiresAt: number;
  reason?: string;
}

/**
 * Verifies that a wallet address has valid, unexpired access to a campaign.
 * This is the gatekeeper before any decryption happens server-side.
 */
export async function verifyAccess(
  campaignId: number,
  walletAddress: string
): Promise<AccessCheckResult> {
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return { hasAccess: false, expiresAt: 0, reason: "Invalid wallet address" };
  }

  const { valid, expiresAt } = await checkAccessOnChain(campaignId, walletAddress);

  if (!valid) {
    return {
      hasAccess: false,
      expiresAt,
      reason: expiresAt > 0 ? "Access has expired" : "No access purchased",
    };
  }

  return { hasAccess: true, expiresAt };
}

/** Format seconds-until-expiry as human-readable string */
export function formatTimeRemaining(expiresAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = expiresAt - now;
  if (remaining <= 0) return "Expired";

  const days    = Math.floor(remaining / 86400);
  const hours   = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0)    return `${days}d ${hours}h remaining`;
  if (hours > 0)   return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}
