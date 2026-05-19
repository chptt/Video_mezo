/**
 * GET /api/campaign/[campaignId]/access?wallet=0x...
 * Checks whether a wallet has valid on-chain access to a campaign.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccess, formatTimeRemaining } from "@/lib/access";
import { validateEthAddress } from "@/lib/validation";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    const id = Number(campaignId);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const wallet = req.nextUrl.searchParams.get("wallet") ?? "";
    const addrCheck = validateEthAddress(wallet);
    if (!addrCheck.valid) {
      return NextResponse.json({ error: addrCheck.error }, { status: 400 });
    }

    const result = await verifyAccess(id, wallet);

    return NextResponse.json({
      hasAccess:     result.hasAccess,
      expiresAt:     result.expiresAt,
      timeRemaining: result.hasAccess ? formatTimeRemaining(result.expiresAt) : null,
      reason:        result.reason ?? null,
    });
  } catch (err) {
    console.error("[campaign/access] Error:", err);
    return NextResponse.json({ error: "Access check failed" }, { status: 500 });
  }
}
