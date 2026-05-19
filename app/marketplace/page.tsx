"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Store, RefreshCw } from "lucide-react";
import CampaignCard, { CampaignCardData } from "@/components/CampaignCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import toast from "react-hot-toast";

export default function MarketplacePage() {
  const [campaigns, setCampaigns] = useState<CampaignCardData[]>([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/campaign/list?page=1&limit=12");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const mapped: CampaignCardData[] = data.campaigns.map((c: {
        id: number; title: string; description: string; creator: string;
        priceWei: string; durationSeconds: number; totalRevenueWei: string;
        revenueCapWei: string; active: boolean; soldOut: boolean; ethUsdPrice: number;
      }) => ({
        id:              c.id,
        title:           c.title,
        description:     c.description,
        creator:         c.creator,
        priceWei:        BigInt(c.priceWei),
        durationSeconds: c.durationSeconds,
        totalRevenueWei: BigInt(c.totalRevenueWei),
        revenueCapWei:   BigInt(c.revenueCapWei),
        active:          c.active,
        soldOut:         c.soldOut,
        ethUsdPrice:     c.ethUsdPrice,
      }));

      setCampaigns(mapped);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-10"
      >
        <div>
          <h1 className="text-3xl font-bold gradient-text">Marketplace</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {total > 0 ? `${total} active campaign${total !== 1 ? "s" : ""}` : "Discover encrypted video campaigns"}
          </p>
        </div>
        <button
          onClick={fetchCampaigns}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-32">
          <LoadingSpinner size="lg" label="Loading campaigns..." />
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No active campaigns"
          description="Be the first to create an encrypted video campaign on PrivateStream FHE."
          action={
            <a
              href="/campaign/create"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium hover:from-cyan-400 hover:to-purple-500 transition-all"
            >
              Create Campaign
            </a>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((c, i) => (
            <CampaignCard key={c.id} campaign={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
