/**
 * lib/arbitrum.ts
 * Server-side ethers.js helpers for reading from Arbitrum Sepolia.
 */

import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS, RPC_URL } from "./constants";

/** Returns a read-only provider connected to Arbitrum Sepolia */
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL);
}

/** Returns a read-only contract instance */
export function getContract(
  provider?: ethers.JsonRpcProvider
): ethers.Contract {
  const p = provider ?? getProvider();
  if (!CONTRACT_ADDRESS) throw new Error("CONTRACT_ADDRESS not configured");
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p);
}

export interface OnChainCampaign {
  id: bigint;
  creator: string;
  metadataCID: string;
  priceWei: bigint;
  durationSeconds: bigint;
  totalRevenueWei: bigint;
  active: boolean;
  soldOut: boolean;
}

/** Fetch a single campaign from the contract */
export async function fetchCampaignOnChain(
  campaignId: number
): Promise<OnChainCampaign | null> {
  try {
    const contract = getContract();
    const c = await contract.getCampaign(campaignId);
    return {
      id:              c.id,
      creator:         c.creator,
      metadataCID:     c.metadataCID,
      priceWei:        c.priceWei,
      durationSeconds: c.durationSeconds,
      totalRevenueWei: c.totalRevenueWei,
      active:          c.active,
      soldOut:         c.soldOut,
    };
  } catch {
    return null;
  }
}

/** Check if a buyer has valid access to a campaign */
export async function checkAccessOnChain(
  campaignId: number,
  buyerAddress: string
): Promise<{ valid: boolean; expiresAt: number }> {
  try {
    const contract = getContract();
    const [valid, expiresAt] = await contract.hasAccess(campaignId, buyerAddress);
    return { valid, expiresAt: Number(expiresAt) };
  } catch {
    return { valid: false, expiresAt: 0 };
  }
}

/** Get total number of campaigns */
export async function getTotalCampaigns(): Promise<number> {
  try {
    const contract = getContract();
    const total = await contract.totalCampaigns();
    return Number(total);
  } catch {
    return 0;
  }
}

/** Check if an address already has a campaign */
export async function checkHasCampaign(address: string): Promise<boolean> {
  try {
    const contract = getContract();
    return await contract.hasCampaign(address);
  } catch {
    return false;
  }
}

/** Get campaign ID owned by a creator */
export async function getCreatorCampaignId(address: string): Promise<number> {
  try {
    const contract = getContract();
    const id = await contract.creatorCampaignId(address);
    return Number(id);
  } catch {
    return 0;
  }
}

/**
 * Verify a transaction on-chain:
 * - tx exists and is confirmed
 * - sender matches expected address
 * - value matches expected amount
 * - recipient is the contract
 */
export async function verifyTransaction(
  txHash: string,
  expectedSender: string,
  expectedValueWei: bigint
): Promise<{ valid: boolean; error?: string }> {
  try {
    const provider = getProvider();
    const tx = await provider.getTransaction(txHash);
    if (!tx) return { valid: false, error: "Transaction not found" };

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1)
      return { valid: false, error: "Transaction not confirmed or failed" };

    if (tx.from.toLowerCase() !== expectedSender.toLowerCase())
      return { valid: false, error: "Transaction sender mismatch" };

    if (tx.value < expectedValueWei)
      return { valid: false, error: "Transaction value insufficient" };

    return { valid: true };
  } catch (err) {
    return { valid: false, error: String(err) };
  }
}
