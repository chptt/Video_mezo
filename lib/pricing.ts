/**
 * lib/pricing.ts
 * ETH/USD conversion utilities for revenue cap enforcement.
 */

import { ETH_USD_FALLBACK, REVENUE_CAP_USD, PLATFORM_FEE_PERCENTAGE } from "./constants";

/** Fetch live ETH/USD price from CoinGecko (server-side only). Falls back to env var. */
export async function getEthUsdPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { next: { revalidate: 300 } } // cache 5 min in Next.js
    );
    if (!res.ok) throw new Error("CoinGecko fetch failed");
    const data = await res.json();
    return data?.ethereum?.usd ?? ETH_USD_FALLBACK;
  } catch {
    return ETH_USD_FALLBACK;
  }
}

/** Convert wei to USD using provided ETH price */
export function weiToUsd(weiAmount: bigint, ethUsdPrice: number): number {
  const eth = Number(weiAmount) / 1e18;
  return eth * ethUsdPrice;
}

/** Convert USD to wei using provided ETH price */
export function usdToWei(usdAmount: number, ethUsdPrice: number): bigint {
  const eth = usdAmount / ethUsdPrice;
  return BigInt(Math.floor(eth * 1e18));
}

/** Revenue cap in wei given current ETH price */
export function revenueCapWei(ethUsdPrice: number): bigint {
  return usdToWei(REVENUE_CAP_USD, ethUsdPrice);
}

/** Calculate creator earnings and platform fee from gross revenue */
export function splitRevenue(grossWei: bigint): { creatorWei: bigint; platformWei: bigint } {
  const platformWei = (grossWei * BigInt(PLATFORM_FEE_PERCENTAGE)) / 100n;
  const creatorWei  = grossWei - platformWei;
  return { creatorWei, platformWei };
}

/** Format wei as ETH string with 6 decimal places */
export function formatEth(weiAmount: bigint): string {
  const eth = Number(weiAmount) / 1e18;
  return eth.toFixed(6);
}

/** Format wei as USD string */
export function formatUsd(weiAmount: bigint, ethUsdPrice: number): string {
  return weiToUsd(weiAmount, ethUsdPrice).toFixed(2);
}

/** Percentage of revenue cap consumed (0–100) */
export function revenueCapPercent(totalRevenueWei: bigint, capWei: bigint): number {
  if (capWei === 0n) return 100;
  const pct = (Number(totalRevenueWei) / Number(capWei)) * 100;
  return Math.min(100, pct);
}
