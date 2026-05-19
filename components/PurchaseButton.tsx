"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Loader2, ShieldCheck } from "lucide-react";
import { cn, formatWeiToEth } from "@/lib/utils";
import { useWallet } from "./WalletConnect";
import toast from "react-hot-toast";

interface PurchaseButtonProps {
  campaignId: number;
  priceWei: bigint;
  contractAddress: string;
  onSuccess?: (txHash: string) => void;
  disabled?: boolean;
  className?: string;
}

const CONTRACT_ABI_PURCHASE = [
  "function purchaseAccess(uint256 campaignId) payable",
];

export default function PurchaseButton({
  campaignId,
  priceWei,
  contractAddress,
  onSuccess,
  disabled,
  className,
}: PurchaseButtonProps) {
  const { address, connect } = useWallet();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "confirm" | "pending" | "done">("idle");

  const priceEth = formatWeiToEth(priceWei, 6);

  const handlePurchase = async () => {
    if (!address) {
      await connect();
      return;
    }

    setLoading(true);
    setStep("confirm");

    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum!);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI_PURCHASE, signer);

      setStep("pending");
      toast.loading("Waiting for transaction confirmation...", { id: "purchase" });

      const tx = await contract.purchaseAccess(campaignId, { value: priceWei });
      const receipt = await tx.wait();

      toast.success("Access purchased! Enjoy your content.", { id: "purchase" });
      setStep("done");
      onSuccess?.(receipt.hash);
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      toast.dismiss("purchase");
      if (e.code === 4001 || e.message?.includes("user rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error("Purchase failed. Please try again.");
        console.error(err);
      }
      setStep("idle");
    } finally {
      setLoading(false);
    }
  };

  if (step === "done") {
    return (
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className={cn(
          "flex items-center justify-center gap-2 w-full py-3 rounded-xl",
          "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium",
          className
        )}
      >
        <ShieldCheck className="w-5 h-5" />
        Access Granted!
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      onClick={handlePurchase}
      disabled={disabled || loading}
      className={cn(
        "flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all",
        disabled
          ? "bg-gray-800 text-gray-500 cursor-not-allowed"
          : "bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-purple-500/20",
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {step === "confirm" ? "Confirm in MetaMask..." : "Processing..."}
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" />
          {address ? `Pay ${priceEth} ETH` : "Connect Wallet to Purchase"}
        </>
      )}
    </motion.button>
  );
}
