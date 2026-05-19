"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Lock, Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useWallet } from "@/components/WalletConnect";
import WalletConnect from "@/components/WalletConnect";
import LoadingSpinner from "@/components/LoadingSpinner";
import toast from "react-hot-toast";
import { validateCampaignTitle, validateDescription, validateYouTubeUrl, validatePrice, validateDuration } from "@/lib/validation";
import { formatDuration } from "@/lib/utils";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "@/lib/constants";

const DURATION_OPTIONS = [
  { label: "1 Hour",   seconds: 3600 },
  { label: "6 Hours",  seconds: 21600 },
  { label: "24 Hours", seconds: 86400 },
  { label: "3 Days",   seconds: 259200 },
  { label: "7 Days",   seconds: 604800 },
  { label: "30 Days",  seconds: 2592000 },
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const { address, connect } = useWallet();

  const [form, setForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    priceEth: "",
    durationSeconds: 86400,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"form" | "encrypting" | "uploading" | "confirming" | "done">("form");
  const [checking, setChecking] = useState(false);
  const [alreadyHasCampaign, setAlreadyHasCampaign] = useState(false);
  const [ethUsdPrice, setEthUsdPrice] = useState(3000);

  // Check eligibility and fetch ETH price
  useEffect(() => {
    fetch("/api/pricing").then(r => r.json()).then(d => setEthUsdPrice(d.ethUsdPrice || 3000));
  }, []);

  useEffect(() => {
    if (!address) return;
    setChecking(true);
    fetch("/api/campaign/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorAddress: address }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) setAlreadyHasCampaign(true);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [address]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const checks = [
      ["title",       validateCampaignTitle(form.title)],
      ["description", validateDescription(form.description)],
      ["videoUrl",    validateYouTubeUrl(form.videoUrl)],
      ["priceEth",    validatePrice(form.priceEth)],
    ] as const;
    for (const [field, result] of checks) {
      if (!result.valid) newErrors[field] = result.error!;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) { await connect(); return; }
    if (!validate()) return;

    try {
      // Step 1: Encrypt & upload to IPFS
      setStep("encrypting");
      const priceWei = BigInt(Math.floor(parseFloat(form.priceEth) * 1e18)).toString();

      const uploadRes = await fetch("/api/ipfs/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:           form.title,
          description:     form.description,
          videoUrl:        form.videoUrl,
          creatorAddress:  address,
          priceWei,
          durationSeconds: form.durationSeconds,
        }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      setStep("uploading");
      await new Promise(r => setTimeout(r, 500)); // brief pause for UX

      // Step 2: Call smart contract
      setStep("confirming");
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      toast.loading("Confirm transaction in MetaMask...", { id: "create" });
      const tx = await contract.createCampaign(
        uploadData.cid,
        BigInt(priceWei),
        BigInt(form.durationSeconds)
      );
      await tx.wait();
      toast.success("Campaign created!", { id: "create" });
      setStep("done");

      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      toast.dismiss("create");
      if (e.code === 4001 || e.message?.includes("user rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error((e.message || "Failed to create campaign").slice(0, 100));
      }
      setStep("form");
    }
  };

  const priceUsd = form.priceEth ? (parseFloat(form.priceEth) * ethUsdPrice).toFixed(2) : "0.00";

  if (!address) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="p-5 rounded-full bg-purple-500/10 border border-purple-500/20 inline-flex mb-6">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h1>
        <p className="text-gray-400 mb-8">You need to connect MetaMask to create a campaign.</p>
        <WalletConnect />
      </div>
    );
  }

  if (checking) {
    return <div className="flex justify-center py-32"><LoadingSpinner size="lg" label="Checking eligibility..." /></div>;
  }

  if (alreadyHasCampaign) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="p-5 rounded-full bg-yellow-500/10 border border-yellow-500/20 inline-flex mb-6">
          <AlertCircle className="w-8 h-8 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Campaign Already Exists</h1>
        <p className="text-gray-400 mb-8">
          You already own an active campaign. Only one campaign per wallet is allowed.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-medium"
        >
          View My Campaign
        </button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="p-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 inline-flex mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <h1 className="text-2xl font-bold text-white mb-3">Campaign Created!</h1>
        <p className="text-gray-400">Redirecting to your dashboard...</p>
      </div>
    );
  }

  const isProcessing = step !== "form";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold gradient-text">Create Campaign</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Your video URL will be encrypted with AES-256-GCM before storage on IPFS.
        </p>
      </motion.div>

      {/* FHE notice */}
      <div className="mb-6 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex gap-3">
        <Shield className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-sm text-gray-400">
          <span className="text-purple-300 font-medium">FHE-Inspired Privacy: </span>
          Your video URL is encrypted server-side. Only verified buyers can decrypt it.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Title</label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="My Exclusive Content"
            disabled={isProcessing}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
          />
          {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe what buyers will get access to..."
            rows={3}
            disabled={isProcessing}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none disabled:opacity-50"
          />
          {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
        </div>

        {/* YouTube URL */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            YouTube Video URL
            <span className="text-gray-500 font-normal ml-2">(unlisted videos only)</span>
          </label>
          <input
            type="url"
            value={form.videoUrl}
            onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={isProcessing}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
          />
          {errors.videoUrl && <p className="text-red-400 text-xs mt-1">{errors.videoUrl}</p>}
          <p className="text-xs text-gray-600 mt-1">
            The URL will be encrypted before storage. Raw URL is never exposed to buyers.
          </p>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Access Price (ETH)</label>
          <div className="relative">
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              value={form.priceEth}
              onChange={e => setForm(f => ({ ...f, priceEth: e.target.value }))}
              placeholder="0.001"
              disabled={isProcessing}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
            />
            {form.priceEth && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                ≈ ${priceUsd}
              </span>
            )}
          </div>
          {errors.priceEth && <p className="text-red-400 text-xs mt-1">{errors.priceEth}</p>}
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Access Duration</label>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.seconds}
                type="button"
                onClick={() => setForm(f => ({ ...f, durationSeconds: opt.seconds }))}
                disabled={isProcessing}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  form.durationSeconds === opt.seconds
                    ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white"
                    : "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Buyers get access for {formatDuration(form.durationSeconds)} after purchase.
          </p>
        </div>

        {/* Revenue cap info */}
        <div className="p-4 rounded-xl bg-white/3 border border-white/8 text-sm text-gray-500">
          <p>Campaign auto-closes at <span className="text-white">$20 USD</span> gross revenue.</p>
          <p className="mt-1">You receive <span className="text-emerald-400">90%</span> · Platform fee: <span className="text-gray-400">10%</span></p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold hover:from-cyan-400 hover:to-purple-500 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {step === "encrypting" ? "Encrypting video URL..." :
               step === "uploading"  ? "Uploading to IPFS..." :
               "Confirm in MetaMask..."}
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Create Campaign
            </>
          )}
        </button>
      </form>
    </div>
  );
}
