"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, Zap, User, Shield, TrendingUp, AlertCircle } from "lucide-react";
import { useWallet } from "@/components/WalletConnect";
import WalletConnect from "@/components/WalletConnect";
import PurchaseButton from "@/components/PurchaseButton";
import RevenueProgress from "@/components/RevenueProgress";
import AccessBadge from "@/components/AccessBadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import { shortenAddress, formatDuration, formatWeiToEth } from "@/lib/utils";
import { CONTRACT_ADDRESS, REVENUE_CAP_USD } from "@/lib/constants";
import { useRouter } from "next/navigation";

interface CampaignData {
  id: number;
  title: string;
  description: string;
  creator: string;
  priceWei: string;
  durationSeconds: number;
  totalRevenueWei: string;
  revenueCapWei: string;
  active: boolean;
  soldOut: boolean;
  createdAt: string;
  ethUsdPrice: number;
}

interface AccessData {
  hasAccess: boolean;
  expiresAt: number;
  timeRemaining: string | null;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useWallet();
  const campaignId = Number(params.campaignId);

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [access, setAccess]     = useState<AccessData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchCampaign = async () => {
    try {
      const res  = await fetch(`/api/campaign/${campaignId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCampaign(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    if (!address || !campaignId) return;
    try {
      const res  = await fetch(`/api/campaign/${campaignId}/access?wallet=${address}`);
      const data = await res.json();
      setAccess(data);
    } catch {}
  };

  useEffect(() => { fetchCampaign(); }, [campaignId]);
  useEffect(() => { checkAccess(); }, [address, campaignId]);

  if (loading) return <div className="flex justify-center py-32"><LoadingSpinner size="lg" label="Loading campaign..." /></div>;
  if (error || !campaign) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Campaign Not Found</h1>
        <p className="text-gray-500">{error || "This campaign does not exist."}</p>
      </div>
    );
  }

  const priceEth = formatWeiToEth(BigInt(campaign.priceWei), 6);
  const priceUsd = ((Number(campaign.priceWei) / 1e18) * campaign.ethUsdPrice).toFixed(2);
  const earnedUsd = ((Number(campaign.totalRevenueWei) / 1e18) * campaign.ethUsdPrice).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="grid md:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {campaign.soldOut && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400">
                  Sold Out
                </span>
              )}
              {!campaign.active && !campaign.soldOut && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/10 border border-gray-500/30 text-gray-400">
                  Inactive
                </span>
              )}
              {campaign.active && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Active
                </span>
              )}
              {access?.hasAccess && (
                <AccessBadge hasAccess={true} expiresAt={access.expiresAt} />
              )}
            </div>

            <h1 className="text-3xl font-bold text-white mb-3">{campaign.title}</h1>
            <p className="text-gray-400 leading-relaxed">{campaign.description}</p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Zap className="w-3.5 h-3.5" />
                Access Price
              </div>
              <div className="text-white font-semibold">{priceEth} ETH</div>
              <div className="text-gray-500 text-xs">≈ ${priceUsd}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                Access Duration
              </div>
              <div className="text-white font-semibold">{formatDuration(campaign.durationSeconds)}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <User className="w-3.5 h-3.5" />
                Creator
              </div>
              <div className="text-white font-mono text-sm">{shortenAddress(campaign.creator)}</div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Revenue
              </div>
              <div className="text-white font-semibold">${earnedUsd}</div>
              <div className="text-gray-500 text-xs">of ${REVENUE_CAP_USD} cap</div>
            </div>
          </motion.div>

          {/* Revenue progress */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Revenue Cap Progress
            </h3>
            <RevenueProgress
              totalRevenueWei={BigInt(campaign.totalRevenueWei)}
              revenueCapWei={BigInt(campaign.revenueCapWei)}
              ethUsdPrice={campaign.ethUsdPrice}
            />
          </div>

          {/* Privacy note */}
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex gap-3">
            <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              Content is protected by AES-256-GCM encryption and wallet-gated access control.
              Video URL is decrypted server-side only after verifying your on-chain access.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 space-y-4 sticky top-24">
            <h2 className="font-semibold text-white">Get Access</h2>

            {access?.hasAccess ? (
              <div className="space-y-3">
                <AccessBadge hasAccess={true} expiresAt={access.expiresAt} />
                <button
                  onClick={() => router.push(`/watch/${campaignId}`)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold hover:from-cyan-400 hover:to-purple-500 transition-all"
                >
                  Watch Now →
                </button>
              </div>
            ) : (
              <>
                <div className="text-center py-2">
                  <div className="text-2xl font-bold text-white">{priceEth} ETH</div>
                  <div className="text-gray-500 text-sm">≈ ${priceUsd}</div>
                </div>

                {!address ? (
                  <WalletConnect />
                ) : campaign.soldOut ? (
                  <div className="w-full py-3 rounded-xl bg-gray-800 text-gray-500 text-center text-sm font-medium">
                    Campaign Sold Out
                  </div>
                ) : !campaign.active ? (
                  <div className="w-full py-3 rounded-xl bg-gray-800 text-gray-500 text-center text-sm font-medium">
                    Campaign Inactive
                  </div>
                ) : (
                  <PurchaseButton
                    campaignId={campaignId}
                    priceWei={BigInt(campaign.priceWei)}
                    contractAddress={CONTRACT_ADDRESS}
                    onSuccess={() => {
                      setTimeout(() => {
                        checkAccess();
                        fetchCampaign();
                      }, 3000);
                    }}
                  />
                )}

                <p className="text-xs text-gray-600 text-center">
                  {formatDuration(campaign.durationSeconds)} access after purchase
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
