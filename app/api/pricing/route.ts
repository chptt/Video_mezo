/**
 * GET /api/pricing
 * Returns current ETH/USD price and revenue cap in wei.
 */

import { NextResponse } from "next/server";
import { getEthUsdPrice, revenueCapWei } from "@/lib/pricing";

export async function GET() {
  try {
    const ethUsdPrice = await getEthUsdPrice();
    const capWei      = revenueCapWei(ethUsdPrice);

    return NextResponse.json({
      ethUsdPrice,
      revenueCapWei: capWei.toString(),
      revenueCapUsd: Number(process.env.REVENUE_CAP_USD) || 20,
      platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE) || 10,
    });
  } catch (err) {
    console.error("[pricing] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch pricing data" },
      { status: 500 }
    );
  }
}
