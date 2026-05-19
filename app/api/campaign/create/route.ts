/**
 * POST /api/campaign/create
 * Validates creator eligibility and returns the IPFS CID for on-chain storage.
 * The actual on-chain createCampaign() call is made from the frontend.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkHasCampaign } from "@/lib/arbitrum";
import { validateEthAddress } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const { creatorAddress } = await req.json();

    const addrCheck = validateEthAddress(creatorAddress);
    if (!addrCheck.valid) {
      return NextResponse.json({ error: addrCheck.error }, { status: 400 });
    }

    // Check on-chain: does this address already have a campaign?
    const alreadyHas = await checkHasCampaign(creatorAddress);
    if (alreadyHas) {
      return NextResponse.json(
        { error: "You already own an active campaign. Only one campaign per wallet is allowed." },
        { status: 409 }
      );
    }

    return NextResponse.json({ eligible: true });
  } catch (err) {
    console.error("[campaign/create] Error:", err);
    return NextResponse.json({ error: "Eligibility check failed" }, { status: 500 });
  }
}
