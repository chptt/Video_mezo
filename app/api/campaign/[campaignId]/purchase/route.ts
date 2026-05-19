/**
 * POST /api/campaign/[campaignId]/purchase
 * Verifies a completed purchase transaction on-chain.
 * Used to confirm the tx before granting access in the UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/arbitrum";
import { getFullCampaign } from "@/lib/campaignRegistry";
import { validateEthAddress, validateTxHash } from "@/lib/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    const id = Number(campaignId);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const { txHash, buyerAddress } = await req.json();

    // Validate inputs
    const txCheck   = validateTxHash(txHash);
    const addrCheck = validateEthAddress(buyerAddress);
    if (!txCheck.valid)   return NextResponse.json({ error: txCheck.error },   { status: 400 });
    if (!addrCheck.valid) return NextResponse.json({ error: addrCheck.error }, { status: 400 });

    // Fetch campaign to get expected price
    const campaign = await getFullCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify the transaction on-chain
    const verification = await verifyTransaction(
      txHash,
      buyerAddress,
      campaign.onChain.priceWei
    );

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error ?? "Transaction verification failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({ verified: true, txHash });
  } catch (err) {
    console.error("[campaign/purchase] Error:", err);
    return NextResponse.json({ error: "Purchase verification failed" }, { status: 500 });
  }
}
