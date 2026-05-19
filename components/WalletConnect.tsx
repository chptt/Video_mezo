"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, LogOut, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { cn, shortenAddress } from "@/lib/utils";
import toast from "react-hot-toast";

interface WalletConnectProps {
  className?: string;
  compact?: boolean;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export function useWallet() {
  const [address, setAddress]   = useState<string | null>(null);
  const [chainId, setChainId]   = useState<number | null>(null);
  const [loading, setLoading]   = useState(false);

  const REQUIRED_CHAIN = 421614;

  useEffect(() => {
    // Restore session
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          const accs = accounts as string[];
          if (accs.length > 0) setAddress(accs[0]);
        })
        .catch(() => {});

      window.ethereum
        .request({ method: "eth_chainId" })
        .then((id) => setChainId(parseInt(id as string, 16)))
        .catch(() => {});

      const handleAccountsChanged = (accounts: unknown) => {
        const accs = accounts as string[];
        setAddress(accs.length > 0 ? accs[0] : null);
      };
      const handleChainChanged = (id: unknown) => {
        setChainId(parseInt(id as string, 16));
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not detected. Please install MetaMask.");
      return;
    }
    setLoading(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];
      setAddress(accounts[0]);

      // Switch to Arbitrum Sepolia
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x66EEE" }], // 421614
        });
      } catch (switchErr: unknown) {
        // Chain not added — add it
        if ((switchErr as { code: number }).code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x66EEE",
              chainName: "Arbitrum Sepolia",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
              blockExplorerUrls: ["https://sepolia.arbiscan.io"],
            }],
          });
        }
      }
      toast.success("Wallet connected!");
    } catch (err: unknown) {
      if ((err as { code: number }).code !== 4001) {
        toast.error("Failed to connect wallet");
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    toast.success("Wallet disconnected");
  };

  const isCorrectChain = chainId === REQUIRED_CHAIN;

  return { address, chainId, loading, connect, disconnect, isCorrectChain };
}

export default function WalletConnect({ className, compact = false }: WalletConnectProps) {
  const { address, loading, connect, disconnect, isCorrectChain } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!address) {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={connect}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm",
          "bg-gradient-to-r from-cyan-500 to-purple-600 text-white",
          "hover:from-cyan-400 hover:to-purple-500 transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <Wallet className="w-4 h-4" />
        {loading ? "Connecting..." : "Connect Wallet"}
      </motion.button>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {!isCorrectChain && (
          <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
            Wrong Network
          </span>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          {shortenAddress(address)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!isCorrectChain && (
        <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full border border-yellow-400/20">
          Wrong Network
        </span>
      )}
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
        <div className="w-2 h-2 rounded-full bg-emerald-400 mr-1" />
        <span className="text-sm text-gray-300 font-mono">{shortenAddress(address)}</span>
        <button onClick={copyAddress} className="ml-1 p-1 hover:text-cyan-400 transition-colors text-gray-500">
          {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <a
          href={`https://sepolia.arbiscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:text-cyan-400 transition-colors text-gray-500"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button onClick={disconnect} className="p-1 hover:text-red-400 transition-colors text-gray-500">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
