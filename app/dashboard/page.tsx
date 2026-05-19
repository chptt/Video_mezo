"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TrendingUp, Users, DollarSign, BarChart3, ExternalLink, Power } from "lucide-react";
import { useWallet } from "@/components/WalletConnect";
import WalletConnect from "@/components/WalletConnect";
import RevenueProgress from "@/components/RevenueProgress";
import LoadingSpinner from "@/components/LoadingSpinner";
import { shortenAddress, formatWeiToEth, formatDuration } from "@/lib/utils";
import { PLATFORM_FEE_PERCENTAGE, REVENUE_CAP_USD, CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/constants";
import toast from "react-hot-toast";

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

export default function DashboardPage() {
  const router = useRouter();
  const { address, connect } = useWallet();

  const [campaign, setCampaign]   = useState<CampaignData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [noCampaign, setNoCampaign] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [ethUsdPrice, setEthUsdPrice] = useState(3000);

  useEffect(() => {
    fetch("/api/pricing").then(r => r.json()).then(d => setEthUsdPrice(d.ethUsdPrice || 3000));
  }, []);

  useEffect(() => {
    if (!address) return;
    loadCreatorCampaign();
  }, [address]);

  const loadCreatorCampaign = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const { ethers } = await import("ethers");
      const { JsonRpcProvider } = ethers;
      const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const campaignId = await contract.creatorCampaignId(address);
      if (Number(campaignId) === 0) {
        setNoCampaign(true);
        return;
      }

      const res  = await fetch(`/api/campaign/${Number(campaignId)}`);
      const data = await res.json();
      if (res.ok) setCampaign(data);
      else setNoCampaign(true);
    } catch {
      setNoCampaign(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!campaign || !address) return;
    if (!confirm("Are you sure you want to deactivate your campaign? This cannot be undone.")) return;

    setDeactivating(true);
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      toast.loading("Confirm in MetaMask...", { id: "deactivate" });
      const tx = await contract.deactivateCampaign(campaign.id);
      await tx.wait();
      toast.success("Campaign deactivated", { id: "deactivate" });
      loadCreatorCampaign();
    } catch (err: unknown) {
      toast.dismiss("deactivate");
      toast.error("Failed to deactivate");
    } finally {
      setDeactivating(false);
    }
  };

  if (!address) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Creator Dashboard</h1>
        <p className="text-gray-400 mb-8">Connect your wallet to view your campaign analytics.</p>
        <WalletConnect />
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-32"><LoadingSpinner size="lg" label="Loading dashboard..." /></div>;
  }

  if (noCampaign || !campaign) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-3">No Campaign Yet</h1>
        <p className="text-gray-400 mb-8">Create your first encrypted video campaign to start earning.</p>
        <button
          onClick={() => router.push("/campaign/create")}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium"
        >
          Create Campaign
        </button>
      </div>
    );
  }

  const grossWei    = BigInt(campaign.totalRevenueWei);
  const capWei      = BigInt(campaign.revenueCapWei);
  const platformWei = (grossWei * BigInt(PLATFORM_FEE_PERCENTAGE)) / 100n;
  const creatorWei  = grossWei - platformWei;

  const grossUsd    = ((Number(grossWei) / 1e18) * ethUsdPrice).toFixed(2);
  const creatorUsd  = ((Number(creatorWei) / 1e18) * ethUsdPrice).toFixed(2);
  const platformUsd = ((Number(platformWei) / 1e18) * ethUsdPrice).toFixed(2);

  const stats = [
    { label: "Gross Revenue",    value: `$${grossUsd}`,    sub: `${formatWeiToEth(grossWei, 6)} ETH`,    color: "text-cyan-400" },
    { label: "Your Earnings",    value: `$${creatorUsd}`,  sub: `${formatWeiToEth(creatorWei, 6)} ETH`,  color: "text-emerald-400" },
    { label: "Platform Fees",    value: `$${platformUsd}`, sub: `${formatWeiToEth(platformWei, 6)} ETH`, color: "text-purple-400" },
    { label: "Revenue Cap",      value: `$${REVENUE_CAP_USD}`,  sub: "Gross limit",                      color: "text-yellow-400" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Creator Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">{shortenAddress(address)}</p>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-4"
          >
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Campaign card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-white">{campaign.title}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                campaign.soldOut ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                campaign.active  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                   "bg-gray-500/10 text-gray-400 border border-gray-500/20"
              }`}>
                {campaign.soldOut ? "Sold Out" : campaign.active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{campaign.description}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href={`/campaign/${campaign.id}`}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              title="View campaign"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            {campaign.active && (
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all disabled:opacity-50"
                title="Deactivate campaign"
              >
                <Power className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Campaign details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-white/3 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Price</p>
            <p className="text-white font-medium">{formatWeiToEth(BigInt(campaign.priceWei), 6)} ETH</p>
          </div>
          <div className="bg-white/3 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Duration</p>
            <p className="text-white font-medium">{formatDuration(campaign.durationSeconds)}</p>
          </div>
          <div className="bg-white/3 rounded-lg p-3">
            <p className="text-gray-500 text-xs">Campaign ID</p>
            <p className="text-white font-medium font-mono">#{campaign.id}</p>
          </div>
        </div>

        {/* Revenue progress */}
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <TrendingUp className="w-4 h-4" />
            Revenue Cap Progress
          </div>
          <RevenueProgress
            totalRevenueWei={BigInt(campaign.totalRevenueWei)}
            revenueCapWei={BigInt(campaign.revenueCapWei)}
            ethUsdPrice={ethUsdPrice}
          />
        </div>

        {campaign.soldOut && (
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-sm text-red-400">
            Revenue cap reached. New purchases are blocked. Existing buyers retain access until expiry.
          </div>
        )}
      </motion.div>
    </div>
  );
}
