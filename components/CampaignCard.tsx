"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Clock, Zap, TrendingUp, Lock } from "lucide-react";
import { cn, shortenAddress, formatDuration, formatWeiToEth } from "@/lib/utils";
import RevenueProgress from "./RevenueProgress";
import { REVENUE_CAP_USD } from "@/lib/constants";

export interface CampaignCardData {
  id: number;
  title: string;
  description: string;
  creator: string;
  priceWei: bigint;
  durationSeconds: number;
  totalRevenueWei: bigint;
  revenueCapWei: bigint;
  active: boolean;
  soldOut: boolean;
  ethUsdPrice?: number;
}

interface CampaignCardProps {
  campaign: CampaignCardData;
  index?: number;
}

export default function CampaignCard({ campaign, index = 0 }: CampaignCardProps) {
  const ethUsd = campaign.ethUsdPrice ?? 3000;
  const priceEth = formatWeiToEth(campaign.priceWei, 4);
  const priceUsd = ((Number(campaign.priceWei) / 1e18) * ethUsd).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="group relative"
    >
      {/* Glow border on hover */}
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-cyan-500/0 to-purple-500/0 group-hover:from-cyan-500/20 group-hover:to-purple-500/20 transition-all duration-300 blur-sm" />

      <div className="relative rounded-2xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-all duration-300 overflow-hidden">
        {/* Header gradient */}
        <div className="h-1.5 bg-gradient-to-r from-cyan-500 to-purple-600" />

        <div className="p-5 space-y-4">
          {/* Title + lock icon */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                {campaign.title}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                by {shortenAddress(campaign.creator)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 shrink-0">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-400 line-clamp-2">{campaign.description}</p>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono text-white">{priceEth} ETH</span>
              <span className="text-gray-600">(${priceUsd})</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{formatDuration(campaign.durationSeconds)}</span>
            </div>
          </div>

          {/* Revenue progress */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <TrendingUp className="w-3 h-3" />
              <span>Revenue cap progress</span>
            </div>
            <RevenueProgress
              totalRevenueWei={campaign.totalRevenueWei}
              revenueCapWei={campaign.revenueCapWei}
              ethUsdPrice={ethUsd}
              showLabels={false}
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>
                ${((Number(campaign.totalRevenueWei) / 1e18) * ethUsd).toFixed(2)} earned
              </span>
              <span>${REVENUE_CAP_USD} cap</span>
            </div>
          </div>

          {/* CTA */}
          <Link
            href={`/campaign/${campaign.id}`}
            className={cn(
              "block w-full text-center py-2.5 rounded-xl text-sm font-medium transition-all",
              campaign.soldOut
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-400 hover:to-purple-500"
            )}
          >
            {campaign.soldOut ? "Sold Out" : "Get Access →"}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
