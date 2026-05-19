"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldX, Loader2, ArrowLeft } from "lucide-react";
import { useWallet } from "@/components/WalletConnect";
import WalletConnect from "@/components/WalletConnect";
import SecurePlayer from "@/components/SecurePlayer";
import CountdownTimer from "@/components/CountdownTimer";
import LoadingSpinner from "@/components/LoadingSpinner";

interface PlayData {
  embedUrl: string;
  expiresAt: number;
  campaignTitle: string;
}

export default function WatchPage() {
  const params   = useParams();
  const router   = useRouter();
  const { address } = useWallet();
  const campaignId = Number(params.campaignId);

  const [playData, setPlayData] = useState<PlayData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetchPlayData = async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/campaign/${campaignId}/play?wallet=${address}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Access denied");
      setPlayData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) fetchPlayData();
  }, [address, campaignId]);

  if (!address) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Connect Wallet to Watch</h1>
        <p className="text-gray-400 mb-8">Your wallet is used to verify on-chain access.</p>
        <WalletConnect />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-400 text-sm">Verifying access and decrypting content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="p-5 rounded-full bg-red-500/10 border border-red-500/20 inline-flex mb-6">
          <ShieldX className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Access Denied</h1>
        <p className="text-gray-400 mb-8">{error}</p>
        <button
          onClick={() => router.push(`/campaign/${campaignId}`)}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium"
        >
          Purchase Access
        </button>
      </div>
    );
  }

  if (!playData) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Back button */}
      <button
        onClick={() => router.push(`/campaign/${campaignId}`)}
        className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Campaign
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">{playData.campaignTitle}</h1>
          <CountdownTimer
            expiresAt={playData.expiresAt}
            onExpire={() => {
              setPlayData(null);
              setError("Your access has expired.");
            }}
          />
        </div>

        <SecurePlayer
          embedUrl={playData.embedUrl}
          title={playData.campaignTitle}
        />
      </motion.div>
    </div>
  );
}
