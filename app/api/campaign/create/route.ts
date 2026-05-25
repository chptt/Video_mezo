/**
 * POST /api/campaign/create
 * Validates creator address and returns eligibility.
 * No one-campaign limit anymore!
 */

import { NextRequest, NextResponse } from "next/server";
import { validateEthAddress } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const { creatorAddress } = await req.json();

    const addrCheck = validateEthAddress(creatorAddress);
    if (!addrCheck.valid) {
      return NextResponse.json({ error: addrCheck.error }, { status: 400 });
    }

    return NextResponse.json({ eligible: true });
  } catch (err) {
    console.error("[campaign/create] Error:", err);
    return NextResponse.json({ error: "Eligibility check failed" }, { status: 500 });
  }
}
