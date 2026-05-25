/**
 * GET /api/campaign/[campaignId]/play?wallet=0x...
 *
 * The most security-critical endpoint.
 * Only returns the decrypted embed URL if:
 *   1. Wallet address is valid
 *   2. On-chain access is valid and not expired
 *
 * Privacy-First Architecture Note:
 * This MVP uses server-side AES-256-GCM decryption gated by on-chain access checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccess } from "@/lib/access";
import { getFullCampaign } from "@/lib/campaignRegistry";
import { decryptText } from "@/lib/encryption";
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
      return NextResponse.json({ error: addrCheck.error }, { status: 401 });
    }

    // ── Step 1: Verify on-chain access ───────────────────────────────────────
    const access = await verifyAccess(id, wallet);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: access.reason ?? "Access denied" },
        { status: 403 }
      );
    }

    // ── Step 2: Fetch encrypted metadata from IPFS ───────────────────────────
    const campaign = await getFullCampaign(id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // ── Step 3: Decrypt video URL server-side ────────────────────────────────
    const embedUrl = decryptText({
      ciphertext: campaign.metadata.encryptedVideoUrl,
      iv:         campaign.metadata.iv,
      authTag:    campaign.metadata.authTag,
    });

    // ── Step 4: Return ONLY the embed URL (never the raw watch URL) ──────────
    return NextResponse.json({
      embedUrl,
      expiresAt:     access.expiresAt,
      campaignTitle: campaign.metadata.title,
    });
  } catch (err) {
    console.error("[campaign/play] Error:", err);
    return NextResponse.json({ error: "Playback authorization failed" }, { status: 500 });
  }
}
