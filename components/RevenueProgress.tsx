"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { REVENUE_CAP_USD } from "@/lib/constants";

interface RevenueProgressProps {
  totalRevenueWei: bigint;
  revenueCapWei: bigint;
  ethUsdPrice?: number;
  showLabels?: boolean;
  className?: string;
}

export default function RevenueProgress({
  totalRevenueWei,
  revenueCapWei,
  ethUsdPrice = 3000,
  showLabels = true,
  className,
}: RevenueProgressProps) {
  const capWei = revenueCapWei > 0n ? revenueCapWei : 1n;
  const pct = Math.min(100, (Number(totalRevenueWei) / Number(capWei)) * 100);

  const earnedUsd = (Number(totalRevenueWei) / 1e18) * ethUsdPrice;
  const capUsd    = REVENUE_CAP_USD;

  const color =
    pct >= 90 ? "from-red-500 to-orange-500" :
    pct >= 60 ? "from-yellow-500 to-orange-400" :
                "from-cyan-500 to-purple-500";

  return (
    <div className={cn("space-y-2", className)}>
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>Revenue: ${earnedUsd.toFixed(2)}</span>
          <span>Cap: ${capUsd}</span>
        </div>
      )}
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full bg-gradient-to-r", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {/* Glow effect */}
        <motion.div
          className={cn("absolute top-0 h-full rounded-full bg-gradient-to-r opacity-50 blur-sm", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      {showLabels && (
        <p className="text-xs text-gray-500 text-right">{pct.toFixed(1)}% of cap reached</p>
      )}
    </div>
  );
}
