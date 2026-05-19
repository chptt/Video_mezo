/**
 * GET /api/campaign/list?page=1&limit=12
 * Returns active campaigns with metadata from IPFS.
 */

import { NextRequest, NextResponse } from "next/server";
import { getActiveCampaigns } from "@/lib/campaignRegistry";
import { getEthUsdPrice } from "@/lib/pricing";
import { REVENUE_CAP_USD } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, Number(searchParams.get("page"))  || 1);
    const limit = Math.min(24, Number(searchParams.get("limit")) || 12);

    const [{ campaigns, total }, ethUsdPrice] = await Promise.all([
      getActiveCampaigns(page, limit),
      getEthUsdPrice(),
    ]);

    const revenueCapWeiVal = BigInt(Math.floor((REVENUE_CAP_USD / ethUsdPrice) * 1e18));

    const serialized = campaigns.map(({ onChain, metadata }) => ({
      id:              Number(onChain.id),
      title:           metadata.title,
      description:     metadata.description,
      creator:         onChain.creator,
      priceWei:        onChain.priceWei.toString(),
      durationSeconds: Number(onChain.durationSeconds),
      totalRevenueWei: onChain.totalRevenueWei.toString(),
      revenueCapWei:   revenueCapWeiVal.toString(),
      active:          onChain.active,
      soldOut:         onChain.soldOut,
      ethUsdPrice,
    }));

    return NextResponse.json({ campaigns: serialized, total, page, limit });
  } catch (err) {
    console.error("[campaign/list] Error:", err);
    return NextResponse.json({ error: "Failed to list campaigns" }, { status: 500 });
  }
}
