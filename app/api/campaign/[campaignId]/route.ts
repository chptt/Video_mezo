/**
 * GET /api/campaign/[campaignId]
 * Returns public campaign data (no encrypted fields exposed).
 */

import { NextRequest, NextResponse } from "next/server";
import { getFullCampaign } from "@/lib/campaignRegistry";
import { getEthUsdPrice } from "@/lib/pricing";
import { REVENUE_CAP_USD } from "@/lib/constants";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    const id = Number(campaignId);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const [campaign, ethUsdPrice] = await Promise.all([
      getFullCampaign(id),
      getEthUsdPrice(),
    ]);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const revenueCapWeiVal = BigInt(Math.floor((REVENUE_CAP_USD / ethUsdPrice) * 1e18));

    // Return only public fields — never expose encrypted video URL
    return NextResponse.json({
      id:              Number(campaign.onChain.id),
      title:           campaign.metadata.title,
      description:     campaign.metadata.description,
      creator:         campaign.onChain.creator,
      priceWei:        campaign.onChain.priceWei.toString(),
      durationSeconds: Number(campaign.onChain.durationSeconds),
      totalRevenueWei: campaign.onChain.totalRevenueWei.toString(),
      revenueCapWei:   revenueCapWeiVal.toString(),
      active:          campaign.onChain.active,
      soldOut:         campaign.onChain.soldOut,
      createdAt:       campaign.metadata.createdAt,
      ethUsdPrice,
    });
  } catch (err) {
    console.error("[campaign/get] Error:", err);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}
