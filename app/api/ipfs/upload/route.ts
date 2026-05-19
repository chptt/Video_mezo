/**
 * POST /api/ipfs/upload
 * Encrypts campaign metadata and uploads to Pinata IPFS.
 * Server-side only — encryption key never leaves the server.
 */

import { NextRequest, NextResponse } from "next/server";
import { encryptText } from "@/lib/encryption";
import { uploadJSONToIPFS } from "@/lib/ipfs";
import { toEmbedUrl, isValidYouTubeUrl } from "@/lib/youtube";
import {
  validateCampaignTitle,
  validateDescription,
  validateYouTubeUrl,
  validateEthAddress,
} from "@/lib/validation";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      videoUrl,
      creatorAddress,
      priceWei,
      durationSeconds,
    } = body;

    // ── Validate inputs ──────────────────────────────────────────────────────
    const checks = [
      validateCampaignTitle(title),
      validateDescription(description),
      validateYouTubeUrl(videoUrl),
      validateEthAddress(creatorAddress),
    ];
    for (const check of checks) {
      if (!check.valid) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
    }
    if (!priceWei || BigInt(priceWei) <= 0n) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }
    if (!durationSeconds || Number(durationSeconds) <= 0) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    // ── Encrypt the video URL ────────────────────────────────────────────────
    // Only the embed URL is encrypted (raw watch URL is never stored)
    const embedUrl = toEmbedUrl(videoUrl);
    if (!embedUrl) {
      return NextResponse.json({ error: "Could not parse YouTube URL" }, { status: 400 });
    }

    const encrypted = encryptText(embedUrl);

    // ── Build metadata JSON ──────────────────────────────────────────────────
    const campaignId = uuidv4();
    const metadata = {
      campaignId,
      title:             title.trim(),
      description:       description.trim(),
      encryptedVideoUrl: encrypted.ciphertext,
      iv:                encrypted.iv,
      authTag:           encrypted.authTag,
      creatorAddress:    creatorAddress.toLowerCase(),
      priceWei:          priceWei.toString(),
      durationSeconds:   Number(durationSeconds),
      createdAt:         new Date().toISOString(),
      revenueCapUsd:     Number(process.env.REVENUE_CAP_USD) || 20,
      platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE) || 10,
      status:            "active",
    };

    // ── Upload to IPFS ───────────────────────────────────────────────────────
    const { cid } = await uploadJSONToIPFS(
      metadata,
      `PrivateStream-${campaignId.slice(0, 8)}`
    );

    return NextResponse.json({ cid, campaignId });
  } catch (err) {
    console.error("[ipfs/upload] Error:", err);
    return NextResponse.json(
      { error: "Failed to upload metadata" },
      { status: 500 }
    );
  }
}
