/**
 * lib/campaignRegistry.ts
 *
 * In-memory + IPFS campaign registry.
 * Since this is a serverless deployment (Vercel), we cannot use local filesystem.
 * Campaign metadata is fetched from IPFS; on-chain data is the source of truth.
 *
 * For production scale, replace the in-memory cache with Redis or a DB.
 */

import { fetchCampaignOnChain, getTotalCampaigns, OnChainCampaign } from "./arbitrum";
import { fetchFromIPFS } from "./ipfs";

export interface CampaignMetadata {
  campaignId: string;
  title: string;
  description: string;
  encryptedVideoUrl: string;
  iv: string;
  authTag: string;
  creatorAddress: string;
  priceWei: string;
  durationSeconds: number;
  createdAt: string;
  revenueCapUsd: number;
  platformFeePercentage: number;
  status: "active" | "soldOut" | "inactive";
}

export interface FullCampaign {
  onChain: OnChainCampaign;
  metadata: CampaignMetadata;
}

/** Fetch full campaign data (on-chain + IPFS metadata) */
export async function getFullCampaign(
  campaignId: number
): Promise<FullCampaign | null> {
  const onChain = await fetchCampaignOnChain(campaignId);
  if (!onChain || onChain.id === 0n) return null;

  try {
    const metadata = await fetchFromIPFS<CampaignMetadata>(onChain.metadataCID);
    return { onChain, metadata };
  } catch {
    return null;
  }
}

/** Fetch all active campaigns (paginated) */
export async function getActiveCampaigns(
  page = 1,
  limit = 12
): Promise<{ campaigns: FullCampaign[]; total: number }> {
  const total = await getTotalCampaigns();
  const results: FullCampaign[] = [];

  // Fetch campaigns in reverse order (newest first)
  const ids: number[] = [];
  for (let i = total; i >= 1; i--) ids.push(i);

  // Fetch in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const fetched = await Promise.allSettled(
      batch.map((id) => getFullCampaign(id))
    );
    for (const result of fetched) {
      if (result.status === "fulfilled" && result.value) {
        const c = result.value;
        if (c.onChain.active && !c.onChain.soldOut) {
          results.push(c);
        }
      }
    }
    if (results.length >= page * limit) break;
  }

  const start = (page - 1) * limit;
  return {
    campaigns: results.slice(start, start + limit),
    total: results.length,
  };
}
