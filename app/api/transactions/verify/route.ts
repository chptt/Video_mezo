/**
 * POST /api/transactions/verify
 * Generic transaction verification endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/arbitrum";
import { validateTxHash, validateEthAddress } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const { txHash, senderAddress, expectedValueWei } = await req.json();

    const txCheck   = validateTxHash(txHash);
    const addrCheck = validateEthAddress(senderAddress);
    if (!txCheck.valid)   return NextResponse.json({ error: txCheck.error },   { status: 400 });
    if (!addrCheck.valid) return NextResponse.json({ error: addrCheck.error }, { status: 400 });

    const result = await verifyTransaction(
      txHash,
      senderAddress,
      BigInt(expectedValueWei ?? "0")
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[transactions/verify] Error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
